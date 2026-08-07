// hubpanels.js - the screens the lair fixtures open. One panel per fixture id, all
// driven off G.hubPanel / G.hubAct so js/hub.js only has to say which one is up.
//
// This lives apart from hub.js because hub.js is the room - the wall, the fixtures,
// the light - and these are menus. They share nothing but G, which is also why the
// chapter list lives here: it is the map panel's data, not the room's.
import { G, W, H, clamp } from './engine.js';
import { drawText, drawTextShadow, textWidth, blit, frameW, frameH, getFrame, SPR } from './sprites.js';
import { STAGES } from './stages.js';
import { BOSSES } from './bosses.js';
import { ASSETS } from './assets.js';
import { input } from './input.js';
import { audio } from './audio.js';

// ------------------------------------------------------------------ chapters
// Chapters are grouped off the "1-3" style stage numbers, so adding a 2-1 stage to
// STAGES puts a second pin on the map with no edit here beyond its CHAPTER_META row.
// pin is in logical panel coordinates over assets/lair/map_panel.png (480x270).
const CHAPTER_META = {
  '1': { title: 'INDIA', sub: 'OLD DELHI', pin: [346, 122] },
  '2': { title: 'JAPAN', sub: 'NEO SHINJUKU', pin: [400, 104] },
  '3': { title: 'BRAZIL', sub: 'RIO FAVELAS', pin: [156, 176] },
  '4': { title: 'USA', sub: 'DOWNTOWN LA', pin: [72, 92] },
  '5': { title: 'RUSSIA', sub: 'THE IRON YARD', pin: [300, 74] },
};

function buildChapters() {
  const out = [];
  STAGES.forEach((s, i) => {
    const key = String(s.num).split('-')[0];
    let c = out.find((ch) => ch.key === key);
    if (!c) {
      const meta = CHAPTER_META[key] || {};
      c = {
        key, title: meta.title || 'CHAPTER ' + key, sub: meta.sub || '',
        pin: meta.pin || [40 + out.length * 60, 140], acts: [],
      };
      out.push(c);
    }
    c.acts.push(i);
  });
  return out;
}

export const CHAPTERS = buildChapters();

const actLocked = (stageIndex) => stageIndex > G.unlockedStage;
const chapterLocked = (c) => actLocked(c.acts[0]);
const unlockedCount = (c) => c.acts.filter((i) => !actLocked(i)).length;

// ---------------------------------------------------------------- open/close
const cancel = () => input.pressed('back') || input.pressed('parry') || input.pressed('jump');

export function openPanel(id) {
  G.hubPanel = id;
  G.hubAct = 0;
  if (id === 'map') {
    // land on the newest unlocked chapter and its newest unlocked act - that is
    // almost always the one you came back to the lair to play
    G.hubChapter = Math.max(0, CHAPTERS.findLastIndex((c) => !chapterLocked(c)));
    G.hubAct = Math.max(0, unlockedCount(CHAPTERS[G.hubChapter]) - 1);
  }
  G.audio.sfx('blip');
}

export function closePanel() {
  if (G.hubPanel === 'hifi') audio.music('title');
  G.hubPanel = null;
  G.audio.sfx('blip');
}

// -------------------------------------------------------------------- update
// Returns the global stage index the player just committed to, or -1. Only the map
// panel can ever return one.
export function updateHubPanel() {
  if (G.shakePoster > 0) G.shakePoster--;
  if (cancel()) { closePanel(); return -1; }
  switch (G.hubPanel) {
    case 'map': return updateMap();
    case 'hifi': updateJukebox(); return -1;
    case 'trophies': updateGallery(); return -1;
  }
  return -1;
}

const stepY = () => (input.pressed('down') ? 1 : 0) - (input.pressed('up') ? 1 : 0);
const stepX = () => (input.pressed('right') ? 1 : 0) - (input.pressed('left') ? 1 : 0);

