import { INDIA_PROPS } from './india_assets.js';
// props.js - breakable market scenery. Props are duck-typed like fighters (they
// expose hurt()), so player.js hits them through the same target list and
// main.js y-sorts them with everything else. No special-casing in the combat code.
import { G, addScore } from './engine.js';
import { ASSETS } from './assets.js';
import { Pix, blit, frameW, frameH } from './sprites.js';
import { spawnDebris, spawnDust, spawnSmoke, spawnPop, impact } from './effects.js';

// kind -> { hp, w, h, shadowR, score, drop, debris }
export const PROP_TYPES = {
  crate: { hp: 20, w: 30, h: 32, shadowR: 14, score: 50, drop: 'shake', debris: ['#b0682e', '#8a4a20', '#d8a860'] },
  matka: { hp: 12, w: 24, h: 26, shadowR: 11, score: 30, drop: null, debris: ['#a4562c', '#7c3a1c', '#c98a58'] },
  tyres: { hp: 26, w: 32, h: 34, shadowR: 15, score: 50, drop: null, debris: ['#2a2a2e', '#3c3c42', '#18181c'] },
  table: { hp: 18, w: 44, h: 30, shadowR: 20, score: 40, drop: 'plate', debris: ['#8a6a3a', '#c0a068', '#5a4426'] },
  sign: { hp: 14, w: 40, h: 22, shadowR: 0, score: 60, drop: null, debris: ['#c02a2a', '#f0c040', '#f8f0e0'] },
  // CHAD's bike, parked where the arrival leaves it. `decor` keeps it out of every
  // target list: it y-sorts with the world but nobody can hit it.
  bike: { hp: 1, w: 120, h: 44, shadowR: 44, score: 0, drop: null, decor: true, debris: [] },
  cart: { hp: 45, w: 58, h: 44, shadowR: 26, score: 150, drop: 'shake', debris: ['#c08a3a', '#8a5a20', '#d8d0b8'] },
  // the dojo heavy bag. js/hub.js builds it with its own hurt() so it never breaks;
  // this entry exists for the footprint and so tools/production/process_props.py can size the art.
  bag: { hp: 9999, w: 24, h: 84, shadowR: 0, score: 0, drop: null, debris: ['#5a3a20', '#3a2414', '#8a6a44'] },

  // ---- DIRTY DELHI ----
  // `art` borrows another prop's sprite until this one has its own generation.
  // the level's only 1-up, one lane back behind a stall you have to break first
  mithai: { hp: 10, w: 26, h: 20, shadowR: 11, score: 200, drop: 'life', art: 'crate', debris: ['#f0d0a0', '#e8a840', '#c86030'] },
  // the heavy's prop: a handcart in the market, a boat pole on the ghat
  thelacart: { hp: 30, w: 54, h: 40, shadowR: 24, score: 120, drop: null, art: 'cart', debris: ['#c08a3a', '#8a5a20', '#d8d0b8'] },
  thelapole: { hp: 30, w: 70, h: 14, shadowR: 10, score: 120, drop: null, art: 'sign', debris: ['#a8804a', '#6a4a24', '#d0b888'] },
  // break it and the dhobi loses 34 px of the longest reach in the game
  dhobislab: { hp: 40, w: 46, h: 18, shadowR: 20, score: 160, drop: null, art: 'table', debris: ['#8a8a8a', '#b8b8b0', '#5a5a58'] },

  // ---- THE NIGHT TRAIN ----
  nr_trolley:{hp:20,w:54,h:58,shadowR:0,score:60,drop:'shake',debris:['#987653','#62504b']},
  nr_case:{hp:20,w:42,h:28,shadowR:0,score:60,drop:'shake',debris:['#344b64','#bc9561']},
  nr_table:{hp:18,w:56,h:44,shadowR:0,score:40,drop:'plate',debris:['#987653','#62504b']},
  // the pantry car's urn: the big heal before the inspector's office, no fire left on the floor
  nr_urn:{hp:22,w:28,h:48,shadowR:0,score:80,drop:'shake',glass:true,debris:['#dcbb72','#664d25','#f0d890']},
  nr_crate:{hp:20,w:44,h:30,shadowR:0,score:60,drop:'shake',debris:['#6b4a2a','#c9a14a']},
  // Carried loads: the coolie's dropped trunk and the smuggler's crate. No drops; the crate spills cash itself.
  nr_trunk:{hp:14,w:42,h:28,shadowR:0,score:40,drop:null,art:'nr_case',debris:['#344b64','#bc9561']},
  nr_cargo:{hp:20,w:44,h:30,shadowR:0,score:100,drop:null,art:'nr_crate',debris:['#6b4a2a','#c9a14a']},
  nr_contraband:{hp:28,w:44,h:30,shadowR:0,score:200,drop:'life',debris:['#344b64','#bc9561']},
};

