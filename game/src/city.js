// Solmar Bay — the city itself: sunset island, road grid, blocky towers with
// lit windows, palm plaza, docks, lighthouse and sea. Built from a seed so a
// screenshot seed always draws the same city.

import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeWindowTexture(baseColor, litRatio, rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = baseColor;
  g.fillRect(0, 0, 128, 256);
  const cols = 4;
  const rows = 10;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = rng() < litRatio;
      g.fillStyle = lit ? '#ffd27a' : '#3a2f28';
      g.fillRect(10 + x * 30, 12 + y * 24, 18, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class City {
  constructor(scene, seed) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    this.buildings = []; // {minX,maxX,minZ,maxZ,h}
    this.parkedSpots = [];
    this.coinSpots = [];
    this.pedSpots = [];
    this.lighthousePos = new THREE.Vector3(-228, 0, 244);
    this.boatPos = new THREE.Vector3(120, 0, 262);
    this.beam = null;
    this.sea = null;
    this.build();
  }

  build() {
    const rng = this.rng;
    const scene = this.scene;
    scene.background = new THREE.Color(PALETTE.sky);
    scene.fog = new THREE.Fog(PALETTE.fog, 120, 520);

    const hemi = new THREE.HemisphereLight(0xffd9a0, 0x8a5a30, 1.1);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc27a, 1.6);
    sun.position.set(120, 180, -80);
    scene.add(sun);

    // Ground slab.
    const ground = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.half * 2 + 80, 2, WORLD.half * 2 + 120),
      new THREE.MeshLambertMaterial({ color: PALETTE.ground }),
    );
    ground.position.set(0, -1, 20);
    scene.add(ground);

    // Sea beyond the docks.
    const sea = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.half * 2 + 400, 1, 220),
      new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
    );
    sea.position.set(0, -0.4, WORLD.seaZ + 90);
    scene.add(sea);
    this.sea = sea;

    // Sand strip at the waterline.
    const sand = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.half * 2 + 80, 0.6, 14),
      new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
    );
    sand.position.set(0, 0.1, WORLD.dockZ + 8);
    scene.add(sand);

    this.buildRoads();
    this.buildPlaza();
    this.buildBlocks();
    this.buildDocks();
    this.buildPalmsAndLamps();
    this.scatterCoinsAndSpots();
  }

  buildRoads() {
    const scene = this.scene;
    const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c9a0 });
    const size = WORLD.half * 2;
    // Roads run between blocks, every 60 units.
    for (let i = -4; i <= 4; i++) {
      const c = i * WORLD.block;
      const vRoad = new THREE.Mesh(new THREE.BoxGeometry(WORLD.roadWidth, 0.3, size), roadMat);
      vRoad.position.set(c, 0.15, 0);
      scene.add(vRoad);
      const hRoad = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, WORLD.roadWidth), roadMat);
      hRoad.position.set(0, 0.15, c);
      scene.add(hRoad);
      // Centre dashes.
      for (let d = -240; d <= 240; d += 24) {
        const dashV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.32, 6), lineMat);
        dashV.position.set(c, 0.32, d);
        scene.add(dashV);
        const dashH = new THREE.Mesh(new THREE.BoxGeometry(6, 0.32, 0.8), lineMat);
        dashH.position.set(d, 0.32, c);
        scene.add(dashH);
      }
    }
  }

  buildPlaza() {
    const scene = this.scene;
    const plaza = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.plazaHalf * 2, 0.5, WORLD.plazaHalf * 2),
      new THREE.MeshLambertMaterial({ color: PALETTE.plaza }),
    );
    plaza.position.set(0, 0.25, 0);
    scene.add(plaza);
    // Fountain: stone ring and a teal pool.
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(9, 10, 1.6, 24),
      new THREE.MeshLambertMaterial({ color: 0x9a8a72 }),
    );
    ring.position.set(0, 0.8, 0);
    scene.add(ring);
    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 0.6, 24),
      new THREE.MeshLambertMaterial({ color: PALETTE.fountain }),
    );
    pool.position.set(0, 1.4, 0);
    scene.add(pool);
    const spout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 1.2, 3, 10),
      new THREE.MeshLambertMaterial({ color: 0x9a8a72 }),
    );
    spout.position.set(0, 2.4, 0);
    scene.add(spout);
    // Benches around the fountain.
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x5a3a22 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 1.6), benchMat);
      bench.position.set(Math.cos(a) * 18, 0.7, Math.sin(a) * 18);
      bench.rotation.y = -a + Math.PI / 2;
      scene.add(bench);
    }
  }

  buildBlocks() {
    const rng = this.rng;
    const scene = this.scene;
    const palette = PALETTE.building;
    const textures = palette.map((c) => {
      const hex = '#' + c.toString(16).padStart(6, '0');
      return makeWindowTexture(hex, 0.45, rng);
    });
    // City blocks: grid positions, skipping the central plaza block (0,0)
    // and the dock row at z = 240..270.
    for (let bx = -4; bx <= 4; bx++) {
      for (let bz = -4; bz <= 3; bz++) {
        if (bx === 0 && bz === 0) continue;
        const cx = bx * WORLD.block;
        const cz = bz * WORLD.block;
        const count = 1 + Math.floor(rng() * 2);
        for (let k = 0; k < count; k++) {
          const w = 16 + rng() * 14;
          const d = 16 + rng() * 14;
          const h = 18 + rng() * 42;
          const ox = (rng() - 0.5) * (WORLD.block - WORLD.roadWidth - w - 4);
          const oz = (rng() - 0.5) * (WORLD.block - WORLD.roadWidth - d - 4);
          const x = cx + ox;
          const z = cz + oz;
          const tex = textures[Math.floor(rng() * textures.length)];
          const mat = new THREE.MeshLambertMaterial({ map: tex });
          const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          tower.position.set(x, h / 2, z);
          scene.add(tower);
          // Flat roof cap.
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(w + 1, 1, d + 1),
            new THREE.MeshLambertMaterial({ color: 0x4a382a }),
          );
          cap.position.set(x, h + 0.5, z);
          scene.add(cap);
          this.buildings.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, h });
        }
      }
    }
  }

  buildDocks() {
    const scene = this.scene;
    // Wooden pier deck along the south edge.
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD.half * 2, 1, 16),
      new THREE.MeshLambertMaterial({ color: 0x7a5a38 }),
    );
    pier.position.set(0, 0.5, WORLD.dockZ);
    scene.add(pier);
    // Lighthouse: tapered tower, gallery and lamp.
    const lh = new THREE.Group();
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 6, 34, 12),
      new THREE.MeshLambertMaterial({ color: PALETTE.lighthouse }),
    );
    tower.position.y = 17;
    lh.add(tower);
    const gallery = new THREE.Mesh(
      new THREE.CylinderGeometry(5.5, 5.5, 2, 12),
      new THREE.MeshLambertMaterial({ color: 0x33302e }),
    );
    gallery.position.y = 35;
    lh.add(gallery);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
    );
    lamp.position.y = 37.5;
    lh.add(lamp);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 5, 60, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(30, 37.5, 0);
    lh.add(beam);
    this.beam = beam;
    lh.position.copy(this.lighthousePos);
    scene.add(lh);
    this.buildings.push({
      minX: this.lighthousePos.x - 6, maxX: this.lighthousePos.x + 6,
      minZ: this.lighthousePos.z - 6, maxZ: this.lighthousePos.z + 6, h: 38,
    });
    // Lila's boat at the docks: hull, mast and sail.
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(10, 2.4, 4),
      new THREE.MeshLambertMaterial({ color: 0x8a2f2f }),
    );
    hull.position.y = 1.2;
    boat.add(hull);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 12, 8),
      new THREE.MeshLambertMaterial({ color: 0x5a3a22 }),
    );
    mast.position.y = 8;
    boat.add(mast);
    const sail = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 9, 4),
      new THREE.MeshLambertMaterial({ color: PALETTE.boatSail }),
    );
    sail.position.set(0, 8, 0);
    sail.rotation.y = Math.PI / 4;
    sail.scale.z = 0.35;
    boat.add(sail);
    boat.position.copy(this.boatPos);
    scene.add(boat);
    this.boat = boat;
    // Objective beacon: a tall golden light pillar at the boat.
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.4, 70, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    beacon.position.set(this.boatPos.x, 35, this.boatPos.z);
    scene.add(beacon);
    this.beacon = beacon;
  }

  buildPalmsAndLamps() {
    const rng = this.rng;
    const scene = this.scene;
    const trunkMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmTrunk });
    const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.palmLeaf });
    const lampMat = new THREE.MeshLambertMaterial({ color: 0x2e2a26 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    // Palms ring the plaza and dot the sidewalks. The ring sits just
    // outside the plaza edge, phased so no palm stands on the camera line
    // behind a player at the fountain's south edge.
    const palmSpots = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.62;
      palmSpots.push([Math.cos(a) * 30, Math.sin(a) * 30]);
    }
    for (let i = 0; i < 26; i++) {
      const bx = Math.floor(rng() * 9 - 4) * WORLD.block;
      const bz = Math.floor(rng() * 8 - 4) * WORLD.block;
      palmSpots.push([bx + (rng() - 0.5) * 30, bz + (rng() - 0.5) * 30]);
    }
    for (const [x, z] of palmSpots) {
      if (Math.abs(x) < 12 && Math.abs(z) < 12) continue;
      if (this.hitsBuilding(x, z, 2)) continue;
      const palm = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 8, 8), trunkMat);
      trunk.position.y = 4;
      palm.add(trunk);
      for (let l = 0; l < 6; l++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6, 6, 4), leafMat);
        const a = (l / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(a) * 2.2, 8.6, Math.sin(a) * 2.2);
        leaf.rotation.z = Math.cos(a) * 1.1;
        leaf.rotation.x = -Math.sin(a) * 1.1;
        palm.add(leaf);
      }
      palm.position.set(x, 0, z);
      scene.add(palm);
    }
    // Street lamps along the roads.
    for (let i = -4; i <= 4; i++) {
      for (const d of [-180, -60, 60, 180]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 7, 6), lampMat);
        pole.position.set(i * WORLD.block + 9, 3.5, d);
        scene.add(pole);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), bulbMat);
        bulb.position.set(i * WORLD.block + 9, 7.2, d);
        scene.add(bulb);
      }
    }
  }

  scatterCoinsAndSpots() {
    const rng = this.rng;
    // 12 sunset coins: spread across plaza, roads and docks.
    const coinPlaces = [
      [12, 12], [-14, 8], [0, -24], [60, -60], [-60, 60], [120, 0],
      [-120, -120], [180, 120], [-180, 180], [60, 180], [-60, -180], [150, 240],
    ];
    for (const [x, z] of coinPlaces) this.coinSpots.push(new THREE.Vector3(x, 1.2, z));
    // 28 parked cars: along road edges, two per roadside slot.
    let guard = 0;
    while (this.parkedSpots.length < 28 && guard < 500) {
      guard += 1;
      const horizontal = rng() < 0.5;
      const road = Math.floor(rng() * 9 - 4) * WORLD.block;
      const along = Math.floor(rng() * 9 - 4) * WORLD.block + (rng() - 0.5) * 30;
      const x = horizontal ? along : road + 10;
      const z = horizontal ? road + 10 : along;
      if (Math.abs(x) < 40 && Math.abs(z) < 40) continue;
      if (this.hitsBuilding(x, z, 3)) continue;
      if (this.parkedSpots.some((p) => Math.hypot(p.x - x, p.z - z) < 9)) continue;
      this.parkedSpots.push({ x, z, angle: horizontal ? 0 : Math.PI / 2 });
    }
    // Pedestrian spawn points on sidewalks near the plaza and roads.
    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2;
      const r = 20 + rng() * 180;
      this.pedSpots.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r * 0.8));
    }
  }

  hitsBuilding(x, z, pad) {
    for (const b of this.buildings) {
      if (x > b.minX - pad && x < b.maxX + pad && z > b.minZ - pad && z < b.maxZ + pad) return true;
    }
    return false;
  }

  // Resolve a circle (player, car, ped) against building AABBs.
  collideCircle(pos, radius) {
    for (const b of this.buildings) {
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        const d = Math.sqrt(d2) || 0.001;
        const push = (radius - d) / d;
        pos.x += dx * push;
        pos.z += dz * push;
      }
    }
    // Island bounds.
    const lim = WORLD.half - 2;
    pos.x = Math.max(-lim, Math.min(lim, pos.x));
    pos.z = Math.max(-lim, Math.min(lim, pos.z));
  }

  update(dt, time) {
    if (this.beam) this.beam.rotation.y = time * 0.4;
    if (this.sea) this.sea.position.y = -0.4 + Math.sin(time * 0.8) * 0.15;
    if (this.boat) {
      this.boat.position.y = Math.sin(time * 0.9) * 0.25;
      this.boat.rotation.z = Math.sin(time * 0.6) * 0.03;
    }
  }
}
