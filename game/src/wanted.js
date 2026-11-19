// Wanted level: 0 to 5 stars. Crimes raise it, hiding lowers it.
// Police cruisers spawn as the level rises and despawn as it falls.

export class Wanted {
  constructor(vehicles, audio) {
    this.vehicles = vehicles;
    this.audio = audio;
    this.stars = 0;
    this.heat = 0; // 0..100, drives star changes
    this.hiding = false;
    this.lastPos = { x: 0, z: 0 }; // last known player position
  }

  addCrime(amount, reason) {
    this.heat = Math.min(100, this.heat + amount);
    this._syncStars();
    if (this.audio) this.audio.siren();
    return reason;
  }

  _syncStars() {
    const want = this.heat <= 0 ? 0 : this.heat < 20 ? 1 : this.heat < 40 ? 2 : this.heat < 60 ? 3 : this.heat < 80 ? 4 : 5;
    if (want > this.stars) {
      for (let i = this.stars; i < want; i++) {
        // Cruisers spawn on the roads around the player, not at the origin.
        const a = Math.random() * Math.PI * 2;
        this.vehicles.spawnPolice(this.lastPos.x + Math.cos(a) * 55, this.lastPos.z + Math.sin(a) * 55);
      }
    } else if (want < this.stars) {
      while (this.vehicles.police.length > want) {
        this.vehicles.removePolice(this.vehicles.police[this.vehicles.police.length - 1]);
      }
    }
    this.stars = want;
  }

  update(dt, playerPos) {
    this.lastPos = { x: playerPos.x, z: playerPos.z };
    // Hiding: no police car within 45 m cools the heat three times faster.
    let nearest = Infinity;
    for (const cop of this.vehicles.police) {
      nearest = Math.min(nearest, Math.hypot(cop.x - playerPos.x, cop.z - playerPos.z));
    }
    this.hiding = this.stars > 0 && nearest > 45;
    const cool = this.hiding ? 7.5 : 2.5;
    if (this.heat > 0) {
      this.heat = Math.max(0, this.heat - cool * dt);
      this._syncStars();
    }
  }

  clear() {
    this.heat = 0;
    this._syncStars();
  }
}
