// A cigar's smoke, as one small system a smoker owns: the ember's glow, the drag that makes
// it flare, the exhale (two smoke rings, then a soft plume off the mouth), the thin trickle
// off the lit end between drags, and flecks shed off the ember. The loose smoke goes on
// G.effects as 'cigarSmoke' (effects.js draws and moves it); the rings and flecks are this
// system's own and are drawn by draw().
//
//   const smoke = createCigarSmoke();
//   each tick:   smoke.update({ ember: [x, y], mouth: [x, y], face, moving, trickleEvery });
//   moments:     smoke.drag(); smoke.exhale(); smoke.puff(x, y, face, strength);
//                smoke.trickle(x, y, face, moving); smoke.flecks(x, y, face, n);
//   draw:        smoke.drawEmber(ctx, camX, x, y, heat); smoke.draw(ctx, camX);
//
// carryCigarSmoke(follow) runs one on G.effects for a live smoker; drawCigarReplay() redraws
// the same smoke from a scene's clock for scrubbable cinematics; CHAD_CIGAR / chadCigarAt()
// place the cigar on CHAD's idle_cigar frames.
//
// Points are world coordinates; face is +1 (right) or -1 (left).
import { G, rand } from './engine.js';
import { ASSETS } from './assets.js';

const DRAG = 44;          // ticks of the drag: the ember climbs and falls over this
const EXHALE = 80;        // ticks the exhale sequence runs for
const RING_AT = [4, 26];  // exhale ticks that each let a ring go

// Loose smoke drifting the way the smoker faces (walking, he leaves it behind instead).
export function driftSmoke(x, y, face, n = 1, spread = 1, moving = false) {
  for (let i = 0; i < n; i++) {
    G.effects.push({
      type: 'cigarSmoke', x: x + rand(-1, 1) * spread, y,
      vx: moving ? rand(-0.04, 0.04) : face * rand(0.03, 0.14), vy: -0.2 - Math.random() * 0.16,
      t: 0, life: 60 + Math.random() * 30,
    });
  }
}

