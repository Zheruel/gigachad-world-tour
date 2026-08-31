// hub.js - THE LAIR: CHAD's penthouse, the room you walk around between acts. 1440
// logical px, three screens wide, in 90s neon over old-money walnut and brass.
//
// It is a normal stage definition with no waves, fed to initStageObj(), so the player,
// the camera, the y-sorted draw and the arena walls all come from the existing
// machinery.
//
// Nothing in the room is painted into the plate. Wall-mounted and wall-standing things
// are drawn here in the wall plane, before drawWorld, so CHAD occludes all of them and
// none of them is a combat target; the heavy bag is an ordinary G.props entry; the
// tiger goes on G.actors so drawWorld y-sorts him with everybody else.
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
import { G, W, H, METER_MAX, clamp, rand, irand } from './engine.js';
import { Pix, frameW, frameH, blit, drawText, drawTextShadow, textWidth } from './sprites.js';
import { ASSETS } from './assets.js';
import { STAGES } from './stages.js';
import { BOSSES } from './bosses.js';
import { input } from './input.js';
import { spawnPop, spawnSmoke, spawnSpark } from './effects.js';
import { CHAPTERS, openPanel, updateHubPanel, drawHubPanel } from './hubpanels.js';

export { CHAPTERS };

const FLOOR_Y = 181;
export const HUB_WIDTH = 1920;
const WALL_BASE = 191;     // where something standing against the back wall has its feet
const REACH = 40;          // how close you stand before a fixture is the active one
const CEIL_MOUNT = 20;     // the window head beam, which is what the bag hangs off

// The plate's zones, in logical x, measured off the built plate. The room reads as
// three places rather than a shelf of objects: THE LOUNGE (bar, tank, sofa under the
// picture light), TROPHIES AND MEDIA (alcove between two media walls), THE VIEW.
const BAR = [0, 132];
// The lit water, not the frame. The brass surround is lair_tank_frame, a nine-slice
// rebuilt by tools/build_lair_extras.py and blitted OVER the plate's original tank, so
// the wall behind never had to be repaired - see build_tankframe.
const TANK = { x: 156, y: 42, w: 299, h: 112 };
const TANK_FRAME = { x: 141, y: 27, w: 329, h: 142 };
// ONE long trophy hall - widen_alcove in tools/build_lair_wide.py rebuilds the niche and
// the dead bay next to it as a single unit, logical 477.5-748.5 with a 13-wide frame
// moulding at each end. Six relics across 244 leaves ~15 of air between them.
const NICHES = [[491, 735]];
// The row a relic's feet sit ON, measured off the plate: the brass shelf rails light up
// at device rows 137, 201 and 264, which is logical 68.5, 100.5 and 132. These were 70,
// 103 and 135 with a +1 in the blit, so every relic stood 2.5-4px INSIDE its own shelf.
const SHELF_Y = [69, 101, 133];
const ACROSS = 6;

// One shelf is TWO countries now the hall is one unit: six across, three shelves, still
// 18 slots. Filling is left to right, top down, in the order the acts were cleared.
export const RELIC_SLOTS = NICHES.flatMap(([x0, x1]) => {
  const step = (x1 - x0) / ACROSS;
  return SHELF_Y.flatMap((y) => Array.from({ length: ACROSS },
    (_, i) => [Math.round(x0 + step * (i + 0.5)), y]));
});
// the hall including its frame, for the cull and the select bracket
const TROPHY_WALL = [477, 749];

// Every glass opening build_lair_wide.py leaves in the plate - it prints this list. The
// gym's long run, then the bedroom's corner window.
const OPENINGS = [[922, 1294], [1723, 1920]];
const WINDOW = OPENINGS[0];                         // the gym's, which the sun shines through
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
  { id: 'lounge', x: 290, hint: 'SIT AND SMOKE' },
  { id: 'trophies', x: 613, hint: 'TROPHY WALL' },   // the middle of the hall
  { id: 'map', x: 800, hint: 'WORLD TOUR' },
  { id: 'hifi', x: 880, hint: 'SOUND TEST' },
  { id: 'bag', x: BAG_X, hint: 'WORK THE BAG', key: 'Z' },
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

// The four authored key poses keep the furniture perfectly still. Three midpoint edits
// bridge them without asking a wide sheet to redraw CHAD or the sofa. The rest is still
// by far the longest hold - a man with a cigar spends most of his time not smoking it.
const SMOKE_HOLDS = [200, 14, 22, 18, 54, 18, 96];
const SMOKE_CYCLE = SMOKE_HOLDS.reduce((a, b) => a + b, 0);
// the frame the plume leaves his mouth on, so the procedural smoke agrees with the drawing
const SMOKE_EXHALE = SMOKE_HOLDS.slice(0, -1).reduce((a, b) => a + b, 0);

function loungeFrame() {
  let t = G.hubSeat % SMOKE_CYCLE;
  for (let i = 0; i < SMOKE_HOLDS.length; i++) {
    if (t < SMOKE_HOLDS[i]) return 'lair_lounge_smoke_' + i;
    t -= SMOKE_HOLDS[i];
  }
  return 'lair_lounge_smoke_0';
}

// The bar is a station too, but it PLAYS ONCE and stands him back up rather than looping:
// glass at the hip, raised, at the lips, head back draining it, then lowered with a grin.
// Holds, not a fixed rate - the drink itself is the beat worth dwelling on and the two
// lifting poses are just travel. Timing lives here because barDrinkFrame, the AAAH and
// the auto-stand all have to agree on it.
const DRINK_HOLDS = [18, 12, 12, 42, 40];
const DRINK_END = DRINK_HOLDS.reduce((a, b) => a + b, 0);
const DRINK_AAAH = DRINK_END - DRINK_HOLDS[4] + 6;
let barAt = 0;              // where he was standing when he picked the glass up

function barDrinkFrame() {
  let t = G.hubSeat;
  for (let i = 0; i < DRINK_HOLDS.length; i++) {
    if (t <= DRINK_HOLDS[i]) return 'lair_bar_drink_' + i;
    t -= DRINK_HOLDS[i];
  }
  return 'lair_bar_drink_4';
}


// ------------------------------------------------------------------ the bedroom
// The master suite, the fourth screen. Same walnut and brass as the lounge: a black
// lacquer boudoir would have read as a different apartment.
// measured off the plate: the firebox opening is 1548-1618, hearth at y 168
const FIREPLACE = { x: 1562, y: 163 };
// Measured off the plate: the firebox interior, and the brass fender standing in front
// of it. The fender is painted INTO the plate, so a fire sprite drawn over the plate
// covers it and reads as burning in front of the fireplace. The fix is to blit that
// band of the plate back over the fire - see drawFire.
const FIREBOX = [1533, 128, 59, 35];
const FENDER = [1530, 148, 68, 20];
const OVERMANTEL = [1528, 48, 66, 55];   // the mirror glass above it
// One generation per pose - see the bed section in CLAUDE.md for why a strip could not
// do this. She does not react to CHAD; she is just someone living in the room.
export const BED_X = 1840;   // tucked into the corner, headboard end against it
const BED = { x: BED_X, y: WALL_BASE + 2, w: 140, h: 72 };

