// Save / load through localStorage. Version 2 migrates a v1 save by
// keeping cash and completed missions and resetting the rest.

import { SAVE_KEY, SAVE_VERSION } from './config.js';

export function defaultSave() {
  return { version: SAVE_VERSION, cash: 0, mission: 1, coins: [], completed: false, bestScore: 0 };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    if (data.version === 1) {
      return { ...defaultSave(), cash: data.cash || 0, mission: data.mission || 1 };
    }
    if (data.version !== SAVE_VERSION) return defaultSave();
    return { ...defaultSave(), ...data };
  } catch (err) {
    return defaultSave();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
    return true;
  } catch (err) {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (err) { /* storage unavailable */ }
}
