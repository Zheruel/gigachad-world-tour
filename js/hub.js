// hub.js - THE LAIR: CHAD's penthouse, the room you walk around between acts. 1440
// logical px, three screens wide, in 90s neon over old-money walnut and brass.
//
// It is a normal stage definition with no waves, fed to initStageObj(), so the player,
// the camera, the y-sorted draw and the arena walls all come from the existing
// machinery.
//
// Nothing in the room is painted into the plate. Wall-mounted and wall-standing things
// are drawn here in the wall plane, before drawWorld, so CHAD occludes all of them and
// none of them is a combat target; the heavy bag is an ordinary G.props entry; the dog
// and the tiger go on G.actors so drawWorld y-sorts them with everybody else.
//
// The glass is a HOLE. tools/build_lair_wide.py keys the window out of the plate, so
// the city shows through it as TWO layers at different parallax - bg_lair_sky_far and
// bg_lair_sky_near - with lairCity() painting the sun, the mast beacons, the lit
// windows and the airship between them. Nothing behind glass could move while the view
// was painted into the wall, and one flat layer had no depth.
//
// Every x below is measured off assets/bg_lair_wall.png, which tools/gen_lair_room5.sh
// generates as three panels with those zones in them by name. Regenerating the plate
// without keeping the zones puts every fixture on the wrong bit of wall.
import { G, W, H, METER_MAX, addMeter, clamp, rand, irand } from './engine.js';
import { Pix, frameW, frameH, blit, drawTextShadow, textWidth } from './sprites.js';
import { ASSETS } from './assets.js';
import { STAGES } from './stages.js';
import { BOSSES } from './bosses.js';
import { input } from './input.js';
import { spawnPop, spawnSmoke, spawnSpark } from './effects.js';
import { CHAPTERS, openPanel, updateHubPanel, drawHubPanel } from './hubpanels.js';

export { CHAPTERS };

const FLOOR_Y = 181;
export const HUB_WIDTH = 1440;
const WALL_BASE = 191;     // where something standing against the back wall has its feet
const REACH = 40;          // how close you stand before a fixture is the active one
const CEIL_MOUNT = 20;     // the window head beam, which is what the bag hangs off

// The plate's zones, in logical x, measured off the built plate. The room reads as
// three places rather than a shelf of objects: THE LOUNGE (bar, tank, sofa under the
// picture light), TROPHIES AND MEDIA (alcove between two media walls), THE VIEW.
const BAR = [0, 132];
const TANK = { x: 150, y: 41, w: 150, h: 114 };     // the lit water, not the frame
const ALCOVE = [629, 747];                          // niche interior
const WINDOW = [922, 1294];                         // the opening build_lair_wide.py leaves
// The glass, and the gilt frame around it. Two rects because the glint clips to the
// glass and the select bracket goes round the frame; one rect used for both was 14px
// left and 24px too tall, and the bracket floated off the mirror entirely.
const MIRROR = { x: 1351, y: 59, w: 43, h: 90 };
const MIRROR_FRAME = [1344, 50, 57, 103];

// ------------------------------------------------------------------ fixtures
// x is where you stand. Nearest within REACH wins, so keep them >= 2*REACH apart.
export const BAG_X = 990;
export const FIXTURES = [
  { id: 'bar', x: 60, hint: 'POUR ONE' },
  { id: 'tank', x: 225, hint: 'FEED THEM' },
  { id: 'lounge', x: 395, hint: 'SIT AND SMOKE' },
  { id: 'trophies', x: 688, hint: 'TROPHY WALL' },
  { id: 'map', x: 800, hint: 'WORLD TOUR' },
  { id: 'hifi', x: 880, hint: 'SOUND TEST' },
  { id: 'bag', x: BAG_X, hint: 'WORK THE BAG', key: 'Z' },
  { id: 'curl', x: 1075, hint: 'PUMP IRON' },
  { id: 'bench', x: 1190, hint: 'BENCH PRESS' },
  { id: 'mirror', x: 1372, hint: 'FLEX' },
];
const fixtureAt = (id) => FIXTURES.find((f) => f.id === id);

// The two gym stations. Each is one sprite set built by tools/build_lair_extras.py from
// a single generated strip: the rig alone, then three poses of CHAD using it. Because
// they come off one strip they already agree on where the equipment is, so swapping
// _empty for a pose cannot make the rig jump. Same idea as the lounge sofa, without the
// two-generations problem that one has.
// loop is the pose order one rep runs through, after frame _0 sets him up: the curl goes
// down-half-up-half, the bench only ever travels between his chest and lockout because
// _0 is the bar still sitting on the posts.
// x is where the ART is centred, which is not where you stand: the sprite holds the rig
// AND the man, so it is offset until the drawn CHAD lands on the fixture's x. y is
// WALL_BASE plus the overhang build_lair_extras.py prints - his boots are in front of
// the equipment and hang below its floor line. ring hugs the rig, not the man, because
// that is all there is to point at when nobody is on it.
const RIGS = [
  { id: 'curl', art: 'lair_gym_curl', x: 1092, y: WALL_BASE + 8, rate: 11, loop: [1, 2, 1, 0],
    ring: [-35, -50, 74, 46] },
  { id: 'bench', art: 'lair_gym_bench', x: 1178, y: WALL_BASE + 3, rate: 16, loop: [1, 2],
    ring: [-48, -68, 80, 70] },
];
const rigAt = (id) => RIGS.find((r) => r.id === id);

// _empty unless he is on it; then _0 while he sets up and the loop after that.
function rigFrame(r) {
  if (G.hubStation !== r.id) return r.art + '_empty';
  const t = G.hubSeat - r.rate * 2;
  if (t < 0) return r.art + '_0';
  return r.art + '_' + r.loop[((t / r.rate) | 0) % r.loop.length];
}

// Sprites in the wall plane. Sizes mirror LAIR in tools/process_props.py; y is the
// bottom edge and art is centred on x.
const LAIR_ART = [
  // the lounge: stools at the painted bar, the portrait under its picture light
  { art: 'lair_bar_stools', x: 92, y: WALL_BASE, w: 46, h: 40 },
  { art: 'lair_portrait', x: 395, y: 140, w: 106, h: 84 },
  { art: 'lair_humidor', x: 485, y: WALL_BASE, w: 33, h: 88 },
  // trophies and media. The arcade cabinet is decor now - its attract loop still runs,
  // but HALL OF PAIN is gone and its records live on the trophy wall.
  { art: 'lair_arcade', x: 555, y: WALL_BASE, w: 34, h: 68 },
  { art: 'lair_gloves', x: 604, y: 128, w: 20, h: 30 },
  { art: 'lair_worldmap', x: 800, y: 112, w: 86, h: 48 },
  { art: 'lair_hifi', x: 880, y: WALL_BASE, w: 48, h: 60 },
  // the view: the whole run of glass is the gym. The two stations are in RIGS; these
  // are the kit standing between them.
  { art: 'lair_gym_kettles', x: 945, y: WALL_BASE, w: 56, h: 26 },
  { art: 'lair_gym_plates', x: 1250, y: WALL_BASE, w: 34, h: 56 },
];
// The lounge is a pair: the same sofa empty and with CHAD sitting in it, registered on
// the sofa's own foot by tools/build_lair_extras.py. His boots hang below the sofa
// legs, which is why the canvas bottom sits a little in front of the wall base.
const LOUNGE = { x: 395, y: WALL_BASE + 9, w: 141, h: 63 };

