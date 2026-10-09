'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const config = require('../config');
const store = require('./store');
const capabilities = require('./capabilities');
const manager = require('../process-manager/manager');
const { validateSlug, validateName, validateHostname, validateGitUrl, safeAppPath, safeEnv, validateHealthPath, parseCommand, fail } = require('../security/validation');
const { extractZip } = require('../security/zip');

const activeDeployments = new Set();
function conflict(message) { const error = new Error(message); error.status = 409; throw error; }
function isDeploying(slug) { return activeDeployments.has(slug); }

function detect(sourcePath) {
  let pkg = {};
  try { pkg = JSON.parse(require('node:fs').readFileSync(path.join(sourcePath, 'package.json'), 'utf8')); } catch { /* optional */ }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.next) return { runtime: 'node', framework: 'Next.js', buildCommand: 'npm run build', startCommand: pkg.scripts?.start ? 'npm start' : '' };
  if (pkg.scripts && pkg.scripts.build && ['vite', 'react', 'react-scripts'].some((name) => deps[name])) return { runtime: 'static', framework: deps.vite ? 'Vite' : deps['react-scripts'] ? 'Create React App' : 'React', buildCommand: 'npm run build', startCommand: '' };
  if (pkg.name || pkg.scripts) return { runtime: 'node', framework: deps.express ? 'Express' : deps.nestjs || deps['@nestjs/core'] ? 'NestJS' : deps.next ? 'Next.js' : 'Node.js', buildCommand: '', startCommand: pkg.scripts?.start ? 'npm start' : '' };
  if (require('node:fs').existsSync(path.join(sourcePath, 'requirements.txt')) || require('node:fs').existsSync(path.join(sourcePath, 'app.py')) || require('node:fs').existsSync(path.join(sourcePath, 'main.py'))) {
    const entry = require('node:fs').existsSync(path.join(sourcePath, 'app.py')) ? 'app.py' : 'main.py';
    return { runtime: 'python', framework: 'Python', buildCommand: '', startCommand: `python3 ${entry}` };
  }
  if (require('node:fs').existsSync(path.join(sourcePath, 'docker-compose.yml')) || require('node:fs').existsSync(path.join(sourcePath, 'compose.yaml'))) return { runtime: 'compose', framework: 'Docker Compose', buildCommand: '', startCommand: '' };
  if (require('node:fs').existsSync(path.join(sourcePath, 'Dockerfile'))) return { runtime: 'docker', framework: 'Dockerfile', buildCommand: '', startCommand: '' };
  if (require('node:fs').existsSync(path.join(sourcePath, 'index.html'))) return { runtime: 'static', framework: 'Static website', buildCommand: '', startCommand: '' };
  return { runtime: 'node', framework: 'Custom', buildCommand: '', startCommand: '' };
}

