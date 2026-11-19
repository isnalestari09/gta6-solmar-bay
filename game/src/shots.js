// Solmar Bay — staged screenshots: `?shot=start|play|chase|mission8&seed=1`
// poses the game for each of the four screenshots, then a debug hook
// (`window.__solmar`) lets the playtest drive the game headlessly.
// Shots never change the save: the shot state is applied in memory only.

import { DOCKS, PLAZAS } from './config.js';

export const SHOT_DEFS = [
  { name: '1-start.jpg', query: '?shot=start&seed=1' },
  { name: '2-play.jpg', query: '?shot=play&seed=1' },
  { name: '3-chase.jpg', query: '?shot=chase&seed=1' },
  { name: '4-mission.jpg', query: '?shot=mission8&seed=1' },
];

// Poses the game for a screenshot. `game` is the object main.js builds.
export function applyShot(game, shot) {
  const params = new URLSearchParams(window.location.search);
  const seed = Number(params.get('seed') || 1);
  void seed;
  if (shot === 'start') {
    // Plaza del Sol from above: Dani on foot, fountain, palms, cars.
    game.setPlayerAt(PLAZAS.sol.x + 2, PLAZAS.sol.z + 14, Math.PI);
    game.setCameraMode('high');
    game.startGame();
  } else if (shot === 'play') {
    // Driving the boulevard in the taxi, on the road, city ahead.
    game.setPlayerInTaxi();
    game.currentCar.pos.set(0, 0, -40);
    game.currentCar.heading = Math.PI / 2;
    game.currentCar.mesh.rotation.y = Math.PI / 2;
    game.player.pos.set(0, 0, -40);
    game.setCameraMode('drive');
    game.startGame();
  } else if (shot === 'chase') {
    // Three-star chase at Coral Plaza, camera low behind Dani, cops placed
    // close so the pursuit reads in the frame.
    game.setPlayerAt(PLAZAS.coral.x, PLAZAS.coral.z + 10, Math.PI * 0.75);
    game.wanted.setHeat(55);
    game.wanted.placeCopsNear(PLAZAS.coral.x, PLAZAS.coral.z + 10, 3);
    game.setCameraMode('chase');
    game.startGame();
  } else if (shot === 'mission8') {
    // Mission 8 at the docks: Dani on foot facing the sea, boat up-left,
    // lighthouse up-right, five stars.
    game.setPlayerAt(80, 140, 0);
    game.missions.start(7);
    game.wanted.setHeat(100);
    game.wanted.heatForced = true;
    game.setCameraMode('chase');
    game.startGame();
  }
}

export function readShotFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
}

// The headless playtest talks to the game through this hook.
export function installDebugHook(game) {
  window.__solmar = {
    version: 'solmar-bay-5',
    game,
    state() {
      return {
        started: game.started,
        paused: game.paused,
        cash: game.save.cash,
        stars: game.wanted.stars,
        heat: game.wanted.heat,
        mission: game.missions.active ? game.missions.active.name : null,
        missionsDone: game.save.missionsDone,
        coins: game.coins.filter((c) => !c.taken).length,
        player: { x: game.player.pos.x, z: game.player.pos.z, health: game.player.health },
        inCar: !!game.currentCar,
        cops: game.wanted.cops.length,
        carSpeed: game.currentCar ? Math.abs(game.currentCar.speed) : 0,
      };
    },
    press(code) {
      game.input.down.add(code);
      game.input.pressed.add(code);
      setTimeout(() => game.input.down.delete(code), 120);
    },
    hold(code, ms) {
      game.input.down.add(code);
      setTimeout(() => game.input.down.delete(code), ms);
    },
    startMission(i) {
      game.missions.start(i);
    },
    setHeat(h) {
      game.wanted.setHeat(h);
    },
    teleport(x, z) {
      game.setPlayerAt(x, z, game.player.heading);
    },
    reset() {
      game._resetWorld();
      game.startGame();
    },
  };
}
