[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — Open-World Crime Game

An original open-world crime game for [make.fun](https://make.fun/bounty/gta6-01) — **gta6-01**.
Nothing here is from Rockstar or GTA: the city, the story and every line of
code are original.

Dani Reyes, getaway driver, returns to the coastal city of Solmar Bay to buy
his sister Lila's freedom from the Coral Kings. Eight story missions
($150–$2,600, plus a $1,000 epilogue chase) take him from a first job at the
docks to the final payoff at the Coral Kings compound — and one last chase
afterwards.

**Revision 2** (recorded session): mission 8 "One Last Chase" (epilogue
escape: lose a 3-star wanted level, then reach the north plaza), a second
plaza in the north-east, wanted-heat decay while hiding (no cop within 45 m
cools the trail 3x faster), a mission-fail retry that keeps earned cash
(press N after a failure), a fourth radio station (BAYWAVE FM), a dedicated
sunset-coin pickup SFX, Shift sprint on foot, camera shake on collisions,
pedestrian crossing behaviour at intersections, a polished HUD objective
tracker ("Mission 3/8" + progress bar), two extra parked cars (28 total),
a staged `?shot=plaza` screenshot, and save format v2 with automatic
migration from v1 saves.

## How to play

- **WASD / arrows** — move / drive
- **E** — steal the nearest parked car / get out
- **F** — punch, **Click** — shoot, **Shift** — sprint on foot
- **Q** — change radio station (4 stations), **M** — mute, **P** — pause
- **N** — retry the current mission after a failure / mission status,
  **R** — restart after being wasted

## Features

- Open city: road grid, two plazas with fountains, beach, sea, palms,
  48 buildings (one block kept open for the second plaza)
- 28 stealable parked cars, 14 traffic cars, pedestrians who wait at the
  kerb and cross straight at intersections, then scatter when danger nears
- Five-star wanted system with chasing, ramming police cars — and heat that
  decays 3x faster while Dani is hiding (no cop within 45 m)
- Combat on foot, 12 hidden sunset coins, taxi fares
- HUD with health, cash, ammo, speed, clock, wanted stars, objective and a
  live minimap
- Four original WebAudio radio stations (all sound synthesized, no files),
  plus a dedicated coin-pickup arpeggio SFX
- Start / pause / dead / story-complete screens, localStorage autosave
  (save v2; v1 saves migrate automatically)
- Mission 8 "One Last Chase": after buying Lila's freedom, lose a 3-star
  wanted level and reach the north plaza (90, 90) to disappear for good
- Static files only — Three.js r160 vendored, no network requests

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

MIT licensed (see `LICENSE`).