// Stage breakables drop food; boss furniture and carried rigs (desk, partitions, cabinet) drop nothing.
const INDIA_DROPS={ic_cart:'shake',ic_stall:'shake',ic_cargo:'shake',ic_monitor:'shake',ic_server:'shake',ic_shelf:'plate'};
const INDIA_GLASS=new Set(['ic_monitor','ic_server','ic_partition']);
for(const [name,[w,h]]of Object.entries(INDIA_PROPS)){const hp={ic_cabinet:30,ic_execdesk:40,ic_partition:24}[name]||24;PROP_TYPES[name]={hp,w,h,shadowR:w*.3,score:70,drop:INDIA_DROPS[name]||null,glass:INDIA_GLASS.has(name),debris:['#796049','#b39971','#3b4144']};}
// Debris in each prop's own materials, so the burst reads as that object coming apart.
Object.assign(PROP_TYPES.ic_cart,{debris:['#8a6034','#c89a58','#4a3420']});
Object.assign(PROP_TYPES.ic_stall,{debris:['#6fa35a','#e0a030','#8a6034','#c84a2a']});
Object.assign(PROP_TYPES.ic_boiler,{debris:['#b08040','#e0c080','#5a4020']});
Object.assign(PROP_TYPES.ic_cargo,{debris:['#a07a48','#d8b878','#5a4428']});
Object.assign(PROP_TYPES.ic_monitor,{debris:['#d8d0b8','#3a5a58','#9ad0c8']});
Object.assign(PROP_TYPES.ic_server,{debris:['#2a3034','#5a6870','#7ac0e0']});
Object.assign(PROP_TYPES.ic_shelf,{debris:['#3a4040','#d8d0b8','#8a6a44']});
Object.assign(PROP_TYPES.ic_cabinet,{debris:['#4a5a3a','#7a8a5a','#d8d0b8']});
// The porter's separate cart spills produce when its front is broken.
PROP_TYPES.ic_thela={...PROP_TYPES.ic_cart,hp:30,art:'ic_cart',drop:'plate',debris:['#e0a030','#6fa35a','#796049']};

// Use scenery crashes rather than body slams; the attack owns the contact sound.
for(const kind of ['crate','table','cart','mithai','thelacart','thelapole','nr_table','nr_crate','nr_cargo','ic_cart','ic_stall','ic_cargo','ic_thela','ic_execdesk'])PROP_TYPES[kind].breakSound='break_wood';
for(const kind of ['nr_urn','nr_trolley','ic_boiler','ic_cabinet','ic_server'])PROP_TYPES[kind].breakSound='break_metal';

// Delhi's play copies are larger than the approved cinematic props. Hit bounds follow
// their opaque body, not the padded PNG canvas; fragments use the selected PNG itself.
export const DELHI_PROP_FOOTPRINT={
  ic_stall:{w:93,h:44,shadowR:27.9},ic_cart:{w:90,h:47,shadowR:27},
  ic_cargo:{w:56,h:42,shadowR:16.8},ic_thela:{w:124.5,h:47,shadowR:31},
};
const delhiPlayProps=()=>G.stage?.id==='delhi'&&G.state!=='intro';
const mirroredCart=pr=>pr.face<0&&(delhiPlayProps()&&pr.prop==='ic_thela'||pr.indiaBossProp&&pr.role==='cabinet');

