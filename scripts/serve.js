// Tiny zero-dependency static server for local site preview.
// Usage: node scripts/serve.js [port]  (default 8080)
// Serves the site/ directory only; no directory listing, no uploads.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.argv[2] || 8080);
const siteDir = path.resolve(__dirname, '..', 'site');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const rel = urlPath.replace(/^\/+/, '');
  const target = urlPath.endsWith('/') ? path.join(siteDir, rel, 'index.html') : path.join(siteDir, rel);
  if (!target.startsWith(siteDir)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'text/plain' });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Preview the site at http://localhost:${port}/ (Ctrl+C to stop)`);
});
