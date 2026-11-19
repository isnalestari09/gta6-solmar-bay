// Solmar Bay — tiny static file server for local playtesting.
// Serves game/ at http://localhost:8080. Node standard library only.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'game');
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    // Browsers ask for a favicon on every load; answer empty instead of
    // logging a 404 for it.
    if (path === '/favicon.ico') {
      res.writeHead(204);
      res.end();
      return;
    }
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) {
      res.writeHead(403);
      res.end('forbidden');
      return;
    }
    const data = await readFile(file);
    // Never cache during playtesting: a stale bundle hides the latest edit.
    const headers = {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    };
    // HEAD answers headers only, so uptime probes never pull the whole file.
    if (req.method === 'HEAD') {
      res.writeHead(200, { ...headers, 'content-length': data.length });
      res.end();
      return;
    }
    res.writeHead(200, headers);
    res.end(data);
  } catch {
    console.log(`404 ${req.method} ${req.url ?? '/'}`);
    res.writeHead(404);
    res.end('not found');
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Solmar Bay: port ${port} is already in use — stop the other server or set PORT to something else.`);
  } else {
    console.error('Solmar Bay server error:', err.message);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Solmar Bay serving game/ at http://localhost:${port}`);
});
