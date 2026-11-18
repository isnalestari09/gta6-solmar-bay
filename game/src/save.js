// localStorage save / load. One key, one small JSON object, written on
// every meaningful change (mission complete, coin collected, cash earned).
// Revision 2: save format v2. Old v1 saves are migrated automatically —
// the v1 key is read once, re-saved under v2, then removed.

const KEY = 'solmar-bay.save.v2';
const LEGACY_KEY = 'solmar-bay.save.v1';

export function defaultSave() {
  return {
    version: 2,
    cash: 0,
    missionIndex: 0,
    coins: 0,
    coinsCollected: [],
    bestScore: 0,
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return { ...defaultSave(), ...data, version: 2 };
    }
    // Migrate a v1 save, if one exists: same fields, now stamped v2.
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const data = JSON.parse(legacy);
      const migrated = { ...defaultSave(), ...data, version: 2 };
      try { localStorage.setItem(KEY, JSON.stringify(migrated)); } catch { /* ignore */ }
      try { localStorage.removeItem(LEGACY_KEY); } catch { /* ignore */ }
      return migrated;
    }
    return defaultSave();
  } catch {
    return defaultSave();
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); } catch { /* storage unavailable */ }
}
