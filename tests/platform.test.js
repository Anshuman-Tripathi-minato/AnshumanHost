'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');
const config = require('../src/config');
const store = require('../src/services/store');
const service = require('../src/services/deployments');
const manager = require('../src/process-manager/manager');
const { parseCommand, validateSlug } = require('../src/security/validation');
const { createProxyServer, safeHost } = require('../src/reverse-proxy/server');
const { discover } = require('../src/services/capabilities');

function makeZip(name, contents = 'hostile') {
  const filename = Buffer.from(name);
  const body = Buffer.from(contents);
  const local = Buffer.alloc(30 + filename.length + body.length);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0, 6); local.writeUInt16LE(0, 8);
  local.writeUInt32LE(body.length, 18); local.writeUInt32LE(body.length, 22); local.writeUInt16LE(filename.length, 26);
  filename.copy(local, 30); body.copy(local, 30 + filename.length);
  const central = Buffer.alloc(46 + filename.length);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0, 8); central.writeUInt16LE(0, 10);
  central.writeUInt32LE(body.length, 20); central.writeUInt32LE(body.length, 24); central.writeUInt16LE(filename.length, 28); filename.copy(central, 46);
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(central.length, 12); eocd.writeUInt32LE(local.length, 16);
  return Buffer.concat([local, central, eocd]);
}

function proxyRequest(host, route = '/') {
  return new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port: config.proxyPort, path: route, headers: { host } }, (response) => {
      const chunks = []; response.on('data', (chunk) => chunks.push(chunk)); response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    request.on('error', reject);
  });
}

function websocketHandshake(host) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(config.proxyPort, config.proxyHost);
    const timeout = setTimeout(() => { socket.destroy(); reject(new Error('WebSocket proxy handshake timed out.')); }, 5000);
    let response = '';
    socket.on('connect', () => socket.write(`GET /ws HTTP/1.1\r\nHost: ${host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n`));
    socket.on('data', (chunk) => {
      response += chunk.toString();
      if (response.includes('\r\n\r\n')) { clearTimeout(timeout); socket.destroy(); resolve(response); }
    });
    socket.on('error', (error) => { clearTimeout(timeout); reject(error); });
  });
}

test('AnshumanHost local deployment vertical slice', async (t) => {
  await store.ensureFiles();
  const slug = `test-${process.pid}-${Date.now().toString(36)}`;
  const hostname = `${slug}.anshuman.online`;
  let proxy;
  let created = false;
  try {
    await t.test('validation blocks unsafe slugs and shell composition', () => {
      assert.equal(validateSlug(slug), slug);
      assert.throws(() => validateSlug('../outside'));
      assert.deepEqual(parseCommand('npm run build'), ['npm', 'run', 'build']);
      assert.throws(() => parseCommand('node index.js && echo unsafe'));
    });

    await t.test('project creation and duplicate slug validation', async () => {
      const project = await service.createProject({ name: 'Sample deployment', slug, hostname, runtime: 'node', framework: 'Node.js', startCommand: 'node index.js', healthPath: '/health' });
      created = true;
      assert.equal(project.slug, slug);
      await assert.rejects(service.createProject({ name: 'Duplicate', slug, hostname }), (error) => error.status === 409);
    });

    await t.test('sample process starts, answers health checks, logs, and gets an unused port', async () => {
      await service.importSample(slug);
      const deployed = await service.deploy(slug);
      assert.equal(deployed.status, 'running');
      assert.ok(deployed.port >= config.portStart && deployed.port <= config.portEnd);
      const otherPort = await manager.choosePort();
      assert.notEqual(otherPort, deployed.port);
      const health = await new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port: deployed.port, path: '/health' }, (response) => { response.resume(); resolve(response.statusCode); }).on('error', reject));
      assert.equal(health, 200);
      const log = (await service.logs(slug, 100)).join('\n');
      assert.match(log, /Health check passed/);
    });

    await t.test('registered hostname routing and unknown hosts', async () => {
      proxy = createProxyServer(); await proxy.listen();
      const result = await proxyRequest(hostname, '/health');
      assert.equal(result.status, 200);
      assert.match(result.body, /AnshumanHost sample app/);
      const unknown = await proxyRequest('unregistered.invalid');
      assert.equal(unknown.status, 404);
      assert.equal(safeHost('project.anshuman.online:8780'), 'project.anshuman.online');
      assert.equal(safeHost('host/attack'), '');
    });

    await t.test('WebSocket upgrade is proxied to the registered process', async () => {
      const response = await websocketHandshake(hostname);
      assert.match(response, /^HTTP\/1\.1 101 Switching Protocols/);
      assert.match(response, /Sec-WebSocket-Accept:/i);
    });

    await t.test('ZIP path traversal is rejected before extraction', async () => {
      await manager.stop(slug);
      await store.update((data) => { data.projects.find((item) => item.slug === slug).status = 'stopped'; return data; });
      const archive = makeZip('../escape.txt');
      await assert.rejects(service.extractZip(archive, slug), /unsafe path/i);
      await assert.rejects(service.extractZip(Buffer.from('not a zip'), slug), /empty|invalid/i);
    });

    await t.test('metadata persists and restart recovery marks stale process state unknown', async () => {
      const before = await service.projectBySlug(slug);
      assert.equal(before.hostname, hostname);
      await manager.stop(slug);
      await store.update((data) => { const project = data.projects.find((item) => item.slug === slug); project.status = 'running'; return data; });
      await service.recoverStatuses();
      const after = await service.projectBySlug(slug);
      assert.equal(after.status, 'unknown');
      await store.update((data) => { const project = data.projects.find((item) => item.slug === slug); project.status = 'stopped'; return data; });
    });

    await t.test('secret values are redacted in persisted logs', async () => {
      const secret = `private-${Date.now()}`;
      await store.update((data) => { data.projects.find((item) => item.slug === slug).status = 'stopped'; return data; });
      await manager.writeLog(slug, `credential=${secret}`, [secret]);
      const lines = await service.logs(slug, 3);
      assert.ok(lines.at(-1).includes('[REDACTED]'));
      assert.ok(!lines.at(-1).includes(secret));
    });

    await t.test('invalid start settings fail with a clear message', async () => {
      await service.updateProject(slug, { startCommand: 'node missing-entry.js' });
      await assert.rejects(service.deploy(slug), /exited during startup|health check/i);
      await assert.rejects(service.updateProject(slug, { startCommand: 'node index.js; echo unsafe' }), /shell operators/i);
      const afterFailure = await service.projectBySlug(slug);
      assert.equal(afterFailure.status, 'failed');
      await service.updateProject(slug, { startCommand: 'node index.js' });
    });

    await t.test('host capability report is discovered from this process', () => {
      const capabilities = discover();
      assert.equal(typeof capabilities.host.platform, 'string');
      assert.ok(capabilities.runtimes.some((runtime) => runtime.name === 'Docker Engine'));
      assert.ok(capabilities.runtimes.some((runtime) => runtime.name === 'Node.js' && runtime.state === 'native'));
    });
  } finally {
    if (proxy) await proxy.close().catch(() => {});
    await manager.stop(slug).catch(() => {});
    if (created) await service.removeProject(slug).catch(async () => {
      await store.update((data) => { data.projects = data.projects.filter((item) => item.slug !== slug); data.deployments = data.deployments.filter((item) => item.projectSlug !== slug); return data; });
      await fs.rm(path.join(config.appRoot, slug), { recursive: true, force: true });
      await fs.rm(path.join(config.logRoot, `${slug}.log`), { force: true });
    });
  }
});
