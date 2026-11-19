# Solmar Bay — Make GTA 6 (gta6-01)

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game for make.fun's **Make GTA 6** bounty
($1,666, 100 places). Nothing in it is from Rockstar Games: the city,
characters, vehicles, names, story, art, sound and music are all original.

Dani Reyes, getaway driver, comes home to coastal Solmar Bay to buy his
sister Lila's freedom from the Coral Kings. Eight story missions pay
$150–$2,600; the epilogue is a final escape chase to the north plaza.

## What's in the game

- A coastal city on a 5x5 road grid: buildings, two plazas with fountains,
  a beach and sea, palm trees
- On foot and by car: 28 stealable parked cars, 14 traffic cars, 26
  pedestrians who wait at kerbs and cross at intersections
- A 5-star wanted system with police cruisers that chase and ram; hiding
  cools the heat three times faster
- Combat (mouse to shoot, 60 ammo), 12 sunset coins (+$50 each), taxi
  fares, a HUD with cash, health, speed, a live minimap and a mission
  objective tracker
- Four WebAudio radio stations (all sound is synthesised, no audio files)
- Title / pause / dead / story-complete screens, localStorage autosave
  (save v2, migrates v1), mission fail + retry that never takes earned cash

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk or drive |
| Shift | Sprint on foot |
| E | Steal / exit a car |
| Mouse click | Shoot |
| P / Esc | Pause |
| N | Retry a failed mission |
| R | Next radio station |
| M | Mute |
| Enter | Start / restart |

## Play it

```sh
node serve.ts        # http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with the vendored make.fun library. Static files
only — the game makes no network request.
