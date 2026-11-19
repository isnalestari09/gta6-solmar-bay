// The player: Dani Reyes on foot and behind the wheel. On foot he walks
// and sprints; in a car he drives with arcade steering. Shooting costs
// ammo and raises the wanted level.

import * as THREE from 'three';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.x = 0; this.z = -20;
    this.angle = 0; // facing, radians
    this.speed = 0;
    this.health = 100;
    this.ammo = 60;
    this.inCar = null; // parked-car record when driving
    this.carSpeed = 0;
    this.mesh = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.6, 0.6), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    body.position.y = 1.1;
    this.mesh.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe8b88a }));
    head.position.y = 2.25;
    this.mesh.add(head);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.7), new THREE.MeshLambertMaterial({ color: 0x222831 }));
    hood.position.y = 1.75;
    this.mesh.add(hood);
    this.mesh.position.set(this.x, 0, this.z);
    scene.add(this.mesh);
  }

  reset(x, z) {
    this.x = x; this.z = z; this.angle = 0; this.speed = 0; this.health = 100; this.ammo = 60;
    this.inCar = null; this.carSpeed = 0;
    this.mesh.visible = true;
    this.mesh.position.set(x, 0, z);
  }

  update(dt, input, city) {
    if (this.inCar) return this._drive(dt, input, city);
    const sprint = input.isDown('Shift') ? 2 : 1;
    const walkSpeed = 6 * sprint;
    let mx = 0, mz = 0;
    if (input.isDown('w') || input.isDown('ArrowUp')) mz -= 1;
    if (input.isDown('s') || input.isDown('ArrowDown')) mz += 1;
    if (input.isDown('a') || input.isDown('ArrowLeft')) mx -= 1;
    if (input.isDown('d') || input.isDown('ArrowRight')) mx += 1;
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      mx /= len; mz /= len;
      this.angle = Math.atan2(mx, mz);
      const nx = this.x + mx * walkSpeed * dt;
      const nz = this.z + mz * walkSpeed * dt;
      const r = city.resolve(nx, nz, 1);
      this.x = r.x; this.z = r.z;
      this.speed = walkSpeed;
    } else {
      this.speed = 0;
    }
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.rotation.y = this.angle;
    return { crashed: false };
  }

  _drive(dt, input, city) {
    const car = this.inCar;
    const accel = input.isDown('w') || input.isDown('ArrowUp') ? 26 : 0;
    const brake = input.isDown('s') || input.isDown('ArrowDown') ? 30 : 0;
    if (accel) this.carSpeed = Math.min(this.carSpeed + accel * dt, 42);
    else if (brake) this.carSpeed = Math.max(this.carSpeed - brake * dt, -10);
    else this.carSpeed -= Math.sign(this.carSpeed) * 8 * dt;
    if (Math.abs(this.carSpeed) < 0.2) this.carSpeed = 0;
    const steer = (input.isDown('a') || input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('d') || input.isDown('ArrowRight') ? 1 : 0);
    if (this.carSpeed !== 0) {
      this.angle += steer * 1.9 * dt * Math.sign(this.carSpeed);
    }
    const nx = this.x + Math.sin(this.angle) * this.carSpeed * dt;
    const nz = this.z + Math.cos(this.angle) * this.carSpeed * dt;
    const r = city.resolve(nx, nz, 2.4);
    const crashed = r.hit && Math.abs(this.carSpeed) > 8;
    if (r.hit) this.carSpeed *= 0.4;
    this.x = r.x; this.z = r.z;
    this.speed = Math.abs(this.carSpeed);
    car.mesh.position.set(this.x, 0, this.z);
    car.mesh.rotation.y = this.angle;
    this.mesh.position.set(this.x, 0, this.z);
    this.mesh.visible = false;
    return { crashed };
  }

  enterCar(car) {
    this.inCar = car;
    car.taken = true;
    this.carSpeed = 0;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.inCar) return;
    const car = this.inCar;
    this.inCar = null;
    this.x = car.mesh.position.x + 3;
    this.z = car.mesh.position.z;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
  }

  shoot() {
    if (this.ammo <= 0) return false;
    this.ammo -= 1;
    return true;
  }
}
