// Solmar Bay — shared tuning: one place for every number the game runs on.
// The city is a sunset grid: sandy ground, dark asphalt roads every 40 units,
// two plazas, and a docks strip with a lighthouse at the south edge.

export const WORLD = {
  half: 200, // ground plane is 400 x 400, centred on the origin
  roadStep: 40, // distance between neighbouring road centrelines
  roadHalf: 6, // half the width of a road
  roadLines: [-160, -120, -80, -40, 0, 40, 80, 120, 160],
  waterAt: 200, // the sea starts beyond this z; the docks pier reaches into it
  docksAt: 172, // z where the docks strip begins
};

export const PLAZAS = {
  sol: { x: 0, z: 0, half: 18, name: 'Plaza del Sol' },
  coral: { x: 80, z: 80, half: 16, name: 'Coral Plaza' },
};

export const DOCKS = {
  lighthouse: { x: 120, z: 186 },
  boat: { x: 40, z: 196 },
  pier: { x: 40, z: 172, width: 14, length: 30 },
};

export const ECONOMY = {
  startCash: 250,
  coinValue: 25,
  fareBase: 40,
  farePerMetre: 0.35,
  goalCash: 2600, // Lila's freedom
};

export const PLAYER_TUNING = {
  walkSpeed: 6,
  sprintSpeed: 10,
  accel: 40,
  turnSpeed: 9,
  radius: 0.7,
  health: 100,
  punchRange: 2.2,
  punchArc: 1.1,
  punchDamage: 34,
  punchCooldown: 0.45,
};

export const CAR_TUNING = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 34,
  maxReverse: 10,
  turnRate: 1.9,
  grip: 6,
  health: 100,
};

export const WANTED_TUNING = {
  heatPerStar: 20,
  maxHeat: 100,
  decayHiding: 3.5, // heat per second while hidden
  decaySeen: 0.4, // heat per second while a cop can see Dani
  hideRange: 30, // a cop must have closed within this to count as "seen" before hiding counts
  heatStealCar: 18,
  heatPunchPed: 14,
  heatPunchCop: 40,
  heatRamCop: 22,
  bustTouchSeconds: 2.5, // a cop touching Dani this long busts him
  copSpeed: 16, // a touch faster than Dani's sprint, slower than a car
  copRamDamage: 6,
  maxCops: 5,
  // A cop that rams must back off briefly, or the bust clock fills instantly.
  ramCooldown: 1,
};

export const CAMERA = {
  walkDistance: 11,
  walkHeight: 6.5,
  driveDistance: 12,
  driveHeight: 6,
  chaseDistance: 17,
  chaseHeight: 9,
  fov: 62,
  shakePunch: 0.25,
  shakeBump: 0.5,
};

export const SAVE_KEY = 'solmar-bay-save-v2';
export const SAVE_KEY_V1 = 'solmar-bay-save-v1';

export const RADIO_STATIONS = [
  { id: 'baywave', name: 'BAYWAVE FM', genre: 'Synthwave', bpm: 112 },
  { id: 'palma', name: 'PALMA FM', genre: 'Reggae', bpm: 76 },
  { id: 'coral', name: 'CORAL FM', genre: 'Latin', bpm: 96 },
  { id: 'noche', name: 'NOCHE FM', genre: 'Lo-fi', bpm: 84 },
];

// Seeded random: the city layout is the same every run, so screenshots match.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function distance2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function angleLerp(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