// Sprites in the wall plane. Sizes mirror LAIR in tools/process_props.py; y is the
// bottom edge and art is centred on x.
export const LAIR_ART = [
  // the lounge: stools at the painted bar. The cherub portrait that hung over the sofa
  // is gone - the tank takes that wall, and the oil over the hearth is the better one.
  // The plate paints three shelves of near-identical amber bottles. These two rows go
  // over the lit ones - x 0-120, standing on the shelf surfaces at logical 68.5 and 98.5
  // measured off the plate's brass rails. The plate's own bottles still show in the gaps,
  // which reads as a second row behind rather than as ghosting.
  { art: 'lair_bar_bottles_top', x: 60, y: 69, w: 120, h: 23 },
  { art: 'lair_bar_bottles_low', x: 60, y: 99, w: 120, h: 23 },
  { art: 'lair_bar_stools', x: 92, y: WALL_BASE, w: 46, h: 40 },
  // Trophies. Two niches now - see clone_alcove in tools/build_lair_wide.py - with the
  // cigar cabinet built flush into the second one's base panel (482.5-591 x 147-165.5)
  // rather than standing in front of the wall. The arcade cabinet is gone: it was the
  // only injection-moulded object in a walnut room, and this bay is worth more as shelf.
  // A suite, not one sofa: an armchair either side of the chesterfield, the whole group
  // centred on the tank behind it. The humidor comes back to sit beside the right-hand
  // chair and the cigar table, where you actually reach for a cigar - it costs the bottom
  // right corner of the glass, which is the trade for having the cigars where you smoke.
  { art: 'lair_lounge_rug', x: 300, y: WALL_BASE + 50, w: 240, h: 49 },
  { art: 'lair_lounge_chair', x: 175, y: WALL_BASE + 9, w: 70, h: 50 },
  { art: 'lair_lounge_chair', x: 395, y: WALL_BASE + 9, w: 70, h: 50, flip: true },
  // clear of the right-hand chair (which ends at 430), against the trophy hall's frame
  { art: 'lair_humidor', x: 460, y: WALL_BASE, w: 56, h: 78 },
  // centred in the panelled bay, whose gold inset measures x 775.75-895.75, y 37-130
  { art: 'lair_worldmap', x: 836, y: 109, w: 80, h: 48 },
  { art: 'lair_hifi', x: 880, y: WALL_BASE, w: 48, h: 60 },
  // The view: the whole run of glass is the gym, and all of it is furniture. The rack and
  // the bench used to be walk-up stations with CHAD lifting on them, which meant keeping
  // two drawings of the same equipment in agreement frame by frame - a lot of machinery
  // for a second and third way to do what the bag already does. They are what they look
  // like now: somebody's gear, loaded past what anyone else could move.
  { art: 'lair_gym_kettles', x: 945, y: WALL_BASE, w: 56, h: 26 },
  { art: 'lair_gym_curl', x: 1075, y: WALL_BASE, w: 112, h: 54 },
  // It recedes TOWARDS the camera, so its near foot belongs down the floor band rather than
  // against the wall like everything else on this run. At WALL_BASE its feet were 10 px below
  // the wall seam and the whole loaded bar sat up in the glass, which read as hung, not stood.
  { art: 'lair_gym_bench', x: 1240, y: WALL_BASE + 26, w: 122, h: 82 },
  { art: 'lair_gym_plates', x: 1152, y: WALL_BASE, w: 28, h: 62 },
  // The gym is all glass, so the only wall it has is the fluted pilaster closing its
  // right-hand end - logical 1303-1323.5 off the plate, which the gloves just span.
  { art: 'lair_gloves', x: 1313, y: 128, w: 20, h: 30 },
  // the master suite. The rug lies on the floor, so it sits forward of the wall base and
  // CHAD walks over it; everything else stands against the panelling.
  // A sabretooth pelt, head mounted and snarling at the LEFT. Russet with a black mane
  // rather than white: the tiger sleeps in this room too, and the dark mane is what
  // frames the ivory fangs so they still read at this size. It lies forward of the wall
  // base, out into the walking lane, because that is where a rug in front of a fire goes.
  // The oil over the hearth, covering the plate's overmantel mirror (frame 1528-1600,
  // y 37.5-103.5) with a couple of px to spare on the ornate crest. Hung on the
  // FIREPLACE's centre, not the mirror's - the plate has them 1.5px apart, and the eye
  // lines a picture up with the mantel under it. It is the fight that produced the pelt
  // lying on the floor directly below it.
  { art: 'lair_overmantel', x: 1562, y: 106, w: 76, h: 70 },
  { art: 'lair_bed_rug', x: 1570, y: WALL_BASE + 55, w: 138, h: 54 },
  // closer to the hearth than to the bed: the fireplace's mantel ends at 1600 and
  // this leaves a walking lane between them
  { art: 'lair_bed_wardrobe', x: 1668, y: WALL_BASE, w: 62, h: 96 },
  { art: 'lair_bed_nightstand', x: 1750, y: WALL_BASE, w: 33, h: 40 },   // beside the footboard
];
// The lounge is a pair: the same sofa empty and with CHAD sitting in it, registered on
// the sofa's own foot by tools/build_lair_extras.py. His boots hang below the sofa
// legs, which is why the canvas bottom sits a little in front of the wall base.
const LOUNGE = { x: 290, y: WALL_BASE + 9, w: 141, h: 63 };


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
  } else if (name.startsWith('lair_bed_') && name !== 'lair_bed_fire') {
    P.rect(0, h * 0.45, w, h * 0.55, '#3a2214');
    P.rect(4, h * 0.5, w - 8, h * 0.2, '#d8d0c0');
    P.rect(0, h * 0.28, w * 0.14, h * 0.3, '#5a2028');
  } else if (name === 'lair_bed_fire') {
    P.disc(w / 2, h * 0.6, w * 0.4, '#e06a20');
    P.disc(w / 2, h * 0.75, w * 0.3, '#ffd06a');
  } else if (name === 'lair_gloves') {
    P.disc(w * 0.3, h * 0.6, w * 0.28, '#8a2028');
    P.disc(w * 0.7, h * 0.6, w * 0.28, '#8a2028');
    P.rect(w * 0.45, 0, 2, h * 0.4, '#c8a038');
  } else if (name === 'lair_lounge_chair') {
    P.rect(2, h * 0.2, w - 4, h * 0.8, '#1a1620');
    P.rect(6, h * 0.5, w - 12, h * 0.3, '#241e2a');
  } else if (name === 'lair_lounge_rug') {
    P.rect(0, h * 0.25, w, h * 0.75, '#241a1e');
    P.rect(4, h * 0.4, w - 8, h * 0.45, '#5a1e24');
  } else if (name.startsWith('lair_bar_bottles_')) {
    for (let i = 0; i < 12; i++) {
      const bh = h - 4 - ((i * 5) % 7);
      P.rect(3 + i * (w - 6) / 12, h - bh, 5, bh, i & 1 ? '#8a5a1e' : '#3a4a28');
    }
  } else if (name === 'lair_bar_stools') {
    panel('#3a2214', '#8a5a2a');
    P.rect(0, 2, w, 4, '#c8bca8');
  } else if (name === 'lair_hifi') {
    panel('#101018', '#3a3a4a');
    for (let y = 6; y < h - 8; y += 9) P.rect(3, y, w * 0.5, 6, '#1a1a24');
  } else if (name.startsWith('lair_gym_')) {
    P.rect(0, h - 5, w, 4, '#2a2a34');
    P.rect(0, h * 0.4, w, 3, '#2a2a34');
    for (let i = 0; i < 5; i++) P.disc(8 + i * (w - 16) / 4, h * 0.34, 4, '#3a3a46');
  } else if (name === 'lair_humidor') {
    panel('#3a2214', '#8a5a2a');
    for (let i = 0; i < 4; i++) P.rect(4, 6 + i * (h - 12) / 4, w - 8, (h - 12) / 4 - 3, '#5a3a1e');
  } else if (name === 'lair_tankscape') {
    P.rect(0, h * 0.6, w, h * 0.4, '#c8b088');
    P.rect(w * 0.3, h * 0.2, w * 0.2, h * 0.45, '#8a6a3a');
  } else if (name === 'lair_overmantel') {
    panel('#3a2a12', '#c8a038');
    P.rect(6, 6, w - 12, h - 12, '#221a12');
    P.disc(w * 0.4, h * 0.42, 9, '#c89a68');
  } else if (name === 'lair_bag_chain') {
    for (let y = 0; y < h; y += 3) P.rect(w / 2 - 1, y, 2, 2, (y / 3) & 1 ? '#7a7488' : '#3e3a4c');
  } else if (name.startsWith('lair_bar_drink_')) {
    P.rect(w * 0.3, 0, w * 0.4, h, '#c89a68');
    P.rect(w * 0.34, h * 0.2, w * 0.32, h * 0.3, '#1a1620');
  } else if (name === 'lair_lounge_empty' || name.startsWith('lair_lounge_smoke_')) {
    P.rect(0, h * 0.28, w * 0.78, h * 0.6, '#1a1620');
    P.rect(w * 0.86, h * 0.28, w * 0.1, h * 0.12, '#5a3420');
    if (name !== 'lair_lounge_empty') P.rect(w * 0.3, 0, 20, h * 0.5, '#c89a68');
  } else {
    panel('#16161e', '#3a3a4a');
  }
  P.c._as = 1;   // code art is authored at 1 logical px
  FALLBACK[name] = P.c;
  return P.c;
}

