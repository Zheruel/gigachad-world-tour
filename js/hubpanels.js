import { hasCleared } from './progress.js';
import { trophyForStage } from './trophies.js';
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
import { musicGroups, trackOpen, drawCassette, saveTracks } from './music_library.js';

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
// X (the prompts' key) closes a panel; ESC, C and Backspace also do. ESC is pause elsewhere and main.js skips
// the pause toggle while a panel is up, so the two can never both fire on one press.
const cancel = () => input.pressed('back') || input.pressed('pause')
  || input.pressed('parry') || input.pressed('jump');

export function openPanel(id) {
  G.hubPanel = id;
  G.hubAct = 0;
  if (id === 'hifi') {
    // open on what the room is playing, and show NEW on what arrived since the last visit
    const at = jukeboxList().findIndex((t) => t.slot === playingSlot());
    G.hubAct = Math.max(0, at);
    G.jukeboxFresh = G.tracksUnseen.slice();
    if (G.tracksUnseen.length) { G.tracksUnseen = []; saveTracks(); }
  }
  if (id === 'map') {
    // land on the newest unlocked chapter and its newest unlocked act - that is
    // almost always the one you came back to the lair to play
    G.hubChapter = Math.max(0, CHAPTERS.findLastIndex((c) => !chapterLocked(c)));
    G.hubAct = Math.max(0, unlockedCount(CHAPTERS[G.hubChapter]) - 1);
  }
  G.audio.sfx('blip');
}

export function closePanel() {
  // Nothing to restore. The jukebox does not preview any more - picking a track SETS what
  // the room plays, so it keeps playing when the panel closes and after you leave and come
  // back. G.hubTrack is what main.js asks for instead of the stage's own slot.
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
  const list = jukeboxList();
  if (!list.length) return;
  G.hubAct = clamp(G.hubAct, 0, list.length - 1);
  // up/down walk the tracks (the headers are not stops); left/right jump a whole place
  let next = clamp(G.hubAct + stepY(), 0, list.length - 1);
  const dx = stepX();
  if (dx) {
    const g = list[G.hubAct].group, first = list.findIndex((t) => t.group === g);
    if (dx < 0) next = G.hubAct > first ? first : Math.max(0, list.findIndex((t) => t.group === list[Math.max(0, first - 1)].group));
    else { const after = list.findIndex((t, i) => i > G.hubAct && t.group !== g); if (after >= 0) next = after; }
  }
  if (next !== G.hubAct) { G.hubAct = next; G.audio.sfx('blip'); }
  if (input.pressed('attack')) {
    const t = list[G.hubAct];
    if (!trackOpen(t)) { G.shakePoster = 12; G.audio.sfx('whiff'); return; }
    G.hubTrack = t.slot;
    audio.play(G.hubTrack);
  }
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
  if(title==='WORLD TOUR')drawDisplayTitle(ctx,title,W/2,15,{height:17,maxWidth:215});
  else drawTextShadow(ctx, title, (W - textWidth(title, 2)) / 2, 22, '#ffd94a', 2);
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
    'Z  START     X  BACK     ARROWS  CHOOSE', 0);

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
// Names, groups and locks live in js/music_library.js. The cursor walks tracks only; the
// rows (a header per place, then its tracks) scroll to keep it in view.
const jukeboxList = () => musicGroups().flatMap((g) => g.tracks);
// G.stage IS the lair while this panel is up, so its own slot is the default. Importing
// it from hub.js would be a cycle - hub.js imports this file.
const playingSlot = () => G.hubTrack || (G.stage && G.stage.music);
const JB_X = 20, JB_R = 290, JB_TOP = 52, JB_ROW = 11, JB_VIS = 15;

function jukeboxRows() {
  const rows = [];
  let n = 0;
  for (const g of musicGroups()) {
    rows.push({ head: g });
    for (const t of g.tracks) rows.push({ track: t, n: n++ });
  }
  return rows;
}

