// Solmar Bay — Dani Reyes on foot: a low-poly figure with a punch arm,
// sprint lean, and a third-person camera that follows behind him.

import * as THREE from 'three';
import { PLAYER_TUNING, clamp, angleLerp } from './config.js';
import { hitsCollider, resolveColliders, clampToWorld } from './city.js';

export function makeDani() {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const hoodie = new THREE.MeshLambertMaterial({ color: 0x1c1c22 });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2e4a6b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), hoodie);
  body.position.y = 1.15;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), skin);
  head.position.y = 2.0;
  group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshLambertMaterial({ color: 0x14100c }));
  hair.position.y = 2.08;
  hair.scale.set(1, 0.7, 1);
  group.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), jeans);
  legL.position.set(-0.22, 0.35, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.7, 0.32), jeans);
  legR.position.set(0.22, 0.35, 0);
  group.add(legR);
  // The right arm swings when Dani punches.
  const armR = new THREE.Group();
  armR.position.set(0.55, 1.55, 0);
  const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.26), hoodie);
  armMesh.position.y = -0.45;
  armR.add(armMesh);
  group.add(armR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.26), hoodie);
  armL.position.set(-0.55, 1.1, 0);
  group.add(armL);
  group.userData = { legL, legR, armR, body };
  return group;
}

export class Player {
  constructor(scene, colliders, x = 0, z = 24) {
    this.mesh = makeDani();
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.colliders = colliders;
    this.pos = this.mesh.position;
    this.heading = 0;
    this.speed = 0;
    this.health = PLAYER_TUNING.health;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.walkPhase = 0;
    this.sprinting = false;
  }

  update(dt, input, cameraYaw, onPunch) {
    const axes = input.moveAxes();
    this.sprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const moving = axes.x !== 0 || axes.z !== 0;
    const targetSpeed = moving ? (this.sprinting ? PLAYER_TUNING.sprintSpeed : PLAYER_TUNING.walkSpeed) : 0;
    // Ease toward the target speed: quick to start, quick to stop.
    const rate = targetSpeed > this.speed ? PLAYER_TUNING.accel : PLAYER_TUNING.accel * 1.6;
    this.speed += clamp(targetSpeed - this.speed, -rate * dt, rate * dt);
    if (this.speed > 0.1 && moving) {
      // Movement is relative to the camera: W walks away from the camera.
      const worldAngle = Math.atan2(axes.x, axes.z) + cameraYaw;
      this.heading = angleLerp(this.heading, worldAngle + Math.PI, Math.min(1, dt * PLAYER_TUNING.turnSpeed));
      const nx = this.pos.x + Math.sin(this.heading) * this.speed * dt;
      const nz = this.pos.z + Math.cos(this.heading) * this.speed * dt;
      const oldX = this.pos.x;
      const oldZ = this.pos.z;
      this.pos.x = nx;
      this.pos.z = nz;
      if (hitsCollider(this.colliders, this.pos.x, this.pos.z, PLAYER_TUNING.radius)) {
        // Try sliding along each axis before giving up the step.
        this.pos.x = nx;
        this.pos.z = oldZ;
        if (hitsCollider(this.colliders, this.pos.x, this.pos.z, PLAYER_TUNING.radius)) {
          this.pos.x = oldX;
          this.pos.z = nz;
          if (hitsCollider(this.colliders, this.pos.x, this.pos.z, PLAYER_TUNING.radius)) {
            this.pos.x = oldX;
            this.pos.z = oldZ;
          }
        }
      }
      resolveColliders(this.colliders, this.pos, PLAYER_TUNING.radius);
      clampToWorld(this.pos);
      this.walkPhase += dt * this.speed * 1.6;
    }
    // Punch: F or Space, with a short cooldown and a visible arm swing.
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    if ((input.wasPressed('KeyF') || input.wasPressed('Space')) && this.punchCooldown <= 0) {
      this.punchCooldown = PLAYER_TUNING.punchCooldown;
      this.punchTimer = 0.28;
      if (onPunch) onPunch();
    }
    this.punchTimer = Math.max(0, this.punchTimer - dt);
    this.mesh.rotation.y = this.heading;
    const parts = this.mesh.userData;
    const swing = this.speed > 0.1 ? Math.sin(this.walkPhase) * 0.5 * Math.min(1, this.speed / 6) : 0;
    parts.legL.rotation.x = swing;
    parts.legR.rotation.x = -swing;
    parts.armR.rotation.x = this.punchTimer > 0 ? -1.9 * (this.punchTimer / 0.28) : -swing * 0.6;
    parts.body.rotation.x = this.sprinting && this.speed > 6 ? 0.18 : 0;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  healFull() {
    this.health = PLAYER_TUNING.health;
  }
}