const artFor = (d) => ASSETS[d.art] || fallbackArt(d.art, d.w, d.h);
const artAt = (name) => LAIR_ART.find((d) => d.art === name);
// A select box measured off the art itself. Copying a fixture's x into the box is what
// left the mirror's bracket 14px off the frame.
const artRing = (name, pad) => {
  const d = artAt(name);
  return [d.x - d.w / 2 - pad, d.y - d.h - pad, d.w + pad * 2, d.h + pad * 2];
};

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
  // both niches, with their shelves where SHELF_Y says they are
  for (const [x0, x1] of NICHES) {
    P.rect(x0 - 4, 35, x1 - x0 + 8, 104, '#0a0810');
    for (const y of SHELF_Y) P.rect(x0, y - 2, x1 - x0, 3, '#c89a4a');
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
  const d = dusk();

  // Every opening gets the same treatment - the bedroom's corner glass looks out on the
  // same city the gym does, so it needs the same wash and the same glare off the sun.
  for (const [ox0, ox1] of OPENINGS) {
    const wx0 = ox0 - camX, ww = ox1 - ox0;
    if (wx0 > W || wx0 + ww < 0) continue;

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

    // sunset coming in flat through the glass, fading as the tour goes on
    const shaft = ctx.createLinearGradient(0, 50, 0, FLOOR_Y + 30);
    shaft.addColorStop(0, `rgba(255,150,90,${0.16 * (1 - d * 0.7)})`);
    shaft.addColorStop(1, 'rgba(255,150,90,0)');
    ctx.fillStyle = shaft;
    ctx.fillRect(wx0, 50, ww, FLOOR_Y - 20);
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
  drawFirelight(ctx, camX);

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
    const inSun = OPENINGS.some(([a, b]) => m.x > a && m.x < b);
    ctx.fillStyle = inSun ? 'rgba(255,210,170,0.62)' : 'rgba(200,230,255,0.34)';
    ctx.fillRect(Math.round(sx), Math.round(m.y), 1, 1);
  }
}

// The fire is a sprite, but a fire that does not move the room around it reads as a
// poster of a fire. This is its light on the granite, breathing on its own rhythm.
// Four frames off one reference, so the logs hold still and only the flames move.
// The order is not 0,1,2,3: measured pairwise, that runs a 26% step next to a 14% one
// and the flame snaps. 0,1,3,2 is the cycle with the smallest worst step, and 9 frames
// each (~6.7fps) is slow enough to read as flicker rather than as a strobe.
const FIRE_ORDER = [0, 1, 3, 2];
const FIRE_RATE = 9;
function drawFire(ctx, camX) {
  const [bx, by, bw, bh] = FIREBOX;
  if (bx - camX > W || bx - camX + bw < 0) return;
  const img = ASSETS['lair_fire_' + FIRE_ORDER[((G.rawTime / FIRE_RATE) | 0) % FIRE_ORDER.length]]
    || artFor({ art: 'lair_bed_fire', w: 26, h: 28 });
  ctx.save();
  ctx.beginPath();                       // never spill onto the marble jambs or lintel
  ctx.rect(bx - camX, by, bw, bh);
  ctx.clip();
  blit(ctx, img, Math.round(FIREPLACE.x - camX - frameW(img) / 2),
       Math.round(FIREPLACE.y - frameH(img)));
  ctx.restore();
  // and the brass fender back on top, so the fire burns behind it. It is cut out of the
  // plate by build_lair_extras.py rather than blitted from it: blitting the band would
  // paint the dark firebox back over the flames too.
  const fender = ASSETS.lair_fender;
  if (fender) blit(ctx, fender, FENDER[0] - camX, FENDER[1]);
}

