// Solmar Bay — vehicles: stealable parked cars, traffic, police cars and the
// arcade driving model. Cars are box-built meshes; no imported assets.

import * as THREE from 'three';
import { CAR, WORLD, clamp, angleLerp, dist2d, randPick, mulberry32 } from './config.js';
import { resolveCollisions } from './city.js';

const CAR_COLORS = [0xc23a2a, 0x2a6ac2, 0xe8c832, 0x3aa84a, 0x8a5aa8, 0xe8e8e8, 0x222222, 0xd86a2a, 0x2a9a9a];

export function makeCarMesh(color, kind = 'sedan') {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1a2530 })
  );
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [x, z] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0xaa8800 });
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
    l.position.set(x, 0.7, 2.21);
    g.add(l);
  }
  // Rear lights: brighten when the car brakes or reverses, so a chase
  // reads at a glance from behind.
  const rearMat = new THREE.MeshLambertMaterial({ color: 0xaa2222, emissive: 0x330000 });
  const rearLights = [];
  for (const x of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), rearMat.clone());
    l.position.set(x, 0.7, -2.21);
    g.add(l);
    rearLights.push(l);
  }
  g.userData.rearLights = rearLights;
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xffd800, emissive: 0x554400 })
    );
    sign.position.set(0, 1.8, -0.2);
    g.add(sign);
  }
  if (kind === 'police') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.25, 0.4),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x1122aa })
    );
    bar.position.set(0, 1.75, -0.2);
    g.add(bar);
    bar.userData.isLightbar = true;
    g.userData.lightbar = bar;
  }
  return g;
}

export class Car {
  constructor(mesh, x, z, heading, kind = 'sedan') {
    this.mesh = mesh;
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
    this.kind = kind;
    this.health = CAR.health;
    this.steer = 0;
    this.stolen = false;
    this.isPolice = kind === 'police';
    this.isTaxi = kind === 'taxi';
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
  }
  get pos() {
    return { x: this.x, z: this.z };
  }
}

/** Arcade driving: throttle, steering that tightens at low speed, collision push-out. */
export function driveCar(car, throttle, steer, dt, colliders) {
  const target = throttle * CAR.maxSpeed;
  const rate = throttle > 0 ? CAR.accel : CAR.brake;
  if (car.speed < target) car.speed = Math.min(target, car.speed + rate * dt);
  else if (car.speed > target) car.speed = Math.max(target, car.speed - rate * dt);
  if (throttle < 0) car.speed = Math.max(-CAR.reverseMax, car.speed);
  // Brake / reverse lights: glow while slowing down or backing up.
  const braking = throttle < 0 || (throttle === 0 && Math.abs(car.speed) > 0.5);
  for (const l of car.mesh.userData.rearLights ?? []) {
    l.material.emissive.setHex(car.speed < -0.5 ? 0xffffff : braking ? 0xcc1111 : 0x330000);
  }
  const speedFactor = clamp(Math.abs(car.speed) / 14, 0.25, 1);
  car.heading += steer * CAR.turnRate * speedFactor * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const test = { x: nx, z: nz };
  resolveCollisions(test, 1.6, colliders);
  const hitWall = test.x !== nx || test.z !== nz;
  if (hitWall) {
    car.speed *= 0.35;
    return true;
  }
  car.x = test.x;
  car.z = test.z;
  car.x = clamp(car.x, -WORLD.half + 3, WORLD.half - 3);
  car.z = clamp(car.z, -WORLD.half + 3, WORLD.half - 3);
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  return false;
}

