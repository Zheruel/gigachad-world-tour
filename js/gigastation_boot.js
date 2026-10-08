// gigastation_boot.js - the 1995 console boot, rebranded: the white "Gigachad Computer
// Entertainment" screen, then the black GigaStation licence screen, timed to the original boot
// recording (audio/sfx/gigastation_boot.mp3). As the recording dies away CHAD crashes the licence
// screen like a 90s mascot ident and an iris closes on him. Plays once after the welcome press;
// any press after the first second skips to the title.
import { W, H, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { audio } from './audio.js';

// Ticks (60/s) from the press, on the recording's beats: the swell (0-2 s) closes the halves, the
// chime (tick 118/137) brings the lettering, the second sound (tick 438) the licence screen.
const T = { white: 6, slide: [12, 112], word: [120, 144], ce: [138, 162], toBlack: [396, 426], logo: [438, 462] };
// The ident: dive in beside the logo, land, rise, sidle over and lean on it, shades down and talk,
// point on the last word, iris in, wink, iris shut. The Duke line's last word lands at voice+119.
const I = { spot: 624, leap: [632, 656], rise: [676, 688], stand: 688, sidle: [712, 722], lean: 722, handUp: 762, shades: 770, brow: 774, voice: 790, wind: 900, point: 907, iris: [926, 940, 966, 976], wink: 944 };
export const GS_BOOT_TICKS = 988;
export const GS_BOOT_SKIP_AFTER = 60;
const AUDIO_LEAD = 4; // the trimmed file starts 4 ticks into the timeline

// Preloaded at import so playback starts on the press.
let sound = null;
try { sound = new Audio('audio/sfx/gigastation_boot.mp3'); sound.preload = 'auto'; sound.volume = 0.85; } catch (_) { sound = null; }
let playing = false, fade = null;
export function startGigastationBoot() {
  if (!sound) return;
  clearInterval(fade); sound.volume = 0.85;
  try { sound.currentTime = 0; playing = true; sound.play().catch(() => { playing = false; }); } catch (_) { playing = false; }
}
// The recording is the clock while it plays; null means fall back to counted ticks.
export function gigastationBootTick() {
  if (!playing || !sound) return null;
  if (sound.ended) return null; // the ident outlasts the recording
  return sound.currentTime > 0 ? AUDIO_LEAD + sound.currentTime * 60 : 0;
}
// Dip the recording under the landing so the slam punches through.
function duck() {
  if (!sound || !playing) return;
  const s = sound; s.volume = .42; let n = 0;
  const up = setInterval(() => { s.volume = Math.min(.85, .42 + .43 * (++n / 18)); if (n >= 18 || !playing) clearInterval(up); }, 17);
}
// A short fade avoids a click when the boot is skipped.
export function stopGigastationBoot() {
  audio.stopSamples?.();
  if (!sound || !playing) return;
  playing = false; clearInterval(fade);
  const s = sound; fade = setInterval(() => { s.volume = Math.max(0, s.volume - 0.15); if (s.volume <= 0) { clearInterval(fade); s.pause(); } }, 13);
}

const k = (t, [a, b]) => clamp((t - a) / (b - a), 0, 1);
const easeOut = (x) => 1 - (1 - x) ** 3;

function art(ctx, key, cx, cy, h, alpha = 1) {
  const im = ASSETS[key]; if (!im || alpha <= 0) return false;
  const w = im.width / im.height * h;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h); ctx.restore(); return true;
}
function text(ctx, s, x, y, size, color, alpha, weight = '400', spacing = 0) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(s, x, y); ctx.restore();
}

// Fallback emblem half: a flat triangle of the diamond.
function half(ctx, side, cx, cy, h) {
  ctx.beginPath(); ctx.moveTo(cx, cy - h / 2); ctx.lineTo(cx + side * h * .36, cy); ctx.lineTo(cx, cy + h / 2); ctx.closePath();
  ctx.fillStyle = side < 0 ? '#e8572a' : '#3f5fcf'; ctx.fill();
}