function updateMap() {
  const dx = stepX();
  if (dx && CHAPTERS.length > 1) {
    const next = clamp(G.hubChapter + dx, 0, CHAPTERS.length - 1);
    if (next !== G.hubChapter) {
      G.hubChapter = next;
      G.hubAct = Math.max(0, unlockedCount(CHAPTERS[next]) - 1);
      G.audio.sfx('blip');
    }
  }
  const acts = CHAPTERS[G.hubChapter].acts;
  const dy = stepY();
  if (dy) {
    const next = clamp(G.hubAct + dy, 0, acts.length - 1);
    if (next !== G.hubAct) { G.hubAct = next; G.audio.sfx('blip'); }
  }
  if (input.pressed('attack')) {
    const stageIndex = acts[G.hubAct];
    if (actLocked(stageIndex)) {
      G.shakePoster = 12;
      G.audio.sfx('whiff');
      return -1;
    }
    G.hubPanel = null;
    return stageIndex;
  }
  return -1;
}

function updateJukebox() {
  const list = audio.tracks();
  // the list runs down one column then down the next, so left/right is a column jump
  const d = stepY() + stepX() * JB_ROWS;
  if (d) {
    const next = clamp(G.hubAct + d, 0, list.length - 1);
    if (next !== G.hubAct) { G.hubAct = next; G.audio.sfx('blip'); }
  }
  if (input.pressed('attack') && list.length) audio.preview(list[G.hubAct]);
}

function updateGallery() {
  const d = stepX() || stepY();
  if (d) {
    const next = clamp(G.hubAct + d, 0, GALLERY.length - 1);
    if (next !== G.hubAct) { G.hubAct = next; G.audio.sfx('blip'); }
  }
}

// ---------------------------------------------------------------------- draw
// One frame for every panel: the scrim, the rules, the heading and the key legend.
// Body is drawn between the rules by the caller.
function panelFrame(ctx, title, sub, legend, scrimA) {
  ctx.fillStyle = `rgba(6,4,10,${scrimA === undefined ? 0.88 : scrimA})`;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d838a0';
  ctx.fillRect(0, 44, W, 1);
  ctx.fillRect(0, 226, W, 1);
  drawTextShadow(ctx, title, (W - textWidth(title, 2)) / 2, 22, '#ffd94a', 2);
  if (sub) drawTextShadow(ctx, sub, (W - textWidth(sub, 1)) / 2, 35, '#8ad8ff', 1);
  if ((G.rawTime >> 4) & 1) drawTextShadow(ctx, legend, (W - textWidth(legend, 1)) / 2, 234, '#f8f0e0', 1);
}

// Horizontal band sweeping down the screen, the one thing that sells a CRT.
function scanlines(ctx, x, y, w, h, speed) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = y; i < y + h; i += 2) ctx.fillRect(x, i, w, 1);
  const sy = y + ((G.rawTime * speed) % (h + 24)) - 12;
  const g = ctx.createLinearGradient(0, sy - 10, 0, sy + 10);
  g.addColorStop(0, 'rgba(140,220,255,0)');
  g.addColorStop(0.5, 'rgba(140,220,255,0.10)');
  g.addColorStop(1, 'rgba(140,220,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x, sy - 10, w, 20);
  ctx.restore();
}

export function drawHubPanel(ctx) {
  switch (G.hubPanel) {
    case 'map': drawMap(ctx); break;
    case 'hifi': drawJukebox(ctx); break;
    case 'trophies': drawGallery(ctx); break;
  }
}

// ------------------------------------------------------------------ map panel
// The act list is a callout beside the selected pin rather than a fixed column: a
// column wide enough for the act names covers most of Asia, which is where the pins
// are. It flips to whichever side of the pin has room.
const CARD_W = 152;

