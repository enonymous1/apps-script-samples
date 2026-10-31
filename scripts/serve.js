// Tiny zero-dependency static server for local site preview.
// Usage: node scripts/serve.js [port]  (default 8080)
// Serves the site/ directory only; no directory listing, no uploads.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const rawPort = process.argv[2] || '8080';
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid port: ${rawPort}. Pass a number between 1 and 65535.`);
}
const siteDir = path.resolve(__dirname, '..', 'site');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    // A malformed percent-escape used to throw URIError out of the
    // handler and kill the server; a bad request is a 400, not a crash.
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400); res.end('Bad request'); return;
  }
  const rel = urlPath.replace(/^\/+/, '');
  const target = urlPath.endsWith('/') ? path.join(siteDir, rel, 'index.html') : path.join(siteDir, rel);
  // path.relative, not a startsWith() prefix test: a sibling directory
  // whose name merely starts with "site" must not pass the check.
  const relative = path.relative(siteDir, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
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
