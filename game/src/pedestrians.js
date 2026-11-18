// pedestrians.js — the people of Solmar Bay: shoppers, joggers and beach-goers who
// stroll the sidewalks, scatter when gunfire starts, and sometimes call the police.

import * as THREE from '../vendor/three.module.min.js';
import { roadLines, clampToCity } from './city.js';

const SHIRTS = [0xe8e8e8, 0xd94040, 0x3a7bd9, 0xe8c93a, 0x7ab648, 0xd97ab0, 0x40c9d9, 0xff8a3a];

function buildPedestrianMesh(color) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const pants = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), shirt);
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
  head.position.y = 1.95;
  group.add(head);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.85, 0.3), pants);
  leg.position.set(-0.2, 0.42, 0);
  group.add(leg);
  const leg2 = leg.clone();
  leg2.position.x = 0.2;
  group.add(leg2);
  return group;
}

export function spawnPedestrians(scene, count, rng) {
  const peds = [];
  const lines = roadLines();
  for (let i = 0; i < count; i++) {
    const mesh = buildPedestrianMesh(SHIRTS[i % SHIRTS.length]);
    const x = (rng() - 0.5) * 440;
    const z = (rng() - 0.5) * 440;
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    peds.push({
      mesh, x, z,
      angle: rng() * Math.PI * 2,
      speed: 1.2 + rng() * 1.4,
      walkPhase: rng() * 6,
      health: 100,
      fleeing: false,
      turnTimer: 2 + rng() * 4,
      line: lines[Math.floor(rng() * lines.length)],
    });
  }
  return peds;
}

/** Walk the sidewalks; run away from the player when they are scared. */
export function updatePedestrians(peds, dt, playerPos, scared) {
  for (const p of peds) {
    if (p.health <= 0) continue;
    p.turnTimer -= dt;
    const dist = Math.hypot(playerPos.x - p.x, playerPos.z - p.z);
    if (scared && dist < 22) p.fleeing = true;
    if (p.fleeing) {
      p.angle = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
      p.speed = 5;
      if (dist > 40) p.fleeing = false;
    } else if (p.turnTimer <= 0) {
      p.angle += (Math.random() - 0.5) * 1.6;
      p.turnTimer = 2 + Math.random() * 4;
      p.speed = 1.2 + Math.random() * 1.4;
    }
    p.x += Math.sin(p.angle) * p.speed * dt;
    p.z += Math.cos(p.angle) * p.speed * dt;
    const clamped = clampToCity(p.x, p.z);
    if (clamped.x !== p.x || clamped.z !== p.z) {
      p.angle += Math.PI;
      p.x = clamped.x;
      p.z = clamped.z;
    }
    p.walkPhase += dt * p.speed * 2;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.angle;
    p.mesh.children[0].rotation.x = Math.sin(p.walkPhase) * 0.15;
  }
}
