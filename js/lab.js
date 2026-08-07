// lab.js - asset lab: inspect every sprite, stage and effect in isolation.
// Open lab.html. Nothing here is loaded by the game itself.
import { G, W, H, RS, FLOOR_TOP, FLOOR_BOT } from './engine.js';
import { SPR, getFrame, drawText, drawTextShadow, textWidth, mkCanvas, blit, frameW, frameH } from './sprites.js';
import { getAIFrame, loadAIFrames, anchorOf, setAnchor, allAnchors } from './aiframes.js';
import { COMBO, COMBO_FLOW, keyFrame, ragnarokPose, WALK_STRIDE, RUN_STRIDE, CHAIN_SKIP } from './player.js';
import { loadAssets, ASSETS } from './assets.js';
import { STAGES, initStage, drawStage, updateMotes } from './stages.js';
import { loadCrowd, updateCrowd, updateBirds, drawCrowd, crowdKey, crowdOverrides, setOverride, KIND_META, expectedHeight, HERO_H, PLANES } from './crowd.js';
import { loadFG, drawFG } from './fg.js';
import { loadAmbience, updateAmbience, reactStage } from './ambience.js';
import { updateEffects, drawEffects, spawnSpark, spawnDust, spawnShock, spawnRing, spawnSteam, spawnPop } from './effects.js';
import { loadStory, motorFrames } from './story.js';

const view = document.getElementById('view');
const ctx = view.getContext('2d');
ctx.imageSmoothingEnabled = false;
const readout = document.getElementById('readout');
const controls = document.getElementById('controls');
const tabs = document.getElementById('tabs');

// character key -> sprite set (skips the enrage duplicates)
const CAST = [
  ['player', 'CHAD'],
  ['goonda', 'GOONDA'], ['batta', 'BATTA'], ['masala', 'MASALA'],
  ['bandar', 'BANDAR'], ['pehlwan', 'PEHLWAN'],
  ['constable', 'CONSTABLE'],
  ['operator', 'OPERATOR'], ['sepoy', 'CHAIN SEPOY'],
  ['raja', 'RICKSHAW RAJA'], ['mirchi', 'MIRCHI'], ['refund', 'MR. REFUND'],
  ['yadav', 'INSPECTOR YADAV'], ['rana', 'COMMANDER RANA'],
];

const MODES = ['ANIM', 'AMBIENCE', 'CAST', 'SCALE', 'STAGE', 'CONTRAST', 'EFFECTS'];
const state = {
  mode: 'ANIM',
  char: 'player',
  stage: 0,
  camX: 0,
  zoom: 3,
  face: 1,
  playing: true,
  showGround: true,
  showBox: false,
  forceCode: false,
  showGrid: false,
  ambience: true,
  speed: 8,
  seq: 'combo_power', // which sequence ANIM plays
  onion: true,
  animT: 0,
  animPlay: true,
  animStep: 0,
  dirty: false,      // unsaved anchor edits
  actor: 0,          // which background actor CROWD is inspecting
  hideActor: false,  // A/B it out to see what the plate already paints there
  soloActor: true,   // hide its neighbours so nothing else explains a bad read
  crowdFrame: 0,
  crowdPlay: true,
  grid: false,       // all the actors at once, rather than one at a time
  showFG: true,      // the near-camera layer, so occlusion is judged in place
};

let t = 0;
// so the console can drive the lab without clicking, and without waiting on rAF
window.LAB = state;

// ---------------------------------------------------------------- helpers
function setSize(w, h) {
  if (view.width !== w || view.height !== h) { view.width = w; view.height = h; }
  ctx.imageSmoothingEnabled = false;
}

function statesOf(key) {
  const set = SPR[key];
  return Object.keys(set).filter((k) => !k.endsWith('_f') && k !== '_aiKey' && Array.isArray(set[k]));
}

// what the game would actually draw for this state, and where it came from
function frameFor(key, name, idx, face) {
  if (name === 'motorcycle') {
    const arr = motorFrames();
    return { frame: arr[idx % arr.length], src: 'STORY', count: arr.length };
  }
  const set = SPR[key];
  if (state.forceCode) {
    const arr = face === 1 ? set[name] : set[name + '_f'];
    return { frame: arr[idx % arr.length], src: 'CODE', count: arr.length };
  }
  const ai = getAIFrame(key, name);
  if (ai) {
    const arr = face === 1 ? ai.f : ai.fl;
    return { frame: arr[idx % arr.length], src: 'AI', count: arr.length };
  }
  const arr = face === 1 ? set[name] : set[name + '_f'];
  return { frame: arr[idx % arr.length], src: 'CODE', count: arr.length };
}

