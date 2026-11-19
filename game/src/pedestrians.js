// Solmar Bay — pedestrians. One job: 26 walkers strolling the sidewalks who
// flee when Dani punches near them, plus the mission thugs and fare passengers.
import * as THREE from 'three';
import { WORLD, PEDESTRIANS } from './config.js';
import { mulberry32 } from './city.js';

const SHIRTS = [0xd94f3d, 0x3d7dd9, 0x3dd95e, 0xd9a83d, 0x9b59b6, 0xecf0f1, 0x1abc9c];

export function makePedFigure(shirt, pants = 0x333333) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.15, 0.55), shirtMat);
  body.position.y = 1.25;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.52), skin);
  head.position.y = 2.1;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.2, 0.56),
    new THREE.MeshLambertMaterial({ color: 0x241a12 }));
  hair.position.y = 2.38;
  g.add(hair);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.8, 0.44), pantsMat);
  legL.position.set(-0.26, 0.4, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.26;
  g.add(legR);
  g.userData = { legL, legR };
  return g;
}

export class Pedestrians {
  constructor(scene, city, seed = 1) {
    this.scene = scene;
    this.city = city;
    this.rand = mulberry32(seed + 21);
    this.peds = []; // { mesh, x, z, yaw, speed, target, flee, health, thug }
    this.build();
  }

  build() {
    for (let i = 0; i < PEDESTRIANS; i++) {
      const shirt = SHIRTS[Math.floor(this.rand() * SHIRTS.length)];
      const mesh = makePedFigure(shirt);
      const x = -180 + this.rand() * 360;
      const z = -170 + this.rand() * 350;
      mesh.position.set(x, 0, z);
      this.scene.add(mesh);
      this.peds.push({
        mesh, x, z, yaw: this.rand() * Math.PI * 2,
        speed: 1.6 + this.rand() * 1.4,
        target: this.pickTarget(x, z),
        flee: 0, health: 100, thug: false, phase: this.rand() * 6,
      });
    }
  }

  pickTarget(x, z) {
    return { x: Math.max(-190, Math.min(190, x + (this.rand() - 0.5) * 120)), z: Math.max(-170, Math.min(190, z + (this.rand() - 0.5) * 120)) };
  }

  spawnThug(x, z) {
    const mesh = makePedFigure(0x8e2f2f, 0x1a1a1a);
    mesh.scale.setScalar(1.15);
    mesh.position.set(x, 0, z);
    this.scene.add(mesh);
    const thug = {
      mesh, x, z, yaw: 0, speed: 3.2, target: { x, z },
      flee: 0, health: 100, thug: true, phase: 0,
    };
    this.peds.push(thug);
    return thug;
  }

  removePed(p) {
    this.scene.remove(p.mesh);
    this.peds = this.peds.filter((q) => q !== p);
  }

  scare(x, z, radius) {
    for (const p of this.peds) {
      if (p.thug) continue; // thugs fight back, they never flee
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < radius) {
        p.flee = 3 + Math.random() * 2;
        p.target = { x: p.x + (p.x - x) * 2, z: p.z + (p.z - z) * 2 };
      }
    }
  }

  // Thugs chase this point (Dani) instead of wandering.
  setThreat(x, z) {
    this.threat = { x, z };
  }

  update(dt, time) {
    for (const p of this.peds) {
      if (p.flee > 0) p.flee -= dt;
      if (p.thug && this.threat) p.target = this.threat;
      const dx = p.target.x - p.x;
      const dz = p.target.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) {
        // Close enough: stand and (for thugs) fight instead of wandering off.
        if (!p.thug) p.target = this.pickTarget(p.x, p.z);
        continue;
      }
      const sp = p.flee > 0 ? p.speed * 2.6 : p.speed;
      p.yaw = Math.atan2(dx, dz);
      const nx = p.x + (dx / d) * sp * dt;
      const nz = p.z + (dz / d) * sp * dt;
      const fixed = this.city.resolveCollision(nx, nz, 0.7);
      p.x = fixed.x;
      p.z = fixed.z;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.yaw;
      p.phase += dt * sp * 2.2;
      p.mesh.userData.legL.rotation.x = Math.sin(p.phase) * 0.5;
      p.mesh.userData.legR.rotation.x = -Math.sin(p.phase) * 0.5;
    }
  }
}
