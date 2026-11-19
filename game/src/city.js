// The city itself: a 5x5 road grid, buildings with box colliders, two
// plazas with fountains, a beach and sea at the south edge, palm trees,
// and the sunset coins. Everything is built from boxes and cylinders.

import * as THREE from 'three';
import { WORLD, ROADS, PALETTE, COINS, mulberry32 } from './config.js';

export class City {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // {x, z, half} axis-aligned boxes
    this.coins = [];
    this._buildGround(scene);
    this._buildRoads(scene);
    this._buildBuildings(scene);
    this._buildPlazas(scene);
    this._buildBeach(scene);
    this._buildCoins(scene);
  }

  _box(w, h, d, color, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshLambertMaterial({ color }),
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    return mesh;
  }

  _buildGround(scene) {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.half * 2 + 120, WORLD.half * 2 + 120),
      new THREE.MeshLambertMaterial({ color: PALETTE.grass }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, 40);
    scene.add(ground);
  }

  _buildRoads(scene) {
    const mat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
    for (const r of ROADS) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.roadWidth), mat);
      h.rotation.x = -Math.PI / 2; h.position.set(0, 0.02, r); scene.add(h);
      const v = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadWidth, WORLD.half * 2), mat);
      v.rotation.x = -Math.PI / 2; v.position.set(r, 0.02, 0); scene.add(v);
    }
    // Dashes down the middle of each road.
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5e9c8 });
    for (const r of ROADS) {
      for (let d = -180; d <= 180; d += 20) {
        const dh = new THREE.Mesh(new THREE.PlaneGeometry(6, 0.6), dashMat);
        dh.rotation.x = -Math.PI / 2; dh.position.set(d, 0.04, r); scene.add(dh);
        const dv = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 6), dashMat);
        dv.rotation.x = -Math.PI / 2; dv.position.set(r, 0.04, d); scene.add(dv);
      }
    }
  }

  _buildBuildings(scene) {
    const rng = mulberry32(20261119);
    const colors = [PALETTE.buildingA, PALETTE.buildingB, PALETTE.buildingC, PALETTE.buildingD];
    // Blocks are the squares between roads; skip the two plaza blocks.
    const plazaBlocks = new Set(['-120,-120', '120,120']);
    for (const bx of [-160, -80, 0, 80, 160]) {
      for (const bz of [-160, -80, 0, 80, 160]) {
        const cx = bx - 40, cz = bz - 40;
        if (plazaBlocks.has(`${cx},${cz}`)) continue;
        const w = 22 + rng() * 18, d = 22 + rng() * 18, h = 10 + rng() * 26;
        const color = colors[Math.floor(rng() * colors.length)];
        this._box(w, h, d, color, cx, h / 2, cz);
        // Roof rim so buildings read at a distance.
        this._box(w + 1, 1, d + 1, 0x5a4a38, cx, h + 0.5, cz);
        // Windows as a thin emissive strip on two faces.
        const win = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.7, h * 0.5, 0.3),
          new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
        );
        win.position.set(cx, h * 0.55, cz + d / 2 + 0.2);
        scene.add(win);
        this.colliders.push({ x: cx, z: cz, half: Math.max(w, d) / 2 + 1 });
      }
    }
  }

  _buildPlazas(scene) {
    for (const [px, pz] of [[-120, -120], [120, 120]]) {
      const slab = new THREE.Mesh(
        new THREE.CylinderGeometry(26, 26, 0.4, 24),
        new THREE.MeshLambertMaterial({ color: PALETTE.plaza }),
      );
      slab.position.set(px, 0.2, pz);
      scene.add(slab);
      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(7, 7, 1.2, 20),
        new THREE.MeshLambertMaterial({ color: 0x4db2e8 }),
      );
      water.position.set(px, 0.8, pz);
      scene.add(water);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(7, 0.8, 8, 20),
        new THREE.MeshLambertMaterial({ color: 0xcfc8b8 }),
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(px, 1.4, pz);
      scene.add(rim);
      // Benches around the fountain.
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        this._box(5, 1, 1.5, 0x6b4a2f, px + Math.cos(a) * 16, 0.5, pz + Math.sin(a) * 16);
      }
      this.colliders.push({ x: px, z: pz, half: 7.5 });
    }
  }

  _buildBeach(scene) {
    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.half * 2 + 120, 60),
      new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(0, 0.03, WORLD.beachZ + 20);
    scene.add(sand);
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.half * 2 + 120, 80),
      new THREE.MeshLambertMaterial({ color: PALETTE.sea }),
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.05, WORLD.seaZ + 30);
    scene.add(sea);
    // Palm trees along the beach.
    const rng = mulberry32(77);
    for (let i = 0; i < 14; i++) {
      const x = -190 + i * 28 + rng() * 8;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.8, 9, 6),
        new THREE.MeshLambertMaterial({ color: 0x7a5230 }),
      );
      trunk.position.set(x, 4.5, WORLD.beachZ + 4 + rng() * 6);
      scene.add(trunk);
      const top = new THREE.Mesh(
        new THREE.SphereGeometry(3.2, 8, 6),
        new THREE.MeshLambertMaterial({ color: 0x2f7a3a }),
      );
      top.position.set(x, 9.5, WORLD.beachZ + 4);
      scene.add(top);
    }
  }

  _buildCoins(scene) {
    for (const [x, z] of COINS) {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 0.35, 16),
        new THREE.MeshBasicMaterial({ color: 0xffc93c }),
      );
      coin.rotation.x = Math.PI / 2;
      coin.position.set(x, 1.2, z);
      scene.add(coin);
      this.coins.push({ mesh: coin, x, z, taken: false });
    }
  }

  // True when the point (x,z) is inside any building/plaza collider.
  blocked(x, z, radius = 1) {
    for (const c of this.colliders) {
      if (Math.abs(x - c.x) < c.half + radius && Math.abs(z - c.z) < c.half + radius) return true;
    }
    return false;
  }

  // Push a point out of colliders; returns true if anything was hit.
  resolve(x, z, radius = 1) {
    let hit = false;
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z;
      const ox = c.half + radius - Math.abs(dx);
      const oz = c.half + radius - Math.abs(dz);
      if (ox > 0 && oz > 0) {
        hit = true;
        if (ox < oz) x = c.x + Math.sign(dx || 1) * (c.half + radius);
        else z = c.z + Math.sign(dz || 1) * (c.half + radius);
      }
    }
    return { x, z, hit };
  }

  nearestRoad(v) {
    let best = ROADS[0];
    for (const r of ROADS) if (Math.abs(v - r) < Math.abs(v - best)) best = r;
    return best;
  }

  atIntersection(x, z) {
    return Math.abs(x - this.nearestRoad(x)) < 8 && Math.abs(z - this.nearestRoad(z)) < 8;
  }
}
