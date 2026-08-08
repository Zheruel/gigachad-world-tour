// input.js - keyboard + gamepad: held state, edge presses, double-tap dash
const keyHeld = Object.create(null);
const padHeld = Object.create(null);
const pressedThisFrame = Object.create(null);
const releasedThisFrame = Object.create(null);
const lastTap = { left: -999, right: -999 }; // frame of last tap for double-tap dash
let frame = 0;

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'attack', KeyJ: 'attack',
  KeyX: 'jump', KeyK: 'jump',
  KeyC: 'parry', KeyL: 'parry',
  KeyV: 'super', KeyB: 'super', Space: 'super',
  // 'use' is its own action, not 'up'. THE LAIR used up to trigger a fixture, which is
  // also how you walk into the depth lanes, so standing at the bar and stepping back read
  // as pouring a drink.
  KeyF: 'use', KeyE: 'use',
  KeyP: 'pause', Enter: 'pause',
  // ESC is BOTH. They are handled in different states and never collide: play reads
  // `pause` and ignores `back`, the hub and its panels read `back` and ignore `pause`.
  Escape: ['pause', 'back'],
};

// gamepad button index -> action (standard mapping)
const PADMAP = {
  0: 'attack', 1: 'jump', 2: 'parry', 3: 'super', 5: 'super', 7: 'super',
  8: 'back', 9: 'pause', 12: 'up', 13: 'down', 14: 'left', 15: 'right',
  4: 'use', 6: 'use',
};

const ACTIONS = ['left', 'right', 'up', 'down', 'use', 'attack', 'jump', 'parry', 'super', 'pause', 'back'];

function press(a) {
  // Keep the number of edges, not just a boolean. Several quick taps can arrive
  // during hitstop before the simulation advances; collapsing them into one was
  // why the last hit of a mashed combo sometimes vanished.
  pressedThisFrame[a] = (pressedThisFrame[a] || 0) + 1;
  if (a === 'left' || a === 'right') {
    if (frame - lastTap[a] <= 16) pressedThisFrame[a === 'left' ? 'dashL' : 'dashR'] = true;
    lastTap[a] = frame;
  }
}

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    for (const act of (Array.isArray(a) ? a : [a])) {
      if (!keyHeld[act] && !padHeld[act]) press(act);
      keyHeld[act] = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    for (const act of (Array.isArray(a) ? a : [a])) {
      keyHeld[act] = false; releasedThisFrame[act] = true;
    }
  });
  window.addEventListener('blur', () => {
    for (const k in keyHeld) keyHeld[k] = false;
  });
}

// Poll gamepads once per fixed update, BEFORE game logic reads input.
export function pollGamepad() {
  if (!navigator.getGamepads) return;
  const seen = Object.create(null);
  for (const pad of navigator.getGamepads()) {
    if (!pad || !pad.connected) continue;
    for (const idx in PADMAP) {
      const btn = pad.buttons[idx];
      if (btn && (btn.pressed || btn.value > 0.5)) seen[PADMAP[idx]] = true;
    }
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    if (ax < -0.4) seen.left = true;
    if (ax > 0.4) seen.right = true;
    if (ay < -0.4) seen.up = true;
    if (ay > 0.4) seen.down = true;
  }
  for (const a of ACTIONS) {
    const now = !!seen[a];
    if (now && !padHeld[a] && !keyHeld[a]) press(a);
    if (!now && padHeld[a]) releasedThisFrame[a] = true;
    padHeld[a] = now;
  }
}

// Called once per fixed update, AFTER all game logic has read input.
export function endFrameInput() {
  for (const k in pressedThisFrame) pressedThisFrame[k] = false;
  for (const k in releasedThisFrame) releasedThisFrame[k] = false;
  frame++;
}

function isHeld(a) { return !!keyHeld[a] || !!padHeld[a]; }

export const input = {
  held: isHeld,
  pressed: (a) => !!pressedThisFrame[a],
  count: (a) => pressedThisFrame[a] || 0,
  released: (a) => !!releasedThisFrame[a],
  axisX: () => (isHeld('right') ? 1 : 0) - (isHeld('left') ? 1 : 0),
  axisY: () => (isHeld('down') ? 1 : 0) - (isHeld('up') ? 1 : 0),
};

// Debug/test hook: simulate keys (used by window.__game for headless tests)
export function debugPress(a) { press(a); keyHeld[a] = true; }
export function debugRelease(a) { keyHeld[a] = false; }