// ---- procedural art (swapped for AI PNGs later without touching this file) --
const ART = {};
const PORTER_WHEELS = new WeakMap();
function drawPorterWheels(ctx, pr, image, dx, dy) {
  let wheel = PORTER_WHEELS.get(image);
  if (!wheel) {
    wheel = document.createElement('canvas'); wheel.width = wheel.height = 46;
    const c = wheel.getContext('2d'); c.imageSmoothingEnabled = false;
    c.beginPath(); c.arc(23, 23, 23, 0, Math.PI * 2); c.clip();
    c.drawImage(image, 174, 40, 46, 46, 0, 0, 46, 46);
    PORTER_WHEELS.set(image, wheel);
  }
  // The painted rim and cart bed stay fixed; their authored spokes turn underneath.
  for (const [x, y, r, far] of [[147, 63, 19, true], [197, 63, 23, false]]) {
    ctx.save();
    if (far) { ctx.beginPath(); ctx.rect(dx + 56, dy + 32, 36, 16); ctx.clip(); }
    ctx.translate(dx + x / 2, dy + y / 2);
    ctx.rotate((pr.wheelTravel || 0) / (r / 2));
    ctx.drawImage(wheel, -r / 2, -r / 2, r, r);
    ctx.restore();
  }
}

function crate() {
  const P = new Pix(30, 32);
  P.rect(1, 4, 28, 28, '#8a4a20');
  P.rect(1, 4, 28, 3, '#c08a4a');
  P.rect(1, 4, 3, 28, '#a4602c');
  P.rect(26, 4, 3, 28, '#6a3616');
  for (let y = 9; y < 30; y += 7) P.rect(2, y, 26, 2, '#b0682e');
  P.rect(12, 4, 5, 28, '#a4602c');
  P.rect(0, 30, 30, 2, '#4a2410');
  // fruit spilling over the top
  P.disc(8, 4, 3, '#d84a30'); P.disc(15, 3, 3, '#e8a020'); P.disc(22, 4, 3, '#4a9a30');
  return P.c;
}

function matka() {
  const P = new Pix(24, 26);
  P.disc(12, 15, 10, '#a4562c');
  P.disc(10, 12, 7, '#c07040');
  P.rect(8, 2, 8, 6, '#8e4622');
  P.rect(7, 1, 10, 2, '#c98a58');
  P.rect(2, 24, 20, 2, '#4a2010');
  P.hline(4, 20, 16, '#7c3a1c');
  return P.c;
}

function tyres() {
  const P = new Pix(32, 34);
  for (let i = 0; i < 3; i++) {
    const y = 32 - i * 10;
    P.disc(16, y - 4, 13, '#2a2a2e');
    P.disc(16, y - 4, 7, '#48484e');
    P.disc(16, y - 4, 5, '#1a1a1e');
    for (let a = 0; a < 8; a++) {
      const ax = 16 + Math.cos(a) * 11, ay = y - 4 + Math.sin(a) * 4;
      P.px(ax | 0, ay | 0, '#3c3c42');
    }
  }
  return P.c;
}

function table() {
  const P = new Pix(44, 30);
  P.rect(0, 6, 44, 5, '#a4844a');
  P.rect(0, 6, 44, 2, '#c0a068');
  P.rect(4, 11, 4, 19, '#7a5a2e');
  P.rect(36, 11, 4, 19, '#7a5a2e');
  // chai glasses
  P.rect(9, 1, 4, 5, '#d8d8e0'); P.rect(9, 2, 4, 3, '#a4682c');
  P.rect(17, 2, 4, 4, '#d8d8e0'); P.rect(17, 3, 4, 2, '#a4682c');
  P.rect(28, 0, 8, 6, '#c8c0a8'); P.rect(29, 1, 6, 4, '#8a7a56');
  return P.c;
}

function sign() {
  const P = new Pix(40, 22);
  P.rect(0, 0, 40, 2, '#6a6a70');
  P.rect(2, 2, 36, 16, '#c02a2a');
  P.rect(2, 2, 36, 2, '#f04a4a');
  P.rect(4, 6, 32, 3, '#f0c040');
  P.rect(4, 11, 22, 3, '#f8f0e0');
  P.rect(3, 18, 34, 2, '#8a1414');
  return P.c;
}

