// story.js - authored chapter cinematics that happen in the actual level.
import { G, W, H } from './engine.js';
import { SPR, blit, frameW, frameH, getFrame, drawTextShadow, textWidth } from './sprites.js';
import { drawStage } from './stages.js';
import { drawProp } from './props.js';
import { drawTrainOverlay } from './train.js';
import { spawnCigarSmoke, drawEffects } from './effects.js';
import { audio } from './audio.js';

export const ENTRANCE_LAST_FRAME = 840;
export const STATION_LAST_FRAME = 430;

// The act's name, punched onto the picture: four frames oversized, then it settles, then
// the sub-line and a red rule slide out under it. Both chapter openings end on this so
// the two acts read as one tour.
export function drawActStamp(ctx, age, name, sub) {
  if (age < 0) return;
  const sc = age < 3 ? 5 : age < 6 ? 4 : 3;
  const x = (W - textWidth(name, sc)) / 2;
  const y = 92 - (sc - 3) * 4;
  ctx.save();
  if (age < 6) { ctx.globalAlpha = 0.9; }
  ctx.fillStyle = 'rgba(6,3,8,0.55)';
  ctx.fillRect(0, y - 8, W, 5 * sc + 34);
  drawTextShadow(ctx, name, x, y, age < 8 ? '#fff6e0' : '#ffd94a', sc, '#3a0c10');
  const rule = Math.min(1, Math.max(0, (age - 6) / 12));
  ctx.fillStyle = '#d82838';
  ctx.fillRect(Math.round(W / 2 - rule * (textWidth(name, 3) / 2 + 10)), y + 5 * sc + 6, Math.round(rule * (textWidth(name, 3) + 20)), 2);
  if (age > 12) drawTextShadow(ctx, sub, (W - textWidth(sub, 1)) / 2, y + 5 * sc + 14, '#c8c0e0', 1);
  ctx.restore();
}

const HERO = [];
let enginePlayed = false;
let engineStopped = false;
let birdsPlayed = false;
let skidPlayed = false;
let bootPlayed = false;
let landingPlayed = false;
let standPlayed = false;
let quotePlayed = false;
let crackPlayed = false;
let crackSettlePlayed = false;

function asCanvas(img, file) {
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv._as = 2;
  cv._file = file;
  return cv;
}

function loadFrame(path, target, index) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { target[index] = asCanvas(img, path.split('/').pop()); resolve(); };
    img.onerror = () => resolve();
    img.src = path;
  });
}

export function loadStory() {
  const loads = [];
  for (let i = 0; i < 19; i++) {
    loads.push(loadFrame(`assets/story/entrance_v8/combined_${String(i + 1).padStart(2, '0')}.png`, HERO, i));
  }
  return Promise.all(loads);
}

export function motorFrames() { return HERO.slice(); }

export function resetStory() {
  audio.stopEntranceBike();
  enginePlayed = false;
  engineStopped = false;
  birdsPlayed = false;
  skidPlayed = false;
  bootPlayed = false;
  landingPlayed = false;
  standPlayed = false;
  quotePlayed = false;
  crackPlayed = false;
  crackSettlePlayed = false;
  stampPlayed = false;
  resetStation();
}

export function updateMotorcycleArrival(t) {
  if (t >= 0 && !enginePlayed) { enginePlayed = true; audio.startEntranceBike(); }
  if (t >= 18 && !birdsPlayed) { birdsPlayed = true; audio.sfx('entrance_birds'); }
  if (t >= 72 && !skidPlayed) { skidPlayed = true; audio.sfx('entrance_skid'); }
  if (t >= 214 && !engineStopped) { engineStopped = true; audio.stopEntranceBike(.11); }
  if (t >= 214 && !bootPlayed) { bootPlayed = true; audio.sfx('entrance_boot'); }
  if (t >= 240 && !standPlayed) { standPlayed = true; audio.sfx('entrance_stand'); }
  if (t >= 324 && !landingPlayed) { landingPlayed = true; audio.sfx('entrance_boot'); }
  if (t >= 456 && !quotePlayed) quotePlayed = audio.voice('duke_quote', 4736);
  if (t >= 760 && !crackPlayed) { crackPlayed = true; audio.sfx('entrance_crack'); }
  if (t >= 780 && !crackSettlePlayed) {
    crackSettlePlayed = true;
    audio.sfx('entrance_crack');
    audio.sfx('heavy');
  }
  if (t >= STAMP_AT && !stampPlayed) { stampPlayed = true; audio.sfx('slam'); G.shake = Math.max(G.shake, 5); }
}
const STAMP_AT = 794;
let stampPlayed = false;

function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function smooth(value) { const u = clamp01(value); return u * u * (3 - 2 * u); }