/** 28 parked cars along the roads, plus one taxi by Plaza del Sol. */
export function spawnParkedCars(scene) {
  const rng = mulberry32(777);
  const cars = [];
  const spots = [];
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const c = i * WORLD.roadGap;
    for (const z of [-120, -70, -20, 30, 80, 130]) spots.push([c + 7.5, z, 0]);
    for (const x of [-120, -70, -20, 30, 80, 130]) spots.push([x, c + 7.5, Math.PI / 2]);
  }
  for (let i = 0; i < 28 && i < spots.length; i++) {
    // Draw without replacement: two cars must never share one parking spot.
    const [x, z, h] = spots.splice(Math.floor(rng() * spots.length), 1)[0];
    const color = randPick(CAR_COLORS);
    const mesh = makeCarMesh(color);
    scene.add(mesh);
    cars.push(new Car(mesh, x, z, h));
  }
  const taxiMesh = makeCarMesh(0xffd800, 'taxi');
  scene.add(taxiMesh);
  const taxi = new Car(taxiMesh, 84, 70, Math.PI, 'taxi');
  cars.push(taxi);
  return { parked: cars, taxi };
}

/** 14 traffic cars looping the road grid on simple rectangular routes. */
export function spawnTraffic(scene) {
  const rng = mulberry32(4242);
  const cars = [];
  const lanes = [-138, -92, -46, 46, 92, 138];
  for (let i = 0; i < 14; i++) {
    const lane = lanes[i % lanes.length];
    const vertical = i % 2 === 0;
    const color = randPick(CAR_COLORS);
    const mesh = makeCarMesh(color);
    scene.add(mesh);
    const car = new Car(mesh, vertical ? lane : randPick(lanes), vertical ? randPick(lanes) : lane, vertical ? 0 : Math.PI / 2);
    car.speed = 9 + rng() * 6;
    car.cruise = car.speed; // normal speed; traffic eases off behind the player
    car.route = { vertical, lane, dir: rng() > 0.5 ? 1 : -1 };
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, colliders, playerCar = null) {
  for (const car of cars) {
    const { vertical, lane, dir } = car.route;
    // Ease off when the player's car is directly ahead on the same lane,
    // instead of ramming through it.
    let target = car.cruise;
    if (playerCar) {
      const ahead = vertical
        ? (dir > 0 ? playerCar.z - car.z : car.z - playerCar.z)
        : (dir > 0 ? playerCar.x - car.x : car.x - playerCar.x);
      const lateral = vertical ? Math.abs(playerCar.x - car.x) : Math.abs(playerCar.z - car.z);
      if (ahead > 0 && ahead < 10 && lateral < 3) target = 4;
    }
    car.speed += (target - car.speed) * Math.min(1, dt * 2);
    if (vertical) {
      car.z += car.speed * dir * dt;
      if (car.z > WORLD.half - 6) { car.z = WORLD.half - 6; car.route.dir = -1; car.heading = Math.PI; }
      if (car.z < -WORLD.half + 6) { car.z = -WORLD.half + 6; car.route.dir = 1; car.heading = 0; }
      car.x = lane;
    } else {
      car.x += car.speed * dir * dt;
      if (car.x > WORLD.half - 6) { car.x = WORLD.half - 6; car.route.dir = -1; car.heading = -Math.PI / 2; }
      if (car.x < -WORLD.half + 6) { car.x = -WORLD.half + 6; car.route.dir = 1; car.heading = Math.PI / 2; }
      car.z = lane;
    }
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.heading;
  }
}

/** Police cars: built on demand, chasing the player. */
export function makePoliceCar(scene, x, z) {
  const mesh = makeCarMesh(0x1a1a2a, 'police');
  scene.add(mesh);
  return new Car(mesh, x, z, 0, 'police');
}

export function updatePoliceCar(car, targetX, targetZ, dt, colliders) {
  const d = dist2d(car.x, car.z, targetX, targetZ);
  const wantHeading = Math.atan2(targetX - car.x, targetZ - car.z);
  const diff = ((wantHeading - car.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  const steer = clamp(diff * 1.4, -1, 1);
  const throttle = d > 6 ? 1 : 0.4;
  const crashed = driveCar(car, throttle, steer, dt, colliders);
  if (car.mesh.userData.lightbar) {
    car.mesh.userData.lightbar.material.emissive.setHex(
      Math.floor(performance.now() / 300) % 2 === 0 ? 0x2244ff : 0xff2222
    );
  }
  return { dist: d, crashed };
}
