// Solmar Bay — the five-star wanted system. Heat rises with crime, police spawn
// around the player and chase, and heat decays fast while the player hides.

import { WANTED, clamp, rand } from './config.js';
import { makePoliceCar, updatePoliceCar } from './vehicles.js';

export class Wanted {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.stars = 0;
    this.heat = 0;
    this.police = [];
    this.bustTimer = 0;
    this.hiding = false;
    this.engaged = false; // true once a cop has actually closed in on Dani
    this.spawnTimer = 0;
  }

  addHeat(amount) {
    this.heat = clamp(this.heat + amount, 0, WANTED.maxStars * WANTED.heatPerStar);
    const stars = Math.min(WANTED.maxStars, Math.floor(this.heat / WANTED.heatPerStar) + (this.heat > 0 ? 1 : 0));
    this.stars = this.heat <= 0 ? 0 : stars;
  }

  clear() {
    this.stars = 0;
    this.heat = 0;
    this.bustTimer = 0;
    this.engaged = false;
    for (const p of this.police) this.scene.remove(p.mesh);
    this.police = [];
  }

  update(dt, player, cars, opts = {}) {
    // Hiding: a cop has closed in on Dani at least once, and now none is
    // close. Police that are still driving in from their spawn point do
    // not count — the wanted level cannot clear itself before the first
    // patrol car ever arrives.
    const nearestPolice = this.police.reduce(
      (m, p) => Math.min(m, Math.hypot(p.x - player.x, p.z - player.z)),
      Infinity
    );
    if (nearestPolice < 30) this.engaged = true;
    this.hiding = this.engaged && nearestPolice > 45;
    // holdHeat (the mission-8 epilogue chase) freezes the wanted level:
    // a scripted five-star chase must not evaporate while Dani runs for
    // the boat.
    const decay = opts.holdHeat
      ? 0
      : (this.hiding ? WANTED.decayHiding : WANTED.decayNormal) * WANTED.heatPerStar * dt;
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - decay);
      this.stars = this.heat <= 0 ? 0 : Math.min(WANTED.maxStars, Math.floor(this.heat / WANTED.heatPerStar) + 1);
      // Once the heat fully clears, the episode is over: re-arm the
      // engaged flag so the next wanted level has to earn its hiding
      // state with a real police arrival all over again.
      if (this.stars === 0) this.engaged = false;
    }
    const wantPolice = this.stars > 0 ? Math.min(6, this.stars + WANTED.policePerStar) : 0;
    this.spawnTimer -= dt;
    if (this.police.length < wantPolice && this.spawnTimer <= 0) {
      this.spawnTimer = 1.2;
      const a = rand(0, Math.PI * 2);
      const r = rand(WANTED.spawnRadiusMin, WANTED.spawnRadiusMax);
      const x = clamp(player.x + Math.sin(a) * r, -200, 200);
      const z = clamp(player.z + Math.cos(a) * r, -200, 200);
      this.police.push(makePoliceCar(this.scene, x, z));
    }
    if (this.police.length > wantPolice) {
      // Drop the oldest patrol car: it is usually the farthest away and
      // least engaged, while the fresh arrivals are the ones closing in.
      const extra = this.police.shift();
      this.scene.remove(extra.mesh);
    }
    // Police chase and ram. On foot, a touch starts the bust clock, and the
    // clock resets the moment no cop is touching Dani, so a near-miss does
    // not carry over into the next encounter.
    let busted = false;
    let touching = false;
    for (const p of this.police) {
      const { dist } = updatePoliceCar(p, player.x, player.z, dt, this.colliders);
      if (!player.inCar && dist < 2.6) touching = true;
      if (player.inCar && dist < 3.4) {
        player.inCar.health -= WANTED.policeRamDamage * dt;
        if (player.inCar.health <= 0) busted = true;
      }
    }
    if (touching) {
      this.bustTimer += dt;
      if (this.bustTimer > WANTED.bustTouchSeconds) busted = true;
    } else {
      this.bustTimer = 0;
    }
    return { busted, nearestPolice };
  }
}
