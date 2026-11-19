// Solmar Bay — keyboard input: held keys plus per-frame "just pressed" edges.

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.anyKey = false;
    this.onKeyDown = (e) => {
      if (e.repeat) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.held.has(k)) this.pressed.add(k);
      this.held.add(k);
      this.anyKey = true;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    this.onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.held.delete(k);
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => this.held.clear());
  }

  // Call once per frame after the game has read the input.
  endFrame() {
    this.pressed.clear();
    this.anyKey = false;
  }

  isDown(...keys) {
    return keys.some((k) => this.held.has(k));
  }

  wasPressed(...keys) {
    return keys.some((k) => this.pressed.has(k));
  }

  // Steering / throttle as -1..1, from WASD or the arrow keys.
  axes() {
    const fwd = (this.isDown('w', 'ArrowUp') ? 1 : 0) - (this.isDown('s', 'ArrowDown') ? 1 : 0);
    const turn = (this.isDown('a', 'ArrowLeft') ? 1 : 0) - (this.isDown('d', 'ArrowRight') ? 1 : 0);
    return { fwd, turn };
  }
}
