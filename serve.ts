// A tiny static server for game/ (Node 22, standard library only): `node
// serve.ts` serves game/ on http://localhost:8080. It sends the MIME types a
// browser game needs, refuses any path outside game/, answers HEAD, and
// sends no-cache headers so a rebuild is never shadowed by a stale file.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const requested = portIndex === -1 ? 8080 : Number(args[portIndex + 1]);
const port = Number.isInteger(requested) && requested > 0 && requested < 65536 ? requested : 8080;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer((request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const decoded = decodeURIComponent(url.pathname);
  const safe = normalize(join(root, decoded)).replace(/\\/g, '/');
  if (!safe.startsWith(root.replace(/\\/g, '/') + sep) && safe !== root.replace(/\\/g, '/')) {
    response.writeHead(403);
    response.end('forbidden');
    return;
  }
  let path = safe;
  if (decoded.endsWith('/')) path = join(path, 'index.html');
  let stat;
  try {
    stat = statSync(path);
  } catch {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  if (!stat.isFile()) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  if (request.url === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  const type = MIME[extname(path).toLowerCase()] || 'application/octet-stream';
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff', 'content-length': stat.size });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  createReadStream(path).pipe(response);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use — stop the other server or pass --port <n>.`);
    process.exit(1);
  }
  throw err;
});

server.listen(port, () => {
  console.log(`Solmar Bay on http://localhost:${port}`);
});
