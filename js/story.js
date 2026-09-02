// story.js - authored chapter cinematics that happen in the actual level.
import { G, W, H } from './engine.js';
import { SPR, blit, frameW, frameH, getFrame, drawTextShadow, textWidth } from './sprites.js';
import { drawStage } from './stages.js';
import { drawProp, createProp } from './props.js';
import { drawTrainOverlay } from './train.js';
import { spawnCigarSmoke, drawEffects } from './effects.js';
import { drawPlayer, IDLES } from './player.js';
import { audio } from './audio.js';

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

const HERO = [];   // three riding cels: cruising, braking, settling
let BIKE = null;   // the parked bike alone, on the same canvas as the cels
const cues = {};   // one-shot sound flags for the arrival, keyed by cue name

function asCanvas(img, file) {
  const cv = document.createElement('canvas');
  cv.width = img.width;
  cv.height = img.height;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv._as = 2;
  cv._file = file;
  return cv;
}

function loadFrame(path, onload) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { onload(asCanvas(img, path.split('/').pop())); resolve(); };
    img.onerror = () => resolve();
    img.src = path;
  });
}

export function loadStory() {
  const loads = [];
  for (let i = 0; i < RIDE_CELS; i++) {
    loads.push(loadFrame(`assets/story/entrance_v9/combined_${String(i + 1).padStart(2, '0')}.png`, (c) => { HERO[i] = c; }));
  }
  loads.push(loadFrame('assets/story/entrance_v9/bike.png', (c) => { BIKE = c; }));
  return Promise.all(loads);
}

export function motorFrames() { return HERO.slice(); }

export function resetStory() {
  audio.stopEntranceBike();
  for (const k of Object.keys(cues)) delete cues[k];
  resetStation();
}

// ---- THE MOTORCYCLE ARRIVAL ----------------------------------------------------
// The bike rides in, brakes, and stops in a burst of street dust. When the dust clears
// the rider is already off it, standing in the road: the game's own CHAD, at the game's
// own scale, in the spot he will be standing in when play starts. He smokes through
// the line, cracks his knuckles, the act's name lands, the bars lift, and he is yours.
// The bike is a fixture of the street from then on. No authored dismount cels: the
// swap from rider to standing man happens under the dust, which is how the arcade did it.
const RIDE_CELS = 3;
const E = {
  ride: 24,        // the bike enters
  brake: 72,       // skid starts
  settle: 164,     // fork unloads
  stop: 190,       // the bike is parked, the dust goes up
  hero: 198,       // CHAD appears inside the dust
  cigar: 262,      // the quote and the cigar beat
  knuckles: 420,   // he cracks his knuckles
  stamp: 446,      // the act's name lands over that
  bars: 537,       // letterbox retracts
  last: 540,
};
export const ENTRANCE_LAST_FRAME = E.last;
const GROUND = 225;              // the bike's contact line, in the stage
const BIKE_X = 205;
export const HERO_X = 241, HERO_Y = 232;  // where CHAD stands, a lane in front of the bike
const STAMP_AT = E.stamp;

function cue(name, t, at, fn) { if (t >= at && !cues[name]) { cues[name] = true; fn(); } }

export function updateMotorcycleArrival(t) {
  cue('engine', t, 0, () => audio.startEntranceBike());
  cue('birds', t, 18, () => audio.sfx('entrance_birds'));
  cue('skid', t, E.brake, () => audio.sfx('entrance_skid'));
  cue('stop', t, E.stop, () => { audio.stopEntranceBike(.11); audio.sfx('entrance_stand'); audio.sfx('land'); });
  cue('boot1', t, E.hero + 2, () => audio.sfx('entrance_boot'));
  cue('boot2', t, E.hero + 18, () => audio.sfx('entrance_boot'));
  cue('quote', t, E.cigar, () => { if (!audio.voice('duke_quote', 4736)) delete cues.quote; });
  cue('crack1', t, E.knuckles + 4, () => audio.sfx('entrance_crack'));
  cue('crack2', t, E.knuckles + 24, () => { audio.sfx('entrance_crack'); audio.sfx('heavy'); });
  cue('stamp', t, E.stamp, () => { audio.sfx('slam'); G.shake = Math.max(G.shake, 5); });
  poseHero(t);
}

