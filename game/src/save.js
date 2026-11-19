// Solmar Bay — save v2 in localStorage, with a v1 migration.
// v2 adds taxi earnings and best wanted level; v1 only had cash and missions.
// A hand-edited or corrupt save never breaks the game: every number is
// clamped back into its sane range on load.

import { SAVE_KEY, SAVE_KEY_V1 } from './config.js';

export function defaultSave() {
  return {
    version: 2,
    cash: 250,
    missionsDone: 0,
    coinsCollected: 0,
    coinsTaken: [],
    faresDone: 0,
    taxiEarned: 0,
    bestWanted: 0,
    playSeconds: 0,
    lastPlayed: 0,
  };
}

function clampNumber(value, min, max, fallback) {
  const n = Number.isFinite(value) ? Math.floor(value) : fallback;
  return Math.max(min, Math.min(max, n));
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === 2) {
        const merged = { ...defaultSave(), ...data };
        merged.cash = clampNumber(merged.cash, 0, 999999, 250);
        merged.missionsDone = clampNumber(merged.missionsDone, 0, 8, 0);
        merged.coinsCollected = clampNumber(merged.coinsCollected, 0, 12, 0);
        merged.faresDone = clampNumber(merged.faresDone, 0, 9999, 0);
        merged.taxiEarned = clampNumber(merged.taxiEarned, 0, 999999, 0);
        merged.bestWanted = clampNumber(merged.bestWanted, 0, 5, 0);
        merged.playSeconds = clampNumber(merged.playSeconds, 0, 999999, 0);
        if (!Array.isArray(merged.coinsTaken)) merged.coinsTaken = [];
        merged.coinsTaken = merged.coinsTaken.filter((i) => Number.isInteger(i) && i >= 0 && i < 12);
        merged.coinsCollected = merged.coinsTaken.length;
        return merged;
      }
    }
    // v1 migration: cash, missions done and the coins already taken.
    const old = localStorage.getItem(SAVE_KEY_V1);
    if (old) {
      const v1 = JSON.parse(old);
      const migrated = defaultSave();
      if (typeof v1.cash === 'number') migrated.cash = clampNumber(v1.cash, 0, 999999, 250);
      if (typeof v1.missionsDone === 'number') migrated.missionsDone = clampNumber(v1.missionsDone, 0, 8, 0);
      if (Array.isArray(v1.coinsTaken)) {
        migrated.coinsTaken = v1.coinsTaken.filter((i) => Number.isInteger(i) && i >= 0 && i < 12);
        migrated.coinsCollected = migrated.coinsTaken.length;
      }
      return migrated;
    }
  } catch (err) {
    // Corrupt save: start fresh rather than crash the game.
  }
  return defaultSave();
}

export function writeSave(save) {
  try {
    save.version = 2;
    save.lastPlayed = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    // A v2 write makes the v1 key redundant; drop it so an old save can
    // never shadow the new one.
    localStorage.removeItem(SAVE_KEY_V1);
    return true;
  } catch (err) {
    return false;
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY_V1);
  } catch (err) {
    // Storage may be unavailable in some sandboxes; the game still runs.
  }
}