// opaque bounds of a frame: tells us real drawn height + feet offset
function bounds(frame) {
  const c = frame.getContext ? frame : null;
  const cv = c || frame;
  const g = cv.getContext('2d');
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let minX = cv.width, maxX = -1, minY = cv.height, maxY = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 16) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < 0 ? null : { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

const boundsCache = new Map();
function cachedBounds(frame) {
  if (!boundsCache.has(frame)) boundsCache.set(frame, bounds(frame));
  return boundsCache.get(frame);
}

function checker(x, y, w, h, a = '#1a1626', b = '#221c30') {
  for (let j = 0; j < h; j += 8) {
    for (let i = 0; i < w; i += 8) {
      ctx.fillStyle = ((i / 8 + j / 8) & 1) ? a : b;
      ctx.fillRect(x + i, y + j, 8, 8);
    }
  }
}

function label(str, x, y, col = '#e8e0f0', scale = 1) {
  drawTextShadow(ctx, str, x, y, col, scale);
}

// ------------------------------------------------------------------ modes
function drawCast() {
  const key = state.char;
  const names = statesOf(key);
  const idx0 = state.playing ? (t / state.speed | 0) : 0;
  const z = state.zoom;
  // size the grid to the biggest frame so nothing clips or overlaps
  let maxW = 0, maxH = 0;
  for (const n of names) {
    const f = frameFor(key, n, idx0, state.face).frame;
    maxW = Math.max(maxW, frameW(f)); maxH = Math.max(maxH, frameH(f));
  }
  const cellW = Math.max(70, maxW * z + 18);
  const cellH = maxH * z + 30;
  const cols = Math.max(1, Math.floor(1240 / cellW));
  const rows = Math.ceil(names.length / cols);
  setSize(cols * cellW + 8, rows * (cellH + 24) + 30);
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, 0, view.width, view.height);

  const info = [];
  names.forEach((name, i) => {
    const cx = 4 + (i % cols) * cellW;
    const cy = 22 + Math.floor(i / cols) * (cellH + 24);
    checker(cx, cy, cellW - 4, cellH);
    const { frame, src, count } = frameFor(key, name, idx0, state.face);
    const cell = cellW;
    const groundY = cy + cellH - 12;
    // sprites are drawn feet-anchored: dy = groundY - h + 4 (matches the game)
    const dx = Math.round(cx + (cell - 4) / 2 - (frameW(frame) * z) / 2);
    const dy = Math.round(groundY - frameH(frame) * z + 4 * z);
    if (state.showBox) {
      ctx.strokeStyle = 'rgba(255,90,120,0.6)';
      ctx.strokeRect(dx + 0.5, dy + 0.5, frameW(frame) * z - 1, frameH(frame) * z - 1);
    }
    ctx.drawImage(frame, dx, dy, frameW(frame) * z, frameH(frame) * z);
    if (state.showGround) {
      ctx.fillStyle = 'rgba(120,255,180,0.55)';
      ctx.fillRect(cx, groundY, cell - 4, 1);
    }
    const b = cachedBounds(frame);
    const as = frame._as || 1;
    const foot = b ? Math.round((frame.height - 1 - b.maxY) / as) : -1;
    label(name.toUpperCase(), cx + 2, cy - 10, src === 'AI' ? '#ffd94a' : '#9a90ac');
    label(src + ' ' + count + 'F  ' + (b ? Math.round(b.w / as) + 'x' + Math.round(b.h / as) : '-'), cx + 2, cy + cellH + 4, '#6a6078');
    if (b) info.push({ name, src, h: Math.round(b.h / as), w: Math.round(b.w / as), foot });
  });

  // standing states should all read the same height; lying/aerial ones legitimately differ
  const LYING = ['down', 'dead', 'getup', 'slam', 'jumpkick', 'atk', 'punch'];
  const standing = info.filter((i) => !LYING.includes(i.name));
  const aiCount = info.filter((i) => i.src === 'AI').length;
  const heights = standing.map((i) => i.h);
  const feet = info.map((i) => i.foot);
  const spread = heights.length ? Math.max(...heights) - Math.min(...heights) : 0;
  const footSpread = feet.length ? Math.max(...feet) - Math.min(...feet) : 0;
  readout.innerHTML =
    `<b>${key}</b>  states=${names.length}  ai=${aiCount}/${names.length}  ` +
    `standing height ${Math.min(...heights)}-${Math.max(...heights)}px ` +
    (spread > 4 ? `<span class="warn">(spread ${spread} - sprites do not match)</span>` : `(spread ${spread}, consistent)`) +
    `  feet gap ${Math.min(...feet)}-${Math.max(...feet)}px ` +
    (footSpread > 3 ? `<span class="warn">(inconsistent anchoring)</span>` : '(consistent)');
}

function drawScale() {
  // every character on one ground line: the master check for size consistency
  const z = state.zoom;
  const pad = 10;
  const widths = CAST.map(([k]) => frameW(frameFor(k, statesOf(k).includes('idle') ? 'idle' : statesOf(k)[0], 0, 1).frame) * z + pad);
  const total = widths.reduce((a, b) => a + b, 0) + 40;
  setSize(Math.max(600, total), 460);
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, 0, view.width, view.height);
  const groundY = 380;
  // ruler
  ctx.fillStyle = '#2a2236';
  for (let px = 0; px <= 64; px += 8) {
    const y = groundY - px * z;
    ctx.fillRect(0, y, view.width, 1);
    label(px + 'px', 4, y - 9, '#4a4058');
  }
  ctx.fillStyle = '#78ffb4';
  ctx.fillRect(0, groundY, view.width, 1);

  let x = 30;
  const rows = [];
  CAST.forEach(([k, title]) => {
    const names = statesOf(k);
    const name = names.includes('idle') ? 'idle' : names[0];
    const idx = state.playing ? (t / state.speed | 0) : 0;
    const { frame, src } = frameFor(k, name, idx, 1);
    const b = cachedBounds(frame);
    const as = frame._as || 1;
    const fw = frameW(frame), fh = frameH(frame);
    const dy = groundY - fh * z + 4 * z;
    ctx.drawImage(frame, x, dy, fw * z, fh * z);
    if (b) {
      ctx.strokeStyle = 'rgba(255,217,74,0.35)';
      ctx.beginPath();
      ctx.moveTo(x, dy + (b.minY / as) * z); ctx.lineTo(x + fw * z, dy + (b.minY / as) * z);
      ctx.stroke();
      rows.push({ k, h: Math.round(b.h / as), src });
    }
    label(title, x, groundY + 8, '#9a90ac');
    label((b ? Math.round(b.h / as) : '?') + 'px ' + src, x, groundY + 18, src === 'AI' ? '#ffd94a' : '#5a5068');
    x += fw * z + pad;
  });
  const hs = rows.map((r) => r.h);
  const hero = rows.find((r) => r.k === 'player');
  readout.innerHTML = `<b>scale check</b>  hero=${hero ? hero.h : '?'}px  ` +
    `range ${Math.min(...hs)}-${Math.max(...hs)}px  ` +
    `bosses should read 1.05-1.25x hero, henchmen 0.85-1.0x`;
}

function drawStageMode() {
  const st = STAGES[state.stage];
  const z = 3;
  setSize(W * z, H * z + 60);
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, 0, view.width, view.height);
  const buf = stageBuffer();
  const bx = buf.getContext('2d');
  bx.imageSmoothingEnabled = false;
  bx.setTransform(RS, 0, 0, RS, 0, 0);
  bx.clearRect(0, 0, W, H);
  G.stage = st;
  G.rawTime = t; G.time = t;
  if (!state.ambience) {
    // draw only the wall + floor by temporarily neutering the ambience hook
    const keep = st.ambient;
    st.ambient = () => {};
    drawStage(bx, state.camX);
    st.ambient = keep;
  } else {
    drawStage(bx, state.camX);
  }
  if (state.showFG) drawFG(bx, state.camX);
  updateMotes();

  // reference figures at the near, middle and far depth lanes
  const lanes = [FLOOR_TOP, (FLOOR_TOP + FLOOR_BOT) / 2, FLOOR_BOT];
  const idx = state.playing ? (t / state.speed | 0) : 0;
  lanes.forEach((y, i) => {
    const { frame } = frameFor('player', 'idle', idx, 1);
    const x = 60 + i * 90;
    bx.globalAlpha = 1;
    blit(bx, frame, Math.round(x - frameW(frame) / 2), Math.round(y - frameH(frame) + 4));
    bx.fillStyle = 'rgba(120,255,180,0.5)';
    bx.fillRect(x - 14, y + 3, 28, 1);
  });
  // boss for scale at mid lane
  const bossKey = st.boss;
  if (SPR[bossKey]) {
    const { frame } = frameFor(bossKey, 'idle', idx, -1);
    blit(bx, frame, 250 - Math.round(frameW(frame) / 2), Math.round(178 - frameH(frame) + 4));
  }
  if (state.showGrid) {
    bx.strokeStyle = 'rgba(255,255,255,0.12)';
    for (let x = 0; x < W; x += 16) { bx.beginPath(); bx.moveTo(x + 0.5, 0); bx.lineTo(x + 0.5, H); bx.stroke(); }
    for (let y = 0; y < H; y += 16) { bx.beginPath(); bx.moveTo(0, y + 0.5); bx.lineTo(W, y + 0.5); bx.stroke(); }
    bx.strokeStyle = 'rgba(255,90,120,0.5)';
    for (const y of [150, FLOOR_TOP, FLOOR_BOT]) {
      bx.beginPath(); bx.moveTo(0, y + 0.5); bx.lineTo(W, y + 0.5); bx.stroke();
    }
  }
  ctx.drawImage(buf, 0, 0, W * z, H * z);
  label(`STAGE ${st.num} - ${st.name}  (${st.sub})`, 8, H * z + 12, '#ffd94a');
  label(`width ${st.width}px   camX ${Math.round(state.camX)}   wall ${ASSETS[st.wallKey] ? 'PNG' : 'procedural'}   floor ${ASSETS[st.floorKey] ? 'PNG' : 'procedural'}`, 8, H * z + 26, '#9a90ac');
  label(`green lines = depth lanes ${FLOOR_TOP}/${FLOOR_BOT}, red = floor seam 150`, 8, H * z + 40, '#6a6078');
  readout.innerHTML = `<b>${st.name}</b> - scrub the camera; the three reference Billys mark the depth lanes, the boss stands at mid depth for scale.`;
}

