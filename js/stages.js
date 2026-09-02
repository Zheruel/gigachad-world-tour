// stages.js - STAGE 1: CHANDNI CHOWK. Background layers, waves, breakable
// props, camera gating and the ambience pass that makes the market feel lived in.
// Each stage draws AI wall/floor PNGs when present and falls back to a
// procedural pixel-art build of the same street when they are missing.
import { G, W, H, clamp, rand, irand, arenaMin, arenaMax } from './engine.js';
import { Pix, artScale, blit, frameW, frameH } from './sprites.js';
import { ASSETS } from './assets.js';
import { drawOutside, drawTrainWallPlane, initTrain, ROOF_X, ABOARD_X } from './train.js';
import { createProp } from './props.js';
import { initAmbience, drawAmbienceFacade, drawBirds } from './ambience.js';

const FLOOR_Y = 181; // where the facades meet the street, all stages

// ------------------------------------------------------------- delhi art
// Procedural fallback for the market. Only drawn when the AI plates are absent,
// but it is a complete street in its own right so the game never ships blank.
function buildDelhiFar() {
  const P = new Pix(900, FLOOR_Y);
  // hazy afternoon sky
  for (let y = 0; y < FLOOR_Y; y++) {
    const t = y / FLOOR_Y;
    P.rect(0, y, 900, 1, `rgb(${196 - t * 40 | 0},${168 - t * 30 | 0},${128 - t * 20 | 0})`);
  }
  P.disc(700, 30, 22, 'rgba(255,238,190,0.55)');
  P.disc(700, 30, 13, '#fff4d0');
  // distant domes + minarets
  const domes = [120, 340, 560, 800];
  for (const dx of domes) {
    P.rect(dx - 34, 96, 68, 60, '#b09878');
    P.disc(dx, 96, 34, '#c8ae86');
    P.disc(dx, 92, 30, '#d8be96');
    P.rect(dx - 3, 50, 6, 14, '#c8ae86');
    P.disc(dx, 50, 5, '#e0c8a0');
    P.rect(dx - 52, 110, 8, 46, '#a89070');
    P.rect(dx + 44, 110, 8, 46, '#a89070');
    P.disc(dx - 48, 110, 6, '#c8ae86');
    P.disc(dx + 48, 110, 6, '#c8ae86');
  }
  // rooftop clutter
  for (let x = 0; x < 900; x += 26) {
    const h = irand(8, 22);
    P.rect(x, FLOOR_Y - 46 - h, 24, h + 46, '#8a7458');
    P.rect(x, FLOOR_Y - 46 - h, 24, 2, '#a08a6a');
  }
  return P.c;
}

function buildDelhiMid() {
  const P = new Pix(1400, FLOOR_Y);
  // shopfront row
  const SHOP = ['#8a5a3a', '#7a3a4a', '#3a5a7a', '#7a6a2a', '#4a7a5a', '#8a4a2a', '#5a4a7a'];
  let x = 0, i = 0;
  while (x < 1400) {
    const w = irand(110, 170);
    const col = SHOP[(++i) % SHOP.length];
    // upper storey
    P.rect(x, 0, w, 96, col);
    P.rect(x, 0, w, 4, '#f0e0c0');
    // peeling plaster
    for (let k = 0; k < 26; k++) {
      P.rect(x + irand(2, w - 8), irand(6, 90), irand(3, 9), irand(2, 6), 'rgba(240,225,195,0.30)');
    }
    // balcony
    P.rect(x + 12, 44, w - 24, 4, '#5a4632');
    for (let bx = x + 14; bx < x + w - 14; bx += 7) P.vline(bx, 30, 44, '#6a5440');
    P.rect(x + 12, 28, w - 24, 3, '#5a4632');
    // windows
    for (let wx = x + 18; wx < x + w - 24; wx += 42) {
      P.rect(wx, 54, 24, 34, '#241c18');
      P.rect(wx + 2, 56, 20, 30, '#3c4e5c');
      P.vline(wx + 12, 56, 86, '#241c18');
      if (Math.random() < 0.45) P.rect(wx + 3, 57, 18, 12, '#6a7c88');
    }
    // striped awning
    for (let ax = x; ax < x + w; ax += 12) {
      P.rect(ax, 96, 6, 14, '#e8503a');
      P.rect(ax + 6, 96, 6, 14, '#f4ecd8');
    }
    P.rect(x, 108, w, 3, '#8a2a1a');
    // shop interior
    P.rect(x + 4, 111, w - 8, FLOOR_Y - 111, '#241a16');
    P.rect(x + 4, 111, w - 8, 2, '#120c0a');
    // goods on shelves
    for (let sy = 122; sy < FLOOR_Y - 14; sy += 16) {
      P.rect(x + 8, sy, w - 16, 2, '#4a3828');
      for (let gx = x + 11; gx < x + w - 14; gx += 9) {
        if (Math.random() < 0.75) {
          const g = ['#d8a020', '#c04030', '#3a8a40', '#e0d0a0', '#8a4090'][irand(0, 4)];
          P.rect(gx, sy - irand(5, 9), 6, irand(5, 9), g);
        }
      }
    }
    // hand-painted sign board
    P.rect(x + 10, 98, w - 40, 10, '#f0d040');
    P.rect(x + 11, 99, w - 42, 8, '#1a4a8a');
    x += w + irand(0, 6);
  }

  // the famous overhead wire tangle
  for (let k = 0; k < 26; k++) {
    const y0 = irand(6, 40);
    let px = 0;
    while (px < 1400) {
      const seg = irand(60, 140);
      const sag = irand(4, 16);
      for (let t = 0; t <= seg; t += 2) {
        const yy = y0 + Math.sin((t / seg) * Math.PI) * sag;
        P.px(px + t, yy | 0, 'rgba(18,14,12,0.85)');
      }
      px += seg;
    }
  }
  // poles
  for (let px = 60; px < 1400; px += 300) {
    P.rect(px, 0, 5, FLOOR_Y, '#3a3028');
    P.rect(px - 6, 12, 17, 3, '#4a4038');
    P.rect(px - 10, 30, 25, 3, '#4a4038');
  }
  // marigold garlands
  for (let gx = 40; gx < 1400; gx += 220) {
    for (let t = 0; t < 90; t += 5) {
      const yy = 100 + Math.sin((t / 90) * Math.PI) * 12;
      P.disc(gx + t, yy | 0, 2, t % 10 === 0 ? '#f0a020' : '#e87010');
    }
  }
  P.rect(0, FLOOR_Y - 3, 1400, 3, 'rgba(0,0,0,0.4)');
  return P.c;
}

