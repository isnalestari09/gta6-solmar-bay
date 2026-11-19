// Solmar Bay — the story. One job: the 8 missions, their steps, the glowing
// marker, payouts, and fail/retry that keeps the cash Dani already earned.
import * as THREE from 'three';
import { MISSIONS } from './config.js';

const STEPS = [
  // 1 Bayview Run — drive or walk to the bayview marker.
  [{ type: 'goto', x: 0, z: -150, label: 'Reach the bayview marker' }],
  // 2 Lila's Note — on foot to the second plaza.
  [{ type: 'goto', x: 90, z: 90, label: "Pick up Lila's note at the plaza" }],
  // 3 Taxi Rush — pick up the fare, drop them at the docks.
  [
    { type: 'taxi', pickup: { x: 60, z: 60 }, drop: { x: 0, z: -168 }, label: 'Pick up the fare' },
    { type: 'taxi-drop', x: 0, z: -168, label: 'Drop the fare at the docks' },
  ],
  // 4 Coral Kings — three thugs at the west blocks.
  [{ type: 'punch', count: 3, at: { x: -60, z: -60 }, label: 'Teach the Coral Kings a lesson (0/3)' }],
  // 5 Hot Wheels — steal the coral coupe, bring it to the garage.
  [
    { type: 'drive', car: 'coupe', x: 120, z: 120, label: 'Steal the coral coupe' },
    { type: 'drive-deliver', x: 120, z: 120, label: 'Deliver the coupe to the garage' },
  ],
  // 6 Harbor Lights — 4 crates along the pier.
  [{ type: 'collect', count: 4, at: { x: 0, z: -200 }, label: 'Collect the crates on the pier (0/4)' }],
  // 7 King's Ransom — grab the bag, then lose the cops.
  [
    { type: 'goto', x: -90, z: -90, label: 'Grab the ransom bag' },
    { type: 'goto', x: 120, z: 120, label: 'Lose the cops — reach the garage' },
  ],
  // 8 One Last Chase — heat frozen, five stars, reach the boat.
  [{ type: 'escape', x: -12, z: -216, label: 'Escape the police — reach the boat at the docks' }],
];

export class Missions {
  // hooks: { addCash, addHeat, setStars, holdHeat, spawnThug, getPlayerPos,
  //   isDrivingCoupe, playerNear, onComplete, onStep, chime }
  constructor(scene, hooks) {
    this.scene = scene;
    this.hooks = hooks;
    this.index = 0; // next mission to start
    this.active = null; // { mission, stepIdx, step, progress }
    this.state = 'idle'; // idle | active | done
    this.marker = this.makeMarker();
    this.marker.visible = false;
    scene.add(this.marker);
    this.thugs = [];
    this.crates = [];
    this.taxiPassenger = null;
  }

