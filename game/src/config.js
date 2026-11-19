// Solmar Bay — shared constants and small helpers.
// Every system reads its numbers from here so the whole game stays in tune.

export const WORLD = {
  size: 420,
  half: 210,
  roadGap: 46,
  blockSize: 34,
  groundColor: 0x9a7b4f,
  roadColor: 0x2e2e33,
  sidewalkColor: 0x8f8a80,
};

export const PLAYER = {
  walkSpeed: 7,
  sprintSpeed: 12.5,
  radius: 0.9,
  punchRange: 2.4,
  punchCooldown: 0.45,
  enterCarRange: 4.5,
};

export const CAR = {
  maxSpeed: 46,
  accel: 17,
  brake: 32,
  reverseMax: 13,
  turnRate: 2.0,
  grip: 6.5,
  health: 100,
  ramDamage: 14,
};

export const WANTED = {
  maxStars: 5,
  heatPerStar: 100,
  decayHiding: 3.2,
  decayNormal: 0.55,
  policePerStar: 1,
  spawnRadiusMin: 38,
  spawnRadiusMax: 62,
  bustTouchSeconds: 1.4, // how long a cop must touch Dani on foot to bust him
  policeRamDamage: 14, // health per second a ramming cop strips from Dani's car
};

export const ECONOMY = {
  startCash: 250,
  coinValue: 25,
  taxiFareMin: 40,
  taxiFareMax: 120,
  bustFine: 0.1,
};

// Chase-camera framing, so the camera feel can be tuned in one place.
export const CAMERA = {
  onFootDist: 12,
  onFootHeight: 5,
  carDist: 16,
  carHeight: 6.5,
  lookHeight: 2.2,
  menuOrbitRadius: 55,
  menuOrbitHeight: 30,
};

export const MISSION_PAYOUTS = [150, 300, 450, 700, 950, 1300, 1800, 2600];

export const SAVE_KEY = 'solmar-bay-save-v2';
export const SAVE_KEY_V1 = 'solmar-bay-save';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const randPick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist2d = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Deterministic-ish id from a seed, for stable placement of parked cars and coins. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
