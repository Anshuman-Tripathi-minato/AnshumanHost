'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const http = require('node:http');
const os = require('node:os');
const config = require('../config');
const store = require('../services/store');
const { parseCommand, safeAppPath } = require('../security/validation');

class ProcessManager {
  constructor() { this.children = new Map(); this.logQueues = new Map(); this.reservedPorts = new Set(); }

  async writeLog(slug, text, secrets = []) {
    const file = path.join(config.logRoot, `${slug}.log`);
    let line = String(text).replace(/\u0000/g, '');
    for (const secret of secrets) if (secret && secret.length > 2) line = line.split(secret).join('[REDACTED]');
    const append = (this.logQueues.get(slug) || Promise.resolve()).then(async () => {
      await fs.mkdir(config.logRoot, { recursive: true, mode: 0o700 });
      const prior = await fs.stat(file).catch(() => null);
      if (prior && prior.size > 5 * 1024 * 1024) {
        await fs.rm(`${file}.1`, { force: true });
        await fs.rename(file, `${file}.1`);
      }
      await fs.appendFile(file, `${new Date().toISOString()} ${line.endsWith('\n') ? line : `${line}\n`}`, { mode: 0o600 });
    });
    this.logQueues.set(slug, append.catch(() => {}));
    return append;
  }

