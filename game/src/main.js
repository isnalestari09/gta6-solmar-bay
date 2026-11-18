// Solmar Bay — entry point. Wires the world together: renderer, camera,
// lights, city, cars, pedestrians, wanted system, missions, HUD, save and
// the fixed-step game loop. The game runs offline from static files only.
// Revision 2: camera shake on collisions, mission-fail recording on death,
// Shift sprint on foot, the new coin-pickup SFX, and HUD mission progress.

import * as THREE from 'three';
import { WORLD, PLAYER, ECONOMY, MISSIONS, RADIO_STATIONS } from './config.js';
import { Input } from './input.js';
import { Radio } from './audio.js';
import { City } from './city.js';
import { VehicleManager } from './vehicles.js';
import { PedestrianManager } from './pedestrians.js';
import { Wanted } from './wanted.js';
import { Player } from './player.js';
import { MissionManager } from './missions.js';
import { Hud } from './hud.js';
import { loadSave, writeSave } from './save.js';
import { parseShot, applyShot } from './shots.js';

const $ = (id) => document.getElementById(id);

export class Game {
  constructor(seed = 1) {
    this.seed = seed;
    this.input = new Input();
    this.radio = new Radio();
    this.save = loadSave();
    this.state = 'title'; // title | playing | paused | dead | complete
    this.cameraMode = 'foot';
    this.clock = 8 * 60; // minutes since midnight
    this.cash = this.save.cash || 0;
    this.coinsCollected = new Set(this.save.coinsCollected || []);
    this.coinMeshes = [];
    this._hitCooldown = 0;
    this._punchCooldown = 0;
    this._shotCooldown = 0;
    this._shake = 0; // revision 2: camera-shake magnitude, decays each frame

    this._renderer();
    this._lights();
    this.city = new City(this.scene, seed);
    this.vehicles = new VehicleManager(this.scene, this.city, seed);
    this.peds = new PedestrianManager(this.scene, this.city, seed);
    this.player = new Player(this.scene);
    this.wanted = new Wanted(this.vehicles, this.radio);
    this.hud = new Hud();
    this.missions = new MissionManager(this.scene, this.city, this.radio, (t, p) => this._onEvent(t, p));
    this.missions.startMission(this.save.missionIndex || 0);
    this._coins();
    this._cameraSetup();
    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _renderer() {
    this.renderer = new THREE.WebGLRenderer({ canvas: $('game'), antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d6);
    this.scene.fog = new THREE.Fog(0x87b5d6, 180, 420);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  }

  _lights() {
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    sun.position.set(120, 180, 60);
    sun.castShadow = true;
    sun.shadow.camera.left = -220; sun.shadow.camera.right = 220;
    sun.shadow.camera.top = 220; sun.shadow.camera.bottom = -220;
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xbfd4e6, 0.7));
  }

