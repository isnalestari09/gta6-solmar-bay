// main.js — Solmar Bay, an original open-world crime game in the spirit of GTA 6.
// Boot, the fixed-step loop, screens (title / playing / paused / dead / complete),
// input, enemies, crime and wanted heat, missions, the save, and the HUD.
// ?seed=N fixes the city. ?shot=start|drive|chase|mission stages a screenshot scene
// and sets window.__shotReady when it is painted.

import * as THREE from '../vendor/three.module.min.js';
import { STEP, MISSIONS, STORY, PLAYER, PALETTE } from './config.js';
import { buildSolmarBayCity, hitsCollider } from './city.js';
import { createPlayer, updatePlayerOnFoot, createChaseCamera, shootAt, buildPlayerMesh } from './player.js';
import { spawnParkedCars, spawnTrafficCars, driveCar, updateTrafficCar, updatePoliceCar, makeCar } from './vehicles.js';
import { spawnPedestrians, updatePedestrians } from './pedestrians.js';
import { createWantedSystem } from './wanted.js';
import { createMissionEngine } from './missions.js';
import { createHud } from './hud.js';
import { createAudioEngine } from './audio.js';
import { loadSave, writeSave, loadBest, writeBest } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261118;
function makeRng(s) {
  let x = s >>> 0;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}
const rng = makeRng(seed);

// --- renderer, sky, light ----------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.skyHorizon);
scene.fog = new THREE.Fog(0xffc98a, 180, 520);
const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
sun.position.set(120, 160, -80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -260;
sun.shadow.camera.right = 260;
sun.shadow.camera.top = 260;
sun.shadow.camera.bottom = -260;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x8ab4d9, 0x5a4a3a, 0.9));

// --- world --------------------------------------------------------------------
const { colliders, landmarks } = buildSolmarBayCity(scene);
const player = createPlayer(scene, 0, 24);
const parkedCars = spawnParkedCars(scene, rng, colliders);
const traffic = spawnTrafficCars(scene, 14, rng);
const pedestrians = spawnPedestrians(scene, 26, rng);
const wanted = createWantedSystem(scene);
const audio = createAudioEngine();
const hud = createHud(document);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
const chaseCamera = createChaseCamera(camera);

// --- state ----------------------------------------------------------------------
const save = loadSave();
let cash = save?.cash ?? 0;
let best = loadBest();
let screen = 'title';
let clockMinutes = 17 * 60 + 20; // golden hour
let missionIndex = save?.missionIndex ?? 0;
let coinsCollected = save?.coins ?? 0;
let enemies = [];
let messageTimer = 0;
let saveTimer = 0;
let sirenTimer = 0;

const missions = createMissionEngine(scene, (kind, text) => {
  hud.setMessage(text);
  if (kind === 'paid') {
    cash += MISSIONS[missions.index]?.reward ?? 0;
    audio.cash();
    writeSave({ cash, missionIndex: missions.index, coins: missions.coins });
  }
  if (kind === 'coin') cash += 50;
  if (kind === 'story') {
    screen = 'complete';
    writeBest(Math.max(best, cash));
  }
});
missions.spawnCoins(scene);
if (save) {
  missions.index = Math.min(missionIndex, MISSIONS.length - 1);
  missions.coins = coinsCollected;
  missions.active = true;
  missions.showObjective();
}
player.cash = cash;

function spawnEnemies(x, z, count) {
  for (let i = 0; i < count; i++) {
    const mesh = buildPlayerMesh();
    mesh.children[0].material = new THREE.MeshLambertMaterial({ color: 0x8a2a3a });
    const ex = x + (rng() - 0.5) * 14;
    const ez = z + (rng() - 0.5) * 14;
    mesh.position.set(ex, 0, ez);
    scene.add(mesh);
    enemies.push({ mesh, x: ex, z: ez, health: 100, angle: 0, hitTimer: 0 });
  }
}

function removeEnemy(e) {
  scene.remove(e.mesh);
  enemies = enemies.filter((x) => x !== e);
}

// --- input ----------------------------------------------------------------------
const keys = new Set();
let mouseDown = false;
let dragging = false;
let lastMouse = { x: 0, y: 0 };
window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if (e.code === 'Enter' && (screen === 'title' || screen === 'dead' || screen === 'complete')) startPlaying();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (screen === 'playing') { screen = 'paused'; showScreen('paused'); }
    else if (screen === 'paused') { screen = 'playing'; showScreen('playing'); }
  }
  if (e.code === 'KeyR' && screen === 'playing') hud.setRadio(audio.nextStation());
  if (e.code === 'KeyM') audio.toggleMute();
  if (e.code === 'KeyE' && screen === 'playing') toggleCar();
  if (e.code === 'KeyF' && screen === 'playing' && !player.inCar) punch();
  if (e.code === 'KeyN' && screen === 'playing') startNextMission();
});
canvas.addEventListener('pointerdown', (e) => {
  audio.unlock();
  mouseDown = true;
  dragging = true;
  lastMouse = { x: e.clientX, y: e.clientY };
  if (screen === 'title') startPlaying();
  else if (screen === 'playing' && !player.inCar) fireWeapon(e);
});
window.addEventListener('pointerup', () => { mouseDown = false; dragging = false; });
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  chaseCamera.yaw -= (e.clientX - lastMouse.x) * 0.005;
  chaseCamera.pitch = Math.max(0.08, Math.min(0.9, chaseCamera.pitch + (e.clientY - lastMouse.y) * 0.003));
  lastMouse = { x: e.clientX, y: e.clientY };
});
window.addEventListener('wheel', (e) => {
  chaseCamera.distance = Math.max(6, Math.min(22, chaseCamera.distance + e.deltaY * 0.01));
});
window.addEventListener('blur', () => keys.clear());
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function readInput() {
  return {
    forward: keys.has('KeyW') || keys.has('ArrowUp'),
    back: keys.has('KeyS') || keys.has('ArrowDown'),
    left: keys.has('KeyA') || keys.has('ArrowLeft'),
    right: keys.has('KeyD') || keys.has('ArrowRight'),
    run: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    jump: keys.has('Space'),
  };
}