function drawJukebox(ctx) {
  panelFrame(ctx, 'SOUND TEST', 'CHAD PICKS THE TRACK', 'Z  SET     ARROWS  CHOOSE     X  BACK');
  const rows = jukeboxRows(), list = jukeboxList();
  const playing = playingSlot();
  const cur = rows.findIndex((r) => r.track && r.n === G.hubAct);
  // centred on the cursor, so the header above the first track of a place stays in view
  const maxTop = Math.max(0, rows.length - JB_VIS);
  const top = clamp(cur - (JB_VIS >> 1), 0, maxTop);
  const fresh = G.jukeboxFresh || [];

  rows.slice(top, top + JB_VIS).forEach((r, i) => {
    const y = JB_TOP + i * JB_ROW;
    if (r.head) {
      const g = r.head, open = g.tracks.filter(trackOpen).length;
      drawTextShadow(ctx, g.title, JB_X, y, '#d838a0', 1);
      const count = open + '/' + g.tracks.length;
      const cx = JB_R - textWidth(count, 1);
      drawTextShadow(ctx, count, cx, y, open === g.tracks.length ? '#3adc8a' : '#8a82a0', 1);
      ctx.fillStyle = 'rgba(216,56,160,0.35)';
      ctx.fillRect(JB_X + textWidth(g.title, 1) + 5, y + 2, cx - JB_X - textWidth(g.title, 1) - 10, 1);
      return;
    }
    const t = r.track, on = r.n === G.hubAct, open = trackOpen(t), isPlaying = open && t.slot === playing;
    const wob = (on && G.shakePoster > 0) ? ((G.rawTime & 1) ? 2 : -2) : 0;
    const x = JB_X + 6 + wob;
    if (on) {
      ctx.fillStyle = G.shakePoster > 0 ? 'rgba(216,40,56,0.3)' : 'rgba(255,217,74,0.14)';
      ctx.fillRect(JB_X, y - 3, JB_R - JB_X + 4, JB_ROW);
      drawText(ctx, '>', x - 4, y, open ? '#ffd94a' : '#d82838', 1);
    }
    drawText(ctx, String(r.n + 1).padStart(2, '0'), x + 4, y, open ? '#8ad8ff' : '#4a4658', 1);
    // the one the room is set to, so the panel says what is playing rather than only what
    // the cursor is over - the two are different as soon as you move the cursor off it
    if (isPlaying) drawText(ctx, '*', x + 16, y, '#3adc8a', 1);
    drawText(ctx, open ? t.name : '??????', x + 24, y,
      isPlaying ? '#3adc8a' : !open ? '#6a6478' : (on ? '#f8f0e0' : '#a89ec0'), 1);
    let tag = null, col = '#6a6478';
    if (!open) tag = t.hint || t.group.place;
    else if (fresh.includes(t.slot) && ((G.rawTime >> 4) & 1)) { tag = 'NEW'; col = '#ff7a3a'; }
    else if (fresh.includes(t.slot)) { tag = 'NEW'; col = '#ffd94a'; }
    if (tag) drawText(ctx, tag, JB_R - textWidth(tag, 1) + wob, y, col, 1);
  });
  // more above / below
  ctx.fillStyle = '#d838a0';
  const ax = JB_R - 2;
  if (top > 0) for (let i = 0; i < 3; i++) ctx.fillRect(ax - i, JB_TOP - 6 + i, i * 2 + 1, 1);
  if (top < maxTop) for (let i = 0; i < 3; i++) ctx.fillRect(ax - i, JB_TOP + JB_VIS * JB_ROW - 2 - i, i * 2 + 1, 1);

  // the deck: what is on, whatever the cursor is over
  ctx.fillStyle = 'rgba(138,130,160,0.22)';
  ctx.fillRect(300, 50, 1, 170);
  const now = list.find((t) => t.slot === playing);
  const cx = 386;
  drawCassette(ctx, cx - 60, 56, 120, now ? now.name : '', G.rawTime, !!now);
  const lines = [['NOW PLAYING', '#8a82a0'], [now ? now.name : '-', '#ffd94a'], [now ? now.group.title : '', '#8ad8ff']];
  lines.forEach(([s, col], i) => drawTextShadow(ctx, s, cx - textWidth(s, 1) / 2, 140 + i * 10, col, 1));
  const opened = list.filter(trackOpen).length;
  const tally = 'COLLECTED ' + opened + '/' + list.length;
  drawTextShadow(ctx, tally, cx - textWidth(tally, 1) / 2, 176, opened === list.length ? '#3adc8a' : '#a89ec0', 1);

  // a bank of VU bars, so the panel does something while a track plays
  const vx = cx - 57;
  for (let i = 0; i < 20; i++) {
    const h = 2 + Math.abs(Math.sin(G.rawTime * 0.07 + i * 0.7)) * 22
      * (0.4 + Math.abs(Math.sin(G.rawTime * 0.013 + i)) * 0.6);
    for (let s = 0; s < h; s += 3) {
      ctx.fillStyle = s > 17 ? '#ff4a4a' : (s > 11 ? '#ffd94a' : '#3adc8a');
      ctx.fillRect(vx + i * 6, 218 - s, 4, 2);
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
  panelFrame(ctx, 'TROPHY WALL', 'ONE LEVEL. ONE TROPHY.', 'ARROWS  BROWSE     X  BACK');

  // filmstrip of small cards, the selected one blown up below
  const cw = 44, gap = 6;
  const total = GALLERY.length * (cw + gap) - gap;
  GALLERY.forEach((entry, i) => {
    const b = BOSSES[entry.k];
    const beat = hasCleared(G, entry.act);
    const on = i === G.hubAct;
    const x = Math.round((W - total) / 2 + i * (cw + gap));
    ctx.fillStyle = '#05040a';
    ctx.fillRect(x - 2, 54, cw + 4, 56);
    const g = ctx.createLinearGradient(0, 56, 0, 108);
    g.addColorStop(0, beat ? 'rgba(96,196,255,0.85)' : 'rgba(58,60,78,0.9)');
    g.addColorStop(1, beat ? '#141e3c' : '#0e0e16');
    ctx.fillStyle = g;
    ctx.fillRect(x, 56, cw, 52);
    const trophy = trophyForStage(STAGES[entry.act]);
    const img = ASSETS[trophy?.detail] || (SPR[b.set] && getFrame(SPR[b.set], 'idle', 0, 1));
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
  const trophy = trophyForStage(STAGES[entry.act]);
  const beat = hasCleared(G, entry.act);
  const name = beat ? trophy?.name || b.name : 'UNKNOWN';
  drawTextShadow(ctx, name, (W - textWidth(name, 2)) / 2, 120, beat ? '#ffd94a' : '#6a6478', 2);
  const title = beat ? (trophy ? b.name + ' DEFEATED' : b.title) : 'NOT YET BEATEN';
  drawTextShadow(ctx, title, (W - textWidth(title, 1)) / 2, 136, '#8ad8ff', 1);
  if (beat) {
    const q = trophy?.description || '"' + b.taunt + '"';
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

  // the totals the records screen carried, on one line.
  // Counted off actBest, which only gets an entry when an act is CLEARED. Deriving it from
  // the unlock count could never reach the last act, because unlockedStage is capped at
  // STAGES.length - 1 - a finished game read CLEARED 4/5.
  const cleared = STAGES.filter((_, i) => hasCleared(G, i)).length;
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
import { drawDisplayTitle } from './display_type.js';
