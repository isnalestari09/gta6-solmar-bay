// The story: eight missions, one at a time, each with a gold beacon in the
// world and a HUD objective. Completing one pays out, autosaves, and starts
// the next. The finale ends the story.

import * as THREE from 'three';
import { MISSIONS, ECONOMY } from './config.js';

export class MissionManager {
  constructor(scene, city, audio, onEvent) {
    this.scene = scene;
    this.city = city;
    this.audio = audio;
    this.onEvent = onEvent;   // (type, payload) — cash, save, complete, fail
    this.index = 0;           // 0-based into MISSIONS
    this.done = false;
    this.faresLeft = 0;
    this.faresDone = 0;
    this.coinsNeeded = 0;
    this.coinsFound = 0;
    this.escapeArmed = false;
    this.failedCount = 0;  // revision 2: how many times the current run failed
    this._beacon = this._makeBeacon();
    scene.add(this._beacon);
    this._fareMarkers = [];
    this._updateBeacon();
  }

  get current() { return MISSIONS[this.index]; }
  get objective() {
    const m = this.current;
    if (!m) return 'Story complete — Solmar Bay is yours, Dani.';
    if (m.kind === 'fares') return `${m.brief} (${this.faresDone}/3 fares)`;
    if (m.kind === 'coins') return `${m.brief} (${this.coinsFound}/${this.coinsNeeded} coins)`;
    return m.brief;
  }

  _makeBeacon() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    beam.position.y = 30;
    g.add(beam);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3, 0.3, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd54a }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    g.add(ring);
    return g;
  }

  _updateBeacon() {
    const m = this.current;
    if (!m) { this._beacon.visible = false; return; }
    this._beacon.visible = true;
    this._beacon.position.set(m.target[0], 0, m.target[1]);
  }

  startMission(i) {
    this.index = i;
    const m = this.current;
    this.faresLeft = m && m.kind === 'fares' ? 3 : 0;
    this.faresDone = 0;
    this.coinsNeeded = m && m.kind === 'coins' ? 6 : 0;
    this.coinsFound = 0;
    this.escapeArmed = false;
    this._clearFareMarkers();
    if (m && m.kind === 'fares') this._spawnFareMarkers();
    this._updateBeacon();
  }

  _spawnFareMarkers() {
    const spots = [[-90, -30], [60, 120], [120, -60]];
    for (const [x, z] of spots) {
      const marker = new THREE.Mesh(
        new THREE.ConeGeometry(1.5, 3, 4),
        new THREE.MeshBasicMaterial({ color: 0x2ecc71 }),
      );
      marker.position.set(x, 2, z);
      marker.rotation.y = Math.PI / 4;
      this.scene.add(marker);
      this._fareMarkers.push({ mesh: marker, x, z, done: false });
    }
  }

  _clearFareMarkers() {
    for (const f of this._fareMarkers) this.scene.remove(f.mesh);
    this._fareMarkers = [];
  }

  // Called every frame with the player's position and car state.
  update(dt, playerPos, inCar, wantedStars) {
    const m = this.current;
    if (!m || this.done) return;
    // Spin the beacon ring.
    this._beacon.rotation.y += dt;
    const dist = Math.hypot(playerPos.x - m.target[0], playerPos.z - m.target[1]);

    if (m.kind === 'goto' || m.kind === 'finale') {
      if (dist < 7) this._complete();
    } else if (m.kind === 'fares') {
      for (const f of this._fareMarkers) {
        if (f.done) continue;
        const d = Math.hypot(playerPos.x - f.x, playerPos.z - f.z);
        if (d < 6 && inCar) {
          f.done = true;
          this.scene.remove(f.mesh);
          this.faresDone++;
          this.onEvent('cash', { amount: ECONOMY.taxiFare, why: 'Taxi fare' });
          if (this.faresDone >= 3) this._complete();
        }
      }
    } else if (m.kind === 'escape') {
      if (wantedStars >= 3) this.escapeArmed = true;
      if (this.escapeArmed && wantedStars === 0 && dist < 7) this._complete();
    } else if (m.kind === 'coins') {
      if (this.coinsFound >= this.coinsNeeded) this._complete();
    }
  }

  // Revision 2 — fail / retry: failing a mission never costs cash.
  // `fail()` records the failure and tells the HUD; `retry()` restarts the
  // same mission from its start, with every dollar already earned kept.
  fail() {
    const m = this.current;
    if (!m || this.done) return;
    this.failedCount++;
    this.onEvent('mission-failed', { mission: m, failedCount: this.failedCount });
  }

  retry() {
    const m = this.current;
    if (!m || this.done) return;
    this.startMission(this.index); // same mission again, cash untouched
    this.onEvent('mission-retry', { mission: m });
  }

  // The coin system reports each pickup here.
  onCoin() {
    const m = this.current;
    if (m && m.kind === 'coins') this.coinsFound++;
  }

  _complete() {
    const m = this.current;
    this.audio.mission();
    this.onEvent('cash', { amount: m.pay, why: `Mission ${m.id} complete: ${m.name}` });
    this.onEvent('mission-complete', { mission: m });
    if (this.index + 1 >= MISSIONS.length) {
      this.done = true;
      this.index = MISSIONS.length;
      this._beacon.visible = false;
      this.onEvent('story-complete', {});
    } else {
      this.startMission(this.index + 1);
    }
    this.onEvent('save', {});
  }
}
