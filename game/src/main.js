// Solmar Bay — the game itself. One job: boot the renderer, own the game
// loop and the state machine (menu / playing / paused / busted / won), and
// wire every system together: city, player, cars, peds, wanted, missions,
// audio, HUD and saving.
import * as THREE from 'three';
import { WORLD, COLORS, CAMERA, PLAYER, CAR, ECONOMY } from './config.js';
import { City } from './city.js';
import { Player } from './player.js';
import { Vehicles } from './vehicles.js';
import { Pedestrians } from './pedestrians.js';
import { Wanted } from './wanted.js';
import { Missions } from './missions.js';
import { AudioEngine } from './audio.js';
import { Hud } from './hud.js';
import { Input } from './input.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { readShot, applyShot } from './shots.js';

const SAVE_EVERY_MS = 4000;

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.fog, 70, 420);
    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

    const hemi = new THREE.HemisphereLight(0xffd9a0, 0x7a4a28, 0.95);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffb36b, 1.6);
    sun.position.set(-120, 90, 60);
    this.scene.add(sun);
    // Low sun disc on the horizon, west.
    const sunDisc = new THREE.Mesh(
      new THREE.CircleGeometry(26, 24),
      new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
    );
    sunDisc.position.set(-260, 42, -260);
    sunDisc.lookAt(0, 42, 0);
    this.scene.add(sunDisc);

    const seed = Number(new URLSearchParams(window.location.search).get('seed') || 1);
    this.city = new City(this.scene, seed);
    this.player = new Player(this.scene, this.city);
    this.vehicles = new Vehicles(this.scene, this.city, seed);
    this.peds = new Pedestrians(this.scene, this.city, seed);
    this.wanted = new Wanted(this.scene, this.vehicles, this.city);
    this.audio = new AudioEngine();
    this.hud = new Hud();
    this.input = new Input();
    this.missions = new Missions(this.scene, this.missionHooks());

    this.save = loadSave();
    this.cash = this.save.cash;
    this.coinsCollected = this.save.coins;
    for (let i = 0; i < this.save.coins && i < this.city.coins.length; i++) {
      this.city.coins[i].taken = true;
      this.city.coins[i].mesh.visible = false;
    }
    this.missions.index = Math.min(this.save.missionIndex, 8);
    this.audio.setMuted(this.save.muted);
    this.audio.setStation(this.save.station);

    this.started = false;
    this.paused = false;
    this.busted = false;
    this.won = false;
    this.carHealth = CAR.health;
    this.camYaw = Math.PI;
    this.shake = 0;
    this.time = 0;
    this.lastSave = 0;
    this.fare = null; // free-roam taxi fare { x, z }
    this.bustedTimer = 0;

    this.bindButtons();
    this.showSaveLine();
    window.addEventListener('resize', () => this.onResize());
    this.exposeDebug();
    const shot = readShot();
    if (shot) {
      applyShot(this, shot);
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    } else {
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    }
  }

  missionHooks() {
    return {
      addCash: (n) => { this.cash += n; },
      addHeat: (n, r) => this.wanted.addHeat(n, r),
      setStars: (n) => { this.wanted.heat = n * 20; this.wanted.recomputeStars(); },
      holdHeat: (on) => { this.wanted.holdHeat = on; },
      spawnThug: (x, z) => this.peds.spawnThug(x, z),
      spawnPassenger: (x, z) => {
        const p = this.peds.spawnThug(x, z);
        p.thug = false;
        return p;
      },
      removePed: (p) => this.peds.removePed(p),
      getPlayerPos: () => ({ x: this.player.x, z: this.player.z }),
      isDrivingCoupe: () => {
        const car = this.vehicles.playerCar;
        return !!car && !!car.coupe;
      },
      chime: () => this.audio.chime(),
      onComplete: (def) => {
        this.hud.toast(`MISSION COMPLETE — ${def.name} · +$${def.pay}`, 3.5);
        this.save.missionIndex = def.id;
        this.save.completed = [...new Set([...(this.save.completed || []), def.id])];
        if (def.id === 8) this.winGame();
        this.persist();
      },
    };
  }

  bindButtons() {
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause(false));
    document.getElementById('btn-retry').addEventListener('click', () => this.retryAfterBusted());
    document.getElementById('btn-again').addEventListener('click', () => {
      clearSave();
      window.location.href = window.location.pathname;
    });
  }

  showSaveLine() {
    const el = document.getElementById('menu-save');
    if (this.save.cash > 0 || this.save.missionIndex > 0) {
      el.textContent = `Save found — $${this.save.cash} · mission ${this.save.missionIndex + 1} of 8 · ${this.save.coins} coins`;
    }
  }

  startGame() {
    this.audio.ensure();
    this.started = true;
    this.hud.showMenu(false);
    this.hud.toast('Welcome to Solmar Bay — press M to start a mission', 4);
  }

  setCameraYaw(yaw) {
    this.camYaw = yaw;
  }

  togglePause(force) {
    if (!this.started || this.busted || this.won) return;
    this.paused = force !== undefined ? force : !this.paused;
    this.hud.showPause(this.paused);
  }

  retryAfterBusted() {
    this.busted = false;
    this.hud.showBusted(false);
    this.player.reset(0, 14);
    this.player.health = PLAYER.health;
    this.carHealth = CAR.health;
    this.vehicles.playerCar = null;
    this.player.group.visible = true;
    this.wanted.clear();
    this.missions.fail();
    this.started = true;
  }

  winGame() {
    this.won = true;
    this.hud.showWin(true);
    document.getElementById('win-stats').textContent =
      `Cash: $${this.cash} · Coins: ${this.coinsCollected}/12 · Missions: 8/8`;
    this.audio.chime();
    this.persist();
  }

  persist() {
    this.save.cash = this.cash;
    this.save.coins = this.coinsCollected;
    this.save.missionIndex = this.missions.index;
    this.save.muted = this.audio.muted;
    this.save.station = this.audio.station;
    writeSave(this.save);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // --- actions ---------------------------------------------------------
  tryEnterCar() {
    if (this.vehicles.playerCar) {
      const car = this.vehicles.playerCar;
      this.vehicles.playerCar = null;
      this.player.group.visible = true;
      const side = { x: car.x + Math.cos(car.yaw) * 2.4, z: car.z - Math.sin(car.yaw) * 2.4 };
      const fixed = this.city.resolveCollision(side.x, side.z, PLAYER.radius);
      this.player.reset(fixed.x, fixed.z);
      this.player.yaw = car.yaw;
      return;
    }
    const car = this.vehicles.nearestParked(this.player.x, this.player.z);
    if (!car) return;
    car.taken = true;
    this.vehicles.playerCar = car;
    this.carHealth = CAR.health;
    this.player.group.visible = false;
    this.wanted.addHeat(30, 'steal');
    this.hud.toast('Car stolen — the cops noticed!', 2.5);
  }

  tryPunch() {
    if (this.vehicles.playerCar || !this.player.tryPunch()) return;
    this.audio.punch();
    this.shake = Math.max(this.shake, 0.25);
    const px = this.player.x;
    const pz = this.player.z;
    const yaw = this.player.yaw;
    let hitAny = false;
    for (const p of [...this.peds.peds]) {
      const dx = p.x - px;
      const dz = p.z - pz;
      const d = Math.hypot(dx, dz);
      if (d > PLAYER.punchRange + 0.6) continue;
      const ang = Math.atan2(dx, dz);
      let da = ang - yaw;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) > PLAYER.punchArc) continue;
      hitAny = true;
      p.health -= PLAYER.punchDamage;
      this.peds.scare(px, pz, 14);
      if (p.health <= 0) {
        if (p.thug) {
          this.peds.removePed(p);
          this.missions.onThugDown(p);
          this.hud.toast('Thug down!', 1.5);
        } else {
          this.peds.removePed(p);
        }
      }
    }
    // Any landed punch is assault: the cops notice, hit or kill.
    if (hitAny) this.wanted.addHeat(22, 'punch');
  }

  tryTaxiFare() {
    if (this.fare || this.vehicles.playerCar) return;
    // Nearest pedestrian within 5 units becomes the fare.
    let best = null;
    let bestD = 5;
    for (const p of this.peds.peds) {
      if (p.thug) continue;
      const d = Math.hypot(p.x - this.player.x, p.z - this.player.z);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (!best) return;
    this.peds.removePed(best);
    const line = [-120, -60, 0, 60, 120][Math.floor(Math.random() * 5)];
    const along = -160 + Math.random() * 320;
    this.fare = { x: line, z: along };
    this.missions.setMarker(this.fare.x, this.fare.z);
    this.hud.toast('Taxi fare — drive them to the marker!', 3);
  }

  // --- frame -----------------------------------------------------------
  loop() {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - (this.lastFrame || now)) / 1000));
    this.lastFrame = now;
    this.time += dt;
    this.pollPauseKey();
    if (this.started && !this.paused && !this.busted && !this.won) {
      this.update(dt);
    }
    this.city.update(dt, this.time);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }

  // The pause key must work while paused too, so it is polled outside the
  // update gate (which skips everything while paused).
  pollPauseKey() {
    if (this.input.wasPressed('p')) this.togglePause();
  }

  update(dt) {
    const input = this.input;
    if (input.wasPressed('n')) {
      this.audio.ensure();
      this.audio.setMuted(!this.audio.muted);
    }
    if (input.wasPressed('r')) this.audio.cycleStation();
    for (let i = 1; i <= 4; i++) {
      if (input.wasPressed(String(i))) this.audio.setStation(i - 1);
    }
    if (input.wasPressed('m')) {
      const next = this.missions.nextMission();
      if (next && this.missions.state !== 'active') {
        this.missions.start(next.id - 1);
        this.hud.toast(`MISSION ${next.id} — ${next.name} · $${next.pay}`, 3.5);
      }
    }
    if (input.wasPressed('e')) this.tryEnterCar();
    if (input.wasPressed('f') || input.wasPressed(' ')) this.tryPunch();
    if (input.wasPressed('t')) this.tryTaxiFare();

    const car = this.vehicles.playerCar;
    if (car) {
      this.vehicles.drive(car, dt, input);
      this.player.x = car.x;
      this.player.z = car.z;
      this.player.yaw = car.yaw;
      // Police ramming the car damages it.
      for (const cop of this.vehicles.cops) {
        if (Math.hypot(cop.x - car.x, cop.z - car.z) < 3.4) {
          this.carHealth -= 14 * dt;
          this.shake = Math.max(this.shake, 0.3);
          if (Math.random() < dt * 2) this.audio.thud();
          if (this.carHealth <= 0) {
            this.carHealth = 0;
            this.vehicles.playerCar = null;
            this.player.group.visible = true;
            this.player.reset(car.x + 3, car.z);
            this.player.takeDamage(25);
            this.hud.toast('Your car is wrecked!', 3);
            break;
          }
        }
      }
      // Taxi fare drop-off while driving.
      if (this.fare && Math.hypot(this.fare.x - car.x, this.fare.z - car.z) < 6) {
        this.cash += ECONOMY.taxiFare;
        this.hud.toast(`Fare complete — +$${ECONOMY.taxiFare}`, 3);
        this.audio.chime();
        this.fare = null;
        this.missions.clearMarker();
        this.persist();
      }
    } else {
      this.player.update(dt, input, this.camYaw);
    }

    // Coins.
    for (const coin of this.city.coins) {
      if (coin.taken) continue;
      if (Math.hypot(coin.x - this.player.x, coin.z - this.player.z) < 2.2) {
        coin.taken = true;
        coin.mesh.visible = false;
        this.coinsCollected++;
        this.cash += ECONOMY.coinValue;
        this.audio.coin();
        this.hud.toast(`Sunset coin! +$${ECONOMY.coinValue}`, 1.5);
        this.persist();
      }
    }

    // Wanted + police.
    this.wanted.update(dt, { x: this.player.x, z: this.player.z }, !car, () => this.getBusted());
    this.audio.setSiren(this.wanted.stars >= 2);
    this.vehicles.updateTraffic(dt, this.time);
    this.vehicles.updateCopLights(this.time);
    this.peds.setThreat(this.player.x, this.player.z);
    this.peds.update(dt, this.time);
    this.missions.update(dt);

    // Camera: chase behind the player/car heading, smoothed.
    const targetYaw = car ? car.yaw : this.player.yaw;
    let dy = targetYaw - this.camYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.camYaw += dy * Math.min(1, dt * 3.2);
    const px = this.player.x;
    const pz = this.player.z;
    const dist = car ? CAMERA.distance + 3 : CAMERA.distance;
    const cx = px - Math.sin(this.camYaw) * dist;
    const cz = pz - Math.cos(this.camYaw) * dist;
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * CAMERA.shakeDecay);
      const s = this.shake * 0.9;
      this.camera.position.set(
        cx + (Math.random() - 0.5) * s,
        CAMERA.height + (Math.random() - 0.5) * s,
        cz + (Math.random() - 0.5) * s,
      );
    } else {
      this.camera.position.set(cx, CAMERA.height, cz);
    }
    this.camera.lookAt(px, CAMERA.lookHeight, pz);

    // Periodic save.
    if (this.time * 1000 - this.lastSave > SAVE_EVERY_MS) {
      this.lastSave = this.time * 1000;
      this.persist();
    }

    this.hud.update(this.hudState());
  }

  getBusted() {
    if (this.busted || this.won) return;
    this.busted = true;
    this.bustedTimer = 0;
    this.hud.showBusted(true);
    this.missions.fail();
    this.wanted.clear();
    this.audio.setSiren(false);
  }

  hudState() {
    const next = this.missions.nextMission();
    let missionTitle = 'FREE ROAM';
    let objective = next ? `Next mission: ${next.name} — press M to start` : 'Story complete!';
    if (this.missions.active) {
      missionTitle = `MISSION ${this.missions.active.mission.id} · ${this.missions.active.mission.name} · $${this.missions.active.mission.pay}`;
      const target = this.missions.currentTarget();
      const dist = target ? Math.round(Math.hypot(target.x - this.player.x, target.z - this.player.z)) : 0;
      objective = `${this.missions.currentLabel()} — ${dist}m`;
    } else if (this.fare) {
      objective = `Taxi fare — drop them off — ${Math.round(Math.hypot(this.fare.x - this.player.x, this.fare.z - this.player.z))}m`;
    }
    return {
      cash: this.cash,
      coins: this.coinsCollected,
      stars: this.wanted.stars,
      missionTitle,
      objective,
      health: this.player.health,
      inCar: !!this.vehicles.playerCar,
      carHealth: this.carHealth,
      speed: this.vehicles.playerCar ? this.vehicles.playerCar.speed : 0,
      station: this.audio.stationName(),
      muted: this.audio.muted,
      playerX: this.player.x,
      playerZ: this.player.z,
      playerYaw: this.camYaw,
      target: this.missions.currentTarget() || this.fare,
      coinDots: this.city.coins.filter((c) => !c.taken).map((c) => ({ x: c.x, z: c.z })),
      trafficDots: this.vehicles.traffic.map((t) => ({ x: t.x, z: t.z })),
      copDots: this.vehicles.cops.map((c) => ({ x: c.x, z: c.z })),
    };
  }

  exposeDebug() {
    window.__solmar = {
      game: this,
      state: () => ({
        cash: this.cash,
        coins: this.coinsCollected,
        stars: this.wanted.stars,
        heat: this.wanted.heat,
        health: this.player.health,
        carHealth: this.carHealth,
        missionIndex: this.missions.index,
        missionState: this.missions.state,
        missionActive: !!this.missions.active,
        inCar: !!this.vehicles.playerCar,
        cops: this.vehicles.cops.length,
        peds: this.peds.peds.length,
        thugs: this.peds.peds.filter((p) => p.thug).length,
        started: this.started,
        paused: this.paused,
        busted: this.busted,
        won: this.won,
        playerX: this.player.x,
        playerZ: this.player.z,
        playerYaw: this.player.yaw,
        carSpeed: this.vehicles.playerCar ? this.vehicles.playerCar.speed : 0,
        fare: !!this.fare,
      }),
      teleport: (x, z) => {
        if (this.vehicles.playerCar) {
          const car = this.vehicles.playerCar;
          car.x = x;
          car.z = z;
          car.speed = 0;
        }
        this.player.reset(x, z);
      },
      startMission: (i) => this.missions.start(i),
      addHeat: (n) => this.wanted.addHeat(n, 'debug'),
      pressKey: (key) => {
        const lower = key.toLowerCase();
        this.input.down.add(lower);
        this.input.pressed.add(lower);
        setTimeout(() => this.input.down.delete(lower), 120);
      },
      holdKey: (key, ms = 500) => {
        const lower = key.toLowerCase();
        this.input.down.add(lower);
        setTimeout(() => this.input.down.delete(lower), ms);
      },
      start: () => this.startGame(),
      // Advance the simulation synchronously without rendering: used by the
      // headless playtest so game time passes faster than SwiftShader frames.
      step: (frames = 1, dt = 0.016) => {
        for (let i = 0; i < frames; i++) {
          this.time += dt;
          this.pollPauseKey();
          if (this.started && !this.paused && !this.busted && !this.won) this.update(dt);
          this.city.update(dt, this.time);
          this.input.endFrame();
        }
      },
    };
  }
}

new Game();
