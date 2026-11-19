[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/isnalestari09/gta6-solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar Bay — an open-world crime game

Entry for make.fun bounty `gta6-01` — $1,666, 100 places paid.
Deadline: Mon 24 Nov 2026 22:00 WIB (Mon 24 Nov 2026 15:00 UTC).

Dani Reyes, getaway driver, returns to coastal Solmar Bay to buy his sister
Lila's freedom from the Coral Kings — the price is $2,600. Steal cars, outrun
the Solmar Bay PD, run taxi fares, collect 12 sunset coins and work through
8 story missions, ending in a five-star epilogue chase to the boat at the
docks. An original game: nothing here is from Rockstar Games or GTA.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files, Three.js r160 is
vendored under `game/vendor/`. Works offline in desktop Chrome.

## Controls

- WASD — walk / drive, mouse drag — camera
- Shift — sprint · E — enter / leave car · F / Space — punch
- M — next mission · T — taxi fare (in the yellow taxi)
- R / 1-4 — radio stations · N — mute · P — pause

## The city

A sunset grid city: Plaza del Sol with its fountain, Coral Plaza, a docks
strip with a lighthouse and the escape boat, 28 parked cars to steal, 14
traffic cars, 26 pedestrians, a five-star wanted system with police who
chase and ram, four WebAudio-synth radio stations, and a save that lives in
localStorage (v2, with v1 migration). Progress saves after every mission,
fare and coin.

## The missions

1. First Wheels — $150 · steal a car, bring it to Plaza del Sol
2. Lila's Note — $200 · meet the contact at Coral Plaza
3. The Drop — $300 · drive a package to the docks warehouse
4. Hot Cargo — $400 · two stops, one hot cargo
5. Rough Crowd — $500 · knock down 2 hecklers at Coral Plaza
6. Taxi Shift — $350 · finish a fare in the yellow taxi
7. The Exchange — $600 · the lighthouse, then the boat
8. One Last Chase — $2,600 · five stars, escape to the boat — Lila is free
