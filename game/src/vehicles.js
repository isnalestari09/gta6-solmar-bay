// Solmar Bay — cars: stealable parked cars, looping traffic and police.
// A car is a box body, a cabin, four wheels and working lights. Driving is
// arcade: accelerate, brake, reverse, and steer with the speed.

import * as THREE from 'three';
import { WORLD, CAR_TUNING, clamp, angleLerp, distance2D, mulberry32 } from './config.js';
import { hitsCollider, resolveColliders, clampToWorld } from './city.js';

const CAR_COLORS = [0xd8a13c, 0x3c6ed8, 0xd83c3c, 0x3cd8a0, 0x9a4fd8, 0xe8e4da, 0x2b2b30, 0xd86a3c];

export function makeCarMesh(color, isPolice = false, isTaxi = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x14161c : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.4), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.6, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2530 }),
  );
  cabin.position.set(0, 1.15, -0.2);
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.38, z);
    group.add(wheel);
    wheels.push(wheel);
  }
  // Brake and reverse lights.
  const tailMat = new THREE.MeshLambertMaterial({ color: 0x881111, emissive: 0x550000 });
  const tailL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat);
  tailL.position.set(-0.6, 0.6, -2.22);
  group.add(tailL);
  const tailR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tailMat.clone());
  tailR.position.set(0.6, 0.6, -2.22);
  group.add(tailR);
  // Headlights, so cars read at dusk.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0x887733 });
  for (const side of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), headMat);
    head.position.set(side, 0.6, 2.22);
    group.add(head);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.55, -0.2);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    red.position.set(-0.32, 1.56, -0.2);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.42), new THREE.MeshLambertMaterial({ color: 0x2266ff, emissive: 0x0022aa }));
    blue.position.set(0.32, 1.56, -0.2);
    group.add(blue);
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.5), new THREE.MeshLambertMaterial({ color: 0xffd800 }));
    sign.position.set(0, 1.6, -0.2);
    group.add(sign);
  }
  group.userData = { wheels, tailL, tailR };
  return group;
}

export class Car {
  constructor(scene, x, z, heading, color, kind = 'parked') {
    this.mesh = makeCarMesh(color, kind === 'police', kind === 'taxi');
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.pos = this.mesh.position;
    this.heading = heading;
    this.speed = 0;
    this.steer = 0;
    this.health = CAR_TUNING.health;
    this.kind = kind;
    this.color = color;
    this.occupied = false;
  }

  update(dt, input, colliders) {
    if (!this.occupied) return;
    const axes = input.moveAxes();
    const forward = axes.z < 0 ? 1 : axes.z > 0 ? -1 : 0;
    if (forward > 0) {
      this.speed += CAR_TUNING.accel * dt;
    } else if (forward < 0) {
      if (this.speed > 0.5) this.speed -= CAR_TUNING.brake * dt;
      else this.speed -= CAR_TUNING.reverseAccel * dt;
    } else {
      this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 8 * dt);
    }
    this.speed = clamp(this.speed, -CAR_TUNING.maxReverse, CAR_TUNING.maxSpeed);
    const steerTarget = -axes.x;
    this.steer += (steerTarget - this.steer) * Math.min(1, dt * 6);
    const turnAmount = this.steer * CAR_TUNING.turnRate * dt * clamp(Math.abs(this.speed) / 8, 0, 1) * Math.sign(this.speed || 1);
    this.heading += turnAmount;
    const nx = this.pos.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
    const oldX = this.pos.x;
    const oldZ = this.pos.z;
    this.pos.x = nx;
    this.pos.z = nz;
    if (hitsCollider(colliders, this.pos.x, this.pos.z, 1.6)) {
      this.pos.x = oldX;
      this.pos.z = oldZ;
      this.speed *= -0.25; // a bump, with a little bounce back
    }
    resolveColliders(colliders, this.pos, 1.6);
    clampToWorld(this.pos);
    this.mesh.rotation.y = this.heading;
    const spin = (this.speed * dt) / 0.38;
    for (const wheel of this.mesh.userData.wheels) wheel.rotation.x += spin;
    const braking = forward < 0 && this.speed > 0.5;
    const tailMat = this.mesh.userData.tailL.material;
    tailMat.emissive.setHex(braking ? 0xff2222 : 0x550000);
    this.mesh.userData.tailR.material.emissive.setHex(braking ? 0xff2222 : 0x550000);
  }
}

// Traffic: cars that loop around the road grid on fixed rectangular routes.
export class Traffic {
  constructor(scene, colliders) {
    this.cars = [];
    this.colliders = colliders;
    const rand = mulberry32(777);
    const routes = [];
    for (let i = 0; i < 14; i++) {
      const horizontal = i % 2 === 0;
      const line = WORLD.roadLines[1 + Math.floor(rand() * (WORLD.roadLines.length - 2))];
      const start = -160 + rand() * 320;
      const speed = 9 + rand() * 5;
      routes.push({ horizontal, line, start, speed, dir: rand() < 0.5 ? 1 : -1 });
    }
    routes.forEach((route, i) => {
      const color = CAR_COLORS[i % CAR_COLORS.length];
      const x = route.horizontal ? route.start : route.line;
      const z = route.horizontal ? route.line : route.start;
      const heading = route.horizontal ? (route.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (route.dir > 0 ? 0 : Math.PI);
      const car = new Car(scene, x, z, heading, color, 'traffic');
      car.route = route;
      car.speed = route.speed;
      this.cars.push(car);
    });
  }

  update(dt) {
    for (const car of this.cars) {
      const route = car.route;
      if (route.horizontal) {
        car.pos.x += route.dir * car.speed * dt;
        if (car.pos.x > 185) car.pos.x = -185;
        if (car.pos.x < -185) car.pos.x = 185;
      } else {
        car.pos.z += route.dir * car.speed * dt;
        if (car.pos.z > 185) car.pos.z = -185;
        if (car.pos.z < -185) car.pos.z = 185;
      }
      car.mesh.rotation.y = car.heading;
      const spin = (car.speed * dt) / 0.38;
      for (const wheel of car.mesh.userData.wheels) wheel.rotation.x += spin;
    }
  }
}

// Parked cars: 28 stealable cars tucked along the road edges.
export function spawnParkedCars(scene) {
  const rand = mulberry32(4242);
  const spots = [];
  const used = new Set();
  let guard = 0;
  while (spots.length < 28 && guard < 500) {
    guard++;
    const horizontal = rand() < 0.5;
    const line = WORLD.roadLines[Math.floor(rand() * WORLD.roadLines.length)];
    const along = -160 + Math.floor(rand() * 32) * 10;
    const key = `${horizontal ? 'h' : 'v'}:${line}:${along}`;
    if (used.has(key)) continue;
    used.add(key);
    const x = horizontal ? along : line + 8.5;
    const z = horizontal ? line + 8.5 : along;
    if (z >= WORLD.docksAt - 12) continue;
    if (Math.abs(x) < 24 && Math.abs(z) < 24) continue; // keep the plaza clear
    spots.push([x, z, horizontal ? Math.PI / 2 : 0]);
  }
  const cars = [];
  spots.forEach(([x, z, heading], i) => {
    const color = CAR_COLORS[i % CAR_COLORS.length];
    const car = new Car(scene, x, z, heading, color, i === 3 ? 'taxi' : 'parked');
    cars.push(car);
  });
  return cars;
}

export function nearestCar(cars, x, z, maxDist = 4) {
  let best = null;
  let bestDist = maxDist;
  for (const car of cars) {
    if (car.occupied) continue;
    const d = distance2D(x, z, car.pos.x, car.pos.z);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}
