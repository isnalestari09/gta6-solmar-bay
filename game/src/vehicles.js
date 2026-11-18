// vehicles.js — every car in Solmar Bay: the player's stolen rides, traffic and
// police. Cars are built from boxes and cylinders, with their own paint, and
// traffic follows the road grid while police cars chase the player.

import * as THREE from '../vendor/three.module.min.js';
import { CAR, PALETTE } from './config.js';
import { roadLines, hitsCollider, clampToCity } from './city.js';

const CAR_COLORS = [0xd94040, 0x3a7bd9, 0xe8c93a, 0x7ab648, 0xe8e8e8, 0x2b2f36, 0xd97ab0, 0x40c9d9];

/** Build one car mesh. `police` cars get a light bar; `taxi` gets a roof sign. */
export function buildCarMesh(color, kind = 'civilian') {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
  body.position.y = 0.65;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glass);
  cabin.position.set(0, 1.3, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-1.0, 1.4], [1.0, 1.4], [-1.0, -1.4], [1.0, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    group.add(w);
    wheels.push(w);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2a2a }),
    );
    bar.position.set(0, 1.75, -0.2);
    group.add(bar);
    const bar2 = bar.clone();
    bar2.material = new THREE.MeshBasicMaterial({ color: 0x2a6bff });
    bar2.position.x = 0.4;
    group.add(bar2);
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.4),
      new THREE.MeshBasicMaterial({ color: PALETTE.taxi }),
    );
    sign.position.set(0, 1.75, -0.2);
    group.add(sign);
  }
  group.userData.wheels = wheels;
  return group;
}

export function makeCar(scene, x, z, angle, color, kind = 'civilian') {
  const mesh = buildCarMesh(color, kind);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = angle;
  scene.add(mesh);
  return {
    mesh, kind, color,
    x, z, angle,
    speed: 0,
    steering: 0,
    // Traffic cars follow a road line and turn at intersections.
    lane: null,
    laneDir: 1,
    cruise: 8 + Math.random() * 5,
    stuck: 0,
  };
}

/** Spawn parked cars along the roads for the player to steal. */
export function spawnParkedCars(scene, rng, colliders = []) {
  const cars = [];
  const lines = roadLines();
  for (let i = 0; i < 26; i++) {
    // Retry the spot until it is clear of buildings: a car parked inside a
    // building collider can never drive out (every step re-collides).
    let x = 0; let z = 0; let horizontal = true;
    for (let attempt = 0; attempt < 12; attempt++) {
      horizontal = rng() < 0.5;
      const line = lines[Math.floor(rng() * lines.length)];
      const along = (rng() - 0.5) * 420;
      x = horizontal ? along : line + (rng() < 0.5 ? 5 : -5);
      z = horizontal ? line + (rng() < 0.5 ? 5 : -5) : along;
      if (!hitsCollider(colliders, x, z, 3.5)) break;
    }
    const car = makeCar(scene, x, z, horizontal ? 0 : Math.PI / 2, CAR_COLORS[i % CAR_COLORS.length]);
    cars.push(car);
  }
  return cars;
}

/** Spawn moving traffic that follows the road grid. */
export function spawnTrafficCars(scene, count, rng) {
  const cars = [];
  const lines = roadLines();
  for (let i = 0; i < count; i++) {
    const horizontal = rng() < 0.5;
    const line = lines[Math.floor(rng() * lines.length)];
    const along = (rng() - 0.5) * 420;
    const dir = rng() < 0.5 ? 1 : -1;
    const car = makeCar(scene, horizontal ? along : line, horizontal ? line : along,
      horizontal ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
      CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)]);
    car.lane = { horizontal, line, dir };
    car.speed = car.cruise;
    cars.push(car);
  }
  return cars;
}

