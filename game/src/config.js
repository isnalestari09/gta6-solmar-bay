// Solmar Bay — shared constants: world, palette, economy, missions, radio.
// One source of truth for every system; nothing here knows about three.js.

export const WORLD = {
  // City blocks are 60 units apart; the playable island is 9 x 9 blocks.
  block: 60,
  blocks: 9,
  half: 270,
  roadWidth: 14,
  // The docks run along the south edge (positive z); the sea lies beyond.
  dockZ: 252,
  seaZ: 300,
  // Central plaza at the origin.
  plazaHalf: 34,
};

export const PALETTE = {
  sky: 0xffb36b,
  fog: 0xff9e57,
  ground: 0xc47a33,
  road: 0x2e2620,
  sidewalk: 0xb98a52,
  plaza: 0xd9a86c,
  sea: 0x1d4e5e,
  sand: 0xd9b380,
  building: [0x8a6a4f, 0x7a5a44, 0x9a7a58, 0x6e5140, 0x84604a],
  windowLit: 0xffd27a,
  windowDark: 0x3a2f28,
  palmTrunk: 0x6b4a2f,
  palmLeaf: 0x2e7d32,
  fountain: 0x3f8f8a,
  lighthouse: 0xe8dcc8,
  boatSail: 0xf5ead2,
  coin: 0xffc93c,
};

export const ECONOMY = {
  startCash: 250,
  freedomPrice: 2600,
  coinValue: 10,
  coinsTotal: 12,
  taxiFare: 60,
  // A cop bust costs the player a fine and the mission, never the story cash.
  bustFine: 100,
};

export const PLAYER = {
  walkSpeed: 9,
  sprintSpeed: 15,
  accel: 40,
  friction: 26,
  punchRange: 2.6,
  punchDamage: 34,
  punchCooldown: 0.45,
  punchArc: 1.1,
  maxHealth: 100,
  // How close the camera sits behind Dani, on foot and in a car.
  camHeightFoot: 9,
  camDistFoot: 13,
  camHeightCar: 11,
  camDistCar: 17,
};

export const CARS = {
  parkedTotal: 28,
  trafficTotal: 14,
  topSpeed: 42,
  accel: 26,
  brake: 48,
  steer: 2.1,
  reverseSpeed: 12,
};

export const PEDS = {
  total: 26,
  walkSpeed: 2.2,
  fleeSpeed: 5.5,
};

export const WANTED = {
  maxStars: 5,
  // Police spawn in a ring around the player, never on top of them.
  spawnMin: 42,
  spawnMax: 70,
  // A cop that gets this close counts as "spotted": only then may heat decay.
  spotRange: 30,
  decayDelay: 6,
  decayRate: 0.25,
  // Cops per star level (0 stars: none).
  copsForStars: [0, 1, 2, 3, 4, 5],
  copSpeed: 13,
  copRamDamage: 8,
  bustRange: 3.2,
  bustHold: 1.2,
};

// The four radio stations. Each station is a loop of bars; a bar is a list of
// [beat, midiNote, lengthInBeats, wave] notes plus a bass line and a drum map.
export const RADIO = [
  {
    id: 0,
    name: 'BAYWAVE FM',
    genre: 'Synthwave',
    bpm: 96,
    lead: 'sawtooth',
    bass: 'triangle',
    // Minor-key sunset drive.
    leadNotes: [69, 72, 76, 79, 76, 72, 74, 71],
    bassNotes: [45, 45, 41, 48],
  },
  {
    id: 1,
    name: 'CORAL 98',
    genre: 'Reggae',
    bpm: 78,
    lead: 'square',
    bass: 'sine',
    leadNotes: [67, 69, 72, 69, 67, 64, 67, 69],
    bassNotes: [43, 50, 45, 48],
  },
  {
    id: 2,
    name: 'PALM JAZZ',
    genre: 'Jazz',
    bpm: 112,
    lead: 'triangle',
    bass: 'sine',
    leadNotes: [72, 75, 79, 76, 74, 71, 72, 67],
    bassNotes: [48, 43, 45, 41],
  },
  {
    id: 3,
    name: 'SURGE ROCK',
    genre: 'Rock',
    bpm: 132,
    lead: 'sawtooth',
    bass: 'square',
    leadNotes: [64, 64, 67, 69, 71, 69, 67, 64],
    bassNotes: [40, 40, 45, 43],
  },
];

