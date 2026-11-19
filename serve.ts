// Solmar Bay — the dev server. One job: serve game/ as static files on
// localhost so the game can be played and screenshotted in desktop Chrome.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(resolve(fileURLToPath(import.meta.url), '..'), 'game');
const port = Number(process.env.PORT || 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const path = normalize(join(root, url === '/' ? 'index.html' : url));
  if (!path.startsWith(root) || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(path).pipe(res);
});

server.listen(port, () => {
  console.log(`Solmar Bay served at http://localhost:${port}`);
});