async function createProject(input = {}) {
  const name = validateName(input.name);
  const slug = validateSlug(input.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
  const hostname = validateHostname(input.hostname || `${slug}.${config.baseDomain}`);
  const appPath = safeAppPath(slug);
  const autodetected = input.runtime ? { runtime: input.runtime, framework: input.framework || input.runtime, buildCommand: '', startCommand: '' } : detect(appPath);
  const project = {
    id: `${slug}-${Date.now().toString(36)}`,
    slug, name, hostname,
    runtime: autodetected.runtime,
    framework: input.framework || autodetected.framework,
    buildCommand: input.buildCommand === undefined ? autodetected.buildCommand : String(input.buildCommand),
    startCommand: input.startCommand === undefined ? autodetected.startCommand : String(input.startCommand),
    healthPath: validateHealthPath(input.healthPath || '/'),
    sourcePath: path.relative(config.root, appPath),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'stopped',
    port: null,
    startedAt: null,
    stoppedAt: null,
    lastError: null,
    envKeys: [],
    deployments: 0,
  };
  parseCommand(project.buildCommand);
  parseCommand(project.startCommand);
  await store.update((data) => {
    if (data.projects.some((p) => p.slug === slug)) conflict(`Project "${slug}" already exists.`);
    if (hostname && data.projects.some((p) => p.hostname === hostname)) conflict(`Hostname "${hostname}" is already assigned.`);
    data.projects.push(project); return data;
  });
  await fs.mkdir(config.logRoot, { recursive: true, mode: 0o700 });
  return project;
}

async function projectBySlug(slug) {
  validateSlug(slug);
  const data = await store.read();
  const project = data.projects.find((item) => item.slug === slug);
  if (!project) { const error = new Error('Project not found.'); error.status = 404; throw error; }
  return project;
}

async function updateProject(slug, input = {}) {
  const current = await projectBySlug(slug);
  if (isDeploying(slug)) conflict('Wait for the current deployment to finish before changing project settings.');
  const newName = input.name === undefined ? current.name : validateName(input.name);
  const newHost = input.hostname === undefined ? current.hostname : validateHostname(input.hostname);
  const next = {
    ...current,
    name: newName,
    hostname: newHost,
    runtime: input.runtime === undefined ? current.runtime : String(input.runtime),
    framework: input.framework === undefined ? current.framework : String(input.framework),
    buildCommand: input.buildCommand === undefined ? current.buildCommand : String(input.buildCommand),
    startCommand: input.startCommand === undefined ? current.startCommand : String(input.startCommand),
    healthPath: input.healthPath === undefined ? current.healthPath : validateHealthPath(input.healthPath),
    updatedAt: new Date().toISOString(),
  };
  parseCommand(next.buildCommand); parseCommand(next.startCommand);
  const secrets = await store.readSecrets();
  if (input.env !== undefined) secrets[slug] = safeEnv(input.env);
  next.envKeys = Object.keys(secrets[slug] || {});
  await store.update((data) => {
    if (newHost && data.projects.some((p) => p.slug !== slug && p.hostname === newHost)) conflict(`Hostname "${newHost}" is already assigned.`);
    data.projects = data.projects.map((p) => p.slug === slug ? next : p); return data;
  });
  if (input.env !== undefined) await store.writeSecrets(secrets);
  return next;
}

async function ensureSourceCanChange(slug) {
  const project = await projectBySlug(slug);
  if (isDeploying(slug) || project.status === 'deploying') conflict('Wait for the current deployment to finish before replacing its source.');
  if (project.status === 'unknown' && !manager.status(slug).running) conflict('Review the previous process state before replacing project source.');
  if (manager.status(slug).running) conflict('Stop the running project before replacing its source.');
}

async function importGit(slug, repositoryUrl) {
  await ensureSourceCanChange(slug);
  const url = validateGitUrl(repositoryUrl);
  const target = safeAppPath(slug);
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(path.dirname(target), { recursive: true });
  await manager.writeLog(slug, `Cloning ${new URL(url).hostname}/${new URL(url).pathname.replace(/^\//, '')}`);
  await new Promise((resolve, reject) => {
    const proc = spawn('git', ['clone', '--depth', '1', '--', url, target], { cwd: config.root, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', (chunk) => manager.writeLog(slug, chunk.toString()));
    proc.stderr.on('data', (chunk) => manager.writeLog(slug, chunk.toString()));
    proc.on('error', (error) => reject(new Error(`Could not run git clone: ${error.message}`)));
    proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`Git clone failed with exit code ${code}.`)));
  });
  const detected = detect(target);
  await store.update((data) => {
    const project = data.projects.find((p) => p.slug === slug);
    if (project) Object.assign(project, detected, { sourcePath: path.relative(config.root, target), updatedAt: new Date().toISOString() });
    return data;
  });
  return detected;
}

async function importLocal(slug, directory) {
  await ensureSourceCanChange(slug);
  const from = safeAppPath(directory);
  const to = safeAppPath(slug);
  const stat = await fs.stat(from).catch(() => null);
  if (!stat || !stat.isDirectory()) { const error = new Error(`No existing project directory was found at apps/${directory}.`); error.status = 404; throw error; }
  if (from === to) return detect(to);
  await fs.rm(to, { recursive: true, force: true });
  await fs.cp(from, to, { recursive: true, dereference: false, filter: (source) => !source.split(path.sep).includes('.git') });
  const detected = detect(to);
  await store.update((data) => { const project = data.projects.find((p) => p.slug === slug); if (project) Object.assign(project, detected, { sourcePath: path.relative(config.root, to) }); return data; });
  return detected;
}

async function importSample(slug) {
  await ensureSourceCanChange(slug);
  const from = path.join(config.root, 'examples', 'sample-node');
  const to = safeAppPath(slug);
  await fs.rm(to, { recursive: true, force: true });
  await fs.cp(from, to, { recursive: true });
  return { runtime: 'node', framework: 'Node.js', buildCommand: '', startCommand: 'node index.js' };
}