function whiteScreen(ctx, t) {
  ctx.fillStyle = '#fff'; ctx.globalAlpha = clamp(t / T.white, 0, 1); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
  // The two halves of the diamond glide in from the sides and lock together.
  const q = easeOut(k(t, T.slide)), gap = 90 * (1 - q), cx = W / 2, cy = 100, h = 92;
  // Both halves are cut on the whole diamond's canvas, so they share its centre and lock exactly.
  ctx.save(); ctx.globalAlpha = k(t, [T.slide[0], T.slide[0] + 14]);
  if (!art(ctx, 'gs_emblem_l', cx - gap, cy, h)) half(ctx, -1, cx - gap, cy, h);
  if (!art(ctx, 'gs_emblem_r', cx + gap, cy, h)) half(ctx, 1, cx + gap, cy, h);
  ctx.restore();
  // A glint runs down the seam as they meet.
  const g = t - T.slide[1];
  if (g >= 0 && g < 16) {
    const y = cy - h / 2 + h * g / 16, gr = ctx.createRadialGradient(cx, y, 0, cx, y, 18);
    gr.addColorStop(0, `rgba(255,255,255,${.9 * (1 - g / 16)})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(cx - 18, y - 18, 36, 36);
  }
  const wa = k(t, T.word), ca = k(t, T.ce);
  if (!art(ctx, 'gs_wordmark', W / 2, 177, 26, wa)) text(ctx, 'GIGACHAD', W / 2, 177, 30, '#000', wa, '900');
  if (!art(ctx, 'gs_ce', W / 2, 201, 8, ca)) text(ctx, 'COMPUTER ENTERTAINMENT', W / 2, 201, 9, '#000', ca, '500', 2);
}

// CHAD's ident poses (assets/ui/gigastation/chad.png, one row of cells drawn PW x PH logical px
// from a feet anchor; the dive is anchored at its fist). The lean family (3-5, 9-17) shares one
// body so the arm and face poses swap in place.
const P = { leap: 0, land: 1, stand: 2, lean: 3, shades: 4, point: 5, dive: 6, rise: 7, handUp: 9, handShades: 10, wind: 11, shut: 12, ah: 13, oh: 14, mid: 15, brow: 16, ooh: 17, wink: 18, winkHold: 19, sidle: 20, sidleEnd: 21, pointTalk: 22, pointHalf: 23, pointShut: 24, riseMid: 25 };
// If a later sheet is missing, its poses fall back to their nearest key pose.
const FALLBACK = { 6: 0, 7: 1, 9: 3, 10: 3, 11: 5, 12: 4, 13: 4, 14: 4, 15: 4, 16: 4, 17: 4, 18: 4, 19: 4, 20: 8, 21: 8, 22: 5, 23: 5, 24: 22, 25: 7 };
const PW = 190, PH = 165, FLOOR = 171, LAND_X = 334, LEAN_X = 306;
// Per pose, relative to the feet: eyes over the shades, the iris centre and the pointing fist.
const EYE = { [P.brow]: [-19, -139], [P.shades]: [-19, -139], [P.wink]: [-19, -139] }, FACE = [-18, -140], FIST = [0, -124];
// Mouth shape per tick of the Duke line (from its loudness): c shut, o open, h round, m half.
const LOUD = 'hmomhoooooooomohhccchmooomhhmohooommmooooooooooooommmooooooohhhhhhhmooooooommmooohhhcchooooooooooooomooomhoommmmooohccchhooommooommmomoomoooomhhcccccc';
// Each shape is held for at least 3 ticks (the majority of each 3-tick window) so it doesn't chatter.
const MOUTH = LOUD.replace(/.{1,3}/g, (w) => { const n = (c) => w.split(c).length; return [...w].sort((a, b) => n(b) - n(a))[0].repeat(w.length); });
function pose(ctx, i, x, y, { sx = 1, sy = 1, rot = 0, alpha = 1 } = {}) {
  const im = ASSETS.gs_chad; if (!im) return;
  const cells = Math.round(im.width / (im.height * PW / PH)), cw = im.width / cells;
  if (i >= cells) i = FALLBACK[i] ?? 0;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, sy);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, i * cw, 0, cw, im.height, -PW / 2, -PH, PW, PH); ctx.restore();
}
// Which lean-family face shows while he talks.
function talking(t) {
  const v = t - I.voice;
  if (t < I.voice) return t >= I.brow ? P.brow : P.shut;
  const m = MOUTH[Math.floor(v)] || 'c';
  return m === 'c' ? P.shut : m === 'h' ? P.oh : m === 'm' ? P.mid : P.ah;
}
// The point keeps talking through the end of the line.
function pointing(t) {
  const m = MOUTH[Math.floor(t - I.voice)] || 'c';
  return m === 'c' ? P.pointShut : m === 'm' ? P.pointHalf : P.pointTalk;
}
// Where CHAD is, which pose, and how he is deformed at tick t (null before he arrives).
function chad(t) {
  const [a, b] = I.leap;
  if (t < a) return null;
  if (t < b) {
    // Diving in from above the top-right corner, accelerating, fist first.
    const p = (t - a) / (b - a), x = 404 + (LAND_X - 404) * p, y = -46 + (FLOOR + 46) * p * p;
    return { i: P.dive, x, y, rot: .12 - .12 * p, sx: .95, sy: 1.06 };
  }
  const land = t - b, breathe = .018 * Math.sin((t - b) * .1), bob = Math.round(Math.sin((t - b) * .1 - .6));
  if (t < I.rise[0]) { const q = easeOut(Math.min(1, land / 9)); return { i: P.land, x: LAND_X, y: FLOOR, sx: 1.14 - .14 * q, sy: .84 + .16 * q }; }
  // He pushes up through a half-risen pose, dips, springs tall and settles.
  if (t < I.stand) { const q = (t - I.rise[0]) / (I.stand - I.rise[0]), dip = Math.max(0, q - .6) / .4; return { i: q < .5 ? P.rise : P.riseMid, x: LAND_X, y: FLOOR, sx: 1 + .03 * dip, sy: 1 - .05 * dip }; }
  if (t < I.sidle[0]) { const q = easeOut(Math.min(1, (t - I.stand) / 8)); return { i: P.stand, x: LAND_X, y: FLOOR - 3 * (1 - q) + bob * .5 * q, sx: .94 + .06 * q, sy: 1.07 - .07 * q + breathe * .6 }; }
  const g = logoBounce(t).dy, lean = FLOOR + 2 + g;
  if (t < I.lean) { const q = easeOut((t - I.sidle[0]) / (I.lean - I.sidle[0])); return { i: q < .5 ? P.sidle : P.sidleEnd, x: LAND_X + (LEAN_X + 3 - LAND_X) * q, y: FLOOR - 2 * Math.sin(q * Math.PI) }; }
  const x = LEAN_X + 3 - 3 * easeOut(Math.min(1, (t - I.lean) / 4));
  const i = t < I.handUp ? P.lean : t < I.shades - 4 ? P.handUp : t < I.shades ? P.handShades : t < I.wind ? talking(t) : t < I.point ? P.wind : t < I.wink ? pointing(t) : t < I.wink + 14 ? P.wink : P.winkHold;
  // Each new key pose pops a little, cartoon style.
  const key = [I.lean, I.handUp, I.shades, I.wind, I.point, I.wink].filter((k) => k <= t).pop(), since = t - key;
  let pop = since < 8 ? .03 * Math.sin(since / 8 * Math.PI) * (key === I.point ? 2 : 1) : 0;
  // Stressed syllables give a small nod.
  const v = Math.floor(t - I.voice);
  if (t >= I.voice && t < I.wind && MOUTH[v] === 'o') { let on = v; while (MOUTH[on - 1] === 'o') on--; if (v - on < 6) pop += .012 * Math.sin((v - on) / 6 * Math.PI); }
  return { i, x, y: lean + (i === P.lean ? bob * .5 : 0), sx: 1 + pop, sy: 1 + pop + breathe };
}
// The logo takes the landing like a trampoline and gives a little under his elbow.
function logoBounce(t) {
  const land = t - I.leap[1], lean = t - I.lean;
  let dy = 0, sy = 1;
  if (land >= 0 && land < 30) { dy = -7 * Math.exp(-land / 7) * Math.abs(Math.sin(land * .42)); sy = 1 - .06 * Math.exp(-land / 5) * Math.cos(land * .5); }
  if (lean >= 0 && lean < 24) dy += 3 * Math.exp(-lean / 6) * Math.sin(lean * .55 + .5);
  return { dy, sy };
}
function puff(ctx, x, y, r, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(210,200,190,${a})`); g.addColorStop(1, 'rgba(210,200,190,0)');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// A four-point star glint.
function sparkle(ctx, x, y, age, len = 14) {
  if (age < 0 || age >= 14) return;
  const s = (age < 4 ? age / 4 : 1 - (age - 4) / 10) * len, a = age < 4 ? 1 : 1 - (age - 4) / 10;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(age * .05);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * .45); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(180,220,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  for (let r = 0; r < 2; r++) { ctx.rotate(Math.PI / 2 * r); ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(0, -1.1); ctx.lineTo(s, 0); ctx.lineTo(0, 1.1); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function ident(ctx, t) {
  // A pool of light marks where he will land, then stays under him.
  if (t >= I.spot) {
    const q = clamp((t - I.spot) / (I.leap[1] - I.spot), 0, 1), cx = chad(t)?.x ?? LAND_X, r = 44 * q;
    ctx.save(); ctx.translate(cx, FLOOR); ctx.scale(1, .2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, r)); g.addColorStop(0, `rgba(255,236,200,${.3 * q})`); g.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
  }
  const c = chad(t); if (!c) return;
  // His forearm presses on the G: a dark contact line under it.
  if (t >= I.lean) { ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.38)'; ctx.beginPath(); ctx.ellipse(c.x - 58, c.y - 116, 12, 2, -.05, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  // Speed ghosts along the dive.
  if (c.i === P.dive) {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
    for (let n = 0; n < 5; n++) { const ox = -26 + n * 13, len = 30 + (n * 17) % 23; ctx.beginPath(); ctx.moveTo(c.x + ox + len * .4, c.y - 110 - len); ctx.lineTo(c.x + ox, c.y - 90 - (n * 7) % 30); ctx.stroke(); }
    ctx.restore();
  }
  if (c.i === P.dive) for (const [d, al] of [[4, .18], [2, .3]]) { const g = chad(t - d); if (g && g.i === P.dive) pose(ctx, P.dive, g.x, g.y, { ...g, alpha: al }); }
  pose(ctx, c.i, c.x, c.y, c);
  // Landing dust rolls out both ways.
  const land = t - I.leap[1];
  if (land >= 0 && land < 12) {
    const r = 12 + land * 9, a = .7 * (1 - land / 12);
    ctx.save(); ctx.strokeStyle = `rgba(255,244,220,${a})`; ctx.lineWidth = 2.5 * (1 - land / 12) + .5;
    ctx.beginPath(); ctx.ellipse(LAND_X, FLOOR - 1, r, r * .16, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (land >= 0 && land < 48) for (let n = 0; n < 10; n++) {
    const side = n % 2 ? 1 : -1, d = (14 + n * 6) * (1 - Math.exp(-land / 9)), r = 7 + land * .45 + n % 3 * 2;
    ctx.save(); ctx.translate(LAND_X + side * (6 + d), FLOOR - 2 - land * .1 * (n % 3)); ctx.scale(1, .55); puff(ctx, 0, 0, r, .5 * (1 - land / 48) ** 1.5); ctx.restore();
  }
  // Glints: his eye on the "ting" and his winking eye in the iris.
  const eye = EYE[P.brow];
  if (t >= I.brow && t < I.brow + 14) sparkle(ctx, c.x + eye[0], c.y + eye[1], t - I.brow, 16);
  if (c.i === P.wink || c.i === P.winkHold) sparkle(ctx, c.x + EYE[P.wink][0], c.y + EYE[P.wink][1], t - I.wink - 6, 14);
  // The point snaps out of a burst beside the fist (it points at the viewer), clear of his face.
  const ps = t - I.point;
  if (ps >= 0 && ps < 7) {
    ctx.save(); ctx.translate(c.x + FIST[0], c.y + FIST[1]); ctx.strokeStyle = `rgba(255,248,225,${.8 * (1 - ps / 7)})`; ctx.lineWidth = 1.5 - ps * .15;
    for (let n = 0; n < 5; n++) { const a = -1.3 + n * .5, r0 = 13 + ps * 2, r1 = r0 + 5 + (n % 2) * 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.stroke(); }
    ctx.restore();
  }
}
// The camera eases in on CHAD and the logo once he has landed.
function camera(t) {
  const q = clamp((t - I.lean) / (I.iris[0] - I.lean), 0, 1), e = q * q * (3 - 2 * q);
  return { z: 1 + .34 * e, fx: 240 + 18 * e, fy: 135 - 24 * e };
}
const view = (cam, x, y) => [(x - cam.fx) * cam.z + W / 2, (y - cam.fy) * cam.z + H / 2];
// A cartoon iris closes on his face, pauses, then shuts.
function iris(ctx, t) {
  const [a, b, c, d] = I.iris; if (t < a) return;
  const [cx, cy] = view(camera(t), LEAN_X + FACE[0], FLOOR + FACE[1]);
  const r = t < b ? 300 - 272 * (1 - (1 - (t - a) / (b - a)) ** 2) : t < c ? 28 : 28 * (1 - clamp((t - c) / (d - c), 0, 1)) ** 2;
  ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore();
}
// Sound cues crossed between two ticks (the recording clock can jump several ticks at once).
export function cueGigastationBoot(from, to) {
  const at = (x) => from < x && x <= to;
  if (!ASSETS.gs_chad) return;
  if (at(I.leap[0])) audio.fallWhistle?.();
  if (at(I.leap[1])) { audio.sfx('slam'); duck(); }
  if (at(I.lean)) audio.squeak?.();
  if (at(I.brow) || at(I.wink + 6)) audio.glint?.();
  if (at(I.voice)) audio.voice('duke_games_named', 2600, true);
  if (at(I.iris[3])) audio.sfx('land');
}

function licenceScreen(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  // Logo and licence fade in together, as on the original.
  const q = k(t, T.logo), cx = W / 2, h = 118, b = logoBounce(t), cy = 112 + b.dy;
  ctx.save(); ctx.translate(cx, FLOOR); ctx.scale(1 / Math.sqrt(b.sy), b.sy); ctx.translate(-cx, -FLOOR);
  if (!art(ctx, 'gs_logo', cx, cy, h, q)) {
    ctx.save(); ctx.globalAlpha = q; ctx.fillStyle = '#e8352a'; ctx.fillRect(cx - 26, cy - 44, 20, 72);
    ctx.fillStyle = '#f5c518'; ctx.fillRect(cx - 6, cy + 20, 50, 8); ctx.fillStyle = '#2aa84a'; ctx.fillRect(cx - 6, cy + 30, 50, 6); ctx.fillStyle = '#2d6fd2'; ctx.fillRect(cx - 6, cy + 38, 50, 6); ctx.restore();
  }
  ctx.restore();
  // The landing's shockwave knocks the licence lines off the screen.
  const hit = ASSETS.gs_chad ? t - I.leap[1] : -1;
  [['Licensed by', 206, -1], ['Gigachad Computer Entertainment America', 219, 1]].forEach(([s, y, dir], j) => {
    if (hit < 0) { text(ctx, s, W / 2, y, 9, '#e8e8e8', q); return; }
    const a = Math.max(0, hit - j * 2); if (a > 26) return;
    // The top line pops up and left, the bottom one drops right, so they never cross.
    ctx.save(); ctx.translate(W / 2 + dir * a * 3, y + (j ? .5 : -3) * a + .35 * a * a); ctx.rotate(dir * a * (j ? .015 : .03));
    text(ctx, s, 0, 0, 9, '#e8e8e8', q); ctx.restore();
  });
}

export function drawGigastationBoot(ctx, t) {
  if (t < T.toBlack[1]) {
    whiteScreen(ctx, t);
    const b = k(t, T.toBlack); if (b > 0) { ctx.fillStyle = `rgba(0,0,0,${b})`; ctx.fillRect(0, 0, W, H); }
    return;
  }
  // The landing shakes the screen.
  const land = t - I.leap[1], shake = land >= 0 && land < 10 ? (10 - land) * .5 : 0;
  ctx.save(); if (shake) ctx.translate(Math.round(Math.sin(land * 2.7) * shake), Math.round(Math.cos(land * 3.3) * shake * .6));
  const cam = ASSETS.gs_chad ? camera(t) : { z: 1, fx: W / 2, fy: H / 2 };
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.fx, -cam.fy);
  licenceScreen(ctx, t); ident(ctx, t);
  ctx.restore();
  iris(ctx, t);
  // Without CHAD's art the licence screen simply fades out as the recording ends.
  if (!ASSETS.gs_chad) { const o = k(t, [852, 882]); if (o > 0) { ctx.fillStyle = `rgba(0,0,0,${o})`; ctx.fillRect(0, 0, W, H); } }
}
