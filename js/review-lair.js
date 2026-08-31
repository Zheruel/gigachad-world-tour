// Dedicated production reviewer for THE LAIR. This page is not loaded by the game.
// The room runs live here - the same update and the same draw order main.js uses for
// its `hub` state - because the whole point of the room is what it does when nobody is
// pressing anything.
import { G, W, H, RS, FLOOR_TOP, FLOOR_BOT, clamp } from './engine.js';
import { blit, frameW, frameH } from './sprites.js';
import { loadAIFrames } from './aiframes.js';
import { loadAssets, ASSETS, FILES } from './assets.js';
import { STAGES, initStageObj, drawStage, updateMotes } from './stages.js';
import { loadAmbience } from './ambience.js';
import { audio, loadSFX } from './audio.js';
import { loadFX } from './fx.js';
import { loadFG, drawFG } from './fg.js';
import { drawProp } from './props.js';
import { updateEffects, drawEffects } from './effects.js';
import { createPlayer, updatePlayer, drawPlayer } from './player.js';
import { initInput, endFrameInput, debugPress, debugRelease } from './input.js';
import { BOSSES } from './bosses.js';
import {
  HUB_STAGE, HUB_WIDTH, LAIR_ART, FIXTURES, BAG_X, BED_X, RELIC_SLOTS,
  createBag, resetHub, updateHub, drawHubWall, drawHubUI,
  hubBed, hubTiger, petsWatch,
} from './hub.js';
import { openPanel, closePanel } from './hubpanels.js';

const REACH = 40;          // hub.js's, for the marker overlay only
const WALK_PAD = 14;

const ZONES = [
  { name: 'THE LOUNGE', x0: 0, x1: 470, at: 290,
    note: 'The back bar, the aquarium the sofa faces, and the smoking suite on its rug.' },
  { name: 'TROPHIES AND MEDIA', x0: 470, x1: 905, at: 640,
    note: 'One long trophy hall, the humidor built into its base, the world map and the hi-fi.' },
  { name: 'THE VIEW', x0: 905, x1: 1450, at: 1100,
    note: 'The gym: the heavy bag on the window beam, the rack and bench as furniture, the mirror.' },
  { name: 'THE MASTER SUITE', x0: 1450, x1: HUB_WIDTH, at: 1700,
    note: 'The fire behind its fender, the pelt on the floor, the wardrobe and the bed.' },
];

const FIXTURE_NOTES = {
  bar: 'Plays ONCE: five poses on 18/12/12/42/40 holds, the AAAH on the last swallow, then it stands him up itself.',
  lounge: 'Sits him on the chesterfield. Four stable key poses plus three generated midpoint edits smooth the hand and head arc without redrawing the furniture.',
  trophies: 'Opens the relic gallery. Derived from STAGES, so a cut act takes its relic with it.',
  map: 'The world map: picks the act and leaves the room. ESC closes the panel rather than pausing behind it.',
  hifi: 'The jukebox. SETS the room track for this session - it is not saved, so a fresh start comes up on the lounge track.',
  bag: 'The only real prop in the room: duck-typed to props.js, punched rather than opened, unbreakable, builds meter.',
  mirror: 'A 96-frame held pose with duke_look_good over it. The voice line is optional - a missing wav plays nothing.',
};

