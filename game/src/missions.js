// Solmar Bay — the story: 8 missions for Dani Reyes, who came home to buy his
// sister Lila's freedom from the Coral Kings. Fail keeps your cash; retry is free.

import { MISSION_PAYOUTS, dist2d } from './config.js';

export const MISSIONS = [
  {
    id: 1, name: 'Welcome Home', payout: MISSION_PAYOUTS[0],
    briefing: 'Dani is back in Solmar Bay. Meet old friend Marco at Plaza del Sol.',
    steps: [{ type: 'goto', x: 92, z: 92, radius: 6, text: 'Meet Marco at Plaza del Sol' }],
  },
  {
    id: 2, name: 'First Wheels', payout: MISSION_PAYOUTS[1],
    briefing: 'Marco needs a car. Steal any parked car and bring it to the Coral Plaza garage.',
    steps: [
      { type: 'steal', text: 'Steal a parked car (press E near one)' },
      { type: 'drive', x: -92, z: -92, radius: 8, text: 'Drive the car to Coral Plaza' },
    ],
  },
  {
    id: 3, name: 'The Pickup', payout: MISSION_PAYOUTS[2],
    briefing: 'Pick up a package from the docks and deliver it to the fish market.',
    steps: [
      { type: 'goto', x: 0, z: 184, radius: 7, text: 'Pick up the package at the docks' },
      { type: 'drive', x: -138, z: 46, radius: 8, text: 'Deliver it to the fish market' },
    ],
  },
  {
    id: 4, name: 'Heat Check', payout: MISSION_PAYOUTS[3],
    briefing: 'The Coral Kings sent lookouts. Lose the cops, then reach the safehouse.',
    steps: [
      { type: 'heat', stars: 2, text: 'Draw police attention (cause trouble) to 2 stars' },
      { type: 'lose', text: 'Lose the cops — hide until your wanted level clears' },
      { type: 'goto', x: 138, z: -92, radius: 7, text: 'Reach the safehouse' },
    ],
  },
  {
    id: 5, name: 'Taxi Nights', payout: MISSION_PAYOUTS[4],
    briefing: 'Earn honest money. Take the taxi and complete 2 fares across town.',
    steps: [
      { type: 'taxi', count: 2, text: 'Complete 2 taxi fares in the yellow taxi' },
    ],
  },
  {
    id: 6, name: 'Coin Run', payout: MISSION_PAYOUTS[5],
    briefing: 'Lila hid her savings in sunset coins around the city. Collect 6 of them.',
    steps: [{ type: 'coins', count: 6, text: 'Collect 6 sunset coins' }],
  },
  {
    id: 7, name: 'The Exchange', payout: MISSION_PAYOUTS[6],
    briefing: 'Bring the money to the Coral Kings at the north plaza. No tricks — they watch.',
    steps: [
      { type: 'drive', x: 92, z: -138, radius: 8, text: 'Drive to the north plaza exchange' },
      { type: 'goto', x: 92, z: -138, radius: 6, text: 'Walk in and make the exchange' },
    ],
  },
  {
    id: 8, name: 'One Last Chase', payout: MISSION_PAYOUTS[7],
    briefing: 'It was a trap. Five stars, the whole force after you — reach the boat at the docks and get Lila out.',
    steps: [
      { type: 'chase', text: 'Escape the police — reach the boat at the docks' },
      { type: 'goto', x: 0, z: 200, radius: 8, text: 'Board the boat with Lila' },
    ],
  },
];

export class MissionRunner {
  constructor(onEvent) {
    this.onEvent = onEvent;
    this.index = 0;
    this.step = 0;
    this.active = false;
    this.failed = false;
    this.completed = false;
    this.coinsAtStart = 0;
    this.faresAtStart = 0;
    this.heatForced = false;
  }

  get current() {
    return MISSIONS[this.index] ?? null;
  }

  get currentStep() {
    const m = this.current;
    return m ? m.steps[this.step] : null;
  }

  /** Objective line for the HUD: the step text plus a live distance when
   * the step has a place to go, so the player always knows how far is left. */
  stepText(game) {
    const s = this.currentStep;
    if (!s) return '';
    if (s.type === 'chase') {
      const d = Math.round(dist2d(game.player.x, game.player.z, 0, 200));
      return `${s.text} — ${d}m`;
    }
    if ((s.type === 'goto' || s.type === 'drive') && s.x !== undefined) {
      const d = Math.round(dist2d(game.player.x, game.player.z, s.x, s.z));
      return `${s.text} — ${d}m`;
    }
    return s.text;
  }

  start(index, game) {
    this.index = index;
    this.step = 0;
    this.active = true;
    this.failed = false;
    this.coinsAtStart = game.coinsCollected;
    this.faresAtStart = game.faresDone;
    const m = this.current;
    this.onEvent('mission-start', m);
    this.applyStepEffect(game);
  }

  applyStepEffect(game) {
    const s = this.currentStep;
    if (!s) return;
    if (s.type === 'chase') {
      game.wanted.heat = 5 * 100;
      game.wanted.stars = 5;
      this.heatForced = true;
    }
    if (s.type === 'heat') {
      game.wanted.heat = s.stars * 100;
      game.wanted.stars = s.stars;
    }
  }

  advance(game) {
    const m = this.current;
    if (!m) return;
    this.step++;
    if (this.step >= m.steps.length) {
      this.active = false;
      this.completed = true;
      game.cash += m.payout;
      game.missionsDone = Math.max(game.missionsDone, this.index + 1);
      this.onEvent('mission-complete', m);
      return;
    }
    this.onEvent('mission-step', m.steps[this.step]);
    this.applyStepEffect(game);
  }

  fail(game, reason) {
    if (!this.active) return;
    this.active = false;
    this.failed = true;
    this.onEvent('mission-fail', { mission: this.current, reason });
  }

  update(game, dt) {
    if (!this.active) return;
    const s = this.currentStep;
    if (!s) return;
    const px = game.player.x;
    const pz = game.player.z;
    if (s.type === 'goto' || s.type === 'drive') {
      if (s.type === 'drive' && !game.player.inCar) return;
      if (dist2d(px, pz, s.x, s.z) < s.radius) this.advance(game);
    } else if (s.type === 'steal') {
      if (game.player.inCar) this.advance(game);
    } else if (s.type === 'heat') {
      if (game.wanted.stars >= s.stars) this.advance(game);
    } else if (s.type === 'lose') {
      if (game.wanted.stars === 0) this.advance(game);
    } else if (s.type === 'taxi') {
      if (game.faresDone - this.faresAtStart >= s.count) this.advance(game);
    } else if (s.type === 'coins') {
      if (game.coinsCollected - this.coinsAtStart >= s.count) this.advance(game);
    } else if (s.type === 'chase') {
      if (dist2d(px, pz, 0, 200) < 14) this.advance(game);
    }
  }

  retry(game) {
    this.failed = false;
    this.start(this.index, game);
  }
}