let _stageBuf = null;
function stageBuffer() {
  if (!_stageBuf) _stageBuf = mkCanvas(W * RS, H * RS);
  return _stageBuf;
}

function drawContrast() {
  // every character silhouetted over every stage: readability matrix
  const z = 2;
  const cellW = 84, cellH = 90;
  setSize(40 + STAGES.length * cellW, 30 + CAST.length * cellH);
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, 0, view.width, view.height);
  const buf = stageBuffer();
  const bx = buf.getContext('2d');
  STAGES.forEach((st, si) => {
    G.stage = st; G.rawTime = t; G.time = t;
    bx.setTransform(RS, 0, 0, RS, 0, 0);
    bx.clearRect(0, 0, W, H);
    drawStage(bx, 200 + si * 120);
    label(st.name, 40 + si * cellW, 14, '#ffd94a');
    CAST.forEach(([k], ci) => {
      const x = 40 + si * cellW, y = 24 + ci * cellH;
      // crop a slice of the stage as the backdrop
      ctx.drawImage(buf, 40 * RS, 120 * RS, (cellW / z) * RS, (cellH / z) * RS, x, y, cellW - 4, cellH - 4);
      const { frame } = frameFor(k, statesOf(k).includes('idle') ? 'idle' : statesOf(k)[0], 0, 1);
      const fw2 = frameW(frame), fh2 = frameH(frame);
      ctx.drawImage(frame, Math.round(x + (cellW - 4) / 2 - fw2), Math.round(y + cellH - 20 - fh2 * 1.2), fw2 * 2, fh2 * 2);
      if (si === 0) label(k, 2, y + 40, '#9a90ac');
    });
  });
  readout.innerHTML = '<b>contrast matrix</b> - each fighter over each stage. Anything that disappears into the background needs a rim light or palette tweak.';
}

const fx = [];
function drawEffects_() {
  const z = 3;
  setSize(W * z, H * z + 40);
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(0, 0, view.width, view.height);
  const buf = stageBuffer();
  const bx = buf.getContext('2d');
  G.stage = STAGES[state.stage]; G.rawTime = t; G.time = t;
  bx.setTransform(RS, 0, 0, RS, 0, 0);
  bx.clearRect(0, 0, W, H);
  drawStage(bx, 300);
  G.camX = 0;
  updateEffects();
  drawEffects(bx, 0);
  const { frame } = frameFor('player', 'idle', (t / 8 | 0), 1);
  blit(bx, frame, 160 - Math.round(frameW(frame) / 2), 178 - frameH(frame) + 4);
  ctx.drawImage(buf, 0, 0, W * z, H * z);
  label('effects: ' + G.effects.length + ' live', 8, H * z + 14, '#9a90ac');
  readout.innerHTML = '<b>effects</b> - fire each one and watch it in isolation over a real stage.';
}

// --------------------------------------------------------------- controls

// ---------------------------------------------------------------- ANIM mode
// Replays a sequence at exactly the timing the game uses, so a stance pop or a
// sliding foot shows up here rather than in play.

// contact-foot x: centroid of the opaque pixels in the bottom few rows
function footX(frame) {
  const g = frame.getContext('2d');
  const d = g.getImageData(0, 0, frame.width, frame.height).data;
  let lowest = -1;
  for (let y = frame.height - 1; y >= 0 && lowest < 0; y--) {
    for (let x = 0; x < frame.width; x++) {
      if (d[(y * frame.width + x) * 4 + 3] > 16) { lowest = y; break; }
    }
  }
  if (lowest < 0) return null;
  let sum = 0, n = 0;
  for (let y = Math.max(0, lowest - 5); y <= lowest; y++) {
    for (let x = 0; x < frame.width; x++) {
      if (d[(y * frame.width + x) * 4 + 3] > 16) { sum += x; n++; }
    }
  }
  return n ? sum / n : null;
}
const footCache = new Map();
function cachedFoot(f) {
  if (!footCache.has(f)) footCache.set(f, footX(f));
  return footCache.get(f);
}

