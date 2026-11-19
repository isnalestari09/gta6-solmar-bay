// Solmar Bay — the wanted system. One job: heat, stars, police who spawn
// around the player and chase them, and the hiding rule: heat only decays
// once a cop has actually closed within 30 units of Dani.
import { WANTED } from './config.js';

export class Wanted {
  constructor(scene, vehicles, city) {
    this.vehicles = vehicles;
    this.city = city;
    this.heat = 0;
    this.stars = 0;
    this.holdHeat = false; // frozen during scripted chase steps
    this.copClosedIn = false; // a cop got within closeRange at least once
    this.heatFlash = 0;
  }

  addHeat(amount, reason) {
    if (this.holdHeat) return;
    this.heat = Math.min(100, this.heat + amount);
    this.heatFlash = 1;
    this.recomputeStars();
  }

  recomputeStars() {
    this.stars = this.heat <= 0 ? 0
      : this.heat < 25 ? 1
      : this.heat < 45 ? 2
      : this.heat < 65 ? 3
      : this.heat < 85 ? 4 : 5;
  }

  clear() {
    this.heat = 0;
    this.stars = 0;
    this.copClosedIn = false;
    for (const c of [...this.vehicles.cops]) this.vehicles.removeCop(c);
  }

  wantedCount() {
    return Math.min(WANTED.maxCops, this.stars);
  }

  update(dt, playerPos, onFoot, onBusted) {
    // Spawn / despawn cops to match the star level.
    const want = this.wantedCount();
    while (this.vehicles.cops.length < want) {
      const a = Math.random() * Math.PI * 2;
      const x = playerPos.x + Math.cos(a) * WANTED.spawnRadius;
      const z = playerPos.z + Math.sin(a) * WANTED.spawnRadius;
      const fixed = this.city.resolveCollision(x, z, 2);
      this.vehicles.spawnCop(fixed.x, fixed.z);
    }
    while (this.vehicles.cops.length > want) {
      this.vehicles.removeCop(this.vehicles.cops[this.vehicles.cops.length - 1]);
    }

    let nearestCop = Infinity;
    for (const cop of this.vehicles.cops) {
      const dx = playerPos.x - cop.x;
      const dz = playerPos.z - cop.z;
      const d = Math.hypot(dx, dz);
      nearestCop = Math.min(nearestCop, d);
      if (d < WANTED.closeRange) this.copClosedIn = true;
      // Chase: steer toward the player, ram speed scales with stars. Very
      // close in, cops creep instead of blasting past — they pin the player.
      const targetYaw = Math.atan2(dx, dz);
      let dy = targetYaw - cop.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      cop.yaw += dy * Math.min(1, dt * 2.2);
      const chaseSpeed = d < 5 ? 4 : 16 + this.stars * 2.4;
      cop.speed += (chaseSpeed - cop.speed) * Math.min(1, dt * 1.5);
      const nx = cop.x + Math.sin(cop.yaw) * cop.speed * dt;
      const nz = cop.z + Math.cos(cop.yaw) * cop.speed * dt;
      const fixed = this.city.resolveCollision(nx, nz, 1.6);
      cop.x = fixed.x;
      cop.z = fixed.z;
      cop.mesh.position.set(cop.x, 0, cop.z);
      cop.mesh.rotation.y = cop.yaw;
      // Touching the player on foot for a while = busted.
      if (onFoot && d < 2.6) {
        cop.touchTime += dt;
        if (cop.touchTime > WANTED.bustTouchSec) onBusted();
      } else {
        cop.touchTime = 0;
      }
    }

    // Heat decay while hidden: only after a cop has closed in, and only
    // while the nearest cop is far away. Frozen during scripted chases.
    if (!this.holdHeat && this.heat > 0 && this.copClosedIn && nearestCop > 45) {
      this.heat = Math.max(0, this.heat - WANTED.decayPerSec * dt);
      this.recomputeStars();
    }
    if (this.heatFlash > 0) this.heatFlash -= dt * 2;
  }
}