function drawMap(ctx) {
  const bg = ASSETS.lair_map_panel;
  if (bg) blit(ctx, bg, 0, 0);
  else { ctx.fillStyle = '#05070f'; ctx.fillRect(0, 0, W, H); }
  scanlines(ctx, 0, 0, W, H, 0.35);
  // the heading and the legend need something to sit on
  ctx.fillStyle = 'rgba(6,4,10,0.72)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillRect(0, 227, W, H - 227);
  panelFrame(ctx, 'WORLD TOUR', 'CHOOSE YOUR GROUND',
    'Z  START     ESC  BACK     ARROWS  CHOOSE', 0);

  const c = CHAPTERS[G.hubChapter];
  const cardH = 32 + c.acts.length * 15;
  const [selX, selY] = c.pin;
  const cardX = selX < W / 2 ? selX + 14 : selX - 14 - CARD_W;
  const cardY = clamp(selY - cardH / 2, 50, 222 - cardH);

  CHAPTERS.forEach((ch, i) => {
    const [px, py] = ch.pin;
    const locked = chapterLocked(ch);
    const on = i === G.hubChapter;
    const col = locked ? '#6a6478' : (on ? '#ffd94a' : '#8ad8ff');
    if (on) {
      ctx.strokeStyle = locked ? 'rgba(216,40,56,0.7)' : 'rgba(255,217,74,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px + 0.5, py + 0.5, 5 + 3 + Math.sin(G.rawTime * 0.18) * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,217,74,0.45)';
      ctx.beginPath();
      ctx.moveTo(px + 0.5, py + 0.5);
      ctx.lineTo(cardX < px ? cardX + CARD_W : cardX, cardY + 8.5);
      ctx.stroke();
    }
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(px - 3, py - 3, 7, 7);
    ctx.fillStyle = col;
    ctx.fillRect(px - 2, py - 2, 5, 5);
    ctx.fillStyle = '#f8f0e0';
    ctx.fillRect(px - 1, py - 1, 2, 2);
    if (!on) {
      const t = locked ? '???' : ch.title;
      drawTextShadow(ctx, t, px - textWidth(t, 1) / 2, py + 6, col, 1);
    }
  });

  const locked = chapterLocked(c);
  ctx.fillStyle = 'rgba(6,4,10,0.94)';
  ctx.fillRect(cardX, cardY, CARD_W, cardH);
  ctx.fillStyle = locked ? '#6a6478' : '#d838a0';
  ctx.fillRect(cardX, cardY, CARD_W, 1);
  ctx.fillRect(cardX, cardY + cardH - 1, CARD_W, 1);
  ctx.fillRect(cardX, cardY, 1, cardH);
  ctx.fillRect(cardX + CARD_W - 1, cardY, 1, cardH);

  drawTextShadow(ctx, locked ? '???' : c.title, cardX + 6, cardY + 5, locked ? '#6a6478' : '#ffd94a', 2);
  if (c.sub && !locked) drawTextShadow(ctx, c.sub, cardX + 6, cardY + 18, '#8ad8ff', 1);
  const prog = unlockedCount(c) + '/' + c.acts.length;
  drawTextShadow(ctx, prog, cardX + CARD_W - 6 - textWidth(prog, 1), cardY + 6, '#ffd94a', 1);

  c.acts.forEach((stageIndex, n) => {
    const st = STAGES[stageIndex];
    const lk = actLocked(stageIndex);
    const on = n === G.hubAct;
    const y = cardY + 30 + n * 15;
    const wob = (on && G.shakePoster > 0) ? ((G.rawTime & 1) ? 2 : -2) : 0;
    if (on) {
      ctx.fillStyle = G.shakePoster > 0 ? 'rgba(216,40,56,0.3)' : 'rgba(255,217,74,0.16)';
      ctx.fillRect(cardX + 2, y - 3, CARD_W - 4, 13);
      drawText(ctx, '>', cardX + 4 + wob, y, lk ? '#d82838' : '#ffd94a', 1);
    }
    drawText(ctx, st.num, cardX + 14 + wob, y, lk ? '#4a4658' : '#8ad8ff', 1);
    drawText(ctx, lk ? '???' : st.name, cardX + 40 + wob, y,
      lk ? '#6a6478' : (on ? '#f8f0e0' : '#a89ec0'), 1);
  });

  const sel = c.acts[G.hubAct];
  const note = actLocked(sel) ? 'LOCKED - CLEAR THE ACT BEFORE IT' : STAGES[sel].sub;
  drawTextShadow(ctx, note, (W - textWidth(note, 1)) / 2, 218,
    actLocked(sel) ? '#8a8296' : '#c8c0e0', 1);
}