// Build the exact tick list the game would produce for a sequence.
function timeline(seq) {
  const out = [];
  const idleFor = (n, tag) => {
    for (let i = 0; i < n; i++) out.push({ name: 'idle', idx: (i >> 4) % 3, tag: tag || 'idle' });
  };
  const locoFor = (n, name, stride, spd) => {
    let sp = 0;
    for (let i = 0; i < n; i++) { sp += spd; out.push({ name, idx: Math.floor(sp / stride), tag: name }); }
  };
  const atkFor = (c, chained) => {
    const a = COMBO[c];
    const start = chained ? CHAIN_SKIP : 0;
    const end = chained !== null && c < 2 ? a.cancelAt : a.dur;
    for (let t2 = start; t2 <= end; t2++) out.push({ name: a.name, idx: keyFrame(t2, a.keys), tag: a.name });
  };
  const flowFor = () => {
    COMBO_FLOW.forEach((a, hit) => {
      const start = hit ? CHAIN_SKIP : 0;
      const end = hit < COMBO_FLOW.length - 1 ? a.cancelAt : a.dur;
      for (let t2 = start; t2 <= end; t2++) {
        out.push({
          name: a.name,
          idx: a.frames[Math.min(a.frames.length - 1, keyFrame(t2, a.keys))],
          tag: `hit ${hit + 1}`,
        });
      }
    });
  };
  const superFor = (name, dur, keys) => {
    for (let t2 = 0; t2 <= dur; t2++) {
      out.push({ name, idx: keyFrame(t2, keys), tag: name });
    }
  };
  if (seq === 'combo_power') flowFor();
  else if (seq === 'motorcycle') {
    for (let n = 0; n < motorFrames().length; n++) {
      for (let hold = 0; hold < 12; hold++) out.push({ name: 'motorcycle', idx: n, tag: 'motorcycle' });
    }
  }
  else if (seq === 'meteor_lariat') {
    for (let t2 = 0; t2 <= 70; t2++) out.push({ ...ragnarokPose(t2), tag: 'METEOR LARIAT' });
  }
  else if (seq === 'chain') {
    idleFor(30); locoFor(48, 'walk', WALK_STRIDE, 1.38);
    atkFor(0, false); atkFor(1, true); atkFor(2, true);
    idleFor(30);
  } else if (seq === 'walk') locoFor(96, 'walk', WALK_STRIDE, 1.38);
  else if (seq === 'run') locoFor(96, 'run', RUN_STRIDE, 2.5);
  else if (seq === 'idle') idleFor(120);
  else if (seq === 'walk>jab') { locoFor(40, 'walk', WALK_STRIDE, 1.38); atkFor(0, false); idleFor(20); }
  else {
    // a single state, looped
    const set = SPR[state.char];
    const cnt = (getAIFrame(state.char, seq) || { f: set[seq] || [0] }).f.length;
    for (let i = 0; i < cnt * 8; i++) out.push({ name: seq, idx: (i / 8) | 0, tag: seq });
  }
  return out;
}

function samePose(a, b) { return a && b && a.name === b.name && a.idx === b.idx; }

function poseList(tl) {
  const out = [];
  for (let i = 0; i < tl.length; i++) {
    if (!out.length || !samePose(out[out.length - 1].pose, tl[i])) out.push({ pose: tl[i], tick: i });
  }
  return out;
}

// Step to the next authored drawing, skipping all the game ticks that hold the
// current pose. This is the useful unit for checking hands, feet and continuity.
function moveAnimFrame(dir) {
  const tl = timeline(state.seq);
  if (!tl.length) return;
  state.animPlay = false;
  const start = Math.max(0, Math.min(tl.length - 1, state.animT | 0));
  let i = start;
  do {
    i = (i + dir + tl.length) % tl.length;
  } while (i !== start && samePose(tl[i], tl[start]));
  if (dir < 0) {
    // Land at the beginning of the previous pose's hold, not its last tick.
    while (i > 0 && samePose(tl[i - 1], tl[i])) i--;
  }
  state.animT = i;
}

function drawAnim() {
  setSize(1200, 760);
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, 1200, 760);

  const tl = timeline(state.seq);
  if (state.animPlay) state.animT = (state.animT + 1) % tl.length;
  const i = Math.max(0, Math.min(tl.length - 1, state.animT | 0));
  const cur = tl[i];
  const poses = poseList(tl);
  const poseAt = Math.max(0, poses.findIndex((p, k) =>
    i >= p.tick && (k === poses.length - 1 || i < poses[k + 1].tick)));
  const prev = poses[(poseAt - 1 + poses.length) % poses.length].pose;
  const next = poses[(poseAt + 1) % poses.length].pose;

  const Z = 3, GY = 430, CX = 300;
  const got = frameFor(state.char, cur.name, cur.idx, state.face);
  const f = got.frame;
  const fw = frameW(f), fh = frameH(f);

  checker(60, 120, 480, 330);

  // onion skin: previous and next ghosted, so a pop between poses is obvious
  if (state.onion) {
    for (const [o, col] of [[prev, 0.28], [next, 0.28]]) {
      const g2 = frameFor(state.char, o.name, o.idx, state.face);
      ctx.globalAlpha = col;
      const gw = frameW(g2.frame), gh = frameH(g2.frame);
      ctx.drawImage(g2.frame, CX - gw * Z / 2, GY - gh * Z, gw * Z, gh * Z);
      ctx.globalAlpha = 1;
    }
  }
  ctx.drawImage(f, CX - fw * Z / 2, GY - fh * Z, fw * Z, fh * Z);

  // registration guides: a fixed centre line and the ground line. If the body
  // slides against the centre line between frames, that is the waddle.
  const b = cachedBounds(f);
  ctx.fillStyle = '#3a5a7a';
  ctx.fillRect(CX, 120, 1, 330);
  ctx.fillStyle = '#4a7a4a';
  ctx.fillRect(60, GY, 480, 1);
  if (b) {
    const cx = CX + ((b.minX + b.maxX) / 2 / (f._as || 1) - fw / 2) * Z;
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(cx, 120, 1, 330);            // this frame's body centre
    const fx = cachedFoot(f);
    if (fx != null) {
      ctx.fillStyle = '#ff7a3a';
      ctx.fillRect(CX + (fx / (f._as || 1) - fw / 2) * Z, GY - 6, 2, 12);
    }
  }

  // readout
  let y = 130;
  const line = (str, col) => { label(str, 570, y, col || '#c8c0e0'); y += 14; };
  line(`${state.char}  seq=${state.seq}`, '#ffd94a');
  line(`tick ${i + 1}/${tl.length}   state ${cur.tag}`, '#f8f0e0');
  line(`frame ${cur.name}[${cur.idx}]  ${got.src}  of ${got.count}`);
  line(`file ${f._file || '(code)'}`, '#8a84a0');
  if (b) line(`drawn ${Math.round(b.h / (f._as || 1))}px  feet +${Math.round((f.height - 1 - b.maxY) / (f._as || 1))}`);
  const a = f._file ? anchorOf(f._file) : null;
  line(`anchor dx ${a ? a.dx : 0}  dy ${a ? a.dy : 0}   [arrows nudge, S saves]`, state.dirty ? '#ff7a3a' : '#6f9a6f');
  y += 8;
  line('SPACE play/pause   , . previous/next drawing   O onion', '#8a84a0');

  // Every distinct authored drawing, all at once. This turns the lab into a
  // literal frame-by-frame review surface instead of asking a reviewer to infer
  // an animation from a GIF. The current drawing is picked out in yellow.
  const panelX = 570, panelY = 286, cellW = 145, cellH = 166;
  const pageStart = Math.floor(poseAt / 8) * 8;
  const shown = poses.slice(pageStart, pageStart + 8);
  label(`FRAME-BY-FRAME  ${poseAt + 1}/${poses.length}`, panelX, panelY - 16, '#ffd94a');
  for (let n = 0; n < shown.length; n++) {
    const k = pageStart + n;
    const px = panelX + (n % 4) * cellW;
    const py = panelY + Math.floor(n / 4) * cellH;
    checker(px, py, cellW - 7, cellH - 7);
    ctx.strokeStyle = k === poseAt ? '#ffd94a' : '#3a3048';
    ctx.lineWidth = k === poseAt ? 3 : 1;
    ctx.strokeRect(px + 0.5, py + 0.5, cellW - 8, cellH - 8);
    ctx.lineWidth = 1;
    const item = poses[k].pose;
    const pic = frameFor(state.char, item.name, item.idx, state.face).frame;
    const pw = frameW(pic), ph = frameH(pic);
    const pz = Math.min(1.45, (cellW - 18) / pw, (cellH - 38) / ph);
    ctx.drawImage(pic, px + (cellW - 7 - pw * pz) / 2,
      py + cellH - 28 - ph * pz, pw * pz, ph * pz);
    label(`${k + 1}  ${item.name}[${item.idx}]`, px + 5, py + cellH - 20,
      k === poseAt ? '#ffd94a' : '#8a84a0');
  }

  // --- timeline strip -------------------------------------------------------
  const locomotionReview = state.seq === 'walk' || state.seq === 'run';
  const stripY = locomotionReview ? 470 : 650;
  label('TIMELINE  (real game timing)', 60, stripY - 16, '#8a84a0');
  const tw = Math.max(1, Math.floor(1080 / tl.length));
  for (let k = 0; k < tl.length; k++) {
    const t2 = tl[k];
    // colour by state so the chain segments are visible at a glance
    const col = t2.tag === 'idle' ? '#3a4a5a'
      : t2.tag === 'walk' || t2.tag === 'run' ? '#3a6a4a'
        : t2.tag === 'jab' ? '#8a6a20' : t2.tag === 'hook' ? '#a05a20' : '#b03a20';
    ctx.fillStyle = k === i ? '#ffd94a' : col;
    ctx.fillRect(60 + k * tw, stripY, Math.max(1, tw - 1), 18);
  }
  // segment labels
  let seg = null, segStart = 0;
  for (let k = 0; k <= tl.length; k++) {
    const tag = k < tl.length ? tl[k].tag : null;
    if (tag !== seg) {
      if (seg) label(seg, 60 + segStart * tw, stripY + 22, '#8a84a0');
      seg = tag; segStart = k;
    }
  }

  // --- stride check ---------------------------------------------------------
  // Lay the cycle out with each frame shifted by one stride. If the stride length
  // is right the planted foot of consecutive frames lines up vertically; if it is
  // wrong the feet march apart, which is exactly what foot-slide looks like.
  const locoName = state.seq === 'run' ? 'run' : 'walk';
  const stride = locoName === 'run' ? RUN_STRIDE : WALK_STRIDE;
  const ai = locomotionReview ? getAIFrame(state.char, locoName) : null;
  if (ai) {
    const SY = 700, SZ = 2;
    label(`STRIDE CHECK  ${locoName}  ${stride}px/frame  (orange marks should line up)`, 60, SY - 130, '#8a84a0');
    ctx.fillStyle = '#4a7a4a';
    ctx.fillRect(40, SY, 1130, 1);
    for (let k = 0; k < ai.f.length; k++) {
      const fr = ai.f[k];
      const w = frameW(fr), h = frameH(fr);
      const ox = 90 + k * stride * SZ;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(fr, ox - w * SZ / 2, SY - h * SZ, w * SZ, h * SZ);
      ctx.globalAlpha = 1;
      const fx = cachedFoot(fr);
      if (fx != null) {
        ctx.fillStyle = '#ff7a3a';
        ctx.fillRect(ox + (fx / (fr._as || 1) - w / 2) * SZ, SY - 10, 2, 14);
      }
    }
  }
}

