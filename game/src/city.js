// Solmar Bay — the city itself: ground, road grid, buildings, two plazas,
// palms, streetlights and the 12 hidden sunset coins. All geometry is procedural.

import * as THREE from 'three';
import { WORLD, mulberry32, randPick } from './config.js';

const BUILDING_COLORS = [0xd8c9a3, 0xc9a06a, 0x9db8c4, 0xe0d6c0, 0xb98a7a, 0x8fa8a0, 0xd9b48a, 0xa8b8d8];
const ROOF_COLORS = [0x7a4a3a, 0x4a5a6a, 0x8a6a4a, 0x5a6a5a];

function makeWindowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#e8e0cc';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#2a3542';
  for (let y = 10; y < 120; y += 22) {
    for (let x = 8; x < 56; x += 20) {
      g.fillRect(x, y, 12, 14);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color, ...opts });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function buildCity(scene) {
  const rng = mulberry32(20261119);
  const colliders = [];
  const coins = [];
  const group = new THREE.Group();
  group.name = 'city';

  // Sun-soaked ground and the road grid.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.size, WORLD.size),
    new THREE.MeshLambertMaterial({ color: WORLD.groundColor })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const roadMat = new THREE.MeshLambertMaterial({ color: WORLD.roadColor });
  const walkMat = new THREE.MeshLambertMaterial({ color: WORLD.sidewalkColor });
  const half = WORLD.half;
  const gap = WORLD.roadGap;
  for (let i = -3; i <= 3; i++) {
    const c = i * gap;
    const roadV = new THREE.Mesh(new THREE.PlaneGeometry(9, WORLD.size), roadMat);
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.set(c, 0.02, 0);
    group.add(roadV);
    const roadH = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 9), roadMat);
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.set(0, 0.02, c);
    group.add(roadH);
    // Sidewalk strips beside each road.
    for (const off of [-6.5, 6.5]) {
      const walkV = new THREE.Mesh(new THREE.PlaneGeometry(3, WORLD.size), walkMat);
      walkV.rotation.x = -Math.PI / 2;
      walkV.position.set(c + off, 0.03, 0);
      group.add(walkV);
      const walkH = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size, 3), walkMat);
      walkH.rotation.x = -Math.PI / 2;
      walkH.position.set(0, 0.03, c + off);
      group.add(walkH);
    }
  }

  // City blocks: buildings fill every block except the two plazas.
  const plazas = [
    { x: 92, z: 92, name: 'Plaza del Sol' },
    { x: -92, z: -92, name: 'Coral Plaza' },
  ];
  const isPlaza = (bx, bz) => plazas.some((p) => Math.abs(bx - p.x) < 46 && Math.abs(bz - p.z) < 46);
  const windowTex = makeWindowTexture();
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      if (gx === 0 || gz === 0) continue;
      const bx = gx * gap;
      const bz = gz * gap;
      if (isPlaza(bx, bz)) continue;
      const count = 1 + Math.floor(rng() * 2);
      for (let k = 0; k < count; k++) {
        const w = 12 + rng() * 14;
        const d = 12 + rng() * 14;
        const h = 9 + rng() * 26;
        const ox = (rng() - 0.5) * (WORLD.blockSize - w);
        const oz = (rng() - 0.5) * (WORLD.blockSize - d);
        const x = bx + ox;
        const z = bz + oz;
        const color = randPick(BUILDING_COLORS);
        // Clone the window texture per building and repeat it to the
        // building's size, so tall buildings show full window rows instead
        // of one stretched strip of glass.
        const tex = windowTex.clone();
        tex.needsUpdate = true;
        tex.repeat.set(Math.max(1, Math.round(w / 10)), Math.max(1, Math.round(h / 14)));
        const mat = new THREE.MeshLambertMaterial({ color, map: tex });
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        b.position.set(x, h / 2, z);
        group.add(b);
        const roof = box(w + 0.6, 0.8, d + 0.6, randPick(ROOF_COLORS), x, h + 0.4, z);
        group.add(roof);
        // Rooftop AC box, for silhouette variety.
        if (rng() > 0.5) {
          group.add(box(3, 1.6, 3, 0x777777, x + w * 0.2, h + 1.6, z - d * 0.2));
        }
        colliders.push({ x, z, hx: w / 2 + 0.4, hz: d / 2 + 0.4 });
      }
    }
  }

  // The two plazas: fountain, palms, benches, open space for chases.
  for (const p of plazas) {
    const plazaMat = new THREE.MeshLambertMaterial({ color: 0xcbb98a });
    const slab = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), plazaMat);
    slab.rotation.x = -Math.PI / 2;
    slab.position.set(p.x, 0.04, p.z);
    group.add(slab);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 7, 1.2, 20),
      new THREE.MeshLambertMaterial({ color: 0x7a8a9a })
    );
    basin.position.set(p.x, 0.6, p.z);
    group.add(basin);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(5.2, 5.2, 0.4, 20),
      new THREE.MeshLambertMaterial({ color: 0x3a9ac4, emissive: 0x0a3a5a })
    );
    water.position.set(p.x, 1.2, p.z);
    group.add(water);
    const jet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 1.1, 3.4, 10),
      new THREE.MeshLambertMaterial({ color: 0x9aaaba })
    );
    jet.position.set(p.x, 2.6, p.z);
    group.add(jet);
    colliders.push({ x: p.x, z: p.z, hx: 7, hz: 7 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = p.x + Math.cos(a) * 20;
      const pz = p.z + Math.sin(a) * 20;
      addPalm(group, px, pz);
      group.add(box(4, 1, 1.4, 0x6a4a2a, p.x + Math.cos(a + 0.5) * 14, 0.5, p.z + Math.sin(a + 0.5) * 14));
    }
  }

  // Palms and streetlights along the boulevards.
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const c = i * gap;
    addPalm(group, c + 12, -8);
    addPalm(group, c - 12, 8);
    addStreetlight(group, c + 8, 24);
    addStreetlight(group, c - 8, -24);
  }

  // The docks at the south edge: the epilogue's boat.
  const dockMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const dock = new THREE.Mesh(new THREE.BoxGeometry(40, 1.5, 12), dockMat);
  dock.position.set(0, 0.75, half - 4);
  group.add(dock);
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(9, 2.4, 3.4),
    new THREE.MeshLambertMaterial({ color: 0xe8e0cc })
  );
  hull.position.y = 1.2;
  boat.add(hull);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(4, 2, 2.6),
    new THREE.MeshLambertMaterial({ color: 0x2a6a8a })
  );
  cabin.position.set(-0.5, 3.2, 0);
  boat.add(cabin);
  // Mast and sail, so the escape boat reads as a boat from the chase cam.
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 5, 8),
    new THREE.MeshLambertMaterial({ color: 0x6a4a2a })
  );
  mast.position.set(1.5, 5, 0);
  boat.add(mast);
  const sail = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 3.4, 2.2),
    new THREE.MeshLambertMaterial({ color: 0xf5e9c8 })
  );
  sail.position.set(1.5, 4.4, 0);
  boat.add(sail);
  boat.position.set(0, 0.4, half + 2);
  group.add(boat);
  colliders.push({ x: 0, z: half - 4, hx: 20, hz: 6 });

  // Lighthouse at the east end of the docks: a night landmark for the
  // epilogue chase, with a glowing lamp the player can spot from anywhere.
  const lighthouse = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 3, 16, 12),
    new THREE.MeshLambertMaterial({ color: 0xe8e0cc })
  );
  tower.position.y = 8;
  lighthouse.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(2.5, 2.5, 2.2, 12),
    new THREE.MeshLambertMaterial({ color: 0xc23a2a })
  );
  band.position.y = 11;
  lighthouse.add(band);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffcc33 })
  );
  lamp.position.y = 17;
  lighthouse.add(lamp);
  lighthouse.position.set(28, 0, half - 6);
  group.add(lighthouse);
  colliders.push({ x: 28, z: half - 6, hx: 3.4, hz: 3.4 });
  addPalm(group, 22, half - 14);
  addPalm(group, 36, half - 16);

  // 12 hidden sunset coins, tucked around the city.
  const coinSpots = [
    [92, 60], [60, 92], [-92, -60], [-60, -92], [138, 0], [-138, 46],
    [0, -138], [46, 138], [-46, -138], [138, -92], [-138, 92], [0, 184],
  ];
  const coinGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.18, 20);
  const coinMat = new THREE.MeshLambertMaterial({ color: 0xffc832, emissive: 0x8a5a00 });
  for (const [x, z] of coinSpots) {
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, 1.1, z);
    coin.userData.spin = rng() * Math.PI * 2;
    group.add(coin);
    coins.push({ mesh: coin, x, z, taken: false });
  }

  // City boundary walls, low and out of the way.
  for (const [x, z, w, d] of [
    [0, -half - 2, WORLD.size + 8, 4], [0, half + 2, WORLD.size + 8, 4],
    [-half - 2, 0, 4, WORLD.size + 8], [half + 2, 0, 4, WORLD.size + 8],
  ]) {
    group.add(box(w, 3, d, 0x8a7a5a, x, 1.5, z));
  }

  scene.add(group);
  return { colliders, coins, plazas, group };
}

function addPalm(group, x, z) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 7, 8),
    new THREE.MeshLambertMaterial({ color: 0x7a5a3a })
  );
  trunk.position.set(x, 3.5, z);
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2a7a3a });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 4), leafMat);
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(x + Math.cos(a) * 1.6, 7.6, z + Math.sin(a) * 1.6);
    leaf.rotation.z = Math.cos(a) * 0.9;
    leaf.rotation.x = -Math.sin(a) * 0.9;
    group.add(leaf);
  }
}

function addStreetlight(group, x, z) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 6, 8),
    new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
  );
  pole.position.set(x, 3, z);
  group.add(pole);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xcc9900 })
  );
  lamp.position.set(x, 6.2, z);
  group.add(lamp);
}

/** Push a circle (player, car, ped) out of every building collider it overlaps. */
export function resolveCollisions(pos, radius, colliders) {
  for (const c of colliders) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const px = c.hx + radius - Math.abs(dx);
    const pz = c.hz + radius - Math.abs(dz);
    if (px > 0 && pz > 0) {
      if (px < pz) pos.x = c.x + Math.sign(dx || 1) * (c.hx + radius);
      else pos.z = c.z + Math.sign(dz || 1) * (c.hz + radius);
    }
  }
}