export function createCigarSmoke() {
  const s = {
    fx: [],           // rings and flecks
    flare: 0,         // ticks left of a drag's flare (counts down from flareLen)
    flareLen: DRAG,
    exhaleT: -1,      // ticks into an exhale, -1 when not exhaling
    t: 0,
    ember: null, mouth: null, face: 1, moving: false,

    // the drag: the ember flares, and as it dies back three wisps leave it
    drag(ticks = DRAG) { if (ticks > s.flare) { s.flare = ticks; s.flareLen = ticks; } },
    // the exhale: two rings, then the rest of it as a soft plume, off the mouth given to update()
    exhale() { s.exhaleT = 0; },
    get dragging() { return s.flare > 0; },
    get exhaling() { return s.exhaleT >= 0; },

    // One smoke ring, a two-pixel-thick oval with a faint fill catching the light on one side.
    ring(x, y, face) {
      s.fx.push({ kind: 'ring', x: x + face * 2, y, r: 2.2, vx: face * 0.38, vy: -0.13,
        grow: 0.06, life: 1, fade: 0.0075, phase: rand(0, 9) });
    },
    // A single puff at once: a ring for a proper one (strength >= 0.5) and a cloud of wisps.
    puff(x, y, face, strength = 1) {
      if (strength >= 0.5) s.ring(x, y, face);
      driftSmoke(x + face, y + 1, face, Math.max(1, Math.round(strength * 3)), 0.5 + strength * 0.5, s.moving);
    },
    // the thin trickle off the lit end between drags
    trickle(x, y, face, moving = s.moving) { driftSmoke(x, y - 1, face, 1, 0.5, moving); },
    // hot flecks shed off the ember (a sharp head movement, a flick of ash)
    flecks(x, y, face, n = 6) {
      for (let i = 0; i < n; i++) {
        s.fx.push({ kind: 'fleck', x, y, vx: face * rand(0.2, 1.1), vy: -rand(0.3, 1.1),
          life: 1, fade: rand(0.03, 0.05) });
      }
    },

    // ember / mouth: world points this tick (either may be omitted); trickleEvery: ticks
    // between trickle wisps off the ember while not dragging or exhaling (0 = none)
    update({ ember, mouth, face, moving = false, trickleEvery = 0 } = {}) {
      s.t++;
      if (ember) s.ember = ember;
      if (mouth) s.mouth = mouth;
      if (face) s.face = face;
      s.moving = moving;
      if (s.ember && trickleEvery > 0 && !s.dragging && !s.exhaling && s.t % trickleEvery === 0) {
        s.trickle(s.ember[0], s.ember[1], s.face, moving);
      }
      if (s.flare > 0 && --s.flare === 6 && s.ember) driftSmoke(s.ember[0], s.ember[1], s.face, 3, 1, moving);
      if (s.exhaleT >= 0) {
        const [mx, my] = s.mouth || s.ember || [0, 0];
        if (RING_AT.includes(s.exhaleT)) s.ring(mx, my, s.face);
        if (s.exhaleT > 30 && s.exhaleT < 60 && s.exhaleT % 6 === 0) driftSmoke(mx + s.face, my + 1, s.face, 1, 0.5, moving);
        if (++s.exhaleT >= EXHALE) s.exhaleT = -1;
      }
      for (let i = s.fx.length - 1; i >= 0; i--) {
        const f = s.fx[i];
        f.x += f.vx;
        f.y += f.vy;
        if (f.kind === 'ring') {
          f.phase += 0.06; f.vx *= 0.985; f.vy = Math.max(-0.3, f.vy - 0.0015); f.r += f.grow;
        } else f.vy += 0.06;
        f.life -= f.fade;
        if (f.life <= 0) s.fx.splice(i, 1);
      }
    },

    // The ember glows on its own. heat 0..1 is its resting glow (0.5 sitting; breathe it for
    // a sleeper); the drag's flare lifts it.
    drawEmber(ctx, camX, x, y, heat = 0.5) {
      if (s.flare > 0) heat = Math.max(heat, Math.sin((s.flare / s.flareLen) * Math.PI));
      emberAt(ctx, Math.round(x - camX), Math.round(y), heat);
    },

    // rings and flecks (the loose smoke is on G.effects)
    draw(ctx, camX) {
      for (const f of s.fx) {
        const x = f.x - camX;
        if (f.kind === 'ring') {
          ringAt(ctx, x, f.y, f.r, f.life, f.phase);
        } else {
          ctx.fillStyle = `rgba(255,${150 + 80 * f.life},60,${f.life})`;
          ctx.fillRect(Math.round(x), Math.round(f.y), 1, 1);
        }
      }
    },

    reset() { s.fx.length = 0; s.flare = 0; s.exhaleT = -1; s.t = 0; s.ember = s.mouth = null; },
  };
  return s;
}

// ---- Shared drawing (live and replayed smoke look the same) --------------------------------

// The ember at a screen pixel: one hot pixel, and a small halo once it is past 0.6.
function emberAt(ctx, sx, sy, heat) {
  ctx.fillStyle = `rgba(255,${150 + heat * 80},${60 + heat * 90},${0.55 + heat * 0.45})`;
  ctx.fillRect(sx, sy, 1, 1);
  if (heat > 0.6) {
    ctx.fillStyle = `rgba(255,140,50,${0.35 * heat})`;
    ctx.fillRect(sx - 1, sy - 1, 3, 3);
  }
}

// One smoke ring at screen x, y: a two-pixel-thick oval with a faint fill catching the light on one side.
function ringAt(ctx, x, y, r, life, phase) {
  const n = Math.max(14, Math.round(r * 6));
  ctx.fillStyle = `rgba(220,224,232,${0.10 * life})`;
  ctx.fillRect(Math.round(x - r * 0.55), Math.round(y - r * 0.7), Math.round(r * 1.1), Math.round(r * 1.4));
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2, lit = 0.5 + 0.5 * Math.sin(ang + phase);
    ctx.fillStyle = `rgba(232,234,240,${(0.4 + 0.45 * lit) * life})`;
    const px = Math.round(x + Math.cos(ang) * r * 0.8), py = Math.round(y + Math.sin(ang) * r);
    ctx.fillRect(px, py, 1, 1);
    if (lit > 0.35) ctx.fillRect(px - Math.sign(Math.cos(ang)), py, 1, 1);
  }
}

