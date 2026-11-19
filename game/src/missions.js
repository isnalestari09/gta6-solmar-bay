// Solmar Bay — the story: eight missions that earn Dani the $2,600 to buy
// his sister Lila's freedom from the Coral Kings. Each mission is a list of
// steps — go somewhere, wait, punch, finish a fare, or outrun the law —
// with a glowing marker in the world and live progress on the HUD.

import * as THREE from 'three';
import { DOCKS, PLAZAS, distance2D } from './config.js';

export const MISSIONS = [
  {
    name: 'First Wheels', payout: 150,
    intro: 'Dani is back in Solmar Bay. First, wheels: steal a parked car and bring it to Plaza del Sol.',
    steps: [
      { type: 'steal', text: 'Steal a parked car — press E next to one' },
      { type: 'goto', x: PLAZAS.sol.x, z: PLAZAS.sol.z, radius: 10, text: 'Drive the car to Plaza del Sol' },
    ],
  },
  {
    name: "Lila's Note", payout: 200,
    intro: 'A note from Lila: meet her friend at Coral Plaza. Go on foot and wait for the contact.',
    steps: [
      { type: 'goto', x: PLAZAS.coral.x, z: PLAZAS.coral.z, radius: 8, text: 'Reach Coral Plaza on foot' },
      { type: 'wait', x: PLAZAS.coral.x, z: PLAZAS.coral.z, radius: 8, seconds: 3, text: 'Wait for the contact' },
    ],
  },
  {
    name: 'The Drop', payout: 300,
    intro: 'The Coral Kings want a package moved. Drive it to the docks warehouse — no questions.',
    steps: [
      { type: 'goto', x: 120, z: 150, radius: 8, text: 'Drive to the docks warehouse', car: true },
      { type: 'wait', x: 120, z: 150, radius: 8, seconds: 2, text: 'Hand over the package' },
    ],
  },
  {
    name: 'Hot Cargo', payout: 400,
    intro: 'Two stops, one hot cargo. Pick it up at the north plaza, drop it at the east gate.',
    steps: [
      { type: 'goto', x: 0, z: -120, radius: 8, text: 'Pick up the cargo at the north end' },
      { type: 'goto', x: 160, z: 0, radius: 8, text: 'Deliver the cargo to the east gate' },
    ],
  },
  {
    name: 'Rough Crowd', payout: 500,
    intro: 'Two hecklers at Coral Plaza are blocking the way. Show them Dani is back — with his fists.',
    steps: [
      { type: 'punch', count: 2, text: 'Knock down 2 hecklers at Coral Plaza (F to punch)' },
    ],
  },
  {
    name: 'Taxi Shift', payout: 350,
    intro: 'A cab is waiting. Take a fare: get in the yellow taxi, press T, and drive the rider home.',
    steps: [
      { type: 'fare', text: 'Finish a taxi fare — get in the yellow taxi and press T' },
    ],
  },
  {
    name: 'The Exchange', payout: 600,
    intro: 'The exchange is at the lighthouse. Go there, wait for the signal, then get to the boat.',
    steps: [
      { type: 'goto', x: DOCKS.lighthouse.x, z: DOCKS.lighthouse.z - 12, radius: 9, text: 'Reach the lighthouse' },
      { type: 'wait', x: DOCKS.lighthouse.x, z: DOCKS.lighthouse.z - 12, radius: 9, seconds: 3, text: 'Wait for the signal' },
      { type: 'goto', x: DOCKS.boat.x, z: DOCKS.boat.z - 10, radius: 9, text: 'Get to the boat at the docks' },
    ],
  },
  {
    name: 'One Last Chase', payout: 2600,
    intro: 'It was a trap. Five stars, the whole force after you — reach the boat at the docks and get Lila out.',
    steps: [
      { type: 'chase', x: DOCKS.boat.x, z: DOCKS.boat.z - 10, radius: 10, text: 'Escape the police — reach the boat at the docks' },
    ],
  },
];

