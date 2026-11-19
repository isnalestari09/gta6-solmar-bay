# gta6-solmar-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is an original open-world crime game that runs offline in a desktop browser. Dani Reyes, getaway driver, comes home to the sun-soaked coastal city of Solmar Bay to buy his sister Lila's freedom from the Coral Kings — $2,600, earned one job at a time.

The city is yours on foot and by car: 28 stealable parked cars, 14 traffic cars, 26 pedestrians, a five-star wanted system with police who hunt you down, 12 hidden sunset coins, taxi fares, punch combat, four synth radio stations, and a live minimap. Eight story missions climb from stealing your first car to the finale — *One Last Chase* — a five-star escape to Lila's boat at the docks. Progress saves in the browser (localStorage, save format v2).

Everything in it is original: the city, the characters, the story, the art and the music. Nothing from Rockstar Games or any other commercial game.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and play with keyboard and mouse.

## Controls

- **WASD** — move on foot / drive
- **E** — enter or leave a car
- **F / Space** — punch
- **Shift** — sprint
- **M** — start the next mission (retry after a fail)
- **T** — pick up a taxi fare (in a car, near a pedestrian)
- **R / 1-4** — change radio station
- **N** — mute
- **P** — pause

## Build

`main.ts` (Node 22, standard library only) hands the game in: it copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout

- `game/index.html` — page, import map, HUD and overlays
- `game/src/config.js` — world, palette, economy, missions, radio
- `game/src/main.js` — renderer, loop, state machine, coins, save
- `game/src/city.js` — the city: roads, towers, plaza, docks, lighthouse
- `game/src/player.js` — Dani on foot and driving, chase camera
- `game/src/vehicles.js` — parked cars and traffic
- `game/src/pedestrians.js` — the people of Solmar Bay
- `game/src/wanted.js` — stars, police pursuit, busts, heat decay
- `game/src/missions.js` — the eight-mission story and taxi fares
- `game/src/hud.js` — HUD, minimap and overlays
- `game/src/audio.js` — synthesised radio and sound effects (WebAudio)
- `game/src/input.js` — keyboard input
- `game/src/save.js` — localStorage save v2 (with v1 migration)
- `game/src/shots.js` — screenshot presets (`?shot=start|play|chase|mission`)
- `game/vendor/three.module.min.js` — three.js r160, vendored

---

<sub>Entered on [make.fun](https://make.fun/?ref=7fcw42xg&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
