// localStorage save / load. One key, one small JSON object, written on
// every meaningful change (mission complete, coin collected, cash earned).

const KEY = 'solmar-bay.save.v1';

export function defaultSave() {
  return {
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
    if (!raw) return defaultSave();
    const data = JSON.parse(raw);
    return { ...defaultSave(), ...data };
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
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
