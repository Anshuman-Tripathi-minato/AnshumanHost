'use strict';

const http = require('node:http');
const store = require('../services/store');
const config = require('../config');
const manager = require('../process-manager/manager');

function safeHost(header) {
  if (typeof header !== 'string' || header.length > 260 || /[\s/@\\]/.test(header)) return '';
  const host = header.toLowerCase().replace(/:\d+$/, '').replace(/\.$/, '');
  return /^[a-z0-9.-]+$/.test(host) && !host.includes('..') ? host : '';
}

async function findProject(host) {
  const data = await store.read();
  return data.projects.find((project) => project.hostname && project.hostname.toLowerCase() === host && manager.status(project.slug).running);
}

function routeHttp(req, res) {
  const host = safeHost(req.headers.host);
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

module.exports = { createProxyServer, safeHost };
