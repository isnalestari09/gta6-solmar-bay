// missions.js — the seven-mission story of Solmar Bay. The engine walks each
// mission's objectives in order, shows a beacon and a compass arrow, pays the
// reward, and unlocks the next chapter. Side jobs (fares, coins) live here too.

import * as THREE from '../vendor/three.module.min.js';
import { MISSIONS, COIN_SPOTS } from './config.js';

export function createMissionEngine(scene, onEvent) {
  const beaconGeo = new THREE.CylinderGeometry(2.2, 2.2, 30, 12, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xffd166, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.visible = false;
  scene.add(beacon);
  const markerGeo = new THREE.SphereGeometry(1.1, 12, 8);
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const marker = new THREE.Mesh(markerGeo, markerMat);
  marker.visible = false;
  scene.add(marker);

  const engine = {
    index: 0,
    objectiveIndex: 0,
    kills: 0,
    active: false,
    beacon,
    marker,
    coins: 0,
    coinMeshes: [],
    start() {
      this.index = 0;
      this.objectiveIndex = 0;
      this.kills = 0;
      this.active = true;
      this.showObjective();
      onEvent('mission', `Mission 1 — ${MISSIONS[0].title}: ${MISSIONS[0].brief}`);
    },
    get mission() { return MISSIONS[this.index]; },
    get objective() { return this.mission?.objectives[this.objectiveIndex]; },
    get done() { return this.index >= MISSIONS.length; },
    showObjective() {
      const o = this.objective;
      if (!o) { beacon.visible = false; marker.visible = false; return; }
      if (o.x !== undefined && o.z !== undefined) {
        beacon.position.set(o.x, 15, o.z);
        marker.position.set(o.x, 1.2, o.z);
        beacon.visible = true;
        marker.visible = true;
      } else {
        beacon.visible = false;
        marker.visible = false;
      }
      onEvent('objective', o.text);
    },
    advance() {
      this.objectiveIndex += 1;
      this.kills = 0;
      if (this.objectiveIndex >= this.mission.objectives.length) {
        const reward = this.mission.reward;
        onEvent('paid', `Mission complete: ${this.mission.title} — +$${reward}`);
        this.index += 1;
        this.objectiveIndex = 0;
        if (this.done) {
          beacon.visible = false;
          marker.visible = false;
          onEvent('story', 'STORY COMPLETE — Dani and Lila are free. Solmar Bay is yours now.');
          return { reward, done: true };
        }
        onEvent('mission', `Mission ${this.index + 1} — ${this.mission.title}: ${this.mission.brief}`);
      }
      this.showObjective();
      return { reward: 0, done: false };
    },
    /** Check one objective against the world; returns a reward when it completes. */
    check(state) {
      if (!this.active || this.done) return 0;
      const o = this.objective;
      if (!o) return 0;
      const px = state.player.x;
      const pz = state.player.z;
      let reward = 0;
      let done = false;
      if ((o.type === 'goto' || o.type === 'driveTo' || o.type === 'collect' || o.type === 'deliver')
        && o.x !== undefined) {
        if (Math.hypot(px - o.x, pz - o.z) < 6) done = true;
      } else if (o.type === 'steal' && state.player.inCar) {
        done = true;
      } else if (o.type === 'eliminate' && this.kills >= (o.count || 1)) {
        done = true;
      } else if (o.type === 'escape' && state.wanted.stars === 0) {
        done = true;
      }
      if (done) {
        const r = this.advance();
        reward = r.reward || 0;
        if (r.done) return reward;
      }
      return reward;
    },
    noteKill() {
      this.kills += 1;
      const o = this.objective;
      if (o?.type === 'eliminate') {
        onEvent('objective', o.text.replace(/\(\d+\/\d+\)/, `(${this.kills}/${o.count})`));
      }
    },
    /** Scatter the twelve sunset coins; returns the meshes for the main loop. */
    spawnCoins(scene) {
      const geo = new THREE.CylinderGeometry(0.9, 0.9, 0.25, 12);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
      for (const [x, z] of COIN_SPOTS) {
        const coin = new THREE.Mesh(geo, mat);
        coin.position.set(x, 1.2, z);
        coin.rotation.x = Math.PI / 2;
        scene.add(coin);
        this.coinMeshes.push({ mesh: coin, x, z, taken: false });
      }
    },
    collectCoins(playerPos) {
      let got = 0;
      for (const c of this.coinMeshes) {
        if (c.taken) continue;
        if (Math.hypot(playerPos.x - c.x, playerPos.z - c.z) < 2.5) {
          c.taken = true;
          c.mesh.visible = false;
          this.coins += 1;
          got += 50;
          onEvent('coin', `Sunset coin ${this.coins}/12 — +$50`);
        }
      }
      return got;
    },
  };
  return engine;
}
