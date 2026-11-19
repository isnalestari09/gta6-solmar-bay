// Missions: one active at a time, a glowing beacon at the target, cash
// on completion, and a fail/retry flow that never takes earned cash away.

import * as THREE from 'three';
import { MISSIONS } from './config.js';

export class Missions {
  constructor(scene) {
    this.scene = scene;
    this.index = 0; // 0-based into MISSIONS
    this.failedCount = 0;
    this.failed = false;
    this.done = false;
    this.beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4, 14, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
    );
    this.beacon.position.set(0, 7, 0);
    scene.add(this.beacon);
    this.marker = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.2, 0.3, 16),
      new THREE.MeshBasicMaterial({ color: 0xffc93c }),
    );
    this.marker.position.set(0, 0.15, 0);
    scene.add(this.marker);
    this._placeBeacon();
  }

  current() { return MISSIONS[this.index] || null; }

  _placeBeacon() {
    const m = this.current();
    if (!m) { this.beacon.visible = false; this.marker.visible = false; return; }
    this.beacon.visible = true;
    this.marker.visible = true;
    this.beacon.position.set(m.target[0], 7, m.target[1]);
    this.marker.position.set(m.target[0], 0.15, m.target[1]);
  }

  // Returns the payout when the player reaches the beacon, else 0.
  check(x, z) {
    const m = this.current();
    if (!m || this.failed) return 0;
    if (Math.hypot(x - m.target[0], z - m.target[1]) < 6) {
      const pay = m.pay;
      this.index += 1;
      if (this.index >= MISSIONS.length) this.done = true;
      this._placeBeacon();
      return pay;
    }
    return 0;
  }

  fail() {
    this.failed = true;
    this.failedCount += 1;
  }

  retry() {
    this.failed = false;
    this._placeBeacon();
  }

  update(dt, time) {
    this.beacon.rotation.y += dt;
    this.beacon.position.y = 7 + Math.sin(time * 2) * 0.6;
  }
}
