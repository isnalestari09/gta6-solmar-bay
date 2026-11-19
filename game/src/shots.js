// Staged screenshot modes, driven by ?shot=...&seed=1. Each mode places
// Dani, a car and the camera so the first rendered frame already frames
// the subject, and (for driving shots) auto-drives so the car does not
// coast to a stop under slow software rendering.

import { MISSIONS } from './config.js';

export const SHOTS = {
  start: { label: 'Title screen at the south plaza' },
  play: { label: 'Driving down the main road' },
  chase: { label: 'Three-star police chase' },
  mission: { label: 'Dani at the Coral Kings compound' },
  plaza: { label: 'The north plaza, mission 8 beacon' },
};

export function applyShot(game, name) {
  const g = game;
  if (name === 'start') {
    g.player.reset(-120, -100);
    g.player.angle = Math.PI;
    g.cameraMode = 'title';
    return;
  }
  if (name === 'play') {
    g.player.reset(0, 60);
    const car = g.vehicles.parked[0];
    if (car) { g.player.x = car.x; g.player.z = car.z; g.player.enterCar(car); g.player.carSpeed = 30; g.autoDrive = true; }
    g.player.angle = Math.PI;
    g.cameraMode = 'chase';
    return;
  }
  if (name === 'chase') {
    g.player.reset(0, 40);
    const car = g.vehicles.parked[1] || g.vehicles.parked[0];
    if (car) { g.player.x = car.x; g.player.z = car.z; g.player.enterCar(car); g.player.carSpeed = 28; g.autoDrive = true; }
    g.wanted.addCrime(55, 'chase');
    g.wanted.addCrime(10, 'chase');
    // Stage one cruiser ahead on the road so the chase reads in the frame.
    g.vehicles.spawnPolice(g.player.x + 30, g.player.z + 10);
    g.cameraMode = 'chase';
    return;
  }
  if (name === 'mission') {
    g.missions.index = 6;
    g.missions._placeBeacon();
    // Stand on road x=80, south of the beacon at (80,80), facing north:
    // the road is clear of buildings, so the camera sees the beacon.
    g.player.reset(80, 62);
    g.player.angle = 0;
    g.cameraMode = 'chase';
    return;
  }
  if (name === 'plaza') {
    g.missions.index = 7;
    g.missions._placeBeacon();
    g.player.reset(120, 100);
    g.player.angle = Math.PI;
    g.cameraMode = 'orbit';
    return;
  }
  g.player.reset(0, -20);
}

export function shotList() { return Object.keys(SHOTS); }
