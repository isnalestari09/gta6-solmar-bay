// Solmar Bay — shared constants. One job: every magic number lives here.
export const WORLD = {
  half: 200,            // playable ground extends -200..200 on x and z
  roadHalf: 5,          // half width of a road
  roadLines: [-120, -60, 0, 60, 120], // road centre lines on both axes
  dockZ: -178,          // pier / lighthouse line (north edge)
  waterZ: -186,         // sea starts here
};

export const ECONOMY = {
  freedomPrice: 2600,   // what Lila's freedom costs — the story goal
  coinValue: 10,
  taxiFare: 60,
  startCash: 0,
};

export const MISSIONS = [
  { id: 1, name: 'Bayview Run', pay: 150, blurb: 'Drive to the bayview marker.' },
  { id: 2, name: "Lila's Note", pay: 200, blurb: 'On foot — pick up the note at the plaza.' },
  { id: 3, name: 'Taxi Rush', pay: 300, blurb: 'Pick up the fare, drop them at the docks.' },
  { id: 4, name: 'Coral Kings', pay: 450, blurb: 'Teach three Coral Kings thugs a lesson.' },
  { id: 5, name: 'Hot Wheels', pay: 600, blurb: 'Steal the coral coupe, bring it to the garage.' },
  { id: 6, name: 'Harbor Lights', pay: 800, blurb: 'Collect 4 crates along the pier.' },
  { id: 7, name: "King's Ransom", pay: 1200, blurb: 'Grab the ransom bag — then lose the cops.' },
  { id: 8, name: 'One Last Chase', pay: 2600, blurb: 'Escape the police — reach the boat at the docks.' },
];

export const WANTED = {
  maxStars: 5,
  heatPerPunch: 22,
  heatPerSteal: 30,
  heatPerCopHit: 12,
  decayPerSec: 6,       // heat shed while hidden
  closeRange: 30,       // a cop must have closed to this range before decay counts
  spawnRadius: 55,      // police spawn this far from the player
  maxCops: 5,
  bustTouchSec: 1.6,    // cop touching the player on foot this long = busted
};

export const PLAYER = {
  walkSpeed: 9,
  sprintSpeed: 15,
  radius: 0.9,
  health: 100,
  punchRange: 2.4,
  punchArc: 1.1,
  punchDamage: 34,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 22,
  brake: 34,
  reverseMax: 12,
  topSpeed: 46,
  steer: 1.9,
  grip: 6.5,
  health: 100,
};

export const CAMERA = {
  height: 7.5,
  distance: 12,
  lookHeight: 1.6,
  shakeDecay: 3.2,
};

export const COLORS = {
  sky: 0xff9a52,
  fog: 0xffb37a,
  ground: 0xd98a4a,
  road: 0x2e2620,
  roadLine: 0xf5e9c8,
  building: 0x8a5a3b,
  buildingRoof: 0x5f3a26,
  windowLit: 0xffd27a,
  windowDark: 0x3a2a22,
  palmTrunk: 0x6b4a2a,
  palmLeaf: 0x2e7d32,
  water: 0x1d5c66,
  sand: 0xe0b070,
  coin: 0xffd21f,
  marker: 0xff3b30,
  police: 0x14181f,
  taxi: 0xffc400,
};

export const STATIONS = [
  { name: 'BAY FM', bpm: 112, root: 55, wave: 'sawtooth', bright: true },
  { name: 'SUNSET 88', bpm: 84, root: 49, wave: 'triangle', bright: false },
  { name: 'CORAL WAVE', bpm: 128, root: 62, wave: 'square', bright: true },
  { name: 'NIGHT DRIVE', bpm: 96, root: 45, wave: 'sine', bright: false },
];

export const COIN_SPOTS = 12;
export const PARKED_CARS = 28;
export const TRAFFIC_CARS = 14;
export const PEDESTRIANS = 26;
export const SAVE_KEY_V2 = 'solmar-bay-save-v2';
export const SAVE_KEY_V1 = 'solmar-bay-save';
