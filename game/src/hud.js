// HUD: cash, wanted stars, health, speed, mission objective tracker,
// toasts, the live minimap, and the four screens (title / pause / dead /
// story complete). All DOM, drawn over the canvas.

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this._build();
  }

  _el(tag, id, text = '') {
    const e = document.createElement(tag);
    if (id) e.id = id;
    e.textContent = text;
    this.root.appendChild(e);
    return e;
  }

  _build() {
    this.cashEl = this._el('div', 'cash', '$0');
    this.starsEl = this._el('div', 'stars', '');
    this.healthEl = this._el('div', 'health', '❤ 100');
    this.speedEl = this._el('div', 'speed', '0 km/h');
    this.radioEl = this._el('div', 'radio', 'SOLMAR FM');
    this.tracker = this._el('div', 'objective');
    this.trackerText = document.createElement('span');
    this.trackerText.id = 'objective-text';
    this.tracker.appendChild(this.trackerText);
    this.trackerBar = document.createElement('div');
    this.trackerBar.id = 'objective-bar';
    this.tracker.appendChild(this.trackerBar);
    this.toastEl = this._el('div', 'toast', '');
    this.map = document.createElement('canvas');
    this.map.id = 'minimap';
    this.map.width = 180; this.map.height = 180;
    this.root.appendChild(this.map);
    this.screen = this._el('div', 'screen');
    this.screenTitle = document.createElement('h1');
    this.screen.appendChild(this.screenTitle);
    this.screenBody = document.createElement('p');
    this.screen.appendChild(this.screenBody);
    this.screenHint = document.createElement('p');
    this.screenHint.id = 'screen-hint';
    this.screen.appendChild(this.screenHint);
  }

  setCash(cash) { this.cashEl.textContent = `$${cash.toLocaleString('en-US')}`; }
  setStars(n) { this.starsEl.textContent = '★'.repeat(n) + '☆'.repeat(5 - n); this.starsEl.style.color = n > 0 ? '#ff5533' : '#888888'; }
  setHealth(h) { this.healthEl.textContent = `❤ ${Math.max(0, Math.round(h))}`; }
  setSpeed(kmh) { this.speedEl.textContent = `${Math.round(kmh)} km/h`; }
  setRadio(name) { this.radioEl.textContent = name; }
  setObjective(text, fraction) {
    this.trackerText.textContent = text;
    this.trackerBar.style.width = `${Math.round(fraction * 100)}%`;
  }
  toast(text, ms = 2500) {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { this.toastEl.style.opacity = '0'; }, ms);
  }
  showScreen(title, body, hint) {
    this.screen.style.display = 'flex';
    this.screenTitle.textContent = title;
    this.screenBody.textContent = body;
    this.screenHint.textContent = hint;
  }
  hideScreen() { this.screen.style.display = 'none'; }

  drawMinimap(player, missions, vehicles, city) {
    const ctx = this.map.getContext('2d');
    const S = 180, half = 200;
    const to = (v) => ((v + half) / (half * 2)) * S;
    ctx.fillStyle = '#1e2b1e';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#3a3f46';
    for (const r of [-160, -80, 0, 80, 160]) {
      ctx.fillRect(0, to(r) - 2, S, 4);
      ctx.fillRect(to(r) - 2, 0, 4, S);
    }
    ctx.fillStyle = '#2f7fb8';
    ctx.fillRect(0, to(185), S, S - to(185));
    ctx.fillStyle = '#d9c28a';
    ctx.fillRect(0, to(180), S, to(185) - to(180));
    // Plazas.
    ctx.fillStyle = '#b9b3a4';
    for (const [px, pz] of [[-120, -120], [120, 120]]) {
      ctx.beginPath(); ctx.arc(to(px), to(pz), 8, 0, Math.PI * 2); ctx.fill();
    }
    // Coins.
    ctx.fillStyle = '#ffc93c';
    for (const c of city.coins) if (!c.taken) ctx.fillRect(to(c.x) - 1, to(c.z) - 1, 3, 3);
    // Mission target.
    const m = missions.current();
    if (m) {
      ctx.fillStyle = '#ff5533';
      ctx.beginPath(); ctx.arc(to(m.target[0]), to(m.target[1]), 5, 0, Math.PI * 2); ctx.fill();
    }
    // Police.
    ctx.fillStyle = '#3355ff';
    for (const cop of vehicles.police) ctx.fillRect(to(cop.x) - 2, to(cop.z) - 2, 4, 4);
    // Player.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(to(player.x), to(player.z), 4, 0, Math.PI * 2); ctx.fill();
  }
}