// Every looping thing in the room. holds are FRAMES AT 60fps; where the room picks its
// own timing (the bed's random walk) the card says so rather than pretending.
const SETS = [
  {
    title: 'THE BED · 8 poses', dir: 'assets/lair/bed_N.png',
    frames: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1].map((i) => 'lair_bed_' + i),
    hold: 80, cadence: 'review rate',
    note: 'One generation per pose against pose 0 - 0.04% furniture drift. In the room she steps to a NEIGHBOUR every 200-520 frames and never jumps across the set. Nothing she does keys off where CHAD is standing.',
  },
  {
    title: 'THE BAR · pour', dir: 'assets/lair/bar_drink_N.png',
    frames: [0, 1, 2, 3, 4].map((i) => 'lair_bar_drink_' + i),
    holds: [18, 12, 12, 42, 40], cadence: 'true cadence',
    note: 'Glass at the hip, raised, at the lips, head back draining it, lowered with a grin. Scaled off pose 0 only, or he hops when the sprite swaps.',
  },
  {
    title: 'THE SOFA · smoke', dir: 'assets/lair/lounge_smoke_N.png',
    frames: [0, 1, 2, 3, 4, 5, 6].map((i) => 'lair_lounge_smoke_' + i),
    holds: [200, 14, 22, 18, 54, 18, 96], cadence: 'true cadence',
    note: 'Stable authored keys alternate with one-at-a-time midpoint edits. The sofa stays registered while CHAD raises the cigar, draws, and exhales.',
  },
  {
    title: 'THE FIRE · 4 frames', dir: 'assets/lair/fire_N.png',
    frames: [0, 1, 3, 2].map((i) => 'lair_fire_' + i),
    hold: 9, cadence: 'true cadence',
    note: 'Play ORDER 0,1,3,2 - measured, it is the cycle with the smallest worst step. Logs taken from frame 0 (0.00% drift); the brass fender is blitted back over the top.',
  },
  {
    title: 'THE TIGER · walk', dir: 'assets/lair/tiger_N.png',
    frames: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => 'lair_tiger_' + i),
    hold: 12, cadence: 'true cadence',
    note: 'Eight low stalking poses, registered on the ribcage rather than moving paw extrema. One frame every 5 px of travel.',
  },
  {
    title: 'THE TIGER · rest', dir: 'assets/lair/tiger_*.png',
    frames: ['lair_tiger_lie', 'lair_tiger_wake', 'lair_tiger_sit', 'lair_tiger_stretch', 'lair_tiger_snarl'],
    hold: 50, cadence: 'review rate',
    note: 'Not a loop: lie → wake → sit → stretch → walk is the ORDER he gets up in, and ?auto=verify asserts the order rather than the timings. Snarl is the RAGNAROK scatter.',
  },
  {
    title: 'THE SHARK · 4 frames', dir: 'assets/lair/shark_N.png',
    frames: [0, 1, 2, 3].map((i) => 'lair_shark_' + i),
    hold: 9, cadence: 'true cadence',
    note: 'Always smoking - one wisp every 16 frames - and a proper drag every 4-8s in three sub-bursts. The lit end is measured off shark_0 and mirrors with him.',
  },
  {
    title: 'THE BAITBALL · 4 frames', dir: 'assets/lair/baitfish_N.png',
    frames: [0, 1, 2, 3].map((i) => 'lair_baitfish_' + i),
    hold: 13, cadence: 'true cadence',
    note: 'One generated anchor supplies every frame. The body is immutable; only the tail fan moves by one device pixel, and the room uses 14 fish instead of 26 overlapping phases.',
  },
  {
    title: 'THE CRAB · 4 frames', dir: 'assets/lair/crab_N.png',
    frames: [0, 1, 2, 3].map((i) => 'lair_crab_' + i),
    hold: 16, cadence: 'true cadence',
    note: 'Only steps while walking - 0.07 px a frame, resting 90-260 frames at a time - and plays dead when the shark comes over the sand.',
  },
];

const PLATES = [
  ['bg_lair_wall', 'The wall plate', 'Every fixture x is measured off this. Its device width must be exactly 2 × HUB_WIDTH.'],
  ['bg_lair_floor', 'The granite floor', 'floorW must equal this plate\'s logical width or the floor gaps.'],
  ['bg_lair_sky_far', 'City · far', 'Parallax 0.20. The window is keyed out of the wall plate, so this shows through the hole.'],
  ['bg_lair_sky_near', 'City · near', 'Parallax 0.42, with the sun, mast beacons, lit windows and an airship painted between the two layers.'],
  ['lair_tankscape', 'The tankscape', 'ONE generation across the full 299 of glass - two halves butted together showed their join. 92 of the 112 of water; the shark swims in FRONT of it.'],
  ['lair_tank_frame', 'The tank surround', 'A nine-slice rebuilt at 280×142 from the plate\'s own 170×134 brass. Scale it instead and the corner bolts stretch into ovals.'],
];

