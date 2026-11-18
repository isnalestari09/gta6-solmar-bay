// Staged screenshots: `?shot=start|play|chase|mission&seed=1` puts the game
// into a fixed, deterministic pose so headless Chrome renders the exact
// frame the dossier's screenshots show. `applyShot` runs after the game
// world exists and before the first rendered frame.

export function parseShot() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || null,
    seed: Number(q.get('seed') || 1),
  };
}

export function applyShot(game, shot) {
  if (!shot) return false;
  const g = game;
  g.startPlaying(); // skip the title screen in shot mode
  if (shot === 'start') {
    // Title-screen look: Dani on foot at the plaza, fountain behind him.
    g.player.pos.set(0, 0, 34);
    g.player.angle = Math.PI;
    g.player.mesh.position.copy(g.player.pos);
    g.showTitleScreen();
    return true;
  }
  if (shot === 'play') {
    // Driving fast down the main road towards the plaza fountain.
    const car = g.vehicles.parked[3] || g.vehicles.parked[0];
    g.player.pos.set(car.pos.x, 0, car.pos.z);
    g.player.enterCar(car);
    car.pos.set(-180, 0, 60);
    car.angle = Math.PI / 2;
    car.speed = 28;
    g.autoDrive = true; // keep the throttle on for the staged photo
    g.cameraMode = 'car';
    return true;
  }
  if (shot === 'chase') {
    // Three-star chase at speed: two police cars closing in.
    const car = g.vehicles.parked[5] || g.vehicles.parked[0];
    g.player.pos.set(car.pos.x, 0, car.pos.z);
    g.player.enterCar(car);
    car.pos.set(-150, 0, 0);
    car.angle = Math.PI / 2;
    car.speed = 34;
    g.autoDrive = true;
    g.wanted.add(60, 'shot');
    g.wanted._fadeTimer = 999; // keep the stars up for the photo
    const cops = g.vehicles.police;
    const spots = [[30, 6], [-20, -4], [-35, 5]];
    cops.forEach((cop, i) => {
      const [dx, dz] = spots[i % spots.length];
      cop.pos.set(car.pos.x + dx, 0, car.pos.z + dz);
      cop.angle = Math.PI / 2;
      cop.speed = 30;
    });
    g.cameraMode = 'car';
    return true;
  }
  if (shot === 'mission') {
    // On foot at the Coral Kings compound, facing two of their men.
    g.player.pos.set(132, 0, -132);
    g.player.angle = Math.PI * 0.75;
    g.player.mesh.position.copy(g.player.pos);
    g.player.mesh.rotation.y = g.player.angle;
    const near = g.peds.peds.slice(0, 2);
    near[0].pos.set(142, 0, -142);
    near[1].pos.set(138, 0, -146);
    for (const p of near) {
      p.mesh.position.copy(p.pos);
      p.fleeing = 0;
      p.speed = 0; // hold still for the staged photo
      p.angle = Math.atan2(g.player.pos.x - p.pos.x, g.player.pos.z - p.pos.z);
      p.mesh.rotation.y = p.angle;
    }
    g.missions.startMission(6); // finale: "Buy Lila's Freedom"
    g.cameraMode = 'foot';
    return true;
  }
  return false;
}
