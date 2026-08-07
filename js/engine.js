// engine.js - core constants, shared game object, small utils
// Gameplay runs in a 480x270 logical space (all speeds, ranges and stage
// positions are in these units). The canvas is RS times bigger and the render
// transform is scaled to match, so 32-bit art drawn at RS:1 lands pixel-exact
// and carries RS times the detail of the old 16-bit sprites.
// 16:9 so the game fills a browser window; the wall band is 181 and the floor
// band 89, which keeps the old 4:3 framing proportions at the new size.
export const W = 480, H = 270;
export const RS = 2;
export const FLOOR_TOP = 181, FLOOR_BOT = 241;
export const STEP = 1000 / 60; // fixed timestep ms

// One tuning, balanced around what used to be NORMAL. The picker is gone: a single
// well-tuned curve beats three half-tuned ones, and every call site still reads
// through diff() so the multipliers stay in one place.
export const DIFF = { dmg: 1, hp: 1, lives: 3, aggro: 1 };

// Shared mutable game context, populated by main.js.
// Modules import G instead of importing each other (avoids cycles).
export const G = {
  state: 'boot',     // boot|title|hub|intro|play|bossintro|clear|over|ending
  paused: false,
  time: 0,           // frame counter (updates only when not in hitstop)
  rawTime: 0,        // frame counter (always advances, for menus/blink)
  hitstop: 0,        // frames of frozen updates
  parrySlow: 0,      // post-parry half-speed frames; sells the counter without a flash
  shake: 0,          // screen shake magnitude
  flash: 0,          // fullscreen white impact flash frames
  fade: 0,           // 0..1 black fade overlay
  camX: 0,
  camMax: 0,
  camLock: 0,        // camera locked at this x while a wave is active
  locked: false,
  goTimer: 0,        // "GO ->" arrow display timer
  score: 0,
  hiscore: 0,
  lives: 3,
  enemies: [],
  pickups: [],
  props: [],         // breakable scenery (crates, pots, the chaat cart)
  effects: [],
  shots: [],         // boss projectiles
  zones: [],         // lingering floor hazards (chutney puddles, tear gas)
  motes: [],
  birds: [],        // pigeons that scatter when you walk into them
  stageReacts: [],  // local hit impulses that move cloth, dust and birds
  ambientEmitters: [],
  player: null,
  boss: null,
  meter: 0,          // super meter 0..METER_MAX
  combo: 0,          // current hit chain
  comboT: 0,         // frames left before the chain drops
  bestCombo: 0,
  waveIndex: -1,
  waveActive: false,
  stageIndex: 0,
  unlockedStage: 0,
  selectedStage: 0,
  hubSel: null,      // id of the lair fixture the player is standing at, null for none
  hubPanel: null,    // id of the fixture whose panel is open, null for none
  hubAct: 0,         // cursor within the open panel's list
  hubChapter: 0,     // chapter focused on the world map panel
  hubFlex: 0,        // frames left of the mirror pose
  hubSeat: 0,        // frames CHAD has been occupying a station, 0 when he is on his feet
  hubStation: null,  // which one: 'lounge', or a RIGS id in js/hub.js
  hubReps: 0,        // reps done at the current gym station
  hubDrink: 0,       // frames left of the drink at the bar
  hubFeed: 0,        // frames left of feeding the tank
  hubRelicT: 0,      // frames left of the "you came home with this" beat
  hubRelicKey: null, // which boss that relic came off
  actors: [],        // scenery that draws itself and y-sorts with the fighters (the tiger)
  bestComboAll: 0,   // best combo across every run, for the lair's records panel
  actBest: {},       // stage index -> best score, same
  shakePoster: 0,    // frames of "that one is locked" wobble
  stage: null,
  clearStats: null,
  continueT: 0,
  cinematic: null,   // { t, life, title, color } used by named super moves
  audio: null,
};

export const METER_MAX = 100;

export function diff() { return DIFF; }

export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function irand(a, b) { return Math.floor(rand(a, b + 1)); }
export function sign(v) { return v < 0 ? -1 : 1; }

// Entity depth overlap test for beat-em-up hits
export function depthHit(a, b, tol) { return Math.abs(a.y - b.y) <= (tol || 10); }

// ---- ballistics ----
export const GRAVITY = 0.28;

// One airborne step for any body. Returns 'air' while it is still travelling,
// 'bounce' on a hard first landing, or 'land' once it comes to rest.
// The rest test uses the incoming vz, not its absolute value - testing abs let a
// body that touched down with a small negative vz keep its velocity and jitter
// on the floor forever instead of settling.
export function fall(e, g, restitution) {
  e.x += e.vx;
  e.z += e.vz;
  e.vz -= (g === undefined ? GRAVITY : g);
  if (e.z > 0) return 'air';
  e.z = 0;
  if (e.vz < -2.2) {
    e.vz = -e.vz * (restitution === undefined ? 0.35 : restitution);
    e.vx *= 0.6;
    return 'bounce';
  }
  e.vz = 0;
  e.vx = 0;
  return 'land';
}

// True while a body still has an arc to run (z above the floor or any vz left).
export function inAir(e) { return e.z > 0 || e.vz !== 0; }

// ---- juggling ----
// Airborne bodies stay hittable, but each extra hit in one launch does less, so
// a juggle rewards precision instead of looping forever.
const JUGGLE_SCALE = [1, 0.8, 0.65, 0.55, 0.5];

export function juggleMul(e) {
  return JUGGLE_SCALE[Math.min(e.juggle || 0, JUGGLE_SCALE.length - 1)];
}

export function airborne(e) {
  return e.z > 4 || (e.state === 'down' && e.vz !== 0);
}

// ---- arena walls ----
// The old build let bodies slide 30px off-screen, so anything you knocked away
// had to walk all the way back before it was fightable again. The screen edges
// are now solid: a body thrown into one splats and bounces back into play.
export const WALL_PAD = 14;
export const SPLAT_SPEED = 1.5;   // |vx| above this splats instead of just stopping

export function arenaMin() { return G.camX + WALL_PAD; }
export function arenaMax() { return G.camX + W - WALL_PAD; }

// Clamps a body inside the arena. Returns 0 for no wall contact, or -1/+1 for
// the side it splatted against (only when it arrived fast enough to matter).
export function clampToArena(e, restitution) {
  const lo = arenaMin(), hi = arenaMax();
  let side = 0;
  if (e.x < lo) { e.x = lo; side = -1; }
  else if (e.x > hi) { e.x = hi; side = 1; }
  if (!side) return 0;
  if (Math.abs(e.vx) > SPLAT_SPEED) {
    e.vx = -e.vx * (restitution === undefined ? 0.55 : restitution);
    return side;
  }
  e.vx = 0;
  return 0;
}

export function addScore(n) {
  G.score += n;
  if (G.score > G.hiscore) G.hiscore = G.score;
}

export function addMeter(n) {
  G.meter = clamp(G.meter + n, 0, METER_MAX);
}

// Player landed a hit: extend the combo chain, return the new count.
export function bumpCombo() {
  G.combo++;
  G.comboT = 100;
  if (G.combo > G.bestCombo) G.bestCombo = G.combo;
  return G.combo;
}
