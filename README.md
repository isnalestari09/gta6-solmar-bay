[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — Open-World Crime Game

An original open-world crime game for [make.fun](https://make.fun/bounty/gta6-01) — **gta6-01**.
Nothing here is from Rockstar or GTA: the city, the story and every line of
code are original.

Dani Reyes, getaway driver, returns to the coastal city of Solmar Bay to buy
his sister Lila's freedom from the Coral Kings. Seven story missions
($150–$2,500) take him from a first job at the docks to the final payoff at
the Coral Kings compound.

## How to play

- **WASD / arrows** — move / drive
- **E** — steal the nearest parked car / get out
- **F** — punch, **Click** — shoot
- **Q** — change radio station, **M** — mute, **P** — pause
- **N** — mission status, **R** — restart after being wasted

## Features

- Open city: road grid, plaza with a fountain, beach, sea, palms, 49 buildings
- 26 stealable parked cars, 14 traffic cars, pedestrians who scatter
- Five-star wanted system with chasing, ramming police cars
- Combat on foot, 12 hidden sunset coins, taxi fares
- HUD with health, cash, ammo, speed, clock, wanted stars, objective and a
  live minimap
- Three original WebAudio radio stations (all sound synthesized, no files)
- Start / pause / dead / story-complete screens, localStorage autosave
- Static files only — Three.js r160 vendored, no network requests

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

MIT licensed (see `LICENSE`).