// ---------------------------------------------------------------- CROWD mode
// A background actor can only be judged against the art it stands in front of, at
// the exact spot it stands. This shows one actor at its authored world position over
// the real plate, frame by frame, with the numbers that say whether it belongs:
// how its exposure compares to the wall behind it, how big it is for its depth, and
// whether anything moves between frames that should not.

function labCrowd() { return (STAGES[state.stage].crowd || []); }

// The live actor, rebuilt from the authored entry plus whatever the lab has nudged.
function labActor() {
  const d = labCrowd()[state.actor];
  return d ? labActorFrom(d) : null;
}

function labActorFrom(d) {
  const o = crowdOverrides()[crowdKey(d)] || {};
  return {
    ...d,
    key: crowdKey(d),
    x: o.x === undefined ? d.x : o.x,
    y: o.y === undefined ? d.y : o.y,
    scale: o.scale === undefined ? (d.scale || 1) : o.scale,
    baseFlip: !!d.flip,
    px: o.x === undefined ? d.x : o.x,
    dir: 1, react: 0, phase: 0, shadow: d.shadow === undefined ? 1 : d.shadow,
    patrol: null, cross: null,     // parked, so a frame can be held still
  };
}

// mean luminance and blown-highlight share of whatever is opaque in a region
function toneOf(px) {
  let sum = 0, hot = 0, n = 0, sq = 0;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    sum += l; sq += l * l; if (l > 200) hot++; n++;
  }
  if (!n) return null;
  const m = sum / n;
  return { lum: m, std: Math.sqrt(Math.max(0, sq / n - m * m)), hot: (hot / n) * 100, n };
}

const scratch = mkCanvas(256, 256);
function spriteTone(buf, x0, y0, w, h) {
  // the actor alone, read off a pass where nothing else was drawn
  const g = buf.getContext('2d');
  return toneOf(g.getImageData(x0, y0, Math.max(1, w), Math.max(1, h)).data);
}

// Every actor at once, each over the art it actually stands in front of. One actor at
// a time is the right way to fix one; this is the right way to notice which one needs
// fixing, and to see whether the street reads as a whole.
function drawCrowdGrid() {
  const list = labCrowd();
  const CW = 150 * RS, CH = 108 * RS, Z = 1.5, cols = 4;
  const rows = Math.ceil(list.length / cols);
  setSize(cols * (CW * Z + 6), rows * (CH * Z + 20) + 6);
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, view.width, view.height);
  const buf = stageBuffer();
  const bx = buf.getContext('2d');
  bx.imageSmoothingEnabled = false;
  G.stage = STAGES[state.stage];
  G.rawTime = t; G.time = t;

  list.forEach((d, i) => {
    const o = crowdOverrides()[crowdKey(d)] || {};
    const x = o.x === undefined ? d.x : o.x;
    const y = o.y === undefined ? d.y : o.y;
    const camX = Math.max(0, Math.min(STAGES[state.stage].width - W, x - W / 2));
    bx.setTransform(RS, 0, 0, RS, 0, 0);
    bx.clearRect(0, 0, W, H);
    G.crowd = state.hideActor ? [] : [{ ...labActorFrom(d), patrol: null, cross: null }];
    drawStage(bx, camX);
    if (state.showFG) drawFG(bx, camX);
    const px = (i % cols) * (CW * Z + 6) + 3;
    const py = Math.floor(i / cols) * (CH * Z + 20) + 18;
    ctx.drawImage(buf, Math.round((x - camX) * RS - CW / 2), Math.round(y * RS - CH + 20 * RS),
      CW, CH, px, py, CW * Z, CH * Z);
    ctx.strokeStyle = '#3a3048';
    ctx.strokeRect(px - 0.5, py - 0.5, CW * Z + 1, CH * Z + 1);
    label(`${i + 1}. ${d.kind} @ ${x},${y}`, px, py - 5, i === state.actor ? '#ffd94a' : '#9a90ac');
  });
  readout.innerHTML = `<b>crowd contact sheet</b>  ${list.length} actors, each over the art it ` +
    `stands in front of.  G back to one at a time, H hides them all to see the bare plate.`;
}

