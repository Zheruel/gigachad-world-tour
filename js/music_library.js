// music_library.js - every piece of music the game plays, grouped by where you hear it,
// and which of it CHAD has heard. The lair's SOUND TEST (js/hubpanels.js) lists it; main.js
// hands audio.watchMusic() to hearTrack, so a stage's music unlocks the first time the game
// actually plays it. The lair's own tracks are always open.
import { G, W, clamp } from './engine.js';
import { STAGES } from './stages.js';
import { audio } from './audio.js';
import { drawText, drawTextShadow, textWidth } from './sprites.js';

// In play order inside each place. `home` is a stage id (not an act number, the order of
// STAGES can change); null is the lair's, never locked. Boss themes carry the boss's
// title, never his name, so a locked row gives nothing away when it unlocks either.
const CATALOG = [
  { slot: 'lair', name: 'NEON SHADOWS', home: null },
  { slot: 'lobby', name: 'MARBLE LOBBY HUSTLE', home: null },
  { slot: 'title', name: 'CIGAR SKYLINE', home: null },
  { slot: 'train_a', name: 'PLATFORM ONE', home: 'train' },
  { slot: 'train_b', name: 'THE 22:40 TO DELHI', home: 'train' },
  { slot: 'train_boss', name: 'EVERYONE HAS A PRICE', home: 'train' },
  { slot: 'delhi_a', name: 'CHANDNI CHOWK RUN', home: 'delhi' },
  { slot: 'delhi_vendor', name: 'YOU BREAK IT, YOU BUY IT', home: 'delhi' },
  { slot: 'delhi_b', name: 'THE RIVER ANSWERS', home: 'delhi' },
  { slot: 'delhi_boss', name: 'WHAT EATS THE RIVER', home: 'delhi' },
  { slot: 'refund_a', name: 'ESCALATION', home: 'refund' },
  { slot: 'refund_boss', name: 'FINAL ESCALATION', home: 'refund' },
  { slot: 'ending', name: 'VICTORY LAP', home: 'refund', hint: 'THE ENDING' },
];

// What a stage can ask audio.music() for. The ending theme follows the finale's clear.
export const stageSlots = (st) =>
  [st.music, st.musicB, ...Object.values(st.minibossMusic || {}), st.bossMusic, st.final && 'ending'].filter(Boolean);

// A slot a stage names that the catalog has not caught up with still lists, under the
// first stage that plays it, by its slot id.
function catalog() {
  const known = new Set(CATALOG.map((t) => t.slot)), extra = [];
  for (const st of STAGES) for (const slot of stageSlots(st)) {
    if (!known.has(slot)) { known.add(slot); extra.push({ slot, name: slot.toUpperCase(), home: st.id }); }
  }
  return [...CATALOG, ...extra];
}

G.tracksHeard ||= [];
G.tracksNew ||= [];
G.tracksUnseen ||= [];

const place = (st) => st.name.replace(/^THE /, '');

// Only slots that make a sound are listed (a slot with neither an mp3 nor a chiptune
// plays nothing - audio.tracks() already knows which those are).
export function musicGroups() {
  const playable = new Set(audio.tracks());
  const all = catalog().filter((t) => playable.has(t.slot)).map((t) => ({ ...t }));
  const groups = [{ id: 'lair', title: 'THE LAIR', place: 'THE LAIR', tracks: all.filter((t) => !t.home) }];
  for (const st of STAGES) {
    const tracks = all.filter((t) => t.home === st.id);
    if (tracks.length) groups.push({ id: st.id, title: st.num + '  ' + st.name, place: place(st), tracks });
  }
  const homeless = all.filter((t) => t.home && !STAGES.some((st) => st.id === t.home));
  if (homeless.length) groups.push({ id: 'extra', title: 'EXTRAS', place: 'THE TOUR', tracks: homeless });
  for (const g of groups) for (const t of g.tracks) t.group = g;
  return groups;
}

export const trackOpen = (t) => !t.home || G.tracksHeard.includes(t.slot);
export const trackInfo = (slot) => musicGroups().flatMap((g) => g.tracks).find((t) => t.slot === slot) || null;

let save = () => {};
export function bindTrackSave(fn) { save = fn; }
export const saveTracks = () => save();

// audio.music() was asked for `slot`. The first time a stage track really plays, it is
// CHAD's: queued for the next arrival in the lair, and flagged NEW on the hi-fi until the
// jukebox is opened.
export function hearTrack(slot) {
  if (!slot || G.tracksHeard.includes(slot)) return false;
  const t = trackInfo(slot);
  if (!t || !t.home) return false;
  G.tracksHeard.push(slot);
  if (!G.tracksNew.includes(slot)) G.tracksNew.push(slot);
  if (!G.tracksUnseen.includes(slot)) G.tracksUnseen.push(slot);
  save();
  return true;
}

