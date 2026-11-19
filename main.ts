// Solmar Bay — the entry program for make.fun's Make GTA 6 (gta6-01).
// Node 22, standard library only. Copies game/ and screenshots/ from this
// repository into the output directory and writes dossier.json with the kit's
// buildDossier from vendor/makefun-game.ts, exactly as the scorer rebuilds it.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
if (!existsSync(gameSrc)) throw new Error('main.ts: game/ is missing from the repository');
if (!existsSync(join(gameSrc, 'index.html'))) throw new Error('main.ts: game/index.html is missing from the repository');
if (!existsSync(shotsSrc)) throw new Error('main.ts: screenshots/ is missing from the repository');
// The dossier only accepts up to 4 screenshots of 256 KiB each: fail loudly
// here instead of shipping a build the scorer would reject.
const shotFiles = readdirSync(shotsSrc).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
if (shotFiles.length !== 4) throw new Error(`main.ts: expected 4 screenshots, found ${shotFiles.length}`);
for (const f of shotFiles) {
  const size = statSync(join(shotsSrc, f)).size;
  if (size > 262144) throw new Error(`main.ts: screenshot ${f} is ${size} bytes, over the 256 KiB limit`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree(gameSrc, join(outDir, 'game'));
copyTree(shotsSrc, join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// Report the dossier fingerprint and file counts, so two runs can be
// compared byte-for-byte and the scorer's rebuild can be sanity-checked.
function countFiles(dir) {
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}
const hash = createHash('sha256').update(dossier).digest('hex');
console.log(`Solmar Bay dossier written: ${dossier.length} bytes to ${outDir}/dossier.json`);
console.log(`dossier sha256: ${hash}`);
console.log(`screenshots: ${shotFiles.join(', ')}`);
console.log(`game files: ${countFiles(join(outDir, 'game'))}, screenshots: ${countFiles(join(outDir, 'screenshots'))}`);
