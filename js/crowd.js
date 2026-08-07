// crowd.js - background actors. The stage plates are generated deserted, so every
// person you see on the street is one of these: a short loop placed at an authored
// position, each running at its own rate and phase so nothing moves in lockstep.
//
// Actors sit on one of two depth planes and draw at different points in the stage
// so each gets the light it should. Anyone in the shopfronts draws straight after
// the wall, before the lamp pools, so the same warm wash falls on them as on the
// facade behind them - drawing them after the pools was one reason they looked
// pasted on. Anyone on the road draws after the floor, or the street tile paints
// over their legs.
import { G, W, FLOOR_TOP } from './engine.js';
import { blit, frameW, frameH } from './sprites.js';
import { fx } from './fx.js';
import { audio } from './audio.js';

const FRAMES = {};   // kind -> [Image], and kind + '_r' -> react frames

// kind -> how many loop frames to look for. Only actors that hold together frame to
// frame survive here: loops that move one limb against a still body stay locked,
// loops that move the whole body come back with the scene recomposed.
const KINDS = {
  chai: 4, spice: 4, barber: 3, tailor: 3, fan: 3, porter: 4, dog: 2,
  rick: 2, cow: 4,
};
const REACTORS = ['chai', 'spice', 'barber', 'tailor', 'fan', 'porter'];

// How big each actor should be, and against what. The game does not scale sprites by
// depth, so the distance between the stall line and the road only exists here.
//
//   plane  where it stands: 0.82x a fighter behind the kerb, 0.94x on the road
//   pose   how tall this pose is compared to the same person standing up
//   band   what the figure is actually seen against - which is not the same question
//          as where it stands. Only the dog, lying on the road, is read against the
//          road; a man walking it is still silhouetted against the facade.
//
// tools/process_npcs.py reads this table rather than keeping its own copy, so the size
// the art is baked to and the size the lab checks for can never drift apart.
export const KIND_META = {
  chai: { plane: 'facade', pose: 1.00, band: 'wall' },
  spice: { plane: 'facade', pose: 1.00, band: 'wall' },
  barber: { plane: 'facade', pose: 1.00, band: 'wall' },
  tailor: { plane: 'facade', pose: 0.60, band: 'wall' },   // cross legged
  fan: { plane: 'facade', pose: 0.64, band: 'wall' },      // squatting
  porter: { plane: 'street', pose: 1.00, band: 'wall' },
  dog: { plane: 'street', pose: 0.24, band: 'floor' },     // lying down
  rick: { plane: 'facade', pose: 0.92, band: 'wall' },
  cow: { plane: 'facade', pose: 0.80, band: 'wall' },
};
export const PLANES = { facade: 0.82, street: 0.94 };
export const HERO_H = 96;

export function expectedHeight(kind) {
  const m = KIND_META[kind];
  return m ? Math.round(HERO_H * PLANES[m.plane] * m.pose) : 0;
}

// how close a fight has to get before the market notices it
const REACT_NEAR = 96;
const REACT_CLOSE = 52;

let overrides = {};

function load(name, n) {
  FRAMES[name] = [];
  return Array.from({ length: n }, (_, i) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { img._as = 2; FRAMES[name][i] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = `assets/npc/${name}${i + 1}.png`;
  }));
}