// ------------------------------------------------------- fixture art fallback
// Only ever seen if assets/lair/*.png are missing. Flat but readable, so a failed
// asset load shows furniture rather than an empty wall.
const FALLBACK = {};
function fallbackArt(name, w, h) {
  if (FALLBACK[name]) return FALLBACK[name];
  const P = new Pix(w, h);
  const panel = (col, edge) => {
    P.rect(0, 0, w, h, '#0c0c14');
    P.rect(1, 1, w - 2, h - 2, col);
    P.rect(1, 1, w - 2, 1, edge);
  };
  if (name === 'lair_worldmap') {
    panel('#0e1a34', '#4a6a9e');
    for (let i = 0; i < 90; i++) P.px(irand(4, w - 5), irand(4, h - 5), '#2e6aa8');
  } else if (name === 'lair_portrait') {
    panel('#3a2a12', '#c8a038');
    P.rect(6, 6, w - 12, h - 12, '#2a1a12');
    P.disc(w / 2, h * 0.4, 10, '#c89a68');
  } else if (name === 'lair_gloves') {
    P.disc(w * 0.3, h * 0.6, w * 0.28, '#8a2028');
    P.disc(w * 0.7, h * 0.6, w * 0.28, '#8a2028');
    P.rect(w * 0.45, 0, 2, h * 0.4, '#c8a038');
  } else if (name === 'lair_bar_stools') {
    panel('#3a2214', '#8a5a2a');
    P.rect(0, 2, w, 4, '#c8bca8');
  } else if (name === 'lair_arcade') {
    panel('#141018', '#3a3a4a');
    P.rect(3, 3, w - 6, 4, '#d838a0');
    P.rect(3, h * 0.16, w * 0.6, h * 0.28, '#05050a');
  } else if (name === 'lair_hifi') {
    panel('#101018', '#3a3a4a');
    for (let y = 6; y < h - 8; y += 9) P.rect(3, y, w * 0.5, 6, '#1a1a24');
  } else if (name.startsWith('lair_gym_')) {
    P.rect(0, h - 5, w, 4, '#2a2a34');
    P.rect(0, h * 0.4, w, 3, '#2a2a34');
    for (let i = 0; i < 5; i++) P.disc(8 + i * (w - 16) / 4, h * 0.34, 4, '#3a3a46');
  } else if (name === 'lair_humidor') {
    panel('#3a2214', '#8a5a2a');
    P.rect(4, 6, w - 8, h - 14, '#5a3a1e');
  } else if (name === 'lair_bag_chain') {
    for (let y = 0; y < h; y += 3) P.rect(w / 2 - 1, y, 2, 2, (y / 3) & 1 ? '#7a7488' : '#3e3a4c');
  } else if (name === 'lair_lounge_empty' || name === 'lair_lounge_chad') {
    P.rect(0, h * 0.28, w * 0.78, h * 0.6, '#1a1620');
    P.rect(w * 0.86, h * 0.28, w * 0.1, h * 0.12, '#5a3420');
    if (name === 'lair_lounge_chad') P.rect(w * 0.3, 0, 20, h * 0.5, '#c89a68');
  } else {
    panel('#16161e', '#3a3a4a');
  }
  P.c._as = 1;   // code art is authored at 1 logical px
  FALLBACK[name] = P.c;
  return P.c;
}

const artFor = (d) => ASSETS[d.art] || fallbackArt(d.art, d.w, d.h);
const artAt = (name) => LAIR_ART.find((d) => d.art === name);

// ------------------------------------------------------------ procedural room
// Only ever seen if assets/bg_lair_*.png are missing. A plain version of the same room
// laid out in the same zones, so a missing plate keeps every fixture on a wall.
function buildLairFar() {
  const P = new Pix(HUB_WIDTH, FLOOR_Y);
  const HORIZON = 128;
  for (let y = 0; y < FLOOR_Y; y++) {
    const t = Math.min(1, y / HORIZON);
    P.rect(0, y, HUB_WIDTH, 1, `rgb(${26 + t * t * 230 | 0},${16 + t * 90 | 0},${48 + t * 70 | 0})`);
  }
  for (let x = -10; x < HUB_WIDTH; x += 52) {
    const h = irand(46, 104), top = HORIZON - h;
    P.rect(x, top, 40, h + 12, '#1e1030');
    for (let wy = top + 6; wy < HORIZON; wy += 8) {
      for (let wx = x + 4; wx < x + 36; wx += 7) {
        if (Math.random() < 0.42) P.rect(wx, wy, 3, 3, Math.random() < 0.3 ? '#ffd06a' : '#8ad0ff');
      }
    }
  }
  P.rect(0, HORIZON + 12, HUB_WIDTH, FLOOR_Y - HORIZON - 12, '#140c22');
  return P.c;
}

// Only the window zone is left transparent, so the skyline shows through exactly where
// the plate puts glass.
function buildLairMid() {
  const P = new Pix(HUB_WIDTH, FLOOR_Y);
  const CEIL = 18, BASE = 157;
  const wood = (x, y, w, h) => {
    P.rect(x, y, w, h, '#2a1a10');
    for (let i = 0; i < w; i += 7) P.vline(x + i, y, y + h - 1, i % 14 ? '#32200f' : '#1e1208');
    P.rect(x, y, w, 1, '#7a5226');
  };
  wood(0, 0, HUB_WIDTH, CEIL);
  wood(0, BASE, HUB_WIDTH, FLOOR_Y - BASE);
  wood(0, CEIL, WINDOW[0], BASE - CEIL);
  wood(WINDOW[1], CEIL, HUB_WIDTH - WINDOW[1], BASE - CEIL);
  P.rect(BAR[0], 120, BAR[1] - BAR[0], 40, '#3a2214');
  P.rect(TANK.x, TANK.y, TANK.w, TANK.h, '#12506e');
  // the alcove, with its three shelves where SHELVES says they are
  P.rect(ALCOVE[0] - 4, 35, ALCOVE[1] - ALCOVE[0] + 8, 104, '#0a0810');
  for (const shelf of SHELVES) {
    P.rect(ALCOVE[0], shelf.y - 2, ALCOVE[1] - ALCOVE[0], 3, '#c89a4a');
  }
  P.rect(MIRROR.x, MIRROR.y, MIRROR.w, MIRROR.h, '#2a2634');
  for (let x = WINDOW[0]; x < WINDOW[1]; x += 60) P.rect(x, CEIL, 4, BASE - CEIL, '#12121a');
  P.rect(0, CEIL - 2, HUB_WIDTH, 2, '#6ad8ff');
  P.rect(0, BASE, HUB_WIDTH, 2, '#ff4aa8');
  return P.c;
}

function buildLairFloor() {
  const P = new Pix(160, H - FLOOR_Y);
  const h = H - FLOOR_Y;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    P.rect(0, y, 160, 1, `rgb(${16 + t * 14 | 0},${14 + t * 12 | 0},${22 + t * 16 | 0})`);
  }
  for (let y = 4; y < h; y += 11) P.hline(0, 159, y, 'rgba(150,170,210,0.07)');
  for (let i = 0; i < 220; i++) {
    P.px(irand(0, 159), irand(0, h - 1), Math.random() < 0.5 ? '#2a2836' : '#3c3a4c');
  }
  P.rect(0, 0, 160, 2, 'rgba(0,0,0,0.55)');
  P.rect(0, 3, 160, 1, 'rgba(190,210,240,0.22)');
  return P.c;
}

