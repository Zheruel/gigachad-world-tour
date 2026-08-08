// stages.js - STAGE 1: CHANDNI CHOWK. Background layers, waves, breakable
// props, camera gating and the ambience pass that makes the market feel lived in.
// Each stage draws AI wall/floor PNGs when present and falls back to a
// procedural pixel-art build of the same street when they are missing.
import { G, W, H, clamp, rand, irand } from './engine.js';
import { Pix, artScale } from './sprites.js';
import { ASSETS } from './assets.js';
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

function delhiAmbient(ctx, camX, layers) {
  const t = G.rawTime;

  // authored warm glows, anchored where the plate actually shows a fire or a lamp
  for (const g of (G.stage.glows || [])) {
    const sx = g.x - camX;
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

  // warm afternoon grade + vignette
  const grade = G.stage.grade || '255,190,110';
  ctx.fillStyle = `rgba(${grade},${G.stage.gradeA || 0.045})`;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.52, W / 2, H / 2, H * 1.1);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(30,16,6,0.30)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------- definitions
export const STAGES = [
  {
    id: 'bazaar', num: '1-1', name: 'BAZAAR HEAT', sub: 'ACT I - KING OF THE METER', width: 5000,
    wallKey: 'bg_bazaar_v2_wall', floorKey: 'bg_bazaar_v2_floor', floorW: 5000,
    music: 'stage1', bossMusic: 'boss', boss: 'raja',
    lamps: [], lampCol: '255,190,110', lampA: 0.15,
    rim: null, moteCount: 22, moteStyle: 'dust', grade: '255,190,110', gradeA: 0.035,
    glows: [],
    props: [
      { kind: 'crate', x: 670, y: 202 },
      { kind: 'matka', x: 980, y: 232 }, { kind: 'table', x: 1320, y: 228 },
      { kind: 'tyres', x: 1670, y: 235 },
      { kind: 'sign', x: 2380, y: 190 }, { kind: 'crate', x: 2780, y: 202 },
    ],
    birds: [
      { x: 500, y: 218 }, { x: 526, y: 225 }, { x: 575, y: 232 },
      { x: 1260, y: 224 }, { x: 1300, y: 232 }, { x: 1810, y: 220 },
      { x: 2330, y: 228 }, { x: 2360, y: 220 }, { x: 2860, y: 232 },
      { x: 3340, y: 221 }, { x: 3380, y: 230 }, { x: 3910, y: 224 },
      { x: 4170, y: 231 },
    ],
    fg: [],
    ambience: [],
    emitters: [],
    waves: [
      { x: 380, spawns: ['goonda', 'goonda', 'bandar', 'goonda'] },
      { x: 920, spawns: ['batta', 'goonda', 'masala', 'goonda'] },
      { x: 1480, spawns: ['constable', 'bandar', 'goonda', 'masala', 'goonda'] },
      { x: 2100, spawns: ['pehlwan', 'batta', 'goonda', 'bandar', 'goonda'] },
      { x: 2780, spawns: ['operator', 'goonda', 'batta', 'bandar', 'goonda'] },
      { x: 3420, spawns: ['constable', 'masala', 'goonda', 'pehlwan', 'bandar'] },
      { x: 4070, spawns: ['sepoy', 'bandar', 'batta', 'goonda', 'operator', 'constable'] },
      { x: 4700, spawns: [], boss: true },
    ],
    build: () => ({ far: buildDelhiFar(), mid: buildDelhiMid(), floor: buildDelhiFloor() }), ambient: delhiAmbient,
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
  G.props = (st.props || []).map((d) => createProp(d.kind, d.x, d.y));
  // lair leftovers that must not survive into a fight: its tiger, and CHAD sat down
  G.actors = [];
  G.hubSeat = 0;
  initAmbience(st);
  G.zones = [];
  for (const w of st.waves) w.done = false;
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
