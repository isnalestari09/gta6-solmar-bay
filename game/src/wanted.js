// Solmar Bay — the wanted system: stars, police pursuit, busts, and heat
// decay. Heat only decays after a cop has actually closed within spot range
// of Dani, so hiding only counts once the police have seen him.

import * as THREE from 'three';
import { WANTED, WORLD } from './config.js';
import { makeCarMesh } from './vehicles.js';

export class Wanted {
  constructor(scene, city) {
    this.scene = scene;
    this.city = city;
    this.stars = 0;
    this.heat = 0;
    this.cops = [];
    this.spotted = false;
    this.hiddenTimer = 0;
    this.bustTimer = 0;
    this.frozen = false; // scripted chase steps freeze the heat
    this.flash = 0;
  }

  setStars(n) {
    this.stars = Math.max(0, Math.min(WANTED.maxStars, n));
    this.heat = this.stars;
    if (this.stars === 0) {
      this.spotted = false;
      this.hiddenTimer = 0;
    }
    this.syncCops();
  }

  addStars(n) {
    this.setStars(this.stars + n);
  }

  // Keep the right number of police cars on the street for the star level.
  syncCops() {
    const want = WANTED.copsForStars[this.stars];
    while (this.cops.length < want) {
      const mesh = makeCarMesh(0x14161c, true);
      this.scene.add(mesh);
      this.cops.push({
        pos: new THREE.Vector3(0, 0, 0),
        heading: 0,
        mesh,
        speed: 0,
        placed: false,
        ramCooldown: 0,
      });
    }
    while (this.cops.length > want) {
      const cop = this.cops.pop();
      this.scene.remove(cop.mesh);
    }
  }

  spawnAround(playerPos) {
    for (const cop of this.cops) {
      if (cop.placed) continue;
      const a = Math.random() * Math.PI * 2;
      const r = WANTED.spawnMin + Math.random() * (WANTED.spawnMax - WANTED.spawnMin);
      cop.pos.set(
        Math.max(-WORLD.half + 8, Math.min(WORLD.half - 8, playerPos.x + Math.cos(a) * r)),
        0,
        Math.max(-WORLD.half + 8, Math.min(WORLD.half - 8, playerPos.z + Math.sin(a) * r)),
      );
      cop.placed = true;
      cop.mesh.position.copy(cop.pos);
    }
  }

  update(dt, player, time) {
    if (this.stars === 0) return;
    this.spawnAround(player.pos);
    this.flash += dt;
    let nearest = Infinity;
    let touching = false;
    for (const cop of this.cops) {
      if (!cop.placed) continue;
      const dx = player.pos.x - cop.pos.x;
      const dz = player.pos.z - cop.pos.z;
      const d = Math.hypot(dx, dz);
      nearest = Math.min(nearest, d);
      if (d < WANTED.spotRange) this.spotted = true;
      // Chase: steer toward the player, faster than a walking Dani, a touch
      // slower than a car at full speed.
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
      const targetSpeed = player.inCar ? WANTED.copSpeed * 2.4 : WANTED.copSpeed;
      cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.5);
      // A cop that catches Dani on foot pulls up beside him and holds him
      // there — it does not drive through him, or the bust would never land.
      if (!player.inCar && d < WANTED.bustRange + 0.6) cop.speed = 0;
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      this.city.collideCircle(cop.pos, 2.2);
      cop.mesh.position.copy(cop.pos);
      cop.mesh.rotation.y = cop.heading;
      // Light bar alternates red and blue.
      const phase = Math.floor(time * 6) % 2 === 0;
      cop.mesh.userData.lightRed.material.color.setHex(phase ? 0xff2222 : 0x551111);
      cop.mesh.userData.lightBlue.material.color.setHex(phase ? 0x111155 : 0x2244ff);
      // Ramming the player on foot hurts; ramming the car shoves it.
      cop.ramCooldown = Math.max(0, cop.ramCooldown - dt);
      if (d < 3.4 && cop.ramCooldown <= 0) {
        cop.ramCooldown = 1;
        if (player.inCar) {
          player.speed *= 0.55;
          player.camShake = Math.max(player.camShake, 0.5);
        } else {
          player.damage(WANTED.copRamDamage);
        }
      }
      if (d < WANTED.bustRange && !player.inCar) touching = true;
    }
    // Busted: a cop holds Dani for a moment on foot.
    if (touching) {
      this.bustTimer += dt;
      if (this.bustTimer >= WANTED.bustHold) return 'busted';
    } else {
      this.bustTimer = 0;
    }
    // Heat decay: only once spotted, only while no cop is near, never while
    // a scripted chase freezes it.
    if (!this.frozen && this.spotted) {
      if (nearest > WANTED.spotRange + 20) {
        this.hiddenTimer += dt;
        if (this.hiddenTimer > WANTED.decayDelay) {
          this.heat -= WANTED.decayRate * dt;
          if (this.heat <= this.stars - 1) {
            this.stars -= 1;
            this.heat = this.stars;
            this.syncCops();
          }
          if (this.stars <= 0) this.setStars(0);
        }
      } else {
        this.hiddenTimer = 0;
      }
    }
    return null;
  }

  // Called when the player is busted: fine them, clear the heat.
  clearAfterBust() {
    this.setStars(0);
    this.bustTimer = 0;
    this.frozen = false;
  }

  dispose() {
    for (const cop of this.cops) this.scene.remove(cop.mesh);
    this.cops = [];
  }
}
