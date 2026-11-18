// Dani Reyes on foot: third-person movement, punching, shooting, and
// picking up sunset coins. When he is in a car, the car drives instead.
// Revision 2: holding Shift sprints on foot (run speed instead of walk).

import * as THREE from 'three';
import { PLAYER } from './config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, 0, 20);
    this.angle = Math.PI;   // facing north, towards the plaza
    this.health = PLAYER.maxHealth;
    this.ammo = PLAYER.ammoStart;
    this.inCar = null;      // Car instance, or null
    this.mesh = this._makeMesh();
    scene.add(this.mesh);
    this._bob = 0;
  }

  _makeMesh() {
    const g = new THREE.Group();
    // Dani: dark jacket, jeans, short black hair.
    const jacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.2, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
    );
    jacket.position.y = 1.0;
    g.add(jacket);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xe8b88a }),
    );
    head.position.y = 1.85;
    g.add(head);
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshLambertMaterial({ color: 0x111111 }),
    );
    hair.position.y = 1.9;
    g.add(hair);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.8, 0.45),
      new THREE.MeshLambertMaterial({ color: 0x1f2a37 }),
    );
    legs.position.y = 0.4;
    g.add(legs);
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.9, 0.22),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
    );
    arm.position.set(0.55, 1.0, 0.2);
    arm.name = 'gunArm';
    g.add(arm);
    return g;
  }

  // On-foot step. Returns a hit when the player bumped into a wall.
  // `sprint` (Shift) runs at PLAYER.runSpeed instead of walking.
  walk(dt, axes, city, sprint = false) {
    const speed = sprint ? PLAYER.runSpeed : PLAYER.walkSpeed;
    // Movement is relative to the camera heading (behind the player).
    const forwardX = Math.sin(this.angle);
    const forwardZ = Math.cos(this.angle);
    const rightX = Math.cos(this.angle);
    const rightZ = -Math.sin(this.angle);
    const mx = forwardX * axes.forward + rightX * axes.strafe;
    const mz = forwardZ * axes.forward + rightZ * axes.strafe;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      this.pos.x += (mx / len) * speed * dt;
      this.pos.z += (mz / len) * speed * dt;
      this.angle = Math.atan2(mx / len, mz / len);
      this._bob += dt * 9;
    }
    const hit = city.resolveCircle(this.pos, PLAYER.radius);
    this.mesh.position.set(this.pos.x, Math.abs(Math.sin(this._bob)) * 0.05, this.pos.z);
    this.mesh.rotation.y = this.angle;
    return hit;
  }

  enterCar(car) {
    this.inCar = car;
    car.stolen = true;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.inCar) return;
    const car = this.inCar;
    this.inCar = null;
    // Step out to the driver's side.
    this.pos.set(car.pos.x - Math.cos(car.angle) * 2.2, 0, car.pos.z + Math.sin(car.angle) * 2.2);
    this.angle = car.angle;
    this.mesh.visible = true;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.angle;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(PLAYER.maxHealth, this.health + amount);
  }

  get alive() { return this.health > 0; }
}