function buildDelhiFloor() {
  const P = new Pix(160, H - FLOOR_Y);
  const h = H - FLOOR_Y;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    P.rect(0, y, 160, 1, `rgb(${104 + t * 26 | 0},${92 + t * 22 | 0},${78 + t * 18 | 0})`);
  }
  for (let i = 0; i < 260; i++) {
    P.px(irand(0, 159), irand(0, h - 1), Math.random() < 0.5 ? '#7a6c5c' : '#c0b096');
  }
  // cracks + spilled spice
  for (let i = 0; i < 8; i++) {
    let cx = irand(0, 159), cy = irand(2, h - 4);
    for (let k = 0; k < irand(8, 24); k++) {
      P.px(cx, cy, '#6a5c4c');
      cx += irand(-1, 1); cy += irand(0, 1);
    }
  }
  for (let i = 0; i < 5; i++) {
    P.disc(irand(10, 150), irand(6, h - 6), irand(3, 7),
      ['rgba(216,120,32,0.30)', 'rgba(224,180,40,0.28)', 'rgba(180,40,30,0.24)'][irand(0, 2)]);
  }
  P.rect(0, 0, 160, 2, 'rgba(0,0,0,0.30)');
  return P.c;
}

// ------------------------------------------------------------- ambience
// Environment motion is split between this authored light/dust pass and
// ambience.js's keyed cloth, fans and reactive birds. Decorative full-body NPCs
// are deliberately absent: they competed with the combat silhouettes.

// The level's real signature, and it costs no art: hard white midday sun at the
// market end, sodium and green-black water at the river end, ramped across the
// route by camera x. It is duplicated from the lair's wash rather than imported -
// hub.js already imports this file, so reaching back would be a cycle.
const DUSK_FROM = 4400, DUSK_TO = 9000;
export function dusk(camX) { return clamp((camX - DUSK_FROM) / (DUSK_TO - DUSK_FROM), 0, 1); }

// Which of the stage's areas the camera is in, and how far it has crossed into it.
// Areas are never announced; the grade sliding between them is the only signal.
function areaAt(st, camX) {
  const list = st.areas;
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    if (camX < list[i].x1 || i === list.length - 1) {
      const next = list[i + 1] || list[i];
      const k = clamp((camX - (list[i].x1 - 240)) / 240, 0, 1);   // 240px crossfade
      return { a: list[i], b: next, k };
    }
  }
  return null;
}

function dirtyDelhiAmbient(ctx, camX, layers) {
  const t = G.rawTime;
  const st = G.stage;
  const d = dusk(camX);
  const zone = areaAt(st, camX);

  // The grade is local to this pass rather than written back onto the stage: a draw
  // function that mutates its own definition is a state leak into the lab and the
  // review page, both of which call drawStage with a camera of their own.
  const grade = zone ? (zone.k < 0.5 ? zone.a.grade : zone.b.grade) : (st.grade || '255,190,110');
  const gradeA = zone ? zone.a.gradeA + (zone.b.gradeA - zone.a.gradeA) * zone.k : (st.gradeA || 0.045);

  dirtyDelhiWater(ctx, camX, st);
  drawRats(ctx, camX, st);

  // authored warm glows, anchored where the plate actually shows a fire or a lamp; a
  // glow with `swing` is the drain's one bulb on its cord, and its pool moves with it
  for (const g of (G.stage.glows || [])) {
    const sx = g.x - camX + (g.swing ? Math.sin(t * 0.045) * 6 : 0);
    if (sx < -80 || sx > W + 80) continue;
    const r = g.r || 30;
    const grad = ctx.createRadialGradient(sx, g.y, 2, sx, g.y, r);
    const a = (g.a || 0.22) + Math.sin(t * 0.12 + g.x) * 0.04;
    grad.addColorStop(0, `rgba(255,150,50,${a})`);
    grad.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - r, g.y - r, r * 2, r * 2);
  }

  // spice dust hanging in the light
  ctx.fillStyle = 'rgba(255,228,180,0.5)';
  for (const m of G.motes) {
    ctx.globalAlpha = 0.25 + Math.sin((t + m.tw) * 0.08) * 0.25;
    ctx.fillRect(Math.round(m.x - camX), Math.round(m.y), 1, 1);
  }
  ctx.globalAlpha = 1;

  // The light dies across the route - but the PLATE does most of that now, because
  // each area was generated at its own time of day. This is the seasoning on top, and
  // it was four times stronger while the market plate was standing in for the river:
  // leaving it there once the real panels landed made the boss arena unreadable.
  if (d > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${Math.round(255 - d * 40)},${Math.round(255 - d * 34)},${Math.round(255 - d * 22)})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // warm afternoon grade + vignette
  ctx.fillStyle = `rgba(${grade},${gradeA})`;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.52, W / 2, H / 2, H * 1.1);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(${d > 0.5 ? '4,10,10' : '30,16,6'},${0.28 + d * 0.08})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // The chalk circle. It is drawn here rather than out of js/crowd.js because the
  // ring has to sit exactly on the walls the fight is squeezing, and because the
  // verify suite holds the background-NPC system off this stage.
  if (G.arenaSqueeze > 1) drawChalkRing(ctx, camX);
}