function drawFirelight(ctx, camX) {
  const fx = FIREPLACE.x - camX;
  if (fx < -140 || fx > W + 140) return;
  const t = G.rawTime;
  const flick = 0.82 + Math.sin(t * 0.21) * 0.10 + Math.sin(t * 0.53) * 0.06
    + (t % 190 < 3 ? 0.16 : 0);
  ctx.save();
  const g = ctx.createRadialGradient(fx, FLOOR_Y - 4, 4, fx, FLOOR_Y - 4, 120);
  g.addColorStop(0, `rgba(255,150,60,${0.20 * flick})`);
  g.addColorStop(0.45, `rgba(220,90,40,${0.08 * flick})`);
  g.addColorStop(1, 'rgba(180,50,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(fx - 120, FLOOR_Y - 124, 240, 244);

  // Firelight climbing the oil above the hearth. This used to be the fire REFLECTED in
  // the overmantel mirror, which wanted to be bright; a canvas only catches the light, so
  // it is half the strength and warmer at the bottom edge nearest the flames.
  const mx = OVERMANTEL[0] - camX;
  const m = ctx.createLinearGradient(0, OVERMANTEL[1] + OVERMANTEL[3], 0, OVERMANTEL[1]);
  m.addColorStop(0, `rgba(255,160,70,${0.08 * flick})`);
  m.addColorStop(1, 'rgba(255,120,50,0)');
  ctx.fillStyle = m;
  ctx.fillRect(mx, OVERMANTEL[1], OVERMANTEL[2], OVERMANTEL[3]);
  ctx.restore();
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
  music: 'lair', bossMusic: null, boss: null,
  lamps: [60, 395, 1100, 1564, 1750], lampCol: '255,140,60', lampA: 0.09,
  rim: null, grade: '150,80,220', gradeA: 0.05,
  moteCount: 34, moteStyle: 'dust',
  // the plate lights the alcove and the tank; these are only their spill on the floor
  glows: [
    { x: 60, y: 130, r: 48, col: '255,180,90', a: 0.14 },
    { x: 225, y: 150, r: 58, col: '90,200,230', a: 0.15 },
    { x: 290, y: 60, r: 44, col: '255,190,110', a: 0.13 },
    { x: 530, y: 150, r: 52, col: '255,180,90', a: 0.13 },
    { x: 613, y: 150, r: 52, col: '255,180,90', a: 0.13 },
    { x: 700, y: 150, r: 52, col: '255,180,90', a: 0.13 },
    { x: 800, y: 92, r: 44, col: '110,190,255', a: 0.13 },
    { x: 880, y: 150, r: 38, col: '60,220,140', a: 0.10 },
    // the master suite. The fire has its own breathing light in drawFirelight; these are
    // the standing lamps, without which the walk from the wardrobe to the bed is unlit.
    { x: 1472, y: 130, r: 46, col: '255,190,110', a: 0.15 },
    { x: 1688, y: 140, r: 38, col: '255,200,130', a: 0.12 },
    { x: 1750, y: 158, r: 40, col: '255,180,120', a: 0.17 },
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
// The water is a clip rect, so nothing ever swims out through the glass. What is IN the
// water is one shark and his lair: the piranhas are gone, because twenty fish drifting
// about was busy without being alive, and they made the shark furniture. One animal with
// somewhere to live reads better than a shoal with nowhere.
//
// Everything that sells "alive" here is procedural and costs nothing: light shafts and
// suspended silt in the open water, a bubble column off the scenery, the cigar actually
// smoking, and the shark banking into his turns.
const shark = { x: 0, dir: 1, frame: 0, t: 0, turn: 0, puff: 0, draw: 0 };
const bubbles = [];
const smoke = [];
const silt = [];
const SCAPE_H = 92;           // lair_tankscape, sized in tools/process_props.py
const SHARK_W = 56;           // lair_shark_*, from tools/build_lair_extras.py SHARK_H
// The lit end of the cigar, measured off assets/lair/shark_0.png as an offset from the
// sprite's own top-left. The smoke has to leave the cigar, not the middle of the shark.
const CIGAR = { x: 54, y: 27 };
const SILT_N = 26;
// The other tenants. The moray that used to live in the wreck's gun port is gone - one
// animal reacting to the shark from a hole it never leaves is a lot of machinery for a
// sprite you have to go looking for.
// Fewer overlapping phases make the school read as individual fish rather than shimmer.
const BAIT_N = 14;
const crab = { x: 0, dir: 1, t: 0, freeze: 0, rest: 0 };
const bait = { cx: 0, cy: 0, vx: 0.25, vy: 0, fish: [] };

function resetTank() {
  shark.x = TANK.x + 30;
  shark.dir = 1;
  shark.t = 0;
  shark.turn = 0;
  shark.puff = 0;
  shark.draw = 0;
  bubbles.length = 0;
  smoke.length = 0;
  silt.length = 0;
  crab.x = TANK.x + 40; crab.dir = 1; crab.t = 0; crab.freeze = 0; crab.rest = 90;
  bait.cx = TANK.x + TANK.w * 0.72; bait.cy = TANK.y + TANK.h * 0.22;
  bait.vx = 0.10; bait.vy = 0;
  bait.fish.length = 0;
  for (let i = 0; i < BAIT_N; i++) {
    bait.fish.push({ x: bait.cx, y: bait.cy, ox: rand(-26, 26), oy: rand(-13, 13),
      phase: rand(0, 9), rate: rand(0.008, 0.018), frame: irand(0, 3), push: 0,
      face: 1, vx: 0 });
  }
  for (let i = 0; i < SILT_N; i++) {
    silt.push({
      x: rand(TANK.x + 2, TANK.x + TANK.w - 2),
      y: rand(TANK.y + 4, TANK.y + TANK.h - 8),
      // depth doubles as size, drift rate and brightness, so near motes move faster
      z: rand(0.3, 1), phase: rand(0, 9),
    });
  }
}

// One bubble, off the scenery or off the cigar. Rise rate is per bubble, or the whole
// column moves as one sheet.
function bubble(x, y, r) {
  bubbles.push({ x, y, r, vy: rand(-0.5, -0.28), phase: rand(0, 9) });
}

// One place that says where he is, so the smoke leaves the cigar and not his tail.
function sharkY() {
  // He ranges over most of the glass, so he passes in FRONT of the masts and the hull as
  // often as he is against open water - which is the difference between a tank with a
  // shark in it and a shark on a blue background.
  return TANK.y + 12 + Math.sin(shark.t * 0.0085) * 22;
}

// The lit end, in world coords, mirrored with him.
function cigarTip() {
  return [shark.x + (shark.dir > 0 ? CIGAR.x : SHARK_W - CIGAR.x), sharkY() + CIGAR.y];
}

// force 1 is a drag, well under 1 is the trickle off the ember between them: it scales
// how far the cloud is pushed, how big it gets and how long it lasts, so one call does
// both without two sets of numbers to keep in step.
function puffSmoke(n, force) {
  const [cx, cy] = cigarTip();
  for (let i = 0; i < n; i++) {
    smoke.push({
      x: cx + rand(-1, 1), y: cy + rand(-1, 1),
      r: rand(1.6, 3.0) * (0.45 + force * 0.55), grow: rand(0.030, 0.060) * force,
      // it leaves the cigar the way he is pointing, then the water takes it upward
      vx: shark.dir * rand(0.05, 0.20) * force, vy: rand(-0.26, -0.12),
      phase: rand(0, 9), life: 1,
      fade: rand(0.006, 0.010) / force,
    });
  }
}

function updateTank() {
  shark.t++;
  shark.frame = (shark.t / 9 | 0) & 3;

  const lo = TANK.x + 6, hi = TANK.x + TANK.w - 6 - SHARK_W;
  shark.x += shark.dir * 0.24;
  if (shark.x < lo) { shark.x = lo; shark.dir = 1; shark.turn = 20; }
  if (shark.x > hi) { shark.x = hi; shark.dir = -1; shark.turn = 20; }
  if (shark.turn > 0) shark.turn--;

  // He is always smoking - a thin trickle off the ember - and every few seconds he takes
  // a proper drag: the ember flares for a moment and then a cloud of it comes back out.
  // Without the two rates it reads as a smoke machine bolted to his face rather than a
  // shark enjoying a cigar.
  if ((shark.t & 15) === 0) puffSmoke(1, 0.45);
  if (--shark.puff <= 0) {
    shark.puff = irand(260, 460);
    shark.draw = 46;                  // frames of drag: ember up first, cloud after
  }
  if (shark.draw > 0) {
    shark.draw--;
    // three sub-bursts rather than one. Eighteen particles born at the same instant in
    // the same place stay a single blob however they are tuned; spread over ten frames
    // they leave his mouth as a rolling plume.
    if (shark.draw === 22 || shark.draw === 17 || shark.draw === 12) {
      puffSmoke(6, 1);
      const [cx, cy] = cigarTip();
      bubble(cx + rand(-2, 2), cy - 1, rand(1, 2));
    }
  }

  if ((shark.t & 31) === 0) bubble(TANK.x + rand(8, 16), TANK.y + TANK.h - 24, rand(1, 2));
  if ((shark.t & 63) === 20) bubble(TANK.x + TANK.w - rand(10, 18), TANK.y + TANK.h - 24, rand(1, 2));

  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.phase += 0.09;
    b.y += b.vy;
    b.x += Math.sin(b.phase) * 0.22;
    if (b.y < TANK.y + 5) bubbles.splice(i, 1);
  }
  for (let i = smoke.length - 1; i >= 0; i--) {
    const s = smoke[i];
    s.phase += 0.06;
    s.x += s.vx + Math.sin(s.phase) * 0.10;
    s.y += s.vy;
    s.vx *= 0.98;
    s.vy = Math.max(-0.45, s.vy - 0.0026);   // it accelerates up as it thins
    s.r += s.grow;
    s.life -= s.fade;
    if (s.life <= 0 || s.y < TANK.y + 3) smoke.splice(i, 1);
  }
  updateCrab();
  updateBait();

  for (const m of silt) {
    m.phase += 0.004 + m.z * 0.006;
    m.y -= 0.02 + m.z * 0.05;
    m.x += Math.sin(m.phase) * 0.10 * m.z;
    if (m.y < TANK.y + 2) { m.y = TANK.y + TANK.h - 4; m.x = rand(TANK.x + 2, TANK.x + TANK.w - 2); }
  }
}

// The crab walks the sand with a gold coin held up in one claw, and plays dead when the
// shark is overhead. It is the only thing down there that moves, which is where your eye
// goes whenever the shark is up among the masts.
function updateCrab() {
  const lo = TANK.x + 10, hi = TANK.x + TANK.w - 26;
  if (Math.abs((shark.x + SHARK_W / 2) - (crab.x + 8)) < 46 && sharkY() > TANK.y + TANK.h * 0.4) {
    crab.freeze = 70;
  }
  if (crab.freeze > 0) { crab.freeze--; return; }
  // It picks its way and then stops for a while, rather than pacing the tank end to end at
  // a constant speed. The stopping is most of what makes it read as an animal.
  if (crab.rest > 0) { crab.rest--; return; }
  crab.t++;
  crab.x += crab.dir * 0.07;
  if (crab.t % 150 === 0) { crab.rest = irand(90, 260); if (irand(0, 2) === 0) crab.dir *= -1; }
  if (crab.x < lo) { crab.x = lo; crab.dir = 1; }
  if (crab.x > hi) { crab.x = hi; crab.dir = -1; }
}

// A baitball, not a shoal: it moves as ONE shape and splits around the shark, which is the
// thing the twenty drifting piranhas never did and the reason they went.
function updateBait() {
  bait.cx += bait.vx;
  bait.cy += bait.vy;
  bait.vy += Math.sin(shark.t * 0.004) * 0.0018;
  const lo = TANK.x + 26, hi = TANK.x + TANK.w - 26;
  if (bait.cx < lo) { bait.cx = lo; bait.vx = Math.abs(bait.vx); }
  if (bait.cx > hi) { bait.cx = hi; bait.vx = -Math.abs(bait.vx); }
  bait.cy = clamp(bait.cy, TANK.y + 12, TANK.y + TANK.h * 0.5);
  bait.vy = clamp(bait.vy, -0.08, 0.08);

  const sx = shark.x + SHARK_W / 2, sy = sharkY() + 20;
  for (const f of bait.fish) {
    f.phase += f.rate;
    const tx = bait.cx + f.ox + Math.cos(f.phase) * 3;
    const ty = bait.cy + f.oy + Math.sin(f.phase * 1.3) * 2;
    const px = f.x;
    f.x += (tx - f.x) * 0.018;
    f.y += (ty - f.y) * 0.018;
    // the split: pushed straight out from him, hardest when he is closest
    const dx = f.x - sx, dy = f.y - sy;
    const d = Math.hypot(dx, dy);
    if (d < 52) {
      const k = (1 - d / 52) * 0.9;
      f.x += (dx / (d || 1)) * k;
      f.y += (dy / (d || 1)) * k * 0.6;
      f.push = 12;
    } else if (f.push > 0) f.push--;
    // Face where it is actually GOING. Facing by which side of the ball it sits on - the
    // first attempt - has half of them swimming backwards at any moment, because a fish on
    // the left of the ball is as likely to be heading right as left. The threshold is
    // hysteresis: without it they flip every frame while they hover.
    f.vx = f.vx * 0.8 + (f.x - px) * 0.2;
    if (f.vx > 0.02) f.face = 1;
    else if (f.vx < -0.02) f.face = -1;
    f.frame = ((f.phase * 6) | 0) & 3;
  }
}

// for ?auto=verify: the drag is the only thing in this room whose behaviour cannot be
// seen in a still
export function hubTank() { return { shark, smoke, silt, crab, bait }; }

// Light coming down through the surface. Four shafts, each drifting on its own slow sine
// and fading out with depth - it is what turns a flat blue rectangle into water.
function lightShafts(ctx, l) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const drift = Math.sin(shark.t * 0.0035 + i * 2.1) * 9;
    const x = l + 16 + i * 34 + drift;
    const g = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h * 0.78);
    g.addColorStop(0, `rgba(190,240,255,${0.085 + 0.025 * Math.sin(shark.t * 0.02 + i)})`);
    g.addColorStop(1, 'rgba(150,220,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 4, TANK.y);
    ctx.lineTo(x + 8, TANK.y);
    ctx.lineTo(x + 24, TANK.y + TANK.h * 0.78);
    ctx.lineTo(x + 4, TANK.y + TANK.h * 0.78);
    ctx.closePath();
    ctx.fill();
  }
  // and the ripple those shafts come through, banded across the back wall near the top
  for (let i = 0; i < 5; i++) {
    const y = TANK.y + 6 + i * 7;
    const a = 0.05 + 0.035 * Math.sin(shark.t * 0.03 + i * 1.3);
    ctx.fillStyle = `rgba(210,245,255,${a})`;
    for (let x = 0; x < TANK.w; x += 2) {
      const h = 1 + Math.sin(x * 0.14 + shark.t * 0.025 + i) * 1.2;
      ctx.fillRect(l + x, y + h, 2, 1);
    }
  }
  ctx.restore();
}

