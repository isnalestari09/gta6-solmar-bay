// Solmar Bay — the story: eight missions for Dani, from stealing his first
// car to the $2,600 chase that buys Lila's freedom, plus taxi fares on the
// side. A failed mission retries with the cash kept.

import * as THREE from 'three';
import { MISSIONS, ECONOMY } from './config.js';

export class MissionManager {
  constructor(game) {
    this.game = game;
    this.index = game.save.missionIndex || 0;
    this.active = false;
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.failed = false;
    this.completedAll = this.index >= MISSIONS.length;
    this.taxi = null; // { ped, dest, fare }
    this.marker = null; // { pos, radius } — the current objective marker
    this.chaseHeat = false;
  }

  get current() {
    return MISSIONS[this.index] || null;
  }

  get step() {
    const m = this.current;
    return m ? m.steps[this.stepIndex] : null;
  }

  start() {
    const m = this.current;
    if (!m || this.active) return false;
    this.active = true;
    this.failed = false;
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.applyStep();
    this.game.hud.showToast(`${m.name} — ${m.brief}`);
    this.game.audio.chime(true);
    return true;
  }

  applyStep() {
    const step = this.step;
    this.marker = null;
    this.chaseHeat = false;
    if (!step) return;
    if (step.target) {
      this.marker = { pos: new THREE.Vector3(step.target[0], 0, step.target[1]), radius: step.radius || 10 };
      this.game.world.setObjectiveMarker(this.marker);
    } else {
      this.game.world.setObjectiveMarker(null);
    }
    if (step.kind === 'chase') {
      this.chaseHeat = true;
      this.game.wanted.frozen = true;
      this.game.wanted.setStars(step.wanted || 5);
    }
    if (step.kind === 'punch') this.stepProgress = 0;
    if (step.kind === 'coins') this.stepProgress = this.game.coinsCollectedThisMission || 0;
    if (step.kind === 'wanted') this.stepProgress = 0;
  }

  // Returns true when the step (and maybe the mission) just completed.
  update(dt, player) {
    if (!this.active) return;
    const step = this.step;
    if (!step) return;
    const dist = this.marker ? Math.hypot(player.pos.x - this.marker.pos.x, player.pos.z - this.marker.pos.z) : Infinity;
    let done = false;
    if (step.kind === 'reach' || step.kind === 'chase') {
      if (dist < (step.radius || 10)) done = true;
    } else if (step.kind === 'steal') {
      if (player.inCar) done = true;
    } else if (step.kind === 'punch') {
      if (this.stepProgress >= (step.count || 1)) done = true;
    } else if (step.kind === 'coins') {
      if (this.stepProgress >= (step.count || 1)) done = true;
    } else if (step.kind === 'wanted') {
      if (this.game.wanted.stars >= (step.needStars || 2)) this.stepProgress = 1;
      if (this.stepProgress === 1 && this.game.wanted.stars === 0) done = true;
    }
    if (done) this.advance();
  }

  advance() {
    const m = this.current;
    this.game.audio.chime(true);
    this.stepIndex += 1;
    if (this.stepIndex >= m.steps.length) {
      this.complete(m);
    } else {
      this.applyStep();
      this.game.hud.showToast(this.step.text);
    }
  }

  complete(m) {
    this.active = false;
    this.game.wanted.frozen = false;
    this.game.cash += m.pay;
    this.game.save.completed.push(m.id);
    this.index += 1;
    this.game.save.missionIndex = this.index;
    this.game.saveGame();
    this.game.world.setObjectiveMarker(null);
    this.marker = null;
    if (this.index >= MISSIONS.length) {
      this.completedAll = true;
      this.game.hud.showStoryEnd();
    } else {
      this.game.hud.showToast(`Mission complete — $${m.pay}. Next: ${MISSIONS[this.index].name} (press M)`);
    }
  }

  fail(reason) {
    if (!this.active) return;
    this.active = false;
    this.failed = true;
    this.game.wanted.frozen = false;
    this.game.world.setObjectiveMarker(null);
    this.marker = null;
    this.game.audio.chime(false);
    this.game.hud.showToast(`Mission failed: ${reason}. Press M to retry — your cash is kept.`);
  }

  retry() {
    this.failed = false;
    this.start();
  }

  // Taxi fares: press T near a pedestrian to pick them up, drive them to
  // the marker, earn the fare.
  tryTaxi(player, peds) {
    if (this.taxi) return false;
    if (!player.inCar) return false;
    const ped = peds.nearest(player.pos, 6);
    if (!ped) return false;
    const dest = new THREE.Vector3(
      (Math.floor(Math.random() * 9) - 4) * 60,
      0,
      (Math.floor(Math.random() * 8) - 4) * 60,
    );
    this.taxi = { ped, dest, fare: ECONOMY.taxiFare };
    ped.target = dest;
    ped.speed = 0;
    this.game.world.setObjectiveMarker({ pos: dest, radius: 10 });
    this.game.hud.showToast(`Taxi fare — take the passenger to the marker ($${ECONOMY.taxiFare})`);
    return true;
  }

  updateTaxi(player) {
    if (!this.taxi) return;
    const d = Math.hypot(player.pos.x - this.taxi.dest.x, player.pos.z - this.taxi.dest.z);
    if (d < 10) {
      this.game.cash += this.taxi.fare;
      this.game.hud.showToast(`Fare paid — $${this.taxi.fare}`);
      this.game.audio.chime(true);
      this.taxi.ped.speed = 2.2;
      this.taxi = null;
      if (this.active) this.applyStep();
      else this.game.world.setObjectiveMarker(null);
      this.game.saveGame();
    }
  }

  // The objective line for the HUD.
  objectiveText(player) {
    if (this.taxi) {
      const d = Math.round(Math.hypot(player.pos.x - this.taxi.dest.x, player.pos.z - this.taxi.dest.z));
      return `Taxi fare — drop off the passenger — ${d}m`;
    }
    if (!this.active) {
      const m = this.current;
      return m ? `Next mission: ${m.name} — press M to start` : 'All missions complete — Lila is free!';
    }
    const step = this.step;
    if (!step) return '';
    const d = this.marker ? ` — ${Math.round(Math.hypot(player.pos.x - this.marker.pos.x, player.pos.z - this.marker.pos.z))}m` : '';
    if (step.kind === 'punch') return `${step.text} (${this.stepProgress}/${step.count})${d}`;
    if (step.kind === 'coins') return `${step.text} (${this.stepProgress}/${step.count})`;
    if (step.kind === 'wanted') return this.stepProgress === 1 ? 'Now lose the police!' : step.text;
    return step.text + d;
  }
}
