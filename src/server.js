'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const config = require('./config');
const store = require('./services/store');
const service = require('./services/deployments');
const capabilities = require('./services/capabilities');
const auth = require('./services/auth');
const manager = require('./process-manager/manager');
const { createProxyServer } = require('./reverse-proxy/server');
const { validateSlug } = require('./security/validation');

let express = null;
try { express = require('express'); } catch { /* Native HTTP fallback keeps offline installs runnable. */ }

const proxy = createProxyServer();
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

function sendJson(res, status, value) {
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(body);
}

function fail(message, status = 500) { const error = new Error(message); error.status = status; throw error; }

async function bodyOf(req, limit = 2 * 1024 * 1024) {
  const parts = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) fail('Request body is too large.', 413);
    parts.push(chunk);
  }
  if (!size) return {};
  const buffer = Buffer.concat(parts);
  const type = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (type === 'application/json') {
    try { return JSON.parse(buffer.toString('utf8')); } catch { fail('Request JSON is invalid.', 400); }
  }
  return buffer;
}

function checkBrowserRequest(req) {
  if (req.headers['sec-fetch-site'] === 'cross-site') fail('Cross-site dashboard requests are blocked.', 403);
  const origin = req.headers.origin;
  if (!origin) fail('Dashboard changes must be submitted from the signed-in browser.', 403);
  let parsed;
  try { parsed = new URL(origin); } catch { fail('Request origin is invalid.', 403); }
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const requestProtocol = forwardedProto ? `${forwardedProto}:` : req.socket.encrypted ? 'https:' : 'http:';
  if (parsed.protocol !== requestProtocol || parsed.host !== req.headers.host) fail('Dashboard API accepts same-origin requests only.', 403);
}

async function publicProjects() {
  const data = await store.read();
  return data.projects.map((project) => {
    const state = manager.status(project.slug);
    return { ...store.publicProject(project), status: state.running ? 'running' : project.status, port: state.running ? state.port : project.port, pid: state.pid || null, startedAt: state.startedAt || project.startedAt || null, uptimeSeconds: state.startedAt ? Math.floor((Date.now() - Date.parse(state.startedAt)) / 1000) : 0 };
  });
}