async function deploymentEvent(slug, values) {
  await store.update((data) => {
    data.deployments ||= [];
    data.deployments.unshift({ id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, projectSlug: slug, ...values, createdAt: new Date().toISOString() });
    data.deployments = data.deployments.slice(0, 100);
    const project = data.projects.find((p) => p.slug === slug);
    if (project) project.deployments = (project.deployments || 0) + 1;
    return data;
  });
}

async function performDeployment(slug) {
  const project = await projectBySlug(slug);
  if (project.status === 'unknown' && !manager.status(slug).running) conflict('Previous process state is unknown after a dashboard restart. Review the host process list and confirm it is stopped before redeploying.');
  if (manager.status(slug).running) conflict('Project is already running. Use Restart to redeploy a running process.');
  const projectRoot = safeAppPath(slug);
  const status = capabilities.discover();
  const secrets = await store.readSecrets();
  const envValues = secrets[slug] || {};
  await store.update((data) => { const p = data.projects.find((x) => x.slug === slug); p.status = 'deploying'; p.lastError = null; p.updatedAt = new Date().toISOString(); return data; });
  await manager.writeLog(slug, `Starting deployment for ${project.name} (${project.runtime})…`, Object.values(envValues));
  try {
    const stat = await fs.stat(projectRoot).catch(() => null);
    if (!stat || !stat.isDirectory()) throw new Error('Project source is missing. Import a Git repository, ZIP, or local project first.');
    if (!['node', 'python', 'static'].includes(project.runtime)) throw new Error(`The ${project.runtime} deployment adapter is unavailable on this host. Native adapters currently support Node.js, Python, and static sites.`);
    if (project.runtime === 'python' && !status.tools.python) throw new Error('Python 3 is not installed on this host. Install it to enable Python deployments.');
    if ((project.runtime === 'node' || project.runtime === 'static') && await exists(path.join(projectRoot, 'package.json'))) {
      if (!status.tools.npm) throw new Error('npm is not available on this host.');
      const nodeModules = await exists(path.join(projectRoot, 'node_modules'));
      if (!nodeModules) await manager.runCommand(['npm', 'install', '--no-audit', '--no-fund'], projectRoot, { ...process.env, ...envValues }, slug, Object.values(envValues));
    }
    if (project.runtime === 'python') {
      const interpreter = status.tools.pythonCommand || 'python3';
      const requirements = path.join(projectRoot, 'requirements.txt');
      if (await exists(requirements)) {
        const venvRoot = path.join(projectRoot, '.anshumanhost-venv');
        const venvPython = path.join(venvRoot, 'bin', 'python');
        const installed = path.join(venvRoot, '.requirements-sha256');
        if (!await exists(venvPython)) await manager.runCommand([interpreter, '-m', 'venv', '.anshumanhost-venv'], projectRoot, { ...process.env, ...envValues }, slug, Object.values(envValues));
        const digest = crypto.createHash('sha256').update(await fs.readFile(requirements)).digest('hex');
        const prior = await fs.readFile(installed, 'utf8').catch(() => '');
        if (prior !== digest) {
          await manager.runCommand([venvPython, '-m', 'pip', 'install', '-r', 'requirements.txt'], projectRoot, { ...process.env, ...envValues }, slug, Object.values(envValues));
          await fs.writeFile(installed, digest, { mode: 0o600 });
        }
        project.pythonExecutable = venvPython;
      } else project.pythonExecutable = interpreter;
    }
    if (project.buildCommand) await manager.runCommand(parseCommand(project.buildCommand), projectRoot, { ...process.env, ...envValues }, slug, Object.values(envValues));
    const start = await manager.start(project, envValues);
    await manager.waitForReady(project, start.port, start.process);
    if (start.process.exited) throw new Error('Application exited immediately after its health check. Check its logs.');
    await store.update((data) => {
      const p = data.projects.find((x) => x.slug === slug);
      Object.assign(p, { status: 'running', port: start.port, startedAt: start.process.startedAt, stoppedAt: null, lastError: null, startCommand: project.startCommand || p.startCommand, updatedAt: new Date().toISOString() });
      return data;
    });
    if (start.process.exited) throw new Error('Application exited immediately after its health check. Check its logs.');
    await manager.writeLog(slug, `Health check passed at ${project.healthPath}. Application is ready on port ${start.port}.`, Object.values(envValues));
    await deploymentEvent(slug, { status: 'succeeded', port: start.port });
    return await projectBySlug(slug);
  } catch (error) {
    await manager.stop(slug).catch(() => {});
    const message = error.message || 'Deployment failed.';
    await manager.writeLog(slug, `Deployment failed: ${message}`, Object.values(envValues));
    await store.update((data) => { const p = data.projects.find((x) => x.slug === slug); if (p) Object.assign(p, { status: 'failed', lastError: message, stoppedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }); return data; });
    await deploymentEvent(slug, { status: 'failed', error: message });
    throw error;
  }
}

