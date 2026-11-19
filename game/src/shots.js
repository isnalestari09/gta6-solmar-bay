// Solmar Bay — screenshot staging. One job: read ?shot=...&seed=... from the
// URL and place the player, cars and wanted level so each of the four shots
// shows a different system at its best. Only active in staged mode.
export const SHOT_NAMES = ['start', 'drive', 'chase', 'mission8'];

export function readShot() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!SHOT_NAMES.includes(shot)) return null;
  return { name: shot, seed: Number(q.get('seed') || 1) };
}

// Apply a shot's staging to the live game object (see main.js for its shape).
export function applyShot(game, shot) {
  const { player, vehicles, wanted, missions } = game;
  if (shot.name === 'start') {
    player.reset(0, 14);
    player.yaw = Math.PI;
    game.cash = 210;
    game.coinsCollected = 1;
    game.setCameraYaw(Math.PI);
  } else if (shot.name === 'drive') {
    const car = vehicles.parked[0];
    vehicles.playerCar = car;
    car.taken = true;
    car.x = 0;
    car.z = -40;
    car.yaw = Math.PI;
    car.speed = 26;
    player.group.visible = false;
    game.cash = 210;
    game.coinsCollected = 1;
    game.setCameraYaw(Math.PI);
  } else if (shot.name === 'chase') {
    player.reset(0, 14);
    player.yaw = Math.PI;
    wanted.addHeat(55, 'shot');
    game.cash = 210;
    game.coinsCollected = 1;
    game.setCameraYaw(Math.PI);
    // Park the cruisers in a visible V ahead of Dani, closing in.
    const spots = [[-6, 0], [6, 2], [0, -16]];
    vehicles.cops.forEach((cop, i) => {
      const s = spots[i % spots.length];
      cop.x = s[0];
      cop.z = s[1];
      cop.yaw = 0;
    });
  } else if (shot.name === 'mission8') {
    player.reset(0, -140);
    player.yaw = Math.PI;
    missions.start(7);
    game.cash = 210;
    game.coinsCollected = 1;
    game.setCameraYaw(Math.PI);
  }
  game.started = true;
  game.hud.showMenu(false);
}
