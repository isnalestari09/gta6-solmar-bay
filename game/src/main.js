// Solmar Bay — bootstrap and the main loop. Wires city, vehicles, pedestrians,
// player, wanted, missions, HUD, audio and save into one playable game.

import * as THREE from 'three';
import { WORLD, CAR, CAMERA, ECONOMY, clamp, dist2d, rand, randPick } from './config.js';
import { buildCity, resolveCollisions } from './city.js';
import { spawnParkedCars, spawnTraffic, updateTraffic, driveCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, scarePedestrians } from './pedestrians.js';
import { Player } from './player.js';
import { Wanted } from './wanted.js';
import { MissionRunner, MISSIONS } from './missions.js';
import {
  initHud, updateHud, showToast, showBanner, showMenu, hideMenu,
  showPause, showBusted,
} from './hud.js';
import {
  initAudio, resumeAudio, updateAudio, setStation, cycleStation, toggleMute,
  playCoin, playPunch, playCrash, playCash, playMission, playStep, playFail, playBusted, playEnterCar,
  setEngine, setSiren, currentStation,
} from './audio.js';
import { loadSave, writeSave, wipeSave } from './save.js';
import { Input, initInput } from './input.js';
import { installDebugHooks, stageShot } from './shots.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffb36a);
scene.fog = new THREE.Fog(0xffb36a, 180, 420);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const sun = new THREE.DirectionalLight(0xffe0b0, 1.9);
sun.position.set(120, 180, 60);
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xffd9a0, 0x3a4a5a, 0.9));

// ---------------------------------------------------------------- game state
const save = loadSave();
const game = {
  cash: save.cash,
  missionsDone: save.missionsDone,
  coinsCollected: save.coinsCollected,
  faresDone: save.faresDone,
  taxiEarned: save.taxiEarned,
  bestWanted: save.bestWanted,
  playSeconds: save.playSeconds,
  coins: [],
  parked: [],
  traffic: [],
  taxi: { active: false, dest: null, passenger: null, fare: 0 },
  errors: [],
  paused: false,
  started: false,
  busted: false,
  camYaw: Math.PI,
  camPitch: 0.32,
  camDist: 13,
  shake: 0,
  shotCamera: null,
  pendingShot: null,
  audioMuted: false,
  get station() {
    return currentStation();
  },
};

const city = buildCity(scene);
game.coins = city.coins;
for (let i = 0; i < game.coins.length; i++) {
  if (save.coinsTaken.includes(i)) game.coins[i].taken = true;
}
const { parked, taxi } = spawnParkedCars(scene);
game.parked = parked;
game.taxiCar = taxi;
game.traffic = spawnTraffic(scene);
game.peds = spawnPedestrians(scene);
game.player = new Player(scene);
game.wanted = new Wanted(scene, city.colliders);
game.missions = new MissionRunner((kind, data) => onMissionEvent(kind, data));
game.hideMenuForShot = () => {
  hideMenu();
  game.started = true;
};

const TAXI_SPOTS = [
  { x: -138, z: 92 }, { x: 138, z: -46 }, { x: -46, z: 138 }, { x: 92, z: -138 },
  { x: -138, z: -138 }, { x: 138, z: 138 }, { x: 0, z: -92 }, { x: -92, z: 0 },
];

function onMissionEvent(kind, data) {
  if (kind === 'mission-start') {
    showToast(`MISSION: ${data.name} — ${data.briefing}`, 4200);
    showBanner(`MISSION ${data.id}: ${data.name}`);
    playMission();
  } else if (kind === 'mission-step') {
    showToast(data.text, 3000);
    playStep();
  } else if (kind === 'mission-complete') {
    showBanner(`MISSION COMPLETE — +$${data.payout}`);
    showToast(`Mission complete! +$${data.payout}`, 3600);
    playCash();
    persist();
  } else if (kind === 'mission-fail') {
    showBanner(`MISSION FAILED — ${data.reason}. Cash kept. Press M to retry.`);
    playFail();
  }
}

function persist() {
  game.bestWanted = Math.max(game.bestWanted, game.wanted.stars);
  writeSave({
    cash: game.cash,
    missionsDone: game.missionsDone,
    coinsCollected: game.coinsCollected,
    coinsTaken: game.coins.map((c, i) => (c.taken ? i : -1)).filter((i) => i >= 0),
    faresDone: game.faresDone,
    taxiEarned: game.taxiEarned,
    bestWanted: game.bestWanted,
    playSeconds: Math.round(game.playSeconds),
  });
}

// ---------------------------------------------------------------- taxi fares
function startTaxiFare() {
  const dest = randPick(TAXI_SPOTS);
  game.taxi.active = true;
  game.taxi.dest = dest;
  game.taxi.fare = Math.round(rand(ECONOMY.taxiFareMin, ECONOMY.taxiFareMax));
  showToast(`Taxi fare: take your passenger to the marker — $${game.taxi.fare}`, 3200);
}

