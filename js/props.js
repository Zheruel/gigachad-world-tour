// props.js - breakable market scenery. Props are duck-typed like fighters (they
// expose hurt()), so player.js hits them through the same target list and
// main.js y-sorts them with everything else. No special-casing in the combat code.
import { G, addScore } from './engine.js';
import { ASSETS } from './assets.js';
import { Pix, blit, frameW, frameH } from './sprites.js';
import { spawnDebris, spawnDust, spawnPop, impact } from './effects.js';
import { spawnZone } from './shots.js';

// kind -> { hp, w, h, shadowR, score, drop, debris }
export const PROP_TYPES = {
  crate: { hp: 20, w: 30, h: 32, shadowR: 14, score: 50, drop: 'shake', debris: ['#b0682e', '#8a4a20', '#d8a860'] },
  matka: { hp: 12, w: 24, h: 26, shadowR: 11, score: 30, drop: null, debris: ['#a4562c', '#7c3a1c', '#c98a58'] },
  tyres: { hp: 26, w: 32, h: 34, shadowR: 15, score: 50, drop: null, debris: ['#2a2a2e', '#3c3c42', '#18181c'] },
  table: { hp: 18, w: 44, h: 30, shadowR: 20, score: 40, drop: 'plate', debris: ['#8a6a3a', '#c0a068', '#5a4426'] },
  sign: { hp: 14, w: 40, h: 22, shadowR: 0, score: 60, drop: null, debris: ['#c02a2a', '#f0c040', '#f8f0e0'] },
  cart: { hp: 45, w: 58, h: 44, shadowR: 26, score: 150, drop: 'shake', debris: ['#c08a3a', '#8a5a20', '#d8d0b8'] },
  // the dojo heavy bag. js/hub.js builds it with its own hurt() so it never breaks;
  // this entry exists for the footprint and so tools/process_props.py can size the art.
  bag: { hp: 9999, w: 24, h: 84, shadowR: 0, score: 0, drop: null, debris: ['#5a3a20', '#3a2414', '#8a6a44'] },

  // ---- DIRTY DELHI ----
  // `art` borrows another prop's sprite until this one has its own generation.
  // the level's only 1-up, one lane back behind a stall you have to break first
  mithai: { hp: 10, w: 26, h: 20, shadowR: 11, score: 200, drop: 'life', art: 'crate', debris: ['#f0d0a0', '#e8a840', '#c86030'] },
  // it drops nothing: it BECOMES terrain, which is better, because the designer
  // places it and both sides can be pushed into it
  drum: { hp: 18, w: 30, h: 40, shadowR: 14, score: 60, drop: null, art: 'tyres',
    burst: { kind: 'chutney', r: 30, life: 720 }, debris: ['#2a6a9a', '#4a8aba', '#d8d0b0'] },
  // six along Langda's arena, each one shortening the wire he can run
  bracket: { hp: 15, w: 18, h: 14, shadowR: 0, score: 80, drop: null, art: 'sign', debris: ['#5a5a62', '#8a8a92', '#3a3a42'] },
  // the heavy's prop: a handcart in the market, a boat pole on the ghat
  thelacart: { hp: 30, w: 54, h: 40, shadowR: 24, score: 120, drop: null, art: 'cart', debris: ['#c08a3a', '#8a5a20', '#d8d0b8'] },
  thelapole: { hp: 30, w: 70, h: 14, shadowR: 10, score: 120, drop: null, art: 'sign', debris: ['#a8804a', '#6a4a24', '#d0b888'] },
  // break it and the dhobi loses 34 px of the longest reach in the game
  dhobislab: { hp: 40, w: 46, h: 18, shadowR: 20, score: 160, drop: null, art: 'table', debris: ['#8a8a8a', '#b8b8b0', '#5a5a58'] },
};

// ---- procedural art (swapped for AI PNGs later without touching this file) --
const ART = {};

function crate(broken) {
  const P = new Pix(30, 32);
  if (broken) {
    P.rect(2, 22, 26, 10, '#7c4420');
    P.rect(2, 22, 26, 2, '#b0682e');
    for (let i = 0; i < 5; i++) P.rect(3 + i * 6, 24 + (i % 2), 4, 6, '#8a4a20');
    P.rect(0, 30, 30, 2, '#5a2e14');
    return P.c;
  }
  P.rect(1, 4, 28, 28, '#8a4a20');
  P.rect(1, 4, 28, 3, '#c08a4a');
  P.rect(1, 4, 3, 28, '#a4602c');
  P.rect(26, 4, 3, 28, '#6a3616');
  for (let y = 9; y < 30; y += 7) P.rect(2, y, 26, 2, '#b0682e');
  P.rect(12, 4, 5, 28, '#a4602c');
  P.rect(0, 30, 30, 2, '#4a2410');
  // fruit spilling over the top
  P.disc(8, 4, 3, '#d84a30'); P.disc(15, 3, 3, '#e8a020'); P.disc(22, 4, 3, '#4a9a30');
  return P.c;
}

