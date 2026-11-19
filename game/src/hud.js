// Solmar Bay — HUD: cash, wanted stars, objective tracker, live minimap,
// radio and speed readout, toasts and the menu / pause / busted overlays.

import { WORLD } from './config.js';

let els = {};
let toastTimer = null;

export function initHud() {
  els = {
    cash: document.getElementById('hud-cash'),
    coins: document.getElementById('hud-coins'),
    stars: document.getElementById('hud-stars'),
    objective: document.getElementById('hud-objective'),
    missionName: document.getElementById('hud-mission'),
    radio: document.getElementById('hud-radio'),
    speed: document.getElementById('hud-speed'),
    health: document.getElementById('hud-health'),
    toast: document.getElementById('hud-toast'),
    minimap: document.getElementById('minimap'),
    menu: document.getElementById('menu'),
    pause: document.getElementById('pause'),
    busted: document.getElementById('busted'),
    banner: document.getElementById('hud-banner'),
    menuTitle: document.getElementById('menu-title'),
    menuStory: document.getElementById('menu-story'),
    continueBtn: document.getElementById('btn-continue'),
    newBtn: document.getElementById('btn-new'),
    bustedText: document.getElementById('busted-text'),
  };
  return els;
}

export function showToast(text, ms = 2600) {
  if (!els.toast) return;
  els.toast.textContent = text;
  els.toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
}

export function showBanner(text, ms = 3000) {
  if (!els.banner) return;
  els.banner.textContent = text;
  els.banner.classList.add('show');
  setTimeout(() => els.banner.classList.remove('show'), ms);
}

export function updateHud(game) {
  if (!els.cash) return;
  els.cash.textContent = `$${game.cash.toLocaleString('en-US')}`;
  if (els.coins) els.coins.textContent = `◉ ${game.coinsCollected}/12 coins`;
  els.stars.textContent = '★'.repeat(game.wanted.stars) + '☆'.repeat(5 - game.wanted.stars);
  els.stars.style.color = game.wanted.stars > 0 ? '#ffd800' : '#888888';
  const m = game.missions.current;
  if (game.missions.active && m) {
    els.missionName.textContent = `MISSION ${m.id}: ${m.name}  •  $${m.payout}`;
    els.objective.textContent = game.missions.stepText(game);
  } else if (game.missionsDone >= 8) {
    els.missionName.textContent = 'STORY COMPLETE — Solmar Bay is yours';
    els.objective.textContent = 'Free roam: collect coins, run fares, cause chaos';
  } else {
    els.missionName.textContent = 'FREE ROAM';
    els.objective.textContent = `Next mission: ${MISSIONS_NEXT(game)} — press M to start · Best wanted: ${'★'.repeat(game.bestWanted)}${'☆'.repeat(5 - game.bestWanted)}`;
  }
  els.radio.textContent = game.audioMuted ? 'RADIO: MUTED' : `♪ ${game.station.name} — ${game.station.desc}`;
  const speed = game.player.inCar ? Math.abs(game.player.inCar.speed) * 2.4 : Math.abs(game.player.speed) * 2.4;
  els.speed.textContent = game.player.inCar ? `${Math.round(speed)} km/h` : '';
  els.health.textContent = game.player.inCar ? `CAR ${Math.max(0, Math.round(game.player.inCar.health))}%` : '';
  drawMinimap(game);
}

function MISSIONS_NEXT(game) {
  const next = game.missionsDone + 1;
  return next > 8 ? '—' : `Mission ${next}`;
}

export function drawMinimap(game) {
  const c = els.minimap;
  if (!c) return;
  const g = c.getContext('2d');
  const S = c.width;
  const scale = S / WORLD.size;
  const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
  g.clearRect(0, 0, S, S);
  g.fillStyle = 'rgba(12, 20, 28, 0.85)';
  g.fillRect(0, 0, S, S);
  // Roads.
  g.strokeStyle = '#5a6a7a';
  g.lineWidth = 3;
  for (let i = -3; i <= 3; i++) {
    const p = S / 2 + i * 46 * scale;
    g.beginPath(); g.moveTo(p, 0); g.lineTo(p, S); g.stroke();
    g.beginPath(); g.moveTo(0, p); g.lineTo(S, p); g.stroke();
  }
  // Plazas.
  g.fillStyle = '#c9a85a';
  for (const [x, z] of [[92, 92], [-92, -92]]) {
    const [mx, my] = toMap(x, z);
    g.fillRect(mx - 8, my - 8, 16, 16);
  }
  // Coins.
  g.fillStyle = '#ffd800';
  for (const coin of game.coins) {
    if (coin.taken) continue;
    const [mx, my] = toMap(coin.x, coin.z);
    g.beginPath(); g.arc(mx, my, 2.5, 0, Math.PI * 2); g.fill();
  }
  // Docks and escape boat, south edge.
  const [dx, dy] = toMap(0, 200);
  g.fillStyle = '#4a9ac4';
  g.fillRect(dx - 5, dy - 2, 10, 4);
  g.fillStyle = '#e8e0cc';
  g.fillRect(dx - 2, dy - 5, 4, 3);
  // Mission marker.
  const target = missionTarget(game);
  if (target) {
    const [mx, my] = toMap(target.x, target.z);
    g.fillStyle = '#ffe14a';
    g.beginPath(); g.arc(mx, my, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffe14a';
    g.beginPath(); g.arc(mx, my, 8 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2); g.stroke();
  }
  // Taxi fare destination.
  if (game.taxi.active && game.taxi.dest) {
    const [mx, my] = toMap(game.taxi.dest.x, game.taxi.dest.z);
    g.fillStyle = '#4ad8d8';
    g.beginPath(); g.arc(mx, my, 5, 0, Math.PI * 2); g.fill();
  }
  // Traffic cars.
  g.fillStyle = '#ffffff';
  for (const car of game.traffic) {
    const [mx, my] = toMap(car.x, car.z);
    g.fillRect(mx - 1.5, my - 1.5, 3, 3);
  }
  // Police.
  g.fillStyle = '#ff4444';
  for (const p of game.wanted.police) {
    const [mx, my] = toMap(p.x, p.z);
    g.beginPath(); g.arc(mx, my, 3.5, 0, Math.PI * 2); g.fill();
  }
  // Player arrow.
  const [px, py] = toMap(game.player.x, game.player.z);
  g.save();
  g.translate(px, py);
  g.rotate(-game.player.heading);
  g.fillStyle = '#39d353';
  g.beginPath();
  g.moveTo(0, -7); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath();
  g.fill();
  g.restore();
  // North tick.
  g.fillStyle = '#ffffff';
  g.font = 'bold 10px sans-serif';
  g.fillText('N', S / 2 - 3, 11);
}

function missionTarget(game) {
  if (!game.missions.active) return null;
  const s = game.missions.currentStep;
  if (!s) return null;
  if (typeof s.x === 'number' && typeof s.z === 'number') return { x: s.x, z: s.z };
  if (s.type === 'chase') return { x: 0, z: 200 };
  return null;
}

export function showMenu(hasSave) {
  if (!els.menu) return;
  els.menu.classList.remove('hidden');
  els.pause.classList.add('hidden');
  els.busted.classList.add('hidden');
  els.continueBtn.style.display = hasSave ? 'inline-block' : 'none';
}

export function hideMenu() {
  if (els.menu) els.menu.classList.add('hidden');
}

export function showPause(show) {
  if (els.pause) els.pause.classList.toggle('hidden', !show);
}

export function showBusted(show, text) {
  if (!els.busted) return;
  els.busted.classList.toggle('hidden', !show);
  if (text) els.bustedText.textContent = text;
}
