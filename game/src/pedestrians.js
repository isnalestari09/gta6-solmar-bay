// Pedestrians: simple walkers who stroll the sidewalks, wait at the kerb
// at intersections, then cross straight. They scatter when a car or a
// gunshot comes near.

import * as THREE from 'three';
import { WORLD, ROADS, mulberry32 } from './config.js';

const SHIRTS = [0xd95f4b, 0x4b8fd9, 0x6ab04b, 0xe8c33a, 0x9b59b6, 0xeeeeee, 0x333333];

export class Pedestrians {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.peds = [];
    const rng = mulberry32(4242);
    for (let i = 0; i < 26; i++) {
      const shirt = SHIRTS[i % SHIRTS.length];
      const group = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.5), new THREE.MeshLambertMaterial({ color: shirt }));
      body.position.y = 1.1;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
      head.position.y = 2.15;
      group.add(head);
      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.4), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
      legs.position.y = 0.45;
      group.add(legs);
      const horizontal = rng() < 0.5;
      const road = ROADS[Math.floor(rng() * ROADS.length)];
      const pos = -180 + rng() * 360;
      group.position.set(horizontal ? pos : road + 8, 0, horizontal ? road + 8 : pos);
      scene.add(group);
      this.peds.push({
        mesh: group, horizontal, road, pos,
        speed: 1.2 + rng() * 1.2, dir: rng() < 0.5 ? 1 : -1,
        state: 'walk', wait: 0, danger: null,
      });
    }
  }

  scatter(x, z, radius = 14) {
    for (const p of this.peds) {
      const px = p.mesh.position.x, pz = p.mesh.position.z;
      if (Math.hypot(px - x, pz - z) < radius) {
        p.state = 'flee';
        p.danger = { x, z };
        p.fleeTime = 1.5;
      }
    }
  }

  update(dt) {
    for (const p of this.peds) {
      if (p.state === 'flee') {
        p.fleeTime -= dt;
        const d = p.danger || { x: p.mesh.position.x, z: p.mesh.position.z };
        const dx = p.mesh.position.x - d.x, dz = p.mesh.position.z - d.z;
        const len = Math.hypot(dx, dz) || 1;
        p.mesh.position.x += (dx / len) * 5 * dt;
        p.mesh.position.z += (dz / len) * 5 * dt;
        if (p.fleeTime <= 0) { p.state = 'walk'; p.danger = null; }
        continue;
      }
      // Wait at the kerb before crossing an intersection.
      const atCross = this.city.atIntersection(p.mesh.position.x, p.mesh.position.z);
      if (p.state === 'walk' && atCross && Math.random() < dt * 0.4) {
        p.state = 'wait';
        p.wait = 1 + Math.random() * 1.5;
      } else if (p.state === 'wait') {
        p.wait -= dt;
        if (p.wait <= 0) p.state = 'cross';
      } else if (p.state === 'cross') {
        p.pos += p.speed * 2 * p.dir * dt;
        if (Math.abs(p.pos) > 195) { p.state = 'walk'; }
      }
      if (p.state === 'walk' || p.state === 'cross') {
        p.pos += p.speed * p.dir * dt;
        if (p.pos > 195) { p.pos = -195; }
        if (p.pos < -195) { p.pos = 195; }
      }
      if (p.horizontal) {
        p.mesh.position.set(p.pos, 0, p.road + 8);
        p.mesh.rotation.y = p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        p.mesh.position.set(p.road + 8, 0, p.pos);
        p.mesh.rotation.y = p.dir > 0 ? 0 : Math.PI;
      }
    }
  }
}
