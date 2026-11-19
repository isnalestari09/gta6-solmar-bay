// Solmar Bay — keyboard and mouse input with edge detection.
// WASD move, Shift sprint, E enter/exit car, F punch, P pause, 1-4 radio, R cycle radio, M mute.

const held = new Set();
const pressed = new Set();
let mouseDX = 0;
let mouseDY = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;
let anyKeyCallback = null;

export const Input = {
  get mouseDX() {
    return mouseDX;
  },
  get mouseDY() {
    return mouseDY;
  },
  isDown(code) {
    return held.has(code);
  },
  wasPressed(code) {
    return pressed.has(code);
  },
  moveAxis() {
    let x = 0;
    let z = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) z -= 1;
    if (held.has('KeyS') || held.has('ArrowDown')) z += 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
    if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
    return { x, z };
  },
  driveAxis() {
    let throttle = 0;
    let steer = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) throttle += 1;
    if (held.has('KeyS') || held.has('ArrowDown')) throttle -= 1;
    if (held.has('KeyA') || held.has('ArrowLeft')) steer += 1;
    if (held.has('KeyD') || held.has('ArrowRight')) steer -= 1;
    return { throttle, steer };
  },
  sprinting() {
    return held.has('ShiftLeft') || held.has('ShiftRight');
  },
  get isDragging() {
    return dragging;
  },
  clearFrame() {
    pressed.clear();
    mouseDX = 0;
    mouseDY = 0;
  },
  // Drop every held and just-pressed key (tab switch, window blur): a key
  // held at hide time would otherwise stay stuck forever.
  flush() {
    held.clear();
    pressed.clear();
  },
  onAnyKey(fn) {
    anyKeyCallback = fn;
  },
};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    held.add(e.code);
    pressed.add(e.code);
    if (anyKeyCallback) anyKeyCallback(e.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault(); // Space is the punch key: stop it scrolling the page
    }
  });
  window.addEventListener('keyup', (e) => {
    held.delete(e.code);
  });
  window.addEventListener('blur', () => {
    Input.flush();
  });
  // A hidden tab keeps firing no keyups, so a key held at hide time would
  // stay stuck forever. Clear the held set when the page is hidden too.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) Input.flush();
  });
  canvas.addEventListener('mousedown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    mouseDX += e.clientX - lastX;
    mouseDY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    dragging = false;
  });
  canvas.addEventListener('touchstart', (e) => {
    dragging = true;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    mouseDX += e.touches[0].clientX - lastX;
    mouseDY += e.touches[0].clientY - lastY;
    lastX = e.touches[0].clientX;
    lastY = e.touches[0].clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', () => {
    dragging = false;
  });
}
