// Solmar Bay — the wanted system: heat, five stars, and police cars that
// spawn around Dani and chase him down. Heat only decays while hiding, and
// hiding only counts once a cop has actually closed within 30 units of Dani.
// During a scripted chase step the heat is frozen, so the chase cannot
// evaporate before Dani reaches the boat.

import * as THREE from 'three';
import { WANTED_TUNING, distance2D, clamp } from './config.js';
import { makeCarMesh } from './vehicles.js';

export class Wanted {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.heat = 0;
    this.heatForced = false; // frozen during chase steps
    this.copSeenDani = false;
    this.bustClock = 0;
    this.cops = [];
    this.bestWanted = 0;
  }

  get stars() {
    return Math.min(5, Math.ceil(this.heat / WANTED_TUNING.heatPerStar));
  }

  addHeat(amount) {
    if (this.heatForced) return;
    this.heat = clamp(this.heat + amount, 0, WANTED_TUNING.maxHeat);
    this.bestWanted = Math.max(this.bestWanted, this.stars);
  }

  setHeat(value) {
    this.heat = clamp(value, 0, WANTED_TUNING.maxHeat);
    this.bestWanted = Math.max(this.bestWanted, this.stars);
  }

  update(dt, playerPos, playerInCar, onBusted) {
    const wanted = this.stars;
    // Spawn cops around the player up to the wanted level.
    while (this.cops.length < Math.min(wanted, WANTED_TUNING.maxCops)) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 42 + Math.random() * 18;
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;
      const mesh = makeCarMesh(0x14161c, true);
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.cops.push({ mesh, pos: mesh.position, heading: 0, speed: 0, ramCooldown: 0 });
    }
    // Release cops when the heat is gone. The oldest patrol leaves first,
    // so the newest chase stays on Dani the longest.
    while (this.cops.length > wanted) {
      const cop = this.cops.shift();
      this.scene.remove(cop.mesh);
    }
    // A cop counts as having seen Dani once it closes within hide range.
    let nearest = Infinity;
    for (const cop of this.cops) {
      nearest = Math.min(nearest, distance2D(cop.pos.x, cop.pos.z, playerPos.x, playerPos.z));
    }
    if (nearest < WANTED_TUNING.hideRange) this.copSeenDani = true;
    if (this.heat <= 0) this.copSeenDani = false;

    // Heat decay: fast while hiding, slow while a cop can see Dani.
    if (!this.heatForced && this.heat > 0) {
      const hiding = this.copSeenDani && nearest > WANTED_TUNING.hideRange;
      const rate = hiding ? WANTED_TUNING.decayHiding : WANTED_TUNING.decaySeen;
      this.heat = Math.max(0, this.heat - rate * dt);
    }

    // Chase: each cop steers toward Dani and rams. A cop touching Dani
    // for bustTouchSeconds busts him.
    let touching = false;
    for (const cop of this.cops) {
      const dx = playerPos.x - cop.pos.x;
      const dz = playerPos.z - cop.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz) || 1;
      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - cop.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      cop.heading += clamp(diff, -2.2 * dt, 2.2 * dt);
      const targetSpeed = dist > 4 ? WANTED_TUNING.copSpeed : WANTED_TUNING.copSpeed * 0.55;
      cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 2);
      cop.pos.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.pos.z += Math.cos(cop.heading) * cop.speed * dt;
      cop.mesh.rotation.y = cop.heading;
      cop.ramCooldown = Math.max(0, cop.ramCooldown - dt);
      if (dist < 3) {
        touching = true;
        if (cop.ramCooldown <= 0) {
          cop.ramCooldown = WANTED_TUNING.ramCooldown;
          if (onBusted) onBusted('ram', cop);
        }
      }
    }
    if (touching) {
      this.bustClock += dt;
      if (this.bustClock >= WANTED_TUNING.bustTouchSeconds) {
        this.bustClock = 0;
        if (onBusted) onBusted('busted', null);
      }
    } else {
      this.bustClock = 0;
    }
    return { nearest, touching };
  }

  // Put cops right next to a point: used by the staged chase screenshot so
  // the pursuit reads in one frame instead of after a long drive-in.
  placeCopsNear(x, z, count) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.6;
      const dist = 12 + i * 3;
      const mesh = makeCarMesh(0x14161c, true);
      mesh.position.set(x + Math.cos(angle) * dist, 0, z + Math.sin(angle) * dist);
      this.scene.add(mesh);
      this.cops.push({ mesh, pos: mesh.position, heading: angle + Math.PI, speed: 8, ramCooldown: 0 });
    }
  }

  clearCops() {
    for (const cop of this.cops) this.scene.remove(cop.mesh);
    this.cops = [];
  }

  reset() {
    this.heat = 0;
    this.heatForced = false;
    this.copSeenDani = false;
    this.bustClock = 0;
    this.clearCops();
  }
}