function cart() {
  const P = new Pix(58, 44);
  // striped awning
  for (let i = 0; i < 8; i++) P.rect(i * 7, 0, 7, 7, i % 2 ? '#e04a30' : '#f0e8d8');
  P.rect(0, 7, 58, 2, '#8a2a18');
  P.vline(4, 9, 22, '#8a7a60'); P.vline(53, 9, 22, '#8a7a60');
  // counter
  P.rect(2, 22, 54, 16, '#c08a3a');
  P.rect(2, 22, 54, 3, '#e8b060');
  P.rect(2, 34, 54, 4, '#8a5a20');
  // steel bowls of chaat
  P.disc(14, 22, 6, '#c8c8d0'); P.disc(14, 21, 4, '#4a7a26');
  P.disc(30, 22, 6, '#c8c8d0'); P.disc(30, 21, 4, '#d86a20');
  P.disc(45, 22, 5, '#c8c8d0'); P.disc(45, 21, 3, '#e8c840');
  P.disc(12, 41, 5, '#2a2a2e'); P.disc(46, 41, 5, '#2a2a2e');
  return P.c;
}

// The chain above the swivel is drawn by js/hub.js, which knows where the ceiling is;
// this is the bag only, pivoting on its own top edge.
function bag() {
  const P = new Pix(24, 84);
  P.rect(9, 0, 6, 5, '#8a8296');
  P.rect(10, 1, 4, 3, '#3a3444');
  P.rect(3, 5, 18, 78, '#5a3a20');
  P.rect(3, 5, 5, 78, '#7a5230');
  P.rect(17, 5, 4, 78, '#3a2414');
  P.rect(3, 5, 18, 2, '#8a6a44');
  P.rect(3, 81, 18, 2, '#2a1a0e');
  // tape bands and scuffs
  for (const y of [22, 44, 66]) { P.rect(2, y, 20, 3, '#a8a090'); P.rect(2, y, 20, 1, '#d0c8b8'); }
  for (let i = 0; i < 18; i++) P.px(5 + (i * 5) % 15, 10 + (i * 7) % 70, '#7a5230');
  return P.c;
}

const BUILDERS = { crate, matka, tyres, table, sign, cart, bag };

// Prefer the generated art; the procedural build below is the fallback so a
// missing PNG shows a real prop rather than nothing.
function art(kind) {
  const T = PROP_TYPES[kind];
  const src = (T && T.art) || kind;   // a new prop can borrow art until it has its own
  const delhi = delhiPlayProps();
  const png = (delhi && (ASSETS['prop_delhi_' + kind] || ASSETS['prop_delhi_' + src]))
    || ASSETS['prop_' + kind] || ASSETS['prop_' + src];
  if (png) return png;
  if (!ART[src]) {
    // "Everything degrades to a fallback" has to be true by construction: a kind with
    // no builder used to be a TypeError inside render(), which takes the HUD with it.
    const c = (BUILDERS[src] || BUILDERS.crate)();
    c._as = 1;   // code art is authored at 1 logical px
    ART[src] = c;
  }
  return ART[src];
}

// ---- lifecycle ----------------------------------------------------------
export function createProp(kind, x, y, z) {
  const T = PROP_TYPES[kind];
  const pr = {
    kind: 'prop', prop: kind, x, y, z: z || 0, vx: 0, vz: 0,
    hp: T.hp, maxhp: T.hp, w: T.w, h: T.h, shadowR: T.shadowR,
    broken: false, dead: false, t: 0, flash: 0, shakeT: 0,
    state: 'idle', face: 1, airOnly: !!T.airOnly, decor: !!T.decor,
    hurt(dmg, dir) { hurtProp(pr, dmg, dir); },
    thrown() {},
  };
  if(DELHI_PROP_FOOTPRINT[kind]){
    // Stage setup can precede the intro/play transition. Follow the art route when
    // these bounds are read so the intro retains its original collisions and effects.
    const bounds=()=>delhiPlayProps()?DELHI_PROP_FOOTPRINT[kind]:T;
    for(const key of ['w','h','shadowR'])Object.defineProperty(pr,key,{enumerable:true,configurable:true,get:()=>bounds()[key]});
  }
  // A stage placement can override its kind's drop: `drop: null` is a score-only breakable,
  // so health goes where the stage needs it rather than wherever that kind happens to stand.
  const place = G.stage?.props?.find((d) => d.kind === kind && d.x === x && d.y === y);
  pr.drop = place && 'drop' in place ? place.drop : T.drop;
  return pr;
}