// -------------------------------------------------------------- jukebox panel
// Names for the chiptunes in js/audio.js SONGS; the slot ids are positional.
const TRACK_NAMES = {
  title: 'THE LAIR', stage1: 'CHANDNI CHOWK RUN', boss: 'NO REFUNDS',
  stage2: 'THE DUNGEON', boss2: 'VAN DARKHOLME',
  stage3: 'THE LOCKER ROOM', boss3: 'MARK WOLFF',
  stage4: 'THE OIL PIT', boss4: 'JIRKA KALVODA',
  stage5: 'THE ARENA', boss5: 'NINO BACCI',
  ending: 'VICTORY',
};
const JB_ROWS = 6;

function drawJukebox(ctx) {
  panelFrame(ctx, 'SOUND TEST', 'CHAD PICKS THE TRACK', 'Z  PLAY     ESC  BACK');
  const list = audio.tracks();
  list.forEach((slot, i) => {
    const on = i === G.hubAct;
    const cx = 26 + ((i / JB_ROWS) | 0) * 220;
    const y = 58 + (i % JB_ROWS) * 17;
    if (on) {
      ctx.fillStyle = 'rgba(255,217,74,0.14)';
      ctx.fillRect(cx - 4, y - 4, 190, 15);
      drawText(ctx, '>', cx - 2, y, '#ffd94a', 1);
    }
    drawText(ctx, String(i + 1).padStart(2, '0'), cx + 10, y, '#8ad8ff', 1);
    drawText(ctx, TRACK_NAMES[slot] || slot.toUpperCase(), cx + 32, y, on ? '#f8f0e0' : '#a89ec0', 1);
  });

  // a bank of VU bars, so the panel does something while a track plays
  const cx = W / 2 - 60;
  for (let i = 0; i < 24; i++) {
    const h = 2 + Math.abs(Math.sin(G.rawTime * 0.07 + i * 0.7)) * 22
      * (0.4 + Math.abs(Math.sin(G.rawTime * 0.013 + i)) * 0.6);
    for (let s = 0; s < h; s += 3) {
      ctx.fillStyle = s > 17 ? '#ff4a4a' : (s > 11 ? '#ffd94a' : '#3adc8a');
      ctx.fillRect(cx + i * 5, 218 - s, 3, 2);
    }
  }
}

// -------------------------------------------------------------- gallery panel
// In the order you fight them, not the order they happen to be declared in.
const GALLERY = Object.keys(BOSSES)
  .map((k) => ({ k, act: STAGES.findIndex((s) => s.boss === k) }))
  .filter((b) => b.act >= 0)
  .sort((a, b) => a.act - b.act);

