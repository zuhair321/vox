import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const preferredDir = path.join(__dirname, 'dist');
const fallbackDir = path.join(__dirname, 'build');
const buildDir = fs.existsSync(path.join(preferredDir, 'index.html')) ? preferredDir : fallbackDir;

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const rawUrl = request.url || '/';
  const urlPath = decodeURIComponent(rawUrl.split('?')[0]);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = path.join(buildDir, safePath);
  const indexPath = path.join(buildDir, 'index.html');

  if (!requestedPath.startsWith(buildDir)) {
    sendFile(response, indexPath);
    return;
  }

  fs.stat(requestedPath, (error, stats) => {
    if (!error && stats.isFile()) {
      sendFile(response, requestedPath);
      return;
    }

    sendFile(response, indexPath);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`VOX frontend listening on http://${HOST}:${PORT}`);
});