function hurtProp(pr, dmg, dir) {
  if (pr.broken || pr.decor) return;
  pr.hp -= dmg;
  pr.flash = 5;
  pr.shakeT = 8;
  const T = PROP_TYPES[pr.prop];
  if (pr.hp > 0) {
    spawnDebris(pr.x, pr.y - pr.z - pr.h * 0.4, 4, T.debris);
    impact(false, dmg);
    return;
  }
  pr.broken = true;
  pr.dead = true;   // stops the combat code targeting it again
  burstProp(pr, dir);
  addScore(T.score);
  spawnPop(pr.x, pr.y - pr.z - pr.h - 10, '+' + T.score);
  impact(true, 14);
  G.shake = Math.max(G.shake, 5);
  G.audio.sfx(T.breakSound||'break');
  if (T.glass) G.audio.roomSfx?.('room_glass', 0.4);
  // The prop is gone, so its drop sits alone on clear floor where the prop stood.
  const drop = pr.drop !== undefined ? pr.drop : T.drop;
  if (drop) {
    G.pickups.push({
      x: pr.x, y: pr.y, kind: drop,
      heal: drop === 'shake' ? 30 : drop === 'plate' ? 15 : 0, t: 0,
    });
  }
  if (pr.onBreak) pr.onBreak(pr);
}

// ---- the break ------------------------------------------------------------
// Streets of Rage rules: the prop flashes white, comes apart in chunks of its own art
// that tumble, bounce once and fade, and leaves nothing on the floor. Visual only.
const WHITE = new WeakMap();
function whiteOf(f) {
  let c = WHITE.get(f);
  if (!c) {
    c = document.createElement('canvas'); c.width = f.width; c.height = f.height;
    const x = c.getContext('2d'); x.drawImage(f, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = '#fff8e8'; x.fillRect(0, 0, c.width, c.height);
    c._as = f._as; WHITE.set(f, c);
  }
  return c;
}
function stepChunk(e) {
  e.x += e.vx; e.y += e.vy; e.vy += 0.24; e.angle += e.spin;
  if (e.y + e.r >= e.ground && e.vy > 0) {
    e.y = e.ground - e.r; e.vx *= 0.6; e.spin *= 0.5;
    e.vy = e.bounces++ ? 0 : -e.vy * 0.32;
  }
}
function drawChunk(ctx, camX) {
  const e = this, a = Math.max(0, Math.min(1, (e.life - e.t) / 12));
  if (!a) return;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(Math.round(e.x - camX), Math.round(e.y));
  ctx.rotate(e.angle);
  if(e.mirror)ctx.scale(-1,1);
  ctx.drawImage(e.img, e.sx, e.sy, e.sw, e.sh, -e.dw / 2, -e.dh / 2, e.dw, e.dh);
  ctx.restore();
}
// Flickers two frames on, two off through the break's hitstop, then fades as the chunks fly.
function drawFlash(ctx, camX) {
  const e = this;
  if (((G.rawTime - e.born) >> 1) & 1) return;
  ctx.save();
  ctx.globalAlpha = 0.8 * Math.max(0, 1 - e.t / e.life);
  if(e.mirror){ctx.translate(Math.round(e.x-camX),Math.round(e.y));ctx.scale(-1,1);blit(ctx,e.img,-e.w/2,-e.h,e.w,e.h);}
  else blit(ctx, e.img, Math.round(e.x - camX) - e.w / 2, Math.round(e.y) - e.h, e.w, e.h);
  ctx.restore();
}
export function burstProp(pr, dir = 1) {
  const T = PROP_TYPES[pr.prop] || {};
  // Props with authored wreck states (the vendor's kitchen) keep them: shards and dust only.
  if (T.draw) { spawnDebris(pr.x, pr.y - pr.z - pr.h * 0.5, 18, T.debris); if (!pr.z) spawnDust(pr.x, pr.y, 5); return; }
  const f = art(pr.prop), k = pr.scale || 1, mirror=mirroredCart(pr);
  const w = frameW(f) * k, h = frameH(f) * k, base = pr.y - pr.z, x0 = pr.x - w / 2, y0 = base - h;
  const cols = w > 56 ? 3 : 2, rows = h > 56 ? 3 : 2, sw = f.width / cols, sh = f.height / rows;
  const r = (i, n) => { const v = Math.sin((pr.x * 12.9898 + pr.y * 78.233 + i * 37.719 + n) * 43758.5453); return v - Math.floor(v); };
  let i = 0;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++, i++) {
    const dw = w / cols, dh = h / rows, cx = x0 + (col + 0.5) * dw, cy = y0 + (row + 0.5) * dh;
    const out = (cx - pr.x) / (w / 2);   // -1 left edge .. 1 right edge
    G.effects.push({
      type: 'propChunk', x: cx, y: cy, img: f, sx: (mirror?cols-1-col:col) * sw, sy: row * sh, sw, sh, dw, dh, mirror,
      r: Math.min(dw, dh) * 0.35, ground: pr.y + 1 + r(i, 1) * 3, bounces: 0,
      vx: out * (1.6 + r(i, 2) * 1.2) + (dir || 1) * 0.9, vy: -1.6 - (rows - row) * 0.7 - r(i, 3) * 1.4,
      angle: 0, spin: (r(i, 4) - 0.5) * 0.36 + out * 0.08, t: 0, life: 38 + Math.round(r(i, 5) * 10),
      step: stepChunk, draw: drawChunk,
    });
  }
  // the pop of light the chunks leave from; drawn over them for the first frames
  G.effects.push({ type: 'propFlash', x: pr.x, y: base, w, h, img: whiteOf(f), mirror, t: 0, life: 5, born: G.rawTime, draw: drawFlash });
  spawnDebris(pr.x, base - h * 0.5, 18, T.debris);
  spawnDebris(pr.x, base - h * 0.2, 8, T.debris);
  if (!pr.z) { spawnDust(pr.x - w * 0.3, pr.y, 3); spawnDust(pr.x + w * 0.3, pr.y, 3); spawnSmoke(pr.x, pr.y - 2, 2); }
}

