// Solmar Bay — save v2 in localStorage, with a v1 migration.
// v2 adds taxi earnings and best wanted level; v1 only had cash and mission.

import { SAVE_KEY, SAVE_KEY_V1, ECONOMY } from './config.js';

export function defaultSave() {
  return {
    version: 2,
    cash: ECONOMY.startCash,
    missionsDone: 0,
    coinsCollected: 0,
    coinsTaken: [],
    faresDone: 0,
    taxiEarned: 0,
    bestWanted: 0,
    playSeconds: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.version === 2) {
        const merged = { ...defaultSave(), ...data };
        // A hand-edited or corrupt save must never break the game: clamp
        // every number back into its sane range.
        merged.cash = Math.max(0, Math.min(999999, Math.floor(merged.cash) || 0));
        merged.missionsDone = Math.max(0, Math.min(8, Math.floor(merged.missionsDone) || 0));
        merged.coinsCollected = Math.max(0, Math.min(12, Math.floor(merged.coinsCollected) || 0));
        merged.faresDone = Math.max(0, Math.floor(merged.faresDone) || 0);
        merged.taxiEarned = Math.max(0, Math.floor(merged.taxiEarned) || 0);
        merged.bestWanted = Math.max(0, Math.min(5, Math.floor(merged.bestWanted) || 0));
        merged.playSeconds = Math.max(0, Math.floor(merged.playSeconds) || 0);
        if (!Array.isArray(merged.coinsTaken)) merged.coinsTaken = [];
        // A hand-edited save could list coin indices that do not exist;
        // keep only real, unique coin slots (0..11).
        merged.coinsTaken = [...new Set(merged.coinsTaken.filter((i) => Number.isInteger(i) && i >= 0 && i < 12))];
        merged.coinsCollected = Math.min(merged.coinsCollected, merged.coinsTaken.length);
        return merged;
      }
    }
    const old = localStorage.getItem(SAVE_KEY_V1);
    if (old) {
      const v1 = JSON.parse(old);
      const migrated = defaultSave();
      if (typeof v1.cash === 'number') migrated.cash = Math.max(0, Math.min(999999, Math.floor(v1.cash) || 0));
      if (typeof v1.missionsDone === 'number') migrated.missionsDone = Math.max(0, Math.min(8, Math.floor(v1.missionsDone) || 0));
      if (Array.isArray(v1.coinsTaken)) migrated.coinsTaken = [...new Set(v1.coinsTaken.filter((i) => Number.isInteger(i) && i >= 0 && i < 12))];
      migrated.coinsCollected = migrated.coinsTaken.length;
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    // A successful v2 write makes the old v1 slot redundant: drop it so a
    // stale v1 can never shadow the new save on a future migration.
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