  async runCommand(args, cwd, env, slug, secrets = [], timeoutMs = 10 * 60 * 1000) {
    if (!args.length) throw new Error('No build command is configured.');
    await this.writeLog(slug, `$ ${args.join(' ')}`, secrets);
    return new Promise((resolve, reject) => {
      const child = spawn(args[0], args.slice(1), { cwd, env, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
      let settled = false;
      let killTimer;
      const timer = setTimeout(() => { killProcessTree(child, 'SIGTERM'); killTimer = setTimeout(() => killProcessTree(child, 'SIGKILL'), 3000); }, timeoutMs);
      const collect = (stream) => stream.on('data', (chunk) => this.writeLog(slug, chunk.toString(), secrets));
      collect(child.stdout); collect(child.stderr);
      child.on('error', (error) => { if (settled) return; settled = true; clearTimeout(timer); clearTimeout(killTimer); reject(new Error(`Could not run ${args[0]}: ${error.message}`)); });
      child.on('close', (code, signal) => {
        if (settled) return;
        settled = true; clearTimeout(timer); clearTimeout(killTimer);
        if (code === 0) resolve({ code });
        else reject(new Error(`Command failed (${signal || `exit ${code}`}). See project logs for details.`));
      });
    });
  }

  async choosePort(preferred) {
    const range = Array.from({ length: config.portEnd - config.portStart + 1 }, (_, i) => config.portStart + i);
    const candidates = preferred ? [preferred, ...range.filter((port) => port !== preferred)] : range;
    for (const port of candidates) {
      const usedByProcesses = [...this.children.values()].some((item) => !item.exited && item.port === port);
      if (!Number.isInteger(port) || port < config.portStart || port > config.portEnd || usedByProcesses || this.reservedPorts.has(port)) continue;
      const free = await new Promise((resolve) => {
        const server = net.createServer();
        server.once('error', () => resolve(false));
        server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)));
      });
      if (free && !this.reservedPorts.has(port) && ![...this.children.values()].some((item) => !item.exited && item.port === port)) {
        this.reservedPorts.add(port);
        return port;
      }
    }
    throw new Error(`No free application port is available in ${config.portStart}–${config.portEnd}.`);
  }

  async start(project, secretValues = {}) {
    const existing = this.children.get(project.slug);
    if (existing && !existing.exited) throw new Error('Project process is already running.');
    const cwd = safeAppPath(project.slug);
    const port = await this.choosePort(project.port);
    const pythonBin = project.pythonExecutable ? path.dirname(project.pythonExecutable) : '';
    const env = { ...process.env, ...secretValues, PATH: pythonBin ? `${pythonBin}${path.delimiter}${process.env.PATH || ''}` : process.env.PATH, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'production' };
    const allSecrets = Object.values(secretValues).filter((value) => typeof value === 'string');
    let args;
    try {
      if (project.runtime === 'static') {
        const root = await this.staticRoot(cwd);
        args = [process.execPath, [path.join(__dirname, '..', 'services', 'static-app.js'), root]];
      } else if (project.runtime === 'node') {
        const cmd = project.startCommand ? parseCommand(project.startCommand) : await this.detectNodeCommand(cwd);
        args = [cmd[0], cmd.slice(1)];
        if (!project.startCommand) project.startCommand = cmd.join(' ');
      } else if (project.runtime === 'python') {
        const cmd = project.startCommand ? parseCommand(project.startCommand) : [project.pythonExecutable || 'python3', 'app.py'];
        args = [cmd[0], cmd.slice(1)];
      } else {
        throw new Error(`Runtime "${project.runtime}" is not supported by the native process adapter.`);
      }
    } catch (error) { this.reservedPorts.delete(port); throw error; }
    const proc = spawn(args[0], args[1], { cwd, env, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    const item = { child: proc, port, pid: proc.pid, startedAt: new Date().toISOString(), exited: false, expectedStop: false };
    this.children.set(project.slug, item);
    await this.writeLog(project.slug, `Process starting: ${args[0]} ${args[1].join(' ')} on 127.0.0.1:${port}`, allSecrets);
    const capture = (stream) => stream.on('data', (chunk) => this.writeLog(project.slug, chunk.toString(), allSecrets));
    capture(proc.stdout); capture(proc.stderr);
    proc.on('error', (error) => { this.reservedPorts.delete(port); this.writeLog(project.slug, `Process error: ${error.message}`, allSecrets); });
    proc.on('exit', (code, signal) => {
      item.exited = true;
      this.reservedPorts.delete(port);
      this.writeLog(project.slug, `Process exited (${signal || `code ${code}`}).`, allSecrets);
      store.update((data) => {
        const current = data.projects.find((p) => p.slug === project.slug);
        if (!current) return data;
        current.status = item.expectedStop ? 'stopped' : 'failed';
        current.stoppedAt = new Date().toISOString();
        if (current.status === 'failed') {
          current.lastError = `Process exited unexpectedly (${signal || `code ${code}`}).`;
          data.deployments ||= [];
          data.deployments.unshift({ id: `exit-${Date.now().toString(36)}`, projectSlug: project.slug, status: 'failed', error: current.lastError, createdAt: new Date().toISOString() });
          data.deployments = data.deployments.slice(0, 100);
        }
        return data;
      }).catch(() => {});
    });
    await wait(200);
    if (item.exited) throw new Error('Application process exited during startup. Check its logs.');
    return { process: item, port };
  }

  async detectNodeCommand(cwd) {
    let packageJson = {};
    try { packageJson = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8')); } catch { /* entrypoint fallback */ }
    if (packageJson.scripts && packageJson.scripts.start) return ['npm', 'start'];
    for (const file of ['index.js', 'server.js', 'app.js', 'index.mjs']) {
      try { await fs.access(path.join(cwd, file)); return [process.execPath, file]; } catch { /* keep checking */ }
    }
    throw new Error('No start script or Node.js entry point found. Set a start command in project settings.');
  }

  async staticRoot(cwd) {
    for (const child of ['dist', 'build', 'public']) {
      try { const stat = await fs.stat(path.join(cwd, child)); if (stat.isDirectory()) return path.join(cwd, child); } catch { /* next */ }
    }
    return cwd;
  }

  async waitForReady(project, port, processItem, timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    const route = project.healthPath || '/';
    while (Date.now() < deadline) {
      if (processItem.exited) throw new Error('Application exited before it became healthy. Check its logs.');
      const ok = await new Promise((resolve) => {
        const req = http.get({ host: '127.0.0.1', port, path: route, timeout: 1000 }, (res) => { res.resume(); resolve(res.statusCode >= 200 && res.statusCode < 400); });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
      await wait(300);
    }
    throw new Error(`Health check did not pass at ${route} within ${timeoutMs / 1000} seconds.`);
  }

  async stop(slug) {
    const item = this.children.get(slug);
    if (!item || item.exited) return { alreadyStopped: true };
    item.expectedStop = true;
    killProcessTree(item.child, 'SIGTERM');
    await Promise.race([new Promise((resolve) => item.child.once('exit', resolve)), wait(3000)]);
    if (!item.exited) killProcessTree(item.child, 'SIGKILL');
    await this.writeLog(slug, 'Stop requested.');
    return { alreadyStopped: false };
  }

  status(slug) {
    const item = this.children.get(slug);
    return item && !item.exited ? { running: true, pid: item.pid, port: item.port, startedAt: item.startedAt } : { running: false };
  }

  async stopAll() { await Promise.all([...this.children.keys()].map((slug) => this.stop(slug).catch(() => {}))); }
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function killProcessTree(child, signal) {
  if (process.platform !== 'win32' && child.pid) {
    try { process.kill(-child.pid, signal); return true; } catch (error) { if (error.code !== 'ESRCH') child.kill(signal); return false; }
  }
  return child.kill(signal);
}

module.exports = new ProcessManager();