const AUDIO = [
  ['audio/neon_shadows.mp3', 'NEON SHADOWS', 'The lair\'s own music slot, so the hub scores itself without the title screen losing its chiptune.'],
  ['audio/voice/duke_look_good.wav', 'Mirror flex', 'Fired by the FLEX fixture. A missing wav is skipped by loadSFX and the flex simply plays no line.'],
  ['audio/sfx/armor.wav', 'Bag impact', 'Every hit on the heavy bag.'],
  ['audio/sfx/blip.wav', 'Fixture blip', 'Sitting down, pouring one, standing back up, opening a panel.'],
  ['audio/sfx/super.wav', 'RAGNAROK', 'The meter earned on the bag is spendable in the room; it scatters the tiger.'],
];

const roomView = document.getElementById('roomView');
const ctx = roomView.getContext('2d');
const overview = document.getElementById('overview');
const octx = overview.getContext('2d');
const standing = document.getElementById('standing');
const posReadout = document.getElementById('posReadout');
const zoneReadout = document.getElementById('zoneReadout');
const freezeBtn = document.getElementById('freeze');

const state = { ready: false, frozen: false, dragging: false, dragX: 0, dragPlayer: 0 };
const taps = [];
const setCards = [];

const check = (id) => document.getElementById(id).checked;
const zoneAt = (x) => ZONES.find((z) => x >= z.x0 && x < z.x1) || ZONES[ZONES.length - 1];

// debugPress leaves the key HELD, so it has to be let go of again a couple of frames later
function tap(action) {
  debugPress(action);
  taps.push({ action, t: 3 });
}

function walkTo(x) {
  G.player.x = clamp(x, WALK_PAD, HUB_WIDTH - WALK_PAD);
  G.player.vx = 0;
  G.camX = clamp(G.player.x - W / 2, 0, G.camMax);   // so a jump lands even while frozen
}

// ------------------------------------------------------------------ the room
function drawRoom() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, roomView.width, roomView.height);
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  const camX = G.camX;

  if (check('showAmbience')) drawStage(ctx, camX);
  else {
    const keep = HUB_STAGE.ambient;
    HUB_STAGE.ambient = () => {};
    drawStage(ctx, camX);
    HUB_STAGE.ambient = keep;
  }
  if (check('showFixtures')) drawHubWall(ctx, camX);
  drawEntities(camX);
  drawFG(ctx, camX);
  if (check('showMarkers')) drawMarkers(camX);
  if (check('showGrid')) drawDepthGrid();
  drawEffects(ctx, camX);
  if (check('showHud')) drawHubUI(ctx);
}

// main.js's drawWorld, cut down to what the room actually holds: the bag, the tiger,
// and CHAD - who drops out of the list while the furniture is drawing him.
function drawEntities(camX) {
  const ents = [...G.props];
  if (check('showLife')) ents.push(...G.actors);
  if (!G.hubSeat) ents.push(G.player);
  ents.sort((a, b) => a.y - b.y);
  const drawEnt = (e) => {
    if (e.draw) e.draw(ctx, camX);
    else if (e.kind === 'player') drawPlayer(ctx, e, camX);
    else drawProp(ctx, e, camX);
  };
  for (const e of ents) drawEnt(e);
  ctx.save();
  ctx.globalAlpha = 0.10;
  G.reflecting = true;
  for (const e of ents) {
    if (e.kind === 'prop' && !e.reflect) continue;
    ctx.save();
    ctx.translate(0, Math.round((e.y + 3) * 1.5));
    ctx.scale(1, -0.5);
    drawEnt(e);
    ctx.restore();
  }
  G.reflecting = false;
  ctx.restore();
}

