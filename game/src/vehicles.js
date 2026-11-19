// Vehicles: parked cars the player can steal, traffic that loops the
// road grid, and police cruisers. Cars are boxes with a cabin and four
// cylinder wheels — no imported models.

import * as THREE from 'three';
import { WORLD, ROADS, PALETTE, mulberry32 } from './config.js';

function buildCarMesh(color, police = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: police ? 0x1c1c22 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 2), bodyMat);
  body.position.y = 0.7;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.8), new THREE.MeshLambertMaterial({ color: 0x9fc4d8 }));
  cabin.position.set(-0.2, 1.6, 0);
  group.add(cabin);
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.6), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(-0.2, 2.2, 0);
    group.add(bar);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [wx, wz] of [[1.5, 1], [1.5, -1], [-1.5, 1], [-1.5, -1]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.x = Math.PI / 2;
    w.position.set(wx, 0.45, wz);
    group.add(w);
  }
  return group;
}

export class Vehicles {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.parked = [];
    this.traffic = [];
    this.police = [];
    this._spawnParked(scene);
    this._spawnTraffic(scene);
  }

  _spawnParked(scene) {
    const rng = mulberry32(1234);
    const spots = [];
    for (const r of ROADS) {
      for (const d of [-140, -100, -60, -20, 20, 60, 100, 140]) {
        if (rng() < 0.45) spots.push([r + (rng() < 0.5 ? 7 : -7), d]);
      }
    }
    let i = 0;
    for (const [x, z] of spots.slice(0, 28)) {
      const color = PALETTE.carColors[i % PALETTE.carColors.length];
      const mesh = buildCarMesh(color);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = (Math.abs(x) % 2 === 0 ? 0 : Math.PI / 2) + (rng() < 0.5 ? 0 : Math.PI);
      scene.add(mesh);
      this.parked.push({ mesh, x, z, color, taken: false });
      i += 1;
    }
  }

  countParked() { return this.parked.filter((c) => !c.taken).length; }

  _spawnTraffic(scene) {
    const rng = mulberry32(99);
    for (let i = 0; i < 14; i++) {
      const color = PALETTE.carColors[Math.floor(rng() * PALETTE.carColors.length)];
      const mesh = buildCarMesh(color);
      const horizontal = rng() < 0.5;
      const road = ROADS[Math.floor(rng() * ROADS.length)];
      const pos = -180 + rng() * 360;
      scene.add(mesh);
      this.traffic.push({
        mesh, horizontal, road, pos,
        speed: 9 + rng() * 6, dir: rng() < 0.5 ? 1 : -1,
      });
    }
  }

  spawnPolice(x, z) {
    const mesh = buildCarMesh(0x1c1c22, true);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const cop = { mesh, x, z, speed: 0, angle: 0 };
    this.police.push(cop);
    return cop;
  }

  removePolice(cop) {
    this.scene.remove(cop.mesh);
    this.police = this.police.filter((p) => p !== cop);
  }

  update(dt, playerPos) {
    // Traffic loops along its road, wrapping at the city edge.
    for (const car of this.traffic) {
      car.pos += car.speed * car.dir * dt;
      if (car.pos > 195) car.pos = -195;
      if (car.pos < -195) car.pos = 195;
      if (car.horizontal) {
        car.mesh.position.set(car.pos, 0, car.road + 3);
        car.mesh.rotation.y = car.dir > 0 ? 0 : Math.PI;
      } else {
        car.mesh.position.set(car.road + 3, 0, car.pos);
        car.mesh.rotation.y = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    // Police chase the player; they ram, they do not pathfind.
    for (const cop of this.police) {
      const dx = playerPos.x - cop.x, dz = playerPos.z - cop.z;
      const dist = Math.hypot(dx, dz) || 1;
      cop.angle = Math.atan2(dz, dx);
      cop.speed = Math.min(cop.speed + 14 * dt, 24);
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.z += Math.sin(cop.angle) * cop.speed * dt;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = -cop.angle;
      void dist;
    }
  }
}
