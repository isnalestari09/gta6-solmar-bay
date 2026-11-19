// Solmar Bay — vehicles: stealable parked cars and the traffic that loops
// the road grid. Cars are simple box-built bodies with headlights and
// brake lights; traffic follows the road lines and yields at intersections
// by slowing, never by stopping the game.

import * as THREE from 'three';
import { CARS, WORLD } from './config.js';
import { mulberry32 } from './city.js';

const CAR_COLORS = [0x2e7d32, 0x1565c0, 0xc62828, 0xf9a825, 0x6a1b9a, 0xe0e0e0, 0x37474f, 0x00838f, 0xef6c00, 0x4e342e];

export function makeCarMesh(color, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x14161c : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 4.4), paint);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 2.2), new THREE.MeshLambertMaterial({ color: 0x1a2530 }));
  cabin.position.set(0, 1.35, -0.2);
  g.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const [x, z] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    g.add(wheel);
  }
  // Headlights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.7, 0.7]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), headMat);
    light.position.set(x, 0.7, 2.22);
    g.add(light);
  }
  // Brake lights (dim until braking).
  const brakeMat = new THREE.MeshBasicMaterial({ color: 0x881111 });
  const brakes = [];
  for (const x of [-0.7, 0.7]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), brakeMat);
    light.position.set(x, 0.7, -2.22);
    g.add(light);
    brakes.push(light);
  }
  g.userData.brakes = brakes;
  g.userData.brakeMat = brakeMat;
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x222222 }));
    bar.position.set(0, 1.85, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.45), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.32, 1.98, -0.2);
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.45), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    blue.position.set(0.32, 1.98, -0.2);
    g.add(blue);
    g.userData.lightRed = red;
    g.userData.lightBlue = blue;
  }
  return g;
}

export class VehicleManager {
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = mulberry32(seed + 77);
    this.parked = [];
    this.traffic = [];
    this.buildParked();
    this.buildTraffic();
  }

  buildParked() {
    for (const spot of this.city.parkedSpots) {
      const color = CAR_COLORS[Math.floor(this.rng() * CAR_COLORS.length)];
      const mesh = makeCarMesh(color, false);
      mesh.position.set(spot.x, 0, spot.z);
      mesh.rotation.y = spot.angle;
      this.scene.add(mesh);
      this.parked.push({
        pos: new THREE.Vector3(spot.x, 0, spot.z),
        heading: spot.angle,
        mesh,
        stolen: false,
        speed: 0,
        setBrakeLights(on) {
          this.mesh.userData.brakeMat.color.setHex(on ? 0xff2222 : 0x881111);
        },
      });
    }
  }

  buildTraffic() {
    for (let i = 0; i < CARS.trafficTotal; i++) {
      const color = CAR_COLORS[Math.floor(this.rng() * CAR_COLORS.length)];
      const mesh = makeCarMesh(color, false);
      this.scene.add(mesh);
      const horizontal = this.rng() < 0.5;
      const road = Math.floor(this.rng() * 9 - 4) * WORLD.block;
      const along = (this.rng() * 2 - 1) * (WORLD.half - 20);
      const dir = this.rng() < 0.5 ? 1 : -1;
      this.traffic.push({
        mesh,
        horizontal,
        road,
        along,
        dir,
        speed: 10 + this.rng() * 6,
        heading: horizontal ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      });
    }
  }

  nearestParked(pos, maxDist) {
    let best = null;
    let bestD = maxDist;
    for (const car of this.parked) {
      if (car.stolen) continue;
      const d = Math.hypot(car.pos.x - pos.x, car.pos.z - pos.z);
      if (d < bestD) {
        bestD = d;
        best = car;
      }
    }
    return best;
  }

  update(dt, playerPos) {
    for (const t of this.traffic) {
      t.along += t.dir * t.speed * dt;
      if (t.along > WORLD.half - 10) t.along = -WORLD.half + 10;
      if (t.along < -WORLD.half + 10) t.along = WORLD.half - 10;
      const x = t.horizontal ? t.along : t.road + 3.5 * t.dir;
      const z = t.horizontal ? t.road + 3.5 * t.dir : t.along;
      t.mesh.position.set(x, 0, z);
      t.mesh.rotation.y = t.heading;
      // Don't ram the player's car: slow when close.
      const d = Math.hypot(x - playerPos.x, z - playerPos.z);
      if (d < 12) t.speed = Math.max(3, t.speed - 20 * dt);
      else t.speed = Math.min(16, t.speed + 4 * dt);
    }
  }
}