// CHAD's pose is a function of the clock, so scrubbing the timeline and skipping
// both land on the same man in the same place.
function poseHero(t) {
  const p = G.player;
  if (t < E.hero) return;
  p.x = HERO_X; p.y = HERO_Y; p.z = 0; p.vx = 0; p.vy = 0; p.vz = 0; p.face = 1; p.invuln = 0;
  const cigar = IDLES.findIndex((a) => a.name === 'idle_cigar');
  const knuckles = IDLES.findIndex((a) => a.name === 'idle_knuckles');
  const cigarEnd = E.cigar + IDLES[cigar].frames * IDLES[cigar].hold;
  const knucklesEnd = E.knuckles + IDLES[knuckles].frames * IDLES[knuckles].hold;
  if (t >= E.knuckles && t < knucklesEnd) { p.state = 'idleanim'; p.idleAnim = knuckles; p.t = t - E.knuckles; }
  else if (t >= E.cigar && t < cigarEnd) { p.state = 'idleanim'; p.idleAnim = cigar; p.t = t - E.cigar; }
  else { p.state = 'idle'; p.t = t - E.hero; }
}

// Called when the arrival ends or is skipped: the man where the arrival leaves him, in
// the pose play starts from, and the bike parked in the street for the rest of the act.
export function finishMotorcycleArrival() {
  audio.stopEntranceBike();
  poseHero(E.last);
  const p = G.player;
  p.state = 'idle'; p.t = 0; p.idleT = 0;
  if (!G.props.some((q) => q.prop === 'bike')) G.props.push(createProp('bike', BIKE_X, GROUND));
}

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