// One loose wisp as effects.js draws a 'cigarSmoke' effect at age k (0..1).
function wispAt(ctx, sx, sy, k, scale = 1) {
  const im = ASSETS.nr_finale_smoke;
  ctx.globalAlpha = Math.max(0, 0.38 * (1 - k));
  if (im) {
    const w = 13 * scale, h = w * 1.5;
    ctx.drawImage(im, Math.min(5, Math.floor(k * 6)) * 64, 0, 64, 96, Math.round(sx - w / 2), Math.round(sy - h + 3), w, h);
  } else { ctx.fillStyle = '#a9afb3'; ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2); }
  ctx.globalAlpha = 1;
}

// ---- A live smoker on G.effects ------------------------------------------------------------

// The smoke system carried as one G.effects entry, so it ticks, pauses, draws and clears with
// the rest of the effects. follow(smoke) runs every tick and returns this tick's update() args
// ({ ember, mouth, face, moving, trickleEvery }, plus heat for the ember and lit: false to hide
// it), or null once the cigar has left; the entry then lets its rings clear and ends.
// Returns the entry; entry.smoke is the system (drag/exhale/puff on it).
export function carryCigarSmoke(follow) {
  const smoke = createCigarSmoke();
  let now = null;
  const e = {
    type: 'cigarRig', x: 0, y: 0, t: 0, life: Infinity, smoke, gone: false,
    step() {
      now = e.gone ? null : follow(smoke);
      // once the cigar has left, a drag or exhale in progress stops where it is
      if (!now) { e.gone = true; smoke.flare = 0; smoke.exhaleT = -1; }
      smoke.update(now && now.lit !== false ? now : { face: now?.face });
      if (e.gone && !smoke.fx.length) e.life = 0;
    },
    draw(ctx, camX) {
      if (now?.ember && now.lit !== false) smoke.drawEmber(ctx, camX, now.ember[0], now.ember[1], now.heat ?? 0.5);
      smoke.draw(ctx, camX);
    },
  };
  G.effects.push(e);
  return e;
}

// ---- Replay: the same smoke as a pure function of a scene's clock --------------------------
// For scenes drawn from their clock (scrubbable cinematics, the frame explorer), where nothing
// may be left over from the last frame. Every wisp and ring is rebuilt from its birth tick with
// the live system's own motion, timing and look; randomness is hashed from the birth tick.
//
//   drawCigarReplay(ctx, camX, T, at, { drags, exhales, trickleEvery, from, ember, wisps, scale });
//   at(t) -> { tip: [x, y], mouth?: [x, y], face?, moving?, heat? } where the lit end was at
//            tick t, or null while it is unlit, hidden or out of the scene.
//   drags:   ticks a drag starts (or [tick, length]); exhales: ticks an exhale starts.
//   scale:   size multiplier for close-ups (rings and wisps grow, motion scales about the birth point).
const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const WISP_MAX = 90;   // the longest a wisp lives (60 + 30)
const RING_MAX = 134;  // a ring's life (1 / 0.0075)

// a wisp born at b from (x, y) drawn at T, moved exactly as effects.js moves 'cigarSmoke'
function replayWisp(ctx, camX, T, b, salt, x, y, face, moving, spread, scale) {
  const a = T - b, r = (k) => hash(b * 7.13 + salt * 3.7 + k);
  const life = 60 + r(3) * 30;
  if (a < 0 || a >= life) return;
  const vx = moving ? r(1) * 0.08 - 0.04 : face * (0.03 + r(1) * 0.11), vy = -0.2 - r(2) * 0.16;
  const px = x + (r(4) * 2 - 1) * spread + scale * vx * (1 - 0.99 ** a) / 0.01;
  const py = y + scale * vy * (1 - 0.985 ** a) / 0.015;
  wispAt(ctx, px - camX, py, a / life, scale);
}

// a ring born at b from (x, y) drawn at T, stepped as createCigarSmoke steps its rings
function replayRing(ctx, camX, T, b, x, y, face, scale) {
  const a = T - b;
  if (a < 0 || a >= RING_MAX) return;
  let dx = face * 2, dy = 0, r = 2.2, vx = face * 0.38, vy = -0.13, life = 1, phase = hash(b * 1.7) * 9;
  for (let i = 0; i < a; i++) {
    dx += vx; dy += vy; phase += 0.06; vx *= 0.985; vy = Math.max(-0.3, vy - 0.0015); r += 0.06; life -= 0.0075;
  }
  if (life > 0) ringAt(ctx, x + dx * scale - camX, y + dy * scale, r * scale, life, phase);
}

