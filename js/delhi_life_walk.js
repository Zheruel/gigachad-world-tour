// Background walkers for the Delhi life layers (js/delhi_life_market.js, js/delhi_life_river.js):
// people and vehicles that come out of a doorway, an alley or the level's edge, cross the back
// pavement and go back in. Nobody fades: at each end of the route the walker steps diagonally back
// into the portal (feet rise to its depth), darkens into its shade and is clipped at its jamb, the
// wall edge that hides them. Fights make pedestrians turn once and hurry to the nearer way out (no
// ping-pong), vehicles brake and then carry on faster, carriers with alarm poses stop and duck; all of
// them wait inside until the street has been quiet for a while. Cosmetic only: a local hash, no
// combat RNG, no actors.
//
// Route def: {key, a, b, y, speed, tpf, vehicle, oneWay, alarm:[look, duck], start:[x, dir], gap:[min, max],
//   lanes:[left-going dy, right-going dy], dim, avoid:[{x, half, dy}]}. Callers may set w.cap (px/tick) before a step to hold a walker back.
//   a / b: the left / right ends {x: where the walker is fully inside, clip: jamb x (hide past it;
//   null = off the level, nothing to hide), depth: feet y inside, len: length of the diagonal leg, shade}
//   speed px/tick at the stride's pace, tpf ticks per walk frame (8 frames). Optional stride: px the body
//   moves over each of the 8 frames (measured from the planted sole; speed = their sum / (8 tpf)): the walker
//   then moves by the frame's own share, so a gait that pauses on a planted foot does not skate.
const hash = n => { n = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
export const FLEE_R = 200, CALM_R = 220, CALM_TICKS = 120;

export function walkerState(d, i) {
  let [x, dir] = d.start || [d.a.x, 1];
  const inside=d.initialDelay||0;
  if(inside)x=dir>0?d.a.x:d.b.x;
  return { x, dir, lane: d.lanes ? d.lanes[dir > 0 ? 1 : 0] : 0, inside, flee: 0, brake: 0, alarm: 0, calm: 0, dist: hash(i * 71) * 400, phase:hash(i*71)*(d.frames||8), n: i * 13 };
}
const gap = (d, w) => { const [lo, hi] = d.gap || [180, 420]; return lo + Math.floor(hash(++w.n * 7919 + 17) * (hi - lo)); };

// One tick. threats: world x of fights, attacks and supers this tick.
export function stepWalker(d, w, threats) {
  const nearest = (x, r) => { let best; for (const v of threats) if (Math.abs(v - x) < r && (best === undefined || Math.abs(v - x) < Math.abs(best - x))) best = v; return best; };
  if (w.inside > 0) {
    const at = w.x <= d.a.x ? d.a.x : d.b.x;
    w.calm = nearest(at, CALM_R) === undefined ? w.calm + 1 : 0;
    if (--w.inside <= 0) {
      if (w.calm < (w.fled ? CALM_TICKS : 30)) { w.inside = 1; return; }
      // Out again: one-way carriers always start at a; others come back out the way they went in.
      if (d.oneWay) { w.x = d.a.x; w.dir = 1; } else w.dir = w.x <= d.a.x ? 1 : -1;
      w.fled = 0; w.inside = 0;
    }
    return;
  }
  const threat = nearest(w.x, d.alarm ? 125 : FLEE_R);
  if (d.alarm) {
    if (w.alarm) {
      w.alarm++; w.calm = nearest(w.x, CALM_R) === undefined ? w.calm + 1 : 0;
      if (w.alarm > 90 && w.calm > 60) { w.alarm = 0; w.calm = 0; }
      return;
    }
    if (threat !== undefined && inStreet(d, w)) { w.alarm = 1; w.calm = 0; return; }
  } else if (!w.flee && threat !== undefined) {
    w.flee = 1; w.fled = 1;
    // Vehicles brake only for trouble well ahead; one already close gets past it quickly rather than
    // parking behind the fighters.
    if (d.vehicle) w.brake = (threat - w.x) * w.dir > 140 ? 26 : 0;
    else w.dir = threat < w.x ? 1 : -1;   // turn once, away from it, and keep going
  }
  let v = d.speed;
  if (w.flee) v *= d.vehicle ? (w.brake > 0 ? .25 + .75 * Math.abs(w.brake - 13) / 13 : 1.8) : 1.7;
  else if (w.cap != null) v = Math.max(0, Math.min(v, w.cap));   // someone slower just ahead: keep behind them
  // Lanes: right-goers keep a step nearer the kerb, left-goers nearer the shops, so people pass rather than merge.
  if (d.lanes) w.lane = (w.lane || 0) + ((w.dir > 0 ? d.lanes[1] : d.lanes[0]) - (w.lane || 0)) * .05;
  if (w.brake > 0) w.brake--;
  if (d.stride) { const k = v / d.speed, f = Math.floor(w.phase || 0) % (d.frames||8); w.phase = (w.phase || 0) + k / d.tpf; v = k * d.stride[f] / d.tpf; }
  w.x += w.dir * v; w.dist += v;
  if (w.x <= d.a.x || w.x >= d.b.x) {
    w.x = Math.min(d.b.x, Math.max(d.a.x, w.x)); w.inside = gap(d, w); w.flee = 0; w.calm = 0; w.brake = 0;
  }
}
const inStreet = (d, w) => w.x > d.a.x + (d.a.len || 0) && w.x < d.b.x - (d.b.len || 0);

// Fixed performers on the walker's line (a washerman at his stone, a boy sorting bottles): route.avoid
// [{x, half, dy}] eases the walker's feet dy px (negative = further back) while within half px of x,
// over a 24 px ramp either side, so they pass behind (the caller draws the performer after the walker).
export function avoidDy(d, x) {
  let dy = 0;
  for (const v of d.avoid || []) {
    const u = Math.min(1, Math.max(0, 1 - (Math.abs(x - v.x) - v.half) / 24));
    if (u > 0) dy += v.dy * u * u * (3 - 2 * u);
  }
  return dy;
}

// Where and how to draw: feet y, shade 0-1, clip [x, side] (side -1 hides left of x, +1 right of it).
export function walkerPose(d, w) {
  if (w.inside > 0) return null;
  let y = d.y + (w.lane || 0), shade = 0, clip = null, top = -60;
  for (const [end, side] of [[d.a, -1], [d.b, 1]]) {
    const u = end.len ? Math.min(1, Math.abs(w.x - end.x) / end.len) : 1;
    if (u < 1) {
      y = end.depth + (d.y + (w.lane || 0) - end.depth) * u; shade = (end.shade || 0) * (1 - u);
      if (end.clip != null) clip = [end.clip, side];
      if (end.top != null) top = -60 + (end.top + 60) * (1 - u);   // the lintel takes the head last
    }
  }
  y += avoidDy(d, w.x);
  if (d.dim) shade = 1 - (1 - d.dim) * (1 - shade);   // a dim place (the culvert) keeps its own shade
  const frame = w.alarm && d.alarm ? d.alarm[w.alarm < 40 ? 0 : 1] : d.stride ? Math.floor(w.phase || 0) % (d.frames||8) : Math.floor(w.dist / (d.speed * d.tpf)) % (d.frames||8);
  return { x: w.x, y, shade, clip, top, frame, face: w.dir };
}

// Draw a sprite darkened by `shade` toward `rgb`. draw(c, x, y) paints the sprite with its feet at (x, y)
// in c's logical px. The sprite is drawn, then drawn again through a proxy context that swaps every image
// for its solid `rgb` silhouette (made once per sheet and colour) and every fill/stroke for `rgb`, at
// alpha `shade`: the same as a source-atop fill over hard-alpha art, with no per-frame offscreen canvas
// (a canvas drawn into and composited every frame stalls the GPU; no ctx.filter either, Safari ignores it).
const sils = new WeakMap();
function silhouette(im, rgb) {
  let m = sils.get(im); if (!m) sils.set(im, m = new Map());
  let c = m.get(rgb); if (c) return c;
  c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, c.width, c.height);
  m.set(rgb, c); return c;
}
function shadowCtx(ctx, rgb, k) {
  return new Proxy(ctx, {
    get(t, key) {
      if (key === 'drawImage') return (im, ...a) => t.drawImage(im?.width ? silhouette(im, rgb) : im, ...a);
      const v = t[key]; return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, key, v) {
      if (key === 'fillStyle' || key === 'strokeStyle') t[key] = `rgb(${rgb})`;
      else if (key === 'globalAlpha') t[key] = v * k;
      else t[key] = v;
      return true;
    },
  });
}
export function drawShaded(ctx, shade, rgb, x, y, draw) {
  draw(ctx, x, y);
  if (shade <= .01 || typeof document === 'undefined') return;
  const k = Math.min(1, shade), a = ctx.globalAlpha;
  ctx.globalAlpha = a * k; draw(shadowCtx(ctx, rgb, k), x, y); ctx.globalAlpha = a;
}