function drawGallery(ctx) {
  panelFrame(ctx, 'TROPHY WALL', 'EVERY MAN CHAD PUT DOWN', 'ARROWS  BROWSE     ESC  BACK');

  // filmstrip of small cards, the selected one blown up below
  const cw = 44, gap = 6;
  const total = GALLERY.length * (cw + gap) - gap;
  GALLERY.forEach((entry, i) => {
    const b = BOSSES[entry.k];
    const beat = entry.act < G.unlockedStage;
    const on = i === G.hubAct;
    const x = Math.round((W - total) / 2 + i * (cw + gap));
    ctx.fillStyle = '#05040a';
    ctx.fillRect(x - 2, 54, cw + 4, 56);
    const g = ctx.createLinearGradient(0, 56, 0, 108);
    g.addColorStop(0, beat ? 'rgba(96,196,255,0.85)' : 'rgba(58,60,78,0.9)');
    g.addColorStop(1, beat ? '#141e3c' : '#0e0e16');
    ctx.fillStyle = g;
    ctx.fillRect(x, 56, cw, 52);
    const img = SPR[b.set] && getFrame(SPR[b.set], 'idle', 0, 1);
    if (img) {
      const s = Math.min((cw - 6) / frameW(img), 48 / frameH(img));
      const dw = Math.round(frameW(img) * s), dh = Math.round(frameH(img) * s);
      ctx.save();
      if (!beat) ctx.filter = 'brightness(0)';
      ctx.drawImage(img, 0, 0, img.width, img.height,
        Math.round(x + cw / 2 - dw / 2), Math.round(106 - dh), dw, dh);
      ctx.restore();
    }
    ctx.fillStyle = on ? '#ffd94a' : '#3a3a4a';
    ctx.fillRect(x - 2, 53, cw + 4, 1);
    ctx.fillRect(x - 2, 109, cw + 4, 1);
    ctx.fillRect(x - 2, 53, 1, 57);
    ctx.fillRect(x + cw + 1, 53, 1, 57);
  });

  const entry = GALLERY[G.hubAct];
  const b = BOSSES[entry.k];
  const beat = entry.act < G.unlockedStage;
  const name = beat ? b.name : 'UNKNOWN';
  drawTextShadow(ctx, name, (W - textWidth(name, 2)) / 2, 120, beat ? '#ffd94a' : '#6a6478', 2);
  const title = beat ? b.title : 'NOT YET BEATEN';
  drawTextShadow(ctx, title, (W - textWidth(title, 1)) / 2, 136, '#8ad8ff', 1);
  if (beat) {
    const q = '"' + b.taunt + '"';
    drawTextShadow(ctx, q, (W - textWidth(q, 1)) / 2, 154, '#c8c0e0', 1);
    const st = STAGES[entry.act];
    const where = st.num + '  ' + st.name;
    drawTextShadow(ctx, where, (W - textWidth(where, 1)) / 2, 172, '#a89ec0', 1);
    // The act's own best used to live on the arcade cabinet's records screen. It belongs
    // next to the man you beat to set it, not on a separate menu.
    const bounty = 'BOUNTY ' + String(b.score).padStart(6, '0');
    const best = G.actBest[entry.act] || 0;
    const yours = 'YOUR BEST ' + (best ? String(best).padStart(7, '0') : '-------');
    const gap = 16;
    const left = (W - textWidth(bounty, 1) - textWidth(yours, 1) - gap) / 2;
    drawTextShadow(ctx, bounty, left, 190, '#ff7a3a', 1);
    drawTextShadow(ctx, yours, left + textWidth(bounty, 1) + gap, 190, best ? '#f8f0e0' : '#4a4658', 1);
  }

  // the totals the records screen carried, on one line
  const cleared = Math.max(0, CHAPTERS.reduce((n, c) => n + unlockedCount(c), 0) - 1);
  ctx.fillStyle = 'rgba(138,130,160,0.22)';
  ctx.fillRect(60, 204, W - 120, 1);
  const totals = [['HI-SCORE', String(G.hiscore).padStart(8, '0'), '#ffd94a'],
    ['BEST COMBO', G.bestComboAll + ' HITS', '#ff7a3a'],
    ['CLEARED', cleared + '/' + STAGES.length, '#8ad8ff']];
  const cell = (W - 40) / 3;
  totals.forEach(([label, value, col], i) => {
    const cx = 20 + cell * i + cell / 2;
    drawTextShadow(ctx, label, cx - textWidth(label, 1) / 2, 209, '#8a82a0', 1);
    drawTextShadow(ctx, value, cx - textWidth(value, 1) / 2, 217, col, 1);
  });
}