// A stage already cleared was heard all the way through. Older saves (no track record at
// all) get theirs announced once, on the next visit to the lair; any other save is only
// topped up, quietly.
export function backfillTracks(clearedIds, announce) {
  for (const t of catalog()) {
    if (!t.home || !clearedIds.includes(t.home) || G.tracksHeard.includes(t.slot)) continue;
    G.tracksHeard.push(t.slot);
    if (announce) { G.tracksNew.push(t.slot); G.tracksUnseen.push(t.slot); }
  }
}

// ------------------------------------------------------------------ the toast
export const TOAST_LIFE = 330;
const TOAST_IN = 16, TOAST_OUT = 18, MAX_LINES = 6;

// Puts everything queued into one toast, `delay` ticks from now. The queue is only spent
// when the toast actually comes up (updateTrackToast), so leaving the lair or the tally
// before then keeps it for next time. Slots that make no sound are dropped, not announced.
export function announceTracks(delay = 0) {
  const tracks = G.tracksNew.map(trackInfo).filter(Boolean);
  if (!G.tracksNew.length) return false;
  if (!tracks.length) { G.tracksNew = []; save(); return false; }
  G.trackToast = { slots: tracks.map((t) => t.slot), start: G.rawTime + delay, chimed: false };
  return true;
}

export function updateTrackToast() {
  const toast = G.trackToast;
  if (!toast) return;
  if (!toast.chimed && G.rawTime >= toast.start) {
    toast.chimed = true;
    G.tracksNew = G.tracksNew.filter((s) => !toast.slots.includes(s));
    save();
    G.audio.sfx('pickup');
    audio.travelChime();
  }
  if (G.rawTime - toast.start > TOAST_LIFE) G.trackToast = null;
}

// A cassette, drawn in code: shell, label, window and two reels that turn while `spin`.
// x,y is the top-left corner; w is its width, the height follows at the real 5:3.
export function drawCassette(ctx, x, y, w, label, t, spin = true, col = '#d838a0') {
  const h = Math.round(w * 0.62), k = w / 120;
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = '#2a2232';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#3a3044';
  ctx.fillRect(x, y, w, 1);
  // the label, with a stripe in the panel's colours
  const lx = x + Math.round(7 * k), ly = y + Math.round(5 * k), lw = w - Math.round(14 * k), lh = Math.round(40 * k);
  ctx.fillStyle = '#e8dcc0';
  ctx.fillRect(lx, ly, lw, lh);
  ctx.fillStyle = col;
  ctx.fillRect(lx, ly + Math.round(2 * k), lw, Math.max(1, Math.round(2 * k)));
  ctx.fillStyle = '#ff7a3a';
  ctx.fillRect(lx, ly + Math.round(5 * k), lw, Math.max(1, Math.round(k)));
  if (label && k >= 0.8) {
    // written on the label above the window, side A
    const ty = ly + Math.round(9 * k);
    drawText(ctx, 'A', lx + 3, ty, col, 1);
    const s = label.length > 24 ? label.slice(0, 23) + '.' : label;
    drawText(ctx, s, Math.round(lx + (lw - textWidth(s, 1)) / 2), ty, '#2a2232', 1);
  }
  // the window and the reels
  const wx = x + Math.round(30 * k), wy = y + Math.round(24 * k), ww = w - Math.round(60 * k), wh = Math.round(16 * k);
  ctx.fillStyle = '#0a0812';
  ctx.fillRect(wx, wy, ww, wh);
  const r = 6.5 * k, cy = wy + wh / 2, a = spin ? t * 0.09 : 0;
  for (const cx of [x + 36 * k, x + w - 36 * k]) {
    ctx.fillStyle = '#5a3a2a';   // the wound tape
    ctx.beginPath(); ctx.arc(cx, cy, r + 1.5 * k, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8f0e0';
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2232';
    ctx.lineWidth = Math.max(1, k);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const s = a + i * Math.PI * 2 / 3;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(s) * r * 0.62, cy + Math.sin(s) * r * 0.62);
    }
    ctx.stroke();
  }
  // the tape running across the head, and the shell's lower lip
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(Math.round(x + 36 * k), Math.round(wy + wh - 2 * k), Math.round(w - 72 * k), Math.max(1, Math.round(k)));
  ctx.fillStyle = '#1a1420';
  const by = y + h - Math.round(12 * k);
  ctx.beginPath();
  ctx.moveTo(x + 18 * k, y + h); ctx.lineTo(x + 24 * k, by); ctx.lineTo(x + w - 24 * k, by); ctx.lineTo(x + w - 18 * k, y + h);
  ctx.fill();
  ctx.fillStyle = '#0a0812';
  for (const hx of [x + 40 * k, x + w - 40 * k]) ctx.fillRect(Math.round(hx - k), Math.round(by + 4 * k), Math.max(2, Math.round(3 * k)), Math.max(2, Math.round(3 * k)));
  ctx.fillStyle = '#8a82a0';
  for (const [sx, sy] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) ctx.fillRect(sx, sy, 2, 2);
}