/** Drive a car with arcade physics: accelerate, brake, steer, collide, spin wheels. */
export function driveCar(car, input, dt, colliders) {
  const forward = input.forward ? 1 : 0;
  const back = input.back ? 1 : 0;
  if (forward) car.speed += CAR.accel * dt;
  if (back) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
  car.speed -= car.speed * 0.55 * dt;
  if (!forward && !back) car.speed *= (1 - 0.8 * dt);
  car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
  const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  const dirSign = car.speed >= 0 ? 1 : -1;
  car.angle += steer * CAR.turn * dt * dirSign * Math.min(1, Math.abs(car.speed) / 8 + 0.25);
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  const clamped = clampToCity(nx, nz);
  if (!hitsCollider(colliders, clamped.x, clamped.z, 2.2)) {
    car.x = clamped.x;
    car.z = clamped.z;
  } else if (!hitsCollider(colliders, clamped.x, car.z, 2.2)) {
    // Slide along the wall instead of stopping dead.
    car.x = clamped.x;
  } else if (!hitsCollider(colliders, car.x, clamped.z, 2.2)) {
    car.z = clamped.z;
  } else {
    // Wedged inside a collider (e.g. a building jutting into the road):
    // push the car out along the smallest penetration axis so it can drive on.
    for (const c of colliders) {
      const dx = car.x - c.x;
      const dz = car.z - c.z;
      const px = c.halfX + 2.2 - Math.abs(dx);
      const pz = c.halfZ + 2.2 - Math.abs(dz);
      if (px > 0 && pz > 0) {
        if (px < pz) car.x = c.x + (dx >= 0 ? 1 : -1) * (c.halfX + 2.3);
        else car.z = c.z + (dz >= 0 ? 1 : -1) * (c.halfZ + 2.3);
        break;
      }
    }
    car.speed *= 0.3;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  return car.speed;
}

/** Move one traffic car along its lane; turn at intersections, slow for the player. */
export function updateTrafficCar(car, dt, playerPos, colliders) {
  const lane = car.lane;
  if (!lane) return;
  const ahead = car.speed * dt * 2 + 6;
  const px = car.x + Math.sin(car.angle) * ahead;
  const pz = car.z + Math.cos(car.angle) * ahead;
  const nearPlayer = Math.hypot(playerPos.x - px, playerPos.z - pz) < 5;
  const target = nearPlayer ? 0 : car.cruise;
  car.speed += (target - car.speed) * Math.min(1, dt * 2);
  car.x += Math.sin(car.angle) * car.speed * dt;
  car.z += Math.cos(car.angle) * car.speed * dt;
  // At an intersection, sometimes turn onto the cross road.
  const lines = roadLines();
  const onLine = lines.some((l) => Math.abs((lane.horizontal ? car.z : car.x) - l) < 0.4);
  const nearCross = lines.some((l) => Math.abs((lane.horizontal ? car.x : car.z) - l) < 1.2);
  if (onLine && nearCross && Math.random() < dt * 0.25) {
    lane.horizontal = !lane.horizontal;
    const newLine = lines[Math.floor(Math.random() * lines.length)];
    lane.line = newLine;
    car.angle = lane.horizontal
      ? (lane.dir > 0 ? 0 : Math.PI)
      : (lane.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
  }
  const clamped = clampToCity(car.x, car.z);
  if (clamped.x !== car.x || clamped.z !== car.z) {
    car.angle += Math.PI;
    lane.dir *= -1;
    car.x = clamped.x;
    car.z = clamped.z;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
}

/** A police car chases the player: steer toward them, ram, and honk the siren. */
export function updatePoliceCar(car, dt, playerPos, colliders) {
  const dx = playerPos.x - car.x;
  const dz = playerPos.z - car.z;
  const dist = Math.hypot(dx, dz) || 1;
  const want = Math.atan2(dx, dz);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  const targetSpeed = dist > 4 ? 34 : 8;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
  const nx = car.x + Math.sin(car.angle) * car.speed * dt;
  const nz = car.z + Math.cos(car.angle) * car.speed * dt;
  if (!hitsCollider(colliders, nx, nz, 2.2)) {
    car.x = nx;
    car.z = nz;
  } else {
    car.speed *= 0.4;
    car.angle += 0.6 * dt;
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.angle;
  return dist;
}
