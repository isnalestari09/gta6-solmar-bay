// Solmar Bay — game loop, camera, interactions and state machine.
// States: title → playing ⇄ paused → dead / complete. Everything else
// (city, cars, peds, wanted, missions) lives in its own module.

import * as THREE from 'three';
import { Input } from './input.js';
import { City } from './city.js';
import { Vehicles } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Wanted } from './wanted.js';
import { Player } from './player.js';
import { Missions } from './missions.js';
import { HUD } from './hud.js';
import { AudioEngine } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { MISSIONS, COINS } from './config.js';
import { applyShot } from './shots.js';

export class Game {
  constructor() {
    this.input = new Input();
    this.audio = new AudioEngine();
    this.hud = new HUD();
    this.save = loadSave();
    this.state = 'title';
    this.time = 0;
    this.cameraMode = 'title';
    this.autoDrive = false;
    this.shake = 0;
    this.taxiTimer = 0;
    this.cash = this.save.cash || 0;
    this._setupThree();
    this.city = new City(this.scene);
    this.vehicles = new Vehicles(this.scene, this.city);
    this.peds = new Pedestrians(this.scene, this.city);
    this.player = new Player(this.scene);
    this.missions = new Missions(this.scene);
    this.wanted = new Wanted(this.vehicles, this.audio);
    this.missions.index = Math.min(this.save.mission - 1, MISSIONS.length - 1);
    this.missions._placeBeacon();
    this._showTitle();
    this._bindShot();
  }

