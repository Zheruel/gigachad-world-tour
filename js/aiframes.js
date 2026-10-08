// aiframes.js - manifest-driven AI-generated sprite frames.
// Loads assets/frames/manifest.json; any character/state/frame that is missing
// or fails to load simply stays absent and getFrame() falls back to the
// code-drawn sprite. Frames are normalized so the BODY anchors at canvas
// center and the feet sit 3px above the canvas bottom - exactly matching the
// anchor semantics of the code-drawn sprites (draw: sx - w/2, sy - h + 4).

import { RS } from './engine.js';
import { packOfActor, track, urgentPack } from './loading.js';

const AIF = {}; // charKey -> { manifestState: { f: [canvas], fl: [canvas] } }

// Per-frame authored nudges, applied after normalization.
// normalize() centres a frame on its lower-body centroid, but during a stride the
// legs swing asymmetrically so that centroid drifts and the torso wobbles frame to
// frame - which reads as a waddle no matter how good the poses are. These offsets
// let the lab correct individual frames by hand (arrow keys in ANIM mode).
let ANCHORS = {};
export function allAnchors() { return ANCHORS; }

// Logical sprite heights. A fighter is ~1.8m and the stage art shows streets
// with ~3.5m facades inside a 181px wall band, so a man reads at ~80-96px for
// the world to sit right (this is the Streets of Rage 2 ratio). CHAD is the
// biggest man on the street; only the bosses loom over him.
const HEIGHTS = {
  player: 96,
  nr_tough:100,nr_bruiser:106,nr_runner:100,nr_ambusher:96,nr_heavy:114,nr_guard:104,nr_chai:100,nr_neta:84,nr_neta_guard:123,
  goonda: 80, batta: 82, masala: 79, bandar: 46, pehlwan: 97,
  constable: 86, operator: 80, sepoy: 94,
  // Retained shared families use canvas heights measured by their tallest pose.
  // The new ic_ families instead carry registered source-scale frames below.
  cooker: 82, thela: 107, mudlark: 70, dhobi: 90, dabbawala: 89, bull: 105,
  raja: 104, refund: 106, yadav: 108, rana: 112,
};

// game frame name -> candidate manifest state names (first hit wins)
const NAMEMAP = {
  jab: ['atk1'], hook: ['atk2'], upper: ['atk3'],
  atk: ['atk', 'atk1'], punch: ['punch', 'atk', 'atk1'],
  jumpkick: ['jumpkick', 'jump'],
  special: ['special', 'victory'],
  grab: ['grab', 'punch', 'atk'],
  slam: ['slam', 'punch'],
  getup: ['getup', 'idle'],
  run: ['run', 'walk'],
  wallsplat: ['wallsplat', 'hurt'],
  suplex: ['suplex', 'throw', 'grab'],
  taunt: ['taunt', 'victory', 'idle'],
  jumpfall: ['jumpfall', 'jump'],
  idle_cigar: ['idle_cigar'], idle_shades: ['idle_shades'],
  idle_flex: ['idle_flex'], idle_knuckles: ['idle_knuckles'],
  // DIRTY DELHI. Every new pose needs a chain or it silently renders the code
  // fallback forever - which is what makes art landing one strip at a time work.
  charge: ['charge', 'run', 'walk'],
  stomp: ['stomp', 'slam', 'punch'],
  beam: ['beam', 'atk', 'atk1'],
  ram: ['ram', 'charge', 'run', 'walk'],
  push: ['push', 'walk'],
  rise: ['rise', 'getup', 'idle'],
  whip: ['whip', 'atk', 'atk1'],
  paw: ['paw', 'idle'],
  hang: ['hang', 'idle'],
  drop: ['drop', 'jumpfall', 'jump', 'atk'],
  screech: ['screech', 'atk', 'atk1'],
  snatch: ['snatch', 'grab', 'atk'],
  swing: ['swing', 'atk', 'atk1', 'punch'],
  chilli: ['chilli', 'punch', 'atk'],
  perch:['perch','jump'],

};

function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function flipH(src) {
  const c = mkCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  c._as = src._as;
  return c;
}

// Normalize one AI frame: scale to the character's code-sprite height, then
// re-anchor so the lower-body centroid is horizontally centered and the feet
// sit 3px above the bottom edge. Returns null for empty/broken frames.
// States whose horizontal registration should follow the TORSO rather than the legs.
// Anchoring a walk cycle on the lower body makes the torso swing side to side as the
// legs alternate - measured at 6 logical px across CHAD's cycle, which is exactly what
// reads as a waddle. The torso is the stable mass; the legs swing under it.
const TORSO_ANCHORED = new Set(['walk', 'run', 'combo_power_a', 'combo_power_b', 'combo_power_finish', 'ragnarok_ground']);
// RAGNAROK contains raised-arm and airborne silhouettes taller than the
// normal 96px body. Its processed 2x canvas deliberately preserves that extra
// headroom; scaling every frame back to 96px would make CHAD shrink mid-jump.
const PRESERVE_SOURCE_SCALE = new Set(['ragnarok_air', 'upper', 'combo_power_b']); // taller files carry raised-fist headroom

