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
  // Per-fight arena override, in logical px of inset PER SIDE. Pappu's chalk circle,
  // the train roof and the tower lobby are one feature wearing three hats, so the
  // walls live here rather than in any one fight. Everything writes the TARGET and
  // updateWaves owns the ramp - a fight that wrote the number directly would fight
  // the release for as long as it took to die.
  arenaSqueeze: 0,
  arenaSqueezeTarget: 0,
  ringWobble: 0,        // frames the crowd around the chalk ring jumps for
  // the rear wall alone, for Birju's uncouple: the roof gets shorter from the back
  arenaRear: 0,
  arenaRearTarget: 0,
  train: null,            // THE NIGHT TRAIN's state, js/train.js; null on every other stage
  sluice: null,           // { t } once the outfall is armed, for the ghat's rhythm
  runnerEscaped: false,   // the dabbawala got away, so the next gate is two men heavier
  introResume: null,      // wave state parked across a miniboss reveal
  shutterT: 0,            // shopfront rollers, driven by G.locked
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
  rank: -1,          // index into RANKS the chain last reached
  rankT: 0,          // frames the rank word has left on the HUD
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
  // The jukebox's pick. Deliberately NOT saved: a fresh start always comes up on the
  // room's own track, and the pick only lasts the session it was made in.
  hubTrack: null,
  hubFlex: 0,        // frames left of the mirror pose
  hubSeat: 0,        // frames CHAD has been occupying a station, 0 when he is on his feet
  hubStation: null,  // which one: 'lounge' or 'bar'
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
export function rand(a, b) { return a + Math.random() * (b - a); }
export function irand(a, b) { return Math.floor(rand(a, b + 1)); }
export function sign(v) { return v < 0 ? -1 : 1; }

// Entity depth overlap test for beat-em-up hits

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

export function arenaMin() { return G.camX + WALL_PAD + (G.arenaSqueeze || 0) + (G.arenaRear || 0); }
export function arenaMax() { return G.camX + W - WALL_PAD - (G.arenaSqueeze || 0); }

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

// Movement multiplier for a body standing in a dragging zone (the dredger's spoil
// dump). 1 when it is standing in nothing, which is almost always. It lives here
// rather than in shots.js because player.js needs it and shots.js imports player.js.
export function zoneDrag(e) {
  let m = 1;
  for (const z of G.zones) {
    if (z.drag === undefined || z.drag === 1) continue;
    if (Math.abs(e.x - z.x) < z.r && Math.abs(e.y - z.y) < 14 && e.z < 12) m = Math.min(m, z.drag);
  }
  return m;
}

// ---- the depth lane ----
// FLOOR_TOP..FLOOR_BOT everywhere by default. A stage can raise the back over a span of
// x with `pits: [{x0, x1, y}]` (the ghat: past that lip there is no floor), or replace
// the whole lane with `lanes: [{x0, x1, top, bot, edge}]` - the train's corridor is 30
// px deep and its roof is 80, and `edge` marks a lane whose FRONT is a drop too.
export function laneAt(x) {
  const lanes = G.stage && G.stage.lanes;
  if (lanes) for (const l of lanes) if (x >= l.x0 && x < l.x1) return l;
  return null;
}
export function laneMin(x) {
  const l = laneAt(x);
  if (l) return l.top;
  const pits = (G.stage && G.stage.pits) || null;
  if (!pits) return FLOOR_TOP;
  for (const p of pits) if (x >= p.x0 && x < p.x1) return p.y;
  return FLOOR_TOP;
}
export function laneMax(x) {
  const l = laneAt(x);
  return l ? l.bot : FLOOR_BOT;
}

// Puts a body back on the lane and returns -1 when it went over the lip of a real
// pit at the back, +1 when it went over a lane's front edge. A body on its own feet is
// clamped out; a body that is down, thrown or being dragged goes in. That distinction
// is the whole design - you cannot walk into the river, you can only be PUT in it.
// `lo > FLOOR_TOP` is the "there is water here" test, so a stage with no pits behaves
// exactly as it always did.
export function clampToLane(e) {
  if (e.noLane) return 0;
  const lo = laneMin(e.x), hi = laneMax(e.x);
  const helpless = e.state === 'down' || e.state === 'thrown' || e.state === 'grabbed';
  if (e.y > hi) {
    const l = laneAt(e.x);
    e.y = hi;
    return l && l.edge && helpless ? 1 : 0;
  }
  if (e.y >= lo) return 0;
  const fell = lo > FLOOR_TOP && helpless;
  e.y = lo;
  return fell ? -1 : 0;
}

export function addScore(n) {
  G.score += n;
  if (G.score > G.hiscore) G.hiscore = G.score;
}

export function addMeter(n) {
  G.meter = clamp(G.meter + n, 0, METER_MAX);
}

// The style ladder, DMC-style: a letter, its word, and the announcer's two takes of it
// (audio/voice/rank_<key>_1.wav and _2). Reaching a rank says it; from B up, if the
// announcer is missing, Duke has something to say instead.
export const RANKS = [
  { at: 3, letter: 'D', word: 'DISMAL', key: 'dismal', color: '#c8c0e0' },
  { at: 6, letter: 'C', word: 'CRAZY', key: 'crazy', color: '#ffd94a' },
  { at: 10, letter: 'B', word: 'BADASS', key: 'badass', color: '#ffb040' },
  { at: 15, letter: 'A', word: 'APOCALYPTIC', key: 'apocalyptic', color: '#ff7a3a' },
  { at: 22, letter: 'S', word: 'SAVAGE', key: 'savage', color: '#ff4f6a' },
  { at: 30, letter: 'SS', word: 'SICK SKILLS', key: 'sickskills', color: '#e060ff' },
  { at: 40, letter: 'SSS', word: 'SMOKIN\' SEXY STYLE', key: 'sss', color: '#fff2a0' },
];

// Player landed a hit: extend the combo chain, return the new count.
export function bumpCombo() {
  G.combo++;
  G.comboT = 100;
  if (G.combo > G.bestCombo) G.bestCombo = G.combo;
  const r = RANKS.findIndex((k) => k.at === G.combo);
  if (r >= 0) {
    G.rank = r; G.rankT = 90;
    if (G.audio) {
      const k = RANKS[r].key;
      const said = G.audio.voiceRandom([`rank_${k}_1`, `rank_${k}_2`], 900, 0);
      if (!said && r >= 2) G.audio.voiceRandom(DUKE_COMBO, 1600);
    }
  }
  return G.combo;
}
const DUKE_COMBO = ['duke_combo_1', 'duke_combo_2', 'duke_combo_3', 'duke_combo_4', 'duke_combo_5', 'duke_combo_6', 'duke_gotta_hurt', 'duke_look_good'];