// Mission script. Steps are objective markers the player must reach (or, for
// chase steps, survive); `wanted` is the heat the step pins while it runs.
// Rewards climb to the $2,600 freedom price of the finale.
export const MISSIONS = [
  {
    id: 1,
    name: 'First Wheels',
    pay: 150,
    brief: 'Dani is back in Solmar Bay. Steal a parked car and bring it to the plaza.',
    steps: [
      { kind: 'steal', text: 'Steal a parked car (walk up and press E)', target: null },
      { kind: 'reach', text: 'Drive to the plaza marker', target: [0, 0], radius: 10 },
    ],
  },
  {
    id: 2,
    name: 'Bayview Run',
    pay: 220,
    brief: 'A Coral Kings courier is waiting at the north gate. Pick up the package.',
    steps: [
      { kind: 'reach', text: 'Reach the north gate pickup', target: [0, -252], radius: 10 },
      { kind: 'reach', text: 'Deliver the package to the marina', target: [180, 252], radius: 10 },
    ],
  },
  {
    id: 3,
    name: 'Loud Neighbours',
    pay: 300,
    brief: 'Two Kings lookouts are hassling the plaza. Teach them a lesson — on foot.',
    steps: [
      { kind: 'punch', text: 'Punch the lookouts at the plaza (2)', target: [0, 0], radius: 14, count: 2 },
    ],
  },
  {
    id: 4,
    name: 'Hot Wheels',
    pay: 380,
    brief: 'The Kings want their car back. Lose the police, then stash the car at the docks.',
    steps: [
      { kind: 'wanted', text: 'Get the police off your tail (reach 2 stars, then lose them)', target: null, needStars: 2 },
      { kind: 'reach', text: 'Stash the car at the docks', target: [-180, 252], radius: 12 },
    ],
  },
  {
    id: 5,
    name: 'Coin Run',
    pay: 420,
    brief: 'Lila hid sunset coins around the city. Grab four to fund the escape plan.',
    steps: [
      { kind: 'coins', text: 'Collect 4 sunset coins', target: null, count: 4 },
    ],
  },
  {
    id: 6,
    name: 'The Informant',
    pay: 550,
    brief: 'An informant at the lighthouse knows where Lila is held. Drive there — fast.',
    steps: [
      { kind: 'reach', text: 'Reach the lighthouse', target: [-228, 252], radius: 12 },
      { kind: 'reach', text: 'Escort the informant to the plaza', target: [0, 0], radius: 10 },
    ],
  },
  {
    id: 7,
    name: 'Kings Ransom',
    pay: 800,
    brief: 'The Kings demand a ransom drop at the east pier. Deliver it — and keep your head down.',
    steps: [
      { kind: 'reach', text: 'Drop the ransom at the east pier', target: [228, 252], radius: 10 },
      { kind: 'reach', text: 'Get back to the plaza in one piece', target: [0, 0], radius: 10 },
    ],
  },
  {
    id: 8,
    name: 'One Last Chase',
    pay: 2600,
    brief: 'The money is ready. The Kings are coming. Escape the police and reach Lila’s boat at the docks.',
    steps: [
      { kind: 'chase', text: 'Escape the police — reach the boat at the docks', target: [120, 258], radius: 12, wanted: 5 },
    ],
  },
];

export const SAVE_KEY = 'solmar-bay-save-v2';
export const SAVE_KEY_V1 = 'solmar-bay-save';