function drawMarkers(camX) {
  ctx.font = '6px ui-monospace, monospace';
  for (const f of FIXTURES) {
    const x = Math.round(f.x - camX);
    if (x < -60 || x > W + 60) continue;
    ctx.fillStyle = 'rgba(255,212,92,.10)';
    ctx.fillRect(x - REACH, FLOOR_TOP, REACH * 2, FLOOR_BOT - FLOOR_TOP);
    ctx.strokeStyle = G.hubSel === f.id ? 'rgba(85,213,140,.95)' : 'rgba(255,212,92,.7)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x + .5, 20); ctx.lineTo(x + .5, H - 26); ctx.stroke();
    ctx.setLineDash([]);
    const label = f.id.toUpperCase();
    ctx.fillStyle = '#0d0b12'; ctx.fillRect(x - 22, 22, 44, 11);
    ctx.fillStyle = G.hubSel === f.id ? '#7ef0aa' : '#ffd45c';
    ctx.fillText(label, x - label.length * 1.8, 30);
  }
  for (const z of ZONES) {
    const x = Math.round(z.x0 - camX);
    if (x < -10 || x > W + 10) continue;
    ctx.strokeStyle = 'rgba(101,199,232,.55)';
    ctx.beginPath(); ctx.moveTo(x + .5, 14); ctx.lineTo(x + .5, H - 8); ctx.stroke();
  }
}

function drawDepthGrid() {
  ctx.lineWidth = .5;
  ctx.strokeStyle = 'rgba(100,210,232,.35)';
  for (let x = 0; x <= W; x += 32) { ctx.beginPath(); ctx.moveTo(x, FLOOR_TOP); ctx.lineTo(x, FLOOR_BOT); ctx.stroke(); }
  for (let y = FLOOR_TOP; y <= FLOOR_BOT; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,104,112,.6)';
  for (const y of [FLOOR_TOP, FLOOR_BOT]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}

function drawOverview() {
  const w = overview.width, h = overview.height;
  const sx = w / HUB_WIDTH;
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, w, h);
  const wall = ASSETS.bg_lair_wall, floor = ASSETS.bg_lair_floor;
  if (wall) octx.drawImage(wall, 0, 0, w, 58);
  else { octx.fillStyle = '#3b2c40'; octx.fillRect(0, 0, w, 58); }
  if (floor) octx.drawImage(floor, 0, 58, w, 28);
  else { octx.fillStyle = '#2a2430'; octx.fillRect(0, 58, w, 28); }

  octx.font = '9px ui-monospace, monospace';
  for (const z of ZONES) {
    octx.strokeStyle = 'rgba(101,199,232,.8)';
    octx.beginPath(); octx.moveTo(z.x0 * sx, 0); octx.lineTo(z.x0 * sx, h); octx.stroke();
    octx.fillStyle = 'rgba(13,11,18,.72)';
    octx.fillRect(z.x0 * sx + 2, 2, z.name.length * 5.6 + 6, 12);
    octx.fillStyle = '#8ad8ff';
    octx.fillText(z.name, z.x0 * sx + 5, 11);
  }
  for (const f of FIXTURES) {
    const x = f.x * sx;
    octx.fillStyle = G.hubSel === f.id ? '#7ef0aa' : '#ffd45c';
    octx.beginPath(); octx.arc(x, 62, 4, 0, Math.PI * 2); octx.fill();
    octx.fillText(f.id, x - f.id.length * 2.6, 78);
  }
  const tiger = hubTiger();
  octx.fillStyle = '#ff9a4a';
  octx.beginPath(); octx.arc(tiger.x * sx, 52, 3.5, 0, Math.PI * 2); octx.fill();
  octx.fillStyle = '#c58aff';
  octx.beginPath(); octx.arc(BED_X * sx, 52, 3.5, 0, Math.PI * 2); octx.fill();

  const px = G.player.x * sx;
  octx.fillStyle = '#fff';
  octx.beginPath(); octx.moveTo(px, 44); octx.lineTo(px - 4, 36); octx.lineTo(px + 4, 36); octx.fill();
  const vx = G.camX * sx, vw = W * sx;
  octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.strokeRect(vx + 1, 1, Math.max(2, vw - 2), h - 2);
  octx.fillStyle = 'rgba(255,255,255,.07)'; octx.fillRect(vx, 0, vw, h);
}

