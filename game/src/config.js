// Solmar Bay — shared constants, seeded random, story data.
// Every number here is part of the game's own design: a coastal city
// on a 5x5 road grid, eight story missions, four radio stations.

export const WORLD = {
  half: 200, // city extends -200..200 on x and z
  roadGap: 80, // roads every 80 units
  roadWidth: 12,
  beachZ: 185, // sand strip starts here
  seaZ: 235,
};

export const ROADS = [-160, -80, 0, 80, 160];

// Seeded RNG so staged screenshots and playtests are deterministic.
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

export const PALETTE = {
  asphalt: 0x2e3138,
  sidewalk: 0x8d9299,
  grass: 0x4d7a45,
  sand: 0xd9c28a,
  sea: 0x2f7fb8,
  buildingA: 0xc9a06a,
  buildingB: 0x7fa3b8,
  buildingC: 0xb87f8a,
  buildingD: 0x8fa06a,
  plaza: 0xb9b3a4,
  carColors: [0xc23b2e, 0x2e6fc2, 0xe8c33a, 0x3aa655, 0xeeeeee, 0x222222, 0x7a4fb5],
};

// The story: Dani Reyes, getaway driver, comes home to Solmar Bay to buy
// his sister Lila's freedom from the Coral Kings. Each mission pays cash;
// the total buys her freedom in the epilogue.
export const MISSIONS = [
  { id: 1, name: 'Pulang Kampung', pay: 150, target: [-160, -80], text: 'Temui Maro di persimpangan barat. Dia butuh sopir.' },
  { id: 2, name: 'Antar Paket', pay: 225, target: [80, -160], text: 'Antar paket ke gudang utara. Jangan ditanya isinya.' },
  { id: 3, name: 'Taksi Malam', pay: 375, target: [-80, 80], text: 'Jadi taksi semalam. Penumpang bayar tunai.' },
  { id: 4, name: 'Utang Lama', pay: 550, target: [160, 0], text: 'Tagih utang dari Bos Kadal di dermaga timur.' },
  { id: 5, name: 'Pelarian', pay: 850, target: [0, 160], text: 'Bawa Lila kabur dari markas Coral Kings.' },
  { id: 6, name: 'Balas Dendam', pay: 1250, target: [-160, 160], text: 'Ambil kembali mobil Dani yang disita.' },
  { id: 7, name: 'Tebusan', pay: 2600, target: [80, 80], text: 'Serahkan uang tebusan di menara Coral Kings.' },
  { id: 8, name: 'Satu Kejar Terakhir', pay: 1000, target: [120, 120], text: 'Lepas dari kejaran polisi, lalu sampai ke plaza utara.' },
];

export const COINS = [
  [-160, -160], [-80, -160], [0, -160], [80, -160], [160, -160],
  [-160, 0], [160, 0], [-160, 160], [0, 160], [160, 160],
  [-80, -80], [80, 80],
];

export const RADIOS = [
  { name: 'SOLMAR FM', hue: 'pop', bpm: 112 },
  { name: 'PELABUHAN 88', hue: 'dangdut', bpm: 96 },
  { name: 'OMBak 101', hue: 'chill', bpm: 76 },
  { name: 'BAYWAVE FM', hue: 'synth', bpm: 128 },
];

export const SAVE_KEY = 'solmar-bay.save.v2';
export const SAVE_VERSION = 2;
