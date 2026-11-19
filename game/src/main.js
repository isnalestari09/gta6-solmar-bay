// Solmar Bay — the game itself: renderer, loop, state machine, coins, the
// objective marker, busts and the save. Every system lives in its own file;
// this one only wires them together.

import * as THREE from 'three';
import { WORLD, PALETTE, ECONOMY, MISSIONS } from './config.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { loadSave, saveGame } from './save.js';
import { City } from './city.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Wanted } from './wanted.js';
import { MissionManager } from './missions.js';
import { HUD } from './hud.js';
import { applyShot } from './shots.js';

class World {
  constructor(scene, seed) {
    this.city = new City(scene, seed);
    this.scene = scene;
    this.coinMeshes = [];
    this.objective = null;
    this.markerGroup = new THREE.Group();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.5, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffd24a }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.4;
    this.markerGroup.add(ring);
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 2.5, 60, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
    );
    pillar.position.y = 30;
    this.markerGroup.add(pillar);
    this.markerGroup.visible = false;
    scene.add(this.markerGroup);
    // Sunset coins: spinning gold discs at the city's coin spots.
    const coinMat = new THREE.MeshBasicMaterial({ color: PALETTE.coin });
    for (const spot of this.city.coinSpots) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 16), coinMat);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.copy(spot);
      scene.add(mesh);
      this.coinMeshes.push({ pos: spot.clone(), mesh, taken: false, phase: Math.random() * 6 });
    }
  }

  setObjectiveMarker(marker) {
    this.objective = marker;
    if (!marker) {
      this.markerGroup.visible = false;
      return;
    }
    this.markerGroup.visible = true;
    this.markerGroup.position.set(marker.pos.x, 0, marker.pos.z);
    const s = marker.radius / 6;
    this.markerGroup.scale.set(s, 1, s);
  }

  update(dt, time) {
    this.city.update(dt, time);
    for (const c of this.coinMeshes) {
      if (c.taken) continue;
      c.mesh.rotation.y += dt * 2;
      c.mesh.position.y = 1.2 + Math.sin(time * 2 + c.phase) * 0.25;
    }
    if (this.markerGroup.visible) {
      this.markerGroup.rotation.y += dt * 0.8;
    }
  }
}

export class Game {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.seed = parseInt(params.get('seed') || '1', 10) || 1;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    this.input = new Input();
    this.audio = new AudioEngine();
    this.save = loadSave();
    this.cash = this.save.cash;
    this.coins = this.save.coinsCollected.length;
    this.coinsTotal = ECONOMY.coinsTotal;
    this.coinsCollectedThisMission = 0;
    this.completedMissions = this.save.completed.slice();
    this.world = new World(this.scene, this.seed);
    // Restore already-collected coins so a reloaded save keeps them gone.
    for (const i of this.save.coinsCollected) {
      const c = this.world.coinMeshes[i];
      if (c) {
        c.taken = true;
        c.mesh.visible = false;
      }
    }
    this.player = new Player(this.scene);
    this.vehicles = new VehicleManager(this.scene, this.world.city, this.seed);
    this.peds = new Pedestrians(this.scene, this.world.city, this.seed);
    this.wanted = new Wanted(this.scene, this.world.city);
    this.missions = new MissionManager(this);
    this.hud = new HUD(this);
    this.state = 'menu';
    this.time = 0;
    this.clock = new THREE.Clock();
    this.errors = [];
    window.addEventListener('error', (e) => this.errors.push(String(e.message || e.error)));
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    // Clicking the menu starts the game; Enter does the same.
    document.getElementById('menu').addEventListener('click', () => this.startGame());
    document.getElementById('story-end').addEventListener('click', () => {
      document.getElementById('story-end').classList.add('hidden');
    });
    // Shot presets for screenshots/ (also used by the playtest harness).
    if (params.has('shot')) {
      this.shot = applyShot(this, params);
    }
    // Debug hook for the playtest harness: live state, never a cheat — the
    // game itself never reads it.
    window.__solmar = {
      game: this,
      state: () => this.state,
      cash: () => this.cash,
      stars: () => this.wanted.stars,
      mission: () => (this.missions.current ? this.missions.current.id : null),
      missionActive: () => this.missions.active,
      step: () => (this.missions.step ? this.missions.step.kind : null),
      coins: () => this.coins,
      health: () => this.player.health,
      inCar: () => !!this.player.inCar,
      speed: () => this.player.speed,
      pos: () => ({ x: this.player.pos.x, z: this.player.pos.z }),
      errors: () => this.errors.slice(),
    };
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  saveGame() {
    this.save.cash = this.cash;
    this.save.missionIndex = this.missions.index;
    this.save.coins = this.coins;
    this.save.coinsCollected = this.world.coinMeshes
      .map((c, i) => (c.taken ? i : -1))
      .filter((i) => i >= 0);
    this.save.muted = this.audio.muted;
    this.save.station = this.audio.station;
    this.save.completed = this.completedMissions.slice();
    saveGame(this.save);
  }

  startGame() {
    if (this.state === 'playing') return;
    this.audio.ensure();
    this.audio.setMuted(this.save.muted);
    this.audio.setStation(this.save.station);
    this.state = 'playing';
    this.hud.hideMenu();
    this.hud.showBusted(false);
  }

