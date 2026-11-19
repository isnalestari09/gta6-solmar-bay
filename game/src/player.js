// Solmar Bay — Dani Reyes on foot: WASD movement, Shift sprint, F to punch,
// E to enter or leave a car. A simple built figure, no imported assets.

import * as THREE from 'three';
import { PLAYER, WORLD, clamp, angleLerp } from './config.js';
import { resolveCollisions } from './city.js';

export function makePlayerMesh() {
  const g = new THREE.Group();
  const jacket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.5, 1.1, 10),
    new THREE.MeshLambertMaterial({ color: 0x2a4a8a })
  );
  jacket.position.y = 1.0;
  g.add(jacket);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.33, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xc89878 })
  );
  head.position.y = 1.85;
  g.add(head);
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.1, 12),
    new THREE.MeshLambertMaterial({ color: 0xd8d8d8 })
  );
  cap.position.y = 2.08;
  g.add(cap);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
  for (const x of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.24), legMat);
    leg.position.set(x, 0.42, 0);
    g.add(leg);
  }
  const armMat = new THREE.MeshLambertMaterial({ color: 0x2a4a8a });
  for (const x of [-0.55, 0.55]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), armMat);
    arm.position.set(x, 1.0, 0);
    g.add(arm);
  }
  return g;
}

export class Player {
  constructor(scene) {
    this.mesh = makePlayerMesh();
    scene.add(this.mesh);
    this.x = 92;
    this.z = 70;
    this.heading = Math.PI;
    this.speed = 0;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.inCar = null;
    this.walkPhase = 0;
    this.mesh.position.set(this.x, 0, this.z);
  }

  update(dt, input, camYaw, colliders) {
    if (this.inCar) return;
    this.colliders = colliders; // kept so exitCar can resolve collisions too
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    const axis = input.moveAxis();
    const moving = axis.x !== 0 || axis.z !== 0;
    const sprint = input.sprinting();
    const targetSpeed = moving ? (sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) : 0;
    this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 8);
    if (moving) {
      const moveAngle = Math.atan2(axis.x, axis.z) + camYaw;
      this.heading = angleLerp(this.heading, moveAngle, Math.min(1, dt * 10));
      const pos = {
        x: this.x + Math.sin(this.heading) * this.speed * dt,
        z: this.z + Math.cos(this.heading) * this.speed * dt,
      };
      resolveCollisions(pos, PLAYER.radius, colliders);
      this.x = clamp(pos.x, -WORLD.half + 3, WORLD.half - 3);
      this.z = clamp(pos.z, -WORLD.half + 3, WORLD.half - 3);
      this.walkPhase += dt * this.speed * 1.6;
    }
    this.mesh.position.set(this.x, Math.abs(Math.sin(this.walkPhase)) * 0.05, this.z);
    this.mesh.rotation.y = this.heading;
  }

  punch() {
    if (this.punchCooldown > 0 || this.inCar) return false;
    this.punchCooldown = PLAYER.punchCooldown;
    this.punchTimer = 0.25;
    return true;
  }

  get punchActive() {
    return this.punchTimer > 0;
  }

  punchReach() {
    return {
      x: this.x + Math.sin(this.heading) * PLAYER.punchRange,
      z: this.z + Math.cos(this.heading) * PLAYER.punchRange,
    };
  }

  enterCar(car) {
    this.inCar = car;
    this.mesh.visible = false;
  }

  exitCar() {
    if (!this.inCar) return;
    const car = this.inCar;
    this.inCar = null;
    const pos = {
      x: car.x + Math.sin(car.heading + Math.PI / 2) * 3,
      z: car.z + Math.cos(car.heading + Math.PI / 2) * 3,
    };
    // The exit spot can land inside a building corner; push Dani out of
    // colliders and clamp to the map so he never spawns stuck in a wall.
    resolveCollisions(pos, PLAYER.radius, this.colliders);
    this.x = clamp(pos.x, -WORLD.half + 3, WORLD.half - 3);
    this.z = clamp(pos.z, -WORLD.half + 3, WORLD.half - 3);
    this.heading = car.heading;
    this.mesh.visible = true;
    this.mesh.position.set(this.x, 0, this.z);
  }

  teleport(x, z, heading = 0) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
  }
}