function matka(broken) {
  const P = new Pix(24, 26);
  if (broken) {
    P.rect(4, 20, 16, 6, '#8a4426');
    P.rect(2, 24, 20, 2, '#6a2e18');
    P.rect(6, 18, 4, 4, '#a4562c');
    P.rect(15, 19, 3, 3, '#a4562c');
    return P.c;
  }
  P.disc(12, 15, 10, '#a4562c');
  P.disc(10, 12, 7, '#c07040');
  P.rect(8, 2, 8, 6, '#8e4622');
  P.rect(7, 1, 10, 2, '#c98a58');
  P.rect(2, 24, 20, 2, '#4a2010');
  P.hline(4, 20, 16, '#7c3a1c');
  return P.c;
}

function tyres(broken) {
  const P = new Pix(32, 34);
  const n = broken ? 1 : 3;
  for (let i = 0; i < n; i++) {
    const y = 32 - i * 10 - (broken ? 0 : 0);
    P.disc(16, y - 4, 13, '#2a2a2e');
    P.disc(16, y - 4, 7, '#48484e');
    P.disc(16, y - 4, 5, '#1a1a1e');
    for (let a = 0; a < 8; a++) {
      const ax = 16 + Math.cos(a) * 11, ay = y - 4 + Math.sin(a) * 4;
      P.px(ax | 0, ay | 0, '#3c3c42');
    }
  }
  if (broken) { P.rect(2, 30, 28, 3, '#18181c'); }
  return P.c;
}

function table(broken) {
  const P = new Pix(44, 30);
  if (broken) {
    P.rect(2, 24, 40, 4, '#7a5a2e');
    P.rect(6, 20, 10, 4, '#8a6a3a');
    P.rect(24, 21, 12, 3, '#8a6a3a');
    return P.c;
  }
  P.rect(0, 6, 44, 5, '#a4844a');
  P.rect(0, 6, 44, 2, '#c0a068');
  P.rect(4, 11, 4, 19, '#7a5a2e');
  P.rect(36, 11, 4, 19, '#7a5a2e');
  // chai glasses
  P.rect(9, 1, 4, 5, '#d8d8e0'); P.rect(9, 2, 4, 3, '#a4682c');
  P.rect(17, 2, 4, 4, '#d8d8e0'); P.rect(17, 3, 4, 2, '#a4682c');
  P.rect(28, 0, 8, 6, '#c8c0a8'); P.rect(29, 1, 6, 4, '#8a7a56');
  return P.c;
}

function sign(broken) {
  const P = new Pix(40, 22);
  if (broken) {
    P.rect(0, 0, 16, 3, '#6a6a70');
    P.rect(2, 3, 12, 8, '#8a2020');
    P.rect(26, 2, 12, 7, '#a08020');
    return P.c;
  }
  P.rect(0, 0, 40, 2, '#6a6a70');
  P.rect(2, 2, 36, 16, '#c02a2a');
  P.rect(2, 2, 36, 2, '#f04a4a');
  P.rect(4, 6, 32, 3, '#f0c040');
  P.rect(4, 11, 22, 3, '#f8f0e0');
  P.rect(3, 18, 34, 2, '#8a1414');
  return P.c;
}

function cart(broken) {
  const P = new Pix(58, 44);
  if (broken) {
    P.rect(2, 30, 54, 12, '#8a5a20');
    P.rect(2, 30, 54, 2, '#c08a3a');
    P.disc(14, 40, 6, '#2a2a2e');
    P.rect(24, 24, 14, 7, '#a8a098');
    for (let i = 0; i < 8; i++) P.px(6 + i * 6, 27 + (i % 4), '#4a7a26');
    return P.c;
  }
  // striped awning
  for (let i = 0; i < 8; i++) P.rect(i * 7, 0, 7, 7, i % 2 ? '#e04a30' : '#f0e8d8');
  P.rect(0, 7, 58, 2, '#8a2a18');
  P.vline(4, 9, 22, '#8a7a60'); P.vline(53, 9, 22, '#8a7a60');
  // counter
  P.rect(2, 22, 54, 16, '#c08a3a');
  P.rect(2, 22, 54, 3, '#e8b060');
  P.rect(2, 34, 54, 4, '#8a5a20');
  // steel bowls of chaat
  P.disc(14, 22, 6, '#c8c8d0'); P.disc(14, 21, 4, '#4a7a26');
  P.disc(30, 22, 6, '#c8c8d0'); P.disc(30, 21, 4, '#d86a20');
  P.disc(45, 22, 5, '#c8c8d0'); P.disc(45, 21, 3, '#e8c840');
  P.disc(12, 41, 5, '#2a2a2e'); P.disc(46, 41, 5, '#2a2a2e');
  return P.c;
}