function drawCrowdMode() {
  if (state.grid) { drawCrowdGrid(); return; }
  const list = labCrowd();
  const a = labActor();
  const Z = 2, ZOOM = 3;
  // the zoom crop is sized to the actor, not to a fixed box: the whole point is to
  // see this figure and the art immediately around its feet
  const cropW = 150 * RS, cropH = 108 * RS;
  setSize(Math.max(W * Z, cropW * ZOOM * 2 + 24), H * Z + cropH * ZOOM + 46);
  ctx.fillStyle = '#14101c';
  ctx.fillRect(0, 0, view.width, view.height);
  if (!a) {
    label('this stage has no crowd', 20, 30, '#ff7a5a');
    return;
  }

  // park the camera so the actor sits in the middle of the view
  const camX = Math.max(0, Math.min(STAGES[state.stage].width - W, a.x - W / 2));
  const buf = stageBuffer();
  const bx = buf.getContext('2d');
  bx.imageSmoothingEnabled = false;
  G.stage = STAGES[state.stage];
  G.rawTime = state.crowdPlay ? t : state.crowdFrame * 10;
  G.time = G.rawTime;

  // Two passes over the same plate: one without the actor, one with. The empty pass
  // is what tells us whether the plate already paints a stall here - a sprite that
  // brings its own counter lands on top of one and nothing about the sprite alone
  // would show it - and it doubles as the background reading for the tone check.
  const others = state.soloActor ? [] : G.crowd.filter((c) => c.key !== a.key);
  const draw = (withActor) => {
    bx.setTransform(RS, 0, 0, RS, 0, 0);
    bx.clearRect(0, 0, W, H);
    G.crowd = withActor ? [...others, a] : others;
    drawStage(bx, camX);
    if (state.showFG) drawFG(bx, camX);
  };

  draw(false);
  const emptyPlate = mkCanvas(W * RS, H * RS);
  emptyPlate.getContext('2d').drawImage(buf, 0, 0);

  if (!state.hideActor) draw(true);
  ctx.drawImage(buf, 0, 0, W * Z, H * Z);

  // guides: the kerb, the actor's own ground line, and its centre
  const gy = a.y * Z, ax = (a.x - camX) * Z;
  ctx.fillStyle = 'rgba(255,90,120,0.5)';
  ctx.fillRect(0, FLOOR_TOP * Z, W * Z, 1);
  ctx.fillStyle = 'rgba(120,255,180,0.7)';
  ctx.fillRect(ax - 40 * Z, gy, 80 * Z, 1);
  ctx.fillStyle = 'rgba(255,217,74,0.5)';
  ctx.fillRect(ax, 0, 1, H * Z);

  // CHAD at the near lane, for scale. Nothing states an actor's size like the man
  // who has to walk past it.
  const hero = frameFor('player', 'idle', (t / 10 | 0), 1).frame;
  ctx.globalAlpha = 0.85;
  ctx.drawImage(hero, ax + 70 * Z, (FLOOR_TOP - frameH(hero) + 4) * Z,
    frameW(hero) * Z, frameH(hero) * Z);
  ctx.globalAlpha = 1;
  label('CHAD 96px', ax + 70 * Z, (FLOOR_TOP + 6) * Z, '#6a6078');

  // --- zoomed pane -----------------------------------------------------------
  const PY = H * Z + 16;
  const cx0 = Math.round((a.x - camX) * RS - cropW / 2);
  const cy0 = Math.round(a.y * RS - cropH + 20 * RS);   // feet near the bottom edge
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buf, cx0, cy0, cropW, cropH, 0, PY, cropW * ZOOM, cropH * ZOOM);
  ctx.strokeStyle = '#3a3048';
  ctx.strokeRect(0.5, PY + 0.5, cropW * ZOOM, cropH * ZOOM);
  // the same crop of the empty plate beside it: what is actually underneath
  ctx.drawImage(emptyPlate, cx0, cy0, cropW, cropH,
    cropW * ZOOM + 12, PY, cropW * ZOOM, cropH * ZOOM);
  ctx.strokeRect(cropW * ZOOM + 12.5, PY + 0.5, cropW * ZOOM, cropH * ZOOM);
  label('4x  WITH ACTOR', 4, PY - 2, '#8a84a0');
  label('PLATE ONLY  (is there already a stall here?)', cropW * ZOOM + 16, PY - 2, '#8a84a0');

  // --- readout ---------------------------------------------------------------
  // the actor's own pixels, read off a transparent pass so the plate cannot skew it
  const solo = mkCanvas(W * RS, H * RS);
  const sg = solo.getContext('2d');
  sg.imageSmoothingEnabled = false;
  sg.setTransform(RS, 0, 0, RS, 0, 0);
  // no shadow on this pass - it is black, and it would drag the tone reading down
  G.crowd = [{ ...a, shadow: 0 }];
  drawCrowd(sg, camX, null);
  const box = soloBox(solo, a, camX);
  const st = box && toneOf(sg.getImageData(box.x, box.y, box.w, box.h).data);
  // The plate is read through the actor's OWN footprint, not a fixed band. What a
  // figure has to sit against is whatever is directly behind it, and that is not the
  // same thing for a man in a shopfront and a man on the road, most of whose body is
  // still against the facade even though his feet are on the street.
  const bandTone = box && toneOf(emptyPlate.getContext('2d')
    .getImageData(box.x, box.y, box.w, box.h).data);

  const meta = KIND_META[a.kind] || { plane: 'facade', pose: 1 };
  const drawn = box ? Math.round(box.h / RS) : 0;
  const want = expectedHeight(a.kind);
  // A cross-legged tailor is not a short man. Comparing his drawn height straight to
  // CHAD's calls him half size and means nothing; dividing the pose back out gives how
  // tall this person would be standing, which is the number that says whether he reads
  // at the right DEPTH.
  const standing = drawn / meta.pose;
  const planeRatio = standing / HERO_H;
  const wantRatio = PLANES[meta.plane];

  const rows = [];
  const bad = (s) => `<span class="warn">${s}</span>`;
  rows.push(`<b>${a.kind} @ ${a.x},${a.y}</b>  scale ${a.scale.toFixed(2)}  ` +
    `${state.actor + 1}/${list.length}  plane=${meta.plane}  ` +
    `(${a.y <= FLOOR_TOP ? 'behind the kerb' : 'on the road'})`);
  if (st && bandTone) {
    const d = ((st.lum - bandTone.lum) / bandTone.lum) * 100;
    const hotBad = st.hot > 2 && bandTone.hot < 2;
    rows.push(`tone   lum ${st.lum.toFixed(0)} vs the plate behind it ${bandTone.lum.toFixed(0)} ` +
      (Math.abs(d) > 35 ? bad(`(${d > 0 ? '+' : ''}${d.toFixed(0)}% - stands out)`)
        : `(${d > 0 ? '+' : ''}${d.toFixed(0)}%, ok)`) +
      `   blown ${hotBad ? bad(st.hot.toFixed(1) + '%') : st.hot.toFixed(1) + '%'}` +
      `   contrast ${st.std.toFixed(0)} vs ${bandTone.std.toFixed(0)}`);
  }
  rows.push(`size   drawn ${drawn}px / baked ${want}px ` +
    (Math.abs(drawn - want) > 3 ? bad('(art is not the size it was baked to)') : '(ok)') +
    `   standing-equivalent ${planeRatio.toFixed(2)}x CHAD ` +
    (Math.abs(planeRatio - wantRatio) > 0.06
      ? bad(`(want ${wantRatio} on the ${meta.plane} plane)`)
      : `(right for ${meta.plane})`));
  rows.push(`keys   n/p actor   , . frame   space play   H hide actor   ` +
    `J solo   arrows move   [ ] size   S save${state.dirty ? '  ' + bad('UNSAVED') : ''}`);
  readout.innerHTML = rows.join('\n');
}