// Rats at three holes on the ghat - not a swarm. Each one lives on its own clock: out
// of the hole, a few steps along the wall, back in; anything landing nearby sends it
// straight back. State is per-rat on the stage's list, seeded from its x.
function drawRats(ctx, camX, st) {
  const img = ASSETS.amb_rat;
  if (!img || !st.rats) return;
  const t = G.rawTime;
  for (const r of st.rats) {
    const sx0 = r.x - camX;
    if (sx0 < -60 || sx0 > W + 60) continue;
    const period = 420 + (r.x % 7) * 40;
    let k = ((t + r.x * 3) % period) / period;   // 0..1 through one outing
    const scared = (G.stageReacts || []).some((q) => Math.abs(q.x - r.x) < 120);
    if (scared) k = Math.min(k, 0.05);
    const out = k < 0.15 ? k / 0.15 : k < 0.6 ? 1 : k < 0.75 ? 1 - (k - 0.6) / 0.15 : 0;
    if (out <= 0) continue;
    const reach = 26 * out;
    const dir = r.dir || 1;
    const scurry = k > 0.15 && k < 0.6 ? Math.sin(t * 0.5) * 1.2 : 0;
    const x = Math.round(sx0 + dir * reach + scurry);
    const y = r.y;
    ctx.save();
    if (dir < 0) { ctx.translate(x, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.globalAlpha = Math.min(1, out * 2);
    blit(ctx, img, x - Math.round(frameW(img) / 2), y - frameH(img) + ((t >> 3) & 1 && out === 1 ? 1 : 0));
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// The two procedural layers per plate the level is built on. Market: heat off the road.
// River: the wall plane in the water, foam on two rates, and the sluice's tell.
// The water is the top of the FLOOR plate: FLOOR_Y down to the pit's lane floor.
const RIVER_FROM = 8300;
function waterBand(st, camX) {
  const mid = camX + W / 2;
  const pit = (st.pits || []).find((q) => mid >= q.x0 - 200 && mid < q.x1 + 200);
  return pit ? { y: FLOOR_Y, h: pit.y - FLOOR_Y } : null;
}
function dirtyDelhiWater(ctx, camX, st) {
  const t = G.rawTime;
  const d = dusk(camX);
  if (camX < 5200 && d < 0.05) {
    // heat shimmer: the far road, in slices, each a little out of true
    const floorImg = ASSETS[st.floorKey];
    if (floorImg) {
      const fw = st.floorW, fs = artScale(floorImg);
      const off = ((Math.round(camX) % fw) + fw) % fw;
      for (let y = FLOOR_Y; y < FLOOR_Y + 14; y += 2) {
        const wob = Math.sin(t * 0.11 + y * 0.9) * (1.1 - (y - FLOOR_Y) * 0.07);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, y, W, 2); ctx.clip();
        for (let x = -off; x < W; x += fw) ctx.drawImage(floorImg, x + wob, FLOOR_Y, floorImg.width / fs, floorImg.height / fs);
        ctx.restore();
      }
    }
    return;
  }
  const band = waterBand(st, camX);
  if (!band) return;
  const WATER_Y = band.y, WATER_H = band.h;
  const wall = ASSETS[st.wallKey];
  // the wall plane, mirrored into the water in slices that drift out of register
  if (wall) {
    const ww = wall.width / artScale(wall), wh = wall.height / artScale(wall);
    const off = ((Math.round(camX) % ww) + ww) % ww;
    for (let y = WATER_Y; y < WATER_Y + WATER_H; y += 2) {
      const k = (y - WATER_Y) / WATER_H;
      const wob = Math.sin(t * 0.06 + y * 0.9) * (0.5 + k * 1.4);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, y, W, 2); ctx.clip();
      ctx.globalAlpha = 0.28 - k * 0.2;
      ctx.translate(wob, WATER_Y * 2);
      ctx.scale(1, -1);
      for (let x = -off; x < W; x += ww) ctx.drawImage(wall, x, 0, ww, wh);
      ctx.restore();
    }
  }
  // what floats past: three things, y-sorted by nothing because the water is behind the lane
  for (const d of (st.debris || [])) {
    const img = ASSETS['amb_debris_' + d.kind];
    if (!img) continue;
    const drift = d.kind === 'scooter' ? 0 : 0.08;
    const x = d.x + (drift ? ((t * drift + d.x) % 900) - 450 : 0);
    const sx = Math.round(x - camX);
    if (sx < -30 || sx > W + 30) continue;
    const bob = Math.sin(t * 0.04 + d.x) * 0.8;
    const dy = Math.round(WATER_Y + Math.min(WATER_H - 2, d.dy || 4) + bob);
    blit(ctx, img, sx - Math.round(frameW(img) / 2), dy - frameH(img));
  }
  // foam: clumps on two rates, and a slow lift and fall along the line
  const sl = G.sluice;
  const surge = sl ? sl.k : 0;
  ctx.save();
  for (let i = 0; i < 46; i++) {
    const rate = 0.12 + (i % 3) * 0.09;
    const fx = RIVER_FROM - 200 + ((i * 173.7 + t * rate) % (st.width - RIVER_FROM + 200));
    const sx = fx - camX;
    if (sx < -20 || sx > W + 20) continue;
    const w = 3 + (i * 7) % 7 + surge * 5, h = 1 + (i % 2) * 0.6 + surge * 0.8;
    const y = WATER_Y + 2 + (i * 11) % Math.max(2, WATER_H - 4) + Math.sin(t * 0.05 + i) * 0.8;
    ctx.globalAlpha = 0.35 + ((i * 13) % 5) * 0.08 + surge * 0.3;
    ctx.fillStyle = i % 4 ? '#d8dcd2' : '#b8c0b4';
    ctx.beginPath(); ctx.ellipse(Math.round(sx), y, w, h, 0, 0, Math.PI * 2); ctx.fill();
  }
  // the sluice: foam piles along the lip through the tell, then a wash across the lane
  if (sl && surge > 0) {
    const lip = WATER_Y + WATER_H - 1;
    ctx.globalAlpha = 0.25 + surge * 0.45;
    ctx.fillStyle = '#e4e8e0';
    for (let x = ((t * 1.3) % 18) - 18; x < W; x += 18) {
      ctx.beginPath(); ctx.ellipse(x, lip - surge * 2, 9 + surge * 4, 2 + surge * 2, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (sl.pushing) {
      // the wash itself: a thin sheet sliding over the stone toward the drop
      const k = (t % 30) / 30;
      ctx.globalAlpha = 0.18 * (1 - k);
      ctx.fillStyle = '#c8d4d0';
      ctx.fillRect(0, lip + k * 40, W, 5);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

// The near side of the ring: two knots of onlookers, backs to the camera, standing on
// the arena walls in the foreground. They walk inward with the walls, which is how the
// squeeze is read. Drawn after the world so the fight happens behind their shoulders.
export function drawRingCrowd(ctx, camX) {
  if (!(G.arenaSqueeze > 1)) return;
  const a = ASSETS.amb_crowd_a, b = ASSETS.amb_crowd_b;
  if (!a || !b) return;
  const lo = arenaMin() - camX, hi = arenaMax() - camX;
  const k = clamp(G.arenaSqueeze / 40, 0, 1);
  const wob = G.ringWobble > 0 ? Math.min(3, G.ringWobble / 12) : 0;
  ctx.save();
  ctx.globalAlpha = k;
  for (const [img, edge, dir] of [[a, lo, -1], [b, hi, 1]]) {
    const w = frameW(img), h = frameH(img);
    // centred on the wall, feet just below the bottom of the screen, so heads and
    // shoulders stand in the bottom 60 px and the fight reads over them
    const x = Math.round(edge - w / 2 + dir * 10);
    const y = Math.round(H + 26 + Math.sin(G.rawTime * 0.04 + dir) * 1.2 + (wob ? Math.sin(G.rawTime * 0.9) * wob : 0));
    blit(ctx, img, x, y - h);
    // and the near side is in shadow: they are between the sun and the camera
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(20,10,8,0.28)';
    ctx.fillRect(x, y - h, w, h);
    ctx.restore();
  }
  ctx.restore();
}

// The chalk circle the crowd is stood around, on the walls the fight is squeezing, and
// the far side of the ring: a line of heads on the wall plane. Procedural so it cannot
// drift out of agreement with arenaMin/arenaMax, which is the only thing that matters.
function drawChalkRing(ctx, camX) {
  const lo = arenaMin() - camX, hi = arenaMax() - camX;
  const cx = (lo + hi) / 2, rx = (hi - lo) / 2;
  ctx.save();
  ctx.globalAlpha = clamp(G.arenaSqueeze / 40, 0, 1) * 0.5;
  ctx.strokeStyle = '#e8e0cc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, 216, rx + 6, 26, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = clamp(G.arenaSqueeze / 40, 0, 1);
  // the crowd itself: two short walls of heads, breathing slightly out of step. With
  // the sprites in, the near side is drawRingCrowd and only the far heads stay here.
  const sprites = ASSETS.amb_crowd_a && ASSETS.amb_crowd_b;
  for (const [edge, dir] of [[lo, -1], [hi, 1]]) {
    if (sprites) continue;   // the near-side crowd is the ring; the far side is open street
    for (let i = 0; i < 5; i++) {
      const x = Math.round(edge + dir * (2 + i * 5));
      const y = 214 + (i % 3) * 9 + Math.sin((G.rawTime + i * 37) * 0.05) * 0.6
        + (G.ringWobble > 0 ? Math.sin(G.rawTime * 0.9 + i) * Math.min(3, G.ringWobble / 12) : 0);
      ctx.fillStyle = i % 2 ? '#241a14' : '#1a1210';
      ctx.fillRect(x - 4, Math.round(y) - 34, 9, 34);
      ctx.fillRect(x - 3, Math.round(y) - 42, 7, 9);
    }
  }
  ctx.restore();
}

// ------------------------------------------------------------- definitions
// THE NIGHT TRAIN's plate pass: the grade sliding between areas, the sodium pools on the
// platform, the cold blue of the AC coach, and the wall-plane pieces that move.
function nightTrainAmbient(ctx, camX, layers) {
  const st = G.stage;
  const zone = areaAt(st, camX);
  const grade = zone ? (zone.k < 0.5 ? zone.a.grade : zone.b.grade) : (st.grade || '150,170,230');
  const gradeA = zone ? zone.a.gradeA + (zone.b.gradeA - zone.a.gradeA) * zone.k : (st.gradeA || 0.08);
  drawTrainWallPlane(ctx, camX);
  for (const g of (st.glows || [])) {
    const sx = g.x - camX;
    if (sx < -g.r * 3 || sx > W + g.r * 3) continue;
    const grad = ctx.createRadialGradient(sx, g.y, 2, sx, g.y, g.r * 3);
    grad.addColorStop(0, `rgba(255,150,60,${g.a})`);
    grad.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - g.r * 3, g.y - g.r * 3, g.r * 6, g.r * 6);
  }
  ctx.fillStyle = `rgba(${grade},${gradeA})`;
  ctx.fillRect(0, 0, W, H);
}

export const STAGES = [
  {
    id: 'delhi', num: '1-1', name: 'DIRTY DELHI', sub: 'ACT I - THE MARKET AND THE RIVER',
    width: 12480,
    // 26 screens of 480, stitched by tools/build_dirty_delhi.py. floorW equals the
    // stage width and the wall plate is exactly as wide, so NEITHER plane ever tiles -
    // get this wrong and the wall wraps or the floor gaps.
    wallKey: 'bg_d1_wall', floorKey: 'bg_d1_floor', floorW: 12480,
    music: 'stage1a', musicB: 'stage1b', musicBX: 8300,
    bossMusic: 'boss', bossMusicFinal: 'boss1', boss: 'dredger',

    // Six areas, deliberately unequal. Nobody is told they changed area; the grade
    // slides between these over 240px and they notice.
    areas: [
      { id: 'market', x1: 2100, grade: '255,190,110', gradeA: 0.035 },
      { id: 'food', x1: 3400, grade: '255,170,90', gradeA: 0.055 },
      { id: 'wire', x1: 5000, grade: '240,180,120', gradeA: 0.045 },
      { id: 'drain', x1: 8300, grade: '40,80,70', gradeA: 0.30 },
      { id: 'ghat', x1: 10900, grade: '120,90,140', gradeA: 0.18 },
      { id: 'pontoon', x1: 12480, grade: '90,70,130', gradeA: 0.24 },
    ],
    // The water is at the BACK of the depth lane, so these raise the lane floor.
    // Outside a span it is FLOOR_TOP and nothing behaves differently.
    pits: [
      { x0: 8300, x1: 10900, y: 196 },    // the ghat: the steps go down into it
      { x0: 10900, x1: 12480, y: 190 },   // the pontoon: a deeper lane, less floor
    ],
    // Shopfront rollers: they come down when a gate locks, which is what makes the
    // gates feel caused rather than imposed. Each x/y must be MEASURED off an opening
    // the plate actually paints in assets/stages/dirty_delhi/wall.png - these are
    // first-pass positions and the layer draws nothing until the art lands, so a
    // wrong one costs nothing until it has been checked in the review page.
    // Measured off the plate at 1 plate px = 0.5 logical: the OPEN fronts only (the
    // plate already paints the closed ones shut). x/y is the opening's top-left, w/h its
    // size; the one shutter sprite is stretched to the opening.
    shutters: [
      { x: 487, y: 88, w: 118, h: 80 },    // the spice shop
      { x: 765, y: 98, w: 120, h: 70 },    // the tea stall
      { x: 1520, y: 98, w: 120, h: 70 },   // the second tea stall
      { x: 1800, y: 96, w: 120, h: 72 },   // the second spice shop
      { x: 2400, y: 82, w: 165, h: 86 },   // the kitchen
      { x: 2680, y: 97, w: 170, h: 71 },   // the sweet shop
      { x: 3220, y: 96, w: 100, h: 72 },   // the copper stall
      { x: 3440, y: 96, w: 150, h: 72 },   // the goods shop
      { x: 3750, y: 98, w: 130, h: 70 },   // the barrel front
      { x: 3930, y: 98, w: 110, h: 70 }, { x: 4060, y: 98, w: 100, h: 70 }, { x: 4170, y: 98, w: 90, h: 70 },
    ],

    // No artificial light at all in the market - that is the point of the first half.
    // The drain has one swinging bulb (a glow, not a lamp), and the river runs on
    // sodium pools on wet stone. lampA is ramped by dusk() in the ambient pass.
    lamps: [5300, 6100, 6900, 7700, 8500, 8900, 9400, 9900, 10400,
      10900, 11300, 11700, 12100],
    lampCol: '255,170,80', lampA: 0.02,
    rim: null, moteCount: 22, moteStyle: 'dust', grade: '255,190,110', gradeA: 0.035,
    glows: [{ x: 6600, y: 120, r: 26, a: 0.30, swing: true }],   // the drain's one swinging bulb
    // rats at three holes on the ghat, on the lip of the lane where the wall meets it;
    // what floats past the ghat and the pontoon
    rats: [{ x: 8720, y: 197, dir: 1 }, { x: 9460, y: 197, dir: -1 }, { x: 10280, y: 197, dir: 1 }],
    debris: [
      { kind: 'bottle', x: 8900, dy: 12 }, { kind: 'garland', x: 9700, dy: 10 },
      { kind: 'scooter', x: 10450, dy: 14 }, { kind: 'bottle', x: 11300, dy: 8 },
      { kind: 'garland', x: 12000, dy: 7 },
    ],

    props: [
      // health economy: 8 crates at +30 and 4 tables at +15 is the level's 300 hp
      { kind: 'crate', x: 670, y: 208 }, { kind: 'crate', x: 1120, y: 214 },
      { kind: 'crate', x: 1930, y: 206 }, { kind: 'crate', x: 3260, y: 212 },
      { kind: 'crate', x: 4380, y: 208 }, { kind: 'crate', x: 8940, y: 216 },
      { kind: 'crate', x: 10360, y: 214 }, { kind: 'crate', x: 11520, y: 210 },
      { kind: 'table', x: 2900, y: 230 },
      { kind: 'table', x: 3320, y: 224 }, { kind: 'table', x: 10620, y: 228 },
      // texture, not economy
      { kind: 'matka', x: 980, y: 232 }, { kind: 'matka', x: 2210, y: 236 },
      { kind: 'tyres', x: 1670, y: 235 }, { kind: 'tyres', x: 3980, y: 233 },
      { kind: 'sign', x: 2380, y: 190 }, { kind: 'sign', x: 4120, y: 188 },
      // The stall you have to break, and the level's only 1-up one lane behind it.
      // It is one of the four tables rather than a fifth: the thing hiding the 1-up
      // should not also hand out a snack, and the 300 is a placed number.
      { kind: 'table', x: 2500, y: 230 },
      { kind: 'mithai', x: 2506, y: 198 },
      // terrain you place yourself: six drums along the bank
      { kind: 'drum', x: 9020, y: 212 }, { kind: 'drum', x: 9160, y: 224 },
      { kind: 'drum', x: 9290, y: 206 }, { kind: 'drum', x: 10080, y: 220 },
      { kind: 'drum', x: 10240, y: 210 }, { kind: 'drum', x: 11360, y: 218 },
    ],
    // Three roosts, and nobody at all past the drain. That contrast is most of why
    // the second half lands, so the emptiness is authored rather than forgotten.
    birds: [
      { x: 500, y: 218 }, { x: 526, y: 225 }, { x: 575, y: 232 }, { x: 548, y: 212 },
      { x: 2330, y: 228 }, { x: 2360, y: 220 }, { x: 2392, y: 231 },
      { x: 3910, y: 224 }, { x: 3946, y: 216 }, { x: 3978, y: 230 },
    ],
    fg: [],
    ambience: [],
    emitters: [],

    // Beats with no wave attached, gated by player x exactly like the waves.
    events: [
      { x: 1300, kind: 'bull' },                     // the tell, learned for free
      { x: 5000, kind: 'music', slot: null },        // the drain kills the track dead
      { x: 8300, kind: 'music', slot: 'stage1b' },   // and the river answers it
      { x: 8300, kind: 'sluice' },
      { x: 12000, kind: 'crane' },
    ],

    waves: [
      { x: 380, spawns: ['goonda', 'goonda', 'goonda'] },
      { x: 920, spawns: ['goonda', 'goonda', 'bandar', 'bandar'] },
      { x: 1480, spawns: ['batta', 'goonda', 'goonda', 'goonda'] },
      { x: 2100, spawns: [], miniboss: 'pappu', intro: true, camX: 1900 },
      { x: 2780, spawns: ['cooker', 'goonda', 'goonda', 'bandar'], runner: 'dabbawala' },
      { x: 3150, spawns: ['cooker', 'cooker', 'thela', 'goonda'] },
      { x: 3700, spawns: ['batta', 'batta', 'cooker', 'bandar'] },
      { x: 4200, spawns: ['thela', 'cooker', 'batta', 'goonda', 'goonda', 'bandar'], bull: true },
      { x: 4700, spawns: [], miniboss: 'mirchi', intro: true, camX: 4520 },
      { x: 8500, spawns: ['goonda', 'goonda', 'mudlark'] },
      { x: 9100, spawns: ['mudlark', 'mudlark', 'goonda', 'goonda'] },
      { x: 10200, spawns: ['thela', 'goonda', 'goonda', 'mudlark', 'dhobi'] },
      { x: 11100, spawns: ['mudlark', 'mudlark', 'mudlark', 'batta', 'bandar'] },
      { x: 11600, spawns: ['thela', 'mudlark', 'mudlark', 'batta', 'goonda', 'goonda'] },
      { x: 12100, spawns: [], boss: true },
    ],
    build: () => ({ far: buildDelhiFar(), mid: buildDelhiMid(), floor: buildDelhiFloor() }),
    ambient: dirtyDelhiAmbient,
  },
  {
    id: 'train', num: '1-2', name: 'THE NIGHT TRAIN', sub: 'ACT II - THE 22:40 SOUTH',
    width: 9120,
    // 19 screens of 480, stitched by tools/build_night_train.py. The wall plate has
    // holes in it - every window, the open doors, the sky over the roof - and the
    // world outside scrolls through them on the train's own clock (js/train.js).
    wallKey: 'bg_d2_wall', floorKey: 'bg_d2_floor', floorW: 9120,
    music: 'stage2a', musicB: 'stage2b', musicBX: ABOARD_X,
    bossMusic: 'boss', bossMusicFinal: 'boss2', boss: 'birju',
    introVoice: true,   // the station opening (js/story.js) has Duke's line; wave 0 stays quiet
    skyLayers: [{ draw: drawOutside }],
    init: initTrain,

    areas: [
      { id: 'forecourt', x1: 960, grade: '255,190,120', gradeA: 0.06 },
      { id: 'hall', x1: 1920, grade: '200,220,255', gradeA: 0.05 },
      { id: 'bridge', x1: 2400, grade: '120,140,200', gradeA: 0.10 },
      { id: 'dock', x1: 3360, grade: '255,180,100', gradeA: 0.07 },
      { id: 'platform', x1: 4800, grade: '200,210,255', gradeA: 0.06 },
      { id: 'carriages', x1: 7680, grade: '150,170,230', gradeA: 0.10 },
      { id: 'roof', x1: 9120, grade: '90,110,180', gradeA: 0.16 },
    ],
    // the footbridge: a railing at the back, and the tracks a long way below it
    pits: [{ x0: 1920, x1: 2400, y: 200 }],
    // the corridor is 30 px deep with a shelf of berths above it; the roof is 80,
    // with an edge at the front and wind off the loco
    lanes: [
      { x0: ABOARD_X, x1: ROOF_X, top: 196, bot: 226, berth: 52 },
      { x0: ROOF_X, x1: 9120, top: 181, bot: 261, edge: true, wind: 0.3 },
    ],
    // the heavy's third prop: a steel trunk on his head
    rigs: { thela: 'thelatrunk' },

    lamps: [180, 700, 1300, 1700, 2100, 2600, 3000, 3500, 3900, 4300, 4700,
      5040, 5520, 6000, 6480, 6960, 7440],
    lampCol: '255,200,120', lampA: 0.05,
    rim: null, moteCount: 14, moteStyle: 'dust', grade: '150,170,230', gradeA: 0.08,
    glows: [{ x: 6400, y: 60, r: 40, a: 0.22 }],   // the pantry's gas rings
    shutters: null, rats: null, debris: null,

    props: [
      // the health economy: 300 hp. Five at +30, four at +15, the fridge's 1-up.
      { kind: 'trolley', x: 300, y: 224 }, { kind: 'trunk', x: 1180, y: 214 },
      { kind: 'trolley', x: 2900, y: 226 }, { kind: 'trunk', x: 4120, y: 212 },
      { kind: 'trolley', x: 6180, y: 220 },
      { kind: 'parcel', x: 2560, y: 208 }, { kind: 'parcel', x: 3050, y: 214 },
      { kind: 'berthtable', x: 5340, y: 200 }, { kind: 'berthtable', x: 6780, y: 200 },
      { kind: 'glasses', x: 6300, y: 222 },
      { kind: 'urn', x: 6420, y: 200 },
      { kind: 'fridge', x: 6100, y: 198 },
      // one per carriage, above head height, easy to miss
      { kind: 'chain', x: 5100, y: 198, z: 62 }, { kind: 'chain', x: 5560, y: 198, z: 62 },
      { kind: 'chain', x: 6100, y: 198, z: 62 }, { kind: 'chain', x: 6700, y: 198, z: 62 },
      // texture, not economy
      { kind: 'parcel', x: 2700, y: 230 }, { kind: 'trunk', x: 3560, y: 230 },
      { kind: 'matka', x: 4420, y: 232 },
    ],
    // pigeons in the girders over the platform
    birds: [
      { x: 3480, y: 214 }, { x: 3512, y: 222 }, { x: 3900, y: 218 }, { x: 3930, y: 228 },
    ],
    fg: [], ambience: [], emitters: [],

    events: [
      { x: 1250, kind: 'ticket' },        // a thumb through the grille: one ticket, south
      { x: 2450, kind: 'trolleys' },      // the hand trucks start rolling
      { x: 4250, kind: 'whistle' },       // the guard, and the rake creeps
      { x: 6400, kind: 'tunnel' },        // mid-walk, nothing to fight, 200 frames of dark
      { x: 7700, kind: 'music', slot: 'stage2b' },
    ],

    waves: [
      // the cow is not a fighter: she is the forecourt's furniture until somebody hits her
      { x: 380, spawns: ['gai', 'goonda', 'goonda', 'goonda', 'batta'] },
      { x: 900, spawns: ['goonda', 'goonda', 'coolie', 'goonda', 'bandar'] },
      { x: 1700, spawns: ['bandar', 'goonda', 'goonda', 'batta'], thief: true },
      { x: 2700, spawns: ['thela', 'coolie', 'thela', 'goonda', 'goonda'] },
      { x: 3800, spawns: ['gai', 'thela', 'coolie', 'cooker', 'batta', 'goonda', 'goonda', 'bandar'] },
      // THE DEPARTURE: a situation, not a person. Ends with a running jump, or a soft fail.
      { x: 4300, spawns: ['goonda', 'coolie', 'goonda', 'batta', 'bandar'], depart: true },
      { x: 5000, spawns: ['goonda', 'goonda', 'goonda'] },
      { x: 5500, spawns: ['manja', 'manja', 'coolie', 'goonda', 'goonda'] },
      { x: 6000, spawns: ['cooker', 'manja', 'goonda'], runner: 'goonda' },
      { x: 6600, spawns: ['thela', 'coolie', 'goonda', 'goonda', 'bandar'] },
      { x: 7200, spawns: [], miniboss: 'tte', intro: true, camX: 7200 },
      { x: 8000, spawns: ['goonda', 'coolie', 'goonda', 'goonda', 'bandar', 'manja', 'coolie'] },
      { x: 8600, spawns: [], boss: true },
    ],
    build: () => ({ far: buildDelhiFar(), mid: buildDelhiMid(), floor: buildDelhiFloor() }),
    ambient: nightTrainAmbient,
  },
];

const layerCache = {};

export function stageDef(i) { return STAGES[clamp(i, 0, STAGES.length - 1)]; }

export function initStage(index) {
  initStageObj(stageDef(index === undefined ? G.stageIndex : index));
}

// Same setup from a stage-shaped object rather than an index, so the dojo hub in
// js/hub.js can reuse all of it without living in STAGES (which is the act list).
export function initStageObj(st) {
  G.stage = st;
  if (!layerCache[st.id]) layerCache[st.id] = st.build();
  G.camX = 0;
  G.camMax = st.width - W;
  G.camLock = 0;
  G.locked = false;
  // a retry or a stage change must never inherit a squeezed arena
  G.arenaSqueeze = 0;
  G.arenaSqueezeTarget = 0;
  G.arenaRear = 0;
  G.arenaRearTarget = 0;
  G.train = null;
  G.runnerEscaped = false;
  G.introResume = null;
  G.sluice = null;
  G.shutterT = 0;
  for (const ev of (st.events || [])) ev.done = false;
  G.waveIndex = -1;
  G.waveActive = false;
  G.goTimer = 0;
  G.motes = [];
  for (let i = 0; i < st.moteCount; i++) {
    const up = st.moteStyle === 'steam';
    G.motes.push({
      x: rand(0, st.width), y: rand(20, H - 20),
      vx: rand(-0.15, 0.15), vy: up ? rand(-0.5, -0.2) : rand(-0.06, 0.06),
      tw: irand(0, 60),
    });
  }
  G.props = (st.props || []).map((d) => createProp(d.kind, d.x, d.y, d.z));
  // lair leftovers that must not survive into a fight: its tiger, and CHAD sat down
  G.actors = [];
  G.hubSeat = 0;
  initAmbience(st);
  G.zones = [];
  for (const w of st.waves) { w.done = false; if (w.spawns0) w.spawns = [...w.spawns0]; else w.spawns0 = [...w.spawns]; }
  if (st.init) st.init(st);
}

export function drawStage(ctx, camX) {
  const st = G.stage || STAGES[0];
  const layers = layerCache[st.id] || (layerCache[st.id] = st.build());
  const wall = ASSETS[st.wallKey];
  const floorImg = ASSETS[st.floorKey];

  // Optional layers behind the wall, for a wall with holes in it: the lair's glass is
  // keyed out, so the city sits back here and parallaxes through the window. Each entry
  // is either a tiling plate at its own parallax, or a draw hook - the lair's sun goes
  // between its two city layers so the near towers occlude it.
  for (const layer of (st.skyLayers || [])) {
    if (layer.draw) { layer.draw(ctx, camX); continue; }
    const img = ASSETS[layer.key];
    if (!img) continue;
    const sw = img.width / artScale(img), sh = img.height / artScale(img);
    const off = ((Math.round(camX * layer.par) % sw) + sw) % sw;
    for (let x = -off; x < W; x += sw) ctx.drawImage(img, x, 0, sw, sh);
  }

  if (wall) {
    const ww = wall.width / artScale(wall), wh = wall.height / artScale(wall);
    const off = ((Math.round(camX) % ww) + ww) % ww;
    for (let x = -off; x < W; x += ww) ctx.drawImage(wall, x, 0, ww, wh);
  } else {
    let fx = Math.round(camX * 0.2) % 900;
    ctx.drawImage(layers.far, -fx, 0);
    if (900 - fx < W) ctx.drawImage(layers.far, 900 - fx, 0);
    let mx = Math.round(camX * 0.55) % 1400;
    ctx.drawImage(layers.mid, -mx, 0);
    if (1400 - mx < W) ctx.drawImage(layers.mid, 1400 - mx, 0);
  }

  drawAmbienceFacade(ctx, camX);

  // light pools anchored to world positions
  for (const lx of st.lamps) {
    const sx = lx - camX;
    if (sx < -140 || sx > W + 140) continue;
    const grad = ctx.createRadialGradient(sx, 22, 5, sx, 22, 130);
    grad.addColorStop(0, `rgba(${st.lampCol},${st.lampA})`);
    grad.addColorStop(1, `rgba(${st.lampCol},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 130, 0, 260, FLOOR_Y);
  }

  if (floorImg) {
    const fw = st.floorW;
    const off = ((Math.round(camX) % fw) + fw) % fw;
    const fs = artScale(floorImg);
    for (let x = -off; x < W; x += fw) ctx.drawImage(floorImg, x, FLOOR_Y, floorImg.width / fs, floorImg.height / fs);
  } else {
    const off = ((Math.round(camX) % 160) + 160) % 160;
    for (let x = -off; x < W; x += 160) ctx.drawImage(layers.floor, x, FLOOR_Y);
  }

  drawBirds(ctx, camX);
  st.ambient(ctx, camX, layers);
}

export function updateMotes() {
  const st = G.stage || STAGES[0];
  // The light is simulation, not draw. drawStage reads st.lampA before it ever calls
  // ambient(), so setting it in there would light the room with the previous frame's
  // camera - and the review page and the lab call drawStage more than once a frame.
  if (st.areas) st.lampA = 0.02 + dusk(G.camX) * 0.10;
  const steam = st.moteStyle === 'steam';
  for (const m of G.motes) {
    m.x += m.vx; m.y += m.vy;
    if (steam) {
      if (m.y < 96) { m.y = H - 10; m.x = rand(0, W); }
    } else {
      if (m.y < 10) m.y = H - 20;
      if (m.y > H - 10) m.y = 20;
      if (m.x < 0) m.x = st.width;
      if (m.x > st.width) m.x = 0;
    }
  }
}
