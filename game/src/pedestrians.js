// Solmar Bay — pedestrians: 26 locals who stroll the sidewalks, scatter
// when a car comes close, and flee for a few seconds after a punch lands.

import * as THREE from 'three';
import { WORLD, mulberry32, distance2D } from './config.js';
import { hitsCollider, clampToWorld } from './city.js';

const SHIRT_COLORS = [0xd8d8d8, 0x3c7dd8, 0xd83c6e, 0x3ca86e, 0xe0b13c, 0x7a4fd8];

function makePedMesh(shirtColor) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d5f });
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.45), shirt);
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.85;
  group.add(head);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.6, 0.28), new THREE.MeshLambertMaterial({ color: 0x333a44 }));
  legL.position.set(-0.2, 0.3, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.2;
  group.add(legR);
  group.userData = { legL, legR };
  return group;
}

export class Pedestrians {
  constructor(scene, colliders) {
    this.colliders = colliders;
    this.peds = [];
    const rand = mulberry32(31337);
    for (let i = 0; i < 26; i++) {
      const shirt = SHIRT_COLORS[i % SHIRT_COLORS.length];
      const mesh = makePedMesh(shirt);
      // Start on a sidewalk: just off a road line.
      const line = WORLD.roadLines[Math.floor(rand() * WORLD.roadLines.length)];
      const along = -160 + rand() * 320;
      const horizontal = rand() < 0.5;
      const x = horizontal ? along : line + 9;
      const z = horizontal ? line + 9 : along;
      mesh.position.set(x, 0, Math.min(z, WORLD.docksAt - 14));
      scene.add(mesh);
      this.peds.push({
        mesh,
        pos: mesh.position,
        heading: rand() * Math.PI * 2,
        speed: 1.2 + rand() * 1.1,
        panic: 0,
        walkPhase: rand() * 6,
        down: false,
        downTimer: 0,
      });
    }
  }

  update(dt, playerPos, cars, threats = []) {
    for (const ped of this.peds) {
      if (ped.down) {
        ped.downTimer -= dt;
        ped.mesh.rotation.x = ped.downTimer > 0 ? -Math.PI / 2 : 0;
        if (ped.downTimer <= 0) {
          ped.down = false;
          ped.mesh.rotation.x = 0;
        }
        continue;
      }
      ped.panic = Math.max(0, ped.panic - dt);
      // Scatter from a fast car that gets close, and from a police car
      // bearing down with its siren — peds know what that means.
      let fleeX = 0;
      let fleeZ = 0;
      for (const car of cars) {
        if (Math.abs(car.speed) < 4) continue;
        const d = distance2D(ped.pos.x, ped.pos.z, car.pos.x, car.pos.z);
        if (d < 7) {
          const inv = 1 / Math.max(d, 0.5);
          fleeX += (ped.pos.x - car.pos.x) * inv;
          fleeZ += (ped.pos.z - car.pos.z) * inv;
        }
      }
      for (const cop of threats) {
        const d = distance2D(ped.pos.x, ped.pos.z, cop.pos.x, cop.pos.z);
        if (d < 9) {
          const inv = 1 / Math.max(d, 0.5);
          fleeX += (ped.pos.x - cop.pos.x) * inv * 1.5;
          fleeZ += (ped.pos.z - cop.pos.z) * inv * 1.5;
          ped.panic = Math.max(ped.panic, 2);
        }
      }
      const dPlayer = distance2D(ped.pos.x, ped.pos.z, playerPos.x, playerPos.z);
      if (ped.panic > 0 && dPlayer < 8) {
        fleeX += (ped.pos.x - playerPos.x) / Math.max(dPlayer, 0.5);
        fleeZ += (ped.pos.z - playerPos.z) / Math.max(dPlayer, 0.5);
      }
      if (fleeX !== 0 || fleeZ !== 0) {
        ped.heading = Math.atan2(fleeX, fleeZ);
      } else if (Math.random() < dt * 0.08) {
        // Wander: occasionally pick a new direction.
        ped.heading += (Math.random() - 0.5) * 1.6;
      }
      const speed = ped.panic > 0 ? ped.speed * 3 : ped.speed;
      const nx = ped.pos.x + Math.sin(ped.heading) * speed * dt;
      const nz = ped.pos.z + Math.cos(ped.heading) * speed * dt;
      ped.pos.x = nx;
      ped.pos.z = nz;
      if (hitsCollider(this.colliders, ped.pos.x, ped.pos.z, 0.5)) {
        ped.pos.x -= Math.sin(ped.heading) * speed * dt;
        ped.pos.z -= Math.cos(ped.heading) * speed * dt;
        ped.heading += Math.PI / 2;
      }
      clampToWorld(ped.pos, 6);
      ped.walkPhase += dt * speed * 3;
      ped.mesh.rotation.y = ped.heading;
      ped.mesh.userData.legL.rotation.x = Math.sin(ped.walkPhase) * 0.5;
      ped.mesh.userData.legR.rotation.x = -Math.sin(ped.walkPhase) * 0.5;
    }
  }

  // The punch test: returns the ped hit, if any, in front of the player.
  punchAt(x, z, heading, range, arc) {
    for (const ped of this.peds) {
      if (ped.down) continue;
      const d = distance2D(x, z, ped.pos.x, ped.pos.z);
      if (d > range) continue;
      const angleTo = Math.atan2(ped.pos.x - x, ped.pos.z - z);
      let diff = angleTo - heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > arc) continue;
      ped.down = true;
      ped.downTimer = 2.2;
      ped.panic = 4;
      return ped;
    }
    return null;
  }
}