// The chain above the swivel is drawn by js/hub.js, which knows where the ceiling is;
// this is the bag only, pivoting on its own top edge.
function bag() {
  const P = new Pix(24, 84);
  P.rect(9, 0, 6, 5, '#8a8296');
  P.rect(10, 1, 4, 3, '#3a3444');
  P.rect(3, 5, 18, 78, '#5a3a20');
  P.rect(3, 5, 5, 78, '#7a5230');
  P.rect(17, 5, 4, 78, '#3a2414');
  P.rect(3, 5, 18, 2, '#8a6a44');
  P.rect(3, 81, 18, 2, '#2a1a0e');
  // tape bands and scuffs
  for (const y of [22, 44, 66]) { P.rect(2, y, 20, 3, '#a8a090'); P.rect(2, y, 20, 1, '#d0c8b8'); }
  for (let i = 0; i < 18; i++) P.px(5 + (i * 5) % 15, 10 + (i * 7) % 70, '#7a5230');
  return P.c;
}

const BUILDERS = { crate, matka, tyres, table, sign, cart, bag };

// Prefer the generated art; the procedural build below is the fallback so a
// missing PNG shows a real prop rather than nothing.
function art(kind, broken) {
  const T = PROP_TYPES[kind];
  const src = (T && T.art) || kind;   // a new prop can borrow art until it has its own
  const png = ASSETS['prop_' + src + (broken ? '_b' : '')];
  if (png) return png;
  const key = src + (broken ? '_b' : '');
  if (!ART[key]) {
    // "Everything degrades to a fallback" has to be true by construction: a kind with
    // no builder used to be a TypeError inside render(), which takes the HUD with it.
    const c = (BUILDERS[src] || BUILDERS.crate)(broken);
    c._as = 1;   // code art is authored at 1 logical px
    ART[key] = c;
  }
  return ART[key];
}

// ---- lifecycle ----------------------------------------------------------
export function createProp(kind, x, y) {
  const T = PROP_TYPES[kind];
  const pr = {
    kind: 'prop', prop: kind, x, y, z: 0, vx: 0, vz: 0,
    hp: T.hp, maxhp: T.hp, w: T.w, h: T.h, shadowR: T.shadowR,
    broken: false, dead: false, t: 0, flash: 0, shakeT: 0,
    state: 'idle', face: 1,
    hurt(dmg, dir) { hurtProp(pr, dmg, dir); },
    thrown() {},
  };
  return pr;
}

function hurtProp(pr, dmg, dir) {
  if (pr.broken) return;
  pr.hp -= dmg;
  pr.flash = 5;
  pr.shakeT = 8;
  const T = PROP_TYPES[pr.prop];
  if (pr.hp > 0) {
    spawnDebris(pr.x, pr.y - pr.h * 0.4, 3, T.debris);
    G.audio.sfx('armor');
    impact(false, dmg);
    return;
  }
  pr.broken = true;
  pr.dead = true;   // stops the combat code targeting it again
  spawnDebris(pr.x, pr.y - pr.h * 0.5, 14, T.debris);
  spawnDust(pr.x, pr.y, 4);
  addScore(T.score);
  spawnPop(pr.x, pr.y - pr.h - 10, '+' + T.score);
  impact(true, 14);
  G.shake = Math.max(G.shake, 5);
  G.audio.sfx('slam');
  if (T.drop) {
    G.pickups.push({
      x: pr.x, y: pr.y, kind: T.drop,
      heal: T.drop === 'shake' ? 30 : T.drop === 'plate' ? 15 : 0, t: 0,
    });
  }
  // The drum does not drop anything - it BECOMES terrain, which is better, because
  // the designer places it and both sides can be pushed into it.
  if (T.burst) spawnZone(T.burst.kind, pr.x, pr.y, T.burst.r, T.burst.life);
  if (pr.onBreak) pr.onBreak(pr);
}

export function updateProps() {
  for (const pr of G.props) {
    pr.t++;
    if (pr.flash > 0) pr.flash--;
    if (pr.shakeT > 0) pr.shakeT--;
  }
}

export function drawProp(ctx, pr, camX) {
  const f = art(pr.prop, pr.broken);
  const wob = pr.shakeT > 0 ? ((pr.t & 1) ? 1 : -1) : 0;
  const sx = Math.round(pr.x - camX) + wob, sy = Math.round(pr.y - pr.z);
  const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f);
  // Hanging props swing instead of standing still. The pivot is pr.pivotY when it is
  // set - the dojo bag hangs off the ceiling, and rotating it about its own top edge
  // would leave the chain above it dead still while the bag moved.
  const swing = pr.swing || 0;
  if (swing) {
    const py = pr.pivotY === undefined ? dy : pr.pivotY;
    ctx.save();
    ctx.translate(sx, py);
    ctx.rotate(swing);
    ctx.translate(-sx, -py);
  }
  if (pr.flash > 0) {
    ctx.save();
    ctx.filter = 'brightness(2.4)';
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    blit(ctx, f, dx, dy);
  }
  if (swing) ctx.restore();
}
