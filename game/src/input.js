// Keyboard + mouse input, polled by the game loop. Keys are tracked by
// `code` so WASD and arrows both work, and clicks are edge-triggered.

export class Input {
  constructor() {
    this.keys = new Set();
    this.clicked = false;       // true for exactly one frame after a click
    this.mouseX = 0;
    this.mouseY = 0;
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      this.keys.add(e.code);
      // Single-press actions are read through `pressed` below.
      this._pressed.add(e.code);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onMouseDown = (e) => {
      this.clicked = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    };
    this._pressed = new Set();
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
  }

  down(code) { return this.keys.has(code); }
  any(...codes) { return codes.some((c) => this.keys.has(c)); }

  // Edge-triggered: true once, then cleared by endFrame().
  pressed(code) { return this._pressed.has(code); }

  endFrame() {
    this._pressed.clear();
    this.clicked = false;
  }

  // Movement axes, -1..1. `forward` is W/Up, `strafe` is A/D or arrows.
  moveAxes() {
    const f = (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0)
      - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
    const s = (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0)
      - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
    return { forward: f, strafe: s };
  }
}
