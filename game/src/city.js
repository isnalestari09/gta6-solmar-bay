// Solmar Bay — the city itself: a sunset grid of roads and blocks, two
// plazas, a docks strip with a lighthouse, palms, lamps and 12 hidden coins.
// The layout is seeded, so the city is identical on every run. Buildings are
// boxes with a procedurally painted window texture; nothing is loaded.

import * as THREE from 'three';
import { WORLD, PLAZAS, DOCKS, mulberry32 } from './config.js';

const BUILDING_COLORS = [0x8a6a4f, 0x7a7d84, 0xa88a5f, 0x6f7f7a, 0x9c7b52, 0x84716b, 0xb09a72, 0x5f6e7d];
const ROOF_COLORS = [0x3d3a38, 0x4a4642, 0x55483a];

function windowTexture(rand, baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#' + baseColor.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 64, 128);
  const lit = ['#ffd98a', '#ffe9b8', '#2b2f38', '#3a3f4a'];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      ctx.fillStyle = lit[Math.floor(rand() * lit.length)];
      ctx.fillRect(6 + col * 14, 8 + row * 15, 9, 10);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makePalm(height = 5) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, height, 6), trunkMat);
  trunk.position.y = height / 2;
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 4), leafMat);
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.9, height + 0.2, Math.sin(angle) * 0.9);
    leaf.rotation.z = Math.cos(angle) * 1.1;
    leaf.rotation.x = -Math.sin(angle) * 1.1;
    leaf.scale.set(1, 1, 0.28);
    group.add(leaf);
  }
  return group;
}

function makeBuilding(rand, w, h, d, color) {
  const texture = windowTexture(rand, color);
  const side = new THREE.MeshLambertMaterial({ map: texture });
  const top = new THREE.MeshLambertMaterial({ color: ROOF_COLORS[Math.floor(rand() * ROOF_COLORS.length)] });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
  mesh.position.y = h / 2;
  mesh.castShadow = false;
  return mesh;
}