// Tight bounds of whatever the actor-only pass drew, so the tone reading is taken
// from the figure itself and the size reading is its real drawn height.
function soloBox(cv, a, camX) {
  const g = cv.getContext('2d');
  const x0 = Math.max(0, Math.round((a.x - camX) * RS) - 200);
  const w = Math.min(400, cv.width - x0);
  if (w <= 0) return null;
  const d = g.getImageData(x0, 0, w, cv.height).data;
  let minX = w, maxX = -1, minY = cv.height, maxY = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: x0 + minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// keyboard: step, play, onion, anchor nudge, save
window.addEventListener('keydown', (e) => {
  if (state.mode === 'CROWD') {
    const list = labCrowd();
    const a = labActor();
    let handled = true;
    const nudge = (dx, dy) => { if (a) setOverride(a.key, { x: a.x + dx, y: a.y + dy }); };
    const resize = (d) => {
      if (a) setOverride(a.key, { scale: Math.max(0.4, Math.round((a.scale + d) * 100) / 100) });
    };
    if (e.key === 'n') state.actor = (state.actor + 1) % list.length;
    else if (e.key === 'p') state.actor = (state.actor - 1 + list.length) % list.length;
    else if (e.key === ' ') state.crowdPlay = !state.crowdPlay;
    else if (e.key === ',') { state.crowdPlay = false; state.crowdFrame--; }
    else if (e.key === '.') { state.crowdPlay = false; state.crowdFrame++; }
    else if (e.key === 'h' || e.key === 'H') state.hideActor = !state.hideActor;
    else if (e.key === 'g' || e.key === 'G') state.grid = !state.grid;
    else if (e.key === 'j' || e.key === 'J') state.soloActor = !state.soloActor;
    else if (e.key === 'ArrowLeft') { nudge(-1, 0); state.dirty = true; }
    else if (e.key === 'ArrowRight') { nudge(1, 0); state.dirty = true; }
    else if (e.key === 'ArrowUp') { nudge(0, -1); state.dirty = true; }
    else if (e.key === 'ArrowDown') { nudge(0, 1); state.dirty = true; }
    else if (e.key === '[') { resize(-0.02); state.dirty = true; }
    else if (e.key === ']') { resize(0.02); state.dirty = true; }
    else if (e.key === 's' || e.key === 'S') {
      fetch('/save-crowd', { method: 'POST', body: JSON.stringify(crowdOverrides()) })
        .then(() => { state.dirty = false; })
        .catch(() => {});
    } else handled = false;
    if (handled) e.preventDefault();
    return;
  }
  if (state.mode !== 'ANIM') return;
  const tl = timeline(state.seq);
  const cur = tl[Math.max(0, Math.min(tl.length - 1, state.animT | 0))];
  const got = frameFor(state.char, cur.name, cur.idx, state.face);
  const file = got.frame._file;
  const a = file ? (anchorOf(file) || { dx: 0, dy: 0 }) : null;
  let handled = true;
  if (e.key === ' ') state.animPlay = !state.animPlay;
  else if (e.key === ',') moveAnimFrame(-1);
  else if (e.key === '.') moveAnimFrame(1);
  else if (e.key === 'o' || e.key === 'O') state.onion = !state.onion;
  else if (a && e.key === 'ArrowLeft') { setAnchor(file, a.dx - 1, a.dy); state.dirty = true; }
  else if (a && e.key === 'ArrowRight') { setAnchor(file, a.dx + 1, a.dy); state.dirty = true; }
  else if (a && e.key === 'ArrowUp') { setAnchor(file, a.dx, a.dy - 1); state.dirty = true; }
  else if (a && e.key === 'ArrowDown') { setAnchor(file, a.dx, a.dy + 1); state.dirty = true; }
  else if (e.key === 's' || e.key === 'S') {
    fetch('/save-anchors', { method: 'POST', body: JSON.stringify(allAnchors()) })
      .then(() => { state.dirty = false; })
      .catch(() => {});
  } else handled = false;
  if (handled) {
    e.preventDefault();
    // anchors changed the bitmaps, so drop the derived caches
    if (e.key.startsWith('Arrow')) { boundsCache.clear(); footCache.clear(); reloadFrames(); }
  }
});

let reloading = false;
function reloadFrames() {
  if (reloading) return;
  reloading = true;
  loadAIFrames().then(() => { reloading = false; });
}

function ctl(html) { controls.insertAdjacentHTML('beforeend', html); }

function buildControls() {
  controls.innerHTML = '';
  if (state.mode === 'ANIM') {
    const SEQS = ['combo_power', 'motorcycle', 'meteor_lariat', 'parry_counter', 'chain', 'walk>jab',
      'walk', 'run', 'idle', 'jab', 'hook', 'upper',
      'jumpkick', 'idle_cigar', 'idle_flex', 'hurt', 'down', 'getup'];
    ctl('<h2>sequence</h2><select id="seqSel">' +
      SEQS.map((k) => `<option value="${k}" ${k === state.seq ? 'selected' : ''}>${k}</option>`).join('') +
      '</select>');
    document.getElementById('seqSel').onchange = (e) => { state.seq = e.target.value; state.animT = 0; };
    ctl('<h2>frame controls</h2><div class="tabs">' +
      '<button id="prevFrame">&#9664; FRAME</button>' +
      '<button id="playFrames">PLAY / PAUSE</button>' +
      '<button id="nextFrame">FRAME &#9654;</button></div>');
    document.getElementById('prevFrame').onclick = () => moveAnimFrame(-1);
    document.getElementById('playFrames').onclick = () => { state.animPlay = !state.animPlay; };
    document.getElementById('nextFrame').onclick = () => moveAnimFrame(1);
  }
  if (state.mode === 'ANIM' || state.mode === 'CAST') {
    ctl('<h2>character</h2><select id="charSel">' +
      CAST.map(([k, n]) => `<option value="${k}" ${k === state.char ? 'selected' : ''}>${n} (${k})</option>`).join('') +
      '</select>');
    document.getElementById('charSel').onchange = (e) => { state.char = e.target.value; };
  }
  if (state.mode === 'CROWD') {
    const list = labCrowd();
    ctl('<h2>actor</h2><select id="actSel">' +
      list.map((d, i) => `<option value="${i}" ${i === state.actor ? 'selected' : ''}>` +
        `${i + 1}. ${d.kind} @ ${d.x}</option>`).join('') + '</select>');
    document.getElementById('actSel').onchange = (e) => { state.actor = +e.target.value; };
  }
  if (state.mode === 'STAGE' || state.mode === 'AMBIENCE' || state.mode === 'EFFECTS') {
    ctl('<h2>stage</h2><select id="stageSel">' +
      STAGES.map((s, i) => `<option value="${i}" ${i === state.stage ? 'selected' : ''}>${s.num}. ${s.name}</option>`).join('') +
      '</select>');
    document.getElementById('stageSel').onchange = (e) => { state.stage = +e.target.value; state.camX = 0; };
  }
  if (state.mode === 'STAGE' || state.mode === 'AMBIENCE') {
    const st = STAGES[state.stage];
    ctl(`<h2>camera</h2><input type="range" id="cam" min="0" max="${st.width - W}" value="${state.camX}">`);
    document.getElementById('cam').oninput = (e) => { state.camX = +e.target.value; };
    if (state.mode === 'AMBIENCE') {
      ctl('<h2>reaction</h2><button id="hitStage">TRIGGER HEAVY HIT</button>');
      document.getElementById('hitStage').onclick = () => reactStage(state.camX + W / 2, 1.5);
    }
  }
  if (state.mode === 'CAST' || state.mode === 'SCALE') {
    ctl('<h2>zoom</h2><input type="range" id="zoom" min="1" max="6" value="' + state.zoom + '">');
    document.getElementById('zoom').oninput = (e) => { state.zoom = +e.target.value; boundsCache.clear(); };
  }
  ctl('<h2>options</h2>');
  const toggles = [
    ['playing', 'animate'], ['face', 'face right'], ['forceCode', 'force code sprites'],
    ['showGround', 'ground line'], ['showBox', 'frame box'], ['showGrid', 'stage grid'],
    ['ambience', 'stage ambience'], ['showFG', 'foreground layer'],
  ];
  for (const [k, txt] of toggles) {
    const on = k === 'face' ? state.face === 1 : state[k];
    ctl(`<label><input type="checkbox" data-k="${k}" ${on ? 'checked' : ''}> ${txt}</label>`);
  }
  controls.querySelectorAll('input[type=checkbox]').forEach((el) => {
    el.onchange = () => {
      const k = el.dataset.k;
      if (k === 'face') state.face = el.checked ? 1 : -1;
      else state[k] = el.checked;
    };
  });
  ctl('<h2>anim speed</h2><input type="range" id="spd" min="2" max="20" value="' + state.speed + '">');
  document.getElementById('spd').oninput = (e) => { state.speed = +e.target.value; };

  if (state.mode === 'EFFECTS') {
    ctl('<h2>fire</h2><div class="tabs">' +
      ['spark', 'dust', 'shock', 'ring', 'steam', 'pop'].map((n) => `<button data-fx="${n}">${n}</button>`).join('') +
      '</div>');
    controls.querySelectorAll('button[data-fx]').forEach((b) => {
      b.onclick = () => {
        const x = 160 + (Math.random() * 60 - 30), y = 170;
        const n = b.dataset.fx;
        if (n === 'spark') spawnSpark(x, y - 20);
        if (n === 'dust') spawnDust(x, y, 4);
        if (n === 'shock') spawnShock(x, y);
        if (n === 'ring') spawnRing(x, y - 16, '#ffd94a');
        if (n === 'steam') spawnSteam(x, y, 4);
        if (n === 'pop') spawnPop(x, y - 40, '♂ NICE ♂');
      };
    });
  }
}

function buildTabs() {
  tabs.innerHTML = MODES.map((m) => `<button data-mode="${m}" class="${m === state.mode ? 'on' : ''}">${m}</button>`).join('');
  tabs.querySelectorAll('button').forEach((b) => {
    b.onclick = () => { state.mode = b.dataset.mode; buildTabs(); buildControls(); };
  });
}

// ------------------------------------------------------------------- loop
let lastErr = null;

// One tick, separated from the rAF loop so a sweep can be driven from the console.
// requestAnimationFrame does not fire while the tab is in the background, which makes
// any scripted walk through the actors hang waiting for a redraw that never comes.
function step() {
  t++;
  G.rawTime = t; G.time = t;
  updateAmbience();
  // One throw used to kill the lab outright: the exception skipped the rAF call and
  // the loop simply stopped, leaving the last good frame on screen with no clue why.
  try {
    if (state.mode === 'ANIM') drawAnim();
    else if (state.mode === 'AMBIENCE') drawStageMode();
    else if (state.mode === 'CAST') drawCast();
    else if (state.mode === 'SCALE') drawScale();
    else if (state.mode === 'STAGE') drawStageMode();
    else if (state.mode === 'CONTRAST') drawContrast();
    else drawEffects_();
  } catch (err) {
    if (lastErr !== String(err)) { lastErr = String(err); console.error(state.mode, err); }
    readout.innerHTML = `<span class="warn">${state.mode} threw: ${err}</span>`;
  }
}

function frame() {
  step();
  requestAnimationFrame(frame);
}

G.effects = [];
G.motes = [];
Promise.all([loadAssets(), loadAIFrames(), loadFG(), loadAmbience(), loadStory()]).then(() => {
  initStage(0);
  buildTabs();
  buildControls();
  window.LAB.step = step;
  window.LAB.readout = () => readout.textContent;
  frame();
});