function step() {
  G.rawTime++;
  G.time++;
  updateHub();
  if (!G.hubSeat && !G.hubPanel) updatePlayer(G.player);
  updateMotes();
  updateEffects();
  // the camera is simulation, not draw: clampToArena walls CHAD in against it, so a
  // teleport with a stale camera lands him back where the camera was
  G.camX = clamp(G.player.x - W / 2, 0, G.camMax);
  for (let i = taps.length - 1; i >= 0; i--) {
    if (--taps[i].t <= 0) { debugRelease(taps[i].action); taps.splice(i, 1); }
  }
  endFrameInput();
}

function syncReadouts() {
  standing.value = String(Math.round(G.player.x));
  const zone = zoneAt(G.player.x);
  zoneReadout.textContent = zone.name + (G.hubSel ? ` · ${G.hubSel.toUpperCase()} IN REACH` : '');
  posReadout.textContent = `CHAD ${Math.round(G.player.x)} · camera ${Math.round(G.camX)} / ${HUB_WIDTH - W}`;
}

function frame() {
  if (state.ready && !state.frozen) step();
  if (state.ready) {
    drawRoom();
    drawOverview();
    syncReadouts();
  }
  for (const s of setCards) s.tick();
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------------ page furniture
function buildZones() {
  const parent = document.getElementById('zoneCards');
  for (const z of ZONES) {
    const el = document.createElement('article');
    el.className = 'zone-card';
    el.innerHTML = `<h3>${z.name}</h3><p class="span">x ${z.x0} – ${z.x1}</p><p class="muted">${z.note}</p>`;
    el.onclick = () => walkTo(z.at);
    parent.appendChild(el);
  }
}

function buildFixtures() {
  const rows = document.getElementById('fixtureRows');
  for (const f of FIXTURES) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.id.toUpperCase()}</td><td>${f.x}</td><td>${f.key || 'F'}</td>` +
      `<td>${f.hint}</td><td class="muted">${FIXTURE_NOTES[f.id] || ''}</td>`;
    tr.onclick = () => walkTo(f.x);
    rows.appendChild(tr);
  }
}

function card(parent, src, title, description, cls = 'asset-card') {
  const el = document.createElement('article');
  el.className = cls;
  el.innerHTML = `<div class="preview"><img loading="lazy" src="${src}" alt="${title}"></div>` +
    `<div class="meta"><h3>${title}</h3><p>${description}</p><code>${src}</code></div>`;
  parent.appendChild(el);
  return el;
}

function buildPlates() {
  const parent = document.getElementById('plateGrid');
  for (const [key, title, note] of PLATES) {
    const el = document.createElement('div');
    el.className = 'plate-card';
    el.innerHTML = `<h3>${title}</h3><img loading="lazy" src="${FILES[key]}" alt="${title}">` +
      `<p class="muted">${note}</p><code>${FILES[key]}</code>`;
    parent.appendChild(el);
  }
}

function buildArt() {
  const parent = document.getElementById('artCards');
  const placements = new Map();
  for (const d of LAIR_ART) {
    if (!placements.has(d.art)) placements.set(d.art, []);
    placements.get(d.art).push(d);
  }
  // the sofa is not in LAIR_ART - drawHubWall swaps it for the smoking set - but it is
  // the biggest thing on the lounge wall, so it belongs in the inventory
  placements.set('lair_lounge_empty', [{ x: 290, y: 200, w: 141, h: 63 }]);
  for (const [key, list] of placements) {
    const src = FILES[key];
    const where = list.map((d) => `x ${d.x}${d.flip ? ' (flipped)' : ''}`).join(' · ');
    const desc = `${list[0].w}×${list[0].h} logical · ${where}`;
    if (src) card(parent, src, key.replace('lair_', ''), desc);
  }
}

function buildRelics() {
  const parent = document.getElementById('relicCards');
  const inTour = new Set(STAGES.map((s) => s.boss));
  for (const id of Object.keys(BOSSES)) {
    const src = FILES['lair_relic_' + id];
    if (!src) continue;
    const b = BOSSES[id];
    const note = inTour.has(id)
      ? `Taken from ${b.name}. Stands on the hall's shelves once the act is cleared.`
      : `Taken from ${b.name} — that act is cut from the tour, so this relic is unreachable.`;
    card(parent, src, b.name, note);
  }
  const el = document.createElement('article');
  el.className = 'asset-card';
  const slots = RELIC_SLOTS;
  el.innerHTML = '<div class="preview"><canvas width="356" height="200"></canvas></div>' +
    `<div class="meta"><h3>Shelf slots</h3><p>${slots.length} slots · 6 across × 3 shelves. Feet land on the brass rails at logical y ${[...new Set(slots.map((s) => s[1]))].join(' / ')}.</p><code>RELIC_SLOTS · js/hub.js</code></div>`;
  parent.appendChild(el);
  const c = el.querySelector('canvas').getContext('2d');
  c.fillStyle = '#1b1420'; c.fillRect(0, 0, 356, 200);
  const x0 = Math.min(...slots.map((s) => s[0])) - 20;
  const scale = 356 / (Math.max(...slots.map((s) => s[0])) - x0 + 40);
  for (const [x, y] of slots) {
    c.fillStyle = '#ffd45c';
    c.fillRect((x - x0) * scale - 1, (y - 40) * 1.5, 3, 3);
    c.strokeStyle = 'rgba(255,212,92,.35)';
    c.beginPath(); c.moveTo(0, (y - 40) * 1.5 + 3.5); c.lineTo(356, (y - 40) * 1.5 + 3.5); c.stroke();
  }
}

