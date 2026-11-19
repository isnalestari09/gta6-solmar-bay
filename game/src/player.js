// Solmar Bay — Dani Reyes on foot. One job: movement, sprint, punch, and the
// little low-poly figure itself (dark jacket, same face in every scene).
import * as THREE from 'three';
import { PLAYER } from './config.js';

export function makeDaniFigure() {
  const g = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x22262e });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const hair = new THREE.MeshLambertMaterial({ color: 0x14100c });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2e4a6b });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 0.6), jacket);
  body.position.y = 1.35;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.58), skin);
  head.position.y = 2.3;
  g.add(head);
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.22, 0.62), hair);
  hairTop.position.y = 2.62;
  g.add(hairTop);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.9, 0.5), jeans);
  legL.position.set(-0.3, 0.45, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.3;
  g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.1, 0.4), jacket);
  armL.position.set(-0.75, 1.35, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.75;
  g.add(armR);
  g.userData = { armL, armR, legL, legR, body, head };
  return g;
}

export class Player {
  constructor(scene, city) {
    this.city = city;
    this.group = makeDaniFigure();
    this.group.position.set(0, 0, 8);
    scene.add(this.group);
    this.x = 0;
    this.z = 8;
    this.yaw = Math.PI; // facing the plaza fountain
    this.health = PLAYER.health;
    this.speed = 0;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.punching = false;
    this.swing = 0; // 0..1 punch animation progress
    this.moving = false;
    this.sprinting = false;
    this.walkPhase = 0;
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    this.health = PLAYER.health;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.swing = 0;
    this.group.position.set(x, 0, z);
  }

  update(dt, input, camYaw) {
    const mv = input.moveVector();
    this.sprinting = input.held('shift') && mv.active;
    const speed = this.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    this.moving = mv.active;
    if (mv.active) {
      // Camera-relative movement.
      const sin = Math.sin(camYaw);
      const cos = Math.cos(camYaw);
      const wx = mv.x * cos - mv.z * sin;
      const wz = mv.x * sin + mv.z * cos;
      const targetYaw = Math.atan2(wx, wz);
      let dy = targetYaw - this.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      this.yaw += dy * Math.min(1, dt * 12);
      const nx = this.x + wx * speed * dt;
      const nz = this.z + wz * speed * dt;
      const fixed = this.city.resolveCollision(nx, nz, PLAYER.radius);
      this.x = fixed.x;
      this.z = fixed.z;
      this.walkPhase += dt * speed * 1.6;
    }
    this.group.position.set(this.x, 0, this.z);
    this.group.rotation.y = this.yaw;
    // Walk cycle + punch swing.
    const u = this.group.userData;
    const swingAmp = this.moving ? 0.55 : 0;
    const ph = this.walkPhase;
    u.legL.rotation.x = Math.sin(ph) * swingAmp;
    u.legR.rotation.x = -Math.sin(ph) * swingAmp;
    u.armL.rotation.x = -Math.sin(ph) * swingAmp;
    u.armR.rotation.x = Math.sin(ph) * swingAmp;
    if (this.swing > 0) {
      this.swing = Math.max(0, this.swing - dt * 3.2);
      const s = Math.sin(this.swing * Math.PI);
      u.armR.rotation.x = -1.5 * s;
      u.armR.position.z = 0.5 * s;
    } else {
      u.armR.position.z = 0;
    }
    if (this.punchCooldown > 0) this.punchCooldown -= dt;
    if (this.punchTimer > 0) this.punchTimer -= dt;
  }

  tryPunch() {
    if (this.punchCooldown > 0) return false;
    this.punchCooldown = PLAYER.punchCooldown;
    this.punchTimer = 0.25;
    this.swing = 1;
    this.punching = true;
    return true;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(PLAYER.health, this.health + amount);
  }
}
