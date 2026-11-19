// Solmar Bay — save game in localStorage. Format v2; a v1 save (cash and
// mission only) migrates up, and a corrupt or out-of-range save is dropped.

import { SAVE_KEY, SAVE_KEY_V1, ECONOMY } from './config.js';

const SAVE_VERSION = 2;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    cash: ECONOMY.startCash,
    missionIndex: 0,
    coins: 0,
    coinsCollected: [],
    muted: false,
    station: 0,
    completed: [],
  };
}

function isValidSave(s) {
  if (!s || typeof s !== 'object') return false;
  if (typeof s.cash !== 'number' || !Number.isFinite(s.cash)) return false;
  if (s.cash < 0 || s.cash > 100000) return false;
  if (!Number.isInteger(s.missionIndex) || s.missionIndex < 0 || s.missionIndex > 8) return false;
  if (!Array.isArray(s.coinsCollected)) return false;
  if (!Number.isInteger(s.coins) || s.coins < 0 || s.coins > 12) return false;
  return true;
}

function migrateV1(raw) {
  // v1 stored only { cash, mission } with no version field.
  const out = defaultSave();
  if (typeof raw.cash === 'number' && Number.isFinite(raw.cash)) {
    out.cash = Math.max(0, Math.min(100000, Math.floor(raw.cash)));
  }
  if (Number.isInteger(raw.mission) && raw.mission >= 0 && raw.mission <= 8) {
    out.missionIndex = raw.mission;
  }
  return out;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === SAVE_VERSION && isValidSave(parsed)) return parsed;
      if (parsed.version === SAVE_VERSION && !isValidSave(parsed)) return defaultSave();
    }
    const v1 = localStorage.getItem(SAVE_KEY_V1);
    if (v1) {
      const parsed = JSON.parse(v1);
      const migrated = migrateV1(parsed);
      if (isValidSave(migrated)) {
        saveGame(migrated);
        localStorage.removeItem(SAVE_KEY_V1);
        return migrated;
      }
    }
  } catch (e) {
    // Corrupt save: start fresh rather than crash.
  }
  return defaultSave();
}

export function saveGame(state) {
  try {
    const data = {
      version: SAVE_VERSION,
      cash: Math.floor(state.cash),
      missionIndex: state.missionIndex,
      coins: state.coins,
      coinsCollected: state.coinsCollected.slice(),
      muted: !!state.muted,
      station: state.station,
      completed: (state.completed || []).slice(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(SAVE_KEY_V1);
  } catch (e) { /* storage unavailable */ }
}