function normalize(img, logicalH, anchor, torsoAnchor, preserveSourceScale) {
  // AI art is authored at RS device pixels per logical pixel
  const targetH = preserveSourceScale ? img.height : logicalH * RS;
  const foot = 3 * RS;
  const scale = preserveSourceScale ? 1 : targetH / img.height;
  const w = Math.max(1, Math.round(img.width * scale));
  const tmp = mkCanvas(w, targetH);
  const tx = tmp.getContext('2d');
  tx.imageSmoothingEnabled = false;
  tx.drawImage(img, 0, 0, w, targetH);
  let data;
  try { data = tx.getImageData(0, 0, w, targetH).data; } catch (e) { return null; }
  let minX = w, maxX = -1, maxY = -1, minY = -1;
  for (let y = 0; y < targetH && minY < 0; y++) {
    for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 16) { minY = y; break; }
  }
  if (minY < 0) return null;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  // anchor band, measured within the body's own bounds so it is pose-independent
  const bodyH = maxY - minY + 1;
  const from = torsoAnchor ? minY : minY + Math.floor(bodyH * 0.4);
  const to = torsoAnchor ? minY + Math.floor(bodyH * 0.42) : maxY;
  let cxSum = 0, cxN = 0;
  for (let y = from; y <= to; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) { cxSum += x; cxN++; }
    }
  }
  if (cxN === 0) return null;
  const anchorX = cxSum / cxN;
  const half = Math.ceil(Math.max(anchorX - minX, maxX - anchorX));
  const outW = Math.max(32 * RS, half * 2 + 2);
  const out = mkCanvas(outW, targetH);
  const ox = out.getContext('2d');
  ox.imageSmoothingEnabled = false;
  const ax = anchor ? anchor.dx * RS : 0;
  const ay = anchor ? anchor.dy * RS : 0;
  ox.drawImage(tmp, Math.round(outW / 2 - anchorX) + ax, Math.round((targetH - foot) - maxY) + ay);
  out._as = RS;
  return out;
}

// Two review runtimes can request thousands of frames together. Bound active image
// requests so Chrome and the development server never drop whole sprite families.
const IMAGE_LIMIT=16,imageQueue=[];let activeImages=0;
function pumpImages(){
 while(activeImages<IMAGE_LIMIT&&imageQueue.length){
  // The pack the player is waiting on (the load screen) jumps the queue.
  const first=urgentPack()?imageQueue.findIndex(q=>q.pack===urgentPack()):-1;
  const{src,resolve}=imageQueue.splice(Math.max(0,first),1)[0],img=new Image();activeImages++;
  const done=value=>{activeImages--;resolve(value);pumpImages();};
  img.onload=()=>done(img);img.onerror=()=>done(null);img.src=src;
 }
}
function loadImage(src,pack){return new Promise(resolve=>{imageQueue.push({src,resolve,pack});pumpImages();});}

// The anchors and manifest are read once and shared by every pack's load.
let tables=null;
function loadTables(){
  return tables||=(async()=>{
    try {
      const r = await fetch('assets/frames/anchors.json', { cache: 'no-cache' });
      if (r.ok) ANCHORS = await r.json();
    } catch (e) { ANCHORS = {}; }
    try {
      const res = await fetch('assets/frames/manifest.json', { cache: 'no-cache' });
      return res.ok ? await res.json() : null;
    } catch (e) { return null; }
  })();
}

// One pack's actors (js/loading.js), or every actor when no pack is named.
export async function loadAIFrames(pack) {
  const manifest = await loadTables();
  if (!manifest) return;
  // Multi-arena review pages need only their actors, not every chapter's bank.
  const reviewActors = location.pathname.endsWith('/tools/review/runtime.html')
    ? new URLSearchParams(location.search).get('reviewActors') : null;
  const actorFilter = reviewActors ? new Set(reviewActors.split(',')) : null;
  const jobs = [];
  for (const charKey of Object.keys(manifest)) {
    if (actorFilter && !actorFilter.has(charKey)) continue;
    if (pack && packOfActor(charKey) !== pack) continue;
    const states = manifest[charKey];
    if (!states || typeof states !== 'object') continue;
    const targetH = HEIGHTS[charKey] || 48;
    if (!AIF[charKey]) AIF[charKey] = {};
    for (const state of Object.keys(states)) {
      const files = states[state];
      if (!Array.isArray(files) || !files.length) continue;
      jobs.push((async () => {
        const imgs = await Promise.all(files.map((f) => track(packOfActor(charKey), loadImage('assets/frames/' + f, packOfActor(charKey)))));
        const frames = [];
        for (let k = 0; k < imgs.length; k++) {
          const img = imgs[k];
          if (!img) continue; // failed file: skip, fall back for that frame
          let n;
          if(charKey.startsWith('nr_') || charKey.startsWith('dl_') || charKey.startsWith('ic_') || (charKey==='player' && ['boxing_rush','boxing_variety','super_barrage','super_electric','electric_finish','puri_cram','puri_cigar','dredge_catch','dredge_spin','dredge_light'].includes(state))) {n=mkCanvas(img.width,img.height);n.getContext('2d').drawImage(img,0,0);n._as=RS;}
          else n = normalize(img, targetH, ANCHORS[files[k]], TORSO_ANCHORED.has(state), PRESERVE_SOURCE_SCALE.has(state));
          if (n) { n._file = files[k]; frames.push(n); }
        }
        if (frames.length) {
          AIF[charKey][state] = { f: frames, fl: frames.map(flipH) };
        }
      })());
    }
  }
  await Promise.all(jobs);
}

// True only when this exact manifest state loaded: no alias chain, for art that is landing one state at a time.
export function hasAIState(charKey, state) { return !!AIF[charKey]?.[state]; }

// Resolve a game frame name to loaded AI frames, or null (-> code sprite).
export function getAIFrame(charKey, gameName) {
  const states = AIF[charKey];
  if (!states) return null;
  const candidates = NAMEMAP[gameName] ? [...NAMEMAP[gameName], gameName] : [gameName];
  for (const c of candidates) {
    if (states[c]) return states[c];
  }
  return null;
}
