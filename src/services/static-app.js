'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(path.resolve(process.argv[2] || process.cwd()));
const port = Number(process.env.PORT || 3100);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end('Bad request'); return; }
  const relative = pathname.replace(/^\/+/, '') || 'index.html';
  let target = path.resolve(root, relative);
  if (!target.startsWith(`${root}${path.sep}`) && target !== root) { res.writeHead(403).end('Forbidden'); return; }
  if (!fs.existsSync(target)) target = path.join(root, 'index.html');
  try { target = fs.realpathSync(target); } catch { res.writeHead(404).end('Not found'); return; }
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end('Forbidden'); return; }
  if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
  try { target = fs.realpathSync(target); } catch { res.writeHead(404).end('Not found'); return; }
  if (!target.startsWith(`${root}${path.sep}`)) { res.writeHead(403).end('Forbidden'); return; }
  if (!fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'x-content-type-options': 'nosniff' });
  fs.createReadStream(target).pipe(res);
}).listen(port, '127.0.0.1');
