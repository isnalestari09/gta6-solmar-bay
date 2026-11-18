// Solmar Bay — tuning, palette, story and mission data for the open-world game.
// Every number the simulation uses lives here, so the other files read like a
// description of the city instead of a list of magic constants.

export const STEP = 1 / 60;
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best.v1';

/** The city is a grid of blocks separated by roads. One block is 40 units. */
export const CITY = {
  blocks: 9,
  block: 40,
  road: 14,
  /** Half the city's width, in world units. */
  half: 243,
  /** The beach and ocean sit south of this z. */
  beachZ: 250,
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 15,
  accel: 60,
  jumpSpeed: 11,
  gravity: -30,
  health: 100,
  punchDamage: 25,
  bulletDamage: 34,
  ammoStart: 60,
};

export const CAR = {
  accel: 26,
  brake: 40,
  maxSpeed: 46,
  maxReverse: 14,
  turn: 1.9,
  grip: 0.92,
};

export const WANTED = {
  maxStars: 5,
  decaySeconds: 22,
  policePerStar: 2,
  /** Seconds of no crime before one star fades. */
  starDecay: 1,
};

export const PALETTE = {
  skyTop: 0x2f6fb2,
  skyHorizon: 0xffc98a,
  sun: 0xffd9a0,
  ocean: 0x1e6f8e,
  sand: 0xe8cf9a,
  asphalt: 0x2b2f36,
  asphaltLine: 0xf2c94c,
  sidewalk: 0x9aa0a6,
  grass: 0x4f8f4a,
  building: [0xe8b48a, 0xd98a6a, 0x8ab4d9, 0xc9d6de, 0xe8d9a8, 0x9a7bb0, 0x7fb08a, 0xd9a0a0],
  neon: [0xff4d6d, 0x00e5ff, 0xffd166, 0x7CFC00, 0xff7bff],
  playerShirt: 0x2f9e6e,
  police: 0x1b2a4a,
  taxi: 0xffc93c,
};

/** Original story: Dani Reyes, a getaway driver, comes home to Solmar Bay. */
export const STORY = {
  city: 'Solmar Bay',
  hero: 'Dani Reyes',
  heroJob: 'getaway driver',
  intro:
    'Dani Reyes drove out of Solmar Bay five years ago and swore never to come back. ' +
    'Tonight the tide brought him home: his sister Lila owes the Coral Kings, and the ' +
    'only way to buy her freedom is to drive for the crew that owns the bay.',
  crew: 'the Coral Kings',
  sister: 'Lila Reyes',
  rival: 'Marco "El Tiburon" Vela',
};

export const RADIO_STATIONS = [
  { name: 'SOL 98.5 — Sunset Synth', bpm: 96, root: 55, mode: 'minor' },
  { name: 'BAHIA FM — Latin Heat', bpm: 120, root: 65.41, mode: 'major' },
  { name: 'PALM LO-FI — Night Drive', bpm: 72, root: 49, mode: 'minor' },
];

/**
 * Seven story missions. Each mission is a list of objectives; the mission engine
 * (missions.js) walks them in order, shows the marker, and pays on completion.
 * Types: goto, driveTo, eliminate, collect, deliver, escape.
 */
export const MISSIONS = [
  {
    id: 1,
    title: 'Homecoming',
    brief: 'Meet Lila at the pier. Walk to the yellow marker — no trouble, just listen.',
    reward: 150,
    objectives: [
      { type: 'goto', x: 0, z: 262, text: 'Walk to the pier and meet Lila' },
      { type: 'goto', x: -52, z: 104, text: 'Follow Lila to the safehouse' },
    ],
  },
  {
    id: 2,
    title: 'Borrowed Wheels',
    brief: 'The crew needs a car. Take any parked car (E) and bring it to the garage.',
    reward: 300,
    objectives: [
      { type: 'steal', text: 'Steal a car — press E next to one' },
      { type: 'driveTo', x: 156, z: -104, text: 'Drive it to the Coral Garage' },
    ],
  },
  {
    id: 3,
    title: 'The Drop',
    brief: 'Deliver the package across town. Police are watching — keep it clean, or outrun them.',
    reward: 500,
    objectives: [
      { type: 'collect', x: -104, z: -52, text: 'Pick up the package at the market' },
      { type: 'deliver', x: 208, z: 156, text: 'Deliver it to the marina warehouse' },
    ],
  },
  {
    id: 4,
    title: 'Tiburon\'s Men',
    brief: 'Marco Vela sent collectors to the arcade. Deal with them — fists or fire.',
    reward: 700,
    objectives: [
      { type: 'eliminate', x: 104, z: 52, count: 3, text: 'Clear the collectors at the arcade (0/3)' },
    ],
  },
  {
    id: 5,
    title: 'Night Taxi',
    brief: 'Earn the crew\'s trust: run fares. Pick up three passengers and drop them off.',
    reward: 600,
    objectives: [
      { type: 'driveTo', x: -156, z: -156, text: 'Pick up the first fare' },
      { type: 'driveTo', x: 52, z: -208, text: 'Drop off the fare at the hotel' },
      { type: 'driveTo', x: -208, z: 104, text: 'Pick up the last fare at the docks' },
    ],
  },
  {
    id: 6,
    title: 'The Heist',
    brief: 'Hit the Coral Casino vault. Grab the cash, then lose the cops — 4 stars, no mercy.',
    reward: 1500,
    objectives: [
      { type: 'collect', x: 156, z: 52, text: 'Grab the vault cash at the casino' },
      { type: 'escape', text: 'Escape! Lose the wanted level' },
    ],
  },
  {
    id: 7,
    title: 'Sunset Run',
    brief: 'The final run: drive Lila to the airport road while Vela\'s crew hunts you. Finish it.',
    reward: 2500,
    objectives: [
      { type: 'driveTo', x: -208, z: -208, text: 'Drive Lila to the airport road' },
      { type: 'eliminate', x: -156, z: -156, count: 2, text: 'Hold the road — stop Vela\'s men (0/2)' },
      { type: 'driveTo', x: 0, z: 262, text: 'Reach the pier at sunset. Freedom.' },
    ],
  },
];

/** Twelve hidden sunset coins scattered around the city, for completionists. */
export const COIN_SPOTS = [
  [-208, 208], [-104, 208], [104, 208], [208, 208],
  [-208, 0], [208, 0], [-208, -208], [0, -208], [208, -208],
  [-52, 156], [156, -52], [52, -104],
];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