// Drops in from the top edge, holds, and slides back out. Draw-only: the chime and the
// expiry are updateTrackToast's.
export function drawTrackToast(ctx, top = 6) {
  const toast = G.trackToast;
  if (!toast) return;
  const age = G.rawTime - toast.start;
  if (age < 0 || age > TOAST_LIFE) return;
  const names = toast.slots.map((s) => trackInfo(s)).filter(Boolean);
  if (!names.length) return;
  const lines = names.slice(0, MAX_LINES).map((t) => t.name);
  if (names.length > MAX_LINES) lines[MAX_LINES - 1] = '+' + (names.length - MAX_LINES + 1) + ' MORE';
  const head = names.length > 1 ? 'NEW TRACKS UNLOCKED' : 'NEW TRACK UNLOCKED';
  const foot = 'NOW ON THE HI-FI IN THE LAIR';
  const iconW = 44, pad = 8;
  // more than two names go in two columns, so a whole stage's worth stays a short strip
  const cols = lines.length > 2 ? 2 : 1, rows = Math.ceil(lines.length / cols);
  const colW = Math.max(...lines.map((l) => textWidth(l, 1) + 10)) + 8;
  const textW = Math.max(textWidth(head, 2), textWidth(foot, 1), cols * colW - 8);
  const w = pad + iconW + 8 + textW + pad, h = 26 + rows * 9 + 12;
  const inK = clamp(age / TOAST_IN, 0, 1), outK = clamp((TOAST_LIFE - age) / TOAST_OUT, 0, 1);
  const ease = (k) => 1 - (1 - k) ** 3;
  const y = Math.round(top - (h + top + 2) * (1 - ease(Math.min(inK, outK))));
  const x = Math.round((W - w) / 2);

  ctx.save();
  ctx.fillStyle = 'rgba(6,4,10,0.97)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#d838a0';
  ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  ctx.fillStyle = '#ffd94a';
  for (const [cx, cy, dx, dy] of [[x, y, 1, 1], [x + w - 1, y, -1, 1], [x, y + h - 1, 1, -1], [x + w - 1, y + h - 1, -1, -1]]) {
    ctx.fillRect(dx > 0 ? cx : cx - 4, cy, 5, 1);
    ctx.fillRect(cx, dy > 0 ? cy : cy - 4, 1, 5);
  }
  // a glint runs across it once as it lands
  if (age >= TOAST_IN && age < TOAST_IN + 22) {
    const gx = x + ((age - TOAST_IN) / 22) * (w + 40) - 20;
    ctx.save();
    ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
    const g = ctx.createLinearGradient(gx - 16, 0, gx + 16, 0);
    g.addColorStop(0, 'rgba(255,240,200,0)');
    g.addColorStop(0.5, 'rgba(255,240,200,0.22)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx - 16, y, 32, h);
    ctx.restore();
  }
  // the cassette pops in slightly bigger and settles
  const pop = age < TOAST_IN + 8 ? 1 + 0.12 * Math.sin(clamp((age - TOAST_IN) / 8, 0, 1) * Math.PI) : 1;
  const cw = Math.round(iconW * pop);
  drawCassette(ctx, x + pad + Math.round((iconW - cw) / 2), y + Math.round((h - cw * 0.62) / 2), cw, null, G.rawTime, true);
  const tx = x + pad + iconW + 8;
  const shimmer = ((G.rawTime >> 3) & 1) ? '#ffd94a' : '#ffe98a';
  drawTextShadow(ctx, head, tx, y + 7, age < TOAST_IN + 24 ? shimmer : '#ffd94a', 2);
  lines.forEach((l, i) => {
    // names tick in one after another
    if (age < TOAST_IN + 10 + i * 8) return;
    const ly = y + 25 + (i % rows) * 9, lx = tx + ((i / rows) | 0) * colW;
    ctx.fillStyle = '#ff7a3a';   // a quaver: stem, flag and head
    ctx.fillRect(lx + 3, ly - 1, 1, 5); ctx.fillRect(lx + 4, ly - 1, 2, 1); ctx.fillRect(lx + 1, ly + 3, 3, 2);
    drawTextShadow(ctx, l, lx + 10, ly, '#8ad8ff', 1);
  });
  drawTextShadow(ctx, foot, tx, y + h - 11, '#8a82a0', 1);
  ctx.restore();
}
