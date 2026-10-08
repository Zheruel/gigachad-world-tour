// Dirty Delhi, river side (culvert, ghat, wharf, pontoon and the Dredger's dock): background life,
// moving scenery and a light foreground layer. Cosmetic only: never consumes combat randomness, never
// creates actors, never collides. Everything is a function of the stage clock plus a small per-actor
// alarm memory (people flinch from nearby fights and supers, then go back to work).
// World px are logical (plates are drawn at 2x, so a plate pixel is half a logical pixel).
// Art: tools/production/build_delhi_life_river.py (cell sizes below are its printout, in 2x px).
import { G, W } from './engine.js';
import { drawContactShadow } from './contact_shadow.js';
import {DELHI_WALK_CYCLES} from './delhi_walk_cycles.js';
import { walkerState, stepWalker, drawWalker, walkerPose, drawClearOfHud, drawShaded } from './delhi_life_walk.js';

const DIR = 'assets/stages/dirty_delhi/river/';
export const RIVER_LIFE_FILES = Object.fromEntries(['dhobi', 'dhobi_stone', 'fisher', 'fisher_props', 'ragpicker', 'deckhand', 'kites', 'debris',
  'laundry', 'laundry_fill', 'crate', 'crate_fill', 'crate_load', 'chains', 'chains_fill', 'fg_hook', 'fg_bollard', 'fg_rail', 'fg_pipe',
  'gulls', 'skiff', 'netcaster', 'sleeper', 'washer', 'dog', 'smoker']
  .map(n => ['dr_' + n, DIR + n + '.png']));