function makeMarker() {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd800, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  group.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 30, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd800, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 15;
  group.add(beam);
  group.visible = false;
  return group;
}

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.marker = makeMarker();
    scene.add(this.marker);
    this.activeIndex = -1;
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.waitTimer = 0;
    this.punchCount = 0;
    this.fareStarted = false;
    this.done = false;
  }

  get active() {
    return this.activeIndex >= 0 ? MISSIONS[this.activeIndex] : null;
  }

  get step() {
    const mission = this.active;
    return mission ? mission.steps[this.stepIndex] : null;
  }

  get isChaseStep() {
    return this.step && this.step.type === 'chase';
  }

  start(index) {
    this.activeIndex = index;
    this.stepIndex = 0;
    this.stepProgress = 0;
    this.waitTimer = 0;
    this.punchCount = 0;
    this.done = false;
    this._placeMarker();
    return this.active;
  }

  _placeMarker() {
    const step = this.step;
    if (!step) {
      this.marker.visible = false;
      return;
    }
    if (step.x !== undefined) {
      this.marker.position.set(step.x, 0, step.z);
      this.marker.visible = true;
    } else {
      this.marker.visible = false;
    }
  }

  onCarStolen() {
    const step = this.step;
    if (step && step.type === 'steal') this._advance();
  }

  onPunch() {
    const step = this.step;
    if (step && step.type === 'punch') {
      this.punchCount += 1;
      if (this.punchCount >= step.count) this._advance();
    }
  }

  onFareStart() {
    const step = this.step;
    if (step && step.type === 'fare') this.fareStarted = true;
  }

  onFareComplete() {
    const step = this.step;
    if (step && step.type === 'fare') this._advance();
  }

  _advance() {
    this.stepIndex += 1;
    this.waitTimer = 0;
    if (this.stepIndex >= this.active.steps.length) {
      this.done = true;
      this.marker.visible = false;
      return;
    }
    this._placeMarker();
  }

  // Returns 'complete' when the mission is finished, 'step' when a step
  // finished this frame, or null.
  update(dt, playerPos, inCar) {
    const step = this.step;
    if (!step || this.done) return this.done ? 'complete' : null;
    if (step.type === 'goto' || step.type === 'chase') {
      const d = distance2D(playerPos.x, playerPos.z, step.x, step.z);
      if (step.car && !inCar) return null;
      if (d <= step.radius) {
        this._advance();
        return this.done ? 'complete' : 'step';
      }
      return null;
    }
    if (step.type === 'wait') {
      const d = distance2D(playerPos.x, playerPos.z, step.x, step.z);
      if (d <= step.radius) {
        this.waitTimer += dt;
        if (this.waitTimer >= step.seconds) {
          this._advance();
          return this.done ? 'complete' : 'step';
        }
      } else {
        this.waitTimer = 0;
      }
      return null;
    }
    return null;
  }

  objectiveText(playerPos) {
    const mission = this.active;
    if (!mission) return null;
    const step = this.step;
    if (!step) return null;
    let text = step.text;
    if (step.type === 'fare' && this.fareStarted) {
      text = 'Fare in progress — drive to the green ring';
    }
    if (step.type === 'punch') {
      text += ` — ${Math.min(this.punchCount, step.count)}/${step.count}`;
    }
    if (step.type === 'wait') {
      text += ` — ${Math.max(0, Math.ceil(step.seconds - this.waitTimer))}s`;
    }
    if ((step.type === 'goto' || step.type === 'chase') && step.x !== undefined) {
      const d = Math.round(distance2D(playerPos.x, playerPos.z, step.x, step.z));
      text += ` — ${d}m`;
    }
    return { mission: mission.name, payout: mission.payout, text };
  }

  fail() {
    this.activeIndex = -1;
    this.stepIndex = 0;
    this.marker.visible = false;
    this.done = false;
  }

  clear() {
    this.fail();
  }
}
