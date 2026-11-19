// Solmar Bay — the game itself: wires the city, Dani, cars, pedestrians,
// police, missions, HUD, radio and save together, and runs the loop.
// Dani starts at Plaza del Sol with $250 and a $2,600 goal: Lila's freedom.

import * as THREE from 'three';
import { WORLD, ECONOMY, CAMERA, WANTED_TUNING, CAR_TUNING, clamp, distance2D, angleLerp } from './config.js';
import { buildCity, resolveColliders } from './city.js';
import { Player } from './player.js';
import { Traffic, spawnParkedCars, nearestCar, Car } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Wanted } from './wanted.js';
import { MissionManager, MISSIONS } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { loadSave, writeSave, wipeSave, defaultSave } from './save.js';
import { Input } from './input.js';
import { applyShot, readShotFromURL, installDebugHook } from './shots.js';

export class Game {
  constructor() {
    this.started = false;
    this.paused = false;
    this.busted = false;
    this.save = loadSave();
    this.input = new Input();
    this.input.attach();
    this.audio = new AudioEngine();
    this.hud = new HUD();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 900);
    this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const city = buildCity(this.scene);
    this.colliders = city.colliders;
    this.cityCoins = city.coins;
    this.coins = city.coinSpots.map(([x, z], i) => ({ x, z, index: i, taken: this.save.coinsTaken.includes(i) }));
    this.cityCoins.forEach((mesh, i) => { mesh.visible = !this.coins[i].taken; });
    this.player = new Player(this.scene, this.colliders, 2, 24);
    this.player.health = 100;
    this.parkedCars = spawnParkedCars(this.scene);
    this.traffic = new Traffic(this.scene, this.colliders);
    this.peds = new Pedestrians(this.scene, this.colliders);
    this.wanted = new Wanted(this.scene, this.colliders);
    this.missions = new MissionManager(this.scene);
    this.currentCar = null;
    this.cameraYaw = Math.PI;
    this.cameraMode = 'walk';
    this.shake = 0;
    this.fare = null;
    this.fareMarker = this._makeFareMarker();
    this.scene.add(this.fareMarker);
    this._playSeconds = 0;
    this._saveTimer = 0;
    this._lastTime = performance.now();
    this._wireOverlays();
    window.addEventListener('resize', () => this._onResize());
    installDebugHook(this);
    const shot = readShotFromURL();
    if (shot) {
      // Staged screenshots start the game immediately.
      applyShot(this, shot);
    }
  }

  _makeFareMarker() {
    const group = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2, 2.8, 24),
      new THREE.MeshBasicMaterial({ color: 0x3cd8a0, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.15;
    group.add(ring);
    group.visible = false;
    return group;
  }

  _wireOverlays() {
    document.getElementById('btn-new').addEventListener('click', () => {
      wipeSave();
      this.save = defaultSave();
      this._resetWorld();
      this.startGame();
    });
    document.getElementById('btn-continue').addEventListener('click', () => {
      this.save = loadSave();
      this._resetWorld();
      this.startGame();
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));
    document.getElementById('btn-busted').addEventListener('click', () => {
      document.getElementById('busted').classList.add('hidden');
      this.busted = false;
      this._respawn();
      this.startGame();
    });
  }

  _resetWorld() {
    this.wanted.reset();
    this.missions.clear();
    this.fare = null;
    this.fareMarker.visible = false;
    this.player.healFull();
    this.player.pos.set(2, 0, 24);
    this.player.heading = 0;
    if (this.currentCar) {
      this.currentCar.occupied = false;
      this.currentCar = null;
    }
    this.coins.forEach((coin) => { coin.taken = this.save.coinsTaken.includes(coin.index); });
    this.cityCoins.forEach((mesh, i) => { mesh.visible = !this.coins[i].taken; });
    this.hud.setCash(this.save.cash);
    this.hud.setCoins(this.save.coinsCollected, 12);
    this.hud.setStars(0);
  }

  _respawn() {
    this.wanted.reset();
    this.player.healFull();
    this.player.pos.set(2, 0, 24);
    this.player.heading = 0;
    if (this.currentCar) {
      this.currentCar.occupied = false;
      this.currentCar = null;
    }
    this.fare = null;
    this.fareMarker.visible = false;
    this.cameraMode = 'walk';
  }

  startGame() {
    this.audio.ensure();
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
    this.started = true;
    this.paused = false;
    this.hud.setCash(this.save.cash);
    this.hud.setCoins(this.save.coinsCollected, 12);
    this.hud.setStars(0);
    this.hud.setMission('FREE ROAM', 'Press M to start your next mission');
    this.hud.setRadio('♪ ' + this.audio.station.name + ' — ' + this.audio.station.genre);
    this.hud.toast('Welcome back to Solmar Bay, Dani. Lila needs $2,600.', 4);
  }

  togglePause(force) {
    if (!this.started || this.busted) return;
    this.paused = force !== undefined ? force : !this.paused;
    document.getElementById('pause').classList.toggle('hidden', !this.paused);
  }

  setPlayerAt(x, z, heading) {
    if (this.currentCar) {
      this.currentCar.occupied = false;
      this.currentCar = null;
    }
    this.player.pos.set(x, 0, z);
    this.player.heading = heading;
    this.player.mesh.rotation.y = heading;
  }

  setPlayerInTaxi() {
    const taxi = this.parkedCars.find((car) => car.kind === 'taxi');
    if (!taxi) return;
    this.currentCar = taxi;
    taxi.occupied = true;
    this.player.pos.set(taxi.pos.x, 0, taxi.pos.z);
    this.player.mesh.visible = false;
    this.cameraMode = 'drive';
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  _enterCar() {
    const car = nearestCar(this.parkedCars, this.player.pos.x, this.player.pos.z, 4.5);
    if (!car) return;
    this.currentCar = car;
    car.occupied = true;
    this.player.mesh.visible = false;
    this.cameraMode = 'drive';
    this.wanted.addHeat(WANTED_TUNING.heatStealCar);
    this.missions.onCarStolen();
    this.hud.toast('Car stolen — the law noticed.', 2.5);
  }

  _exitCar() {
    if (!this.currentCar) return;
    const car = this.currentCar;
    car.occupied = false;
    this.currentCar = null;
    this.player.pos.set(car.pos.x + Math.sin(car.heading + Math.PI / 2) * 2.5, 0, car.pos.z + Math.cos(car.heading + Math.PI / 2) * 2.5);
    resolveColliders(this.colliders, this.player.pos, 0.7);
    this.player.mesh.visible = true;
    this.player.heading = car.heading;
    this.cameraMode = 'walk';
  }

  _startFare() {
    if (!this.currentCar || this.currentCar.kind !== 'taxi' || this.fare) return;
    const dest = WORLD.roadLines[Math.floor(Math.random() * WORLD.roadLines.length)];
    const along = -140 + Math.random() * 280;
    const horizontal = Math.random() < 0.5;
    const x = horizontal ? along : dest;
    const z = horizontal ? dest : along;
    this.fare = { x, z, startX: this.currentCar.pos.x, startZ: this.currentCar.pos.z };
    this.fareMarker.position.set(x, 0, z);
    this.fareMarker.visible = true;
    this.missions.onFareStart();
    this.hud.toast('Fare picked up — drive to the green ring.', 3);
  }

  _finishFare() {
    const d = distance2D(this.fare.startX, this.fare.startZ, this.fare.x, this.fare.z);
    const payout = Math.round(ECONOMY.fareBase + d * ECONOMY.farePerMetre);
    this.save.cash += payout;
    this.save.faresDone += 1;
    this.save.taxiEarned += payout;
    this.fare = null;
    this.fareMarker.visible = false;
    this.audio.playChime();
    this.hud.toast(`Fare complete — +$${payout}`, 3);
    this.hud.setCash(this.save.cash);
    this.missions.onFareComplete();
    writeSave(this.save);
  }

  _onPunch() {
    this.audio.playPunch();
    this.shake = Math.max(this.shake, CAMERA.shakePunch);
    if (this.currentCar) return;
    const hit = this.peds.punchAt(this.player.pos.x, this.player.pos.z, this.player.heading, 2.4, 1.1);
    if (hit) {
      this.wanted.addHeat(WANTED_TUNING.heatPunchPed);
      this.missions.onPunch();
      return;
    }
    // A punch can also land on a cop.
    for (const cop of this.wanted.cops) {
      const d = distance2D(this.player.pos.x, this.player.pos.z, cop.pos.x, cop.pos.z);
      if (d < 3) {
        this.wanted.addHeat(WANTED_TUNING.heatPunchCop);
        this.hud.toast('You punched a cop. Bad idea.', 2.5);
        return;
      }
    }
  }

  _onBusted(kind, cop) {
    if (kind === 'ram' && cop) {
      if (this.currentCar) {
        this.currentCar.health = Math.max(0, this.currentCar.health - WANTED_TUNING.copRamDamage);
        this.shake = Math.max(this.shake, CAMERA.shakeBump);
        if (this.currentCar.health <= 0) {
          this._exitCar();
          this.currentCar = null;
        }
      } else {
        if (this.player.takeDamage(12)) this._showBusted('The Solmar Bay PD beat you down.');
      }
      return;
    }
    if (kind === 'busted') {
      this._showBusted('The Solmar Bay PD caught up with you.');
    }
  }

  _showBusted(text) {
    if (this.busted) return;
    this.busted = true;
    this.audio.playBusted();
    const fine = Math.min(this.save.cash, 100);
    this.save.cash -= fine;
    this.hud.setCash(this.save.cash);
    writeSave(this.save);
    if (this.missions.active) {
      this.hud.toast('Mission failed — press M to retry. Cash kept.', 4);
      this.missions.fail();
      this.wanted.heatForced = false;
    }
    document.getElementById('busted-text').textContent = text + (fine > 0 ? ` Fine: $${fine}.` : '');
    document.getElementById('busted').classList.remove('hidden');
  }

  _updateCamera(dt) {
    const yawInput = this.input.mouseDX * 0.005;
    this.cameraYaw -= yawInput;
    const target = this.currentCar ? this.currentCar : this.player;
    const heading = this.currentCar ? this.currentCar.heading : this.player.heading;
    let dist = CAMERA.walkDistance;
    let height = CAMERA.walkHeight;
    if (this.cameraMode === 'drive') { dist = CAMERA.driveDistance; height = CAMERA.driveHeight; }
    if (this.cameraMode === 'chase') { dist = CAMERA.chaseDistance; height = CAMERA.chaseHeight; }
    if (this.cameraMode === 'high') { dist = 34; height = 26; }
    const camAngle = this.cameraMode === 'high' ? this.cameraYaw : heading + Math.PI;
    const cx = target.pos.x + Math.sin(camAngle) * dist;
    const cz = target.pos.z + Math.cos(camAngle) * dist;
    this.shake = Math.max(0, this.shake - dt * 1.4);
    const shakeX = (Math.random() - 0.5) * this.shake;
    const shakeY = (Math.random() - 0.5) * this.shake;
    this.camera.position.set(cx + shakeX, height + shakeY, cz);
    this.camera.lookAt(target.pos.x, 2, target.pos.z);
  }

  _updateCoins(dt, time) {
    this.cityCoins.forEach((mesh, i) => {
      if (this.coins[i].taken) return;
      mesh.rotation.y += dt * 2;
      mesh.position.y = 1.4 + Math.sin(time * 2 + i) * 0.15;
      const d = distance2D(this.player.pos.x, this.player.pos.z, mesh.position.x, mesh.position.z);
      if (d < 1.8) {
        this.coins[i].taken = true;
        mesh.visible = false;
        this.save.coinsTaken.push(i);
        this.save.coinsCollected = this.save.coinsTaken.length;
        this.save.cash += ECONOMY.coinValue;
        this.audio.playCoin();
        this.hud.setCoins(this.save.coinsCollected, 12);
        this.hud.setCash(this.save.cash);
        this.hud.toast(`Sunset coin — +$${ECONOMY.coinValue}`, 2);
        writeSave(this.save);
      }
    });
  }

  update(dt, time) {
    if (!this.started || this.busted) return;
    // Pause is read before the paused early-return, or P could never unpause.
    if (this.input.wasPressed('KeyP')) this.togglePause();
    if (this.paused) return;
    this._playSeconds += dt;
    this._saveTimer += dt;
    if (this._saveTimer > 10) {
      this._saveTimer = 0;
      this.save.playSeconds += 10;
      writeSave(this.save);
    }
    // Global keys.
    if (this.input.wasPressed('KeyM')) {
      const next = this.save.missionsDone % MISSIONS.length;
      const mission = this.missions.start(next);
      this.hud.banner(`MISSION: ${mission.name} — $${mission.payout}`, 4);
      this.hud.toast(mission.intro, 5);
      if (next === 7) {
        this.wanted.setHeat(100);
        this.wanted.heatForced = true;
      }
    }
    if (this.input.wasPressed('KeyR')) {
      this.audio.nextStation();
      this.hud.setRadio('♪ ' + this.audio.station.name + ' — ' + this.audio.station.genre);
    }
    if (this.input.wasPressed('Digit1')) this.audio.setStation(0);
    if (this.input.wasPressed('Digit2')) this.audio.setStation(1);
    if (this.input.wasPressed('Digit3')) this.audio.setStation(2);
    if (this.input.wasPressed('Digit4')) this.audio.setStation(3);
    if (this.input.wasPressed('KeyN')) {
      this.audio.setMuted(!this.audio.muted);
      this.hud.setRadio(this.audio.muted ? '♪ muted' : '♪ ' + this.audio.station.name + ' — ' + this.audio.station.genre);
    }
    if (this.input.wasPressed('KeyT')) this._startFare();
    if (this.input.wasPressed('KeyE')) {
      if (this.currentCar) this._exitCar();
      else this._enterCar();
    }
    // Movement.
    if (this.currentCar) {
      this.currentCar.update(dt, this.input, this.colliders);
      this.audio.setEngine(Math.abs(this.currentCar.speed) / CAR_TUNING.maxSpeed);
    } else {
      this.player.update(dt, this.input, this.cameraYaw, () => this._onPunch());
      this.audio.setEngine(0);
    }
    this.traffic.update(dt);
    this.peds.update(dt, this.player.pos, [...this.traffic.cars, ...this.parkedCars.filter((c) => c.occupied)], this.wanted.cops);
    // Wanted: frozen heat during a chase step, normal decay otherwise.
    this.wanted.heatForced = this.missions.isChaseStep;
    const { nearest } = this.wanted.update(dt, this.currentCar ? this.currentCar.pos : this.player.pos, !!this.currentCar, (kind, cop) => this._onBusted(kind, cop));
    this.audio.setSiren(this.wanted.stars > 0 ? clamp(1 - nearest / 80, 0.15, 1) : 0);
    // Missions.
    const missionPos = this.currentCar ? this.currentCar.pos : this.player.pos;
    const result = this.missions.update(dt, missionPos, !!this.currentCar);
    if (result === 'complete') {
      const mission = this.missions.active;
      this.save.cash += mission.payout;
      this.save.missionsDone += 1;
      this.audio.playChime();
      this.hud.setCash(this.save.cash);
      this.wanted.heatForced = false;
      if (this.missions.activeIndex === 7) {
        this.hud.banner('LILA IS FREE! Solmar Bay is yours, Dani.', 6);
        this.wanted.reset();
      } else {
        this.hud.banner(`MISSION COMPLETE — +$${mission.payout}`, 4);
      }
      this.missions.clear();
      this.hud.setMission('FREE ROAM', 'Press M to start your next mission');
      writeSave(this.save);
    } else if (result === 'step') {
      this.audio.playChime();
    }
    // Fare arrival.
    if (this.fare && this.currentCar) {
      const d = distance2D(this.currentCar.pos.x, this.currentCar.pos.z, this.fare.x, this.fare.z);
      if (d < 6) this._finishFare();
    }
    this._updateCoins(dt, time);
    // HUD.
    const objective = this.missions.active ? this.missions.objectiveText(missionPos) : null;
    if (objective) {
      this.hud.setMission(`MISSION ${this.missions.activeIndex + 1} · ${objective.mission} · $${objective.payout}`, objective.text);
    } else if (!this.missions.active) {
      const nextName = MISSIONS[this.save.missionsDone % MISSIONS.length].name;
      this.hud.setMission('FREE ROAM', `Next mission: ${nextName} — press M to start`);
    }
    this.hud.setStars(this.wanted.stars);
    if (this.currentCar) this.hud.setDriving(Math.abs(this.currentCar.speed) * 3.6, this.currentCar.health);
    else this.hud.setWalking(this.player.health);
    this.hud.drawMinimap({
      player: { x: this.player.pos.x, z: this.player.pos.z, heading: this.player.heading },
      cops: this.wanted.cops.map((c) => ({ x: c.pos.x, z: c.pos.z })),
      coins: this.coins,
      marker: this.missions.step && this.missions.step.x !== undefined
        ? { x: this.missions.step.x, z: this.missions.step.z }
        : (this.fare ? { x: this.fare.x, z: this.fare.z } : null),
    });
    this._updateCamera(dt);
    this.save.bestWanted = Math.max(this.save.bestWanted, this.wanted.stars);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  run() {
    const loop = (now) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - this._lastTime) / 1000);
      this._lastTime = now;
      this.update(dt, now / 1000);
      if (this.started) this.renderer.render(this.scene, this.camera);
      this.input.endFrame();
    };
    requestAnimationFrame(loop);
  }
}

const game = new Game();
game.run();