function drawSilt(ctx, camX, near) {
  for (const m of silt) {
    if ((m.z > 0.62) !== near) continue;
    ctx.fillStyle = `rgba(200,235,255,${0.10 + m.z * 0.22})`;
    const s = m.z > 0.8 ? 2 : 1;
    ctx.fillRect(Math.round(m.x - camX), Math.round(m.y), s, s);
  }
}

function drawTank(ctx, camX) {
  const l = Math.round(TANK.x - camX);
  if (l > W || l + TANK.w < 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(l, TANK.y, TANK.w, TANK.h);
  ctx.clip();

  // The plate's blue only ever reached 150 logical, and the glass is 250 wide now, so
  // the water is painted rather than borrowed - a gradient, the far wall's slow swell,
  // and the glass box's own perspective edges.
  const water = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
  water.addColorStop(0, '#4a96d8');
  water.addColorStop(0.55, '#2f6fbe');
  water.addColorStop(1, '#1b4682');
  ctx.fillStyle = water;
  ctx.fillRect(l, TANK.y, TANK.w, TANK.h);
  for (let i = 0; i < 7; i++) {
    const cx = l + 14 + i * (TANK.w - 28) / 6 + Math.sin(shark.t * 0.004 + i) * 5;
    const g = ctx.createRadialGradient(cx, TANK.y + TANK.h * 0.6, 2, cx, TANK.y + TANK.h * 0.6, 26);
    g.addColorStop(0, 'rgba(14,46,96,0.30)');
    g.addColorStop(1, 'rgba(14,46,96,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - 26, TANK.y, 52, TANK.h);
  }
  // the box: the near glass edge, then the far wall inset from it
  const d = 9;
  ctx.strokeStyle = 'rgba(150,225,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(l + d + 0.5, TANK.y + d + 0.5, TANK.w - d * 2 - 1, TANK.h - d * 2 - 1);
  ctx.strokeStyle = 'rgba(150,225,255,0.28)';
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of [[0, 0, d, d], [TANK.w, 0, TANK.w - d, d],
    [0, TANK.h, d, TANK.h - d], [TANK.w, TANK.h, TANK.w - d, TANK.h - d]]) {
    ctx.moveTo(l + x0, TANK.y + y0); ctx.lineTo(l + x1, TANK.y + y1);
  }
  ctx.stroke();

  lightShafts(ctx, l);
  drawSilt(ctx, camX, false);
  // The neon sign inside the hull is a real light source in the scene, so it spills into
  // the water around it. Measured off lair_tankscape as a fraction of the glass, so it
  // follows the art if the tank is ever resized again.
  {
    const nx = l + TANK.w * 0.44, ny = TANK.y + TANK.h * 0.60;
    const pulse = 0.16 + 0.05 * Math.sin(shark.t * 0.05) + 0.03 * Math.sin(shark.t * 0.31);
    const g = ctx.createRadialGradient(nx, ny, 3, nx, ny, 62);
    g.addColorStop(0, `rgba(255,80,190,${pulse})`);
    g.addColorStop(1, 'rgba(255,60,170,0)');
    ctx.fillStyle = g;
    ctx.fillRect(nx - 62, ny - 62, 124, 124);
  }

  // his lair, on the tank floor and behind him - ONE generation across the full width
  const scape = ASSETS.lair_tankscape || fallbackArt('lair_tankscape', TANK.w, SCAPE_H);
  blit(ctx, scape, l + Math.round((TANK.w - frameW(scape)) / 2),
       TANK.y + TANK.h - frameH(scape));

  const cimg = ASSETS['lair_crab_' + ((crab.t / 16 | 0) & 3)];
  if (cimg) {
    const cx = Math.round(crab.x - camX);
    if (crab.dir < 0) {
      ctx.save();
      ctx.scale(-1, 1);
      blit(ctx, cimg, -cx - frameW(cimg), TANK.y + TANK.h - frameH(cimg) - 2);
      ctx.restore();
    } else {
      blit(ctx, cimg, cx, TANK.y + TANK.h - frameH(cimg) - 2);
    }
  }
  for (const f of bait.fish) {
    const img = ASSETS['lair_baitfish_' + f.frame];
    if (!img) break;
    const fx = Math.round(f.x - camX), fy = Math.round(f.y);
    if (f.face < 0) {
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
    const sy = Math.round(sharkY());
    ctx.save();
    // banking into the turn - a shark that reverses on the spot reads as a cardboard cutout
    if (shark.turn > 0) {
      const cx = sx + frameW(simg) / 2, cy = sy + frameH(simg) / 2;
      ctx.translate(cx, cy);
      ctx.rotate(Math.sin((shark.turn / 20) * Math.PI) * 0.22 * -shark.dir);
      ctx.translate(-cx, -cy);
    }
    if (shark.dir < 0) {
      ctx.scale(-1, 1);
      blit(ctx, simg, -sx - frameW(simg), sy);
    } else {
      blit(ctx, simg, sx, sy);
    }
    ctx.restore();
  }

  // the ember, which the quantized palette flattened out of the sprite. It glows on its
  // own and flares while he is drawing on it, which is what makes the puff read as his.
  {
    const [cx, cy] = cigarTip();
    const draw = shark.draw > 22 ? (shark.draw - 22) / 24 : 0;
    ctx.fillStyle = `rgba(255,${120 + draw * 90},${40 + draw * 60},${0.75 + draw * 0.25})`;
    ctx.fillRect(Math.round(cx - camX), Math.round(cy), 1, 1);
    if (draw > 0.1) {
      ctx.fillStyle = `rgba(255,150,60,${0.30 * draw})`;
      ctx.fillRect(Math.round(cx - camX) - 1, Math.round(cy) - 1, 3, 3);
    }
  }

  for (const s of smoke) {
    ctx.fillStyle = `rgba(232,238,244,${0.70 * s.life})`;
    const r = Math.max(1, Math.round(s.r));
    ctx.fillRect(Math.round(s.x - camX - r / 2), Math.round(s.y - r / 2), r, r);
  }

  for (const b of bubbles) {
    ctx.fillStyle = `rgba(210,245,255,${0.30 + 0.26 * Math.sin(b.phase)})`;
    const bw = Math.max(1, Math.round(b.r));
    ctx.fillRect(Math.round(b.x - camX), Math.round(b.y), bw, bw);
  }

  drawSilt(ctx, camX, true);

  // the water in front of everything in it
  ctx.fillStyle = 'rgba(40,150,200,0.16)';
  ctx.fillRect(l, TANK.y, TANK.w, TANK.h);
  const shimmer = ctx.createLinearGradient(0, TANK.y, 0, TANK.y + TANK.h);
  shimmer.addColorStop(0, 'rgba(180,240,255,0.20)');
  shimmer.addColorStop(1, 'rgba(180,240,255,0)');
  ctx.fillStyle = shimmer;
  ctx.fillRect(l, TANK.y, TANK.w, TANK.h);
  ctx.restore();

  const frame = ASSETS.lair_tank_frame;
  if (frame) blit(ctx, frame, Math.round(TANK_FRAME.x - camX), TANK_FRAME.y);
}


// ------------------------------------------------------------------ the bed
// She is not waiting for him and does not react to him - she is just someone living in
// the room. Poses drift on their own and a line goes off now and then with a long gap
// either side of it; a line every few seconds reads as a chatbot, not as company.
//
// The register is the whole job here. Every line is said by someone who is already
// impressed and would rather he came to bed than went back out - fond, unhurried,
// teasing him for winning too much. Nothing that nags, nothing that asks him for
// anything, nothing that needs to know where he has been.
const IDLE_LINES = [
  'you already won, big guy',
  'you work too hard...',
  'it is four in the morning',
  'the city can wait',
  'still hitting that bag?',
  'the bag will still be there',
  'one more act, you said',
  'come back to bed, chad',
  'nothing left to prove tonight',
  'your side is getting cold',
  'the bag never loved you back',
  'i can hear you flexing',
  'even gods sleep, you know',
  'leave some for tomorrow',
  'the shelf is full, champ',
  'put the cigar out...',
  'that shark is up late too',
  'you are the trophy, chad',
  'mm...',
];

// Eight poses in a tight chain: sitting against the headboard, a hand slips, leaning
// back on one hand then both, down onto an elbow, hand to her hair, onto her side, onto
// her front. The room steps between NEIGHBOURS only, so the size of one step is the
// whole quality of it; a fixed loop over all eight reads as an animation flicking over.
const BED_POSES = 8;
const LINE_HOLD = 280;             // ~4.7s on screen
// ~13-28s between lines. Measured over 400 runs of the verify window, that puts a bubble
// on screen 21% of the time against the 10% it used to be - twice as talkative and still
// quiet four fifths of the evening.
const LINE_GAP = [800, 1700];
const POSE_HOLD = [200, 520];      // ~3.3-8.7s per pose

const bed = { pose: 0, hold: 300, line: null, lines: null, lineT: 0, next: 900, said: -1 };

function resetBed() {
  bed.pose = irand(0, BED_POSES - 1);
  bed.hold = irand(...POSE_HOLD);
  bed.line = null;
  bed.lines = null;
  bed.lineT = 0;
  bed.next = irand(...LINE_GAP);
  bed.said = -1;
}

function say() {
  let i = irand(0, IDLE_LINES.length - 1);
  if (i === bed.said) i = (i + 1) % IDLE_LINES.length;  // never the same line twice running
  bed.said = i;
  bed.line = IDLE_LINES[i];
  bed.lines = wrapText(bed.line);
  bed.lineT = LINE_HOLD;
}

function updateBed() {
  if (bed.lineT > 0) bed.lineT--;
  if (--bed.hold <= 0) {
    // a step to an adjacent pose, never a jump across the set
    bed.pose = clamp(bed.pose + (Math.random() < 0.5 ? -1 : 1), 0, BED_POSES - 1);
    bed.hold = irand(...POSE_HOLD);
  }
  if (--bed.next <= 0) {
    bed.next = irand(...LINE_GAP);
    say();
  }
}

const bedFrame = () => 'lair_bed_' + bed.pose;

// A speech bubble in the wall plane, so CHAD passes in front of it like everything else.
// Rounded corners, a dark rule, a dropped shadow and shaded paper: a plain white rectangle
// reads as debug text sitting on top of the game rather than something in the room.
//
// Wrapped, and that is the load-bearing part. 'it is four in the morning' on one line is
// 109 logical px of a 480 px screen, so the keep-it-on-screen clamp shoved the whole box
// into the middle of the room with the tail stretching back to her head. Two short lines
// sit over the pillow where they belong.
const BUBBLE_W = 62;               // max text width per line
const LINE_LEAD = 8;
const POP = 5;                     // frames it takes to grow out of the tail

function wrapText(text) {
  const words = text.split(' ');
  const lines = [''];
  for (const word of words) {
    const line = lines[lines.length - 1];
    if (line && textWidth(line + ' ' + word, 1) > BUBBLE_W) lines.push(word);
    else lines[lines.length - 1] = line ? line + ' ' + word : word;
  }
  // then balance the two-line case: greedy gives 'the city can / wait', which fills the
  // same box as 'the city / can wait' and reads as the line having run out rather than
  // as a break someone chose.
  if (lines.length === 2) {
    let best = null;
    for (let k = 1; k < words.length; k++) {
      const pair = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
      const wide = Math.max(textWidth(pair[0], 1), textWidth(pair[1], 1));
      if (wide <= BUBBLE_W && (!best || wide < best.wide)) best = { wide, pair };
    }
    if (best) return best.pair;
  }
  return lines;
}

// grow is 0..1: the balloon swells out of the tail, and the words only appear once it has
// finished. A box that fades up at full size reads as a caption; one that pops reads as
// someone speaking.
function drawBubble(ctx, cx, bottom, lines, a, grow) {
  const pad = 5;
  const fullW = Math.max(...lines.map((l) => textWidth(l, 1))) + pad * 2;
  const fullH = (lines.length - 1) * LINE_LEAD + 7 + pad * 2;
  const w = Math.round(fullW * (0.4 + 0.6 * grow));
  const h = Math.round(fullH * (0.45 + 0.55 * grow));
  const tail = Math.round(2 + 3 * grow);
  const x = Math.round(clamp(cx - w / 2, 3, W - w - 3)), y = Math.round(bottom - h - tail);
  const tx = Math.round(clamp(cx, x + 6, x + w - 6));

  const body = (dx, dy, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(x + dx + 2, y + dy, w - 4, h);           // 2px round on each corner
    ctx.fillRect(x + dx + 1, y + dy + 1, w - 2, h - 2);
    ctx.fillRect(x + dx, y + dy + 2, w, h - 4);
    ctx.beginPath();
    ctx.moveTo(tx + dx - 3, y + dy + h - 1);
    ctx.lineTo(tx + dx + 4, y + dy + h - 1);
    ctx.lineTo(tx + dx, y + dy + h + tail);
    ctx.closePath();
    ctx.fill();
  };

  ctx.save();
  ctx.globalAlpha = a * 0.35;
  body(1, 2, '#0c0812');                                  // dropped shadow
  ctx.globalAlpha = a;
  body(0, 0, '#241c2e');                                  // the dark rule...
  ctx.fillStyle = '#f8f2e2';                              // ...with the paper inside it
  ctx.fillRect(x + 3, y + 1, w - 6, h - 2);
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillRect(x + 1, y + 3, w - 2, h - 6);
  ctx.fillStyle = '#e7dbc1';                              // lit from above, like everything else
  ctx.fillRect(x + 3, y + h - 3, w - 6, 2);
  ctx.beginPath();                                        // the tail's paper, one px inside the rule
  ctx.moveTo(tx - 2, y + h - 1);
  ctx.lineTo(tx + 3, y + h - 1);
  ctx.lineTo(tx, y + h + tail - 2);
  ctx.closePath();
  ctx.fill();
  if (grow >= 1) {
    const ty = y + Math.round((h - (fullH - pad * 2)) / 2);
    lines.forEach((l, i) => drawText(ctx, l, x + Math.round((w - textWidth(l, 1)) / 2),
      ty + i * LINE_LEAD, '#2a2030', 1));
  }
  ctx.restore();
}

function drawBed(ctx, camX) {
  drawFixtureArt(ctx, camX, BED, artFor({ art: bedFrame(), w: BED.w, h: BED.h }));
  if (bed.lineT <= 0 || !bed.lines) return;
  const x = BED.x - camX;
  if (x < -90 || x > W + 90) return;
  const age = LINE_HOLD - bed.lineT;
  // pops out over POP frames, holds, then fades slowly
  const a = Math.min(1, age / 3, bed.lineT / 30);
  const grow = Math.min(1, (age + 1) / POP);
  // her head, not the bed's centre: measured at logical +33 from BED.x across the poses
  drawBubble(ctx, x + 33, BED.y - BED.h + 6, bed.lines, a, grow);
}

// ----------------------------------------------------------------- the tiger
// Not a prop (nothing can hit him) and not an enemy, so he goes on G.actors, which
// drawWorld y-sorts by calling whatever the entry's own draw() says. White on purpose:
// the room is walnut and black granite and a dark animal sinks into it - which is also
// why the doberman that used to share the room with him is gone. One animal padding
// about reads as a pet; two reads as a kennel.
//
// He lives WITH CHAD rather than in one spot: he settles wherever the man has ended up,
// gets up and comes after him when he wanders off, and re-settles now and then for no
// reason. He had a den on the hearth rug for a while and it fixed him to one object -
// most of the room never saw him at all.
//
// What he never does is CUT between poses. Lying down he breathes; woken his head comes
// up and the rest of him does not; to get up he sits, then stretches, then walks. Same
// rule as the bed poses: two unrelated drawings swapped on a timer read as a cut however
// long each one is held.
const tiger = {
  x: 1290, y: 226, face: -1, state: 'lie', t: 0, target: 1290,
  frame: 0, phase: 0, alert: 0, snarl: 0, roam: 600,
};
const SPEED = 0.42;
const SIT_HOLD = 90;         // frames of sitting before he commits to getting up
const STRETCH_HOLD = 64;
const SETTLE = 900;          // sitting this long with nothing happening and he lies down
const NEAR = 96;             // a body length: close enough that he notices you
const FOLLOW = 300;          // further off than this and he gets up and comes after him
const ROAM = [1200, 3000];   // and he re-settles this often anyway, for no reason at all

// Something happened over there. His head comes up wherever he is - that part is not
// gated on distance, because an animal that ignores a noise across the room is furniture -
// but he only walks over if he was near enough to care.
export function petsWatch(x, urgency) {
  tiger.alert = Math.max(tiger.alert, urgency === undefined ? 150 : urgency);
  if (Math.abs(tiger.x - x) > 190) return;
  tiger.target = clamp(x + (tiger.x < x ? -56 : 56), 90, HUB_WIDTH - 90);
  if (tiger.state === 'lie') { tiger.state = 'wake'; tiger.t = 0; }
}

// he clears out when the room goes up, and shows his teeth about it on the way
function petsScatter() {
  tiger.target = HUB_WIDTH - 140;
  tiger.state = 'walk';
  tiger.t = 0;
  tiger.alert = 0;
  tiger.snarl = 40;
}

// Coming back from Delhi to find him mid-prowl on whatever timer he happened to be on is
// the one moment the room reads as a simulation that was left running.
function resetTiger() {
  tiger.x = 1290; tiger.y = 226; tiger.face = -1;
  tiger.state = 'lie'; tiger.t = 0; tiger.target = 1290;
  tiger.frame = 0; tiger.phase = 0; tiger.alert = 0; tiger.snarl = 0;
  tiger.roam = irand(...ROAM);
}

// The one place that says which drawing to use, so nothing else has to know the poses.
function tigerPose() {
  if (tiger.snarl > 0) return 'snarl';
  switch (tiger.state) {
    case 'walk': return String(tiger.frame);
    case 'lie': return 'lie';
    case 'wake': return 'wake';
    case 'stretch': return 'stretch';
    default: return 'sit';
  }
}

// Somewhere new to be: beside CHAD, on whichever side he is already on, so settling down
// never means walking through him. Returns false when he is happy where he is.
function resettle(player) {
  if (tiger.roam > 0 && Math.abs(player.x - tiger.x) < FOLLOW) return false;
  const side = tiger.x < player.x ? -1 : 1;
  tiger.target = clamp(player.x + side * rand(48, 150), 90, HUB_WIDTH - 90);
  tiger.roam = irand(...ROAM);
  return Math.abs(tiger.target - tiger.x) > 3;
}

function updatePet() {
  tiger.t++;
  if (tiger.alert > 0) tiger.alert--;
  if (tiger.snarl > 0) tiger.snarl--;
  if (tiger.roam > 0) tiger.roam--;
  const player = G.player;

  switch (tiger.state) {
    case 'lie':
      // down on his side, facing the room. The only thing moving is his ribs.
      tiger.face = player.x < tiger.x ? -1 : 1;
      // He lifts his head when you walk up to him. This is the one place a proximity
      // trigger is right rather than lazy: it is all a lying cat does, and the room
      // already uses it for the sleepers in the suite. What it must NOT do is get him up.
      if (tiger.alert > 0 || Math.abs(player.x - tiger.x) < NEAR || resettle(player)) {
        tiger.state = 'wake'; tiger.t = 0;
      }
      return;

    case 'wake':
      // head up and watching, everything below the neck still on the floor
      tiger.face = player.x < tiger.x ? -1 : 1;
      if (tiger.t > 40 && (tiger.alert > 90 || Math.abs(tiger.target - tiger.x) > 3)) {
        tiger.state = 'sit'; tiger.t = 0;
      } else if (tiger.t > 150 && tiger.alert <= 0
                 && Math.abs(player.x - tiger.x) > NEAR) {
        tiger.state = 'lie'; tiger.t = 0;
      }
      return;

    case 'sit':
      tiger.face = player.x < tiger.x ? -1 : 1;
      if (tiger.t > SIT_HOLD && Math.abs(tiger.target - tiger.x) > 3) {
        tiger.state = 'stretch'; tiger.t = 0;
      } else if (tiger.t > SETTLE && tiger.alert <= 0) {
        tiger.state = 'lie'; tiger.t = 0;
      } else if (tiger.t > 120) {
        resettle(player);
      }
      return;

    case 'stretch':
      // chest down, hindquarters up, and it HOLDS. A stretch you can miss is not one.
      if (tiger.t > STRETCH_HOLD) { tiger.state = 'walk'; tiger.t = 0; }
      return;
  }

  const dx = tiger.target - tiger.x;
  if (Math.abs(dx) < 3) { tiger.state = 'sit'; tiger.t = 0; return; }
  tiger.face = dx < 0 ? -1 : 1;
  tiger.x += Math.sign(dx) * SPEED;
  tiger.y += (clamp(player.y + 14, 214, 238) - tiger.y) * 0.02;
  tiger.phase += SPEED;
  tiger.frame = (tiger.phase / 5 | 0) % 8;
}
function drawPet(ctx, camX) {
  const img = ASSETS['lair_tiger_' + tigerPose()] || ASSETS.lair_tiger_lie;
  if (!img) return;
  const w = frameW(img), h = frameH(img);
  const x = Math.round(tiger.x - camX), y = Math.round(tiger.y);
  if (x + w < -20 || x - w > W + 20) return;
  // he breathes in his sleep. One pixel on a slow sine, and it is the whole difference
  // between a sleeping animal and a rug.
  const breath = tiger.state === 'lie' ? Math.round(Math.sin(tiger.t * 0.022)) : 0;
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.38, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the art faces right, so -1 is the one that needs flipping
  if (tiger.face === -1) {
    ctx.save();
    ctx.scale(-1, 1);
    blit(ctx, img, -x - w / 2, y - h + breath);
    ctx.restore();
  } else {
    blit(ctx, img, x - w / 2, y - h + breath);
  }
}

export const hubTiger = () => tiger;

// G.actors entries draw themselves; y is what drawWorld sorts on.
const petActors = [{
  get y() { return tiger.y; },
  reflect: true,
  draw: drawPet,
}];

// --------------------------------------------------------------- update
// the verify suite needs to see the sleepers' state; nothing else reads this
export const hubBed = () => bed;
// for the ?auto=hub-bed screenshot: one way in, or setting bed.line by hand skips the wrap
// and the bubble draws empty
export function hubSay(text) {
  bed.line = text;
  bed.lines = wrapText(text);
  bed.lineT = LINE_HOLD;
}

export function resetHub() {
  resetTiger();
  resetTank();
  resetBed();
  G.actors = petActors.slice();
  G.hubSeat = 0;
  G.hubStation = null;
  G.hubFlex = 0;
  G.hubSel = null;
  G.hubPanel = null;
}

// Returns the global stage index the player just committed to, or -1.
export function updateHub() {
  swingBag(G.props[0]);
  updateTank();
  updateBed();
  updatePet();
  if (G.hubRelicT > 0) G.hubRelicT--;
  if (G.hubFlex > 0 && --G.hubFlex === 0) G.player.state = 'idle';
  // the combo pulls them in, and RAGNAROK sends them to opposite ends of the room
  if (G.combo >= 6 && G.combo % 6 === 0) petsWatch(G.player.x, 220);
  if (G.player.state === 'special' && G.player.t === 1) petsScatter();

  // He is on the sofa or under a bar: input is frozen, the player sprite is hidden and
  // the furniture is drawing him. main.js already gates all of that on hubSeat.
  if (G.hubSeat > 0) {
    G.hubSeat++;
    if (G.hubStation === 'bar') {
      // the AAAH lands when he finishes it, not when he picks it up
      if (G.hubSeat === DRINK_AAAH) spawnPop(barAt, G.player.y - 104, 'AAAH');
      if (G.hubSeat > DRINK_END) { G.hubSeat = 0; G.hubStation = null; return -1; }
    } else if (G.hubSeat % SMOKE_CYCLE === SMOKE_EXHALE) {
      // one plume per drag, from his mouth, timed to the pose that blows it
      for (let i = 0; i < 3; i++) spawnSmoke(LOUNGE.x + 4 + rand(-2, 2), LOUNGE.y - 56, 1);
    }
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
  if (sel && sel !== 'bag' && input.pressed('use') && !G.hubFlex) {
    if (sel === 'mirror') {
      pose(96);
      G.hubFlex = 96;
      G.audio.voice('duke_look_good', 2200);
    } else if (sel === 'bar' || sel === 'lounge') {
      G.hubSeat = 1;
      G.hubStation = sel;
          G.audio.sfx('blip');
      petsWatch(fixtureAt(sel).x - 40);
      // he drinks where he is standing, not at the fixture's x, or he snaps sideways
      if (sel === 'bar') barAt = p.x;
    } else {
      openPanel(sel);
    }
  }
  return -1;
}

const anyKey = () => ['back', 'attack', 'jump', 'parry', 'use', 'up', 'down', 'left', 'right']
  .some((a) => input.pressed(a));


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
  drawFire(ctx, camX);
  drawFixtureArt(ctx, camX, LOUNGE, artFor({
    art: G.hubStation === 'lounge' ? loungeFrame() : 'lair_lounge_empty',
    w: LOUNGE.w, h: LOUNGE.h,
  }));
  if (G.hubStation === 'bar') {
    // +2 because the set carries the same 3-device foot padding his standing sprite has
    drawFixtureArt(ctx, camX, { x: barAt, y: G.player.y + 2, w: 36, h: 94 },
      artFor({ art: barDrinkFrame(), w: 36, h: 94 }));
  }
  drawBed(ctx, camX);

  drawMirrorGlint(ctx, camX);
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
  // d.flip mirrors the art about its own centre. The pair of armchairs is one generation
  // used twice, and two identical chairs either side of the sofa read as a copy-paste
  // rather than as a suite.
  if (d.flip) {
    ctx.save();
    ctx.translate(2 * x + frameW(img), 0);
    ctx.scale(-1, 1);
  }
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
  if (d.flip) ctx.restore();
}

// The alcove is painted into the plate, three lit glass shelves; what changes is what
// is standing on them. One relic per boss CHAD has put down - the thing he took off
// that boss - so the shelf reads as a record of the fights. Shelf y measured off the
// plate; the bays fill left to right, top down, in the order you beat them.
// Surface y is where a relic's feet go, measured off the plate's glass shelves. The
// tightest bay is the top one at 25 logical of headroom, which is what caps relic
// height in tools/process_props.py.
const beatenBosses = () => Object.keys(BOSSES)
  .map((k) => ({ k, act: STAGES.findIndex((s) => s.boss === k) }))
  .filter((b) => b.act >= 0 && b.act < G.unlockedStage)
  .sort((a, b) => a.act - b.act);

function drawAlcove(ctx, camX) {
  const ox = TROPHY_WALL[0] - camX;
  if (ox > W || ox + (TROPHY_WALL[1] - TROPHY_WALL[0]) < 0) return;
  const beaten = beatenBosses();
  const slots = RELIC_SLOTS;
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
    // A contact shadow on the glass. Without it a relic reads as pasted onto the back of
    // the niche however exactly its feet land, because nothing else in the bay touches.
    if (!drop) {
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x + frameW(img) / 2, sy, frameW(img) * 0.42, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (arriving && G.hubRelicT > 100 && (G.rawTime & 2)) ctx.filter = 'brightness(2.2)';
    blit(ctx, img, x, Math.round(sy - frameH(img) + drop));
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

const MAP_BEZEL = 5;   // the gilt frame's width in lair_worldmap.png

// One pin per unlocked chapter, so the map on the wall says how far the tour got.
function drawMapPins(ctx, camX) {
  const d = artAt('lair_worldmap');
  const left = d.x - camX - d.w / 2, top = d.y - d.h;
  if (left > W || left + d.w < 0) return;
  CHAPTERS.forEach((c, i) => {
    if (c.acts[0] > G.unlockedStage) return;
    // the wall map is the same projection as the panel, just small. MAP_BEZEL is the
    // gilt frame measured off the sprite - a pin outside it lands on the gold.
    const px = Math.round(left + MAP_BEZEL + (c.pin[0] / W) * (d.w - MAP_BEZEL * 2));
    const py = Math.round(top + MAP_BEZEL + (c.pin[1] / H) * (d.h - MAP_BEZEL * 2));
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
    trophies: [TROPHY_WALL[0] - 6, 33, TROPHY_WALL[1] - TROPHY_WALL[0] + 12, 110],
    lounge: [LOUNGE.x - LOUNGE.w / 2 - 2, LOUNGE.y - LOUNGE.h, LOUNGE.w + 4, LOUNGE.h],
    map: artRing('lair_worldmap', 3),
    hifi: [880 - 26, WALL_BASE - 62, 52, 62],
    bag: [BAG_X - 15, 114, 30, 88],
    mirror: MIRROR_FRAME,
  };
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
    const hint = 'ANY KEY: ' + (G.hubStation === 'bar' ? 'PUT IT DOWN' : 'GET UP');
    drawTextShadow(ctx, hint, (W - textWidth(hint, 1)) / 2, 246, '#686098', 1);
    return;
  }

  const f = G.hubSel && fixtureAt(G.hubSel);
  if (f) {
    const x = Math.round(f.x - G.camX);
    const bob = Math.round(Math.sin(G.rawTime * 0.12) * 2);
    const LOW = { bag: 100, lounge: 118, curl: 84, bench: 112 };
    const y = LOW[f.id] === undefined ? 26 : LOW[f.id];
    if (!f.key) upArrow(ctx, x, y + 10 + bob, '#ffd94a');
    const hint = (f.key || 'F') + ': ' + f.hint;
    drawTextShadow(ctx, hint, x - textWidth(hint, 1) / 2, y + bob, '#f8f0e0', 1);
  }

  // The title screen used to carry the full control list. It belongs here instead: this is
  // the room you stand in before you go anywhere, and everything in the list can be tried
  // on the spot - there is a bag to hit and a mirror to flex at.
  const foot = [
    'ARROWS MOVE   F USE   Z PUNCH   X JUMP   HOLD C PARRY   SPACE METEOR LARIAT',
    'DOUBLE TAP TO DASH, HOLD TO RUN   GREEN CUE: PARRY   RED CUE: EVADE',
    'TAP Z OR X WHILE DOWN TO GET UP FAST   ESC PAUSE   BACKSPACE TITLE',
  ];
  for (let i = 0; i < foot.length; i++) {
    drawTextShadow(ctx, foot[i], (W - textWidth(foot[i], 1)) / 2, 246 + i * 9, '#686098', 1);
  }
}
