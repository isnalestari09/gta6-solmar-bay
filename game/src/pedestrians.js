// Pedestrians: 26 walkers who stroll the sidewalks and scatter when a car
// or a gunshot comes near. A few of them are taxi riders during mission 3.

import * as THREE from 'three';
import { mulberry32, pick } from './config.js';

const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xecf0f1, 0x34495e];

export class Pedestrian {
  constructor(mesh, x, z, rng) {
    this.mesh = mesh;
    this.pos = new THREE.Vector3(x, 0, z);
    this.angle = rng() * Math.PI * 2;
    this.speed = 1.2 + rng() * 1.4;
    this.fleeing = 0;      // seconds left of fleeing
    this.isRider = false;
    this.mesh.position.copy(this.pos);
  }

  update(dt, city, danger) {
    if (danger) this.fleeing = 1.5;
    if (this.fleeing > 0) {
      this.fleeing -= dt;
      // Run away from the danger point.
      const dx = this.pos.x - danger.x;
      const dz = this.pos.z - danger.z;
      const d = Math.hypot(dx, dz) || 1;
      this.angle = Math.atan2(dx / d, dz / d);
      this.pos.x += Math.sin(this.angle) * 5.5 * dt;
      this.pos.z += Math.cos(this.angle) * 5.5 * dt;
    } else {
      // Wander: mostly straight, occasional turn.
      if (Math.random() < dt * 0.25) this.angle += (Math.random() - 0.5) * 1.6;
      this.pos.x += Math.sin(this.angle) * this.speed * dt;
      this.pos.z += Math.cos(this.angle) * this.speed * dt;
    }
    city.resolveCircle(this.pos, 0.5);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.angle;
    // Little walk bob.
    this.mesh.position.y = Math.abs(Math.sin(performance.now() / 180 + this.angle * 10)) * 0.06;
  }
}

export class PedestrianManager {
  constructor(scene, city, seed = 1) {
    this.scene = scene;
    this.city = city;
    this.rng = mulberry32(seed + 21);
    this.peds = [];
    for (const spawn of city.pedSpawns) {
      const mesh = this._makeMesh(pick(this.rng, SHIRTS));
      scene.add(mesh);
      this.peds.push(new Pedestrian(mesh, spawn.x, spawn.z, this.rng));
    }
  }

  _makeMesh(shirt) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.1, 0.4),
      new THREE.MeshLambertMaterial({ color: shirt }),
    );
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
    );
    head.position.y = 1.75;
    g.add(head);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.7, 0.35),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
    );
    legs.position.y = 0.35;
    g.add(legs);
    return g;
  }

  // Scatter everyone near a point (gunshot, crash, stolen car).
  scatterNear(x, z, radius = 14) {
    for (const p of this.peds) {
      if (Math.hypot(p.pos.x - x, p.pos.z - z) < radius) p.fleeing = 1.5;
    }
  }

  update(dt, dangerPoint) {
    for (const p of this.peds) {
      const near = dangerPoint && Math.hypot(p.pos.x - dangerPoint.x, p.pos.z - dangerPoint.z) < 8;
      p.update(dt, this.city, near ? dangerPoint : null);
    }
  }
}
