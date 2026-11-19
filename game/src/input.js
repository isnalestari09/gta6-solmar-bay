// Keyboard + mouse input. Tracks held keys, just-pressed keys, and the
// mouse position for aiming. Cleared on demand so a pause toggle cannot
// fire twice in one frame.

export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.held.has(k)) this.pressed.add(k);
      this.held.add(k);
    };
    this._onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.held.delete(k);
    };
    this._onMouseMove = (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; };
    this._onMouseDown = (e) => { this.mouse.down = true; this.mouse.clicked = true; };
    this._onMouseUp = () => { this.mouse.down = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  isDown(key) { return this.held.has(key); }
  wasPressed(key) { return this.pressed.has(key); }
  // Call once per frame after the game has read the input.
  endFrame() { this.pressed.clear(); this.mouse.clicked = false; }
  clearAll() { this.held.clear(); this.pressed.clear(); }
  lastPressed() {
    if (this.pressed.size === 0) return null;
    return [...this.pressed].pop();
  }
}
