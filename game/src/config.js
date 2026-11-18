// Solmar Bay — shared constants, seeded RNG and mission definitions.
// Everything deterministic from a seed so staged screenshots and playtests
// reproduce exactly.

export const WORLD = {
  size: 420,          // playable square, metres
  roadGap: 60,        // distance between road centrelines
  roadWidth: 12,
  wall: 200,          // half-size of the playable area
};

export const PLAYER = {
  walkSpeed: 9,
  runSpeed: 13,
  radius: 0.7,
  maxHealth: 100,
  punchDamage: 25,
  shootDamage: 34,
  ammoStart: 60,
};

export const CAR = {
  maxSpeed: 42,       // m/s, arcade feel
  accel: 22,
  brake: 34,
  steer: 1.9,
  reverseSpeed: 12,
};

export const ECONOMY = {
  coinValue: 50,
  taxiFare: 60,
  totalCoins: 12,
};

// Deterministic RNG (mulberry32) — same seed, same city, same traffic.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// The seven story missions. `target` is a world position; `kind` tells the
// mission system what counts as progress.
export const MISSIONS = [
  {
    id: 1, name: 'First Job', pay: 150, kind: 'goto',
    brief: 'Dani is back in Solmar Bay. Drive to the docks and meet Rico.',
    target: [-180, -150], hint: 'Follow the gold beacon to the docks.',
  },
  {
    id: 2, name: "Lila's Letter", pay: 200, kind: 'goto',
    brief: 'Lila left a letter at the cafe. Walk over and pick it up.',
    target: [90, -60], hint: 'The cafe is on the east side, past the plaza.',
  },
  {
    id: 3, name: 'Taxi Shift', pay: 350, kind: 'fares',
    brief: 'Earn cash the honest way: pick up 3 fares around the city.',
    target: [-30, 60], hint: 'Drive to a fare marker, wait for the rider, then drive them home.',
  },
  {
    id: 4, name: 'The Getaway', pay: 500, kind: 'escape',
    brief: 'The Coral Kings tipped off the cops. Lose a 3-star wanted level, then reach the safehouse.',
    target: [180, 150], hint: 'Outrun the police until the stars fade, then go to the safehouse.',
  },
  {
    id: 5, name: 'Coral Kings Drop', pay: 800, kind: 'goto',
    brief: 'Deliver the package to the warehouse — and keep the cops off your tail.',
    target: [-150, 120], hint: 'The warehouse is in the north-west corner.',
  },
  {
    id: 6, name: 'Coin Run', pay: 1200, kind: 'coins',
    brief: 'Six sunset coins are hidden around Solmar Bay. Find them all.',
    target: [0, 0], hint: 'Coins glow gold. Check the beach, the plaza and the rooftops\' edges.',
  },
  {
    id: 7, name: "Buy Lila's Freedom", pay: 2500, kind: 'finale',
    brief: 'You have the money. Drive to the Coral Kings compound and buy Lila back.',
    target: [150, -120], hint: 'The compound is in the south-east. Finish this.',
  },
];

export const RADIO_STATIONS = [
  { name: 'SOLMAR FM', desc: 'Sunset synth — warm pads and slow arpeggios' },
  { name: 'CORAL BEATS', desc: 'Driving bass — punchy synthwave for the chase' },
  { name: 'PALM RADIO', desc: 'Late-night lo-fi — soft keys and vinyl crackle' },
];