export function loadCrowd() {
  const jobs = Object.entries(KINDS).flatMap(([kind, n]) => load(kind, n));
  for (const k of REACTORS) jobs.push(...load(k + '_r', 2));
  // Placements are tuned in the lab against the actual art and saved here, so the
  // stage list stays the authored default and the lab does not have to edit code.
  jobs.push(fetch('assets/frames/crowd.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((j) => { overrides = j || {}; })
    .catch(() => {}));
  return Promise.all(jobs);
}

export function crowdKey(d) { return `${d.kind}@${d.x}`; }
export function crowdOverrides() { return overrides; }
export function setOverride(key, o) { overrides[key] = { ...overrides[key], ...o }; }

// Turn a stage's authored crowd list into live actors.
export function initCrowd(list) {
  G.crowd = (list || []).map((d, i) => {
    const o = overrides[crowdKey(d)] || {};
    const x = o.x === undefined ? d.x : o.x;
    const y = o.y === undefined ? d.y : o.y;
    return {
      kind: d.kind,
      key: crowdKey(d),
      x, y,
      scale: o.scale === undefined ? (d.scale || 1) : o.scale,
      alpha: d.alpha === undefined ? 1 : d.alpha,
      fps: d.fps || 6,
      // a per-actor phase offset, derived from position so it is stable across restarts
      phase: (d.phase === undefined ? (i * 37 + d.x) % 120 : d.phase),
      flip: !!d.flip,
      baseFlip: !!d.flip,
      still: !!d.still,
      frame: d.frame || 0,
      // patrol: [fromX, toX] makes the actor walk the street instead of standing still
      patrol: d.patrol || null,
      // cross: [fromX, toX] sends the actor across once, then waits out of sight
      cross: d.cross || null,
      period: d.period || 900,
      speed: d.speed || 0.35,
      shadow: d.shadow === undefined ? 1 : d.shadow,
      dir: 1,
      px: x,
      wait: (i * 211) % (d.period || 900),
      honk: 40 + (i * 53) % 90,
      react: 0,
    };
  });
}

// Pigeons on the street that scatter when you walk into them. Real sprites this
// time - the old ones were three grey rectangles with a 3x1 bar for a 'wing'.
export function initBirds(list) {
  G.birds = (list || []).map((b) => ({
    homeX: b.x, homeY: b.y, x: b.x, y: b.y,
    vx: 0, vy: 0, flying: false, t: 0, phase: (b.x | 0) % 40,
  }));
}

export function updateBirds() {
  const p = G.player;
  if (!G.birds) return;
  for (const b of G.birds) {
    if (!b.flying) {
      // scatter when something big gets close
      if (p && Math.abs(p.x - b.x) < 40 && Math.abs(p.y - b.y) < 26) {
        b.flying = true; b.t = 0;
        b.vx = (b.x < p.x ? -1 : 1) * (1.1 + Math.random() * 0.9);
        b.vy = -(0.9 + Math.random() * 0.6);
      }
      continue;
    }
    b.t++;
    b.x += b.vx; b.y += b.vy; b.vy += 0.012;
    if (b.t > 190) {              // settle back once the street is clear again
      b.flying = false; b.t = 0;
      b.x = b.homeX; b.y = b.homeY; b.vx = 0; b.vy = 0;
    }
  }
}

export function drawBirds(ctx, camX) {
  if (!G.birds) return;
  for (const b of G.birds) {
    // perched, or alternating flap frames in the air
    const f = fx('bird', b.flying ? 1 + (((G.rawTime + b.phase) >> 2) & 1) : 0);
    if (!f) continue;
    const sx = Math.round(b.x - camX);
    if (sx < -20 || sx > 500) continue;
    blit(ctx, f, sx - frameW(f) / 2, Math.round(b.y) - frameH(f));
  }
}

// How near the fighting is to this actor: 0 nothing, 1 nearby, 2 right on top of it.
function threatAt(x) {
  let d = 1e9;
  const p = G.player;
  const foes = G.enemies || [];
  if (p && !p.dead) d = Math.min(d, Math.abs(p.x - x));
  for (const e of foes) if (!e.removeMe) d = Math.min(d, Math.abs(e.x - x));
  if (G.boss && !G.boss.removeMe) d = Math.min(d, Math.abs(G.boss.x - x));
  const fighting = foes.some((e) => !e.removeMe) || (G.boss && !G.boss.removeMe);
  if (!fighting) return 0;
  return d < REACT_CLOSE ? 2 : d < REACT_NEAR ? 1 : 0;
}

export function updateCrowd() {
  if (!G.crowd) return;
  for (const a of G.crowd) {
    if (FRAMES[a.kind + '_r'] && FRAMES[a.kind + '_r'].length) a.react = threatAt(a.x);

    if (a.cross) {
      // traffic: waits off screen, crosses once, waits again. Long enough between
      // runs that it reads as the world carrying on rather than a shuttle.
      a.wait++;
      if (a.wait < a.period) { a.px = a.cross[0]; continue; }
      a.px += a.dir * a.speed;
      // it only makes a sound while it is actually on screen, so the noise always has
      // something visible attached to it
      const onScreen = a.px > G.camX - 40 && a.px < G.camX + W + 40;
      if (onScreen && --a.honk <= 0) {
        a.honk = 150 + ((a.px | 0) % 130);
        audio.sfx(a.kind === 'cow' ? 'moo' : 'horn');
      }
      if (a.px > a.cross[1]) { a.wait = 0; a.px = a.cross[0]; }
      continue;
    }
    if (!a.patrol) continue;
    // A reacting porter stops walking; standing still while flinching is the point.
    if (a.react) continue;
    a.px += a.dir * a.speed;
    if (a.px > a.patrol[1]) { a.px = a.patrol[1]; a.dir = -1; }
    else if (a.px < a.patrol[0]) { a.px = a.patrol[0]; a.dir = 1; }
    a.flip = a.dir < 0 ? !a.baseFlip : a.baseFlip;
  }
}

function frameOf(a) {
  const frames = FRAMES[a.kind];
  if (!frames || !frames.length) return null;
  // A still actor holds one pose forever. The balcony sheet is three DIFFERENT men
  // rather than three poses of one, so cycling it would morph one into another; each
  // is placed as its own onlooker instead.
  if (a.still) return frames[a.frame % frames.length];
  if (a.react) {
    const r = FRAMES[a.kind + '_r'];
    if (r && r.length) return r[Math.min(a.react, r.length) - 1];
  }
  // The loop clock never stops, so an actor that has been reacting rejoins its cycle
  // where it would have been rather than snapping back to the first pose.
  return frames[Math.floor((G.rawTime + (a.phase || 0)) / (60 / a.fps)) % frames.length];
}

function actorPlane(a) { return a.y <= FLOOR_TOP ? 'facade' : 'street'; }

// What this actor is actually drawn at, so a test can check the art against the size
// the table says it should be rather than trusting the pipeline ran.
export function crowdDrawnHeight(a) {
  const f = FRAMES[a.kind] && FRAMES[a.kind][0];
  return f ? Math.round(frameH(f) * (a.scale || 1)) : 0;
}

export function drawCrowd(ctx, camX, plane) {
  if (!G.crowd) return;
  for (const a of G.crowd) {
    if (plane && actorPlane(a) !== plane) continue;
    const f = frameOf(a);
    if (!f) continue;
    const x = (a.patrol || a.cross) ? a.px : a.x;
    const sx = Math.round(x - camX);
    if (sx < -160 || sx > 640) continue;
    const w = Math.round(frameW(f) * a.scale), h = Math.round(frameH(f) * a.scale);
    const dx = sx - Math.round(w / 2), dy = Math.round(a.y) - h;
    if (a.shadow) {
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx, Math.round(a.y) + 1, Math.max(4, w * 0.32), 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = a.alpha === undefined ? 1 : a.alpha;
    if (a.flip) {
      ctx.save();
      ctx.scale(-1, 1);
      blit(ctx, f, -dx - w, dy, w, h);
      ctx.restore();
    } else {
      blit(ctx, f, dx, dy, w, h);
    }
    ctx.globalAlpha = 1;
  }
}
