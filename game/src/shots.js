// shots.js — staged screenshot scenes for the entry: each one paints a moment of
// the game that shows a different system at once, then sets window.__shotReady.

import { hitsCollider, roadLines } from './city.js';

/** Longest clear stretch of road to drive along, so a staged car is on asphalt
 *  (not wedged against a building that juts into the road) when the shot lands. */
function longestClearRun(colliders) {
  let best = null;
  const dirs = [
    { dx: 0, dz: 1, angle: 0 }, { dx: 0, dz: -1, angle: Math.PI },
    { dx: 1, dz: 0, angle: Math.PI / 2 }, { dx: -1, dz: 0, angle: -Math.PI / 2 },
  ];
  for (const line of roadLines()) {
    for (const d of dirs) {
      let runStart = null;
      let runLen = 0;
      for (let t = -240; t <= 240; t += 4) {
        const x = d.dx === 0 ? line : t;
        const z = d.dz === 0 ? line : t;
        const clear = !hitsCollider(colliders, x, z, 3);
        if (clear) {
          if (runStart === null) { runStart = t; runLen = 0; }
          runLen += 4;
          if (!best || runLen > best.len) best = { x, z, angle: d.angle, len: runLen, start: { x: d.dx === 0 ? line : runStart, z: d.dz === 0 ? line : runStart } };
        } else {
          runStart = null;
          runLen = 0;
        }
      }
    }
  }
  return best;
}

export function stageShot(name, game) {
  const { player, camera, wanted, missions, traffic, police } = game;
  if (name === 'start') {
    // Title screen over the plaza at sunset: the city, the hero, the HUD.
    game.screen = 'title';
    player.x = 0; player.z = 24;
    player.mesh.position.set(0, 0, 24);
    camera.yaw = 0.5; camera.pitch = 0.22; camera.distance = 22;
    camera.update({ x: 0, y: 0, z: 24 }, 1);
  } else if (name === 'drive') {
    // Dani driving down the avenue, traffic ahead, minimap and speed on the HUD.
    game.screen = 'playing';
    game.autoDrive = true;
    const car = game.parkedCars[0];
    player.inCar = car;
    // Put the car at the start of the longest clear stretch of road, facing
    // along it, so the shot shows the car driving on asphalt with the city ahead.
    const run = longestClearRun(game.colliders);
    const start = run ? run.start : { x: 0, z: -120 };
    const angle = run ? run.angle : 0;
    car.x = start.x; car.z = start.z; car.angle = angle;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.angle;
    player.x = car.x; player.z = car.z;
    car.speed = 22;
    camera.yaw = angle; camera.pitch = 0.3; camera.distance = 13;
    camera.update({ x: car.x, y: 0, z: car.z }, 1);
  } else if (name === 'chase') {
    // A three-star police chase: sirens, wanted stars, the mission marker ahead.
    game.screen = 'playing';
    game.autoDrive = true;
    wanted.stars = 3;
    wanted.heat = 90;
    const car = game.parkedCars[1] || game.parkedCars[0];
    player.inCar = car;
    player.x = car.x; player.z = car.z;
    car.speed = 30;
    wanted.update(0.1, { x: car.x, z: car.z }, game.colliders, Math.random);
    // Put the pursuit in frame: two police cars flanking ahead, one closing in behind.
    const spots = [[-9, 22, 0.2], [10, 26, -0.2], [0, -26, 0]];
    wanted.policeCars.forEach((p, i) => {
      const s = spots[i % spots.length];
      p.x = car.x + s[0];
      p.z = car.z + s[1];
      p.angle = s[2];
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.angle;
    });
    game.hud.setMission('Escape the police — lose 3 stars!');
    camera.yaw = 0; camera.pitch = 0.3; camera.distance = 16;
    camera.update({ x: car.x, y: 0, z: car.z }, 1);
  } else if (name === 'mission') {
    // On foot at the casino, mission beacon overhead, an enemy ahead, HUD live.
    game.screen = 'playing';
    missions.start();
    missions.index = 5;
    missions.objectiveIndex = 0;
    missions.showObjective();
    player.x = 128; player.z = 52;
    player.mesh.position.set(128, 0, 52);
    // Vela's men wait in front of the casino (west side), under the beacon.
    game.spawnEnemies(140, 52, 2);
    camera.yaw = Math.PI / 2; camera.pitch = 0.3; camera.distance = 16;
    camera.update({ x: 128, y: 0, z: 52 }, 1);
  }
  game.hud.setWanted(wanted.stars);
  game.hud.setMission(missions.objective ? missions.objective.text : 'Free roam — Solmar Bay');
  game.hud.setCash(player.cash);
  game.hud.setHealth(player.health);
  game.hud.drawMinimap(game.minimapState());
  window.__shotReady = true;
}
