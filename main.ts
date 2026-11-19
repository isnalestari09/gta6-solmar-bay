// Solmar Bay — the entry program (Node 22, standard library only).
// It hands the game in: copies game/ and screenshots/ from beside this file
// to the output directory and writes dossier.json, the summary the judge
// reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

function countGameFiles(dir) {
  let files = 0;
  let bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countGameFiles(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}

const game = countGameFiles(gameDir);
console.log(`Solmar Bay: ${game.files} game files, ${(game.bytes / 1024).toFixed(1)} KiB`);
const shots = existsSync(shotsDir) ? readdirSync(shotsDir).filter((name) => extname(name).toLowerCase() === '.jpg' || extname(name).toLowerCase() === '.png') : [];
console.log(`Solmar Bay: ${shots.length} screenshots: ${shots.join(', ')}`);
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`Solmar Bay: expected 3 or 4 screenshots, found ${shots.length} — take them with the playtest first.`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Solmar Bay: dossier written to ${join(out, 'dossier.json')}`);
const dossierHash = createHash('sha256').update(readFileSync(join(out, 'dossier.json'))).digest('hex');
console.log(`Solmar Bay: dossier sha256 ${dossierHash}`);
