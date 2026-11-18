// Solmar Bay itself: ground, road grid, buildings with colliders, the plaza
// with its fountain, the beach, palm trees and the sunset-coin spots.
// Everything is built from the seeded RNG, so the city is identical every run.

import * as THREE from 'three';
import { WORLD, mulberry32, pick } from './config.js';

const BUILDING_COLORS = [0xd8c9a3, 0xc9b18c, 0xe0d6c0, 0xbfae8e, 0xd2b48c, 0xcdbfa5];
const ROOF_COLORS = [0x9a6b4f, 0x7d8a99, 0x8a5a44, 0x6b7f7a];

export class City {
  constructor(scene, seed = 1) {
    this.scene = scene;
    this.rng = mulberry32(seed);
    // Colliders: { minX, maxX, minZ, maxZ } — circles slide along them.
    this.colliders = [];
    this.coinSpots = [];
    this.parkedSpots = [];   // { x, z, angle } where stealable cars sit
    this.pedSpawns = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this._ground();
    this._roads();
    this._buildings();
    this._plaza();
    this._plaza2(); // revision 2: second plaza in the north-east
    this._beach();
    this._palms();
    this._coins();
  }

  _ground() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.size * 1.6, WORLD.size * 1.6),
      new THREE.MeshLambertMaterial({ color: 0x7da05c }),
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.05;
    this.group.add(g);
    // Sand strip along the south edge (the beach).
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.size * 1.6, 46),
      new THREE.MeshLambertMaterial({ color: 0xe6d3a3 }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.0, WORLD.wall + 18);
    this.group.add(sand);
    // The sea beyond the beach.
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.size * 1.6, 120),
      new THREE.MeshLambertMaterial({ color: 0x2e7f9e }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, -0.4, WORLD.wall + 100);
    this.group.add(sea);
  }

  _roads() {
    const mat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
    for (let c = -180; c <= 180; c += WORLD.roadGap) {
      for (const [w, l, x, z] of [
        [WORLD.roadWidth, WORLD.size, c, 0],
        [WORLD.size, WORLD.roadWidth, 0, c],
      ]) {
        const road = new THREE.Mesh(new THREE.PlaneGeometry(w, l), mat);
        road.rotation.x = -Math.PI / 2;
        road.position.set(x, 0.02, z);
        this.group.add(road);
      }
      // Centre dashes.
      for (let d = -180; d <= 180; d += 16) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 5), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(c, 0.04, d);
        this.group.add(dash);
      }
    }
  }

  _building(x, z, w, d, h, color) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    mesh.position.set(x, h / 2, z);
    this.group.add(mesh);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
      new THREE.MeshLambertMaterial({ color: pick(this.rng, ROOF_COLORS) }),
    );
    roof.position.set(x, h + 0.25, z);
    this.group.add(roof);
    // Lit windows on the two long faces.
    const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
    for (let i = 0; i < Math.floor(w / 6); i++) {
      for (let j = 0; j < Math.floor(h / 5); j++) {
        if (this.rng() < 0.45) continue;
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.8), winMat);
        win.position.set(x - w / 2 + 3 + i * 6, 3 + j * 5, z + d / 2 + 0.06);
        this.group.add(win);
      }
    }
    this.colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  _buildings() {
    // One building per city block (blocks sit between the roads).
    for (let bx = -150; bx <= 150; bx += WORLD.roadGap) {
      for (let bz = -150; bz <= 150; bz += WORLD.roadGap) {
        if (bx === 0 && bz === 0) continue; // the plaza stays open
        if (bx === 90 && bz === 90) continue; // the second plaza stays open
        if (bx === 150 && bz === -150) continue; // Coral Kings compound yard
        const w = 22 + this.rng() * 14;
        const d = 22 + this.rng() * 14;
        const h = 8 + this.rng() * 22;
        this._building(bx, bz, w, d, h, pick(this.rng, BUILDING_COLORS));
      }
    }
    // The Coral Kings compound: a tall dark tower in the south-east.
    this._building(150, -150, 34, 34, 42, 0x5a2e3a);
    // Warehouse in the north-west.
    this._building(-150, 150, 40, 26, 10, 0x8a7a5a);
  }

  _plaza() {
    // Central plaza: circular paving + a fountain at the very centre.
    const paving = new THREE.Mesh(
      new THREE.CircleGeometry(26, 32),
      new THREE.MeshLambertMaterial({ color: 0xcbb98f }),
    );
    paving.rotation.x = -Math.PI / 2;
    paving.position.set(0, 0.03, 0);
    this.group.add(paving);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6.5, 1.2, 24),
      new THREE.MeshLambertMaterial({ color: 0x9aa5a8 }),
    );
    basin.position.set(0, 0.6, 0);
    this.group.add(basin);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 24),
      new THREE.MeshLambertMaterial({ color: 0x4fb3d8 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 1.25, 0);
    this.group.add(water);
    const jet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 3, 12),
      new THREE.MeshLambertMaterial({ color: 0xcfd8dc }),
    );
    jet.position.set(0, 2.4, 0);
    this.group.add(jet);
    this.colliders.push({ minX: -6.5, maxX: 6.5, minZ: -6.5, maxZ: 6.5 });
    // Benches around the plaza.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.6, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
      );
      bench.position.set(Math.cos(a) * 16, 0.3, Math.sin(a) * 16);
      bench.rotation.y = -a;
      this.group.add(bench);
    }
  }

  _plaza2() {
    // Second plaza (north-east, 90, 90): smaller paving circle, a low
    // fountain and benches — the epilogue mission's rendezvous point.
    const paving = new THREE.Mesh(
      new THREE.CircleGeometry(18, 28),
      new THREE.MeshLambertMaterial({ color: 0xc2b184 }),
    );
    paving.rotation.x = -Math.PI / 2;
    paving.position.set(90, 0.03, 90);
    this.group.add(paving);
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(3.5, 4, 1, 20),
      new THREE.MeshLambertMaterial({ color: 0x9aa5a8 }),
    );
    basin.position.set(90, 0.5, 90);
    this.group.add(basin);
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(3, 20),
      new THREE.MeshLambertMaterial({ color: 0x4fb3d8 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.set(90, 1.05, 90);
    this.group.add(water);
    this.colliders.push({ minX: 86, maxX: 94, minZ: 86, maxZ: 94 });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const bench = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 0.6, 1.1),
        new THREE.MeshLambertMaterial({ color: 0x7a5a3a }),
      );
      bench.position.set(90 + Math.cos(a) * 11, 0.3, 90 + Math.sin(a) * 11);
      bench.rotation.y = -a;
      this.group.add(bench);
    }
  }

  _beach() {
    // Umbrellas and a lifeguard tower on the sand.
    for (let i = 0; i < 5; i++) {
      const x = -140 + i * 70;
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3, 8),
        new THREE.MeshLambertMaterial({ color: 0xdddddd }),
      );
      pole.position.set(x, 1.5, WORLD.wall + 12);
      this.group.add(pole);
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(3, 1.4, 10),
        new THREE.MeshLambertMaterial({ color: i % 2 ? 0xe2574c : 0x3f8fbf }),
      );
      top.position.set(x, 3.4, WORLD.wall + 12);
      this.group.add(top);
    }
  }

  _palms() {
    for (let i = 0; i < 26; i++) {
      const x = -190 + this.rng() * 380;
      const z = this.rng() < 0.5 ? WORLD.wall + 6 + this.rng() * 20 : -190 + this.rng() * 380;
      if (Math.abs(x % WORLD.roadGap) < 9 || Math.abs(z % WORLD.roadGap) < 9) continue;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.45, 6, 8),
        new THREE.MeshLambertMaterial({ color: 0x8a6b4a }),
      );
      trunk.position.set(x, 3, z);
      trunk.rotation.z = (this.rng() - 0.5) * 0.2;
      this.group.add(trunk);
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x3f8f3a }),
      );
      crown.position.set(x, 6.4, z);
      crown.scale.y = 0.5;
      this.group.add(crown);
    }
  }

  _coins() {
    // 12 sunset coins at reachable landmarks: road intersections, the plaza
    // and the beach — never inside a building collider.
    const spots = [
      [-180, -150], [180, -150], [-180, 150], [180, 150],
      [0, 26], [-90, 60], [90, -60], [-60, -90],
      [60, 90], [-180, 180], [180, 180], [0, -180],
    ];
    for (const [x, z] of spots) this.coinSpots.push({ x, z });
    // Parked cars line the roads; traffic lanes are separate.
    // Revision 2: two extra cars parked by the second plaza (28 total).
    this.parkedSpots.push({ x: 78, z: 97, angle: Math.PI / 2 });
    this.parkedSpots.push({ x: 102, z: 83, angle: -Math.PI / 2 });
    for (let i = 0; i < 26; i++) {
      const alongRoad = (i % 2 === 0);
      const lane = -180 + Math.floor(i / 2) * 30;
      const pos = -170 + this.rng() * 340;
      const spot = alongRoad
        ? { x: lane + 7, z: pos, angle: 0 }
        : { x: pos, z: lane + 7, angle: Math.PI / 2 };
      if (Math.abs(spot.x) < 12 && Math.abs(spot.z) < 12) continue; // keep plaza clear
      this.parkedSpots.push(spot);
    }
    for (let i = 0; i < 26; i++) {
      this.pedSpawns.push({
        x: -180 + this.rng() * 360,
        z: -180 + this.rng() * 360,
      });
    }
  }

  // --- collision --------------------------------------------------------
  // Push a circle (x, z, radius) out of every AABB it overlaps. Returns
  // true when a push happened (used for crash sounds / damage).
  resolveCircle(pos, radius) {
    let hit = false;
    for (const c of this.colliders) {
      const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        hit = true;
        if (d2 > 1e-6) {
          const d = Math.sqrt(d2);
          pos.x = cx + (dx / d) * radius;
          pos.z = cz + (dz / d) * radius;
        } else {
          // Centre inside the box: push out along the smallest axis.
          const pushL = pos.x - c.minX + radius;
          const pushR = c.maxX - pos.x + radius;
          const pushT = pos.z - c.minZ + radius;
          const pushB = c.maxZ - pos.z + radius;
          const m = Math.min(pushL, pushR, pushT, pushB);
          if (m === pushL) pos.x = c.minX - radius;
          else if (m === pushR) pos.x = c.maxX + radius;
          else if (m === pushT) pos.z = c.minZ - radius;
          else pos.z = c.maxZ + radius;
        }
      }
    }
    // World bounds.
    pos.x = Math.max(-WORLD.wall, Math.min(WORLD.wall, pos.x));
    pos.z = Math.max(-WORLD.wall, Math.min(WORLD.wall, pos.z));
    return hit;
  }

  // Is a point at a road intersection (both axes on a road)? Pedestrians
  // use this to wait at the kerb, then cross straight.
  atIntersection(x, z) {
    const near = (v) => Math.abs(((v + 30) % WORLD.roadGap) - 30) < WORLD.roadWidth / 2 + 2;
    return near(x) && near(z);
  }

  // Is a point on a road (used to keep traffic on the asphalt)?
  onRoad(x, z) {
    const near = (v) => Math.abs(((v + 30) % WORLD.roadGap) - 30) < WORLD.roadWidth / 2 + 2;
    return near(x) || near(z);
  }
}
