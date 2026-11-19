// Solmar Bay — pedestrians: 26 locals strolling the sidewalks. They walk
// their own block, chat-pause at corners, and flee when Dani punches them.

import * as THREE from 'three';
import { PEDS, WORLD } from './config.js';
import { mulberry32 } from './city.js';

const SHIRTS = [0xd84315, 0x2e7d32, 0x1565c0, 0xf9a825, 0x6a1b9a, 0x00838f, 0xe0e0e0, 0xad1457];

function makePedMesh(shirt) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.4, 0.55),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  body.position.y = 1.3;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.65, 0.65),
    new THREE.MeshLambertMaterial({ color: 0xc98a5e }),
  );
  head.position.y = 2.35;
  g.add(head);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.85, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2a2a2e }),
  );
  legL.position.set(-0.27, 0.42, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.27;
  g.add(legR);
  g.userData.legL = legL;
  g.userData.legR = legR;
  return g;
}

export class Pedestrians {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = mulberry32(seed + 31);
    this.peds = [];
    for (const spot of city.pedSpots) {
      const shirt = SHIRTS[Math.floor(this.rng() * SHIRTS.length)];
      const mesh = makePedMesh(shirt);
      mesh.position.copy(spot);
      scene.add(mesh);
      this.peds.push({
        pos: spot.clone(),
        heading: this.rng() * Math.PI * 2,
        mesh,
        speed: PEDS.walkSpeed * (0.8 + this.rng() * 0.5),
        phase: this.rng() * 10,
        fleeing: 0,
        down: false,
        health: 100,
        target: null,
      });
    }
  }

  // Pick a new strolling waypoint on a nearby sidewalk.
  retarget(ped) {
    const a = this.rng() * Math.PI * 2;
    const r = 12 + this.rng() * 30;
    ped.target = new THREE.Vector3(
      Math.max(-WORLD.half + 10, Math.min(WORLD.half - 10, ped.pos.x + Math.cos(a) * r)),
      0,
      Math.max(-WORLD.half + 10, Math.min(WORLD.half - 10, ped.pos.z + Math.sin(a) * r)),
    );
  }

  update(dt, playerPos, playerPunching) {
    for (const ped of this.peds) {
      if (ped.down) continue;
      const dPlayer = Math.hypot(ped.pos.x - playerPos.x, ped.pos.z - playerPos.z);
      if (playerPunching && dPlayer < 3.5) ped.fleeing = 2.5;
      let speed = ped.speed;
      let dir;
      if (ped.fleeing > 0) {
        ped.fleeing -= dt;
        speed = PEDS.fleeSpeed;
        dir = new THREE.Vector3(ped.pos.x - playerPos.x, 0, ped.pos.z - playerPos.z).normalize();
      } else {
        if (!ped.target || ped.pos.distanceTo(ped.target) < 2) this.retarget(ped);
        dir = ped.target.clone().sub(ped.pos).setY(0).normalize();
      }
      ped.pos.addScaledVector(dir, speed * dt);
      this.city.collideCircle(ped.pos, 0.7);
      ped.heading = Math.atan2(dir.x, dir.z);
      ped.mesh.position.copy(ped.pos);
      ped.mesh.rotation.y = ped.heading;
      ped.phase += speed * dt * 2.2;
      const swing = 0.45;
      ped.mesh.userData.legL.rotation.x = Math.sin(ped.phase) * swing;
      ped.mesh.userData.legR.rotation.x = -Math.sin(ped.phase) * swing;
    }
  }

  // The punch: anyone inside the arc in front of Dani takes damage. Returns
  // how many went down.
  punchAt(pos, heading) {
    let downs = 0;
    for (const ped of this.peds) {
      if (ped.down) continue;
      const dx = ped.pos.x - pos.x;
      const dz = ped.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 2.8) continue;
      const ang = Math.atan2(dx, dz);
      let diff = ang - heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > 1.1) continue;
      ped.health -= 34;
      ped.fleeing = 3;
      if (ped.health <= 0) {
        ped.down = true;
        ped.mesh.rotation.x = -Math.PI / 2;
        ped.mesh.position.y = 0.4;
        downs += 1;
      }
    }
    return downs;
  }

  nearest(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const ped of this.peds) {
      if (ped.down) continue;
      const d = Math.hypot(ped.pos.x - pos.x, ped.pos.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = ped;
      }
    }
    return best;
  }

  countUp() {
    return this.peds.filter((p) => !p.down).length;
  }
}