  makeMarker() {
    const g = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 46, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffd21f, transparent: true, opacity: 0.28,
        side: THREE.DoubleSide, depthWrite: false,
      }),
    );
    beam.position.y = 23;
    g.add(beam);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.2, 24),
      new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    g.add(ring);
    g.userData = { beam, ring };
    return g;
  }

  setMarker(x, z, visible = true) {
    this.marker.position.set(x, 0, z);
    this.marker.visible = visible;
  }

  clearMarker() {
    this.marker.visible = false;
  }

  missionDef(i) {
    return MISSIONS[i];
  }

  nextMission() {
    return this.index < MISSIONS.length ? MISSIONS[this.index] : null;
  }

  start(i) {
    if (i >= MISSIONS.length) return false;
    this.index = i;
    const def = MISSIONS[i];
    this.active = { mission: def, stepIdx: 0, step: STEPS[i][0], progress: 0 };
    this.state = 'active';
    this.enterStep();
    return true;
  }

  enterStep() {
    const s = this.active.step;
    if (s.type === 'punch') {
      // The brawl is the mission: heat stays frozen while Dani fights the
      // thugs, then the cops show up once it is over (see completeMission).
      this.hooks.holdHeat(true);
      this.thugs = [];
      for (let k = 0; k < s.count; k++) {
        const t = this.hooks.spawnThug(s.at.x + (k - 1) * 6, s.at.z + (k % 2) * 6);
        this.thugs.push(t);
      }
      this.setMarker(s.at.x, s.at.z);
    } else if (s.type === 'collect') {
      this.crates = [];
      const spots = [
        { x: 0, z: -182 }, { x: -5, z: -198 }, { x: 5, z: -212 }, { x: 0, z: -226 },
      ];
      for (const spot of spots) {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 1.6, 1.6),
          new THREE.MeshLambertMaterial({ color: 0x8a5a2a }),
        );
        crate.position.set(spot.x, 0.8, spot.z);
        this.scene.add(crate);
        this.crates.push({ mesh: crate, x: spot.x, z: spot.z, taken: false });
      }
      this.setMarker(spots[0].x, spots[0].z);
    } else if (s.type === 'taxi') {
      this.taxiPassenger = this.hooks.spawnPassenger(s.pickup.x, s.pickup.z);
      this.setMarker(s.pickup.x, s.pickup.z);
    } else if (s.type === 'drive') {
      this.setMarker(64, -116); // the coupe
    } else if (s.type === 'escape') {
      this.hooks.holdHeat(true);
      this.hooks.setStars(5);
      this.setMarker(s.x, s.z);
    } else if (s.type === 'goto' || s.type === 'taxi-drop' || s.type === 'drive-deliver') {
      this.setMarker(s.x, s.z);
    }
    this.updateLabel();
  }

  updateLabel() {
    const s = this.active.step;
    if (s.type === 'punch') {
      s.label = `Teach the Coral Kings a lesson (${this.active.progress}/${s.count})`;
    } else if (s.type === 'collect') {
      s.label = `Collect the crates on the pier (${this.active.progress}/${s.count})`;
    }
  }

  currentLabel() {
    if (!this.active) return '';
    return this.active.step.label;
  }

  currentTarget() {
    if (!this.active) return null;
    const s = this.active.step;
    if (s.type === 'punch') return { x: s.at.x, z: s.at.z };
    if (s.type === 'collect') {
      const next = this.crates.find((c) => !c.taken);
      return next ? { x: next.x, z: next.z } : null;
    }
    if (s.type === 'taxi') return { x: s.pickup.x, z: s.pickup.z };
    if (s.type === 'drive') return { x: 64, z: -116 };
    return { x: s.x, z: s.z };
  }

  advanceStep() {
    const steps = STEPS[this.active.mission.id - 1];
    this.active.stepIdx++;
    if (this.active.stepIdx >= steps.length) {
      this.completeMission();
      return;
    }
    this.active.step = steps[this.active.stepIdx];
    this.active.progress = 0;
    this.enterStep();
    this.hooks.chime();
  }

  completeMission() {
    const def = this.active.mission;
    this.index = def.id; // next mission — set BEFORE onComplete so persist() sees it
    this.hooks.addCash(def.pay);
    this.hooks.chime();
    this.hooks.onComplete(def);
    this.clearMarker();
    this.cleanupStep();
    this.active = null;
    this.state = this.index >= MISSIONS.length ? 'done' : 'idle';
    this.hooks.holdHeat(false);
    if (def.id === 4) this.hooks.addHeat(40, 'brawl'); // the cops heard the fight
  }

  fail() {
    // Retry keeps the cash: reset this mission to its first step.
    this.hooks.holdHeat(false);
    this.cleanupStep();
    this.clearMarker();
    this.active = null;
    this.state = 'idle';
    // The mission stays next up — nothing is lost but the attempt.
  }

  cleanupStep() {
    for (const t of this.thugs) this.hooks.removePed(t);
    this.thugs = [];
    for (const c of this.crates) this.scene.remove(c.mesh);
    this.crates = [];
    if (this.taxiPassenger) {
      this.hooks.removePed(this.taxiPassenger);
      this.taxiPassenger = null;
    }
  }

  onThugDown(thug) {
    if (!this.active || this.active.step.type !== 'punch') return;
    this.active.progress++;
    this.updateLabel();
    if (this.active.progress >= this.active.step.count) this.advanceStep();
  }

  update(dt) {
    if (!this.active) return;
    const s = this.active.step;
    const p = this.hooks.getPlayerPos();
    const near = (x, z, r) => Math.hypot(p.x - x, p.z - z) < r;
    if (s.type === 'goto') {
      if (near(s.x, s.z, 4)) this.advanceStep();
    } else if (s.type === 'taxi') {
      if (near(s.pickup.x, s.pickup.z, 4)) {
        this.hooks.removePed(this.taxiPassenger);
        this.taxiPassenger = null;
        this.active.step = { type: 'taxi-drop', x: s.drop.x, z: s.drop.z, label: 'Drop the fare at the docks' };
        this.setMarker(s.drop.x, s.drop.z);
      }
    } else if (s.type === 'taxi-drop') {
      if (near(s.x, s.z, 5)) this.advanceStep();
    } else if (s.type === 'drive') {
      if (this.hooks.isDrivingCoupe()) {
        this.active.step = { type: 'drive-deliver', x: s.x, z: s.z, label: 'Deliver the coupe to the garage' };
        this.setMarker(s.x, s.z);
      }
    } else if (s.type === 'drive-deliver') {
      if (this.hooks.isDrivingCoupe() && near(s.x, s.z, 6)) this.advanceStep();
    } else if (s.type === 'collect') {
      const next = this.crates.find((c) => !c.taken);
      if (next && near(next.x, next.z, 3)) {
        next.taken = true;
        this.scene.remove(next.mesh);
        this.active.progress++;
        this.updateLabel();
        this.hooks.chime();
        const following = this.crates.find((c) => !c.taken);
        if (following) this.setMarker(following.x, following.z);
        if (this.active.progress >= s.count) this.advanceStep();
      }
    } else if (s.type === 'escape') {
      if (near(s.x, s.z, 5)) this.advanceStep();
    }
    // Marker pulse.
    if (this.marker.visible) {
      const t = performance.now() / 1000;
      this.marker.userData.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
    }
  }
}
