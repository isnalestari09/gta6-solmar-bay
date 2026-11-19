// Solmar Bay — staged shots for screenshots and the debug hooks the playtest
// harness uses. URL ?shot=N stages a view; window.__solmar exposes game state.

import { dist2d } from './config.js';

export const SHOTS = [
  { name: '1-start', label: 'Plaza del Sol at sunset, Dani on foot', cam: [118, 26, 128], look: [92, 2, 92], state: 'menu' },
  { name: '2-play', label: 'Driving the boulevard in a stolen sedan', cam: [30, 12, -40], look: [0, 2, 10], state: 'drive' },
  { name: '3-chase', label: 'Three-star police chase at Coral Plaza', cam: [-60, 22, -60], look: [-92, 2, -92], state: 'chase' },
  // Mission shot: chase camera behind Dani as he runs for the boat, so the
  // player, the docks and the escape boat are all in frame.
  { name: '4-mission', label: 'Mission marker at the docks', cam: [0, 7, 146], look: [0, 2, 200], state: 'mission' },
];

export function stageShot(game, n) {
  const shot = SHOTS[n];
  if (!shot) return null;
  game.shotName = shot.name;
  game.hideMenuForShot();
  if (shot.state === 'drive') {
    const car = game.parked[0];
    game.player.enterCar(car);
    car.x = 0;
    car.z = -20;
    car.heading = 0;
    car.speed = 22;
    game.camYaw = Math.PI;
  } else if (shot.state === 'chase') {
    game.player.teleport(-92, -70, 0);
    game.wanted.heat = 300;
    game.wanted.stars = 3;
    const car = game.parked[1];
    game.player.enterCar(car);
    car.x = -92;
    car.z = -70;
    car.heading = 0.6;
    car.speed = 20;
  } else if (shot.state === 'mission') {
    game.player.teleport(0, 160, Math.PI);
    game.missions.start(7, game);
  } else {
    game.player.teleport(92, 70, Math.PI);
  }
  game.shotCamera = { pos: shot.cam, look: shot.look };
  return shot;
}

export function installDebugHooks(game) {
  window.__solmar = {
    game,
    version: 'solmar-bay-3',
    get state() {
      return {
        cash: game.cash,
        missionsDone: game.missionsDone,
        missionActive: game.missions.active,
        missionIndex: game.missions.index,
        missionStep: game.missions.step,
        wanted: game.wanted.stars,
        heat: Math.round(game.wanted.heat),
        coins: game.coinsCollected,
        fares: game.faresDone,
        inCar: !!game.player.inCar,
        px: Math.round(game.player.x),
        pz: Math.round(game.player.z),
        shot: game.shotName ?? null,
        errors: game.errors.slice(),
      };
    },
    teleport(x, z) {
      game.player.teleport(x, z, 0);
    },
    startMission(i) {
      game.missions.start(i, game);
    },
    setWanted(n) {
      game.wanted.heat = n * 100;
      game.wanted.stars = n;
    },
    giveCash(n) {
      game.cash += n;
    },
    shot(n) {
      return stageShot(game, n);
    },
  };
  const params = new URLSearchParams(location.search);
  const shot = params.get('shot');
  if (shot !== null) {
    const n = parseInt(shot, 10);
    if (!Number.isNaN(n)) {
      game.pendingShot = n;
    }
  }
  window.addEventListener('error', (e) => {
    game.errors.push(String(e.message || e.error || 'error'));
  });
}