async function dispatch(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  const pathname = decodeURIComponent(url.pathname);
  if (!pathname.startsWith('/api/')) return false;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) checkBrowserRequest(req);
  if (req.method === 'OPTIONS') { res.writeHead(204, { allow: 'GET,HEAD,POST,PUT,DELETE,OPTIONS' }); res.end(); return true; }

  if (pathname === '/api/auth/session' && req.method === 'GET') {
    const record = await auth.readRecord();
    sendJson(res, 200, { configured: Boolean(record), authenticated: auth.isAuthenticated(req, record) });
    return true;
  }
  if (pathname === '/api/auth/setup' && req.method === 'POST') {
    if (!auth.isLoopback(req)) fail('Initial administrator setup is available only from this device.', 403);
    if (await auth.readRecord()) fail('Administrator password is already configured.', 409);
    const body = await bodyOf(req);
    const record = await auth.setPassword(body.password);
    auth.setSession(req, res, record);
    sendJson(res, 201, { authenticated: true });
    return true;
  }
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const record = await auth.readRecord();
    if (!record) fail('Set the administrator password on the host device first.', 409);
    if (!auth.allowAttempt(req)) fail('Too many sign-in attempts. Wait 15 minutes, then try again.', 429);
    const body = await bodyOf(req);
    if (!await auth.verifyPassword(body.password, record)) {
      auth.failedAttempt(req);
      fail('Password is incorrect.', 401);
    }
    auth.clearAttempts(req);
    auth.setSession(req, res, record);
    sendJson(res, 200, { authenticated: true });
    return true;
  }
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    auth.clearSession(req, res);
    sendJson(res, 200, { authenticated: false });
    return true;
  }

  if (pathname.startsWith('/api/')) {
    const record = await auth.readRecord();
    if (!record || !auth.isAuthenticated(req, record)) fail('Sign in to the AnshumanHost admin panel first.', 401);
  }
  if (pathname === '/api/auth/change-password' && req.method === 'POST') {
    const record = await auth.readRecord();
    const body = await bodyOf(req);
    if (!await auth.verifyPassword(body.currentPassword, record)) fail('Current password is incorrect.', 401);
    const next = await auth.setPassword(body.newPassword);
    auth.setSession(req, res, next);
    sendJson(res, 200, { changed: true });
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/health') { sendJson(res, 200, { ok: true, name: 'AnshumanHost', dashboard: `http://${config.host}:${config.port}`, proxy: `http://${config.proxyHost}:${config.proxyPort}` }); return true; }
  if (req.method === 'GET' && pathname === '/api/capabilities') { sendJson(res, 200, capabilities.discover()); return true; }
  if (req.method === 'GET' && pathname === '/api/projects') { sendJson(res, 200, await publicProjects()); return true; }
  if (req.method === 'GET' && pathname === '/api/overview') {
    const projects = await publicProjects();
    const data = await store.read();
    const system = capabilities.discover().system;
    sendJson(res, 200, {
      projects: projects.length,
      running: projects.filter((p) => p.status === 'running').length,
      stopped: projects.filter((p) => p.status === 'stopped').length,
      failures: projects.filter((p) => p.status === 'failed').length,
      unknown: projects.filter((p) => p.status === 'unknown').length,
      deployments: data.deployments.slice(0, 12),
      system: { uptimeSeconds: system.uptimeSeconds, loadAverage: system.loadAverage, cores: os.cpus().length, memoryTotal: system.memoryTotal, memoryFree: system.memoryFree, memoryUsedPercent: Math.round((1 - system.memoryFree / system.memoryTotal) * 100) },
    });
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/system') { sendJson(res, 200, { ...capabilities.discover(), process: { pid: process.pid, uptimeSeconds: Math.floor(process.uptime()), memory: process.memoryUsage() } }); return true; }
  if (req.method === 'GET' && pathname === '/api/deployments') { const data = await store.read(); sendJson(res, 200, data.deployments.slice(0, 100)); return true; }
  if (req.method === 'GET' && pathname === '/api/domains') {
    const projects = await publicProjects();
    sendJson(res, 200, { baseDomain: config.baseDomain, proxyUrl: `http://${config.proxyHost}:${config.proxyPort}`, projects: projects.map(({ slug, name, hostname, status, port }) => ({ slug, name, hostname, status, port })) });
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/backups') { sendJson(res, 200, await service.listBackups()); return true; }
  if (req.method === 'POST' && pathname === '/api/backups') { sendJson(res, 201, await service.createBackup()); return true; }
  if (req.method === 'POST' && pathname === '/api/projects') {
    const body = await bodyOf(req);
    const project = await service.createProject(body);
    sendJson(res, 201, store.publicProject(project)); return true;
  }
  if (req.method === 'POST' && pathname === '/api/sample/deploy') {
    const body = await bodyOf(req);
    const slug = body.slug || 'sample-app';
    const project = await service.createProject({ name: body.name || 'Sample App', slug, hostname: body.hostname || `sample.${config.baseDomain}`, runtime: 'node', framework: 'Node.js', startCommand: 'node index.js' });
    await service.importSample(project.slug);
    const ready = await service.deploy(project.slug);
    sendJson(res, 201, store.publicProject(ready)); return true;
  }

  const projectRoute = pathname.match(/^\/api\/projects\/([^/]+)(?:\/(.*))?$/);
  if (projectRoute) {
    const slug = validateSlug(projectRoute[1]);
    const action = projectRoute[2] || '';
    if (req.method === 'GET' && !action) { const project = await service.projectBySlug(slug); sendJson(res, 200, store.publicProject({ ...project, ...manager.status(slug) })); return true; }
    if (req.method === 'PUT' && !action) { const body = await bodyOf(req); sendJson(res, 200, store.publicProject(await service.updateProject(slug, body))); return true; }
    if (req.method === 'DELETE' && !action) {
      const body = await bodyOf(req);
      if (body.confirm !== slug) fail(`Send confirm: "${slug}" to delete this project and its source.`, 400);
      await service.removeProject(slug); sendJson(res, 200, { deleted: true, slug }); return true;
    }
    if (req.method === 'GET' && action === 'logs') { sendJson(res, 200, await service.logs(slug, url.searchParams.get('limit'))); return true; }
    if (req.method === 'POST' && action === 'deploy') { sendJson(res, 200, store.publicProject(await service.deploy(slug))); return true; }
    if (req.method === 'POST' && action === 'restart') { if (service.isDeploying(slug)) fail('Wait for the current deployment to finish before restarting.', 409); await manager.stop(slug); sendJson(res, 200, store.publicProject(await service.deploy(slug))); return true; }
    if (req.method === 'POST' && action === 'stop') {
      const current = await service.projectBySlug(slug);
      if (current.status === 'unknown' && !manager.status(slug).running) fail('The old process cannot be safely identified. Review the host process list, then use Confirm stopped.', 409);
      await manager.stop(slug);
      await store.update((data) => { const project = data.projects.find((p) => p.slug === slug); if (project) { project.status = 'stopped'; project.stoppedAt = new Date().toISOString(); } return data; });
      sendJson(res, 200, { stopped: true, slug }); return true;
    }
    if (req.method === 'POST' && action === 'confirm-stopped') {
      const body = await bodyOf(req);
      const current = await service.projectBySlug(slug);
      if (current.status !== 'unknown') fail('Only a project with unknown post-restart state can be confirmed this way.', 409);
      if (body.confirm !== slug) fail(`Confirm that you reviewed host processes by sending confirm: "${slug}".`, 400);
      if (manager.status(slug).running) fail('The managed process is still running. Stop it before confirming.', 409);
      await store.update((data) => { const project = data.projects.find((p) => p.slug === slug); if (project) Object.assign(project, { status: 'stopped', stoppedAt: new Date().toISOString(), lastError: null }); return data; });
      sendJson(res, 200, { stopped: true, confirmed: true, slug }); return true;
    }
    if (req.method === 'POST' && action === 'import/git') {
      const body = await bodyOf(req);
      const detected = await service.importGit(slug, body.url);
      const project = await service.updateProject(slug, { runtime: detected.runtime, framework: detected.framework, buildCommand: detected.buildCommand, startCommand: detected.startCommand });
      sendJson(res, 200, store.publicProject(project)); return true;
    }
    if (req.method === 'POST' && action === 'import/local') {
      const body = await bodyOf(req);
      const detected = await service.importLocal(slug, body.directory || slug);
      const project = await service.updateProject(slug, { runtime: detected.runtime, framework: detected.framework, buildCommand: detected.buildCommand, startCommand: detected.startCommand });
      sendJson(res, 200, store.publicProject(project)); return true;
    }
    if (req.method === 'PUT' && action === 'import/zip') {
      const archive = await bodyOf(req, config.uploadLimitBytes);
      const result = await service.extractZip(archive, slug);
      const detected = service.detect(result.destination);
      const project = await service.updateProject(slug, { runtime: detected.runtime, framework: detected.framework, buildCommand: detected.buildCommand, startCommand: detected.startCommand });
      sendJson(res, 200, { ...store.publicProject(project), importedFiles: result.files, expandedBytes: result.expandedBytes }); return true;
    }
  }
  sendJson(res, 404, { error: 'API route not found.' });
  return true;
}

async function serveStatic(req, res) {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end('Bad request'); return; }
  let relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = path.resolve(config.publicRoot, relative);
  const root = await fs.realpath(config.publicRoot);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end('Forbidden'); return; }
  let real;
  try { real = await fs.realpath(target); } catch { res.writeHead(404).end('Not found'); return; }
  if (!real.startsWith(`${root}${path.sep}`) && real !== root) { res.writeHead(403).end('Forbidden'); return; }
  const stat = await fs.stat(real);
  if (!stat.isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(real).toLowerCase()] || 'application/octet-stream', 'content-length': stat.size, 'x-content-type-options': 'nosniff', 'cache-control': path.extname(real) === '.html' ? 'no-cache' : 'public, max-age=3600' });
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(real).pipe(res);
}