function updateTaxi(dt) {
  if (!game.taxi.active || !game.taxi.dest) return;
  if (!game.player.inCar || game.player.inCar !== game.taxiCar) return;
  if (dist2d(game.player.x, game.player.z, game.taxi.dest.x, game.taxi.dest.z) < 8) {
    game.cash += game.taxi.fare;
    game.taxiEarned += game.taxi.fare;
    game.faresDone += 1;
    showBanner(`FARE PAID — +$${game.taxi.fare}`);
    playCash();
    game.taxi.active = false;
    game.taxi.dest = null;
    persist();
  }
}

// ---------------------------------------------------------------- menu flow
initHud();
initInput(canvas);

function startGame(fresh) {
  if (fresh) {
    wipeSave();
    const d = loadSave();
    game.cash = d.cash;
    game.missionsDone = 0;
    game.coinsCollected = 0;
    game.faresDone = 0;
    game.taxiEarned = 0;
    game.bestWanted = 0;
    for (const c of game.coins) c.taken = false;
  }
  initAudio();
  resumeAudio();
  hideMenu();
  game.started = true;
  game.paused = false;
  showToast('Welcome to Solmar Bay. Press M for your next mission.', 3600);
}

document.getElementById('btn-new').addEventListener('click', () => startGame(true));
document.getElementById('btn-continue').addEventListener('click', () => startGame(false));
document.getElementById('btn-resume').addEventListener('click', () => {
  game.paused = false;
  showPause(false);
  resumeAudio();
});
document.getElementById('btn-busted').addEventListener('click', () => {
  showBusted(false);
  game.busted = false;
  game.player.teleport(92, 70, Math.PI);
  game.wanted.clear();
});

showMenu(save.missionsDone > 0 || save.cash !== ECONOMY.startCash);
installDebugHooks(game);
if (game.pendingShot !== null) {
  const n = game.pendingShot;
  game.pendingShot = null;
  stageShot(game, n);
  game.started = true;
  initAudio();
}

