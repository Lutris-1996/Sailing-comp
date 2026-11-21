/* Minimaler statischer Server für lokale Tests und zum Ausprobieren: `npm start`. */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

function createServer() {
  return http.createServer((req, res) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400).end();
      return;
    }
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const file = path.normalize(path.join(ROOT, urlPath));
    if (!file.startsWith(ROOT + path.sep) || file.includes(`${path.sep}tests${path.sep}`)) {
      res.writeHead(404).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 8080;
  createServer().listen(port, () => {
    console.log(`Schluckspecht läuft auf http://localhost:${port}`);
  });
}