  _setupThree() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87b5d9);
    this.scene.fog = new THREE.Fog(0x87b5d9, 180, 420);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
    const sun = new THREE.DirectionalLight(0xfff2cc, 1.6);
    sun.position.set(120, 180, -60);
    this.scene.add(sun);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  _showTitle() {
    this.hud.showScreen(
      'SOLMAR BAY',
      'Dani Reyes pulang kampung. Delapan misi, satu tebusan, dan seluruh kota mengejarnya. WASD jalan / nyetir, E curi mobil, klik tembak, P jeda, R ganti radio.',
      'Tekan ENTER untuk main',
    );
  }

  _bindShot() {
    const q = new URLSearchParams(window.location.search);
    const shot = q.get('shot');
    if (!shot) return;
    // Staged shots start from a clean slate, not from a previous save.
    this.cash = 0;
    this.missions.index = 0;
    this.missions.failed = false;
    this.missions.done = false;
    this.missions._placeBeacon();
    this.state = 'playing';
    this.hud.hideScreen();
    applyShot(this, shot);
    this.audio.ensure();
  }

  start() {
    this.state = 'playing';
    this.hud.hideScreen();
    this.audio.ensure();
    this.audio.startRadio();
    this.hud.toast(`Misi ${this.missions.index + 1}: ${this.missions.current().name}`);
  }

  _autosave() {
    writeSave({ cash: this.cash, mission: this.missions.index + 1, coins: this.city.coins.filter((c) => c.taken).map((c) => `${c.x},${c.z}`), completed: this.missions.done });
  }

  _nearestParked() {
    let best = null, bd = 5;
    for (const car of this.vehicles.parked) {
      if (car.taken) continue;
      const d = Math.hypot(car.x - this.player.x, car.z - this.player.z);
      if (d < bd) { bd = d; best = car; }
    }
    return best;
  }

  _shoot() {
    if (!this.player.shoot()) { this.hud.toast('Peluru habis!'); return; }
    this.audio.shoot();
    this.peds.scatter(this.player.x + Math.sin(this.player.angle) * 8, this.player.z + Math.cos(this.player.angle) * 8);
    this.wanted.addCrime(8, 'shooting');
    // A muzzle flash: a short-lived bright box in front of the player.
    const flash = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 2.5), new THREE.MeshBasicMaterial({ color: 0xffe066 }));
    flash.position.set(
      this.player.x + Math.sin(this.player.angle) * 3,
      1.4,
      this.player.z + Math.cos(this.player.angle) * 3,
    );
    this.scene.add(flash);
    setTimeout(() => this.scene.remove(flash), 90);
  }

  _updatePlaying(dt) {
    const p = this.player;
    const res = p.update(dt, this.input, this.city);
    if (res.crashed) { this.audio.crash(); this.shake = 0.5; this.hud.toast('Tabrakan!'); }
    this.vehicles.update(dt, p);
    this.peds.update(dt);
    this.wanted.update(dt, p);
    this.missions.update(dt, this.time);

    // Steal / exit a car.
    if (this.input.wasPressed('e')) {
      if (p.inCar) { p.exitCar(); this.hud.toast('Keluar mobil'); }
      else {
        const car = this._nearestParked();
        if (car) {
          p.x = car.x; p.z = car.z; p.enterCar(car);
          this.wanted.addCrime(12, 'grand theft auto');
          this.hud.toast('Mobil dicuri! Polisi mengejar.');
        }
      }
    }
    // Shoot on click.
    if (this.input.mouse.clicked && this.state === 'playing') this._shoot();
    // Radio + mute.
    if (this.input.wasPressed('r')) this.hud.setRadio(this.audio.nextStation());
    if (this.input.wasPressed('m')) this.hud.toast(this.audio.toggleMute() ? 'Suara mati' : 'Suara hidup');
    // Pause.
    if (this.input.wasPressed('p') || this.input.wasPressed('Escape')) {
      this.state = 'paused';
      this.input.clearAll();
      this.hud.showScreen('JEDA', 'Istirahat dulu, Dani.', 'Tekan P untuk lanjut');
      return;
    }
    // Mission fail retry (N) — only while a mission is marked failed.
    if (this.missions.failed && this.input.wasPressed('n')) {
      this.missions.retry();
      this.hud.toast('Misi diulang. Uangmu aman.');
    }
    // Auto-drive for staged shots.
    if (this.autoDrive && p.inCar) {
      p.carSpeed = Math.max(p.carSpeed, 26);
      const road = this.city.nearestRoad(p.z);
      p.z += (road - p.z) * dt * 0.8;
    }
    // Coins.
    for (const coin of this.city.coins) {
      if (coin.taken) continue;
      coin.mesh.rotation.y += dt * 2;
      if (Math.hypot(p.x - coin.x, p.z - coin.z) < 3) {
        coin.taken = true;
        coin.mesh.visible = false;
        this.cash += 50;
        this.audio.coinPickup();
        this.hud.toast('Koin matahari terbenam! +$50');
      }
    }
    // Taxi fares: driving a stolen car slowly through the city earns tips.
    if (p.inCar && Math.abs(p.carSpeed) > 4) {
      this.taxiTimer += dt;
      if (this.taxiTimer > 20) { this.taxiTimer = 0; this.cash += 25; this.hud.toast('Ongkos taksi +$25'); }
    }
    // Police rams hurt.
    for (const cop of this.vehicles.police) {
      if (Math.hypot(cop.x - p.x, cop.z - p.z) < 3.5) {
        p.health -= 18 * dt;
        this.shake = Math.max(this.shake, 0.35);
        if (Math.random() < dt * 2) this.hud.toast('Polisi menabrakmu!');
        if (p.health <= 0) { this._die(); return; }
      }
    }
    // Mission completion.
    const pay = this.missions.check(p.x, p.z);
    if (pay > 0) {
      this.cash += pay;
      this.audio.missionDone();
      this.hud.toast(`Misi selesai! +$${pay}`);
      if (this.missions.done) {
        this.state = 'complete';
        this._autosave();
        this.hud.showScreen('LILA BEBAS!', `Dani menebus adiknya. Total uang: $${this.cash}. Solmar Bay akhirnya tenang.`, 'Tekan ENTER untuk main lagi');
        return;
      }
      const next = this.missions.current();
      if (next) this.hud.toast(`Misi ${next.id}: ${next.name} — ${next.text}`);
    }
    // Epilogue rule: mission 8 only counts once the heat is gone.
    if (this.missions.index === 7 && this.wanted.stars > 0) {
      this.hud.setObjective('Misi 8/8: sembunyi dulu sampai bintang hilang!', 0.5);
    } else {
      const m = this.missions.current();
      if (m) this.hud.setObjective(`Misi ${m.id}/8: ${m.name} — ${m.text}`, this.missions.index / 8);
    }
    // Mission timer: taking too long on a mission fails it (retry keeps cash).
    this._missionClock = (this._missionClock || 0) + dt;
    if (this._missionClock > 240 && !this.missions.failed) {
      this.missions.fail();
      this._missionClock = 0;
      this.hud.showScreen('MISI GAGAL', 'Waktu habis. Uangmu tidak hilang.', 'Tekan N untuk coba lagi');
    }
    this._autosave();
  }

  _die() {
    this.state = 'dead';
    this._autosave();
    this.hud.showScreen('DANI TERTANGKAP', 'Polisi Solmar Bay akhirnya menangkapmu. Lila masih menunggu.', 'Tekan ENTER untuk coba lagi');
  }

  _restart() {
    this.player.reset(0, -20);
    this.wanted.clear();
    this.missions.index = 0;
    this.missions.failed = false;
    this.missions.done = false;
    this.missions._placeBeacon();
    this.cash = 0;
    this._missionClock = 0;
    this.start();
  }

  _updateCamera(dt) {
    const p = this.player;
    let target, look;
    if (this.cameraMode === 'title') {
      const t = this.time * 0.08;
      target = new THREE.Vector3(Math.cos(t) * 90 - 40, 42, Math.sin(t) * 90 - 40);
      look = new THREE.Vector3(-40, 6, -40);
    } else if (this.cameraMode === 'orbit') {
      const t = this.time * 0.15;
      target = new THREE.Vector3(p.x + Math.cos(t) * 22, 12, p.z + Math.sin(t) * 22);
      look = new THREE.Vector3(p.x, 2, p.z);
    } else {
      const behind = p.inCar ? 13 : 9;
      const height = p.inCar ? 6 : 5;
      const bx = p.x - Math.sin(p.angle) * behind;
      const bz = p.z - Math.cos(p.angle) * behind;
      target = new THREE.Vector3(bx, height, bz);
      look = new THREE.Vector3(p.x + Math.sin(p.angle) * 6, 1.5, p.z + Math.cos(p.angle) * 6);
    }
    if (this.shake > 0) {
      this.shake -= dt;
      target.x += (Math.random() - 0.5) * this.shake * 2;
      target.y += (Math.random() - 0.5) * this.shake * 2;
    }
    this.camera.position.lerp(target, 1 - Math.pow(0.001, dt));
    this.camera.lookAt(look);
  }

  _syncHud() {
    const p = this.player;
    this.hud.setCash(this.cash);
    this.hud.setStars(this.wanted.stars);
    this.hud.setHealth(p.health);
    this.hud.setSpeed(p.inCar ? Math.abs(p.carSpeed) * 3.6 : p.speed * 3.6);
    this.hud.drawMinimap(p, this.missions, this.vehicles, this.city);
  }

  frame(dt) {
    this.time += dt;
    if (this.state === 'playing') this._updatePlaying(dt);
    if (this.input.wasPressed('Enter')) {
      if (this.state === 'title') this.start();
      else if (this.state === 'dead' || this.state === 'complete') this._restart();
    }
    if (this.state === 'paused' && this.input.wasPressed('p')) {
      this.state = 'playing';
      this.input.clearAll();
      this.hud.hideScreen();
    }
    this._updateCamera(dt);
    this._syncHud();
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  run() {
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this.frame(dt);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  window.__game = game;
  game.run();
});
