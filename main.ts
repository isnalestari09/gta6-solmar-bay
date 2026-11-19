// Solmar Bay — the entry program for make.fun gta6-01 (Node 22, stdlib
// only). The game is the static files under game/: a Three.js open-world
// crime game that runs offline in a desktop browser. This program copies
// game/ and screenshots/ into the output directory and writes
// dossier.json with the vendored make.fun library, exactly as the kit's
// starter does. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for
// /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Everything the judge needs lives in two folders beside this file:
// game/ (the playable static game) and screenshots/ (3 or 4 real renders
// of the game running in a browser, first by name is the cover).
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's gate): at most 4 screenshots of
// at most 256 KiB, at most 993 files and 48 MiB in game/, and no game path
// over 1000 bytes. buildDossier refuses an entry the scorer would refuse.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
