'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const port = Number(process.env.PORT || 3100);

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ status: 'ok', service: 'AnshumanHost sample app' }));
    return;
  }
  if (req.url !== '/') { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sample App · AnshumanHost</title><body style="margin:0;background:#080909;color:#f1f1ee;font:16px system-ui;display:grid;min-height:100vh;place-items:center"><main style="max-width:560px;padding:32px;border:1px solid #4b3b17;border-radius:16px;background:#101110"><p style="color:#ffb000;letter-spacing:2px;font-size:12px">ANSHUMANHOST SAMPLE</p><h1>Deployment is alive.</h1><p>This page is served by a real child process managed by AnshumanHost.</p><p>Health check: <a style="color:#ffc928" href="/health">/health</a></p><p>Assigned port: <code>${port}</code></p></main></body></html>`);
});

server.on('upgrade', (req, socket) => {
  if (req.url !== '/ws' || !req.headers['sec-websocket-key']) { socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n'); return; }
  const accept = crypto.createHash('sha1').update(`${req.headers['sec-websocket-key']}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.on('data', (frame) => socket.write(frame));
});

server.listen(port, '127.0.0.1');