function nearestParkedCar() {
  let bestCar = null;
  let bestD = 4.5;
  for (const car of parkedCars) {
    const d = Math.hypot(car.x - player.x, car.z - player.z);
    if (d < bestD) { bestD = d; bestCar = car; }
  }
  return bestCar;
}

function toggleCar() {
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.x = car.x + Math.sin(car.angle + Math.PI / 2) * 3;
    player.z = car.z + Math.cos(car.angle + Math.PI / 2) * 3;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, 0, player.z);
    hud.setMessage('On foot — WASD to move, click to shoot, E to steal a car');
  } else {
    const car = nearestParkedCar();
    if (car) {
      player.inCar = car;
      player.mesh.visible = false;
      wanted.addCrime(20);
      hud.setMessage('Car stolen! The cops noticed — watch the stars.');
      audio.siren(true);
    } else {
      hud.setMessage('No car close by — walk to a parked car and press E.');
    }
  }
}

function punch() {
  audio.punch();
  for (const p of pedestrians) {
    if (p.health > 0 && Math.hypot(p.x - player.x, p.z - player.z) < 2.2) {
      p.health -= PLAYER.punchDamage;
      wanted.addCrime(15);
      if (p.health <= 0) p.mesh.visible = false;
      return;
    }
  }
  for (const e of [...enemies]) {
    if (Math.hypot(e.x - player.x, e.z - player.z) < 2.4) {
      e.health -= PLAYER.punchDamage;
      if (e.health <= 0) {
        removeEnemy(e);
        missions.noteKill();
        wanted.addCrime(20);
      }
      return;
    }
  }
}

function fireWeapon(e) {
  const rect = canvas.getBoundingClientRect();
  const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  const ray = new THREE.Raycaster();
  ray.setFromCamera({ x: nx, y: ny }, camera);
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3();
  ray.ray.intersectPlane(ground, hit);
  if (!hit) return;
  const targets = [
    ...pedestrians.filter((p) => p.health > 0).map((p) => ({ x: p.x, z: p.z, health: p.health, _p: p })),
    ...enemies.map((en) => ({ x: en.x, z: en.z, health: en.health, _e: en })),
  ];
  const shot = shootAt(player, hit, targets, audio);
  if (shot) {
    wanted.addCrime(25);
    if (shot._p) {
      shot._p.health = shot.health;
      if (shot.health <= 0) shot._p.mesh.visible = false;
    }
    if (shot._e) {
      shot._e.health = shot.health;
      if (shot.health <= 0) {
        removeEnemy(shot._e);
        missions.noteKill();
      }
    }
  }
}

function startNextMission() {
  if (!missions.active) {
    missions.start();
    hud.setMission(missions.objective?.text ?? '');
  }
}

function startPlaying() {
  audio.unlock();
  screen = 'playing';
  showScreen('playing');
  if (!missions.active) missions.start();
  hud.setMission(missions.objective?.text ?? 'Free roam — Solmar Bay');
  hud.setMessage(`${STORY.intro}`);
}

function showScreen(name) {
  for (const id of ['title', 'paused', 'dead', 'complete']) {
    document.getElementById(`screen-${id}`).style.display = id === name ? 'flex' : 'none';
  }
  document.getElementById('hud').style.display = name === 'playing' ? 'block' : 'none';
}

// --- minimap state ---------------------------------------------------------------
function minimapState() {
  return {
    player,
    traffic,
    police: wanted.policeCars,
    missionTarget: missions.objective?.x !== undefined
      ? { x: missions.objective.x, z: missions.objective.z } : null,
  };
}

// --- main loop ---------------------------------------------------------------------
let last = performance.now();
let accumulator = 0;
let hudTimer = 0;
let shotFrames = 0;

