// Solmar Bay — the HUD: cash, stars, coins, mission line, health, speed,
// radio, help text, toast messages, the live minimap, and the menu / pause /
// busted / story-end overlays.

import { RADIO, WORLD } from './config.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = {};
    for (const id of ['cash', 'coins', 'stars', 'mission-name', 'mission-obj', 'health', 'speed', 'radio', 'help', 'toast', 'menu', 'pause', 'busted', 'story-end', 'minimap', 'car-health']) {
      this.el[id] = document.getElementById(id);
    }
    this.minimap = this.el.minimap.getContext('2d');
    this.toastTimer = 0;
    this.lastCash = -1;
  }

  showToast(text) {
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    this.toastTimer = 4;
  }

  showMenu() {
    this.el.menu.classList.remove('hidden');
    this.el.pause.classList.add('hidden');
    this.el.busted.classList.add('hidden');
  }

  hideMenu() {
    this.el.menu.classList.add('hidden');
  }

  showPause(show) {
    this.el.pause.classList.toggle('hidden', !show);
  }

  showBusted(show) {
    this.el.busted.classList.toggle('hidden', !show);
  }

  showStoryEnd() {
    this.el['story-end'].classList.remove('hidden');
  }

  update(dt) {
    const g = this.game;
    const p = g.player;
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.el.toast.classList.remove('show');
    }
    if (g.cash !== this.lastCash) {
      this.el.cash.textContent = `$${g.cash}`;
      this.lastCash = g.cash;
    }
    this.el.coins.textContent = `◉ ${g.coins}/${g.coinsTotal}`;
    // Wanted stars: filled gold for active, outline for the rest.
    let stars = '';
    for (let i = 0; i < 5; i++) stars += i < g.wanted.stars ? '★' : '☆';
    this.el.stars.textContent = stars;
    this.el.stars.classList.toggle('hot', g.wanted.stars >= 3);
    const m = g.missions.current;
    if (g.missions.completedAll) {
      this.el['mission-name'].textContent = 'FREE ROAM — LILA IS FREE';
    } else if (g.missions.active) {
      this.el['mission-name'].textContent = `MISSION ${m.id} · ${m.name} · $${m.pay}`;
    } else if (m) {
      this.el['mission-name'].textContent = 'FREE ROAM';
    }
    this.el['mission-obj'].textContent = g.missions.objectiveText(p);
    this.el.health.textContent = `HEALTH ${Math.round(p.health)}%`;
    this.el.health.classList.toggle('low', p.health < 35);
    if (p.inCar) {
      this.el.speed.textContent = `${Math.round(Math.abs(p.speed) * 2.2)} km/h`;
      this.el['car-health'].textContent = 'CAR 100%';
      this.el['car-health'].classList.remove('hidden');
    } else {
      this.el.speed.textContent = '';
      this.el['car-health'].classList.add('hidden');
    }
    const station = RADIO[g.audio.station];
    this.el.radio.textContent = g.audio.muted ? '♪ MUTED' : `♪ ${station.name} — ${station.genre}`;
    this.el.help.textContent = 'WASD move/drive · E enter car · F / Space punch · Shift sprint · P pause\nM mission · T taxi fare · R radio · 1-4 stations · N mute';
    this.drawMinimap();
  }

  drawMinimap() {
    const g = this.game;
    const ctx = this.minimap;
    const S = 200;
    const scale = S / (WORLD.half * 2 + 40);
    const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
    ctx.fillStyle = '#0e1a2e';
    ctx.fillRect(0, 0, S, S);
    ctx.strokeStyle = '#2a4a6a';
    ctx.lineWidth = 1;
    // Roads.
    ctx.strokeStyle = '#4a5a6a';
    for (let i = -4; i <= 4; i++) {
      const c = i * 60;
      const [x1, y1] = toMap(c, -WORLD.half);
      const [x2, y2] = toMap(c, WORLD.half);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = toMap(-WORLD.half, c);
      const [x4, y4] = toMap(WORLD.half, c);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
    // Sea and docks.
    ctx.fillStyle = '#1d4e5e';
    ctx.fillRect(0, toMap(0, WORLD.dockZ)[1], S, S - toMap(0, WORLD.dockZ)[1]);
    ctx.fillStyle = '#d9b380';
    ctx.fillRect(0, toMap(0, WORLD.dockZ)[1] - 3, S, 4);
    // Coins.
    ctx.fillStyle = '#ffc93c';
    for (const c of g.world.coinMeshes) {
      if (c.taken) continue;
      const [x, y] = toMap(c.pos.x, c.pos.z);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    // Objective marker.
    if (g.world.objective) {
      const [x, y] = toMap(g.world.objective.pos.x, g.world.objective.pos.z);
      ctx.fillStyle = '#ff5252';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.stroke();
    }
    // Police.
    ctx.fillStyle = '#4488ff';
    for (const cop of g.wanted.cops) {
      if (!cop.placed) continue;
      const [x, y] = toMap(cop.pos.x, cop.pos.z);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const [px, py] = toMap(g.player.pos.x, g.player.pos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(g.player.inCar ? g.player.inCar.heading : g.player.heading);
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North label.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', S / 2, 12);
  }
}
