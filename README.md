[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — an open-world crime game

An original open-world crime game in the spirit of GTA 6, built for the
[make.fun "Make GTA 6" bounty](https://make.fun/bounty/gta6-01). It runs offline
in a desktop browser from its own static files — no build step, no network.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

- **WASD / arrows** — move & drive · **Shift** — run / boost
- **E** — steal / exit a car · **Mouse click** — shoot · **F** — punch
- **Mouse drag** — camera · **Wheel** — zoom · **R** — radio · **M** — mute
- **P** — pause · **N** — start the next mission

## The game

Dani Reyes, a getaway driver, comes home to **Solmar Bay**, a sun-soaked coastal
city, to buy his sister Lila's freedom from the Coral Kings. Seven story
missions — from meeting Lila at the pier to the final sunset run — plus:

- a city to explore on foot and by car: roads, traffic, pedestrians, a beach,
  a marina, a casino, a garage and a central plaza
- cars to steal and drive, with arcade handling
- a five-star wanted level: police cars chase and ram you, the heat fades
  when you lay low
- combat on foot, three original radio stations (all music synthesised live
  with WebAudio — no audio files), engine hum, sirens and gunshots
- side jobs: taxi fares, twelve hidden sunset coins, stunt driving
- a HUD with health, cash, ammo, speed, a clock and a live minimap
- a start screen and a save (localStorage) — progress survives a closed tab

Everything is original: the city, characters, vehicles, names, story, art,
sound and music were made for this entry. Nothing comes from a commercial game.
Three.js (MIT) is vendored under `game/vendor/`.

## Files

| File | Job |
| --- | --- |
| `game/index.html` | Page, HUD and menus |
| `game/src/main.js` | Boot, loop, screens, input, enemies, save |
| `game/src/config.js` | Tuning, palette, story, missions |
| `game/src/city.js` | `buildSolmarBayCity`, roads, buildings, beach |
| `game/src/player.js` | On-foot movement, chase camera, shooting |
| `game/src/vehicles.js` | Cars, traffic, police chases, driving |
| `game/src/pedestrians.js` | Sidewalk crowds that scatter |
| `game/src/wanted.js` | Wanted stars and police response |
| `game/src/missions.js` | Seven story missions, coins, side jobs |
| `game/src/hud.js` | HUD and live minimap |
| `game/src/audio.js` | Synthesised radio, engine, sirens, gunshots |
| `game/src/save.js` | localStorage save / best |
| `game/src/shots.js` | Staged screenshot scenes |
| `main.ts` | Entry program: copies `game/` + `screenshots/`, writes `dossier.json` |
| `screenshots/` | 4 real renders of the game (1280×720) |

## Submit (for the owner)

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` writes `/output/dossier.json` with `vendor/makefun-game.ts`
(`buildDossier`). See the kit's `RULES.txt` for the full enter flow.

**Important — read before submitting:** this entry was built in this Muse
session, which the kit's `record` command does not record. The rules say an
entry built in an unrecorded session is rejected, or ranks but takes **no paid
place**. To submit for real, redo the entry in a recorded harness (e.g. the
free Superbot, https://superbot.gg): start a new session with the kit's
`record` command running, rebuild this game there, and submit from that
session. The public repo must be created after the competition opened
(2026-11-17 15:00 UTC) and owned by the user's own GitHub account —
`isnalestari09` (make.fun account `@isnalestari09`). Payout is in USDC on
Solana and this make.fun account has **no built-in wallet** ("No wallet
linked"), so link an external Solana wallet (e.g. Phantom) before payout.

## Tested 2026-11-18 (local, headless Chrome 131 + SwiftShader)

- **Screenshots** — 4 real renders, 1280×720 JPEG, 51–82 KB each
  (≤256 KiB cap): `1-start.jpg` title screen, `2-drive.jpg` 111 km/h toward
  the plaza fountain with traffic, `3-chase.jpg` 3-star chase at 130 km/h
  with two police cars, `4-mission.jpg` on foot at the casino with two
  enemies. Zero console/page errors on every load.
- **Playtest** — title screen → Enter starts play with mission 1 active;
  walking moves the player; **E** steals the nearest parked car; driving
  moves the car (45 km/h shown); click shoots (ammo 60 → 59); **P**
  pauses/resumes; autosave wrote `solmar-bay.save.v1` to localStorage.
  **N** only starts a mission when none is running — mission 1 starts
  automatically on Enter, so pressing N mid-mission is a no-op by design.
- **Build** — `main.ts` run twice produces byte-identical output;
  `dossier.json` 431 KB (4 images, cover 0); `game/` 740 KB, 14 files
  (caps: 48 MiB, 993 files). The built `out/game/` copy loads with **zero
  external requests** — fully offline.
- **Bugs found and fixed while testing** — parked cars could spawn inside a
  building collider and wedge forever (spawn now retries clear spots, and
  `driveCar` slides along walls / pushes out of colliders); the staged
  screenshots first showed only the title screen (the shot code now switches
  screens) and the drive shot first showed a stuck car at 0 km/h (the shot
  now starts on the longest clear stretch of road, found by scanning the
  colliders). Headless Chrome in this VM runs the game in slow motion under
  software rendering — on a real GPU it runs at full speed; the fixed-step
  loop caps at 5 steps/frame, so low frame rates slow the game rather than
  breaking it.

## License

MIT — see `LICENSE`.