function smokeWisp(ctx, age, x, y, drift, strength, seed) {
  if (age < 0 || age > 104) return;
  const k = age / 104;
  const appear = Math.min(1, age / 7);
  const fade = Math.pow(1 - k, 1.35) * appear * strength;
  for (let lobe = 0; lobe < 3; lobe++) {
    const phase = seed * 1.73 + lobe * 2.2;
    const wobble = Math.sin(age * .115 + phase) * (1.1 + k * 3.1);
    ctx.globalAlpha = fade * (.34 - lobe * .065);
    ctx.fillStyle = lobe === 1 ? '#d7d0c7' : '#f1ebe2';
    ctx.beginPath();
    ctx.ellipse(
      x + drift * age * (.12 + lobe * .015) + wobble + lobe * .8,
      y - age * (.22 + lobe * .018) - lobe * 1.1,
      1.1 + k * (4.2 + lobe),
      .8 + k * (3.1 + lobe * .7),
      Math.sin(phase) * .18, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function cigarSmokeTrail(ctx, t, ground) {
  // Each wisp is emitted at the hero's position at that historical frame.
  // Old smoke therefore remains in world space and trails the moving bike
  // instead of snapping to the current sprite while scrubbing the timeline.
  for (let emitted = 34; emitted <= Math.min(t, 204); emitted += 11) {
    const rig = rigPosition(emitted);
    smokeWisp(ctx, t - emitted, rig.x - 13, ground - 63, .72, .54, emitted);
  }
  for (let emitted = 384; emitted <= Math.min(t, 438); emitted += 8) {
    smokeWisp(ctx, t - emitted, 191, ground - 73, .7, .48, emitted);
  }
  // The exhale is denser and slower than the idle ember trail.
  for (let emitted = 438; emitted <= Math.min(t, 486); emitted += 4) {
    smokeWisp(ctx, t - emitted, 191, ground - 73, .92, .82, emitted);
  }
}

function exhaustPuff(ctx, age, x, y) {
  if (age < 0 || age > 48) return;
  for (let i = 0; i < 7; i++) {
    const a = age - i * 3;
    if (a < 0 || a > 38) continue;
    const k = a / 38;
    ctx.globalAlpha = (1 - k) * .24;
    ctx.fillStyle = i & 1 ? '#6f6965' : '#aaa19a';
    ctx.beginPath();
    ctx.ellipse(x - k * 15, y - k * 5 + Math.sin(a * .2 + i) * 1.5,
      1.2 + k * 3.6, .9 + k * 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function skidTrail(ctx, t, ground) {
  const age = t - 72;
  if (age < 0 || age > 180) return;
  const fade = 1 - clamp01((age - 105) / 75);
  const rear = rigPosition(Math.min(t, 190)).x - 43;
  ctx.globalAlpha = fade * .72;
  ctx.strokeStyle = '#2a211e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, ground - 2);
  ctx.lineTo(rear, ground - 1);
  ctx.stroke();

  for (let emitted = 70; emitted <= Math.min(t, 190); emitted += 4) {
    const particleAge = t - emitted;
    if (particleAge > 78) continue;
    const k = particleAge / 78;
    const origin = rigPosition(emitted).x - 43;
    const phase = emitted * .29;
    ctx.globalAlpha = (1 - k) * .34;
    ctx.fillStyle = emitted % 12 ? '#82705e' : '#b59a79';
    ctx.beginPath();
    ctx.ellipse(
      origin - k * (10 + emitted % 17) + Math.sin(phase + k * 7) * 2,
      ground - 6 - k * (12 + emitted % 9),
      1.1 + k * 5.2, .8 + k * 3.4, 0, 0, Math.PI * 2,
    );
    ctx.fill();
  }
  // A few undercarriage sparks sell the deepest lean without baking effects
  // into the sprite artwork.
  if (t >= 124 && t < 174) {
    for (let i = 0; i < 9; i++) {
      const sparkAge = t - (126 + i * 4);
      if (sparkAge < 0 || sparkAge > 22) continue;
      const origin = rigPosition(126 + i * 4).x - 9;
      ctx.globalAlpha = 1 - sparkAge / 22;
      ctx.strokeStyle = i & 1 ? '#fff0a4' : '#ef9b3d';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(origin, ground - 5);
      ctx.lineTo(origin - sparkAge * (.35 + i * .025), ground - 4 - Math.sin(sparkAge * .3 + i) * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function crackAccent(ctx, t, x, ground) {
  for (const start of [760, 780]) {
    const age = t - start;
    if (age < 0 || age > 20) continue;
    const k = age / 20;
    const alpha = (1 - k) * .72;
    const cx = x - 2;
    const cy = ground - 58;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#f3d89a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = -2.7 + i * 1.02;
      const inner = 7 + k * 3;
      const outer = 11 + k * 9;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// The bike's own light: a warm cone thrown up the street ahead of it, dying with the
// engine. Two frames of white on the skid is the tyre biting.
function headlight(ctx, t, x, ground) {
  if (t >= 72 && t < 74) { ctx.fillStyle = 'rgba(255,250,235,0.55)'; ctx.fillRect(0, 0, W, H); }
  if (t >= 214) return;
  const k = t < 190 ? 1 : 1 - (t - 190) / 24;
  const g = ctx.createLinearGradient(x + 30, 0, x + 230, 0);
  g.addColorStop(0, `rgba(255,236,170,${0.5 * k})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 30, ground - 30);
  ctx.lineTo(x + 230, ground - 92);
  ctx.lineTo(x + 230, ground + 2);
  ctx.closePath();
  ctx.fill();
}

function drawFrame(ctx, frame, x, ground, yOffset = 0) {
  if (!frame) return;
  blit(ctx, frame,
    Math.round(x - frameW(frame) / 2),
    Math.round(ground - frameH(frame) + yOffset));
}

function heroFrameFor(t) {
  if (t < 72) return 0;
  if (t < 92) return 1;
  if (t < 116) return 2;
  if (t < 140) return 3;
  if (t < 164) return 4;
  if (t < 190) return 5;
  if (t < 214) return 6;
  if (t < 240) return 7;
  if (t < 268) return 8;
  if (t < 296) return 9;
  if (t < 324) return 10;
  if (t < 346) return 11;
  if (t < 372) return 12;
  if (t < 438) return 13;
  if (t < 474) return 14;
  if (t < 734) return 15;
  if (t < 760) return 16;
  if (t < 804) return 17;
  return 18;
}

function rigPosition(t) {
  if (t < 24) return { x: -112, y: 0, angle: 0 };
  if (t < 72) {
    const u = smooth((t - 24) / 48);
    return { x: -58 + 234 * u, y: Math.sin(t * .34) * .35, angle: 0 };
  }
  if (t < 164) {
    const u = smooth((t - 72) / 92);
    return { x: 176 + 40 * u, y: Math.sin(u * Math.PI) * 1.8, angle: 0 };
  }
  if (t < 190) {
    const u = smooth((t - 164) / 26);
    return { x: 216 - 11 * u, y: Math.sin(u * Math.PI) * .55, angle: 0 };
  }
  return { x: 205, y: 0, angle: 0 };
}

function storyZoom(t) {
  if (t < 346) return 1;
  if (t < 408) return 1 + smooth((t - 346) / 62) * .065;
  if (t < 760) return 1.065;
  if (t < 800) return 1.065 + Math.sin(smooth((t - 760) / 40) * Math.PI) * .018;
  if (t < 837) return 1.065;
  return 1.065 - smooth((t - 837) / 3) * .065;
}

function drawRig(ctx, t, frameIndex, x, ground, y, angle) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(ground + y));
  ctx.rotate(angle);
  drawFrame(ctx, HERO[frameIndex], 0, 0);
  ctx.restore();
}

export function drawMotorcycleArrival(ctx, options = {}) {
  const t = Math.max(0, Math.min(ENTRANCE_LAST_FRAME, G.rawTime - G.stateT));
  const zoom = storyZoom(t);
  ctx.save();
  if (t >= 72 && t < 214) {
    const force = 1 - smooth((t - 72) / 142);
    ctx.translate(Math.round(Math.sin(t * 2.15) * 1.7 * force), Math.round(Math.cos(t * 1.7) * .7 * force));
  }
  if (t >= 760 && t < 804) {
    const age = Math.min(t - 760, t - 780 >= 0 ? t - 780 : 99);
    const force = age < 12 ? 1 - age / 12 : 0;
    ctx.translate(Math.round(Math.sin(t * 2.7) * 2.2 * force), Math.round(Math.cos(t * 2.1) * 1.1 * force));
  }
  ctx.translate(205, 166);
  ctx.scale(zoom, zoom);
  ctx.translate(-205, -166);
  if (!options.subjectOnly) {
    drawStage(ctx, 0);
    ctx.fillStyle = 'rgba(7,4,8,.13)';
    ctx.fillRect(0, 0, W, H);
  }

  const ground = 225;
  const rig = rigPosition(t);
  const heroIndex = heroFrameFor(t);
  if (t >= 24) {
    headlight(ctx, t, rig.x, ground);
    skidTrail(ctx, t, ground);
    drawRig(ctx, t, heroIndex, rig.x, ground, rig.y, rig.angle);

    if (t < 72) {
      exhaustPuff(ctx, (t - 24) % 28, rig.x - 47, ground - 8);
    }
    cigarSmokeTrail(ctx, t, ground);
    crackAccent(ctx, t, rig.x, ground);
  }
  ctx.restore();

  if (!options.subjectOnly) {
    let bar = 18;
    if (t >= 837) bar = Math.round(18 * (1 - smooth((t - 837) / 3)));
    ctx.fillStyle = '#09060c';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    if (t < 837) drawActStamp(ctx, t - STAMP_AT, G.stage.name, G.stage.sub);
  }

  if (options.guides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(101,199,232,.8)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, 225.5); ctx.lineTo(W, 225.5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,212,92,.85)';
    ctx.beginPath(); ctx.moveTo(205.5, 20); ctx.lineTo(205.5, H - 20); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

// ---- THE NIGHT TRAIN: the station ----------------------------------------------
// He walks onto platform one with nothing but a cigar. The board wakes up, the PA
// chimes, the guard's whistle goes down the platform, and the act's name lands.
const ST = {
  walkTo: 150, walkEnd: 118,
  chime: 128, board: 150, whistle: 262, stamp: 272, voice: 292,
};
const BOARD = 'PLATFORM 1 - THE 22:40 SOUTH - ON TIME';
let stFlags = {};
function resetStation() { stFlags = {}; }
function once(key, t, at, fn) { if (t >= at && !stFlags[key]) { stFlags[key] = true; fn(); } }

function stationHeroX(t) { return -34 + (ST.walkTo + 34) * smooth(Math.min(1, t / ST.walkEnd)); }

export function updateStationArrival(t) {
  const p = G.player;
  p.x = stationHeroX(t); p.y = 218; p.face = 1;
  if (t < ST.walkEnd && t % 26 === 8) audio.sfx('entrance_boot');
  once('stand', t, ST.walkEnd, () => audio.sfx('entrance_stand'));
  once('chime', t, ST.chime, () => audio.sfx('chime'));
  once('whistle', t, ST.whistle, () => { audio.sfx('go'); });
  once('stamp', t, ST.stamp, () => { audio.sfx('slam'); G.shake = Math.max(G.shake, 5); });
  once('voice', t, ST.voice, () => audio.voiceAny(['duke_ride', 'duke_lets_rock', 'duke_come_get_some'], 2100));
  if (t > ST.board && t < ST.board + BOARD.length * 2 && t % 6 === 0) audio.sfx('blip');
  if (t > ST.walkEnd + 20 && t % 9 === 0) spawnCigarSmoke(p.x + 12, p.y - 72, 1);
}

export function drawStationArrival(ctx) {
  const t = Math.max(0, Math.min(STATION_LAST_FRAME, G.rawTime - G.stateT));
  const p = G.player;
  drawStage(ctx, 0);
  for (const pr of G.props) if (!pr.broken && pr.x < W + 40) drawProp(ctx, pr, 0);
  // the walk, then the stand: idle frames once he is where he is going
  const walking = t < ST.walkEnd;
  const f = walking ? getFrame(SPR.player, 'walk', (t >> 3) & 3, 1)
    : t < ST.walkEnd + 40 ? getFrame(SPR.player, 'idle', 0, 1)
      : getFrame(SPR.player, 'idle_cigar', ((t - ST.walkEnd) >> 4) % 6, 1);
  const sx = Math.round(p.x), sy = Math.round(p.y);
  ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(sx, sy, 16, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  blit(ctx, f, sx - frameW(f) / 2, sy - frameH(f) + 4);
  drawEffects(ctx, 0);
  drawTrainOverlay(ctx, 0);
  // the night, and the station's tubes waking one at a time
  ctx.fillStyle = 'rgba(4,4,12,0.22)'; ctx.fillRect(0, 0, W, H);
  if (t >= ST.chime && t < ST.chime + 14 && ((t >> 1) & 1)) { ctx.fillStyle = 'rgba(200,220,255,0.10)'; ctx.fillRect(0, 0, W, H); }
  // the departure board, typed
  if (t >= ST.board) {
    const n = Math.min(BOARD.length, ((t - ST.board) / 2) | 0);
    const shown = BOARD.slice(0, n) + (n < BOARD.length && ((t >> 2) & 1) ? '_' : '');
    ctx.fillStyle = 'rgba(6,8,16,0.82)'; ctx.fillRect(0, 232, W, 20);
    drawTextShadow(ctx, shown, (W - textWidth(BOARD, 1)) / 2, 238, '#ffb040', 1);
  }
  const bar = 18;
  ctx.fillStyle = '#09060c';
  ctx.fillRect(0, 0, W, bar);
  ctx.fillRect(0, H - bar, W, bar);
  drawActStamp(ctx, t - ST.stamp, G.stage.name, G.stage.sub);
}
