// Solmar Bay — saving. One job: persist progress in localStorage, schema v2,
// migrating a v1 save (which only kept cash and mission) when it is found.
import { SAVE_KEY_V1, SAVE_KEY_V2 } from './config.js';

export function defaultSave() {
  return {
    version: 2,
    cash: 0,
    coins: 0,
    missionIndex: 0, // next mission to start (0..8); 8 means the story is done
    completed: [],
    bestChase: 0,
    muted: false,
    station: 0,
  };
}

export function loadSave() {
  try {
    const raw2 = localStorage.getItem(SAVE_KEY_V2);
    if (raw2) {
      const data = JSON.parse(raw2);
      return { ...defaultSave(), ...data, version: 2 };
    }
    // v1 migration: v1 kept only { cash, mission } under the old key.
    const raw1 = localStorage.getItem(SAVE_KEY_V1);
    if (raw1) {
      const old = JSON.parse(raw1);
      const migrated = {
        ...defaultSave(),
        cash: Number(old.cash) || 0,
        missionIndex: Number(old.mission) || 0,
      };
      localStorage.setItem(SAVE_KEY_V2, JSON.stringify(migrated));
      localStorage.removeItem(SAVE_KEY_V1);
      return migrated;
    }
  } catch {
    // Corrupt storage: start fresh rather than crash the game.
  }
  return defaultSave();
}

export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY_V2, JSON.stringify({ ...save, version: 2 }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY_V2);
    localStorage.removeItem(SAVE_KEY_V1);
  } catch {
    // ignore
  }
}
