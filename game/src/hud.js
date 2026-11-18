// hud.js — the heads-up display: health, cash, wanted stars, mission objective,
// speed, radio station and clock, plus a live minimap drawn on a 2D canvas.

import { starsText } from './wanted.js';

export function createHud(document) {
  const el = (id) => document.getElementById(id);
  const minimap = el('minimap');
  const mctx = minimap.getContext('2d');
  return {
    setHealth(h) { el('health').textContent = `♥ ${Math.max(0, Math.ceil(h))}`; },
    setCash(c) { el('cash').textContent = `$${c.toLocaleString('en-US')}`; },
    setAmmo(a) { el('ammo').textContent = `Ammo ${a}`; },
    setSpeed(kmh) { el('speed').textContent = `${Math.round(kmh)} km/h`; },
    setWanted(stars) {
      const w = el('wanted');
      w.textContent = starsText(stars);
      w.style.color = stars > 0 ? '#ff4d6d' : '#eef1f5';
    },
    setMission(text) { el('mission').textContent = text; },
    setRadio(name) { el('radio').textContent = `♪ ${name}`; },
    setClock(minutes) {
      const h = Math.floor(minutes / 60) % 24;
      const m = Math.floor(minutes % 60);
      el('clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    },
    setMessage(text) {
      const m = el('message');
      m.textContent = text;
      m.style.opacity = '1';
      clearTimeout(m._t);
      m._t = setTimeout(() => { m.style.opacity = '0'; }, 4200);
    },
    /** Draw the minimap: roads, beach, player, cars, police and the mission marker. */
    drawMinimap(state) {
      const S = 150;
      const scale = S / 560;
      mctx.clearRect(0, 0, S, S);
      mctx.fillStyle = '#10151d';
      mctx.fillRect(0, 0, S, S);
      const toMap = (x, z) => [S / 2 + x * scale, S / 2 + z * scale];
      mctx.fillStyle = '#e8cf9a';
      mctx.fillRect(0, S / 2 + 250 * scale, S, 40);
      mctx.strokeStyle = '#3a3f4a';
      mctx.lineWidth = 5;
      for (let i = -4; i <= 4; i++) {
        const c = i * 54;
        const [x1, y1] = toMap(c, -270);
        const [x2, y2] = toMap(c, 270);
        mctx.beginPath(); mctx.moveTo(x1, y1); mctx.lineTo(x2, y2); mctx.stroke();
        const [x3, y3] = toMap(-270, c);
        const [x4, y4] = toMap(270, c);
        mctx.beginPath(); mctx.moveTo(x3, y3); mctx.lineTo(x4, y4); mctx.stroke();
      }
      const dot = (x, z, color, r) => {
        const [mx, my] = toMap(x, z);
        mctx.fillStyle = color;
        mctx.beginPath(); mctx.arc(mx, my, r, 0, Math.PI * 2); mctx.fill();
      };
      for (const car of state.traffic) dot(car.x, car.z, '#8b93a3', 2);
      for (const car of state.police) dot(car.x, car.z, '#ff4d6d', 3);
      if (state.missionTarget) dot(state.missionTarget.x, state.missionTarget.z, '#ffd166', 4);
      dot(state.player.x, state.player.z, '#2f9e6e', 4);
      // North arrow.
      mctx.fillStyle = '#eef1f5';
      mctx.font = 'bold 11px sans-serif';
      mctx.fillText('N', 4, 12);
    },
  };
}
