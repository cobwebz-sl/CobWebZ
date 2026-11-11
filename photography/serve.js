// Local preview server: node serve.js, then open http://localhost:3000/
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
};

function send(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(text);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return send(res, 400, '400 Bad Request');
  }
  // Only files inside this folder: "../" tricks and null bytes are refused
  const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (urlPath.includes('\0') || !filePath.startsWith(ROOT + path.sep)) {
    return send(res, 403, '403 Forbidden');
  }
  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'EISDIR') return send(res, 404, '404 Not Found');
      return send(res, 500, '500 Server Error');
    }
    res.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  });
});

// Listens on this computer only, not the whole network
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
