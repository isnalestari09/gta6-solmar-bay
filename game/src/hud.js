// Solmar Bay — the HUD. One job: keep the DOM overlay and the 2D minimap in
// sync with the game state, and show/hide the menu, pause, busted and win
// overlays. The game owns the state; this file only renders it.
export class Hud {
  constructor() {
    this.cashEl = document.getElementById('hud-cash');
    this.coinsEl = document.getElementById('hud-coins');
    this.starsEl = document.getElementById('hud-stars');
    this.missionEl = document.getElementById('hud-mission');
    this.objectiveEl = document.getElementById('hud-objective');
    this.healthEl = document.getElementById('hud-health');
    this.speedEl = document.getElementById('hud-speed');
    this.carEl = document.getElementById('hud-car');
    this.radioEl = document.getElementById('hud-radio');
    this.toastEl = document.getElementById('hud-toast');
    this.menuEl = document.getElementById('overlay-menu');
    this.pauseEl = document.getElementById('overlay-pause');
    this.bustedEl = document.getElementById('overlay-busted');
    this.winEl = document.getElementById('overlay-win');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
  }

  starRow(n) {
    let s = '';
    for (let i = 0; i < 5; i++) s += i < n ? '★' : '☆';
    return s;
  }

  update(state) {
    this.cashEl.textContent = `$${state.cash}`;
    this.coinsEl.textContent = `◉ ${state.coins}/12`;
    this.starsEl.textContent = this.starRow(state.stars);
    this.starsEl.classList.toggle('hot', state.stars > 0);
    this.missionEl.textContent = state.missionTitle;
    this.objectiveEl.textContent = state.objective;
    this.healthEl.textContent = `HEALTH ${Math.round(state.health)}%`;
    this.healthEl.classList.toggle('low', state.health < 30);
    if (state.inCar) {
      this.carEl.style.display = 'block';
      this.carEl.textContent = `CAR ${Math.round(state.carHealth)}%`;
      this.speedEl.style.display = 'block';
      this.speedEl.textContent = `${Math.round(Math.abs(state.speed) * 3.2)} km/h`;
    } else {
      this.carEl.style.display = 'none';
      this.speedEl.style.display = 'none';
    }
    this.radioEl.textContent = state.muted ? '♪ MUTED' : `♪ ${state.station}`;
    if (this.toastTimer > 0) {
      this.toastTimer -= 1 / 60;
      if (this.toastTimer <= 0) this.toastEl.style.opacity = '0';
    }
    this.drawMinimap(state);
  }

  toast(text, seconds = 3) {
    this.toastEl.textContent = text;
    this.toastEl.style.opacity = '1';
    this.toastTimer = seconds;
  }

  showMenu(show) { this.menuEl.style.display = show ? 'flex' : 'none'; }
  showPause(show) { this.pauseEl.style.display = show ? 'flex' : 'none'; }
  showBusted(show) { this.bustedEl.style.display = show ? 'flex' : 'none'; }
  showWin(show) { this.winEl.style.display = show ? 'flex' : 'none'; }

  drawMinimap(state) {
    const ctx = this.mapCtx;
    const W = this.map.width;
    const H = this.map.height;
    const toMap = (x, z) => [((x + 200) / 400) * W, ((z + 200) / 400) * H];
    ctx.fillStyle = '#0e2233';
    ctx.fillRect(0, 0, W, H);
    // Roads.
    ctx.strokeStyle = '#3a4a5a';
    ctx.lineWidth = 3;
    for (const line of [-120, -60, 0, 60, 120]) {
      const [ax] = toMap(line, 0);
      const [, az] = toMap(0, line);
      ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, az); ctx.lineTo(W, az); ctx.stroke();
    }
    // Sea strip at the top (north = docks).
    ctx.fillStyle = '#1d5c66';
    ctx.fillRect(0, 0, W, 10);
    const dot = (x, z, color, r = 3) => {
      const [mx, mz] = toMap(x, z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(mx, mz, r, 0, Math.PI * 2);
      ctx.fill();
    };
    // Coins.
    for (const c of state.coinDots) dot(c.x, c.z, '#ffd21f', 2);
    // Mission target.
    if (state.target) dot(state.target.x, state.target.z, '#ff3b30', 5);
    // Traffic.
    for (const t of state.trafficDots) dot(t.x, t.z, '#e8c85a', 2);
    // Police.
    for (const c of state.copDots) dot(c.x, c.z, '#4aa3ff', 3);
    // Player arrow.
    const [px, pz] = toMap(state.playerX, state.playerZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(state.playerYaw);
    ctx.fillStyle = '#2ee66b';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North marker.
    ctx.fillStyle = '#cfe6ff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', W / 2, 12);
  }
}
