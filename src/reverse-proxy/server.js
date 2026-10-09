'use strict';

const http = require('node:http');
const store = require('../services/store');
const config = require('../config');
const manager = require('../process-manager/manager');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');

const showcaseMime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function safeHost(header) {
  if (typeof header !== 'string' || header.length > 260 || /[\s/@\\]/.test(header)) return '';
  const host = header.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  return /^[a-z0-9.-]+$/.test(host) && !host.includes('..') ? host : '';
}

async function findProject(host) {
  const data = await store.read();
  return data.projects.find((project) => project.hostname && project.hostname.toLowerCase() === host && manager.status(project.slug).running);
}

function isDirectoryHost(host) { return host === config.baseDomain || host === `www.${config.baseDomain}` || host === 'localhost' || host === '127.0.0.1'; }

async function publishedProjects() {
  const data = await store.read();
  return data.projects.flatMap((project) => {
    const state = manager.status(project.slug);
    const hostname = safeHost(project.hostname || '');
    if (project.isPublic === false || !state.running || !hostname || !hostname.endsWith(`.${config.baseDomain}`)) return [];
    return [{
      slug: project.slug,
      name: project.name,
      description: project.description || '',
      runtime: project.runtime || '',
      framework: project.framework || '',
      hostname,
      projectUrl: `https://${hostname}`,
      youtubeUrl: project.youtubeUrl || '',
    }];
  });
}

async function directoryApi(req, res, pathname) {
  const match = pathname.match(/^\/directory-api\/projects(?:\/([a-z0-9-]+))?\/?$/i);
  if (!match) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD', 'cache-control': 'no-store' }).end();
    return true;
  }
  const projects = await publishedProjects();
  const project = match[1] ? projects.find((item) => item.slug === match[1]) : null;
  if (match[1] && !project) {
    const body = Buffer.from(JSON.stringify({ error: 'Project not found.' }));
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : body);
    return true;
  }
  const value = match[1] ? project : projects;
  const body = Buffer.from(JSON.stringify(value));
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'content-length': body.length, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(req.method === 'HEAD' ? undefined : body);
  return true;
}

async function serveDirectory(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }
  if (await directoryApi(req, res, pathname)) return;
  const detailRoute = /^\/projects\/[a-z0-9-]+\/?$/i.test(pathname);
  const relative = pathname === '/' || detailRoute ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = path.resolve(config.showcaseRoot, relative);
  const root = await fs.realpath(config.showcaseRoot);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end('Forbidden'); return; }
  let real;
  try { real = await fs.realpath(target); } catch { res.writeHead(404).end('Not found'); return; }
  if (!real.startsWith(`${root}${path.sep}`) || !(await fs.stat(real)).isFile()) { res.writeHead(404).end('Not found'); return; }
  const stat = await fs.stat(real);
  res.writeHead(200, {
    'content-type': showcaseMime[path.extname(real).toLowerCase()] || 'application/octet-stream',
    'content-length': stat.size,
    'cache-control': path.extname(real) === '.html' ? 'no-cache' : 'public, max-age=3600',
    'content-security-policy': "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
  });
  if (req.method === 'HEAD') res.end(); else {
    const stream = createReadStream(real);
    stream.on('error', (error) => {
      process.stderr.write(`Public directory file read failed: ${error.message}\n`);
      if (res.headersSent) res.destroy();
      else res.writeHead(500).end('File unavailable.');
    });
    stream.pipe(res);
  }
}

function routeHttp(req, res) {
  const host = safeHost(req.headers.host);
  if (isDirectoryHost(host)) {
    serveDirectory(req, res).catch((error) => {
      process.stderr.write(`Public directory request failed: ${error.message}\n`);
      if (res.headersSent) { res.destroy(); return; }
      res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end('Project directory is temporarily unavailable.');
    });
    return;
  }
  findProject(host).then((project) => {
    if (!project) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); res.end('No running project is registered for this hostname.'); return; }
    const port = manager.status(project.slug).port;
    const headers = { ...req.headers, host: req.headers.host, 'x-forwarded-host': req.headers.host, 'x-forwarded-proto': 'http', 'x-forwarded-for': req.socket.remoteAddress || '' };
    delete headers.connection;
    const upstream = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers }, (response) => {
      res.writeHead(response.statusCode || 502, response.headers);
      response.pipe(res);
    });
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' }); res.end('Project upstream is unavailable.'); });
    req.pipe(upstream);
  }).catch(() => { if (!res.headersSent) res.writeHead(503); res.end('Project routing is temporarily unavailable.'); });
}

function createProxyServer() {
  const server = http.createServer(routeHttp);
  server.on('upgrade', async (req, client, head) => {
    const host = safeHost(req.headers.host);
    if (isDirectoryHost(host)) { client.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); client.destroy(); return; }
    const project = await findProject(host).catch(() => null);
    if (!project) { client.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); client.destroy(); return; }
    const port = manager.status(project.slug).port;
    const upstream = http.request({ host: '127.0.0.1', port, method: req.method, path: req.url, headers: { ...req.headers, host: req.headers.host, 'x-forwarded-host': req.headers.host, 'x-forwarded-proto': 'http', 'x-forwarded-for': client.remoteAddress || '' } });
    upstream.on('upgrade', (response, socket, upstreamHead) => {
      const lines = [`HTTP/1.1 ${response.statusCode || 101} ${response.statusMessage || 'Switching Protocols'}`];
      for (const [key, value] of Object.entries(response.headers)) lines.push(`${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
      client.write(`${lines.join('\r\n')}\r\n\r\n`);
      if (upstreamHead.length) client.write(upstreamHead);
      if (head.length) socket.write(head);
      socket.pipe(client).pipe(socket);
      socket.on('error', () => client.destroy()); client.on('error', () => socket.destroy());
    });
    upstream.on('response', () => { client.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n'); client.destroy(); });
    upstream.on('error', () => { client.write('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n'); client.destroy(); });
    upstream.end();
  });
  return {
    server,
    listen() { return new Promise((resolve, reject) => { server.once('error', reject); server.listen(config.proxyPort, config.proxyHost, () => { server.removeListener('error', reject); resolve(server.address()); }); }); },
    close() { return new Promise((resolve) => server.close(() => resolve())); },
  };
}

module.exports = { createProxyServer, safeHost, isDirectoryHost, publishedProjects, serveDirectory };