// ---------------------------------------------------------------- per-frame
const clock = new THREE.Clock();
let saveTimer = 0;

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of game.parked) {
    const d = dist2d(game.player.x, game.player.z, car.x, car.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function tryEnterCar() {
  if (game.player.inCar) {
    const car = game.player.inCar;
    game.player.exitCar();
    playEnterCar();
    return;
  }
  const car = nearestCar(4.5);
  if (!car) return;
  game.player.enterCar(car);
  car.stolen = true;
  playEnterCar();
  if (car.isTaxi) {
    showToast('You are driving the taxi. Fares will come to you — drive to the marker.', 3200);
    if (!game.taxi.active) startTaxiFare();
  } else if (!car.stolenBefore) {
    car.stolenBefore = true;
    game.wanted.addHeat(60);
    showToast('Car stolen! The law is watching.', 2200);
  }
}

function tryPunch() {
  if (!game.player.punch()) return;
  playPunch();
  const reach = game.player.punchReach();
  // The crowd scatters from a punch even when nobody is in range.
  scarePedestrians(game.peds, game.player.x, game.player.z);
  for (const p of game.peds) {
    if (dist2d(p.x, p.z, reach.x, reach.z) < 1.6) {
      p.targetX = p.x + (p.x - game.player.x) * 4;
      p.targetZ = p.z + (p.z - game.player.z) * 4;
      game.wanted.addHeat(45);
      showToast('Assault! Wanted level rising.', 2000);
      return;
    }
  }
  for (const pol of game.wanted.police) {
    if (dist2d(pol.x, pol.z, reach.x, reach.z) < 2.4) {
      game.wanted.addHeat(80);
      showToast('You hit a cop! That was bold.', 2000);
      return;
    }
  }
}

function collectCoins() {
  for (let i = 0; i < game.coins.length; i++) {
    const c = game.coins[i];
    if (c.taken) continue;
    c.mesh.rotation.y += 0.03;
    c.mesh.position.y = 1.1 + Math.sin(performance.now() / 300 + i) * 0.15;
    if (dist2d(game.player.x, game.player.z, c.x, c.z) < 2.2) {
      c.taken = true;
      c.mesh.visible = false;
      game.coinsCollected += 1;
      game.cash += ECONOMY.coinValue;
      playCoin();
      showToast(`Sunset coin! +$${ECONOMY.coinValue}  (${game.coinsCollected}/12)`, 2000);
      persist();
    }
  }
}

function updateCamera(dt) {
  game.camYaw -= Input.mouseDX * 0.005;
  game.camPitch = clamp(game.camPitch + Input.mouseDY * 0.003, 0.08, 1.1);
  const inCar = !!game.player.inCar;
  const dist = inCar ? CAMERA.carDist : CAMERA.onFootDist;
  const height = inCar ? CAMERA.carHeight : CAMERA.onFootHeight;
  const px = game.player.x;
  const pz = game.player.z;
  const tx = px - Math.sin(game.camYaw) * dist;
  const tz = pz - Math.cos(game.camYaw) * dist;
  const shakeAmp = game.shake > 0 ? game.shake * 0.5 : 0;
  const sx = (Math.random() - 0.5) * shakeAmp;
  const sy = (Math.random() - 0.5) * shakeAmp;
  if (game.shotCamera) {
    camera.position.set(
      game.shotCamera.pos[0] + sx, game.shotCamera.pos[1] + sy, game.shotCamera.pos[2]
    );
    camera.lookAt(game.shotCamera.look[0], game.shotCamera.look[1], game.shotCamera.look[2]);
    return;
  }
  camera.position.set(tx + sx, height + sy, tz);
  camera.lookAt(px, CAMERA.lookHeight, pz);
  game.shake = Math.max(0, game.shake - dt * 2.2);
}

function bustPlayer() {
  const fine = Math.floor(game.cash * ECONOMY.bustFine);
  game.cash -= fine;
  game.busted = true;
  game.wanted.clear();
  if (game.player.inCar) {
    const car = game.player.inCar;
    car.health = CAR.health;
    game.player.exitCar();
  }
  game.missions.fail(game, 'Busted by the police');
  showBusted(true, `BUSTED — the Solmar Bay PD took $${fine} as a fine.`);
  playBusted();
  persist();
}

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!game.started) {
    // Menu backdrop: slow orbit around Plaza del Sol.
    const t = performance.now() / 1000;
    camera.position.set(
      92 + Math.sin(t * 0.08) * CAMERA.menuOrbitRadius,
      CAMERA.menuOrbitHeight,
      92 + Math.cos(t * 0.08) * CAMERA.menuOrbitRadius
    );
    camera.lookAt(92, 2, 92);
    renderer.render(scene, camera);
    Input.clearFrame();
    return;
  }
  if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) {
    game.paused = !game.paused;
    showPause(game.paused);
  }
  if (game.paused || game.busted) {
    renderer.render(scene, camera);
    Input.clearFrame();
    return;
  }
  game.playSeconds += dt;
  saveTimer += dt;
  if (saveTimer > 15) {
    saveTimer = 0;
    persist();
  }

  // Keys that act once per press.
  if (Input.wasPressed('KeyE')) tryEnterCar();
  if (Input.wasPressed('KeyF') || Input.wasPressed('Space')) tryPunch();
  if (Input.wasPressed('KeyM')) {
    if (!game.missions.active) {
      if (game.missionsDone >= 8) {
        showToast('Story complete! Free roam — coins, fares and chaos await.', 3000);
      } else {
        game.missions.start(game.missionsDone, game);
      }
    }
  }
  if (Input.wasPressed('KeyR')) {
    const st = cycleStation();
    showToast(`Radio: ${st.name} — ${st.desc}`, 1800);
  }
  if (Input.wasPressed('Digit1')) setStation(0);
  if (Input.wasPressed('Digit2')) setStation(1);
  if (Input.wasPressed('Digit3')) setStation(2);
  if (Input.wasPressed('Digit4')) setStation(3);
  if (Input.wasPressed('KeyN')) {
    game.audioMuted = toggleMute();
    showToast(game.audioMuted ? 'Sound muted' : 'Sound on', 1500);
  }
  if (Input.wasPressed('KeyT') && game.player.inCar === game.taxiCar && !game.taxi.active) {
    startTaxiFare();
  }

  // Movement.
  if (game.player.inCar) {
    const axis = Input.driveAxis();
    const crashed = driveCar(game.player.inCar, axis.throttle, axis.steer, dt, city.colliders);
    if (crashed) {
      game.shake = 0.7;
      playCrash();
      game.player.inCar.health -= 6;
      if (game.player.inCar.health <= 0) bustPlayer();
    }
    // Ramming traffic or peds raises heat.
    for (const t of game.traffic) {
      if (dist2d(game.player.x, game.player.z, t.x, t.z) < 3.2 && Math.abs(game.player.inCar.speed) > 8) {
        game.wanted.addHeat(25);
      }
    }
    setEngine(Math.abs(game.player.inCar.speed) / CAR.maxSpeed, true);
  } else {
    game.player.update(dt, Input, game.camYaw, city.colliders);
    setEngine(0, false);
  }

  updateTraffic(game.traffic, dt, city.colliders, game.player.inCar);
  updatePedestrians(game.peds, dt, game.player.x, game.player.z, game.wanted.stars, city.colliders, game.parked);
  // During the mission-8 epilogue chase the five-star wanted level is
  // scripted and held, so the chase cannot evaporate mid-run.
  const holdHeat = game.missions.active && game.missions.currentStep?.type === 'chase';
  const wanted = game.wanted.update(dt, game.player, game.parked, { holdHeat });
  if (wanted.busted) bustPlayer();
  setSiren(game.wanted.stars > 0);
  collectCoins();
  updateTaxi(dt);
  game.missions.update(game, dt);
  updateAudio(dt);
  updateCamera(dt);
  updateHud(game);
  renderer.render(scene, camera);
  Input.clearFrame();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

frame();
