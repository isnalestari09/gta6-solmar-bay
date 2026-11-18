// wanted.js — the wanted system: stars rise with crime, police cars and officers
// respond, and the heat fades when Dani lays low out of sight.

import { WANTED } from './config.js';
import { makeCar } from './vehicles.js';

export function createWantedSystem(scene) {
  return {
    stars: 0,
    heat: 0,
    quietTimer: 0,
    policeCars: [],
    policeOfficers: [],
    scene,
    /** A crime adds heat; every 30 heat is another star, up to five. */
    addCrime(amount) {
      this.heat = Math.min(150, this.heat + amount);
      const want = Math.min(WANTED.maxStars, Math.floor(this.heat / 30));
      if (want > this.stars) this.stars = want;
      this.quietTimer = 0;
    },
    /** Spend a quiet stretch to cool down: one star fades, then the next. */
    update(dt, playerPos, colliders, rng) {
      if (this.stars > 0) {
        this.quietTimer += dt;
        if (this.quietTimer > WANTED.decaySeconds) {
          this.stars -= 1;
          this.heat = this.stars * 30;
          this.quietTimer = 0;
        }
      }
      const wantCars = this.stars * WANTED.policePerStar;
      while (this.policeCars.length < wantCars) {
        const a = rng() * Math.PI * 2;
        const car = makeCar(this.scene,
          playerPos.x + Math.cos(a) * 60, playerPos.z + Math.sin(a) * 60,
          a, 0x1b2a4a, 'police');
        this.policeCars.push(car);
      }
      while (this.policeCars.length > wantCars) {
        const car = this.policeCars.pop();
        this.scene.remove(car.mesh);
      }
      return this.stars;
    },
    clear() {
      this.stars = 0;
      this.heat = 0;
      this.quietTimer = 0;
      for (const car of this.policeCars) this.scene.remove(car.mesh);
      this.policeCars = [];
    },
  };
}

/** Stars as text, for the HUD and the minimap legend. */
export function starsText(stars) {
  return '★'.repeat(stars) + '☆'.repeat(WANTED.maxStars - stars);
}
