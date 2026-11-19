// A tiny static server for game/ (Node 22, standard library only), so
// the entry can be played locally without a build step:
//   node serve.ts            serves game/ on http://localhost:8080
//   node serve.ts --port 8091
// It sends the MIME types a browser game needs, refuses any path outside
// game/, and otherwise does nothing clever: a development convenience,
// not a web server for the internet.

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
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const rel = normalize(urlPath).replace(/^[/\\]+/, '');
  const file = join(root, rel);
  if (!file.startsWith(root + sep) && file !== root) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  let path = file;
  try {
    if (statSync(path).isDirectory()) path = join(path, 'index.html');
  } catch { /* fall through to the 404 below */ }
  try {
    const stat = statSync(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream', 'content-length': stat.size });
    createReadStream(path).pipe(res);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});

server.listen(port, () => console.log(`Solmar Bay on http://localhost:${port}`));