async function deploy(slug) {
  validateSlug(slug);
  if (activeDeployments.has(slug)) conflict('A deployment is already in progress for this project.');
  activeDeployments.add(slug);
  try { return await performDeployment(slug); }
  finally { activeDeployments.delete(slug); }
}

async function extractProjectZip(buffer, slug) {
  await ensureSourceCanChange(slug);
  return extractZip(buffer, slug);
}

async function logs(slug, limit = 250) {
  await projectBySlug(slug);
  const file = path.join(config.logRoot, `${slug}.log`);
  const text = await fs.readFile(file, 'utf8').catch(() => '');
  return text.split(/\r?\n/).filter(Boolean).slice(-Math.min(1000, Math.max(1, Number(limit) || 250)));
}

async function removeProject(slug) {
  const project = await projectBySlug(slug);
  if (isDeploying(slug)) conflict('Wait for the current deployment to finish before deleting this project.');
  if (project.status === 'unknown' && !manager.status(slug).running) conflict('Review the host process list and confirm the project is stopped before deleting it.');
  await manager.stop(slug);
  await store.update((data) => { data.projects = data.projects.filter((p) => p.slug !== slug); data.deployments = data.deployments.filter((d) => d.projectSlug !== slug); return data; });
  const secrets = await store.readSecrets(); delete secrets[slug]; await store.writeSecrets(secrets);
  await fs.rm(safeAppPath(slug), { recursive: true, force: true });
  await fs.rm(path.join(config.logRoot, `${slug}.log`), { force: true });
  return project;
}

async function createBackup() {
  const id = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(config.backupRoot, id);
  await fs.mkdir(target, { recursive: true, mode: 0o700 });
  const data = await store.read();
  const secrets = await store.readSecrets();
  await fs.mkdir(path.join(target, 'data'), { mode: 0o700 });
  await fs.mkdir(path.join(target, 'apps'), { mode: 0o700 });
  await fs.copyFile(store.storePath, path.join(target, 'data', 'store.json'));
  await fs.copyFile(store.secretsPath, path.join(target, 'data', 'secrets.json'));
  for (const p of data.projects) {
    const source = safeAppPath(p.slug);
    if (await exists(source)) await fs.cp(source, path.join(target, 'apps', p.slug), { recursive: true, dereference: false, filter: (file) => !file.split(path.sep).includes('node_modules') && !file.split(path.sep).includes('.git') && !file.split(path.sep).includes('.anshumanhost-venv') });
  }
  const hasSecrets = Boolean(Object.values(secrets).some((values) => Object.keys(values || {}).length));
  const manifest = { createdAt: new Date().toISOString(), projectCount: data.projects.length, includesSecrets: hasSecrets, ...(hasSecrets ? { warning: 'Keep this backup private; project credentials are included.' } : {}) };
  await fs.writeFile(path.join(target, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { id, path: path.relative(config.root, target), projectCount: data.projects.length, includesSecrets: Boolean(Object.keys(secrets).length) };
}

async function listBackups() {
  const names = await fs.readdir(config.backupRoot).catch(() => []);
  return Promise.all(names.map(async (id) => {
    const manifest = await fs.readFile(path.join(config.backupRoot, id, 'manifest.json'), 'utf8').then(JSON.parse).catch(() => null);
    return { id, ...(manifest || {}) };
  }));
}

async function recoverStatuses() {
  await store.update((data) => {
    for (const project of data.projects) if (project.status === 'running' || project.status === 'deploying') {
      project.status = 'unknown';
      project.lastError = 'The dashboard restarted and cannot safely identify the previous child process. Review the host process list before starting again.';
    }
    return data;
  });
}

function exists(file) { return fs.access(file).then(() => true, () => false); }

module.exports = { detect, createProject, projectBySlug, updateProject, importGit, importLocal, importSample, extractZip: extractProjectZip, deploy, isDeploying, logs, removeProject, createBackup, listBackups, recoverStatuses };