  pauseGame() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.hud.showPause(true);
  }

  resumeGame() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.hud.showPause(false);
  }

  bust(reason) {
    if (this.state !== 'playing') return;
    this.cash = Math.max(0, this.cash - ECONOMY.bustFine);
    this.wanted.clearAfterBust();
    if (this.missions.active) this.missions.fail(reason);
    this.state = 'busted';
    this.hud.showBusted(true);
    this.saveGame();
  }

  respawn() {
    this.player.reset({ x: 0, z: 12 });
    this.player.heal(100);
    this.state = 'playing';
    this.hud.showBusted(false);
    this.hud.showToast('Back on the streets of Solmar Bay.');
  }

  tryEnterExitCar() {
    const p = this.player;
    if (p.inCar) {
      p.exitCar();
      return;
    }
    const car = this.vehicles.nearestParked(p.pos, 4.5);
    if (!car) return;
    p.enterCar(car);
    this.audio.enterCar();
    // Grand theft, witnessed: a pedestrian close by calls the police.
    const witness = this.peds.nearest(p.pos, 25);
    if (witness) this.wanted.addStars(1);
  }

  tryPunch() {
    const p = this.player;
    if (!p.tryPunch()) return;
    this.audio.punch();
    const downs = this.peds.punchAt(p.pos, p.heading);
    if (downs > 0) {
      this.wanted.addStars(1);
      if (this.missions.active && this.missions.step && this.missions.step.kind === 'punch') {
        this.missions.stepProgress += downs;
      }
    }
  }

  collectCoins() {
    const p = this.player;
    for (let i = 0; i < this.world.coinMeshes.length; i++) {
      const c = this.world.coinMeshes[i];
      if (c.taken) continue;
      if (Math.hypot(p.pos.x - c.pos.x, p.pos.z - c.pos.z) < 2.4) {
        c.taken = true;
        c.mesh.visible = false;
        this.coins += 1;
        this.cash += ECONOMY.coinValue;
        this.audio.coin();
        this.hud.showToast(`Sunset coin +$${ECONOMY.coinValue} (${this.coins}/${this.coinsTotal})`);
        if (this.missions.active && this.missions.step && this.missions.step.kind === 'coins') {
          this.coinsCollectedThisMission += 1;
          this.missions.stepProgress += 1;
        }
        this.saveGame();
      }
    }
  }

  handleKeys() {
    const input = this.input;
    if (this.state === 'menu') {
      if (input.wasPressed('Enter', ' ')) this.startGame();
      return;
    }
    if (this.state === 'busted') {
      if (input.wasPressed('Enter', ' ')) this.respawn();
      return;
    }
    if (this.state === 'paused') {
      if (input.wasPressed('p', 'P', 'Escape', 'Enter')) this.resumeGame();
      return;
    }
    // Playing.
    if (input.wasPressed('p', 'P', 'Escape')) { this.pauseGame(); return; }
    if (input.wasPressed('m', 'M')) {
      if (this.missions.failed) this.missions.retry();
      else if (!this.missions.active) this.missions.start();
      return;
    }
    if (input.wasPressed('t', 'T')) this.missions.tryTaxi(this.player, this.peds);
    if (input.wasPressed('r', 'R')) this.audio.nextStation();
    if (input.wasPressed('1')) this.audio.setStation(0);
    if (input.wasPressed('2')) this.audio.setStation(1);
    if (input.wasPressed('3')) this.audio.setStation(2);
    if (input.wasPressed('4')) this.audio.setStation(3);
    if (input.wasPressed('n', 'N')) {
      this.audio.setMuted(!this.audio.muted);
      this.saveGame();
    }
    if (input.wasPressed('e', 'E')) this.tryEnterExitCar();
    if (input.wasPressed('f', 'F', ' ')) this.tryPunch();
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    this.time += dt;
    this.handleKeys();
    if (this.state === 'playing') {
      const p = this.player;
      p.tickPunch(dt);
      // Screenshot presets may hold the throttle open (shot=play).
      const driveInput = this.shotDrive
        ? { axes: () => ({ fwd: 1, turn: 0 }), isDown: () => false }
        : this.input;
      if (p.inCar) p.updateDriving(dt, driveInput, this.world.city);
      else p.updateOnFoot(dt, this.input, this.world.city);
      this.vehicles.update(dt, p.pos);
      this.peds.update(dt, p.pos, p.punchTimer > 0);
      const result = this.wanted.update(dt, p, this.time);
      if (result === 'busted') {
        this.bust('Busted by the police');
      } else if (p.health <= 0) {
        this.bust('Dani is down');
      }
      this.missions.update(dt, p);
      this.missions.updateTaxi(p);
      this.collectCoins();
      this.audio.update(dt, p.inCar ? p.speed : p.vel.length(), this.wanted.stars);
      this.world.update(dt, this.time);
      p.updateCamera(dt, this.camera);
      this.hud.update(dt);
    } else if (this.state === 'menu') {
      // The menu shows the live plaza: slow orbit behind Dani.
      this.world.update(dt, this.time);
      this.player.updateCamera(dt, this.camera);
      this.hud.update(dt);
    }
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}

new Game();
