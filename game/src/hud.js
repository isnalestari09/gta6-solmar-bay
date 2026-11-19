// Solmar Bay — the HUD: cash, coins, stars, mission line, speed, health,
// radio and a live 2D minimap drawn on a canvas. All DOM, updated by the
// game loop; the minimap shows roads, plazas, the docks, coins, cops, the
// player arrow and the mission marker.

import { WORLD, PLAZAS, DOCKS } from './config.js';

export class HUD {
  constructor() {
    this.cash = document.getElementById('hud-cash');
    this.coins = document.getElementById('hud-coins');
    this.stars = document.getElementById('hud-stars');
    this.mission = document.getElementById('hud-mission');
    this.objective = document.getElementById('hud-objective');
    this.speed = document.getElementById('hud-speed');
    this.health = document.getElementById('hud-health');
    this.radio = document.getElementById('hud-radio');
    this.toastEl = document.getElementById('hud-toast');
    this.bannerEl = document.getElementById('hud-banner');
    this.minimap = document.getElementById('minimap');
    this.mapCtx = this.minimap.getContext('2d');
    this._toastTimer = null;
    this._bannerTimer = null;
  }

  setCash(cash) {
    this.cash.textContent = '$' + cash.toLocaleString('en-US');
  }

  setCoins(got, total) {
    this.coins.textContent = '◉ ' + got + '/' + total + ' coins';
  }

  setStars(stars) {
    let out = '';
    for (let i = 0; i < 5; i++) out += i < stars ? '★' : '☆';
    this.stars.textContent = out;
    this.stars.style.color = stars > 0 ? '#ffd800' : '#cfcfcf';
  }

  setMission(title, objective) {
    this.mission.textContent = title;
    this.objective.textContent = objective;
  }

  setDriving(speedKmh, carHealth) {
    this.speed.textContent = Math.round(speedKmh) + ' km/h';
    this.health.textContent = 'CAR ' + Math.max(0, Math.round(carHealth)) + '%';
  }

  setWalking(health) {
    this.speed.textContent = '';
    this.health.textContent = 'HEALTH ' + Math.max(0, Math.round(health)) + '%';
  }

  setRadio(text) {
    this.radio.textContent = text;
  }

  toast(text, seconds = 3) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), seconds * 1000);
  }

  banner(text, seconds = 3.5) {
    this.bannerEl.textContent = text;
    this.bannerEl.classList.add('show');
    clearTimeout(this._bannerTimer);
    this._bannerTimer = setTimeout(() => this.bannerEl.classList.remove('show'), seconds * 1000);
  }

  drawMinimap(state) {
    const ctx = this.mapCtx;
    const size = this.minimap.width;
    const scale = size / (WORLD.half * 2);
    const toMap = (x, z) => [(x + WORLD.half) * scale, (z + WORLD.half) * scale];
    ctx.fillStyle = '#10141c';
    ctx.fillRect(0, 0, size, size);
    // Roads.
    ctx.strokeStyle = '#3a4356';
    ctx.lineWidth = 3;
    for (const line of WORLD.roadLines) {
      const [x1, y1] = toMap(line, -WORLD.half);
      const [x2, y2] = toMap(line, WORLD.half);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const [x3, y3] = toMap(-WORLD.half, line);
      const [x4, y4] = toMap(WORLD.half, line);
      ctx.beginPath(); ctx.moveTo(x3, y3); ctx.lineTo(x4, y4); ctx.stroke();
    }
    // Sea.
    ctx.fillStyle = '#1d5a75';
    const [, seaY] = toMap(0, WORLD.waterAt);
    ctx.fillRect(0, seaY, size, size - seaY);
    // Plazas.
    ctx.fillStyle = '#c9a06a';
    for (const plaza of [PLAZAS.sol, PLAZAS.coral]) {
      const [px, py] = toMap(plaza.x - plaza.half, plaza.z - plaza.half);
      ctx.fillRect(px, py, plaza.half * 2 * scale, plaza.half * 2 * scale);
    }
    // Docks pier and lighthouse.
    ctx.fillStyle = '#8a6a3f';
    const [bx, by] = toMap(DOCKS.pier.x - DOCKS.pier.width / 2, DOCKS.pier.z);
    ctx.fillRect(bx, by, DOCKS.pier.width * scale, DOCKS.pier.length * scale);
    ctx.fillStyle = '#ffffff';
    const [lx, ly] = toMap(DOCKS.lighthouse.x, DOCKS.lighthouse.z);
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
    // Coins left to find.
    ctx.fillStyle = '#ffd800';
    for (const coin of state.coins) {
      if (coin.taken) continue;
      const [cx, cy] = toMap(coin.x, coin.z);
      ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
    }
    // Mission marker.
    if (state.marker) {
      ctx.fillStyle = '#ff5a3c';
      const [mx, my] = toMap(state.marker.x, state.marker.z);
      ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff5a3c';
      ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI * 2); ctx.stroke();
    }
    // Police.
    ctx.fillStyle = '#ff3b30';
    for (const cop of state.cops) {
      const [cx, cy] = toMap(cop.x, cop.z);
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow, pointing along the heading.
    const [px, py] = toMap(state.player.x, state.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(state.player.heading);
    ctx.fillStyle = '#7dff8a';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // North marker.
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', size / 2, 11);
  }
}