function step(dt) {
  clockMinutes += dt * 0.6;
  const input = readInput();
  if (game.autoDrive) { input.forward = true; input.backward = false; }
  const target = player.inCar
    ? { x: player.inCar.x, y: 0, z: player.inCar.z }
    : { x: player.x, y: player.y, z: player.z };

  if (screen === 'playing') {
    if (player.inCar) {
      const speed = driveCar(player.inCar, input, dt, colliders);
      player.x = player.inCar.x;
      player.z = player.inCar.z;
      if (Math.abs(speed) > 4) audio.engine(Math.abs(speed) / 46);
      chaseCamera.yaw += ((player.inCar.angle + Math.PI) - chaseCamera.yaw) * 0; // keep free orbit
    } else {
      updatePlayerOnFoot(player, input, chaseCamera.yaw, dt, colliders);
    }
    // Traffic and pedestrians keep the city alive.
    for (const car of traffic) updateTrafficCar(car, dt, target, colliders);
    updatePedestrians(pedestrians, dt, target, wanted.stars > 0);
    // Police chase.
    wanted.update(dt, target, colliders, rng);
    for (const car of wanted.policeCars) {
      const d = updatePoliceCar(car, dt, target, colliders);
      if (d < 3.5 && player.inCar) {
        player.health -= dt * 4;
        if (player.health <= 0) { player.health = 0; screen = 'dead'; showScreen('dead'); }
      }
    }
    sirenTimer -= dt;
    if (wanted.stars > 0 && sirenTimer <= 0) { audio.siren(true); sirenTimer = 2.2; }
    // Enemies hunt the player during fight missions.
    for (const e of [...enemies]) {
      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d < 26) {
        e.angle = Math.atan2(dx, dz);
        e.x += (dx / d) * 6 * dt;
        e.z += (dz / d) * 6 * dt;
        e.mesh.position.set(e.x, 0, e.z);
        e.mesh.rotation.y = e.angle;
        e.hitTimer -= dt;
        if (d < 1.8 && e.hitTimer <= 0) {
          player.health -= 8;
          e.hitTimer = 1;
          if (player.health <= 0) { player.health = 0; screen = 'dead'; showScreen('dead'); }
        }
      }
    }
    // Mission triggers: spawn enemies when a fight objective starts.
    const o = missions.objective;
    if (o?.type === 'eliminate' && enemies.length === 0 && missions.kills === 0) {
      spawnEnemies(o.x, o.z, o.count || 2);
    }
    // Coins and mission progress.
    cash += missions.collectCoins(target);
    const reward = missions.check({ player, wanted });
    if (reward) cash += reward;
    player.cash = cash;
    // Save every ten seconds of play.
    saveTimer += dt;
    if (saveTimer > 10) {
      saveTimer = 0;
      writeSave({ cash, missionIndex: missions.index, coins: missions.coins });
    }
  } else {
    // The city idles behind the title screen.
    for (const car of traffic) updateTrafficCar(car, dt, target, colliders);
    updatePedestrians(pedestrians, dt, target, false);
  }

  // Sun sinks slowly toward sunset as the clock runs.
  const sunAngle = (clockMinutes / 1440) * Math.PI * 2;
  sun.position.set(Math.cos(sunAngle) * 200, 120 + Math.sin(sunAngle) * 60, -80);
  chaseCamera.update(target, dt);
  renderer.render(scene, camera);

  hudTimer += dt;
  if (hudTimer > 0.12) {
    hudTimer = 0;
    hud.setHealth(player.health);
    hud.setCash(cash);
    hud.setAmmo(player.ammo);
    hud.setSpeed(player.inCar ? Math.abs(player.inCar.speed) * 3.6 : 0);
    hud.setWanted(wanted.stars);
    hud.setClock(clockMinutes);
    hud.setMission(missions.objective?.text ?? 'Free roam — Solmar Bay');
    hud.drawMinimap(minimapState());
  }
  void messageTimer;
}

function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  accumulator += dt;
  let n = 0;
  while (accumulator >= STEP && n < 5) {
    step(STEP);
    accumulator -= STEP;
    n += 1;
  }
  // In screenshot mode, keep the loop running so the car drives, the police
  // chase and the HUD updates, then signal readiness after ~1.5 seconds.
  if (shot) {
    shotFrames += 1;
    if (shotFrames > 90 && !window.__shotReady) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}

// --- boot ----------------------------------------------------------------------------
document.getElementById('title-story').textContent = STORY.intro;
document.getElementById('title-best').textContent = best > 0 ? `Best cash: $${best.toLocaleString('en-US')}` : '';
hud.setRadio(audio.stationName);
hud.setCash(cash);
hud.setHealth(player.health);
hud.setAmmo(player.ammo);
hud.setWanted(0);
showScreen('title');

const game = {
  player, camera: chaseCamera, wanted, missions, traffic, police: wanted.policeCars,
  parkedCars, colliders, hud, enemies,
  minimapState,
  spawnEnemies,
  screen: 'title',
};
window.__game = game;

if (shot) {
  // Stage the screenshot, switch the visible screen to match it (title overlay
  // for the cover, HUD for the gameplay shots), then let the normal loop run
  // so the scene is alive when the screenshot is taken.
  stageShot(shot, game);
  screen = game.screen;
  showScreen(game.screen);
  requestAnimationFrame(frame);
} else {
  requestAnimationFrame(frame);
}