export function drawCigarReplay(ctx, camX, T, at, {
  drags = [], exhales = [], trickleEvery = 8, from = -Infinity, ember = true, wisps = true, scale = 1,
} = {}) {
  const D = drags.map((d) => (Array.isArray(d) ? d : [d, DRAG]));
  const busy = (b) => D.some(([d, n]) => b >= d && b < d + n) || exhales.some((e) => b >= e && b < e + EXHALE);
  const state = (b) => (b >= from ? at(b) : null);
  ctx.save();
  if (wisps && trickleEvery > 0) {
    // the thin trickle off the lit end between drags
    for (let b = Math.floor(T / trickleEvery) * trickleEvery; b > T - WISP_MAX; b -= trickleEvery) {
      const c = busy(b) ? null : state(b);
      if (c?.tip) replayWisp(ctx, camX, T, b, 0, c.tip[0], c.tip[1] - 1, c.face || 1, !!c.moving, 0.5, scale);
    }
  }
  for (const [d, n] of D) {
    // as the drag dies back three wisps leave the ember
    const b = d + n - 6, c = wisps && T >= b ? state(b) : null;
    if (c?.tip) for (let i = 0; i < 3; i++) replayWisp(ctx, camX, T, b, 11 + i, c.tip[0], c.tip[1], c.face || 1, !!c.moving, 1, scale);
  }
  for (const e of exhales) {
    // two rings off the mouth, then the rest of it as a soft plume
    for (const k of RING_AT) {
      const c = state(e + k);
      if (c) replayRing(ctx, camX, T, e + k, ...(c.mouth || c.tip), c.face || 1, scale);
    }
    if (wisps) for (let k = 36; k < 60; k += 6) {
      const c = state(e + k), m = c && (c.mouth || c.tip);
      if (m) replayWisp(ctx, camX, T, e + k, 5, m[0] + (c.face || 1) * scale, m[1] + scale, c.face || 1, !!c.moving, 0.5, scale);
    }
  }
  const c = ember ? state(T) : null;
  if (c?.tip) {
    let heat = c.heat ?? 0.5;
    for (const [d, n] of D) if (T >= d && T < d + n) heat = Math.max(heat, Math.sin(((d + n - T) / n) * Math.PI));
    emberAt(ctx, Math.round(c.tip[0] - camX), Math.round(c.tip[1]), heat);
  }
  ctx.restore();
}

// ---- CHAD's idle_cigar (assets/frames/chad_idle_cigar1-6) ----------------------------------
// Measured on the runtime-normalized frames (aiframes.js normalize: 96 logical px, feet 3 px up,
// lower-body centroid centred), in logical px from his feet facing right: the cigar's end and,
// where it is in his mouth, the lips. 0 has no cigar, 1 holds it out, 2 has it in his teeth with
// the Zippo, 3 lights it, 4 throws the head back to exhale, 5 holds it lit.
export const CHAD_CIGAR = [
  null,
  { tip: [19.5, -79.5] },
  { tip: [9, -77], mouth: [5, -78] },
  { tip: [9.5, -76.5], mouth: [5, -78] },
  { tip: [5, -79.5], mouth: [2.5, -78] },
  { tip: [8.5, -77.5], mouth: [5, -78] },
];
// That frame's tip and mouth as world points for CHAD standing at (x, y) facing face.
export function chadCigarAt(frame, x, y, face = 1) {
  const f = CHAD_CIGAR[frame];
  if (!f) return null;
  const pt = (p) => p && [x + face * p[0], y + p[1]];
  return { tip: pt(f.tip), mouth: pt(f.mouth || f.tip), face };
}

// idle_cigar as the cinematics play it, replayed from the clock: from `start` at `period` ticks a
// frame, then held lit on 5. The Zippo catches two ticks into 3 and he draws on it through the rest
// of 3, the exhale leaves his lips on 4, then the lit end trickles. (x, y) are his feet.
export function drawChadCigarReplay(ctx, camX, T, start, period, x, y, face = 1) {
  const lit = start + period * 3 + 2;
  const at = (b) => (b < lit ? null : chadCigarAt(Math.min(5, Math.floor((b - start) / period)), x, y, face));
  drawCigarReplay(ctx, camX, T, at, { drags: [[lit, period - 2]], exhales: [start + period * 4], trickleEvery: 9 });
}
