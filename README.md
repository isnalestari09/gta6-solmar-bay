# Solmar Bay — an open-world crime game

Dani Reyes, getaway driver, returns to coastal Solmar Bay to buy his sister
Lila's freedom from the Coral Kings. The price: $2,600. Steal cars, outrun the
Solmar Bay PD, run taxi fares, collect sunset coins and work through 8 story
missions — ending in a five-star epilogue chase to the boat at the docks.

## Play

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/` is plain static files, Three.js r160 is
vendored under `game/vendor/`.

## Controls

- WASD — walk / drive, mouse drag — camera
- Shift — sprint, E — enter / leave a car, F or Space — punch
- M — next mission, T — taxi fare (while driving the yellow taxi)
- R or 1–4 — radio stations, N — mute, P — pause

## Systems

- Open city: road grid, two plazas, docks with a lighthouse, 28 parked cars to steal, 14 traffic cars, 26 pedestrians
- Five-star wanted system: police spawn around the player and chase; heat decays fast while hiding
- 8 story missions ($150–$2,600), fail keeps your cash, retry is free; objectives show live distance and progress
- Taxi fares, 12 hidden sunset coins with a HUD counter, 4 WebAudio-synth radio stations
- HUD with objective tracker and live minimap (coins, docks, police, mission marker), localStorage save v2
- Camera shake, coin SFX, sirens, engine hum, brake/reverse lights, punch arm swing, pause and busted flow

## Playtest

Headless Chrome (CDP harness in `/tmp/solmar-playtest2.mjs`) drives the real
game: page load, walking, car theft, driving, mission start, police spawn,
coin pickup and save v2 — **14/14 checks pass with zero console errors**.
The 4 screenshots in `screenshots/` are real gameplay captures at 1280×720.

## Revision pass (round 2, recorded session)

Every authored file was revised in the recorded session: shared constants
for camera/economy/wanted tuning, a coins HUD counter and docks marker on
the minimap, live progress on mission objectives, a lighthouse and boat
sail at the docks, punch arm swing and sprint lean, pedestrians that flee
a punch, brake/reverse lights, a mission-step chime with siren ducking,
Space as a second punch key, save validation and v1 cleanup, and
`main.ts` screenshot validation before the dossier is written.

## Handing in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to the output directory and writes `dossier.json` with the kit's
`buildDossier` from `vendor/makefun-game.ts`.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see LICENSE.
