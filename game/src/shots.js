// Solmar Bay — screenshot presets: ?shot=start|play|chase|mission&seed=N
// stages the game into a deterministic, readable frame for screenshots/.
// The game itself never depends on these; they only drive its public API.

export function applyShot(game, params) {
  const shot = params.get('shot') || 'start';
  game.startGame();
  if (shot === 'start') {
    // The cover: the live plaza in full daylight — Dani on foot at the
    // fountain, palms, towers and the HUD, no menu overlay in the way.
    // He stands just south of the fountain so the camera sits inside the
    // palm ring, not in its canopy.
    game.player.pos.set(0, 0, 8);
    game.player.heading = Math.PI;
    game.player.mesh.position.copy(game.player.pos);
    game.player.updateCamera(1, game.camera);
    return 'start';
  }
  if (shot === 'play') {
    // Dani driving up the main avenue, traffic and towers around him.
    const car = game.vehicles.parked[0];
    game.player.pos.set(car.pos.x, 0, car.pos.z);
    game.player.enterCar(car);
    car.heading = Math.PI;
    car.mesh.rotation.y = Math.PI;
    car.pos.set(0, 0, 120);
    car.mesh.position.set(0, 0, 120);
    game.player.speed = 24;
    game.player.pos.copy(car.pos);
    // Keep the throttle open so the shot catches the car moving, not parked.
    game.shotDrive = true;
    game.player.updateCamera(1, game.camera);
    return 'play';
  }
  if (shot === 'chase') {
    // Three stars: police closing in on Dani at the plaza, on foot.
    game.player.pos.set(6, 0, 10);
    game.player.heading = Math.PI * 0.75;
    game.player.mesh.position.copy(game.player.pos);
    game.player.health = 88;
    game.wanted.setStars(3);
    game.wanted.spawnAround(game.player.pos);
    for (const cop of game.wanted.cops) {
      cop.pos.set(game.player.pos.x + 14, 0, game.player.pos.z - 18);
      cop.mesh.position.copy(cop.pos);
    }
    game.player.updateCamera(1, game.camera);
    return 'chase';
  }
  if (shot === 'mission') {
    // Mission 8, the finale: five stars, Dani running for Lila's boat.
    // He faces south, down the dock road, so the boat, its beacon and the
    // lighthouse are in frame ahead of him.
    game.save.missionIndex = 7;
    game.missions.index = 7;
    game.missions.start();
    game.player.pos.set(120, 0, 196);
    game.player.heading = 0;
    game.player.mesh.position.copy(game.player.pos);
    game.wanted.setStars(5);
    game.wanted.frozen = true;
    game.wanted.spawnAround(game.player.pos);
    game.player.updateCamera(1, game.camera);
    return 'mission';
  }
  return shot;
}
