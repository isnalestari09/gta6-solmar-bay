// Solmar Bay — the city. One job: build the whole static world from a seed:
// ground, road grid, buildings, palms, two plazas, docks, lighthouse, boat,
// benches and the 12 hidden sunset coins. Also owns the collision boxes.
import * as THREE from 'three';
import { WORLD, COLORS, COIN_SPOTS } from './config.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function facadeTexture(rand, litRatio) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#8a5a3b';
  g.fillRect(0, 0, 128, 256);
  g.fillStyle = '#7a4e33';
  g.fillRect(0, 0, 128, 10);
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 4; col++) {
      const lit = rand() < litRatio;
      g.fillStyle = lit ? '#ffd27a' : '#3a2a22';
      g.fillRect(12 + col * 28, 22 + row * 28, 18, 18);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class City {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.rand = mulberry32(seed);
    this.group = new THREE.Group();
    this.colliders = []; // { minX, maxX, minZ, maxZ }
    this.circles = []; // { x, z, r }
    this.coins = []; // { mesh, taken, x, z }
    this.coinMeshes = [];
    this.beam = null;
    this.build();
    scene.add(this.group);
  }

  box(w, h, d, color, x, y, z, opts = {}) {
    const mat = opts.material || new THREE.MeshLambertMaterial({ color });
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    m.castShadow = false;
    this.group.add(m);
    return m;
  }

  build() {
    const rand = this.rand;
    // --- ground, sea and sky handled by the renderer; ground plane here.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.half * 2 + 80, WORLD.half * 2 + 80),
      new THREE.MeshLambertMaterial({ color: COLORS.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 10);
    this.group.add(ground);

    // Sea: a flat blue plane north of the docks.
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(520, 90),
      new THREE.MeshLambertMaterial({ color: COLORS.water }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.05, WORLD.waterZ - 40);
    this.group.add(sea);

    // Sandy beach strip between the road and the water.
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(440, 22),
      new THREE.MeshLambertMaterial({ color: COLORS.sand }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.02, WORLD.dockZ - 6);
    this.group.add(sand);

    this.buildRoads();
    this.buildBuildings();
    this.buildPlaza(0, 0, 26);
    this.buildPlaza(90, 90, 16);
    this.buildDocks();
    this.buildPalms();
    this.buildBenches();
    this.buildCoins();
  }

  buildRoads() {
    const roadMat = new THREE.MeshLambertMaterial({ color: COLORS.road });
    const dashMat = new THREE.MeshLambertMaterial({ color: COLORS.roadLine });
    const span = WORLD.half * 2;
    for (const line of WORLD.roadLines) {
      // North-south road.
      const ns = new THREE.Mesh(new THREE.PlaneGeometry(10, span), roadMat);
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(line, 0.03, 0);
      this.group.add(ns);
      // East-west road.
      const ew = new THREE.Mesh(new THREE.PlaneGeometry(span, 10), roadMat);
      ew.rotation.x = -Math.PI / 2;
      ew.position.set(0, 0.03, line);
      this.group.add(ew);
      // Centre dashes.
      for (let d = -180; d <= 180; d += 16) {
        if (Math.abs(d - line) < 9) continue;
        const dashNS = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 4), dashMat);
        dashNS.position.set(line, 0.06, d);
        this.group.add(dashNS);
        const dashEW = new THREE.Mesh(new THREE.BoxGeometry(4, 0.06, 0.5), dashMat);
        dashEW.position.set(d, 0.06, line);
        this.group.add(dashEW);
      }
    }
  }

  buildBuildings() {
    const rand = this.rand;
    const texA = facadeTexture(rand, 0.45);
    const texB = facadeTexture(rand, 0.3);
    const texC = facadeTexture(rand, 0.6);
    const texs = [texA, texB, texC];
    const edges = [-200, -125, -115, -65, -55, -5, 5, 55, 65, 115, 125, 200];
    // Blocks are the gaps between road corridors; skip the plaza blocks.
    for (let i = 0; i < edges.length - 1; i += 2) {
      const x0 = edges[i];
      const x1 = edges[i + 1];
      for (let j = 0; j < edges.length - 1; j += 2) {
      const z0 = edges[j];
      const z1 = edges[j + 1];
      // Keep the central plaza and the second plaza clear.
      if (x0 >= -30 && x1 <= 30 && z0 >= -30 && z1 <= 30) continue;
      if (x0 >= 70 && x1 <= 115 && z0 >= 70 && z1 <= 115) continue;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const w = (x1 - x0) * (0.55 + rand() * 0.2);
      const d = (z1 - z0) * (0.55 + rand() * 0.2);
      const h = 12 + rand() * 20;
      const mat = new THREE.MeshLambertMaterial({ map: texs[Math.floor(rand() * 3)] });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(cx, h / 2, cz);
      this.group.add(b);
      // Roof cap.
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
        new THREE.MeshLambertMaterial({ color: COLORS.buildingRoof }),
      );
      roof.position.set(cx, h + 0.4, cz);
      this.group.add(roof);
      this.colliders.push({
        minX: cx - w / 2, maxX: cx + w / 2,
        minZ: cz - d / 2, maxZ: cz + d / 2,
      });
      }
    }
  }

  buildPlaza(cx, cz, r) {
    // Circular paved plaza with a fountain in the middle.
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.3, 28),
      new THREE.MeshLambertMaterial({ color: 0xc9a06a }),
    );
    disc.position.set(cx, 0.15, cz);
    this.group.add(disc);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.42, r * 0.46, 1.2, 24),
      new THREE.MeshLambertMaterial({ color: 0x9c8a76 }),
    );
    basin.position.set(cx, 0.6, cz);
    this.group.add(basin);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.38, r * 0.38, 0.2, 24),
      new THREE.MeshLambertMaterial({ color: 0x3f9db5 }),
    );
    water.position.set(cx, 1.16, cz); // sits just above the basin rim, no z-fight
    this.group.add(water);
    const column = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.6, 3.4, 12),
      new THREE.MeshLambertMaterial({ color: 0x8a7a68 }),
    );
    column.position.set(cx, 1.7, cz);
    this.group.add(column);
    this.circles.push({ x: cx, z: cz, r: r * 0.46 });
  }

  buildDocks() {
    // Wooden pier running out into the sea, lighthouse at its end, boat moored.
    const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
    for (let z = WORLD.dockZ; z >= -232; z -= 4) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 3.6), pierMat);
      plank.position.set(0, 0.5, z);
      this.group.add(plank);
    }
    // Pier posts.
    for (const x of [-6, 6]) {
      for (let z = WORLD.dockZ; z >= -230; z -= 12) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.4, 0.4, 2.2, 8),
          new THREE.MeshLambertMaterial({ color: 0x5a4028 }),
        );
        post.position.set(x, 0.4, z);
        this.group.add(post);
      }
    }
    // Lighthouse: striped tower on a rock base at the pier's end.
    const rock = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 9, 3, 10),
      new THREE.MeshLambertMaterial({ color: 0x6a6a6a }),
    );
    rock.position.set(14, 1.5, -228);
    this.group.add(rock);
    const stripeA = new THREE.MeshLambertMaterial({ color: 0xf2ead8 });
    const stripeB = new THREE.MeshLambertMaterial({ color: 0xd94f3d });
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(2.6 - i * 0.18, 2.8 - i * 0.18, 4.4, 12),
        i % 2 === 0 ? stripeA : stripeB,
      );
      seg.position.set(14, 4.5 + i * 4.4, -228);
      this.group.add(seg);
    }
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 2.4, 10),
      new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffd76a }),
    );
    lamp.position.set(14, 27.5, -228);
    this.group.add(lamp);
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 2, 10),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    cap.position.set(14, 29.8, -228);
    this.group.add(cap);
    // Rotating light beam.
    const beamGeo = new THREE.ConeGeometry(6, 46, 12, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.beam = new THREE.Mesh(beamGeo, beamMat);
    this.beam.position.set(14, 27.5, -228);
    this.beam.rotation.z = Math.PI / 2;
    this.group.add(this.beam);
    this.circles.push({ x: 14, z: -228, r: 8 });

    // The escape boat, moored beside the pier.
    const hull = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.6, 14),
      new THREE.MeshLambertMaterial({ color: 0xead9b0 }),
    );
    hull.position.set(-12, 0.8, -216);
    this.group.add(hull);
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 11, 8),
      new THREE.MeshLambertMaterial({ color: 0x6b4a2a }),
    );
    mast.position.set(-12, 6, -216);
    this.group.add(mast);
    const sailShape = new THREE.Shape();
    sailShape.moveTo(0, 0);
    sailShape.lineTo(0, 9);
    sailShape.lineTo(6.5, 0);
    sailShape.closePath();
    const sail = new THREE.Mesh(
      new THREE.ShapeGeometry(sailShape),
      new THREE.MeshLambertMaterial({ color: 0xfff6e0, side: THREE.DoubleSide }),
    );
    sail.position.set(-11.7, 2, -216);
    this.group.add(sail);
    // Golden beacon column marking the boat for mission 8.
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 40, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd21f, transparent: true, opacity: 0.25, side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    beacon.position.set(-12, 20, -216);
    this.group.add(beacon);
  }

  buildPalms() {
    const rand = this.rand;
    const trunkMat = new THREE.MeshLambertMaterial({ color: COLORS.palmTrunk });
    const leafMat = new THREE.MeshLambertMaterial({ color: COLORS.palmLeaf });
    const spots = [];
    for (let i = 0; i < 46; i++) {
      const onRoadX = rand() < 0.5;
      const line = WORLD.roadLines[Math.floor(rand() * WORLD.roadLines.length)];
      const along = -180 + rand() * 360;
      const x = onRoadX ? line + (rand() < 0.5 ? -8 : 8) : along;
      const z = onRoadX ? along : line + (rand() < 0.5 ? -8 : 8);
      if (Math.abs(x) < 32 && Math.abs(z) < 32) continue; // keep plaza clear
      if (z < WORLD.dockZ + 4) continue;
      spots.push({ x, z });
    }
    for (const s of spots) {
      const h = 5 + rand() * 3;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, h, 7), trunkMat);
      trunk.position.set(s.x, h / 2, s.z);
      trunk.rotation.z = (rand() - 0.5) * 0.14;
      this.group.add(trunk);
      for (let l = 0; l < 5; l++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), leafMat);
        const a = (l / 5) * Math.PI * 2 + rand() * 0.4;
        leaf.position.set(s.x + Math.cos(a) * 1.6, h + 0.6, s.z + Math.sin(a) * 1.6);
        leaf.rotation.z = Math.cos(a) * 1.1;
        leaf.rotation.x = -Math.sin(a) * 1.1;
        this.group.add(leaf);
      }
      this.circles.push({ x: s.x, z: s.z, r: 0.7 });
    }
  }

  buildBenches() {
    const rand = this.rand;
    const wood = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
    for (let i = 0; i < 10; i++) {
      const plaza = rand() < 0.6 ? { x: 0, z: 0, r: 26 } : { x: 90, z: 90, r: 16 };
      const a = rand() * Math.PI * 2;
      const x = plaza.x + Math.cos(a) * plaza.r * 0.8;
      const z = plaza.z + Math.sin(a) * plaza.r * 0.8;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.35, 1.1), wood);
      bench.position.set(x, 0.7, z);
      bench.rotation.y = a + Math.PI / 2;
      this.group.add(bench);
      this.circles.push({ x, z, r: 1.2 });
    }
  }

  buildCoins() {
    const rand = this.rand;
    const geo = new THREE.IcosahedronGeometry(0.9, 0);
    const mat = new THREE.MeshLambertMaterial({ color: COLORS.coin, emissive: 0xa88200 });
    for (let i = 0; i < COIN_SPOTS; i++) {
      let x = 0;
      let z = 0;
      let tries = 0;
      do {
        x = -180 + rand() * 360;
        z = -170 + rand() * 350;
        tries++;
      } while (tries < 20 && this.insideBuilding(x, z));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 1.4, z);
      this.group.add(mesh);
      this.coins.push({ mesh, taken: false, x, z });
      this.coinMeshes.push(mesh);
    }
  }

  insideBuilding(x, z) {
    for (const c of this.colliders) {
      if (x > c.minX - 1 && x < c.maxX + 1 && z > c.minZ - 1 && z < c.maxZ + 1) return true;
    }
    return false;
  }

  // Push a circle (player, car, ped) out of building AABBs and round colliders.
  resolveCollision(x, z, radius) {
    for (const c of this.colliders) {
      const nx = Math.max(c.minX, Math.min(x, c.maxX));
      const nz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - nx;
      const dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          x = nx + (dx / d) * radius;
          z = nz + (dz / d) * radius;
        } else {
          // Inside the box: shove out along the smallest penetration axis.
          const pl = x - c.minX;
          const pr = c.maxX - x;
          const pt = z - c.minZ;
          const pb = c.maxZ - z;
          const m = Math.min(pl, pr, pt, pb);
          if (m === pl) x = c.minX - radius;
          else if (m === pr) x = c.maxX + radius;
          else if (m === pt) z = c.minZ - radius;
          else z = c.maxZ + radius;
        }
      }
    }
    for (const c of this.circles) {
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + radius;
      if (d < min && d > 1e-6) {
        x = c.x + (dx / d) * min;
        z = c.z + (dz / d) * min;
      }
    }
    // World bounds.
    x = Math.max(-WORLD.half, Math.min(WORLD.half, x));
    z = Math.max(-232, Math.min(WORLD.half, z));
    return { x, z };
  }

  update(dt, time) {
    for (const coin of this.coins) {
      if (coin.taken) continue;
      coin.mesh.rotation.y += dt * 2.4;
      coin.mesh.position.y = 1.4 + Math.sin(time * 2 + coin.x) * 0.25;
    }
    if (this.beam) this.beam.rotation.y = time * 0.5;
  }
}
