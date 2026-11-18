// Cars: 28 stealable parked cars (revision 2 added two by the north plaza),
// 14 looping traffic cars and the police
// cars the wanted system spawns. Arcade physics: accelerate, steer, brake,
// slide along walls instead of freezing.

import * as THREE from 'three';
import { CAR, mulberry32, pick } from './config.js';

const PAINT = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x1a1a1a];

function buildCarMesh(color, isPolice = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x222831 }),
  );
  cabin.position.set(0, 1.15, -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    group.add(wheel);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }),
    );
    bar.position.set(0, 1.55, -0.2);
    group.add(bar);
    group.userData.lightBar = bar;
  }
  return group;
}

export class Car {
  constructor(mesh, x, z, angle, opts = {}) {
    this.mesh = mesh;
    this.pos = new THREE.Vector3(x, 0, z);
    this.angle = angle;      // heading, radians
    this.speed = 0;
    this.isPolice = !!opts.police;
    this.isTraffic = !!opts.traffic;
    this.stolen = false;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = angle;
  }

  // Arcade drive step. `steer` -1..1, `throttle` -1..1.
  drive(dt, steer, throttle, city) {
    const maxFwd = CAR.maxSpeed;
    const maxRev = CAR.reverseSpeed;
    if (throttle > 0) this.speed += CAR.accel * throttle * dt;
    else if (throttle < 0) this.speed += CAR.brake * throttle * dt;
    else this.speed *= Math.pow(0.4, dt); // coast
    this.speed = Math.max(-maxRev, Math.min(maxFwd, this.speed));
    const dir = this.speed >= 0 ? 1 : -1;
    this.angle += steer * CAR.steer * dt * dir * Math.min(1, Math.abs(this.speed) / 8);
    const nx = this.pos.x + Math.sin(this.angle) * this.speed * dt;
    const nz = this.pos.z + Math.cos(this.angle) * this.speed * dt;
    const before = { x: this.pos.x, z: this.pos.z };
    this.pos.x = nx; this.pos.z = nz;
    const hitWall = city.resolveCircle(this.pos, 1.6);
    if (hitWall) {
      // Slide: keep the component of motion that did not hit the wall.
      const slidX = Math.abs(this.pos.x - before.x) < 0.001;
      const slidZ = Math.abs(this.pos.z - before.z) < 0.001;
      if (slidX && slidZ) this.speed *= 0.4;
      else if (slidX) this.speed *= 0.7;
      else if (slidZ) this.speed *= 0.7;
    }
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.angle;
    return hitWall;
  }
}

export class VehicleManager {
  constructor(scene, city, seed = 1) {
    this.scene = scene;
    this.city = city;
    this.rng = mulberry32(seed + 7);
    this.parked = [];
    this.traffic = [];
    this.police = [];
    for (const spot of city.parkedSpots) {
      const mesh = buildCarMesh(pick(this.rng, PAINT));
      scene.add(mesh);
      this.parked.push(new Car(mesh, spot.x, spot.z, spot.angle));
    }
    // Traffic loops along the roads.
    for (let i = 0; i < 14; i++) {
      const horizontal = i % 2 === 0;
      const lane = -180 + Math.floor(this.rng() * 7) * 60;
      const mesh = buildCarMesh(pick(this.rng, PAINT));
      scene.add(mesh);
      const car = new Car(mesh, horizontal ? -190 + this.rng() * 380 : lane, horizontal ? lane : -190 + this.rng() * 380, horizontal ? Math.PI / 2 : 0, { traffic: true });
      car.speed = 10 + this.rng() * 6;
      car.horizontal = horizontal;
      this.traffic.push(car);
    }
  }

  // How many stealable cars are parked in the city right now.
  countParked() { return this.parked.length; }

  nearestParked(pos, maxDist = 5) {
    let best = null; let bestD = maxDist;
    for (const car of this.parked) {
      const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
      if (d < bestD) { bestD = d; best = car; }
    }
    return best;
  }

  spawnPolice(x, z) {
    const mesh = buildCarMesh(0xf5f5f5, true);
    this.scene.add(mesh);
    const car = new Car(mesh, x, z, 0, { police: true });
    this.police.push(car);
    return car;
  }

  removePolice(car) {
    this.scene.remove(car.mesh);
    this.police = this.police.filter((c) => c !== car);
  }

  updateTraffic(dt) {
    for (const car of this.traffic) {
      if (car.horizontal) {
        car.pos.x += car.speed * dt;
        if (car.pos.x > 195) car.pos.x = -195;
        car.angle = Math.PI / 2;
      } else {
        car.pos.z += car.speed * dt;
        if (car.pos.z > 195) car.pos.z = -195;
        car.angle = 0;
      }
      car.mesh.position.copy(car.pos);
      car.mesh.rotation.y = car.angle;
    }
  }

  // Simple car-car separation so traffic does not stack on the player.
  separate(cars) {
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const a = cars[i]; const b = cars[j];
        const dx = b.pos.x - a.pos.x; const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.01 && d < 4) {
          const push = (4 - d) / 2;
          const nx = dx / d; const nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push;
          b.pos.x += nx * push; b.pos.z += nz * push;
          a.mesh.position.copy(a.pos); b.mesh.position.copy(b.pos);
        }
      }
    }
  }
}
