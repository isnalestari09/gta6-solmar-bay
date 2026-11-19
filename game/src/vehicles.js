// Solmar Bay — cars. One job: parked cars to steal, traffic that loops the
// road grid, police cruisers, and arcade driving physics for the player.
import * as THREE from 'three';
import { WORLD, CAR, PARKED_CARS, TRAFFIC_CARS } from './config.js';
import { mulberry32 } from './city.js';

const CAR_COLORS = [0xc0392b, 0x2e86c1, 0xf1c40f, 0x7d3c98, 0x16a085, 0xe67e22, 0xecf0f1, 0x95a5a6];

export function makeCarMesh(color, isPolice = false, isTaxi = false) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2a33 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), paint);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glass);
  cabin.position.set(0, 1.3, -0.3);
  g.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  for (const [wx, wz] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
  }
  // Headlights and brake lights.
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c0, emissive: 0xaa9955 });
  for (const hx of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), headMat);
    h.position.set(hx, 0.65, 2.22);
    g.add(h);
  }
  const brakeMat = new THREE.MeshLambertMaterial({ color: 0xcc2222, emissive: 0x661111 });
  for (const bx of [-0.7, 0.7]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), brakeMat);
    b.position.set(bx, 0.65, -2.22);
    g.add(b);
  }
  g.userData.brakeMat = brakeMat;
  if (isPolice) {
    const barR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2222, emissive: 0xaa0000 }));
    barR.position.set(-0.4, 1.75, -0.3);
    g.add(barR);
    const barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2244ff, emissive: 0x0000aa }));
    barB.position.set(0.4, 1.75, -0.3);
    g.add(barB);
    g.userData.barR = barR;
    g.userData.barB = barB;
  }
  if (isTaxi) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xffc400, emissive: 0x887700 }));
    sign.position.set(0, 1.8, -0.3);
    g.add(sign);
  }
  return g;
}

export class Vehicles {
  constructor(scene, city, seed = 1) {
    this.scene = scene;
    this.city = city;
    this.rand = mulberry32(seed + 7);
    this.parked = []; // { mesh, x, z, yaw, color, taken }
    this.traffic = []; // { mesh, x, z, yaw, speed, road, dir, along }
    this.cops = []; // { mesh, x, z, yaw, speed, state }
    this.playerCar = null; // the car Dani is driving, or null
    this.buildParked();
    this.buildTraffic();
  }

  roadSpot() {
    const line = WORLD.roadLines[Math.floor(this.rand() * WORLD.roadLines.length)];
    const along = -180 + this.rand() * 360;
    const vertical = this.rand() < 0.5;
    return vertical
      ? { x: line + (this.rand() < 0.5 ? 2.6 : -2.6), z: along, yaw: this.rand() < 0.5 ? 0 : Math.PI }
      : { x: along, z: line + (this.rand() < 0.5 ? 2.6 : -2.6), yaw: this.rand() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
  }

  buildParked() {
    for (let i = 0; i < PARKED_CARS; i++) {
      const s = this.roadSpot();
      const color = CAR_COLORS[Math.floor(this.rand() * CAR_COLORS.length)];
      const mesh = makeCarMesh(color);
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = s.yaw;
      this.scene.add(mesh);
      this.parked.push({ mesh, x: s.x, z: s.z, yaw: s.yaw, color, taken: false, speed: 0 });
    }
    // The coral coupe for mission 5: unmistakable, parked by the garage.
    const coupe = makeCarMesh(0xff6f91);
    coupe.position.set(64, 0, -116);
    coupe.rotation.y = Math.PI / 2;
    this.scene.add(coupe);
    this.parked.push({ mesh: coupe, x: 64, z: -116, yaw: Math.PI / 2, color: 0xff6f91, taken: false, speed: 0, coupe: true });
  }

  buildTraffic() {
    for (let i = 0; i < TRAFFIC_CARS; i++) {
      const s = this.roadSpot();
      const color = CAR_COLORS[Math.floor(this.rand() * CAR_COLORS.length)];
      const mesh = makeCarMesh(color);
      mesh.position.set(s.x, 0, s.z);
      mesh.rotation.y = s.yaw;
      this.scene.add(mesh);
      this.traffic.push({
        mesh, x: s.x, z: s.z, yaw: s.yaw,
        speed: 9 + this.rand() * 6,
        vertical: Math.abs(Math.sin(s.yaw)) < 0.5,
        dir: this.rand() < 0.5 ? 1 : -1,
      });
    }
  }

  spawnCop(x, z) {
    const mesh = makeCarMesh(0x14181f, true);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const cop = { mesh, x, z, yaw: 0, speed: 0, touchTime: 0 };
    this.cops.push(cop);
    return cop;
  }

  removeCop(cop) {
    this.scene.remove(cop.mesh);
    this.cops = this.cops.filter((c) => c !== cop);
  }

  nearestParked(x, z, maxDist = 4.5) {
    let best = null;
    let bestD = maxDist;
    for (const p of this.parked) {
      if (p.taken) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  drive(car, dt, input) {
    const mv = input.moveVector();
    if (mv.active && mv.z < 0) car.speed += CAR.accel * dt; // W = forward
    else if (mv.active && mv.z > 0) {
      if (car.speed > 0.5) car.speed -= CAR.brake * dt;
      else car.speed -= CAR.accel * 0.5 * dt;
    } else {
      car.speed -= Math.sign(car.speed) * CAR.grip * 0.5 * dt;
      if (Math.abs(car.speed) < 0.4) car.speed = 0;
    }
    car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.topSpeed, car.speed));
    const steerInput = mv.x;
    if (Math.abs(car.speed) > 0.5) {
      car.yaw += steerInput * CAR.steer * dt * Math.sign(car.speed) * Math.min(1, Math.abs(car.speed) / 12);
    }
    const nx = car.x + Math.sin(car.yaw) * car.speed * dt;
    const nz = car.z + Math.cos(car.yaw) * car.speed * dt;
    const fixed = this.city.resolveCollision(nx, nz, 1.6);
    if (fixed.x !== nx || fixed.z !== nz) {
      // Hit something: scrape speed off with a thud.
      if (Math.abs(car.speed) > 8) car.speed *= 0.4;
      else car.speed *= 0.7;
    }
    car.x = fixed.x;
    car.z = fixed.z;
    car.mesh.position.set(car.x, 0, car.z);
    car.mesh.rotation.y = car.yaw;
    car.mesh.userData.brakeMat.emissive.setHex(mv.z > 0 ? 0xff3333 : 0x661111);
    return car;
  }

  updateTraffic(dt, time) {
    for (const t of this.traffic) {
      const dx = t.vertical ? 0 : t.dir;
      const dz = t.vertical ? t.dir : 0;
      t.x += dx * t.speed * dt;
      t.z += dz * t.speed * dt;
      // Loop around the map edges on the same road.
      if (t.x > 195) t.x = -195;
      if (t.x < -195) t.x = 195;
      if (t.z > 195) t.z = -195;
      if (t.z < -195) t.z = 195;
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = t.vertical ? (t.dir > 0 ? 0 : Math.PI) : (t.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
      // Brake lights flicker when a car ahead is close.
      t.mesh.userData.brakeMat.emissive.setHex(0x661111);
    }
  }

  updateCopLights(time) {
    const on = Math.floor(time * 4) % 2 === 0;
    for (const c of this.cops) {
      if (!c.mesh.userData.barR) continue;
      c.mesh.userData.barR.material.emissive.setHex(on ? 0xff0000 : 0x330000);
      c.mesh.userData.barB.material.emissive.setHex(on ? 0x000033 : 0x0000ff);
    }
  }
}