export function updateProps() {
  for (const pr of G.props) {
    pr.t++;
    if (pr.flash > 0) pr.flash--;
    if (pr.shakeT > 0) pr.shakeT--;
    PROP_TYPES[pr.prop]?.update?.(pr);
  }
}

export function drawProp(ctx, pr, camX) {
  if(pr.hidden)return;
  // Props with authored multi-state art (the vendor's kitchen) draw themselves.
  if(PROP_TYPES[pr.prop]?.draw){PROP_TYPES[pr.prop].draw(ctx,pr,camX);return;}
  // A broken prop burst apart (burstProp) and left nothing behind.
  if (pr.broken) return;
  const f = art(pr.prop);
  const wob = pr.shakeT > 0 ? ((pr.t & 1) ? 1 : -1) : 0;
  const sx = Math.round(pr.x - camX) + wob, sy = Math.round(pr.y - pr.z);
  const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f);
  // Hanging props swing instead of standing still. The pivot is pr.pivotY when it is
  // set - the dojo bag hangs off the ceiling, and rotating it about its own top edge
  // would leave the chain above it dead still while the bag moved.
  const swing = pr.swing || 0;
  if (swing) {
    const py = pr.pivotY === undefined ? dy : pr.pivotY;
    ctx.save();
    ctx.translate(sx, py);
    ctx.rotate(swing);
    ctx.translate(-sx, -py);
  }
  // A carried prop can be drawn larger than its placed kind (the recovery agent's cabinet).
  const scale = pr.scale || 1;
  const mirror=mirroredCart(pr);
  if (scale !== 1||mirror) { ctx.save(); ctx.translate(sx, sy); ctx.scale(mirror?-scale:scale, scale); ctx.translate(-sx, -sy); }
  if (pr.flash > 0) {
    ctx.save();
    ctx.filter = 'brightness(1.25)';
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    blit(ctx, f, dx, dy);
  }
  if (delhiPlayProps() && pr.prop === 'ic_thela' && f === ASSETS.prop_delhi_ic_thela)
    drawPorterWheels(ctx, pr, f, dx, dy);
  if (scale !== 1||mirror) ctx.restore();
  if (swing) ctx.restore();
}
