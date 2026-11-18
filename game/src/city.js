// buildSolmarBayCity — the original city of Solmar Bay, built from code.
// A grid of blocks with roads, procedural buildings (canvas window textures),
// palm trees, a beach and ocean to the south, and named landmarks the missions use.

import * as THREE from '../vendor/three.module.min.js';
import { CITY, PALETTE } from './config.js';

function makeSeededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** A procedural facade: lit windows on a coloured wall, drawn once per palette. */
function makeFacadeTexture(baseColor, litRatio, rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${baseColor.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 28) {
    for (let x = 10; x < 118; x += 26) {
      const lit = rng() < litRatio;
      ctx.fillStyle = lit ? '#ffd98a' : '#2a3442';
      ctx.fillRect(x, y, 16, 18);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Road centre-lines: the grid lines between blocks, in world units. */
export function roadLines() {
  const lines = [];
  const step = CITY.block + CITY.road;
  for (let i = -4; i <= 4; i++) lines.push(i * step);
  return lines;
}

export function nearestRoadPoint(x, z) {
  const lines = roadLines();
  let best = { x, z, d: Infinity };
  for (const lx of lines) {
    const d = Math.abs(x - lx);
    if (d < best.d) best = { x: lx, z, d };
  }
  for (const lz of lines) {
    const d = Math.abs(z - lz);
    if (d < best.d) best = { x, z: lz, d };
  }
  return best;
}

export function buildSolmarBayCity(scene) {
  const rng = makeSeededRandom(20261118);
  const colliders = []; // {x, z, halfX, halfZ}
  const group = new THREE.Group();
  group.name = 'SolmarBay';

  // --- ground, beach and ocean -------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 400, CITY.half * 2 + 400),
    new THREE.MeshLambertMaterial({ color: 0x6b7c5e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  ground.receiveShadow = true;
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 400, 60),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, CITY.beachZ + 20);
  sand.receiveShadow = true;
  group.add(sand);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 600, 300),
    new THREE.MeshLambertMaterial({ color: PALETTE.ocean, transparent: true, opacity: 0.92 }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.4, CITY.beachZ + 200);
  group.add(ocean);

  // --- roads and sidewalks -------------------------------------------------
  const lines = roadLines();
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const sideMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  for (const c of lines) {
    for (const [w, d, x, z] of [
      [CITY.half * 2, CITY.road, 0, c],
      [CITY.road, CITY.half * 2, c, 0],
    ]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.02, z);
      road.receiveShadow = true;
      group.add(road);
    }
  }
  // Dashed centre lines, one thin box per road segment.
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.asphaltLine });
  for (const c of lines) {
    for (let t = -CITY.half; t < CITY.half; t += 12) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 5), lineMat);
      dash.position.set(t, 0.05, c);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 0.6), lineMat);
      dash2.position.set(c, 0.05, t);
      group.add(dash2);
    }
  }
  void sideMat;

  // --- buildings ------------------------------------------------------------
  const step = CITY.block + CITY.road;
  const facades = PALETTE.building.map((c) => makeFacadeTexture(c, 0.45, rng));
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x4a3f35 });
  const landmarks = {};
  let bi = 0;
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      const cx = gx * step;
      const cz = gz * step;
      // Keep the central plaza open.
      if (gx === 0 && gz === 0) continue;
      const count = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < count; k++) {
        const w = 14 + rng() * 16;
        const d = 14 + rng() * 16;
        const h = 10 + rng() * rng() * 46;
        const ox = (k === 0 ? -8 : 8) + (rng() - 0.5) * 6;
        const oz = (k === 0 ? -8 : 8) + (rng() - 0.5) * 6;
        const mat = new THREE.MeshLambertMaterial({ map: facades[bi % facades.length] });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(cx + ox, h / 2, cz + oz);
        b.castShadow = true;
        b.receiveShadow = true;
        group.add(b);
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 1, d + 1), roofMat);
        roof.position.set(cx + ox, h + 0.5, cz + oz);
        group.add(roof);
        // Neon sign on tall buildings — the city's night look.
        if (h > 34) {
          const neon = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.7, 1.2, 0.4),
            new THREE.MeshBasicMaterial({ color: PALETTE.neon[bi % PALETTE.neon.length] }),
          );
          neon.position.set(cx + ox, h - 2, cz + oz + d / 2 + 0.3);
          group.add(neon);
        }
        colliders.push({ x: cx + ox, z: cz + oz, halfX: w / 2 + 1, halfZ: d / 2 + 1 });
        bi++;
      }
    }
  }

  // --- landmarks the story names -------------------------------------------
  function landmark(name, x, z, w, h, d, color, sign) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    m.position.set(x, h / 2, z);
    m.castShadow = true;
    group.add(m);
    colliders.push({ x, z, halfX: w / 2 + 1, halfZ: d / 2 + 1 });
    if (sign) {
      const s = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.8, 2, 0.5),
        new THREE.MeshBasicMaterial({ color: 0xffd166 }),
      );
      s.position.set(x, h + 1.5, z + d / 2 + 0.4);
      group.add(s);
    }
    landmarks[name] = { x, z };
    return m;
  }
  landmark('casino', 156, 52, 34, 22, 26, 0x7a2e6d, true);
  landmark('garage', 156, -104, 26, 10, 20, 0x3a6ea5, false);
  landmark('market', -104, -52, 24, 9, 18, 0xc98a3a, false);
  landmark('arcade', 104, 52, 22, 12, 18, 0x9a3a8a, true);
  landmark('hotel', 52, -208, 26, 30, 20, 0x3a8a7a, true);
  landmark('marina', 208, 156, 20, 8, 16, 0x2e6a8a, false);
  landmark('pier', 0, 262, 30, 2, 10, 0x8a6a3a, false);
  landmarks.plaza = { x: 0, z: 0 };
  landmarks.airport = { x: -208, z: -208 };
  landmarks.docks = { x: -208, z: 104 };

  // --- palm trees ------------------------------------------------------------
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e8a4a });
  for (let i = 0; i < 90; i++) {
    const x = (rng() - 0.5) * CITY.half * 2;
    const z = (rng() - 0.5) * CITY.half * 2;
    if (Math.abs(x) % step < 20 && Math.abs(z) % step < 20) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
    trunk.position.set(x, 3.5, z);
    group.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.5, 6), leafMat);
    leaves.position.set(x, 8.2, z);
    group.add(leaves);
  }

  // --- central plaza fountain ------------------------------------------------
  const fountain = new THREE.Mesh(
    new THREE.CylinderGeometry(7, 8, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }),
  );
  fountain.position.set(0, 0.6, 0);
  group.add(fountain);
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 6, 0.4, 16),
    new THREE.MeshLambertMaterial({ color: 0x4db2d9 }),
  );
  water.position.set(0, 1.2, 0);
  group.add(water);
  colliders.push({ x: 0, z: 0, halfX: 8, halfZ: 8 });

  scene.add(group);
  return { colliders, landmarks, group };
}

/** True when a circle of radius r at (x,z) hits a building collider. */
export function hitsCollider(colliders, x, z, r) {
  for (const c of colliders) {
    if (Math.abs(x - c.x) < c.halfX + r && Math.abs(z - c.z) < c.halfZ + r) return c;
  }
  return null;
}

/** Clamp a position inside the drivable city (plus the beach). */
export function clampToCity(x, z) {
  return {
    x: Math.max(-CITY.half, Math.min(CITY.half, x)),
    z: Math.max(-CITY.half, Math.min(CITY.beachZ + 36, z)),
  };
}
