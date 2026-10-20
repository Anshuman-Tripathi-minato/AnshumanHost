'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = fs.realpathSync(path.resolve(process.argv[2] || process.cwd()));
const port = Number(process.env.PORT || 3100);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };

// Hidden files (.git, .env, the managed Python venv) and dependency folders are never public.
function isHidden(relative) {
  return relative.split(/[\\/]+/).some((part) => (part.startsWith('.') && part !== '.well-known') || part === 'node_modules');
}

function inside(target) { return target === root || target.startsWith(`${root}${path.sep}`); }

http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { allow: 'GET, HEAD' }).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end('Bad request'); return; }
  const relative = pathname.replace(/^\/+/, '') || 'index.html';
  if (relative.includes('\0') || isHidden(relative)) { res.writeHead(404).end('Not found'); return; }
  let target = path.resolve(root, relative);
  if (!inside(target)) { res.writeHead(403).end('Forbidden'); return; }
  if (!fs.existsSync(target)) target = path.join(root, 'index.html');
  try {
    target = fs.realpathSync(target);
    if (!inside(target)) { res.writeHead(403).end('Forbidden'); return; }
    if (fs.statSync(target).isDirectory()) target = fs.realpathSync(path.join(target, 'index.html'));
  } catch { res.writeHead(404).end('Not found'); return; }
  if (target === root || !inside(target) || isHidden(path.relative(root, target))) { res.writeHead(404).end('Not found'); return; }
  let stat;
  try { stat = fs.statSync(target); } catch { res.writeHead(404).end('Not found'); return; }
  if (!stat.isFile()) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'content-type': types[path.extname(target).toLowerCase()] || 'application/octet-stream', 'content-length': stat.size, 'x-content-type-options': 'nosniff' });
  if (req.method === 'HEAD') { res.end(); return; }
  const stream = fs.createReadStream(target);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}).listen(port, '127.0.0.1');