// Full draw of one walker: clip at the portal jamb, shade into the doorway.
export function drawWalker(ctx, camX, d, w, rgb, draw, shadow) {
  const p = walkerPose(d, w); if (!p) return;
  const sx = Math.round(p.x - camX),feet=Math.round(p.y); if (sx < -120 || sx > 600) return;
  ctx.save();
  if (p.clip) {
    const cx = p.clip[0] - camX; ctx.beginPath();
    if (p.clip[1] < 0) ctx.rect(cx, p.top, 700, 400); else ctx.rect(-200, p.top, cx + 200, 400);
    ctx.clip();
  }
  if (shadow) shadow(ctx, sx, feet, 1 - p.shade);
  drawShaded(ctx, p.shade, rgb, sx, feet, (c, x, y) => draw(c, p.frame, x, y, p.face));
  ctx.restore();
}

// Near-camera overhead pieces keep the HUD readable: they are faded (soft-edged) under the player panel
// (x 0-222, y 0-60, to 18%) and lightly under the score (x 404-480, y 0-30, to 50%). draw(c) paints them;
// it is called once for the open screen and once per fade band, each clipped to its region at the band's
// alpha (18 px feathers in 3 px steps), so no offscreen canvas is needed. span [x0, x1]: the pieces'
// screen extent; bands it does not reach are skipped, and pieces clear of both panels draw straight in.
const HUD_PANELS = [[0, 222, 60, .82], [404, 480, 30, .5]], FEATHER = 18, STEP = 3;
const HUD_BANDS = HUD_PANELS.flatMap(([x0, x1, y1, a]) => {
  const out = [[x0, 0, x1 - x0, y1, 1 - a]];
  for (let j = 0; j < FEATHER / STEP; j++) {
    const k = 1 - a * (1 - (j + .5) / (FEATHER / STEP));
    out.push([x1 + j * STEP, 0, STEP, y1, k], [x0, y1 + j * STEP, x1 - x0 + FEATHER, STEP, k]);
  }
  return out;
});
export function drawClearOfHud(ctx, draw, span = [0, 480]) {
  const x0 = Math.floor(span[0]) - 2, x1 = Math.ceil(span[1]) + 2;
  if (x1 <= x0) return;
  const hit = HUD_PANELS.filter(([a0, a1]) => x1 > a0 && x0 < a1 + FEATHER);
  if (!hit.length) { draw(ctx); return; }
  // The open screen: everything outside the panels and their feathers.
  ctx.save(); ctx.beginPath(); ctx.rect(-40, -40, 560, 400);
  for (const [a0, a1, y1] of hit) ctx.rect(a0, 0, a1 - a0 + FEATHER, y1 + FEATHER);
  ctx.clip('evenodd'); draw(ctx); ctx.restore();
  const a = ctx.globalAlpha;
  for (const [bx, by, bw, bh, k] of HUD_BANDS) {
    if (bx + bw <= x0 || bx >= x1 || k <= .01) continue;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); ctx.globalAlpha = a * k; draw(ctx); ctx.restore();
  }
}