  _coins() {
    const geo = new THREE.CylinderGeometry(0.9, 0.9, 0.18, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd54a });
    this.city.coinSpots.forEach((spot, i) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(spot.x, 1.4, spot.z);
      mesh.userData.index = i;
      this.scene.add(mesh);
      this.coinMeshes.push(mesh);
    });
  }

  _cameraSetup() {
    this._camPos = new THREE.Vector3(0, 8, 30);
    this._camLook = new THREE.Vector3(0, 1, 0);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
  }

  _resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- screens ----------------------------------------------------------
  showTitleScreen() {
    this.state = 'title';
    this.hud.showScreen('title', 'SOLMAR BAY',
      'Dani Reyes is back. The Coral Kings hold his sister Lila — buy her freedom, one job at a time.',
      'Press Enter to start · WASD move · E steal a car · F punch · Click shoot');
  }

  startPlaying() {
    this.state = 'playing';
    this.hud.hideScreen();
    this.radio.ensure();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hud.showScreen('pause', 'PAUSED', 'Solmar Bay waits for you.', 'Press P to resume · R to restart the run');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.hideScreen();
  }

  die() {
    this.missions.fail(); // revision 2: record the failure; cash is kept
    this.state = 'dead';
    this.hud.showScreen('dead', 'WASTED',
      'Dani went down in Solmar Bay. The Coral Kings keep Lila — for now.',
      'Press R to try again');
  }

  completeStory() {
    this.state = 'complete';
    this.hud.showScreen('complete', 'LILA IS FREE',
      `Dani paid the price and brought his sister home. Final cash: $${this.cash.toLocaleString()}.`,
      'Press R to play again');
  }

  // --- events -----------------------------------------------------------
  _onEvent(type, payload) {
    if (type === 'cash') {
      this.cash += payload.amount;
      this.hud.toast(`+$${payload.amount} — ${payload.why}`);
      this.radio.cash();
      this._autosave();
    } else if (type === 'mission-complete') {
      this.hud.toast(`Mission complete: ${payload.mission.name}`);
    } else if (type === 'mission-failed') {
      this.hud.toast(`Mission failed: ${payload.mission.name} — cash kept, press N to retry it.`);
    } else if (type === 'mission-retry') {
      this.hud.toast(`Retrying: ${payload.mission.name}`);
    } else if (type === 'story-complete') {
      this.completeStory();
    } else if (type === 'save') {
      this._autosave();
    }
  }

  _autosave() {
    this.save.cash = this.cash;
    this.save.missionIndex = Math.min(this.missions.index, MISSIONS.length - 1);
    this.save.coinsCollected = [...this.coinsCollected];
    writeSave(this.save);
  }

  // --- per-frame update ---------------------------------------------------
  update(dt) {
    this.clock = (this.clock + dt * 0.5) % (24 * 60); // game time runs 30x
    this.vehicles.updateTraffic(dt);
    this._updateCoins(dt);
    this.peds.update(dt, this.player.inCar ? this.player.inCar.pos : null);

    // Screens: Enter starts, P resumes, R restarts after death / completion.
    if (this.state === 'title' && this.input.pressed('Enter')) {
      this.startPlaying();
      this.input.endFrame();
      return;
    }
    if (this.state === 'paused' && this.input.pressed('KeyP')) {
      this.resume();
      this.input.endFrame();
      return;
    }
    if ((this.state === 'dead' || this.state === 'complete') && this.input.pressed('KeyR')) {
      window.location.reload();
      return;
    }
    if (this.state !== 'playing') { this.input.endFrame(); return; }

    const inp = this.input;
    const player = this.player;

    if (inp.pressed('KeyP')) { this.pause(); inp.endFrame(); return; }
    if (inp.pressed('KeyM')) {
      const muted = this.radio.toggleMute();
      this.hud.toast(muted ? 'Muted' : 'Sound on');
    }
    if (inp.pressed('KeyQ')) {
      const s = this.radio.nextStation();
      this.hud.toast(`Radio: ${RADIO_STATIONS[s].name}`);
    }
    if (inp.pressed('KeyN')) {
      // Revision 2: N retries the current mission after a failure; otherwise
      // it just points at the beacon. Cash is never reset by a retry.
      if (this.missions.failedCount > 0 && this.missions.current) {
        this.missions.retry();
      } else {
        this.hud.toast(this.missions.current ? 'Mission already running — follow the gold beacon.' : 'Story complete.');
      }
    }
    if (inp.pressed('KeyR') && (this.state === 'dead' || this.state === 'complete')) {
      window.location.reload();
      return;
    }

    // Enter / exit a car.
    if (inp.pressed('KeyE')) {
      if (player.inCar) {
        player.exitCar();
        this.cameraMode = 'foot';
      } else {
        const car = this.vehicles.nearestParked(player.pos, 5);
        if (car) {
          player.enterCar(car);
          this.cameraMode = 'car';
          this.wanted.add(20, 'Grand theft auto');
          this.peds.scatterNear(player.pos.x, player.pos.z, 12);
          this.hud.toast('Car stolen! The cops noticed.');
        }
      }
    }

    if (player.inCar) {
      this._updateDriving(dt);
    } else {
      this._updateOnFoot(dt);
    }

    // Wanted: police chase and ramming.
    const focus = player.inCar ? player.inCar.pos : player.pos;
    const ram = this.wanted.update(dt, focus, !!player.inCar, this.city);
    if (ram && ram.rammed) {
      this._shake = 0.5; // revision 2: camera shake on a police ram
      if (player.takeDamage(ram.damage)) { this.die(); return; }
      this.radio.crash();
      this.hud.toast('Police rammed you!');
    }

    // Missions progress.
    this.missions.update(dt, focus, !!player.inCar, this.wanted.level);

    // Cooldowns.
    this._hitCooldown = Math.max(0, this._hitCooldown - dt);
    this._punchCooldown = Math.max(0, this._punchCooldown - dt);
    this._shotCooldown = Math.max(0, this._shotCooldown - dt);

    this._updateCamera(dt);
    this._updateHud();
    inp.endFrame();
  }

  _updateOnFoot(dt) {
    const player = this.player;
    const axes = this.input.moveAxes();
    // Revision 2: hold Shift (either side) to sprint on foot.
    player.walk(dt, axes, this.city, this.input.down('ShiftLeft') || this.input.down('ShiftRight'));

    // Punch (F): nearest pedestrian in front takes damage and flees.
    if (this.input.pressed('KeyF') && this._punchCooldown <= 0) {
      this._punchCooldown = 0.45;
      this.radio.punch();
      let best = null; let bestD = 3;
      for (const p of this.peds.peds) {
        const d = Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) {
        best.fleeing = 2;
        this.wanted.add(10, 'Assault');
        this.hud.toast('You shoved a pedestrian. Someone called the cops.');
      }
    }

    // Shoot (click): hits the nearest ped or police car in front, within range.
    if (this.input.clicked && this._shotCooldown <= 0 && player.ammo > 0) {
      this._shotCooldown = 0.3;
      player.ammo--;
      this.radio.shoot();
      this.wanted.add(15, 'Shots fired');
      this.peds.scatterNear(player.pos.x, player.pos.z, 20);
      let best = null; let bestD = 40;
      for (const p of this.peds.peds) {
        const d = Math.hypot(p.pos.x - player.pos.x, p.pos.z - player.pos.z);
        if (d < bestD) { bestD = d; best = p; }
      }
      if (best) {
        best.fleeing = 3;
        this.hud.toast('Shot fired — the street empties.');
      }
    }
  }

  _updateDriving(dt) {
    const player = this.player;
    const car = player.inCar;
    const axes = this.input.moveAxes();
    if (this.autoDrive) axes.forward = 1; // staged shots keep driving
    const hitWall = car.drive(dt, -axes.strafe, axes.forward, this.city);
    if (hitWall && Math.abs(car.speed) > 12 && this._hitCooldown <= 0) {
      this._hitCooldown = 0.8;
      this._shake = 0.6; // revision 2: camera shake on a hard crash
      this.radio.crash();
      if (player.takeDamage(4)) { this.die(); return; }
    }
    // Running over a pedestrian is a crime (and slows the car a touch).
    for (const p of this.peds.peds) {
      if (Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) < 2.2) {
        p.fleeing = 2;
        p.pos.x += Math.sin(car.angle) * 3;
        p.pos.z += Math.cos(car.angle) * 3;
        this.wanted.add(10, 'Hit and run');
        car.speed *= 0.7;
      }
    }
    // Keep traffic and police from overlapping the player car.
    this.vehicles.separate([car, ...this.vehicles.traffic, ...this.vehicles.police]);
  }

  _updateCoins(dt) {
    for (const mesh of this.coinMeshes) {
      const i = mesh.userData.index;
      if (this.coinsCollected.has(i)) { mesh.visible = false; continue; }
      mesh.rotation.y += dt * 2;
      mesh.position.y = 1.4 + Math.sin(performance.now() / 400 + i) * 0.25;
      if (this.state !== 'playing') continue;
      const focus = this.player.inCar ? this.player.inCar.pos : this.player.pos;
      const d = Math.hypot(focus.x - mesh.position.x, focus.z - mesh.position.z);
      if (d < 2.5) {
        this.coinsCollected.add(i);
        mesh.visible = false;
        this.cash += ECONOMY.coinValue;
        this.radio.coinPickup(); // revision 2: dedicated coin-pickup SFX
        this.hud.toast(`Sunset coin! +$${ECONOMY.coinValue}`);
        this.missions.onCoin();
        this._autosave();
      }
    }
  }

  // Snap the chase camera straight to its target (used by staged shots so
  // the first rendered frame already frames the subject).
  snapCamera() {
    const player = this.player;
    const focus = player.inCar ? player.inCar.pos : player.pos;
    const heading = player.inCar ? player.inCar.angle : player.angle;
    const dist = player.inCar ? 13 : 9;
    const height = player.inCar ? 5.5 : 4.2;
    this._camPos.set(
      focus.x - Math.sin(heading) * dist,
      height,
      focus.z - Math.cos(heading) * dist,
    );
    this._camLook.set(focus.x, 1.5, focus.z);
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
  }

  _updateCamera(dt) {
    const player = this.player;
    const focus = player.inCar ? player.inCar.pos : player.pos;
    const heading = player.inCar ? player.inCar.angle : player.angle;
    const dist = player.inCar ? 13 : 9;
    const height = player.inCar ? 5.5 : 4.2;
    const wantPos = new THREE.Vector3(
      focus.x - Math.sin(heading) * dist,
      height,
      focus.z - Math.cos(heading) * dist,
    );
    this._camPos.lerp(wantPos, 1 - Math.pow(0.001, dt));
    this._camLook.lerp(new THREE.Vector3(focus.x, 1.5, focus.z), 1 - Math.pow(0.0001, dt));
    this.camera.position.copy(this._camPos);
    this.camera.lookAt(this._camLook);
    // Revision 2: camera shake — a decaying random offset applied after the
    // camera is placed, so the jolt is visible on the rendered frame.
    if (this._shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this._shake;
      this.camera.position.y += (Math.random() - 0.5) * this._shake * 0.6;
      this._shake *= Math.pow(0.02, dt);
    }
  }

  _updateHud() {
    const player = this.player;
    const m = this.missions.current;
    this.hud.update({
      health: player.health,
      cash: this.cash,
      ammo: player.ammo,
      speedKmh: player.inCar ? Math.abs(player.inCar.speed) * 3.6 : 0,
      stars: this.wanted.level,
      objective: this.missions.objective,
      station: `♪ ${RADIO_STATIONS[this.radio.station].name}`,
      time: this.clock,
      missionIndex: this.missions.index,
      missionTotal: MISSIONS.length,
    });
    this.hud.drawMinimap(
      player.inCar ? player.inCar.pos : player.pos,
      player.inCar ? player.inCar.angle : player.angle,
      m ? m.target : null,
      this.vehicles.police.map((c) => c.pos),
      this.city.coinSpots.filter((_, i) => !this.coinsCollected.has(i)),
      WORLD.size,
    );
  }

  // --- main loop ----------------------------------------------------------
  run() {
    let last = performance.now();
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

// Boot.
const params = parseShot();
const game = new Game(params.seed);
window.__game = game;
window.__solmar = { state: () => game.state, cash: () => game.cash };
const staged = applyShot(game, params.shot);
if (staged) game.snapCamera();
if (!staged) game.showTitleScreen();
game.run();
