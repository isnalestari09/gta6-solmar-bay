// Solmar Bay — keyboard and mouse input, with an edge queue so a single key
// press is never lost between frames. Keys are tracked by their `code`
// (KeyW, ShiftLeft, ...), never by layout-dependent characters.

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.dragging = false;
    this._onKeyDown = (event) => {
      if (event.repeat) return;
      this.down.add(event.code);
      this.pressed.add(event.code);
      // Space and the arrows would scroll the page; the game owns them.
      if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    };
    this._onKeyUp = (event) => {
      this.down.delete(event.code);
    };
    this._onMouseDown = (event) => {
      this.dragging = true;
    };
    this._onMouseUp = () => {
      this.dragging = false;
    };
    this._onMouseMove = (event) => {
      if (!this.dragging) return;
      this.mouseDX += event.movementX || 0;
      this.mouseDY += event.movementY || 0;
    };
    this._onBlur = () => {
      this.down.clear();
      this.dragging = false;
    };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('blur', this._onBlur);
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('blur', this._onBlur);
  }

  isDown(code) {
    return this.down.has(code);
  }

  // Drop every held key: used when the game loses focus or restarts.
  clear() {
    this.down.clear();
    this.pressed.clear();
    this.dragging = false;
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Call once per frame, after the game has read the input, to clear edges.
  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
  }

  // WASD as a -1..1 pair, already normalised for diagonal movement.
  moveAxes() {
    let x = 0;
    let z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    if (x !== 0 && z !== 0) {
      x *= Math.SQRT1_2;
      z *= Math.SQRT1_2;
    }
    return { x, z };
  }
}