function cigarSmokeTrail(ctx, t) {
  // Each wisp is emitted at the rider's position at that historical frame, so old
  // smoke stays in world space and trails the bike instead of snapping to it.
  for (let emitted = 34; emitted <= Math.min(t, E.stop); emitted += 11) {
    const rig = rigPosition(emitted);
    smokeWisp(ctx, t - emitted, rig.x - 13, GROUND - 63, .72, .54, emitted);
  }
  // Standing, the cigar is at his mouth: the idle ember, then the exhale on the line.
  const mx = HERO_X + 8, my = HERO_Y - 76;
  for (let emitted = E.cigar + 30; emitted <= Math.min(t, E.knuckles); emitted += 9) {
    smokeWisp(ctx, t - emitted, mx, my, .7, .48, emitted);
  }
  for (let emitted = E.cigar + 90; emitted <= Math.min(t, E.cigar + 130); emitted += 4) {
    smokeWisp(ctx, t - emitted, mx, my, .92, .82, emitted);
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

function skidTrail(ctx, t) {
  const age = t - E.brake;
  if (age < 0 || age > 180) return;
  const fade = 1 - clamp01((age - 105) / 75);
  const rear = rigPosition(Math.min(t, E.stop)).x - 43;
  ctx.globalAlpha = fade * .72;
  ctx.strokeStyle = '#2a211e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(112, GROUND - 2);
  ctx.lineTo(rear, GROUND - 1);
  ctx.stroke();

  for (let emitted = 70; emitted <= Math.min(t, E.stop); emitted += 4) {
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
      GROUND - 6 - k * (12 + emitted % 9),
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
      ctx.moveTo(origin, GROUND - 5);
      ctx.lineTo(origin - sparkAge * (.35 + i * .025), GROUND - 4 - Math.sin(sparkAge * .3 + i) * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// The stop: the street's dust goes up around the bike and hangs long enough to hide
// the swap from rider to standing man. A low roll along the ground, then a taller
// column that climbs past head height and thins out; every puff is three soft lobes.
function dustPuff(ctx, x, y, r, alpha, seed) {
  for (let lobe = 0; lobe < 3; lobe++) {
    const ang = seed * 2.1 + lobe * 2.09;
    ctx.globalAlpha = alpha * (lobe ? .55 : .8);
    ctx.fillStyle = lobe === 1 ? '#d9c39c' : lobe === 2 ? '#a8896a' : '#c2a77f';
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(ang) * r * .35, y + Math.sin(ang) * r * .25, r * 1.2, r * .85, Math.sin(seed) * .3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function dustBurst(ctx, age, x) {
  if (age < 0 || age > 84) return;
  // the ground roll: fast, wide, low
  for (let i = 0; i < 8; i++) {
    const a = age - i;
    if (a < 0) continue;
    const k = Math.min(1, a / 60);
    const dir = i % 2 ? 1 : -1;
    const px = x + dir * (10 + smooth(k) * (40 + (i * 11) % 50));
    const py = GROUND - 6 - Math.sin(k * Math.PI) * (6 + (i * 5) % 12);
    dustPuff(ctx, px, py, 9 + k * 14, Math.min(1, a / 2) * Math.pow(1 - k, 1.6) * .8, i);
  }
  // the column: up to head height inside eight frames, hangs briefly, thins fast
  for (let i = 0; i < 16; i++) {
    const a = age - (i % 4);
    if (a < 0) continue;
    const k = Math.min(1, a / 84);
    const lift = smooth(Math.min(1, (a + 6) / 14));
    const px = x - 30 + (i * 17) % 76 + Math.sin(a * .06 + i) * 3 + (i % 2 ? 1 : -1) * k * 16;
    const py = GROUND - 10 - lift * (26 + (i * 13) % 66) - k * 14;
    const r = 12 + lift * (8 + (i * 5) % 10) + k * 8;
    dustPuff(ctx, px, py, r, Math.min(1, a / 2) * Math.pow(1 - k, 2.2) * .85, i + 7);
  }
  ctx.globalAlpha = 1;
}

function crackAccent(ctx, t, x, y) {
  for (const start of [E.knuckles + 4, E.knuckles + 24]) {
    const age = t - start;
    if (age < 0 || age > 20) continue;
    const k = age / 20;
    ctx.globalAlpha = (1 - k) * .72;
    ctx.strokeStyle = '#f3d89a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = -2.7 + i * 1.02;
      const inner = 7 + k * 3;
      const outer = 11 + k * 9;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
      ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// The bike's own light: a warm cone thrown up the street ahead of it, dying with the
// engine. Two frames of white on the skid is the tyre biting.
function headlight(ctx, t, x) {
  if (t >= E.brake && t < E.brake + 2) { ctx.fillStyle = 'rgba(255,250,235,0.55)'; ctx.fillRect(0, 0, W, H); }
  if (t >= E.stop + 24) return;
  const k = t < E.stop ? 1 : 1 - (t - E.stop) / 24;
  const g = ctx.createLinearGradient(x + 30, 0, x + 230, 0);
  g.addColorStop(0, `rgba(255,236,170,${0.5 * k})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + 30, GROUND - 30);
  ctx.lineTo(x + 230, GROUND - 92);
  ctx.lineTo(x + 230, GROUND + 2);
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
  if (t < E.brake) return 0;      // riding
  if (t < E.settle) return 1;     // braking, leaned by rigPosition
  return 2;                       // settling, boot down
}

function rigPosition(t) {
  if (t < E.ride) return { x: -112, y: 0, angle: 0 };
  if (t < E.brake) {
    const u = smooth((t - E.ride) / (E.brake - E.ride));
    return { x: -58 + 234 * u, y: Math.sin(t * .34) * .35, angle: 0 };
  }
  if (t < E.settle) {
    const u = smooth((t - E.brake) / (E.settle - E.brake));
    // the fork compresses: a small nose-down pitch that peaks early and eases out
    const dip = Math.sin(Math.min(1, u * 1.6) * Math.PI) * .055;
    return { x: 176 + 40 * u, y: Math.sin(u * Math.PI) * 1.8, angle: dip };
  }
  if (t < E.stop) {
    const u = smooth((t - E.settle) / (E.stop - E.settle));
    return { x: 216 - 11 * u, y: Math.sin(u * Math.PI) * .55, angle: -.012 * (1 - u) };
  }
  return { x: BIKE_X, y: 0, angle: 0 };
}

// A slow push-in once he is standing, undone across the last frames so the cut to
// play is the same picture.
function storyZoom(t) {
  if (t < E.hero) return 1;
  if (t < E.hero + 90) return 1 + smooth((t - E.hero) / 90) * .045;
  if (t < E.bars) return 1.045;
  return 1.045 - smooth((t - E.bars) / (E.last - E.bars)) * .045;
}

function drawRig(ctx, frameIndex, x, y, angle) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(GROUND + y));
  ctx.rotate(angle);
  drawFrame(ctx, HERO[frameIndex], 0, 0);
  ctx.restore();
}

export function drawMotorcycleArrival(ctx, options = {}) {
  const t = Math.max(0, Math.min(ENTRANCE_LAST_FRAME, G.rawTime - G.stateT));
  const zoom = storyZoom(t);
  ctx.save();
  if (t >= E.brake && t < E.stop) {
    const force = 1 - smooth((t - E.brake) / (E.stop - E.brake));
    ctx.translate(Math.round(Math.sin(t * 2.15) * 1.7 * force), Math.round(Math.cos(t * 1.7) * .7 * force));
  }
  if (t >= E.stop && t < E.stop + 16) {
    const force = 1 - (t - E.stop) / 16;
    ctx.translate(Math.round(Math.sin(t * 2.7) * 3 * force), Math.round(Math.cos(t * 2.1) * 1.6 * force));
  }
  ctx.translate(205, 166);
  ctx.scale(zoom, zoom);
  ctx.translate(-205, -166);
  if (!options.subjectOnly) {
    drawStage(ctx, 0);
    ctx.fillStyle = 'rgba(7,4,8,.13)';
    ctx.fillRect(0, 0, W, H);
  }

  const rig = rigPosition(t);
  if (t >= E.ride) {
    headlight(ctx, t, rig.x);
    skidTrail(ctx, t);
    if (t < E.stop + 4) drawRig(ctx, heroFrameFor(t), rig.x, rig.y, rig.angle);
    else drawFrame(ctx, BIKE, BIKE_X, GROUND);
    if (t >= E.hero) drawPlayer(ctx, G.player, 0);
    if (t < E.brake) exhaustPuff(ctx, (t - E.ride) % 28, rig.x - 47, GROUND - 8);
    dustBurst(ctx, t - E.stop, BIKE_X);
    cigarSmokeTrail(ctx, t);
    crackAccent(ctx, t, HERO_X + 6, HERO_Y - 52);
  }
  ctx.restore();

  if (!options.subjectOnly) {
    let bar = 18;
    if (t >= E.bars) bar = Math.round(18 * (1 - smooth((t - E.bars) / (E.last - E.bars))));
    ctx.fillStyle = '#09060c';
    ctx.fillRect(0, 0, W, bar);
    ctx.fillRect(0, H - bar, W, bar);
    if (t < E.bars) drawActStamp(ctx, t - STAMP_AT, G.stage.name, G.stage.sub);
  }

  if (options.guides) {
    ctx.save();
    ctx.strokeStyle = 'rgba(101,199,232,.8)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(0, GROUND + .5); ctx.lineTo(W, GROUND + .5); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,212,92,.85)';
    ctx.beginPath(); ctx.moveTo(BIKE_X + .5, 20); ctx.lineTo(BIKE_X + .5, H - 20); ctx.stroke();
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
