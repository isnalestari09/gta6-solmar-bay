// player.js — Dani Reyes on foot: third-person movement, jumping, punching and
// shooting, and the chase camera that follows him (or his car) around Solmar Bay.

import * as THREE from '../vendor/three.module.min.js';
import { PLAYER, PALETTE } from './config.js';
import { hitsCollider, clampToCity } from './city.js';

/** Build Dani: a low-poly figure with a green shirt, dark trousers and a cap. */
export function buildPlayerMesh() {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: PALETTE.playerShirt });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98a5e });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), shirt);
  body.position.y = 1.25;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xd94040 }));
  cap.position.y = 2.36;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.32), pants);
  legL.position.set(-0.22, 0.45, 0);
  group.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.22;
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.26), shirt);
  armL.position.set(-0.6, 1.25, 0);
  group.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.6;
  group.add(armR);
  group.userData.legL = legL;
  group.userData.legR = legR;
  group.userData.armL = armL;
  group.userData.armR = armR;
  return group;
}

export function createPlayer(scene, x, z) {
  const mesh = buildPlayerMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh,
    x, z, y: 0, vy: 0,
    angle: 0,
    health: PLAYER.health,
    ammo: PLAYER.ammoStart,
    cash: 0,
    onGround: true,
    walkPhase: 0,
    inCar: null,
  };
}

/** Move Dani on foot: WASD relative to the camera, run, jump, collide, animate. */
export function updatePlayerOnFoot(player, input, camYaw, dt, colliders) {
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  let mx = 0;
  let mz = 0;
  if (input.forward) { mx += -Math.sin(camYaw); mz += -Math.cos(camYaw); }
  if (input.back) { mx += Math.sin(camYaw); mz += Math.cos(camYaw); }
  if (input.left) { mx += -Math.cos(camYaw); mz += Math.sin(camYaw); }
  if (input.right) { mx += Math.cos(camYaw); mz += -Math.sin(camYaw); }
  const len = Math.hypot(mx, mz);
  if (len > 0) {
    mx /= len;
    mz /= len;
    player.angle = Math.atan2(mx, mz);
    const nx = player.x + mx * speed * dt;
    const nz = player.z + mz * speed * dt;
    const clamped = clampToCity(nx, nz);
    if (!hitsCollider(colliders, clamped.x, clamped.z, 0.8)) {
      player.x = clamped.x;
      player.z = clamped.z;
    }
    player.walkPhase += dt * speed * 1.4;
  }
  if (input.jump && player.onGround) {
    player.vy = PLAYER.jumpSpeed;
    player.onGround = false;
  }
  player.vy += PLAYER.gravity * dt;
  player.y += player.vy * dt;
  if (player.y <= 0) {
    player.y = 0;
    player.vy = 0;
    player.onGround = true;
  }
  const swing = len > 0 ? Math.sin(player.walkPhase) * 0.5 : 0;
  player.mesh.userData.legL.rotation.x = swing;
  player.mesh.userData.legR.rotation.x = -swing;
  player.mesh.userData.armL.rotation.x = -swing * 0.7;
  player.mesh.userData.armR.rotation.x = swing * 0.7;
  player.mesh.position.set(player.x, player.y, player.z);
  player.mesh.rotation.y = player.angle;
}

/** A third-person chase camera: orbit with the mouse, wheel to zoom, smooth follow. */
export function createChaseCamera(camera) {
  return {
    yaw: 0,
    pitch: 0.32,
    distance: 11,
    update(target, dt) {
      const cx = target.x - Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
      const cz = target.z - Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;
      const cy = (target.y ?? 0) + 2.2 + Math.sin(this.pitch) * this.distance;
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 8));
      camera.lookAt(target.x, (target.y ?? 0) + 1.6, target.z);
    },
  };
}

/** Fire a hitscan shot from the player toward the aim point; returns the hit target. */
export function shootAt(player, aimPoint, targets, audio) {
  if (player.ammo <= 0) {
    audio?.clickEmpty();
    return null;
  }
  player.ammo -= 1;
  audio?.gunshot();
  let best = null;
  let bestDist = Infinity;
  const from = new THREE.Vector3(player.x, player.y + 1.6, player.z);
  const dir = new THREE.Vector3(aimPoint.x - from.x, 0, aimPoint.z - from.z).normalize();
  for (const t of targets) {
    const dx = t.x - from.x;
    const dz = t.z - from.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < 0 || along > 60) continue;
    const perp = Math.abs(dx * dir.z - dz * dir.x);
    if (perp < 1.4 && along < bestDist) {
      best = t;
      bestDist = along;
    }
  }
  if (best) best.health -= PLAYER.bulletDamage;
  return best;
}