function buildAudio() {
  const parent = document.getElementById('audioCards');
  for (const [src, title, note] of AUDIO) {
    const el = document.createElement('article');
    el.className = 'audio-card';
    el.innerHTML = `<h3>${title}</h3><p class="muted">${note}</p>` +
      `<audio controls preload="none" src="${src}"></audio><code>${src}</code>`;
    parent.appendChild(el);
  }
}

// One player per animated set: the frames on their real holds, and a step-through, because
// a churning frame is invisible at speed and a registration pop is invisible when stopped.
function buildSets() {
  const parent = document.getElementById('setCards');
  for (const set of SETS) {
    const holds = set.holds || set.frames.map(() => set.hold);
    const el = document.createElement('article');
    el.className = 'asset-card set-card';
    el.innerHTML = '<div class="preview"><canvas></canvas></div>' +
      `<div class="meta"><h3>${set.title}</h3><p>${set.note}</p><code>${set.dir}</code></div>` +
      '<div class="readout"></div>' +
      '<div class="row"><button class="small play">PAUSE</button><button class="small prev">◀</button>' +
      '<button class="small next">▶</button></div>';
    parent.appendChild(el);
    const canvas = el.querySelector('canvas');
    const c = canvas.getContext('2d');
    const readout = el.querySelector('.readout');
    const s = { i: 0, t: 0, playing: true };

    const draw = () => {
      const imgs = set.frames.map((k) => ASSETS[k]).filter(Boolean);
      if (!imgs.length) return;
      const w = Math.max(...imgs.map(frameW)) * RS, h = Math.max(...imgs.map(frameH)) * RS;
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, w, h);
      c.imageSmoothingEnabled = false;
      const img = ASSETS[set.frames[s.i]];
      if (!img) return;
      // one shared box, bottom-centred: drift between frames is the thing being reviewed
      c.drawImage(img, Math.round((w - frameW(img) * RS) / 2), h - frameH(img) * RS);
      readout.textContent = `frame ${s.i + 1}/${set.frames.length} · ${set.frames[s.i].replace('lair_', '')} · hold ${holds[s.i]}f · ${set.cadence}`;
    };
    const stepTo = (n) => {
      s.i = (n + set.frames.length) % set.frames.length;
      s.t = 0;
      draw();
    };
    el.querySelector('.play').onclick = (e) => {
      s.playing = !s.playing;
      e.target.textContent = s.playing ? 'PAUSE' : 'PLAY';
    };
    el.querySelector('.prev').onclick = () => stepTo(s.i - 1);
    el.querySelector('.next').onclick = () => stepTo(s.i + 1);
    setCards.push({
      draw,
      tick() {
        if (!s.playing || !state.ready) return;
        if (++s.t >= holds[s.i]) stepTo(s.i + 1);
      },
    });
  }
}