export function buildCity(scene) {
  const rand = mulberry32(20261119);
  const colliders = [];
  const coins = [];
  const lamps = [];

  // Sky, fog and light: a low sun over the sea.
  scene.background = new THREE.Color(0xffb26b);
  scene.fog = new THREE.Fog(0xffb26b, 120, 380);
  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x8a5a34, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27a, 1.6);
  sun.position.set(-80, 60, -120);
  scene.add(sun);

  // Ground: one big sandy plane.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
    new THREE.MeshLambertMaterial({ color: 0xc98d4b }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Roads: dark strips with pale dashes down the middle.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x35322e });
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xd8cba8 });
  for (const line of WORLD.roadLines) {
    for (const along of [-1, 1]) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.roadHalf * 2), roadMat);
      strip.rotation.x = -Math.PI / 2;
      if (along === 1) strip.position.set(0, 0.02, line);
      else {
        strip.rotation.z = Math.PI / 2;
        strip.position.set(line, 0.02, 0);
      }
      scene.add(strip);
    }
    // Dashes along each road.
    for (let d = -WORLD.half + 10; d < WORLD.half - 10; d += 16) {
      for (const horizontal of [true, false]) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), dashMat);
        dash.rotation.x = -Math.PI / 2;
        if (horizontal) {
          dash.position.set(d, 0.04, line);
        } else {
          dash.rotation.z = Math.PI / 2;
          dash.position.set(line, 0.04, d);
        }
        scene.add(dash);
      }
    }
  }

  // Sea beyond the docks.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, 120),
    new THREE.MeshLambertMaterial({ color: 0x2e6f8e }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.05, WORLD.waterAt + 60);
  scene.add(sea);

  // Buildings: one or two per block, skipping the plazas and the docks.
  const blockCentres = [];
  for (let gx = -4; gx <= 4; gx++) {
    for (let gz = -4; gz <= 4; gz++) {
      const cx = gx * WORLD.roadStep;
      const cz = gz * WORLD.roadStep;
      if (cz >= WORLD.docksAt - 20) continue;
      if (Math.abs(cx - PLAZAS.sol.x) < 24 && Math.abs(cz - PLAZAS.sol.z) < 24) continue;
      if (Math.abs(cx - PLAZAS.coral.x) < 24 && Math.abs(cz - PLAZAS.coral.z) < 24) continue;
      blockCentres.push([cx, cz]);
    }
  }
  for (const [cx, cz] of blockCentres) {
    const count = rand() < 0.5 ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const w = 10 + rand() * 8;
      const d = 10 + rand() * 8;
      const h = 8 + rand() * 30;
      const color = BUILDING_COLORS[Math.floor(rand() * BUILDING_COLORS.length)];
      const ox = count === 1 ? 0 : (i === 0 ? -7 : 7);
      const oz = count === 1 ? 0 : (i === 0 ? 6 : -6);
      const building = makeBuilding(rand, w, h, d, color);
      building.position.x = cx + ox;
      building.position.z = cz + oz;
      scene.add(building);
      colliders.push({
        minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
        minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
      });
    }
  }

  // Plaza del Sol: fountain, palms and benches.
  const plazaMat = new THREE.MeshLambertMaterial({ color: 0xd9b380 });
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(PLAZAS.sol.half * 2, PLAZAS.sol.half * 2), plazaMat);
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(PLAZAS.sol.x, 0.03, PLAZAS.sol.z);
  scene.add(plaza);
  const fountainBase = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5.6, 0.8, 20),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }),
  );
  fountainBase.position.set(0, 0.4, 0);
  scene.add(fountainBase);
  const fountainWater = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.2, 0.3, 20),
    new THREE.MeshLambertMaterial({ color: 0x4db2d8 }),
  );
  fountainWater.position.set(0, 0.85, 0);
  scene.add(fountainWater);
  const fountainSpout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.8, 1.6, 10),
    new THREE.MeshLambertMaterial({ color: 0x9aa0a6 }),
  );
  fountainSpout.position.set(0, 1.4, 0);
  scene.add(fountainSpout);
  colliders.push({ minX: -5.6, maxX: 5.6, minZ: -5.6, maxZ: 5.6 });
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), benchMat);
    bench.position.set(Math.cos(angle) * 11, 0.35, Math.sin(angle) * 11);
    bench.rotation.y = -angle + Math.PI / 2;
    scene.add(bench);
    const palm = makePalm(5 + rand() * 1.5);
    palm.position.set(Math.cos(angle + 0.5) * 14, 0, Math.sin(angle + 0.5) * 14);
    scene.add(palm);
  }

  // Coral Plaza: a smaller paved square with palms.
  const coral = new THREE.Mesh(new THREE.PlaneGeometry(PLAZAS.coral.half * 2, PLAZAS.coral.half * 2), plazaMat);
  coral.rotation.x = -Math.PI / 2;
  coral.position.set(PLAZAS.coral.x, 0.03, PLAZAS.coral.z);
  scene.add(coral);
  for (let i = 0; i < 4; i++) {
    const palm = makePalm(4.5 + rand() * 1.5);
    palm.position.set(PLAZAS.coral.x + (i % 2 === 0 ? -12 : 12), 0, PLAZAS.coral.z + (i < 2 ? -12 : 12));
    scene.add(palm);
  }
  // Benches and two more palms near the docks, where the crew waits.
  for (let i = 0; i < 3; i++) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1), benchMat);
    bench.position.set(40 + i * 8, 0.35, 158);
    scene.add(bench);
    const palm = makePalm(5 + rand());
    palm.position.set(24 + i * 10, 0, 164);
    scene.add(palm);
  }

  // Street lamps along the roads.
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
  const lampGlowMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffdf8a, emissiveIntensity: 0.8 });
  for (const line of WORLD.roadLines) {
    for (let d = -140; d <= 140; d += 80) {
      for (const [x, z] of [[line + 8, d], [d, line + 8]]) {
        if (z >= WORLD.docksAt - 10 || x >= WORLD.half - 10) continue;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), lampPoleMat);
        pole.position.set(x, 3, z);
        scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlowMat);
        bulb.position.set(x, 6.1, z);
        scene.add(bulb);
        lamps.push(bulb);
      }
    }
  }

  // Docks: wooden pier, lighthouse, escape boat.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7d5a33 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(DOCKS.pier.width, 0.8, DOCKS.pier.length), pierMat);
  pier.position.set(DOCKS.pier.x, 0.4, DOCKS.pier.z + DOCKS.pier.length / 2 - 6);
  scene.add(pier);
  const lighthouseMat = new THREE.MeshLambertMaterial({ color: 0xe8e0d0 });
  const lighthouse = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3, 16, 12), lighthouseMat);
  lighthouse.position.set(DOCKS.lighthouse.x, 8, DOCKS.lighthouse.z);
  scene.add(lighthouse);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.5, 2.4, 12),
    new THREE.MeshLambertMaterial({ color: 0xc23a2a }),
  );
  band.position.set(DOCKS.lighthouse.x, 10, DOCKS.lighthouse.z);
  scene.add(band);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xfff2a8, emissive: 0xffe27a, emissiveIntensity: 1.4 }),
  );
  lamp.position.set(DOCKS.lighthouse.x, 17, DOCKS.lighthouse.z);
  scene.add(lamp);
  colliders.push({
    minX: DOCKS.lighthouse.x - 3, maxX: DOCKS.lighthouse.x + 3,
    minZ: DOCKS.lighthouse.z - 3, maxZ: DOCKS.lighthouse.z + 3,
  });
  // Escape boat: hull, mast and a sail.
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(4, 1.4, 10), new THREE.MeshLambertMaterial({ color: 0x2f4d6d }));
  hull.position.y = 0.7;
  boat.add(hull);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 7, 6), lampPoleMat);
  mast.position.y = 4.5;
  boat.add(mast);
  const sail = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 5, 4),
    new THREE.MeshLambertMaterial({ color: 0xf2ead8, side: THREE.DoubleSide }),
  );
  sail.position.y = 5;
  sail.scale.z = 0.3;
  boat.add(sail);
  boat.position.set(DOCKS.boat.x, 0.2, DOCKS.boat.z);
  boat.rotation.y = 0.4;
  scene.add(boat);

  // 12 sunset coins, spread across the city, none inside a building.
  const coinSpots = [
    [0, -24], [24, 0], [-24, 24], [40, -80], [-80, 40], [80, -40],
    [-120, -80], [120, 120], [-40, 120], [160, -120], [-160, 80], [40, 150],
  ];
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xffc93c, emissive: 0xa87800, emissiveIntensity: 0.7 });
  coinSpots.forEach(([x, z], i) => {
    const coin = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 10), coinMat);
    coin.scale.y = 1.4;
    coin.position.set(x, 1.4, z);
    coin.userData.index = i;
    scene.add(coin);
    coins.push(coin);
  });

  return { colliders, coins, coinSpots, lamps, boat };
}

// Circle (player, car, ped) against the building colliders. Returns true on hit.
export function hitsCollider(colliders, x, z, radius) {
  for (const c of colliders) {
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) {
      return true;
    }
  }
  return false;
}

// Push a circle out of any collider it overlaps.
export function resolveColliders(colliders, pos, radius) {
  for (const c of colliders) {
    const nearestX = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nearestZ = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nearestX;
    const dz = pos.z - nearestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      if (distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        pos.x = nearestX + (dx / dist) * radius;
        pos.z = nearestZ + (dz / dist) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
    }
  }
}

export function clampToWorld(pos, margin = 4) {
  pos.x = Math.max(-WORLD.half + margin, Math.min(WORLD.half - margin, pos.x));
  pos.z = Math.max(-WORLD.half + margin, Math.min(WORLD.half - margin, pos.z));
}
