// The HUD: DOM overlays (health, cash, ammo, speed, clock, wanted stars,
// objective, station) plus a live minimap canvas, plus the four screens
// (title, pause, dead, story complete) and toast messages.
// Revision 2: the objective tracker now shows the mission step (e.g.
// "Mission 3/8") with a thin progress bar under the objective text.

export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this._build();
    this._clock = 8 * 60; // game clock starts at 08:00
    this._toasts = [];
  }

  _el(tag, cls, parent) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (parent) parent.appendChild(e);
    return e;
  }

  _build() {
    const top = this._el('div', 'hud-top', this.root);
    this.healthBar = this._el('div', 'bar health', top);
    this.healthFill = this._el('div', 'fill', this.healthBar);
    this.cashEl = this._el('div', 'stat cash', top);
    this.ammoEl = this._el('div', 'stat ammo', top);
    this.speedEl = this._el('div', 'stat speed', top);
    this.clockEl = this._el('div', 'stat clock', top);
    this.starsEl = this._el('div', 'stat stars', top);

    this.objectiveEl = this._el('div', 'objective', this.root);
    this.objectiveTextEl = this._el('div', 'objective-text', this.objectiveEl);
    this.objectiveStepEl = this._el('div', 'objective-step', this.objectiveEl);
    this.objectiveBarEl = this._el('div', 'objective-bar', this.objectiveEl);
    this.objectiveBarFill = this._el('div', 'fill', this.objectiveBarEl);
    this.stationEl = this._el('div', 'station', this.root);
    this.toastEl = this._el('div', 'toasts', this.root);
    this.helpEl = this._el('div', 'help', this.root);
    this.helpEl.textContent = 'WASD move · E steal car · F punch · Click shoot · Q radio · P pause · M mute · N next mission';

    this.minimap = this._el('canvas', 'minimap', this.root);
    this.minimap.width = 180; this.minimap.height = 180;
    this._mapCtx = this.minimap.getContext('2d');

    this.screen = this._el('div', 'screen', this.root);
    this.screenTitle = this._el('h1', '', this.screen);
    this.screenBody = this._el('p', '', this.screen);
    this.screenHint = this._el('p', 'hint', this.screen);
  }

  showScreen(kind, title, body, hint) {
    this.screen.dataset.kind = kind;
    this.screen.style.display = 'flex';
    this.screenTitle.textContent = title;
    this.screenBody.textContent = body;
    this.screenHint.textContent = hint;
  }

  hideScreen() { this.screen.style.display = 'none'; }

  toast(text) {
    const t = this._el('div', 'toast', this.toastEl);
    t.textContent = text;
    setTimeout(() => t.remove(), 3500);
  }

  update(state) {
    // state: { health, cash, ammo, speedKmh, stars, objective, station, time,
    //          missionIndex, missionTotal } — revision 2 adds the step tracker.
    const total = state.missionTotal || 8;
    const step = Math.min((state.missionIndex || 0) + 1, total);
    this.objectiveStepEl.textContent = state.missionIndex >= total
      ? 'Story complete'
      : `Mission ${step}/${total}`;
    this.objectiveBarFill.style.width = `${Math.round(((state.missionIndex || 0) / total) * 100)}%`;
    this.healthFill.style.width = `${Math.max(0, state.health)}%`;
    this.healthFill.style.background = state.health > 50 ? '#2ecc71' : state.health > 25 ? '#f39c12' : '#e74c3c';
    this.cashEl.textContent = `$${state.cash.toLocaleString()}`;
    this.ammoEl.textContent = `Ammo ${state.ammo}`;
    this.speedEl.textContent = `${Math.round(state.speedKmh)} km/h`;
    const h = Math.floor(state.time / 60) % 24;
    const m = Math.floor(state.time % 60);
    this.clockEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    this.starsEl.textContent = '★'.repeat(state.stars) + '☆'.repeat(5 - state.stars);
    this.starsEl.style.color = state.stars > 0 ? '#ffdd33' : '#888';
    this.objectiveTextEl.textContent = state.objective;
    this.stationEl.textContent = state.station;
    this._clock = state.time;
  }

  // Top-down map: roads, plaza, beacon, player arrow, police dots, coins.
  drawMinimap(playerPos, playerAngle, beacon, police, coins, citySize) {
    const ctx = this._mapCtx;
    const S = 180;
    const scale = S / (citySize * 1.15);
    const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
    ctx.fillStyle = '#1d2b1a';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    for (let c = -180; c <= 180; c += 60) {
      const [x1, y1] = toMap(c, -210); const [x2, y2] = toMap(c, 210);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = toMap(-210, c); const [x4, y4] = toMap(210, c);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
    // Plaza.
    const [px, py] = toMap(0, 0);
    ctx.fillStyle = '#cbb98f';
    ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();
    // Coins.
    ctx.fillStyle = '#ffd54a';
    for (const c of coins) {
      const [x, y] = toMap(c.x, c.z);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    // Beacon.
    if (beacon) {
      const [x, y] = toMap(beacon[0], beacon[1]);
      ctx.fillStyle = '#ffd54a';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    // Police.
    ctx.fillStyle = '#3388ff';
    for (const p of police) {
      const [x, y] = toMap(p.x, p.z);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const [ux, uy] = toMap(playerPos.x, playerPos.z);
    ctx.save();
    ctx.translate(ux, uy);
    ctx.rotate(Math.atan2(Math.sin(playerAngle), Math.cos(playerAngle)) + Math.PI);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
