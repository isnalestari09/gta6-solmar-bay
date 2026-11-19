// Solmar Bay — Dani Reyes on foot and behind the wheel: movement, sprint,
// punch combat, car entry, arcade driving and the chase camera.

import * as THREE from 'three';
import { PLAYER, CARS, WORLD } from './config.js';

function makePersonMesh(shirt, pants, skin) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 1.5, 0.6),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  body.position.y = 1.35;
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshLambertMaterial({ color: skin }),
  );
  head.position.y = 2.45;
  g.add(head);
  const hair = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.3, 0.75),
    new THREE.MeshLambertMaterial({ color: 0x14100c }),
  );
  hair.position.y = 2.85;
  g.add(hair);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.9, 0.45),
    new THREE.MeshLambertMaterial({ color: pants }),
  );
  legL.position.set(-0.3, 0.45, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.3;
  g.add(legR);
  const armL = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 1.1, 0.36),
    new THREE.MeshLambertMaterial({ color: shirt }),
  );
  armL.position.set(-0.78, 1.35, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.78;
  g.add(armR);
  g.userData.armL = armL;
  g.userData.armR = armR;
  g.userData.legL = legL;
  g.userData.legR = legR;
  return g;
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3(0, 0, 12);
    this.vel = new THREE.Vector3();
    this.heading = Math.PI;
    this.inCar = null;
    this.speed = 0;
    this.health = 100;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.punchSwing = 0;
    this.walkPhase = 0;
    this.mesh = makePersonMesh(0x1d2f45, 0x2a2a2e, 0xc98a5e);
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
    // A soft shadow disc under Dani.
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.06;
    scene.add(this.shadow);
    this.camShake = 0;
    this.camPos = new THREE.Vector3(0, 14, 26);
    this.camLook = new THREE.Vector3();
  }

  reset(spawn) {
    this.pos.set(spawn.x, 0, spawn.z);
    this.vel.set(0, 0, 0);
    this.heading = Math.PI;
    this.inCar = null;
    this.speed = 0;
    this.health = 100;
    this.punchTimer = 0;
    this.punchCooldown = 0;
    this.mesh.visible = true;
  }

  // On-foot movement; returns the distance moved this frame.
  updateOnFoot(dt, input, city) {
    const { fwd, turn } = input.axes();
    const sprint = input.isDown('Shift');
    const top = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const target = new THREE.Vector3();
    if (fwd !== 0 || turn !== 0) {
      // Camera-relative movement: forward is away from the camera.
      const camDir = this.camLook.clone().sub(this.camPos).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).negate();
      target.addScaledVector(camDir, fwd).addScaledVector(right, -turn);
      target.normalize().multiplyScalar(top);
      this.heading = Math.atan2(target.x, target.z);
    }
    const k = Math.min(1, PLAYER.accel * dt / top);
    this.vel.lerp(target, k);
    this.pos.addScaledVector(this.vel, dt);
    city.collideCircle(this.pos, 0.9);
    const moving = this.vel.length();
    this.walkPhase += moving * dt * 1.6;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    const swing = Math.min(1, moving / PLAYER.walkSpeed) * 0.5;
    this.mesh.userData.legL.rotation.x = Math.sin(this.walkPhase) * swing;
    this.mesh.userData.legR.rotation.x = -Math.sin(this.walkPhase) * swing;
    this.mesh.userData.armL.rotation.x = -Math.sin(this.walkPhase) * swing * 0.8;
    this.mesh.userData.armR.rotation.x = Math.sin(this.walkPhase) * swing * 0.8;
    // Punch swing: the right arm snaps forward, then relaxes.
    if (this.punchSwing > 0) {
      this.punchSwing = Math.max(0, this.punchSwing - dt * 4);
      this.mesh.userData.armR.rotation.x = -1.9 * Math.sin(this.punchSwing * Math.PI);
      this.mesh.userData.armR.rotation.z = -0.4 * Math.sin(this.punchSwing * Math.PI);
    }
    this.shadow.position.set(this.pos.x, 0.06, this.pos.z);
    return moving;
  }

  tryPunch() {
    if (this.punchCooldown > 0 || this.inCar) return false;
    this.punchCooldown = PLAYER.punchCooldown;
    this.punchSwing = 1;
    this.punchTimer = 0.18;
    return true;
  }

  tickPunch(dt) {
    this.punchCooldown = Math.max(0, this.punchCooldown - dt);
    this.punchTimer = Math.max(0, this.punchTimer - dt);
  }

  // Arcade car physics: the car steers with the front wheels, accelerates
  // with W, brakes/reverses with S, and slides a little on the turns.
  updateDriving(dt, input, city) {
    const car = this.inCar;
    const { fwd, turn } = input.axes();
    if (fwd > 0) this.speed += CARS.accel * dt;
    else if (fwd < 0) this.speed -= (this.speed > 0.5 ? CARS.brake : CARS.accel * 0.5) * dt;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), 14 * dt);
    this.speed = Math.max(-CARS.reverseSpeed, Math.min(CARS.topSpeed, this.speed));
    const steer = turn * CARS.steer * (this.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(this.speed) / 8);
    car.heading += steer * dt * (this.speed >= 0 ? 1 : -1) * Math.sign(this.speed || 1);
    const dx = Math.sin(car.heading) * this.speed * dt;
    const dz = Math.cos(car.heading) * this.speed * dt;
    car.pos.x += dx;
    car.pos.z += dz;
    const before = car.pos.clone();
    city.collideCircle(car.pos, 2.4);
    if (!car.pos.equals(before)) {
      // Bumped a building: shed speed and shake the camera.
      this.speed *= 0.4;
      this.camShake = Math.max(this.camShake, 0.35);
    }
    car.mesh.position.set(car.pos.x, 0, car.pos.z);
    car.mesh.rotation.y = car.heading;
    // Brake / reverse lights glow when slowing down.
    car.setBrakeLights(fwd < 0);
    this.pos.copy(car.pos);
    this.mesh.visible = false;
    this.shadow.position.set(car.pos.x, 0.06, car.pos.z);
  }

  enterCar(car) {
    this.inCar = car;
    car.stolen = true;
    this.mesh.visible = false;
    this.speed = 0;
  }

  exitCar() {
    const car = this.inCar;
    this.inCar = null;
    this.speed = 0;
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    this.pos.copy(car.pos).addScaledVector(side, 3);
    this.mesh.visible = true;
    this.mesh.position.copy(this.pos);
  }

  damage(amount) {
    this.health = Math.max(0, this.health - amount);
    this.camShake = Math.max(this.camShake, 0.3);
    return this.health <= 0;
  }

  heal(amount) {
    this.health = Math.min(PLAYER.maxHealth, this.health + amount);
  }

  updateCamera(dt, camera) {
    const inCar = !!this.inCar;
    const dist = inCar ? PLAYER.camDistCar : PLAYER.camDistFoot;
    const height = inCar ? PLAYER.camHeightCar : PLAYER.camHeightFoot;
    const heading = inCar ? this.inCar.heading : this.heading;
    const target = new THREE.Vector3(
      this.pos.x - Math.sin(heading) * dist,
      height,
      this.pos.z - Math.cos(heading) * dist,
    );
    // Keep the camera from sinking into the docks' sea wall or a tower.
    target.x = Math.max(-WORLD.half - 10, Math.min(WORLD.half + 10, target.x));
    target.z = Math.max(-WORLD.half - 10, Math.min(WORLD.half + 30, target.z));
    const k = Math.min(1, dt * 5);
    this.camPos.lerp(target, k);
    const look = new THREE.Vector3(this.pos.x, 2.2, this.pos.z);
    if (inCar) look.addScaledVector(new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading)), 8);
    this.camLook.lerp(look, Math.min(1, dt * 8));
    this.camShake = Math.max(0, this.camShake - dt * 1.4);
    const shake = this.camShake * this.camShake * 1.2;
    camera.position.set(
      this.camPos.x + (Math.random() - 0.5) * shake,
      this.camPos.y + (Math.random() - 0.5) * shake * 0.6,
      this.camPos.z + (Math.random() - 0.5) * shake,
    );
    camera.lookAt(this.camLook);
  }
}