function errorResponse(error, res) {
  if (res.headersSent) { res.end(); return; }
  sendJson(res, Number(error.status) || 500, { error: error.message || 'Unexpected server error.' });
}

async function main() {
  await store.ensureFiles();
  await service.recoverStatuses();
  let dashboard;
  if (express) {
    const app = express();
    app.disable('x-powered-by');
    app.use((req, res, next) => {
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('x-frame-options', 'DENY');
      res.setHeader('referrer-policy', 'no-referrer');
      res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
      res.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
      next();
    });
    app.use(async (req, res, next) => { try { if (!await dispatch(req, res)) next(); } catch (error) { errorResponse(error, res); } });
    app.use(express.static(config.publicRoot, { dotfiles: 'deny', index: 'index.html', fallthrough: true, setHeaders(res) { res.setHeader('x-content-type-options', 'nosniff'); } }));
    dashboard = app.listen(config.port, config.host);
  } else {
    dashboard = http.createServer(async (req, res) => {
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('x-frame-options', 'DENY');
      res.setHeader('referrer-policy', 'no-referrer');
      res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
      res.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
      try { if (!await dispatch(req, res)) await serveStatic(req, res); } catch (error) { errorResponse(error, res); }
    });
    await new Promise((resolve, reject) => { dashboard.once('error', reject); dashboard.listen(config.port, config.host, resolve); });
  }
  await new Promise((resolve, reject) => { if (dashboard.listening) resolve(); else { dashboard.once('listening', resolve); dashboard.once('error', reject); } });
  const proxyAddress = await proxy.listen();
  process.stdout.write(`AnshumanHost dashboard: http://${config.host}:${config.port}\nReverse proxy: http://${proxyAddress.address}:${proxyAddress.port}\n`);
  let closing = false;
  const shutdown = async () => {
    if (closing) return; closing = true;
    await manager.stopAll();
    await proxy.close();
    await new Promise((resolve) => dashboard.close(resolve));
    process.exit(0);
  };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

if (require.main === module) main().catch((error) => { process.stderr.write(`AnshumanHost could not start: ${error.message}\n`); process.exitCode = 1; });

module.exports = { dispatch, publicProjects, checkBrowserRequest, main };