// ----------------------------------------------------------------- the city
// Drawn between the sky plate and the wall, so the mullions cross it. The sun's height
// is the tour's progress rather than a free-running clock: a day cycle would put the
// sun high while lairAmbient's dusk wash had the room at midnight.
const FAR_PAR = 0.20, NEAR_PAR = 0.42;
const SUN_X = 470;         // in the far layer's parallax space, not the room's
const PLANE_PERIOD = 1500;

// Fixed positions in far-layer space, so a light never jumps when the camera moves.
// Beacons sit on the tall masts, the airship crosses above the skyline.
const BEACONS = [];
for (let i = 0; i < 9; i++) {
  BEACONS.push({ x: rand(20, 940), y: rand(52, 104), period: irand(46, 96), phase: irand(0, 90) });
}
const WINDOWS = [];
for (let i = 0; i < 70; i++) {
  WINDOWS.push({ x: rand(10, 950), y: rand(96, 158), period: irand(90, 380), phase: irand(0, 400) });
}

const dusk = () => clamp(G.unlockedStage / Math.max(1, STAGES.length - 1), 0, 1);

// Where the sun ended up this frame, so lairAmbient can put its glare back on top of
// the dusk wash. The wash is 40% dark purple over the whole window and it flattens the
// brightest thing in the frame into a beige disc.
const sunPos = { x: -999, y: 0 };

