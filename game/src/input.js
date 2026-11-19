// Solmar Bay — keyboard input. One job: track which keys are down and
// turn raw keydown events into single "pressed" edges the game consumes.
export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.down.add(k);
      this.pressed.add(k);
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
    };
    this.onKeyUp = (e) => this.down.delete(e.key.toLowerCase());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.down.clear());
  }

  held(...keys) {
    return keys.some((k) => this.down.has(k));
  }

  // True once for the frame the key went down; the game clears edges each tick.
  wasPressed(key) {
    return this.pressed.has(key.toLowerCase());
  }

  endFrame() {
    this.pressed.clear();
  }

  // WASD / arrows as a -1..1 move vector in camera space.
  moveVector() {
    let x = 0;
    let z = 0;
    if (this.held('w', 'arrowup')) z -= 1;
    if (this.held('s', 'arrowdown')) z += 1;
    if (this.held('a', 'arrowleft')) x -= 1;
    if (this.held('d', 'arrowright')) x += 1;
    const len = Math.hypot(x, z) || 1;
    return { x: x / len, z: z / len, active: x !== 0 || z !== 0 };
  }
}
