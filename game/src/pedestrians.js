// Solmar Bay — pedestrians: 26 locals wandering the sidewalks, fleeing when
// the player starts trouble. Simple capsule figures, varied shirts.

import * as THREE from 'three';
import { WORLD, clamp, randPick, mulberry32, dist2d } from './config.js';
import { resolveCollisions } from './city.js';

const SHIRTS = [0xd84a4a, 0x4a7ad8, 0x4ad87a, 0xd8c84a, 0x9a4ad8, 0xe8e8e8, 0x4ad8d8, 0xd88a4a];
const SKINS = [0xc89878, 0x8a5a3a, 0xe8b898, 0x6a3a22];

function makePedMesh(shirt, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 1.15, 10),
    new THREE.MeshLambertMaterial({ color: shirt })
  );
  body.position.y = 0.95;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 12, 10),
    new THREE.MeshLambertMaterial({ color: skin })
  );
  head.position.y = 1.85;
  g.add(head);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
  for (const x of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.24), legMat);
    leg.position.set(x, 0.4, 0);
    g.add(leg);
  }
  return g;
}

export function spawnPedestrians(scene) {
  const rng = mulberry32(31337);
  const peds = [];
  for (let i = 0; i < 26; i++) {
    const mesh = makePedMesh(randPick(SHIRTS), randPick(SKINS));
    scene.add(mesh);
    const x = (rng() * 2 - 1) * (WORLD.half - 20);
    const z = (rng() * 2 - 1) * (WORLD.half - 20);
    mesh.position.set(x, 0, z);
    peds.push({
      mesh,
      x,
      z,
      heading: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.1,
      targetX: x,
      targetZ: z,
      fleeing: false,
      walkPhase: rng() * 6,
    });
  }
  return peds;
}

export function updatePedestrians(peds, dt, playerX, playerZ, wantedStars, colliders, cars = []) {
  for (const p of peds) {
    const dPlayer = dist2d(p.x, p.z, playerX, playerZ);
    // A punch keeps locals fleeing for a few seconds even after the heat
    // drops, so the crowd does not instantly calm down mid-scare.
    p.fleeing = (wantedStars > 0 && dPlayer < 26) || performance.now() < (p.fleeUntil || 0);
    let tx = p.targetX;
    let tz = p.targetZ;
    if (p.fleeing) {
      const away = Math.atan2(p.x - playerX, p.z - playerZ);
      tx = p.x + Math.sin(away) * 20;
      tz = p.z + Math.cos(away) * 20;
    } else if (dist2d(p.x, p.z, tx, tz) < 2) {
      tx = p.targetX = clamp(p.x + (Math.random() * 2 - 1) * 60, -WORLD.half + 8, WORLD.half - 8);
      tz = p.targetZ = clamp(p.z + (Math.random() * 2 - 1) * 60, -WORLD.half + 8, WORLD.half - 8);
    }
    // Steer around parked cars instead of walking straight through them.
    for (const c of cars) {
      if (dist2d(p.x, p.z, c.x, c.z) < 3.5) {
        const away = Math.atan2(p.x - c.x, p.z - c.z);
        tx = p.x + Math.sin(away) * 12;
        tz = p.z + Math.cos(away) * 12;
        break;
      }
    }
    const wantHeading = Math.atan2(tx - p.x, tz - p.z);
    let diff = wantHeading - p.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    p.heading += clamp(diff, -2.4 * dt, 2.4 * dt);
    const speed = p.fleeing ? p.speed * 2.6 : p.speed;
    const pos = {
      x: p.x + Math.sin(p.heading) * speed * dt,
      z: p.z + Math.cos(p.heading) * speed * dt,
    };
    resolveCollisions(pos, 0.5, colliders);
    p.x = clamp(pos.x, -WORLD.half + 4, WORLD.half - 4);
    p.z = clamp(pos.z, -WORLD.half + 4, WORLD.half - 4);
    p.walkPhase += dt * speed * 3;
    p.mesh.position.set(p.x, Math.abs(Math.sin(p.walkPhase)) * 0.06, p.z);
    p.mesh.rotation.y = p.heading;
  }
}

/** A punch nearby sends locals running: give every pedestrian in range a
 * flee target away from the punch, so the crowd reacts to Dani's violence
 * even before the wanted level catches up. */
export function scarePedestrians(peds, x, z, radius = 14) {
  for (const p of peds) {
    if (dist2d(p.x, p.z, x, z) < radius) {
      const away = Math.atan2(p.x - x, p.z - z);
      p.targetX = clamp(p.x + Math.sin(away) * 30, -WORLD.half + 8, WORLD.half - 8);
      p.targetZ = clamp(p.z + Math.cos(away) * 30, -WORLD.half + 8, WORLD.half - 8);
      p.fleeing = true;
      p.fleeUntil = performance.now() + 4000;
    }
  }
}