function lairCity(ctx, camX) {
  const d = dusk();
  const x = Math.round(SUN_X - camX * FAR_PAR);
  const y = Math.round(58 + d * 74 + Math.sin(G.rawTime * 0.0016) * 3);
  sunPos.x = x;
  sunPos.y = y;

  if (x > -90 && x < W + 90) {
    // The plate's sky is already burning magenta and gold, so a pale disc with haze
    // bands laid over it reads as a golf ball stuck on the city. This is the synthwave
    // sun instead: white-hot at the top falling to deep orange, with the bands CUT out
    // of it rather than painted on, widening towards the bottom.
    const R = 17;
    const bloom = ctx.createRadialGradient(x, y, 4, x, y, 86);
    bloom.addColorStop(0, `rgba(255,214,120,${0.62 - d * 0.22})`);
    bloom.addColorStop(0.28, `rgba(255,140,50,${0.30 - d * 0.12})`);
    bloom.addColorStop(1, 'rgba(226,60,110,0)');
    ctx.fillStyle = bloom;
    ctx.fillRect(x - 86, y - 86, 172, 172);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.clip();
    const face = ctx.createLinearGradient(0, y - R, 0, y + R);
    face.addColorStop(0, '#fff6d2');
    face.addColorStop(0.45, '#ffc258');
    face.addColorStop(1, '#f0562e');
    ctx.fillStyle = face;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
    // Bands widening towards the bottom. Painted, not cut with destination-out: the sky
    // is already in this canvas, so erasing takes the city out with the sun.
    ctx.fillStyle = 'rgba(84,24,88,0.72)';
    for (let i = 0, by = y + 1; by < y + R; i++) {
      ctx.fillRect(x - R, Math.round(by), R * 2, Math.min(1 + i * 0.7, 4));
      by += 3 + i;
    }
    ctx.restore();
  }

  // The city is awake: mast beacons on their own periods, windows going on and off,
  // an airship crossing above the skyline and an aircraft below it. All in far-layer
  // space, so the near towers pass in front of them.
  const fx = camX * FAR_PAR;
  for (const b of BEACONS) {
    const bx = b.x - fx;
    if (bx < 0 || bx > W) continue;
    if ((G.rawTime + b.phase) % b.period > b.period * 0.4) continue;
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(Math.round(bx), Math.round(b.y), 1, 1);
    ctx.fillStyle = 'rgba(255,90,74,0.35)';
    ctx.fillRect(Math.round(bx) - 1, Math.round(b.y) - 1, 3, 3);
  }
  ctx.fillStyle = 'rgba(255,226,170,0.75)';
  for (const w of WINDOWS) {
    const wx = w.x - fx;
    if (wx < 0 || wx > W) continue;
    if ((G.rawTime + w.phase) % w.period > w.period * 0.5) continue;
    ctx.fillRect(Math.round(wx), Math.round(w.y), 1, 1);
  }

  // an airship, very slow, once every couple of minutes
  const at = G.rawTime % 7200;
  if (at < 2600) {
    const ax = -30 + (at / 2600) * (W + 200) - fx * 0.5;
    const ay = 62 + Math.sin(at * 0.002) * 4;
    if (ax > -20 && ax < W + 20) {
      ctx.fillStyle = '#3a2a4e';
      ctx.beginPath();
      ctx.ellipse(ax, ay, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = (at >> 5) & 1 ? '#ffd06a' : '#8a6a3a';
      ctx.fillRect(Math.round(ax) - 5, Math.round(ay), 10, 1);
    }
  }

  // one aircraft crossing the city, right to left, every ~25 seconds
  const pt = G.rawTime % PLANE_PERIOD;
  if (pt < 620) {
    const px = W + 40 - (pt / 620) * (W + 90) - fx * 0.2;
    if (px > 0 && px < W) {
      ctx.fillStyle = (pt >> 4) & 1 ? '#ff6a6a' : '#f8f0e0';
      ctx.fillRect(Math.round(px), Math.round(40 + Math.sin(pt * 0.004) * 3), 1, 1);
    }
  }
}

// ------------------------------------------------------------------- ambient
// The plate is a still. Everything that makes the room feel occupied is painted over
// it here: the light off the water, dust in the sun, and neon that is not quite steady.
function lairAmbient(ctx, camX) {
  const wx0 = WINDOW[0] - camX, ww = WINDOW[1] - WINDOW[0];
  const d = dusk();

  // The city plate is bright and very busy. A floor of darkening keeps CHAD reading
  // against it even on a fresh run, and the rest of the ramp is the tour's progress.
  ctx.fillStyle = `rgba(24,10,52,${0.20 + d * 0.30})`;
  ctx.fillRect(wx0, 0, ww, FLOOR_Y);

  // The sun is behind that wash and comes out beige. This is its glare coming back
  // through the glass, which also washes over the mullions the way real glare does.
  if (sunPos.x > wx0 - 90 && sunPos.x < wx0 + ww + 90) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx0, 0, ww, FLOOR_Y);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const glare = ctx.createRadialGradient(sunPos.x, sunPos.y, 2, sunPos.x, sunPos.y, 78);
    glare.addColorStop(0, `rgba(255,214,132,${0.50 - d * 0.14})`);
    glare.addColorStop(0.22, `rgba(226,120,48,${0.20 - d * 0.06})`);
    glare.addColorStop(1, 'rgba(180,40,90,0)');
    ctx.fillStyle = glare;
    ctx.fillRect(sunPos.x - 78, sunPos.y - 78, 156, 156);
    ctx.restore();
  }

  for (const g of (G.stage.glows || [])) {
    const sx = g.x - camX, r = g.r || 30;
    if (sx < -r || sx > W + r) continue;
    const grad = ctx.createRadialGradient(sx, g.y, 2, sx, g.y, r);
    grad.addColorStop(0, `rgba(${g.col || '140,220,255'},${g.a || 0.18})`);
    grad.addColorStop(1, `rgba(${g.col || '140,220,255'},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(sx - r, g.y - r, r * 2, r * 2);
  }

  drawCaustics(ctx, camX);

  // sunset coming in flat through the window only, fading as the tour goes on
  const sun = ctx.createLinearGradient(0, 50, 0, FLOOR_Y + 30);
  sun.addColorStop(0, `rgba(255,150,90,${0.16 * (1 - d * 0.7)})`);
  sun.addColorStop(1, 'rgba(255,150,90,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(wx0, 50, ww, FLOOR_Y - 20);

  // the plate already paints the base neon, so this is only the flicker on top of it
  const flick = 0.06 + Math.sin(G.rawTime * 0.09) * 0.02 + (G.rawTime % 430 < 4 ? -0.05 : 0);
  const seam = ctx.createLinearGradient(0, FLOOR_Y - 6, 0, FLOOR_Y + 16);
  seam.addColorStop(0, `rgba(255,74,168,${Math.max(0, flick)})`);
  seam.addColorStop(1, 'rgba(255,74,168,0)');
  ctx.fillStyle = seam;
  ctx.fillRect(0, FLOOR_Y - 6, W, 22);

  // dust, brighter where the sun crosses it
  for (const m of G.motes) {
    const sx = m.x - camX;
    if (sx < 0 || sx > W) continue;
    if ((m.tw + G.rawTime >> 4) & 1) continue;
    const inSun = m.x > WINDOW[0] && m.x < WINDOW[1];
    ctx.fillStyle = inSun ? 'rgba(255,210,170,0.62)' : 'rgba(200,230,255,0.34)';
    ctx.fillRect(Math.round(sx), Math.round(m.y), 1, 1);
  }
}

// What makes a tank read as a light source rather than a picture on the wall.
function drawCaustics(ctx, camX) {
  const cx = TANK.x + TANK.w / 2 - camX;
  if (cx < -160 || cx > W + 160) return;
  const spread = TANK.w * 0.9;
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const t = G.rawTime * 0.006 + i * 1.7;
    const y = FLOOR_Y + 8 + i * 13;
    const off = Math.sin(t) * 14;
    ctx.fillStyle = `rgba(90,200,230,${0.09 - i * 0.013})`;
    ctx.fillRect(Math.round(cx - spread / 2 + off), y, Math.round(spread), 3);
  }
  const g = ctx.createRadialGradient(cx, FLOOR_Y, 4, cx, FLOOR_Y, 110);
  g.addColorStop(0, 'rgba(70,180,220,0.13)');
  g.addColorStop(1, 'rgba(70,180,220,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - 110, FLOOR_Y - 40, 220, 150);
  ctx.restore();
}

export const HUB_STAGE = {
  id: 'lair', num: '0', name: 'THE LAIR', sub: 'HOME BASE', width: HUB_WIDTH,
  wallKey: 'bg_lair_wall', floorKey: 'bg_lair_floor', floorW: HUB_WIDTH,
  // far city, then everything lit that lives in it, then the near towers over the top
  skyLayers: [
    { key: 'bg_lair_sky_far', par: FAR_PAR },
    { draw: lairCity },
    { key: 'bg_lair_sky_near', par: NEAR_PAR },
  ],
  music: 'title', bossMusic: null, boss: null,
  lamps: [60, 395, 1100], lampCol: '255,140,60', lampA: 0.09,
  rim: null, grade: '150,80,220', gradeA: 0.05,
  moteCount: 34, moteStyle: 'dust',
  // the plate lights the alcove and the tank; these are only their spill on the floor
  glows: [
    { x: 60, y: 130, r: 48, col: '255,180,90', a: 0.14 },
    { x: 225, y: 150, r: 58, col: '90,200,230', a: 0.15 },
    { x: 395, y: 60, r: 44, col: '255,190,110', a: 0.13 },
    { x: 555, y: 156, r: 40, col: '216,56,160', a: 0.12 },
    { x: 688, y: 150, r: 46, col: '255,180,90', a: 0.13 },
    { x: 800, y: 92, r: 44, col: '110,190,255', a: 0.13 },
    { x: 880, y: 150, r: 38, col: '60,220,140', a: 0.10 },
  ],
  props: [], birds: [], ambience: [], emitters: [], waves: [],
  fg: [{ art: 'fg_table', x: 300, y: 278 }, { art: 'fg_lamp', x: 640, y: 284 },
    { art: 'fg_weights', x: 1128, y: 266 }],
  build: () => ({ far: buildLairFar(), mid: buildLairMid(), floor: buildLairFloor() }),
  ambient: lairAmbient,
};

// ---------------------------------------------------------------- heavy bag
// Duck-typed to the js/props.js contract: hitTargets() in player.js picks it up out of
// G.props, drawWorld y-sorts it, drawProp draws it. It has hp so nothing divides by
// zero, but hurt() never spends any.
export function createBag() {
  const bag = {
    kind: 'prop', prop: 'bag', x: BAG_X, y: 200, z: 0, vx: 0, vz: 0,
    w: 24, h: 84, shadowR: 0, reflect: true,
    // it hangs off the ceiling, not off its own collar, so that is where it pivots
    pivotY: CEIL_MOUNT,
    hp: 9999, maxhp: 9999, broken: false, dead: false,
    state: 'idle', face: 1, t: 0, flash: 0, shakeT: 0,
    swing: 0, swingV: 0, hits: 0,
    hurt(dmg, dir) {
      bag.flash = 4;
      bag.hits++;
      bag.swingV = clamp(bag.swingV + (dir || 1) * (0.0016 + dmg * 0.00012), -0.007, 0.007);
      spawnPop(bag.x, bag.y - 90, String(dmg));
      G.audio.sfx('armor');
      petsWatch(bag.x);
    },
    thrown() {},
  };
  return bag;
}

// A bag on 180px of chain is a slow pendulum. The angle is clamped rather than the
// impulse: a big hit should pin it at full travel instead of sending it round.
const SWING_MAX = 0.10;    // rad; about 18 logical px of travel at the bag's foot
function swingBag(bag) {
  if (!bag) return;
  bag.swingV += -bag.swing * 0.004;
  bag.swingV *= 0.992;
  bag.swing = clamp(bag.swing + bag.swingV, -SWING_MAX, SWING_MAX);
  if (Math.abs(bag.swing) >= SWING_MAX) bag.swingV *= 0.6;
  if (Math.abs(bag.swing) < 1e-4 && Math.abs(bag.swingV) < 1e-4) { bag.swing = 0; bag.swingV = 0; }
}

// ---------------------------------------------------------------- the tank
// The water is a clip rect, so nothing ever swims out through the glass. The shark
// laps; the shoal drifts and gets out of his way, which is free animation.
const SHOAL_N = 20;
const shark = { x: 0, dir: 1, frame: 0, t: 0 };
const shoal = [];

function resetTank() {
  shark.x = TANK.x + 30;
  shark.dir = 1;
  shark.t = 0;
  shoal.length = 0;
  for (let i = 0; i < SHOAL_N; i++) {
    shoal.push({
      x: rand(TANK.x + 8, TANK.x + TANK.w - 18),
      y: rand(TANK.y + 20, TANK.y + TANK.h - 12),
      vx: rand(-0.18, 0.18), vy: rand(-0.05, 0.05),
      // its own drift rate, or twenty fish on one sine move as one animal
      phase: rand(0, 9), rate: rand(0.03, 0.09), frame: irand(0, 3),
    });
  }
}

function updateTank() {
  shark.t++;
  shark.frame = (shark.t / 9 | 0) & 3;
  shark.x += shark.dir * 0.24;
  const lo = TANK.x + 6, hi = TANK.x + TANK.w - 6 - 46;
  if (shark.x < lo) { shark.x = lo; shark.dir = 1; }
  if (shark.x > hi) { shark.x = hi; shark.dir = -1; }

  const feeding = G.hubFeed > 0;
  const fx = TANK.x + TANK.w / 2, fy = TANK.y + 26;
  for (const f of shoal) {
    f.phase += f.rate;
    if (feeding) {
      // ball up under the food
      f.vx += (fx + Math.cos(f.phase) * 9 - f.x) * 0.004;
      f.vy += (fy + Math.sin(f.phase) * 7 - f.y) * 0.004;
    } else {
      f.vy += Math.sin(f.phase) * 0.008;
      f.vx += Math.cos(f.phase * 0.7) * 0.006;
      // and get out of the shark's way
      const d = f.x - (shark.x + 23);
      if (Math.abs(d) < 22) f.vx += Math.sign(d || 1) * 0.024;
    }
    f.vx = clamp(f.vx * 0.97, -0.5, 0.5);
    f.vy = clamp(f.vy * 0.97, -0.35, 0.35);
    f.x += f.vx;
    f.y += f.vy;
    if (f.x < TANK.x + 6) { f.x = TANK.x + 6; f.vx = Math.abs(f.vx); }
    if (f.x > TANK.x + TANK.w - 14) { f.x = TANK.x + TANK.w - 14; f.vx = -Math.abs(f.vx); }
    if (f.y < TANK.y + 8) { f.y = TANK.y + 8; f.vy = Math.abs(f.vy); }
    if (f.y > TANK.y + TANK.h - 10) { f.y = TANK.y + TANK.h - 10; f.vy = -Math.abs(f.vy); }
    if (Math.abs(f.vx) > 0.02) f.frame = ((f.phase * 3) | 0) & 3;
  }
}

function drawTank(ctx, camX) {
  const l = Math.round(TANK.x - camX);
  if (l > W || l + TANK.w < 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(l, TANK.y, TANK.w, TANK.h);
  ctx.clip();

  if (G.hubFeed > 0 && G.hubFeed > 100) {
    ctx.fillStyle = '#c8a060';
    for (let i = 0; i < 6; i++) {
      const t = (150 - G.hubFeed) * 0.9 + i * 4;
      ctx.fillRect(Math.round(l + TANK.w / 2 - 8 + i * 3), Math.round(TANK.y + 2 + t), 1, 1);
    }
  }

  for (const f of shoal) {
    const img = ASSETS['lair_shoal_' + f.frame];
    if (!img) break;
    const flip = f.vx < 0;
    const fx = Math.round(f.x - camX), fy = Math.round(f.y);
    if (flip) {
      ctx.save();
      ctx.scale(-1, 1);
      blit(ctx, img, -fx - frameW(img), fy);
      ctx.restore();
    } else {
      blit(ctx, img, fx, fy);
    }
  }

  const simg = ASSETS['lair_shark_' + shark.frame];
  if (simg) {
    const sx = Math.round(shark.x - camX);
    const sy = Math.round(TANK.y + 24 + Math.sin(shark.t * 0.012) * 5);
    if (shark.dir < 0) {
      ctx.save();
      ctx.scale(-1, 1);
      blit(ctx, simg, -sx - frameW(simg), sy);
      ctx.restore();
    } else {
      blit(ctx, simg, sx, sy);
    }
  }

  // the water in front of everything in it
  ctx.fillStyle = 'rgba(40,150,200,0.16)';
  ctx.fillRect(l, TANK.y, TANK.w, TANK.h);
  const shimmer = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
  shimmer.addColorStop(0, 'rgba(180,240,255,0.20)');
  shimmer.addColorStop(1, 'rgba(180,240,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(l, TANK.y, TANK.w, TANK.h);
  ctx.restore();
}

// ---------------------------------------------------------------- the pets
// Neither is a prop (nothing can hit them) and neither is an enemy, so they go on
// G.actors, which drawWorld y-sorts by calling whatever the entry's own draw() says.
// The tiger is white because the room is walnut and black granite: the doberman
// already half vanishes in the unlit stretches.
function makePet(prefix, x, speed, rest, frames) {
  return { prefix, x, y: 226, face: 1, state: 'rest', t: 0, target: x, frame: 0,
    phase: 0, speed, rest, frames, alert: 0 };
}
const dog = makePet('dog', 250, 0.62, 'sit', 6);
const tiger = makePet('tiger', 1290, 0.42, 'lie', 6);
const PETS = [dog, tiger];
const PET_GAP = 70;    // they will stand inside each other without this

// Something happened over there: both look, and the closer one goes to watch.
export function petsWatch(x, urgency) {
  for (const p of PETS) {
    p.alert = Math.max(p.alert, urgency === undefined ? 150 : urgency);
    if (Math.abs(p.x - x) > 190) continue;
    p.target = clamp(x + (p.x < x ? -56 : 56), 90, HUB_WIDTH - 90);
    p.state = 'walk';
    p.t = 0;
  }
  separate();
}

// they bolt for opposite ends when the room goes up
function petsScatter() {
  dog.target = 140;
  tiger.target = HUB_WIDTH - 140;
  for (const p of PETS) { p.state = 'walk'; p.t = 0; p.alert = 0; }
}

function separate() {
  if (Math.abs(dog.target - tiger.target) < PET_GAP) {
    tiger.target = clamp(tiger.target + PET_GAP, 90, HUB_WIDTH - 90);
  }
}

function updatePet(p) {
  p.t++;
  if (p.alert > 0) p.alert--;
  const player = G.player;
  if (p.state === 'rest') {
    p.face = player.x < p.x ? -1 : 1;
    if (p.t > 300 && Math.random() < 0.008) {
      p.target = clamp(player.x + rand(-200, 200), 90, HUB_WIDTH - 90);
      p.state = 'walk';
      p.t = 0;
      separate();
    }
    return;
  }
  const dx = p.target - p.x;
  if (Math.abs(dx) < 3) { p.state = 'rest'; p.t = 0; return; }
  p.face = dx < 0 ? -1 : 1;
  p.x += Math.sign(dx) * p.speed;
  p.y += (clamp(player.y + 14, 214, 238) - p.y) * 0.02;
  p.phase += p.speed;
  p.frame = (p.phase / 5 | 0) % p.frames;
}

function drawPet(ctx, camX, p) {
  // resting is the lying pose unless something has its attention, then it sits up
  const pose = p.state === 'rest' ? (p.alert > 0 ? 'sit' : p.rest) : String(p.frame);
  const img = ASSETS[`lair_${p.prefix}_${pose}`] || ASSETS[`lair_${p.prefix}_${p.rest}`];
  if (!img) return;
  const w = frameW(img), h = frameH(img);
  const x = Math.round(p.x - camX), y = Math.round(p.y);
  if (x + w < -20 || x - w > W + 20) return;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.38, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the art faces right, so -1 is the one that needs flipping
  if (p.face === -1) {
    ctx.save();
    ctx.scale(-1, 1);
    blit(ctx, img, -x - w / 2, y - h);
    ctx.restore();
  } else {
    blit(ctx, img, x - w / 2, y - h);
  }
}

// G.actors entries draw themselves; y is what drawWorld sorts on.
const petActors = PETS.map((p) => ({
  get y() { return p.y; },
  reflect: true,
  draw: (ctx, camX) => drawPet(ctx, camX, p),
}));

// --------------------------------------------------------------- update
export function resetHub() {
  dog.x = 250; dog.y = 226; dog.state = 'rest'; dog.t = 0; dog.face = 1; dog.alert = 0;
  tiger.x = 1290; tiger.y = 232; tiger.state = 'rest'; tiger.t = 0; tiger.face = -1; tiger.alert = 0;
  resetTank();
  G.actors = petActors.slice();
  G.hubSeat = 0;
  G.hubStation = null;
  G.hubReps = 0;
  G.hubFlex = 0;
  G.hubFeed = 0;
  G.hubSel = null;
  G.hubPanel = null;
}

// Returns the global stage index the player just committed to, or -1.
export function updateHub() {
  swingBag(G.props[0]);
  updateTank();
  for (const p of PETS) updatePet(p);
  if (G.hubRelicT > 0) G.hubRelicT--;
  if (G.hubFeed > 0) G.hubFeed--;
  if (G.hubFlex > 0 && --G.hubFlex === 0) G.player.state = 'idle';
  if (G.hubDrink > 0 && --G.hubDrink === 0) G.player.state = 'idle';
  // the combo pulls them in, and RAGNAROK sends them to opposite ends of the room
  if (G.combo >= 6 && G.combo % 6 === 0) petsWatch(G.player.x, 220);
  if (G.player.state === 'special' && G.player.t === 1) petsScatter();

  // He is on the sofa or under a bar: input is frozen, the player sprite is hidden and
  // the furniture is drawing him. main.js already gates all of that on hubSeat.
  if (G.hubSeat > 0) {
    G.hubSeat++;
    const rig = rigAt(G.hubStation);
    if (rig) countRep(rig);
    // cigar smoke, from where his hand is in the seated art
    else if (G.hubSeat % 22 === 0) spawnSmoke(LOUNGE.x + 6, LOUNGE.y - 58, 1);
    if (G.hubSeat > 24 && anyKey()) {
      G.hubSeat = 0;
      G.hubStation = null;
      G.audio.sfx('blip');
    }
    return -1;
  }

  if (G.hubPanel) return updateHubPanel();

  const p = G.player;
  let sel = null, best = REACH;
  for (const f of FIXTURES) {
    const d = Math.abs(p.x - f.x);
    if (d < best) { best = d; sel = f.id; }
  }
  G.hubSel = sel;

  // the bag is punched, not opened; everything else is a panel or a short action
  if (sel && sel !== 'bag' && input.pressed('up') && !G.hubFlex && !G.hubDrink) {
    if (sel === 'mirror') {
      pose(96);
      G.hubFlex = 96;
    } else if (sel === 'bar') {
      pose(72);
      G.hubDrink = 72;
      spawnPop(p.x, p.y - 100, 'AAAH');
    } else if (sel === 'lounge' || rigAt(sel)) {
      G.hubSeat = 1;
      G.hubStation = sel;
      G.hubReps = 0;
      G.audio.sfx('blip');
      petsWatch(fixtureAt(sel).x - 40);
    } else if (sel === 'tank') {
      G.hubFeed = 150;
      G.audio.sfx('blip');
      spawnPop(TANK.x + TANK.w / 2, TANK.y - 6, 'CHOW');
    } else {
      openPanel(sel);
    }
  }
  return -1;
}

const anyKey = () => ['back', 'attack', 'jump', 'parry', 'up', 'down', 'left', 'right']
  .some((a) => input.pressed(a));

// A rep lands when the pose loop wraps. Meter is the point of the gym: it is the only
// way besides the bag to walk into the next act with RAGNAROK already loaded.
function countRep(rig) {
  const t = G.hubSeat - rig.rate * 2;
  if (t < 0 || t % (rig.rate * rig.loop.length) !== 0) return;
  G.hubReps++;
  addMeter(2);
  G.audio.sfx('armor');
  if (G.hubReps === 1) petsWatch(rig.x, 200);
  if (G.hubReps % 5 === 0) spawnPop(rig.x, 150, repCount(G.hubReps));
}

const repCount = (n) => n + (n === 1 ? ' REP' : ' REPS');

// The only pose CHAD has that holds still and ignores input. Both the mirror flex and
// the drink at the bar borrow it; hub.js owns when it ends.
function pose(frames) {
  G.player.state = 'victory';
  G.player.t = 0;
  G.player.face = 1;
  G.audio.sfx('blip');
  return frames;
}

// --------------------------------------------------------------- draw
// Fixtures are wall, so this runs between drawStage and drawWorld - walk in front of
// one and you occlude it.
export function drawHubWall(ctx, camX) {
  drawAlcove(ctx, camX);
  drawTank(ctx, camX);

  for (const d of LAIR_ART) drawFixtureArt(ctx, camX, d, artFor(d));
  drawFixtureArt(ctx, camX, LOUNGE, artFor({
    art: G.hubStation === 'lounge' ? 'lair_lounge_chad' : 'lair_lounge_empty',
    w: LOUNGE.w, h: LOUNGE.h,
  }));
  for (const r of RIGS) drawFixtureArt(ctx, camX, r, artFor({ art: rigFrame(r), w: 100, h: 60 }));

  drawMirrorGlint(ctx, camX);
  drawArcadeScreen(ctx, camX);
  drawHifiMeters(ctx, camX);
  drawMapPins(ctx, camX);
  drawBagChain(ctx, camX);
  drawSelectRing(ctx, camX);
}

// Anything standing on the granite gets the same treatment the fighters get in
// drawWorld; a cabinet with no contact and no reflection reads as a sticker.
function drawFixtureArt(ctx, camX, d, img) {
  const x = Math.round(d.x - camX - frameW(img) / 2);
  if (x > W || x + frameW(img) < 0) return;
  const top = Math.round(d.y - frameH(img));
  if (d.y >= WALL_BASE) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + frameW(img) / 2, d.y, frameW(img) * 0.5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.10;
    ctx.translate(0, Math.round(d.y * 1.5));
    ctx.scale(1, -0.5);
    blit(ctx, img, x, top);
    ctx.restore();
  }
  blit(ctx, img, x, top);
}

// The alcove is painted into the plate, three lit glass shelves; what changes is what
// is standing on them. One relic per boss CHAD has put down - the thing he took off
// that boss - so the shelf reads as a record of the fights. Shelf y measured off the
// plate; the bays fill left to right, top down, in the order you beat them.
// Surface y is where a relic's feet go, measured off the plate's glass shelves. The
// tightest bay is the top one at 25 logical of headroom, which is what caps relic
// height in tools/process_props.py.
const SHELVES = [
  { y: 70, xs: [660, 716] },
  { y: 103, xs: [660, 716] },
  { y: 135, xs: [688] },
];

const beatenBosses = () => Object.keys(BOSSES)
  .map((k) => ({ k, act: STAGES.findIndex((s) => s.boss === k) }))
  .filter((b) => b.act >= 0 && b.act < G.unlockedStage)
  .sort((a, b) => a.act - b.act);

function relicSlots() {
  const out = [];
  for (const shelf of SHELVES) for (const sx of shelf.xs) out.push([sx, shelf.y]);
  return out;
}

function drawAlcove(ctx, camX) {
  const ox = ALCOVE[0] - camX;
  if (ox > W || ox + (ALCOVE[1] - ALCOVE[0]) < 0) return;
  const beaten = beatenBosses();
  const slots = relicSlots();
  beaten.forEach((b, n) => {
    if (n >= slots.length) return;
    const img = ASSETS['lair_relic_' + b.k];
    if (!img) return;
    const [sx, sy] = slots[n];
    // the newest one drops into place instead of just being there
    const arriving = G.hubRelicKey === b.k && G.hubRelicT > 0;
    const drop = arriving ? Math.max(0, (G.hubRelicT - 108) / 42) * -22 : 0;
    const x = Math.round(sx - camX - frameW(img) / 2);
    ctx.save();
    if (arriving && G.hubRelicT > 100 && (G.rawTime & 2)) ctx.filter = 'brightness(2.2)';
    blit(ctx, img, x, Math.round(sy - frameH(img) + 1 + drop));
    ctx.restore();
    if (arriving && G.hubRelicT > 96 && G.hubRelicT < 132 && (G.rawTime & 3) === 0) {
      spawnSpark(sx + rand(-8, 8), sy - rand(2, 16));
    }
  });
}

// CHAD stands directly in front of the mirror to pose, so a real reflection would be
// entirely hidden behind his own 55px-wide body. A glint sweeping the glass is what
// actually reads from here.
function drawMirrorGlint(ctx, camX) {
  if (G.hubFlex <= 0) return;
  const l = Math.round(MIRROR.x - camX);
  if (l > W || l + MIRROR.w < 0) return;
  const t = 1 - G.hubFlex / 96;
  ctx.save();
  ctx.beginPath();
  ctx.rect(l, MIRROR.y, MIRROR.w, MIRROR.h);
  ctx.clip();
  const y = MIRROR.y - 40 + t * (MIRROR.h + 80);
  const g = ctx.createLinearGradient(l, y - 26, l + MIRROR.w, y + 26);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.5, 'rgba(255,246,220,0.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(l, MIRROR.y, MIRROR.w, MIRROR.h);
  ctx.restore();
  // and one hard star at the leading edge, the way an anime flex always ends
  if (t > 0.42 && t < 0.62) {
    const sx = Math.round(l + MIRROR.w * 0.68), sy = Math.round(MIRROR.y + MIRROR.h * 0.34);
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(sx - 5, sy, 11, 1);
    ctx.fillRect(sx, sy - 5, 1, 11);
    ctx.fillRect(sx - 1, sy - 1, 3, 3);
  }
}

// The cabinet ships with a flat black screen so the attract loop can live here. The
// screen is 13x16 logical, measured off assets/lair/arcade.png - at that size the only
// thing that reads as a beat em up is what an actual one puts on screen: two health
// bars, two fighters and a floor.
const SCREEN = { dx: -7, y: 136, w: 13, h: 16 };
function drawArcadeScreen(ctx, camX) {
  // decor since HALL OF PAIN was retired, so its x comes off the wall art, not FIXTURES
  const x = Math.round(artAt('lair_arcade').x - camX);
  if (x < -30 || x > W + 30) return;
  const sx = x + SCREEN.dx, sy = SCREEN.y, sw = SCREEN.w, sh = SCREEN.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx, sy, sw, sh);
  ctx.clip();
  ctx.fillStyle = '#0a0616';
  ctx.fillRect(sx, sy, sw, sh);

  // a loop of exchanges: each side chips the other's bar down, then it resets
  const loop = G.rawTime % 900;
  const beat = (loop >> 3) & 3;
  ctx.fillStyle = '#1a1430';
  ctx.fillRect(sx + 1, sy + 1, 5, 1);
  ctx.fillRect(sx + 7, sy + 1, 5, 1);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(sx + 1, sy + 1, Math.max(1, 5 - ((loop / 180) | 0)), 1);
  ctx.fillStyle = '#d83858';
  const hpB = Math.max(1, 5 - ((loop / 210) | 0));
  ctx.fillRect(sx + 12 - hpB, sy + 1, hpB, 1);

  const scroll = (G.rawTime >> 2) % 5;
  ctx.fillStyle = '#241a44';
  for (let i = -1; i < 4; i++) ctx.fillRect(sx + i * 5 + scroll, sy + 4, 3, 10);
  ctx.fillStyle = '#3c2a66';
  ctx.fillRect(sx, sy + 14, sw, 1);

  // 3px wide with a skin-toned head is the smallest thing that still reads as a man
  // rather than a bar of colour
  const fy = sy + 14;
  const man = (fx, body, head) => {
    ctx.fillStyle = body;
    ctx.fillRect(fx, fy - 4, 3, 4);
    ctx.fillStyle = head;
    ctx.fillRect(fx, fy - 6, 3, 2);
  };
  man(sx + 2 + (beat === 1 ? 1 : 0), '#2a2a3a', '#f0c090');
  man(sx + 8 - (beat === 3 ? 1 : 0), '#8a2038', '#d8a878');
  if (beat === 1 || beat === 3) {
    ctx.fillStyle = '#fff8e0';
    ctx.fillRect(sx + 6, fy - 4, 2, 2);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  for (let i = sy; i < sy + sh; i += 2) ctx.fillRect(sx, i, sw, 1);
  ctx.restore();
  // marquee, warm and always on
  ctx.fillStyle = 'rgba(255,220,150,0.18)';
  ctx.fillRect(x - 12, 126, 18, 6);
}

// The amplifier's display panel, measured off assets/lair/hifi.png the same way.
const VU = { dx: -16, y: 137, w: 16, h: 5 };
function drawHifiMeters(ctx, camX) {
  const x = Math.round(fixtureAt('hifi').x - camX);
  if (x < -40 || x > W + 40) return;
  const bx = x + VU.dx, by = VU.y;
  ctx.fillStyle = '#05050a';
  ctx.fillRect(bx, by, VU.w, VU.h);
  const amp = G.hubPanel === 'hifi' ? 1 : 0.45;
  for (let i = 0; i < 7; i++) {
    const h = 1 + Math.round(Math.abs(Math.sin(G.rawTime * 0.11 + i * 0.9)) * 3 * amp);
    ctx.fillStyle = h > 2 ? '#ff7a3a' : '#3adc8a';
    ctx.fillRect(bx + 1 + i * 2, by + VU.h - 1 - h, 1, h);
  }
}

// One pin per unlocked chapter, so the map on the wall says how far the tour got.
function drawMapPins(ctx, camX) {
  const d = artAt('lair_worldmap');
  const left = d.x - camX - d.w / 2, top = d.y - d.h;
  if (left > W || left + d.w < 0) return;
  CHAPTERS.forEach((c, i) => {
    if (c.acts[0] > G.unlockedStage) return;
    // the wall map is the same projection as the panel, just small
    const px = Math.round(left + 4 + (c.pin[0] / W) * (d.w - 8));
    const py = Math.round(top + 4 + (c.pin[1] / H) * (d.h - 8));
    ctx.fillStyle = (G.rawTime + i * 37) % 60 < 34 ? '#ff4a6a' : '#8a2a3a';
    ctx.fillRect(px, py, 2, 2);
  });
}

// The bag pivots at the ceiling, so the chain swings with it. Drawn in the same rotated
// space drawProp puts the bag in - the two have to agree or the chain leaves the collar.
function drawBagChain(ctx, camX) {
  const bag = G.props[0];
  if (!bag) return;
  const x = Math.round(bag.x - camX);
  if (x < -20 || x > W + 20) return;
  const img = ASSETS.lair_bag_chain
    || fallbackArt('lair_bag_chain', 10, bag.y - bag.h - CEIL_MOUNT);
  const w = frameW(img), h = frameH(img);
  ctx.save();
  if (bag.swing) {
    ctx.translate(x, CEIL_MOUNT);
    ctx.rotate(bag.swing);
    ctx.translate(-x, -CEIL_MOUNT);
  }
  // stretched to the exact run, so the shackle always lands in the bag's collar
  blit(ctx, img, x - w / 2, CEIL_MOUNT, w, bag.y - bag.h - CEIL_MOUNT + 4);
  ctx.restore();
}

// A thin bracket around whatever you are standing at. Drawn in the wall plane so it
// sits behind CHAD like the fixture it belongs to.
function drawSelectRing(ctx, camX) {
  if (!G.hubSel || G.hubPanel || G.hubSeat > 0) return;
  const boxes = {
    bar: [4, 34, 130, 140],
    tank: [TANK.x - 6, TANK.y - 6, TANK.w + 12, TANK.h + 12],
    trophies: [ALCOVE[0] - 6, 33, ALCOVE[1] - ALCOVE[0] + 12, 110],
    lounge: [LOUNGE.x - LOUNGE.w / 2 - 2, LOUNGE.y - LOUNGE.h, LOUNGE.w + 4, LOUNGE.h],
    map: [800 - 46, 62, 92, 54],
    hifi: [880 - 26, WALL_BASE - 62, 52, 62],
    bag: [BAG_X - 15, 114, 30, 88],
    mirror: MIRROR_FRAME,
  };
  for (const r of RIGS) boxes[r.id] = [r.x + r.ring[0], r.y + r.ring[1], r.ring[2], r.ring[3]];
  const b = boxes[G.hubSel];
  if (!b) return;
  const x = Math.round(b[0] - camX), y = Math.round(b[1]), w = Math.round(b[2]), h = Math.round(b[3]);
  ctx.fillStyle = ((G.rawTime >> 3) & 1) ? '#ffd94a' : '#c8a020';
  const c = 5;
  ctx.fillRect(x, y, c, 1); ctx.fillRect(x, y, 1, c);
  ctx.fillRect(x + w - c, y, c, 1); ctx.fillRect(x + w - 1, y, 1, c);
  ctx.fillRect(x, y + h - 1, c, 1); ctx.fillRect(x, y + h - c, 1, c);
  ctx.fillRect(x + w - c, y + h - 1, c, 1); ctx.fillRect(x + w - 1, y + h - c, 1, c);
}

// ------------------------------------------------------------------------ UI
function upArrow(ctx, x, y, col) {
  ctx.fillStyle = col;
  for (let i = 0; i < 4; i++) ctx.fillRect(x - i, y + i, i * 2 + 1, 1);
}

export function drawHubUI(ctx) {
  // meter earned on the bag, so the training loop has something to fill
  const mw = 120;
  ctx.fillStyle = '#100a0c';
  ctx.fillRect(8, 252, mw + 2, 8);
  ctx.fillStyle = G.meter >= METER_MAX ? '#ffd94a' : '#3a8ad0';
  ctx.fillRect(9, 253, Math.round(mw * G.meter / METER_MAX), 6);
  drawTextShadow(ctx, G.meter >= METER_MAX ? 'SPACE: RAGNAROK' : 'METER', 8, 242,
    G.meter >= METER_MAX ? '#ffd94a' : '#8a82a0', 1);

  drawTextShadow(ctx, 'THE LAIR', 8, 8, '#ffd94a', 1);
  const hs = 'HI ' + String(G.hiscore).padStart(6, '0');
  drawTextShadow(ctx, hs, W - 8 - textWidth(hs, 1), 8, '#ffd94a', 1);

  if (G.combo >= 2) {
    const c = G.combo + ' HITS';
    drawTextShadow(ctx, c, W / 2 - textWidth(c, 2) / 2, 36 + Math.sin(G.rawTime * 0.4),
      G.combo >= 10 ? '#ff7a3a' : '#ffd94a', 2);
  }

  if (G.hubPanel) { drawHubPanel(ctx); return; }

  // the relic you just came home with, named
  if (G.hubRelicT > 0 && G.hubRelicKey) {
    const b = BOSSES[G.hubRelicKey];
    ctx.save();
    ctx.globalAlpha = Math.min(1, G.hubRelicT / 40);
    const t1 = 'TAKEN FROM';
    drawTextShadow(ctx, t1, (W - textWidth(t1, 1)) / 2, 60, '#8ad8ff', 1);
    drawTextShadow(ctx, b.name, (W - textWidth(b.name, 2)) / 2, 72, '#ffd94a', 2);
    ctx.restore();
  }

  if (G.hubSeat > 0) {
    if (G.hubReps > 0) {
      const reps = repCount(G.hubReps);
      drawTextShadow(ctx, reps, (W - textWidth(reps, 2)) / 2, 60, '#ffd94a', 2);
    }
    const hint = 'ANY KEY: ' + (G.hubStation === 'lounge' ? 'GET UP' : 'RACK IT');
    drawTextShadow(ctx, hint, (W - textWidth(hint, 1)) / 2, 246, '#686098', 1);
    return;
  }

  const f = G.hubSel && fixtureAt(G.hubSel);
  if (f) {
    const x = Math.round(f.x - G.camX);
    const bob = Math.round(Math.sin(G.rawTime * 0.12) * 2);
    const LOW = { bag: 100, lounge: 118, curl: 84, bench: 112, tank: 30 };
    const y = LOW[f.id] === undefined ? 26 : LOW[f.id];
    if (!f.key) upArrow(ctx, x, y + 10 + bob, '#ffd94a');
    const hint = (f.key || 'UP') + ': ' + f.hint;
    drawTextShadow(ctx, hint, x - textWidth(hint, 1) / 2, y + bob, '#f8f0e0', 1);
  }

  const foot = 'ARROWS MOVE   Z PUNCH   X JUMP   HOLD C PARRY   ESC TITLE';
  drawTextShadow(ctx, foot, (W - textWidth(foot, 1)) / 2, 262, '#686098', 1);
}