const CELLS = { dhobi: 8, fisher: 8, ragpicker: 8, deckhand: 8, porter: 10, porter_empty: 10, carrier_coolie: 10, carrier_basket: 10, kites: 8, debris: 6, gulls: 8, netcaster: 8, polecarry: 8, sleeper: 8, washer: 8, dog: 8, smoker: 8 };
const PANEL = { culvert: 3240, ghat: 4050, wharf: 4860, pontoon: 5670 };
const hash = n => { n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
const snap = v => Math.round(v * 2) / 2;
let A = null; // the asset table handed to the background pass, reused by the foreground pass

function cell(ctx, key, frame, x, footY, face = 1, clipBottom = 0) {
  const im = A?.['dr_' + key]; if (!im) return false;
  const n = DELHI_WALK_CYCLES['river_'+key]?.cells||CELLS[key] || 1, cw = im.width / n, ch = im.height, w = cw / 2, h = (ch - clipBottom) / 2;
  ctx.save(); ctx.translate(snap(x), snap(footY - ch / 2)); if (face < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, frame * cw, 0, cw, ch - clipBottom, -w / 2, 0, w, h); ctx.restore(); return true;
}
function routine(r, t) {
  let total = 0; for (const [, d] of r) total += d;
  let c = ((t % total) + total) % total;
  for (const [f, d] of r) { if (c < d) return [f, c]; c -= d; }
  return [r[0][0], 0];
}

// --- People -------------------------------------------------------------------------------------
// Routines [frame, ticks]; startled frames are chosen by the alarm, not the routine.
const DHOBI = [[0, 40], [1, 9], [2, 10], [3, 14], [4, 22], [1, 9], [2, 10], [3, 14], [4, 22], [1, 9], [2, 10], [3, 14], [4, 34], [5, 80], [0, 50], [4, 40]];
const FISHER = [[0, 60], [1, 50], [0, 60], [1, 50], [2, 12], [0, 40], [2, 10], [0, 30], [3, 26], [4, 44], [5, 44], [0, 50], [1, 50], [0, 70], [1, 50]];
const RAGPICKER = [[0, 30], [1, 40], [0, 20], [1, 30], [2, 16], [3, 50], [4, 16], [0, 30], [1, 44], [2, 16], [3, 30], [4, 16], [5, 64], [1, 30]];
// Boatmen on moored boats haul in and coil their mooring rope (poses 0-1 haul, 2-3 coil, 4 drop the
// coil, 5 wipe the brow); their feet are hidden below the gunwale (clip), scaled for their depth.
const DECK = [[0, 16], [1, 16], [0, 16], [1, 16], [0, 16], [1, 16], [2, 28], [3, 30], [2, 26], [3, 30], [4, 46], [5, 64], [0, 40], [1, 16], [0, 16], [1, 16], [2, 28], [3, 30], [4, 46], [0, 90]];
// By the culvert door: a labourer asleep on his charpai (0-1 breathe, 2 slaps a mosquito, 3 rolls over, 4 scratches
// an ankle, 5 props up groggy; a fight nearby sits him bolt upright, 6, then under the blanket, 7) and a street dog
// by the bins (0-2 asleep, 3 head up, 4 scratches, 5 yawns; 6 half-risen, 7 flat and wary). In the culvert an old
// man washes under the leaking elbow pipe, his bucket under the spout (0-1 cup and splash, 2-3 dry off, 4 wring the
// towel, 5 shift the bucket; 6 startled, 7 cowering).
const SLEEP = [[0, 56], [1, 56], [0, 56], [1, 56], [2, 14], [0, 40], [1, 56], [0, 56], [3, 150], [4, 34], [3, 110], [5, 70], [0, 56], [1, 56], [0, 56], [1, 56]];
const DOG = [[0, 70], [1, 70], [0, 70], [1, 70], [2, 10], [0, 40], [2, 8], [0, 70], [1, 70], [3, 64], [5, 30], [3, 50], [4, 44], [3, 30], [0, 80], [1, 70]];
const WASH = [[0, 34], [1, 16], [0, 24], [1, 16], [0, 20], [2, 34], [3, 44], [4, 38], [0, 34], [1, 16], [2, 26], [5, 30], [0, 40]];
// Under the ceiling cables an old watchman smokes a beedi on a crate (0 rest, 1-2 draw on it, 3 exhale, 4 flick
// the ash, 5 cough; 6 startled, 7 under his shawl); EMBER: the beedi's tip per pose, logical px from his feet.
const SMOKE = [[0, 60], [1, 14], [2, 40], [1, 8], [0, 20], [3, 50], [0, 70], [4, 16], [0, 60], [1, 14], [2, 46], [1, 8], [3, 44], [0, 40], [5, 40], [0, 80]];
const EMBER = [[17, -21.5], [12, -39], [10.5, -39], [17, -24.5], [22.5, -28], [8.5, -33]], MOUTH = [1, -45];
const WASHER = { x: 3521, y: 206 };   // standing in the gutter, facing right; his bucket (cell +11, rim 17 up) under the spout
const PEOPLE = [
  { key: 'ragpicker', x: 3606, y: 199, r: RAGPICKER, off: 0, shadow: 16, startle: [6, 7] },
  { key: 'dhobi', x: 4598, y: 189, r: DHOBI, off: 57, shadow: 12, startle: [7, 6] },
  { key: 'fisher', x: 5764, y: 188, r: FISHER, off: 133, shadow: 18, startle: [6, 7] },
  { key: 'deckhand', x: 4985, y: 146, r: DECK, off: 71, shadow: 0, startle: [6, 7], clip: 143 },   // boat B-27, wharf
  { key: 'deckhand', x: 4702, y: 167, r: DECK, off: 380, shadow: 0, startle: [6, 7], clip: 163, scale: 1.2 },  // ghat, east moorings
  // culvert (appended so the older performers keep their p0-p4 alarm ids)
  { key: 'sleeper', x: 3248, y: 198, r: SLEEP, off: 40, shadow: 36, startle: [7, 6] },
  { key: 'dog', x: 3131, y: 199, r: DOG, off: 310, shadow: 13, startle: [7, 6] },
  { key: 'washer', x: WASHER.x, y: WASHER.y, r: WASH, off: 90, shadow: 12, startle: [7, 6] },
  { key: 'smoker', x: 3735, y: 197, r: SMOKE, off: 200, shadow: 18, startle: [7, 6] },
];
// The river keeps its fixed workers; roaming carriers are removed from this scenery pass.
const DOORS = {};
const CARRIERS = [], ROUTES = [];

function disturbances() {
  const out = [], p = G.player;
  if (p && ['attack', 'super', 'kick', 'hook', 'punch', 'jab', 'upper', 'throw', 'grab'].includes(p.state)) out.push(p.x);
  if (p?.state === 'super' || G.cinematic) out.push(p.x, p.x - 200, p.x + 200);
  for (const e of G.effects || []) if (['spark', 'boxingImpact', 'koBurst'].includes(e.type) && e.t < 8) out.push(e.x);
  for (const e of G.enemies || []) if (!e.dead && ['attack', 'windup'].includes(e.state)) out.push(e.x);
  if (G.boss && !G.boss.dead) out.push(G.boss.x);
  return out;
}
// Alarm memory (ticks left) and the carriers' walk state, stepped once per stage tick.
const S = { t: -1, owner: null, alarm: {}, walkers: [], doors: {}, poles: [], poleDim: [0, 0], poleCalm: 0, gulls: [] };
// The sack porter starts out on his platform; the pole pairs start in the yard (they only set off while he is
// home, so a wave or review that loads mid-quay never finds a pair walking behind the fight).
function reset() { S.alarm = {}; S.walkers = ROUTES.map((d, i) => walkerState(d, i + 7)); S.doors = {}; S.poles = POLE_ROUTES.map((d, i) => Object.assign(walkerState(d, i + 23), { x: d.a.x, inside: i ? 700 : 2 })); S.poleDim = [0, 0]; S.poleCalm = 0; S.gulls = PERCH.map(() => ({ t: 0, end: 0 })); }
function update(t) {
  if (S.owner !== G.india) { S.owner = G.india; S.t = t - 1; reset(); }
  if (t === S.t) return;
  // Frames can be skipped (hitstop, Studio stepping): age the memory by the gap; a seek back resets it.
  const dt = t - S.t; S.t = t;
  if (dt < 0 || dt > 900) { reset(); return; }
  if (dt > 1) for (const k in S.alarm) S.alarm[k] = Math.max(0, S.alarm[k] - (dt - 1));
  const d = disturbances(), shake = (G.shake || 0) > 5;
  const near = x => shake && Math.abs(x - (G.camX + W / 2)) < W * .6 || d.some(v => Math.abs(v - x) < 125);
  PEOPLE.forEach((q, i) => { S.alarm['p' + i] = near(q.x) ? 110 : Math.max(0, (S.alarm['p' + i] || 0) - 1); });
  S.alarm.skiff = near(SKIFF.x) ? 110 : Math.max(0, (S.alarm.skiff || 0) - 1);
  const threats = shake ? [...d, G.camX + 90, G.camX + W / 2, G.camX + W - 90] : d;
  // Tick by tick, carriers and pole pairs together (their right of way at the godown is decided each tick).
  for (let k = 0; k < dt; k++) {
    ROUTES.forEach((r, i) => {
      const w = S.walkers[i]; stepWalker(r, w, threats.map(v => r === CARRIERS[i] ? v : -v));
      const p = walkerPose(r, w), e = CARRIERS[i].a;
      if (e.door) S.doors[e.door] = Math.max(p && Math.abs(Math.abs(p.x) - Math.abs(e.x)) < e.len + 4 ? 1 : 0, (S.doors[e.door] || 0) - .04);
    });
    stepPoles(threats); stepGulls(near);
  }
  CARRIERS.forEach((q, i) => { S.alarm['w' + i] = S.walkers[i].alarm ? 1 : 0; });
}

function drawPeople(ctx, camX, t) {
  // Boatmen out on the water are behind the quay's carriers. On the quay, carriers and performers go by
  // their feet (a carrier stepping down round the ragpicker passes in front of him; carriers first on a tie).
  PEOPLE.forEach((q, i) => { if (q.clip) drawPerson(ctx, camX, t, q, i); });
  drawDoors(ctx, camX);
  const quay = [];
  ROUTES.forEach((r, i) => { const p = walkerPose(r, S.walkers[i]); if (p) quay.push([p.y, () => drawPorter(ctx, camX, i)]); });
  PEOPLE.forEach((q, i) => { if (!q.clip) quay.push([q.y, () => drawPerson(ctx, camX, t, q, i)]); });
  quay.sort((a, b) => a[0] - b[0]).forEach(([, draw]) => draw());
}
function drawPerson(ctx, camX, t, q, i) {
  const sx = q.x - camX; if (sx < -60 || sx > W + 60) return;
  const alarm = S.alarm['p' + i] || 0;
  let [frame, age] = routine(q.r, t + q.off);
  if (alarm) frame = alarm > 88 ? q.startle[1] : q.startle[0];
  if (q.shadow) drawContactShadow(ctx, sx, q.y, q.shadow, 0, .9);
  if (q.key === 'dhobi') cell(ctx, 'dhobi_stone', 0, sx, q.y);   // the stone never moves
  if (q.key === 'fisher') cell(ctx, 'fisher_props', 0, sx, q.y);
  if (q.clip || q.scale) {
    ctx.save(); if (q.clip) { ctx.beginPath(); ctx.rect(sx - 60, 0, 120, q.clip); ctx.clip(); }
    ctx.translate(snap(sx), q.y); ctx.scale(q.scale || 1, q.scale || 1); cell(ctx, q.key, frame, 0, 0); ctx.restore();
  } else cell(ctx, q.key, frame, sx, q.y);
  if (q.key === 'smoker' && !alarm) drawBeedi(ctx, sx, q.y, frame, age, t);
  // The washerman's slam throws a little spray off the stone.
  if (q.key === 'dhobi' && frame === 3 && !alarm && age < 10) {
    ctx.fillStyle = '#d9d2c0';
    for (let k = 0; k < 7; k++) {
      const a = hash(k * 7 + 3), v = 1.2 + a * 1.4, ang = -Math.PI * (.15 + .7 * hash(k * 11 + 5));
      const x = sx + 18 + Math.cos(ang) * v * age, y = q.y - 16 + Math.sin(ang) * v * age + .09 * age * age;
      ctx.globalAlpha = .75 * (1 - age / 10); ctx.fillRect(snap(x), snap(y), .5, 1);
    }
    ctx.globalAlpha = 1;
  }
}
// The watchman's beedi: a glowing tip (hot while he draws on it) with a thin thread of smoke curling off it, and
// on the exhale a soft plume from his mouth drifting up toward the cables.
function drawBeedi(ctx, sx, y, frame, age, t) {
  const e = EMBER[frame];
  if (e) {
    const ex = sx + e[0], ey = y + e[1], hot = frame === 2 ? .75 + .25 * Math.sin(t * .4) : .45;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, 4); g.addColorStop(0, `rgba(255,150,70,${.5 * hot})`); g.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.fillStyle = g; ctx.fillRect(ex - 4, ey - 4, 8, 8); ctx.restore();
    ctx.fillStyle = frame === 2 ? '#ffd08a' : '#ff8a3a'; ctx.fillRect(snap(ex), snap(ey), .5, .5);
    if (frame !== 3) for (let k = 0; k < 9; k++) {
      const u = ((t * .6 + k * 13) % 60) / 60, w = Math.sin(u * 7 + k * .9 + t * .02) * (1 + u * 3);
      ctx.fillStyle = `rgba(206,196,184,${.32 * (1 - u) * Math.min(1, u * 6)})`; ctx.fillRect(snap(ex + w + u * 4), snap(ey - 1 - u * 20), .5, .5 + u);
    }
  }
  if (frame === 3 && age < 46) {
    const k0 = age / 46;
    for (let k = 0; k < 16; k++) {
      const u = Math.min(1, k0 * 1.4 - k * .03); if (u <= 0) continue;
      const r = hash(k * 5 + 1), x = sx + MOUTH[0] + u * (10 + r * 10) + Math.sin(u * 5 + k) * 2, yy = y + MOUTH[1] - u * (10 + r * 12);
      ctx.fillStyle = `rgba(214,204,190,${.3 * (1 - u) * (1 - k0 * .5)})`; ctx.fillRect(snap(x), snap(yy), 1 + u * 2, .5 + u * 1.5);
    }
  }
}
function drawDoors(ctx, camX) {
  for (const [id, [x0, y0, x1, y1]] of Object.entries(DOORS)) {
    const k = S.doors[id] || 0; if (k <= 0 || x1 < camX || x0 > camX + W) continue;
    const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, `rgba(16,10,7,${.55 * k})`); g.addColorStop(.25, `rgba(12,8,6,${.9 * k})`); g.addColorStop(1, `rgba(20,13,9,${.92 * k})`);
    ctx.fillStyle = g; ctx.fillRect(x0 - camX, y0, x1 - x0, y1 - y0);
  }
}
function drawPorter(ctx, camX, i) {
  const r = ROUTES[i], q = CARRIERS[i], w = S.walkers[i];
  // Mirrored routes draw at -x, facing the other way (the route was flipped, not the art).
  const flip = q.dir < 0, cam = flip ? -camX - W : camX;
  ctx.save(); if (flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  const key = q.empty && w.dir < 0 && A?.['dr_' + q.empty] ? q.empty : q.key;   // back to the boat empty-handed
  drawWalker(ctx, cam, { ...r, dim: q.dim }, w, '10,7,6', (c, f, x, y, face) => cell(c, key, f, x, y, face),
    (c, x, y, k) => { c.globalAlpha = k; drawContactShadow(c, x, y, 11, 0, .8); c.globalAlpha = 1; });
  ctx.restore();
}

// --- River --------------------------------------------------------------------------------------
// Water boxes in world px (plate highlights inside them flare as glints).
const WATER = [
  ['culvert', 3880, 128, 4015, 187], ['ghat', 4460, 120, 4860, 152], ['wharf', 4860, 105, 5200, 135], ['pontoon', 5670, 128, 6480, 178],
];
const glints = {};
function glintsFor(name, x0, y0, x1, y1) {
  if (glints[name]) return glints[name];
  const im = A?.['ic_delhi_' + name]; if (!im) return [];
  const out = glints[name] = [];
  try {
    const px = PANEL[name], X0 = (x0 - px) * 2, Y0 = y0 * 2, w = (x1 - x0) * 2, h = (y1 - y0) * 2;
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
    g.drawImage(im, X0, Y0, w, h, 0, 0, w, h); const d = g.getImageData(0, 0, w, h).data, L = i => d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const n = y * w + x, l = L(n);
      if (l > 105 && l >= L(n - 1) && l > L(n + 1) && l >= L(n - w) && l > L(n + w) && hash(n + X0 * 7) < .55) out.push([x0 + x / 2, y0 + y / 2, hash(n)]);
    }
  } catch { /* tainted or missing plate: no glints */ }
  return out;
}
function drawWater(ctx, camX, t) {
  for (const [name, x0, y0, x1, y1] of WATER) {
    if (x1 - camX < 0 || x0 - camX > W) continue;
    for (const [gx, gy, r] of glintsFor(name, x0, y0, x1, y1)) {
      const x = snap(gx - camX); if (x < -2 || x > W + 1) continue;
      const period = 70 + Math.floor(r * 150), k = (t + Math.floor(r * 9973)) % period; if (k >= 10) continue;
      const hot = k >= 3 && k < 7; ctx.fillStyle = hot ? '#ffe7b0' : '#f2a95a';
      ctx.fillRect(x - (hot ? .5 : 0), snap(gy), hot ? 1.5 : .5, .5);
    }
  }
}
// Advect the outfall's painted water through its own silhouette. The pipe, quay,
// bollard and rope stay fixed; only the wet surface below the lip moves.
let outfall=null;
function outfallFrames(im){
  if(outfall?.src===im)return outfall;
  const x0=1504,y0=296,w=100,h=78,c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');g.drawImage(im,x0,y0,w,h,0,0,w,h);
  const base=g.getImageData(0,0,w,h),mask=document.createElement('canvas');mask.width=w;mask.height=h;
  const m=mask.getContext('2d');m.fillStyle='#fff';m.beginPath();
  for(const [i,[x,y]]of [[1540,306],[1554,301],[1586,297],[1602,299],[1596,308],[1581,320],[1564,335],[1553,360],[1547,368],[1510,373],[1523,359],[1529,333]].entries())i?m.lineTo(x-x0,y-y0):m.moveTo(x-x0,y-y0);
  m.closePath();m.fill();
  const a=m.getImageData(0,0,w,h).data,spans=[];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const wx=x+x0,wy=y+y0;
    if(wx>=1567&&wy>=320||wx<1570&&Math.abs(wy-(353-(wx-1520)*.22))<2)a[(y*w+x)*4+3]=0;
  }
  for(let y=0;y<h;y++){
    let l=w,r=-1;for(let x=0;x<w;x++)if(a[(y*w+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);}
    spans.push([l,r]);
  }
  const rows=spans.map(([l,r],y)=>r-l>3?y:-1).filter(y=>y>=0),grain=new Float32Array(w*h*3);
  // Move fine wet detail rather than wrapping the fall's large lighting bands.
  for(const y of rows)for(let x=spans[y][0];x<=spans[y][1];x++){
    const p=(y*w+x)*4;if(!a[p+3])continue;
    const mean=[0,0,0];let count=0;
    for(let dy=-3;dy<=3;dy++)for(let dx=-2;dx<=2;dx++){
      const xx=x+dx,yy=y+dy;if(xx<0||xx>=w||yy<0||yy>=h)continue;
      const q=(yy*w+xx)*4;if(!a[q+3])continue;
      for(let k=0;k<3;k++)mean[k]+=base.data[q+k];count++;
    }
    for(let k=0;k<3;k++)grain[(y*w+x)*3+k]=base.data[p+k]-mean[k]/count;
  }
  const texture=rows.map(y=>{
    const [l,r]=spans[y],line=[];
    for(let i=0;i<64;i++){
      let x=Math.round(l+i*(r-l)/63);
      if(!a[(y*w+x)*4+3])for(let d=1;d<=r-l;d++){
        const left=x-d,right=x+d;
        if(left>=l&&a[(y*w+left)*4+3]){x=left;break;}
        if(right<=r&&a[(y*w+right)*4+3]){x=right;break;}
      }
      line.push([0,1,2].map(k=>grain[(y*w+x)*3+k]));
    }
    return line;
  });
  const sample=(v,u,k)=>{
    v=(v+texture.length*2)%texture.length;
    const col=Math.round(u*63),i=Math.floor(v),q=v-i;
    return texture[i][col][k]*(1-q)+texture[(i+1)%texture.length][col][k]*q;
  };
  const flow=(v,u,k)=>{
    const n=texture.length,v0=(v+n*2)%n,v1=(v0+n*.43)%n;
    const a=Math.sin(v0/n*Math.PI)**2,b=Math.sin(v1/n*Math.PI)**2;
    return (sample(v0,u,k)*a+sample(v1,u,k)*b)/(a+b);
  };
  const frames=[];
  for(let n=0;n<64;n++){
    const f=document.createElement('canvas');f.width=w;f.height=h;const z=f.getContext('2d'),pixels=z.createImageData(w,h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const p=(y*w+x)*4;if(!a[p+3])continue;
      const [l,r]=spans[y];if(r<=l)continue;
      const u=(x-l)/(r-l),v=rows.indexOf(y);if(v<0)continue;
      const edge=Math.min(1,(x-l)/3,(r-x)/3,y/4,(h-1-y)/4);
      for(let k=0;k<3;k++)pixels.data[p+k]=base.data[p+k]+.85*(flow(v-n*rows.length/64+u*5,u,k)-flow(v+u*5,u,k));
      pixels.data[p+3]=Math.round(Math.max(0,edge)*200);
    }
    z.putImageData(pixels,0,0);frames.push(f);
  }
  return outfall={src:im,frames,x:PANEL.pontoon+x0/2,y:y0/2,w:w/2,h:h/2};
}
function drawOutfall(ctx,camX,t){
  const im=A?.ic_delhi_pontoon;if(!im?.width||camX+W<6422)return;
  const f=outfallFrames(im);
  ctx.drawImage(f.frames[Math.floor(t*1.4)%64],Math.round(f.x-camX),f.y,f.w,f.h);
}
// Falling water from outfall pipes and spouts: [x, top, bottom, width (logical)].
// The culvert's elbow spout (3532) pours into the washer's bucket (rim just under it); the drain pipe at 3826 into the gutter.
const STREAMS = [[3532, 188, 191, 1.5], [3826, 189, 207, 1.5], [5260, 185, 197, 2], [5285, 185, 197, 2], [5488, 185, 197, 1.5], [5943, 118, 148, 3], [5865, 139, 148, 1.5]];
function drawStreams(ctx, camX, t) {
  for (const [i, [x, y0, y1, w]] of STREAMS.entries()) {
    const sx = x - camX; if (sx < -10 || sx > W + 10) continue;
    ctx.fillStyle = 'rgba(214,196,160,.22)'; ctx.fillRect(snap(sx - w / 2), y0, w, y1 - y0);
    // Bright dashes sliding down the stream.
    ctx.fillStyle = 'rgba(255,232,190,.55)';
    for (let k = 0; k < w * 2; k++) {
      const lane = snap(sx - w / 2 + k * .5), sp = 1.1 + hash(i * 13 + k) * .6;
      for (let j = 0; j < 3; j++) {
        const y = y0 + ((t * sp + j * 9 + hash(i * 7 + k * 3) * 20) % (y1 - y0));
        ctx.fillRect(lane, snap(y), .5, 1.5);
      }
    }
    // Churn where it lands: a few foam pixels and a widening ring.
    ctx.fillStyle = 'rgba(232,220,198,.6)';
    for (let k = 0; k < 4 + w * 2; k++) { const a = (t * .21 + k * 1.7 + i) % 6.28; ctx.fillRect(snap(sx + Math.cos(a) * (1 + w + k % 3)), snap(y1 - .5 + Math.sin(a * 2) * .5), .5, .5); }
    const ring = (t + i * 17) % 30 / 30; ctx.strokeStyle = `rgba(230,210,170,${.3 * (1 - ring)})`; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.ellipse(sx, y1 + .5, 2 + w + ring * 6, .8 + ring * 1.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
// Culvert: water beads along the overhead pipe run and drops onto the wet stones.
function drawDrips(ctx, camX, t) {
  if (camX > 3900 || camX + W < 3420) return;
  for (let i = 0; i < 12; i++) {
    const x = 3440 + hash(i * 31 + 5) * 300, sx = x - camX; if (sx < -4 || sx > W + 4) continue;
    const period = 110 + Math.floor(hash(i * 17) * 160), k = (t + Math.floor(hash(i * 3) * 997)) % period;
    const top = 50 + hash(i * 5) * 12, floor = 196 + hash(i * 9) * 8, fall = 30;
    ctx.fillStyle = 'rgba(236,210,160,.8)';
    if (k < 40) ctx.fillRect(snap(sx), snap(top + k / 40), .5, .5 + k / 80); // bead swelling
    else if (k < 40 + fall) { const u = (k - 40) / fall; ctx.fillRect(snap(sx), snap(top + (floor - top) * u * u), .5, 1.5); }
    else if (k < 40 + fall + 8) { const u = (k - 40 - fall) / 8; ctx.globalAlpha = 1 - u; ctx.fillRect(snap(sx - 1 - u * 2), snap(floor - u * 2), .5, .5); ctx.fillRect(snap(sx + 1 + u * 2), snap(floor - u * 2), .5, .5); ctx.globalAlpha = 1; }
  }
}
// Culvert extras: the bare bulb throws a flickering cone down the wall with moths round it, and now and
// then a rat pokes out of the drainpipe by the door, sniffs, scurries along the ledge and drops into the
// trench (ic_rat: 0 sit, 1 sniff, 2-7 run). Pure functions of the clock.
const RAT = { period: 1150, off: 300, pipe: [3257, 188], ledge: 195, edge: 3421, trench: [3437, 204] };
function moths(ctx, sx, ly, t, n) {
  ctx.fillStyle = 'rgba(236,212,164,.75)';
  for (let i = 0; i < n; i++) { const a = t * (.05 + i * .013) + i * 2.1; ctx.fillRect(snap(sx + Math.sin(a) * (6 + i * 3)), snap(ly + 2 + Math.sin(a * 1.7 + i) * (3 + i)), .5, .5); }
}
function drawCulvert(ctx, camX, t) {
  if (camX > 3760 || camX + W < 3200) return;
  const [lx, ly] = LAMPS[0], sx = lx - camX;
  if (sx > -60 && sx < W + 60) {
    const stutter = (t % 620) < 14 && (t >> 1) % 3 === 0 ? .35 : 1, k = stutter * (.85 + .15 * Math.sin(t * .09));
    const g = ctx.createLinearGradient(0, ly + 4, 0, 197); g.addColorStop(0, `rgba(255,178,96,${.16 * k})`); g.addColorStop(.6, `rgba(255,150,70,${.07 * k})`); g.addColorStop(1, `rgba(255,140,60,${.1 * k})`);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(sx - 3, ly + 4); ctx.lineTo(sx + 3, ly + 4); ctx.lineTo(sx + 44, 197); ctx.lineTo(sx - 44, 197); ctx.closePath(); ctx.fill();
    // The pool it leaves on the ledge.
    const p = ctx.createRadialGradient(sx, 197, 0, sx, 197, 46); p.addColorStop(0, `rgba(255,170,90,${.12 * k})`); p.addColorStop(1, 'rgba(255,140,60,0)');
    ctx.fillStyle = p; ctx.fillRect(sx - 46, 189, 92, 16); ctx.restore();
    moths(ctx, sx, ly, t, 3);
  }
  const im = A?.ic_rat; if (!im) return;
  const c = (t + RAT.off) % RAT.period; if (c >= 232) return;
  const run = RAT.edge - RAT.pipe[0];
  let x, y, f, face = 1;
  if (c < 20) { x = RAT.pipe[0]; y = RAT.pipe[1] + (RAT.ledge - RAT.pipe[1]) * ease(c / 20); f = c < 12 ? 1 : 0; }
  else if (c < 60) { x = RAT.pipe[0] + 3; y = RAT.ledge; f = (c >> 3) % 3 === 1 ? 1 : 0; }
  else if (c < 60 + run / 2) { x = RAT.pipe[0] + 3 + (c - 60) * 2; y = RAT.ledge; f = 2 + Math.floor(c / 3) % 6; }
  else if (c < 190) { x = RAT.edge; y = RAT.ledge; f = (c >> 3) % 2; }
  else if (c < 200) { const u = (c - 190) / 10; x = RAT.edge + (RAT.trench[0] - RAT.edge) * u; y = RAT.ledge - 5 * Math.sin(u * Math.PI) + (RAT.trench[1] - RAT.ledge) * u * u; f = 4; }
  else { // a ring where it went in
    const u = (c - 200) / 32, rx = RAT.trench[0] - camX; ctx.strokeStyle = `rgba(220,190,140,${.4 * (1 - u)})`; ctx.lineWidth = .5;
    ctx.beginPath(); ctx.ellipse(rx, RAT.trench[1], 1.5 + u * 6, .6 + u * 1.4, 0, 0, 6.283); ctx.stroke(); return;
  }
  const rx = x - camX; if (rx < -20 || rx > W + 20) return;
  const sw = im.width / 8, sh = im.height;
  drawShaded(ctx, .38, '12,8,6', rx, y, (cx, X, Y) => { cx.save(); cx.translate(snap(X), snap(Y)); cx.scale(face, 1); cx.drawImage(im, f * sw, 0, sw, sh, -11.5, -10, 23, 10); cx.restore(); });
}
// Warm lamps: the culvert's bare bulb, the godown's work light and the bulb over the bins by the culvert door
// breathe and now and then stutter (moths round the last one too).
const LAMPS = [[3639, 67, 52, .2], [5323, 102, 30, .16], [3152, 94, 40, .17]];
function drawLamps(ctx, camX, t) {
  for (const [i, [x, y, r, a]] of LAMPS.entries()) {
    const sx = x - camX; if (sx < -r || sx > W + r) continue;
    const stutter = (t + i * 400) % 620 < 14 && (t >> 1) % 3 === 0 ? .35 : 1;
    const k = a * stutter * (.88 + .12 * Math.sin(t * .09 + i));
    const g = ctx.createRadialGradient(sx, y, 0, sx, y, r); g.addColorStop(0, `rgba(255,190,110,${k})`); g.addColorStop(.35, `rgba(255,150,70,${k * .45})`); g.addColorStop(1, 'rgba(255,120,50,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(sx - r, y - r, r * 2, r * 2); ctx.restore();
    if (i === 2) moths(ctx, sx, y - 2, t + 170, 4);
  }
}
// Culvert: outfall water runs along the gutter under the ledge to the river arch (bright flecks drifting
// right), and two loose cables droop off the ceiling pipe run and sway in the draught.
function drawGutter(ctx, camX, t) {
  if (camX > 3910 || camX + W < 3400) return;
  for (let i = 0; i < 44; i++) {
    const span = 490, x = 3410 + (hash(i * 7 + 1) * span + t * (.16 + hash(i * 5 + 2) * .14)) % span, sx = x - camX;
    if (sx < -4 || sx > W + 4) continue;
    const edge = Math.min(1, (x - 3410) / 30, (3900 - x) / 30), y = 201 + hash(i * 3) * 7;
    const tw = .5 + .5 * Math.sin(t * .07 + i * 1.3); if (edge <= 0 || tw < .15) continue;
    ctx.fillStyle = `rgba(255,208,150,${.34 * edge * tw})`; ctx.fillRect(snap(sx), snap(y), 1.5 + hash(i) * 2.5, .5);
  }
}
const CABLES = [[3676, 60, 3712, 57, 26], [3694, 63, 3744, 61, 34]];
function drawCables(ctx, camX, t) {
  for (const [i, [x0, y0, x1, y1, sag]] of CABLES.entries()) {
    if (x1 - camX < -4 || x0 - camX > W + 4) continue;
    const sway = Math.sin(t * (.021 + i * .004) + i * 1.7) * (2 + sag * .06), mx = (x0 + x1) / 2 + sway - camX, my = (y0 + y1) / 2 + sag;
    for (const [col, dx, dy, lw] of [['#120c08', 0, 0, 1.5], ['rgba(150,110,80,.45)', -.5, -.5, .5]]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(x0 - camX + dx, y0 + dy);
      ctx.quadraticCurveTo(mx + dx, my + dy, x1 - camX + dx, y1 + dy); ctx.stroke();
    }
  }
}
// The painted moorings and the netcaster's skiff carry the boat life. Moving boat
// overlays crossed the far-bank steps and outfall wall, so those routes and wakes are removed.
// Flotsam drifting with the current: [world x0, x1, y0, y1, count].
const FLOTSAM = [[4460, 4765, 146, 153, 5], [5680, 6440, 152, 176, 9], [3890, 4010, 168, 184, 2]];
function drawFlotsam(ctx, camX, t) {
  for (const [r, [x0, x1, y0, y1, n]] of FLOTSAM.entries()) {
    if (x1 - camX < 0 || x0 - camX > W) continue;
    for (let i = 0; i < n; i++) {
      const s = r * 50 + i, span = x1 - x0, x = x1 - ((hash(s) * span + t * (.04 + hash(s + 9) * .05)) % span);
      const y = y0 + hash(s + 3) * (y1 - y0), bob = Math.sin(t * .06 + i * 1.9) * .5, sx = x - camX;
      if (sx < -10 || sx > W + 10) continue;
      const edge = Math.min(1, (x - x0) / 12, (x1 - x) / 12); if (edge <= 0) continue;
      ctx.save(); ctx.globalAlpha = edge; cell(ctx, 'debris', Math.floor(hash(s + 5) * 6), sx, y + bob, 1, 2); ctx.restore();
      ctx.fillStyle = 'rgba(255,196,130,.2)'; ctx.fillRect(snap(sx - 4), snap(y + bob), 8, .5);
    }
  }
}
// Black kites circle the river on the thermals over the smoke; now and then a few flaps.
const KITES = [[4610, 42, 80, 12, 0], [4990, 36, 60, 9, 1.7], [5900, 30, 90, 14, 3.1], [6260, 52, 70, 10, 4.4], [6120, 22, 50, 8, .9]];
function drawKites(ctx, camX, t) {
  for (const [i, [cx, cy, rx, ry, ph]] of KITES.entries()) {
    const a = t * (.004 + i * .0006) + ph, x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry + Math.sin(t * .013 + i) * 3, sx = x - camX;
    if (sx < -20 || sx > W + 20) continue;
    const face = -Math.sin(a) < 0 ? -1 : 1, c = (t + i * 97) % 220;
    const frame = c < 36 ? 1 + Math.floor(c / 6) % 5 : Math.abs(Math.cos(a)) > .93 ? 7 : c % 110 < 55 ? 0 : 6;
    cell(ctx, 'kites', frame, sx, y + 10, face);
  }
}
// Swinging parts cut from the plates, each over its painted-out repair: [key, world x, y, logical w, h,
// pivot row, sway px at the bottom, period ticks, column groups (independent cloths)].
const SWINGS = [
  ['laundry', 4237, 104, 73, 49, 0, 1.2, 170, 6],
  ['crate', 5535, 22, 135, 115, 12, 1.4, 300, 1],
  ['chains', 4825, 45, 27, 59, 0, 1.5, 230, 2],
];
function drawSwings(ctx, camX, t) {
  for (const [i, [key, x, y, w, h, pivot, amp, period, groups]] of SWINGS.entries()) {
    const sx = x - camX; if (sx + w < 0 || sx > W) continue;
    const im = A?.['dr_' + key], fill = A?.['dr_' + key + '_fill']; if (!im || !fill) continue;
    ctx.drawImage(fill, snap(sx), y, w, h);
    const gw = w / groups, load = key === 'crate' ? craneLoad(t) : 0;
    for (let g = 0; g < groups; g++) {
      // Wind gusts: a slow swing plus a flutter that comes and goes (a landed load hangs still).
      const ph = t * 6.283 / period + g * 1.3 + i * 2, gust = .6 + .4 * Math.sin(t * .011 + g + i);
      const sway = (1 - load) * amp * (Math.sin(ph) * gust + (key === 'laundry' ? .35 * Math.sin(t * .09 + g * 2.1) * gust : 0));
      // Rows bend by their depth below the pivot; runs of rows on the same half-pixel offset go in one blit.
      const bend = r => { const k = Math.max(0, (r - pivot) / (h - pivot)); return snap(sway * (key === 'laundry' ? k ** 1.4 : k)); };
      for (let r = 0; r < h;) {
        const off = bend(r); let e = r + 1; while (e < h && bend(e) === off) e++;
        ctx.drawImage(im, g * gw * 2, r * 2, gw * 2, (e - r) * 2, snap(sx + g * gw) + off, y + r, gw, e - r); r = e;
      }
      if (key === 'crate') drawCraneLoad(ctx, sx, y, h, pivot, sway, load, t);
    }
  }
}
// The wharf gantry lowers its crate onto the stack below, leaves it resting, then hoists it again.
// crate_load.png holds the chain from its first big link (plate row 94) plus the slings and crate; as
// it pays out, the gap under the fixed links is filled with the chain's own 36-row link period.
const CRANE = { period: 1500, down: 380, land: 520, up: 760, top: 900, drop: 16, row: 94, link: 36 };
const ease = u => u * u * (3 - 2 * u);
function craneLoad(t) {
  const c = t % CRANE.period;
  return c < CRANE.down ? 0 : c < CRANE.land ? ease((c - CRANE.down) / (CRANE.land - CRANE.down))
    : c < CRANE.up ? 1 : c < CRANE.top ? 1 - ease((c - CRANE.up) / (CRANE.top - CRANE.up)) : 0;
}
function drawCraneLoad(ctx, sx, y, h, pivot, sway, load, t) {
  const im = A?.dr_crate_load; if (!im) return;
  const d = Math.round(load * CRANE.drop), R = CRANE.row, P = CRANE.link, rows = im.height;
  const off = r => snap(sway * Math.max(0, (r / 2 - pivot) / (h - pivot)));
  // Paid-out chain (links only: plate columns 205-241).
  for (let j = 0; j < d; j++) ctx.drawImage(im, 205, R + ((P - d % P + j) % P), 36, 1, sx + 102.5 + off(R + j), y + (R + j) / 2, 18, .5);
  for (let r = R; r < rows;) {
    const o = off(r + d); let e = r + 2; while (e < rows && off(e + d) === o) e += 2; e = Math.min(e, rows);
    ctx.drawImage(im, 0, r, im.width, e - r, sx + o, y + (r + d) / 2, im.width / 2, (e - r) / 2); r = e;
  }
  // It sets down with a puff of dust off the stack.
  const c = t % CRANE.period - CRANE.land;
  if (c >= 0 && c < 24) {
    ctx.fillStyle = `rgba(150,110,80,${.5 * (1 - c / 24)})`;
    for (let k = 0; k < 8; k++) { const s = k < 4 ? -1 : 1, v = (k % 4 + 1) * .35; ctx.fillRect(snap(sx + 109.5 + s * (23 + v * c)), snap(y + 111 + d / 2 - (k % 2) * .5 - c * .05), .5 + (k % 2) * .5, .5); }
  }
}

// Chimney smoke: puffs from the painted stacks roll up and lean off with the wind over the painted
// plumes (train's vista puff sheet, nr_vista_smoke: 8 variants x size rows, CELL plate px).
// [panel, mouth x, y (plate 2x px), rise, drift, start/end size, emit every, life].
const SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 46, 52, 60, 68], CELL = 72;
const SKY = [[40, '#4c2432'], [80, '#6e2e32'], [120, '#9a3c2c'], [160, '#c55a26'], [200, '#d26a28']];
const PLUMES = [
  ['ghat', 942, 106, 120, -150, 6, 30, 6, 320], ['ghat', 1386, 76, 140, -170, 6, 34, 6, 340],
  ['ghat', 1090, 124, 90, -120, 5, 24, 7, 280], ['ghat', 1234, 154, 80, -110, 5, 22, 7, 260],
  ['pontoon', 290, 134, 110, -130, 6, 28, 6, 300], ['pontoon', 344, 146, 90, -110, 5, 24, 7, 280],
  ['culvert', 1356, 76, 80, -90, 5, 20, 7, 260],
  // Warm outfall water steaming off the culvert's trench: low, slow, dim wisps (own haze, faint).
  ['culvert', 470, 408, 64, 22, 4, 16, 16, 280, '#c4ae90', .38], ['culvert', 640, 410, 56, 30, 4, 14, 19, 260, '#c4ae90', .34],
  ['culvert', 800, 406, 60, 18, 4, 15, 17, 270, '#c8b294', .36], ['culvert', 1010, 408, 58, 24, 4, 15, 18, 270, '#c4ae90', .34],
];
const puffs = new Map();
function puff(sheet, v, s, haze, mix) {
  const key = v + ',' + s + ',' + haze + ',' + mix; let c = puffs.get(key); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = CELL; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  x.drawImage(sheet, v * CELL, s * CELL, CELL, CELL, 0, 0, CELL, CELL);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = mix; x.fillStyle = haze; x.fillRect(0, 0, CELL, CELL);
  puffs.set(key, c); return c;
}
function drawSmoke(ctx, camX, t) {
  const sheet = A?.nr_vista_smoke; if (!sheet) return;
  for (const [pi, [panel, px, py, rise0, drift0, s0, s1, every, life, tint, fade = 1]] of PLUMES.entries()) {
    const ox = PANEL[panel] - camX, mx = ox + px / 2; if (mx < -60 || mx > W + 30) continue;
    for (let n = Math.floor((t - life) / every) + 1; n <= Math.floor(t / every); n++) {
      const born = n * every, u = (t - born) / life; if (u < 0 || u >= 1) continue;
      const r1 = hash(n * 3 + pi * 101), r2 = hash(n * 7 + pi * 31), r3 = hash(n * 13 + pi);
      const pulse = .5 + .5 * Math.sin(born * .09 + pi) * Math.sin(born * .023 + pi * 2);
      const size = (s0 + (s1 - s0) * Math.pow(u, .45)) * (.6 + r3 * .35 + pulse * .35);
      let s = 0; while (s < SIZES.length - 1 && SIZES[s + 1] <= size) s++;
      const dim = SIZES[s], grow = Math.min(1, u * 5), gust = Math.sin(born * .017 + pi) * .6;
      const rise = rise0 * (1 - Math.pow(1 - u, 2.2)) * (.9 + r1 * .2) + (r2 - .5) * .6 * dim * grow;
      const drift = drift0 * Math.pow(u, 1.2) * (.85 + r2 * .3) + gust * 14 * u + (r3 - .5) * 1.2 * dim * grow;
      const alpha = (u < .35 ? 1 : 1 - Math.pow((u - .35) / .65, .8)) * .72 * fade; if (alpha <= 0) continue;
      const y = py - rise - dim * .5, haze = tint || SKY.reduce((a, b) => Math.abs(b[0] - y) < Math.abs(a[0] - y) ? b : a)[1];
      const mix = Math.round((.35 + .35 * u) * 4) / 4, v = u < .5 ? Math.floor(r1 * 4) : 4 + Math.floor(r2 * 4);
      ctx.globalAlpha = alpha; ctx.drawImage(puff(sheet, v, s, haze, mix), snap(ox + (px + drift - CELL / 2) / 2), snap((py - rise - dim * .5 - CELL / 2) / 2), CELL / 2, CELL / 2);
    }
  }
  ctx.globalAlpha = 1;
}

// --- Wharf and pontoon extras -------------------------------------------------------------------
// A skiff moored off the pontoon, bow line on the bollard (its rope is in the art). The netcaster in
// its stern winds up, casts, lets the net sink, hauls it in and lifts out the catch; pose 7 when a
// fight comes near. His legs are behind the gunwale (the skiff draws over them).
const SKIFF = { x: 6080, y: 165 };   // the full hull clears the island masonry, outfall wall and quay coping
const CAST = [[0, 90], [1, 14], [2, 10], [3, 8], [4, 40], [5, 64], [6, 56], [0, 70]];
function drawSkiff(ctx, camX, t) {
  const sx = SKIFF.x - camX; if (sx < -80 || sx > W + 60 || !A?.dr_skiff) return;
  const y = SKIFF.y + Math.sin(t * .045) * .5, alarm = S.alarm.skiff || 0;
  let [f, age] = routine(CAST, t + 211); if (alarm) f = 7;
  cell(ctx, 'netcaster', f, sx - 24, y - 7, -1);
  // Stern lantern on a short post: a warm point and a breathing glow.
  ctx.fillStyle = '#2a1a12'; ctx.fillRect(snap(sx - 41), snap(y - 19), .5, 9);
  const k = .8 + .2 * Math.sin(t * .13) * Math.sin(t * .031);
  ctx.fillStyle = '#ffd08a'; ctx.fillRect(snap(sx - 42), snap(y - 21), 1.5, 1.5);
  const g = ctx.createRadialGradient(sx - 41, y - 20, 0, sx - 41, y - 20, 12); g.addColorStop(0, `rgba(255,190,110,${.35 * k})`); g.addColorStop(1, 'rgba(255,130,60,0)');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(sx - 53, y - 32, 24, 24); ctx.restore();
  cell(ctx, 'skiff', 0, sx, y);
  // Wet line and little laps along the hull.
  ctx.fillStyle = 'rgba(20,10,8,.4)'; ctx.fillRect(snap(sx - 40), snap(y - 1), 78, .5);
  ctx.fillStyle = 'rgba(255,205,150,.3)';
  for (let j = 0; j < 6; j++) { const u = (t * .01 + j / 6) % 1; ctx.fillRect(snap(sx - 44 + j * 15 + Math.sin(t * .03 + j) * 2), snap(y - .5 + (j % 2) * .5), 2 + u * 2, .5); }
  // The net goes in off the stern: a spreading ring and a few drops.
  if (f === 5 && !alarm && age < 36) {
    const nx = sx - 56, u = age / 36;
    ctx.strokeStyle = `rgba(235,215,180,${.55 * (1 - u)})`; ctx.lineWidth = .5; ctx.beginPath(); ctx.ellipse(nx, y + 1, 4 + u * 10, 1 + u * 2, 0, 0, 6.283); ctx.stroke();
    if (age < 12) { ctx.fillStyle = `rgba(240,225,195,${.8 * (1 - age / 12)})`; for (let j = 0; j < 6; j++) ctx.fillRect(snap(nx + (j - 2.5) * (1.2 + age * .25)), snap(y - age * (1.4 - j % 3 * .3) + .06 * age * age), .5, 1); }
  }
}
// Water laps at the pontoon's quay coping (plate edge at y ~190), between the railing's posts.
function drawFoam(ctx, camX, t) {
  if (camX + W < 5670 || camX > 6320) return;
  for (let i = 0; i < 70; i++) {
    const x = 5676 + i * 9 + hash(i * 5) * 5, sx = x - camX; if (sx < -4 || sx > W + 4) continue;
    const lap = Math.sin(t * .045 + x * .05 + hash(i) * 3); if (lap < .1) continue;
    ctx.fillStyle = `rgba(236,214,176,${.45 * lap})`;
    ctx.fillRect(snap(sx), snap(189.5 - lap * 1.2), 2 + hash(i * 3) * 3, .5);
    if (lap > .7) ctx.fillRect(snap(sx + 1), 189.5, 1.5, .5);
  }
}
// Gulls: two small flocks wheel over the water; a few stand on bollards, go up when a fight comes
// near, circle out and back over their post and settle once it is quiet. Frames 0-3 flap, 4 glide,
// 5 bank, 6 land, 7 perched (feet at cell (17, 31) of 38 in 2x px).
const PERCH = [[5087, 158, 1], [5795, 164, 1], [5927, 164, -1]];
const FLOCKS = [[5010, 74, 70, 12, 3, .4], [6040, 86, 120, 16, 4, 2.2]];
const LOOP = 220;
function stepGulls(near) {
  PERCH.forEach(([x], i) => {
    const g = S.gulls[i];
    if (!g.t) { if (near(x)) { g.t = 1; g.end = 2 * LOOP; } return; }
    g.t++;
    if (g.t === g.end - 50 && near(x)) g.end += LOOP;   // still trouble below: another turn
    if (g.t >= g.end) g.t = 0;
  });
}
function drawGulls(ctx, camX, t) {
  for (const [f, [cx, cy, rx, ry, n, ph]] of FLOCKS.entries()) {
    if (cx + rx + 20 < camX || cx - rx - 20 > camX + W) continue;
    for (let j = 0; j < n; j++) {
      const a = t * (.007 + j * .0007) + ph + j * .8, x = cx + Math.cos(a) * (rx - j * 9), y = cy + Math.sin(a) * ry + j * 4 + Math.sin(t * .02 + j) * 2;
      const face = -Math.sin(a) < 0 ? -1 : 1, c = (t + j * 37 + f * 11) % 160;
      const frame = Math.abs(Math.cos(a)) > .95 ? 5 : c < 48 ? Math.floor(c / 4) % 4 : 4;
      cell(ctx, 'gulls', frame, x - camX, y, face);
    }
  }
  PERCH.forEach(([x, top, face], i) => {
    const g = S.gulls[i]; if (x - camX < -60 || x - camX > W + 60) return;
    if (!g.t) {   // a stretch of the wings now and then
      const c = (t + i * 151) % 520; cell(ctx, 'gulls', c < 10 ? 6 : 7, x - camX + face, top + 3.5, face); return;
    }
    const s = g.t / LOOP * 6.283, env = ease(Math.min(1, g.t / 40, (g.end - g.t) / 50));
    const gx = x + face * 64 * Math.sin(s) * env, gy = top + 3.5 - 52 * env + Math.sin(s * 2) * 6 * env;
    const dir = g.end - g.t < 16 ? face : face * (Math.cos(s) >= 0 ? 1 : -1);
    const frame = g.end - g.t < 16 ? 6 : g.t < 40 || (g.t >> 5) % 2 ? Math.floor(g.t / 3) % 4 : Math.abs(Math.cos(s)) < .2 ? 5 : 4;
    cell(ctx, 'gulls', frame, gx - camX, gy, dir);
  });
}
const POLES = [], POLE_ROUTES = [];
function stepPoles() {}
function drawPoles() {}

// Background pass: drawn with the plates (behind props, fighters and the Dredger's set).
export function drawRiverLife(ctx, camX, assets, t) {
  A = assets; if (camX + W < 3100) return;   // from the dog and the charpai by the culvert door onward
  update(t);
  drawSmoke(ctx, camX, t);
  drawSwings(ctx, camX, t);
  drawKites(ctx, camX, t);
  drawWater(ctx, camX, t);
  drawOutfall(ctx, camX, t);
  drawFlotsam(ctx, camX, t);
  drawSkiff(ctx, camX, t);
  drawFoam(ctx, camX, t);
  drawStreams(ctx, camX, t);
  drawDrips(ctx, camX, t);
  drawGutter(ctx, camX, t);
  drawCables(ctx, camX, t);
  drawLamps(ctx, camX, t);
  drawCulvert(ctx, camX, t);
  drawPeople(ctx, camX, t);
  drawGulls(ctx, camX, t);
  drawPoles(ctx, camX);
}

// Foreground: near-camera pieces at the top and bottom edges only (never across the fighting lane).
// sx = x - camX * FG_PAR; [key, x, top y or bottom y, hangs from the top, flip].
const FG_PAR = 1.2;
const FRONT = [
  ['fg_pipe', 3240 * FG_PAR + 20, 0, true], ['fg_pipe', 3240 * FG_PAR + 390, -6, true, true],
  ['fg_bollard', 4150 * FG_PAR + 360, 278, false], ['fg_bollard', 4430 * FG_PAR + 60, 280, false, true],
  ['fg_hook', 4960 * FG_PAR + 400, 72, true], ['fg_hook', 5330 * FG_PAR + 120, 60, true],
  ['fg_bollard', 5120 * FG_PAR + 260, 279, false],
  ['fg_rail', 5760 * FG_PAR + 300, 280, false], ['fg_rail', 6000 * FG_PAR + 400, 281, false, true],
];
export function drawRiverFront(ctx, camX) {
  const rv = G.india?.review || {}; if (!A || rv.ambient === false || rv.environment === false || camX + W < 3240) return;
  const t = G.india?.t || 0;
  const piece = (c, i, [key, x, y, top, flip]) => {
    const im = A['dr_' + key]; if (!im) return;
    const w = im.width / 2, h = im.height / 2, sx = x - camX * FG_PAR; if (sx > W + 10 || sx + w < -10) return;
    // Hooks hang long below the frame's top and swing; everything else is planted.
    const sway = key === 'fg_hook' ? Math.sin(t * .021 + i) * 1.5 : 0, py = key === 'fg_pipe' ? y : y - h;
    c.save(); c.translate(snap(sx + sway), snap(py)); if (flip) { c.translate(w, 0); c.scale(-1, 1); }
    c.drawImage(im, 0, 0, w, h); c.restore();
  };
  const visible = f => { const im = A['dr_' + f[0]], sx = f[1] - camX * FG_PAR; return im && sx < W + 10 && sx + im.width / 2 > -10; };
  // Overhead pieces stay clear of the HUD; the planted ones at the bottom edge draw straight in.
  const over = FRONT.filter(f => f[3] && visible(f));
  if (over.length) {
    const x0 = Math.min(...over.map(f => f[1] - camX * FG_PAR)) - 3, x1 = Math.max(...over.map(f => f[1] - camX * FG_PAR + A['dr_' + f[0]].width / 2)) + 3;
    drawClearOfHud(ctx, c => FRONT.forEach((f, i) => { if (f[3]) piece(c, i, f); }), [x0, x1]);
  }
  FRONT.forEach((f, i) => { if (!f[3]) piece(ctx, i, f); });
}
// Review/check hook: ticks of alarm left for a background extra ('p0'.. people, 'w0'.. porters).
export function riverLifeAlarm(id) { return S.alarm[id] || 0; }
// Review hook: the carriers' routes (as walked; heading-left ones mirrored) and their live walk state.
export const riverCarriers = () => ({ routes: ROUTES, defs: CARRIERS, walkers: S.walkers });
// Review hook: the pole carriers' routes (heading-left one mirrored) and walk state.
export const riverPoles = () => ({ routes: POLE_ROUTES, defs: POLES, walkers: S.poles });
// World x of the pole pairs out on the quay (js/delhi_ambient.js: the wharf pigeons get out of their way).
export const riverQuayWalkers = () => [];