function wireControls() {
  standing.oninput = () => walkTo(Number(standing.value));
  document.getElementById('prevFixture').onclick = () => stepFixture(-1);
  document.getElementById('nextFixture').onclick = () => stepFixture(1);
  document.getElementById('useFixture').onclick = () => { audio.unlock(); tap('use'); };
  document.getElementById('punchBag').onclick = () => { walkTo(BAG_X - 26); G.player.face = 1; tap('attack'); };
  document.getElementById('callTiger').onclick = () => petsWatch(G.player.x, 220);
  document.getElementById('wakeThem').onclick = () => walkTo(BED_X - 60);
  document.getElementById('speakNow').onclick = () => { hubBed().next = 1; };
  document.getElementById('closePanelBtn').onclick = () => closePanel();
  freezeBtn.onclick = () => {
    state.frozen = !state.frozen;
    freezeBtn.textContent = state.frozen ? 'RESUME' : 'FREEZE';
  };
  // the three panels are opened directly rather than by walking up and pressing F, so
  // they can be checked without hunting for the fixture
  for (const id of ['map', 'hifi', 'trophies']) {
    const b = document.createElement('button');
    b.className = 'small';
    b.textContent = id.toUpperCase() + ' PANEL';
    b.onclick = () => { walkTo(FIXTURES.find((f) => f.id === id).x); openPanel(id); };
    document.querySelector('.stage-toolbar').appendChild(b);
  }
  roomView.addEventListener('pointerdown', (e) => {
    state.dragging = true; state.dragX = e.clientX; state.dragPlayer = G.player.x;
    roomView.setPointerCapture(e.pointerId);
  });
  roomView.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const logical = (e.clientX - state.dragX) * W / roomView.getBoundingClientRect().width;
    walkTo(state.dragPlayer - logical);
  });
  roomView.addEventListener('pointerup', () => { state.dragging = false; });
  overview.onclick = (e) => {
    const r = overview.getBoundingClientRect();
    walkTo((e.clientX - r.left) / r.width * HUB_WIDTH);
  };
}

function stepFixture(dir) {
  const xs = FIXTURES.map((f) => f.x).sort((a, b) => a - b);
  const here = G.player.x;
  const next = dir > 0 ? xs.find((x) => x > here + 2) : [...xs].reverse().find((x) => x < here - 2);
  walkTo(next === undefined ? (dir > 0 ? xs[0] : xs[xs.length - 1]) : next);
}

// the same handle main.js hangs on window.__game, for poking at the room from the console.
// step(n) is there because a hidden tab gets no requestAnimationFrame at all.
window.__lair = {
  G, walkTo, tap, openPanel, closePanel, hubBed, hubTiger, petsWatch, FIXTURES,
  step: (n = 1) => { for (let i = 0; i < n; i++) step(); },
};

buildZones();
buildFixtures();
buildPlates();
buildSets();
buildAudio();
wireControls();
initInput();
G.audio = audio;

Promise.all([loadAssets(), loadAIFrames(), loadAmbience(), loadFX(), loadFG(), loadSFX()]).then(() => {
  initStageObj(HUB_STAGE);
  G.player = createPlayer();
  G.player.x = 640;
  G.player.y = 218;
  G.enemies = [];
  G.pickups = [];
  G.effects = [];
  G.shots = [];
  G.zones = [];
  G.boss = null;
  G.props = [createBag()];
  G.hubAct = 0;
  G.hubTrack = null;
  resetHub();
  G.camX = clamp(G.player.x - W / 2, 0, G.camMax);
  buildArt();
  buildRelics();
  for (const s of setCards) s.draw();
  state.ready = true;
  document.getElementById('loadState').textContent = 'Production assets loaded';
}).catch((err) => {
  document.getElementById('loadState').textContent = `Load error: ${err}`;
  console.error(err);
});

frame();
