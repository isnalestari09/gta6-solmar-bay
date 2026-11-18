// The wanted system: 0–5 stars. Crimes raise it, police chase and ram,
// and it fades when the player stays out of sight. Police count scales
// with the star level.
// Revision 2: heat decays faster while hiding — no police car within 45 m
// means the trail is going cold (3x the normal fade rate).

export class Wanted {
  constructor(vehicles, audio) {
    this.vehicles = vehicles;
    this.audio = audio;
    this.stars = 0;
    this._heat = 0;        // 0..100, stars = ceil(heat / 20)
    this._fadeTimer = 0;
    this._sirenTimer = 0;
    this._chaseTimer = 0;
    this.hiding = false;   // true while no cop is close (revision 2)
  }

  add(amount, reason) {
    this._heat = Math.min(100, this._heat + amount);
    this._fadeTimer = 6;   // grace period before fading starts
    this._syncStars();
    return reason;
  }

  get level() { return this.stars; }

  _syncStars() {
    const next = Math.ceil(this._heat / 20);
    if (next !== this.stars) {
      this.stars = next;
      this._matchPolice();
    }
  }

  _matchPolice() {
    const want = this.stars === 0 ? 0 : Math.min(4, this.stars);
    while (this.vehicles.police.length < want) {
      const a = Math.random() * Math.PI * 2;
      this.vehicles.spawnPolice(Math.cos(a) * 60, Math.sin(a) * 60);
    }
    while (this.vehicles.police.length > want) {
      this.vehicles.removePolice(this.vehicles.police[0]);
    }
  }

  // Police AI: chase the player, ram, and get stuck less by steering around.
  update(dt, playerPos, inCar, city) {
    if (this.stars === 0) return;
    this._fadeTimer -= dt;
    if (this._fadeTimer <= 0) {
      // Hiding: no police car within 45 m, so the heat cools 3x faster.
      let nearest = Infinity;
      for (const cop of this.vehicles.police) {
        nearest = Math.min(nearest, Math.hypot(cop.pos.x - playerPos.x, cop.pos.z - playerPos.z));
      }
      this.hiding = nearest > 45;
      const rate = this.hiding ? 7.5 : 2.5;
      this._heat = Math.max(0, this._heat - dt * rate);
      this._syncStars();
    }
    this._sirenTimer -= dt;
    if (this._sirenTimer <= 0) {
      this.audio.siren();
      this._sirenTimer = 3 + Math.random() * 2;
    }
    this._chaseTimer += dt;
    for (const cop of this.vehicles.police) {
      const dx = playerPos.x - cop.pos.x;
      const dz = playerPos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantAngle = Math.atan2(dx / dist, dz / dist);
      let diff = wantAngle - cop.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const steer = Math.max(-1, Math.min(1, diff * 1.5));
      const throttle = dist > 6 ? 1 : 0.4;
      cop.drive(dt, steer, throttle, city);
      // Ram: slow the player down hard on contact.
      if (dist < 3.2 && this._chaseTimer > 0.5) {
        this._chaseTimer = 0;
        return { rammed: true, damage: 8 };
      }
    }
    return { rammed: false, damage: 0 };
  }

  clear() {
    this._heat = 0;
    this.stars = 0;
    this._matchPolice();
  }
}
