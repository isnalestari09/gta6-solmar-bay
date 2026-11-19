// Solmar Bay — the entry program. One job: copy game/ and screenshots/ from
// this repository into the output directory and write the dossier buildDossier
// builds from them, byte for byte the same on every run.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 48 * 1024 * 1024,
  game_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(gameDir)) fail('game/ is missing');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
if (!existsSync(shotsDir)) fail('screenshots/ is missing');

mkdirSync(outDir, { recursive: true });
// A stale output must never leak into the new one: wipe it first.
for (const name of ['game', 'screenshots', 'dossier.json']) {
  const target = join(outDir, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}
cpSync(gameDir, join(outDir, 'game'), { recursive: true });
cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log(`main.ts: wrote ${outDir}/dossier.json (${Buffer.byteLength(dossier, 'utf8')} bytes)`);
