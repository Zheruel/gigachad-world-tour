// Dedicated production reviewer for Stage 1-1. This page is not
// loaded by the game.
import { G, W, H, RS, FLOOR_TOP, FLOOR_BOT, clamp } from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { loadAIFrames } from './aiframes.js';
import { loadAssets, ASSETS } from './assets.js';
import { STAGES, initStage, drawStage, updateMotes } from './stages.js';
import { loadAmbience, updateAmbience, reactStage } from './ambience.js';
import { ENTRANCE_LAST_FRAME, loadStory, resetStory, updateMotorcycleArrival, drawMotorcycleArrival } from './story.js';
import { audio, loadSFX } from './audio.js';
import { loadFX } from './fx.js';
import { drawProp, createProp } from './props.js';
import { updateEffects, drawEffects } from './effects.js';

const STAGE = STAGES[0];
const CAM_MAX = STAGE.width - W;

const cast = [
  { key: 'player', name: 'CHAD', role: 'Playable hero', state: 'jab' },
  { key: 'goonda', name: 'Goonda', role: 'The metronome · stays boring on purpose', state: 'atk' },
  { key: 'bandar', name: 'Bandar', role: 'Fast thief · takes what is on the floor', state: 'atk' },
  { key: 'batta', name: 'Batta', role: 'Reach · a red arc that hits his own side too', state: 'atk' },
  { key: 'cooker', name: 'Cooker', role: 'Zoner · a beam down the lane, and he vents when he dies', state: 'atk' },
  { key: 'thela', name: 'Thela', role: 'Heavy · poise, and a cart that deletes his ram', state: 'atk' },
  { key: 'mudlark', name: 'Mudlark', role: 'Ambusher · out of the water, drags you back to it', state: 'atk' },
  { key: 'dhobi', name: 'The Dhobi', role: 'Named elite · the longest reach in the game', state: 'atk' },
  { key: 'dabbawala', name: 'Dabbawala', role: 'Runner · ignores you, and the wave pays if he gets out', state: 'walk' },
  { key: 'bull', name: 'Sandh', role: 'Hazard · 18 damage to anything he touches, both sides', state: 'atk' },
  { key: 'pappu', name: 'Ustad Pappu', role: 'Miniboss · the fight is the arena', state: 'punch' },
  { key: 'langda', name: 'Langda', role: 'Mid-boss · will not hold still', state: 'punch' },
  { key: 'dredger', name: 'The Dredger', role: 'Level boss · a machine', state: 'punch' },
  { key: 'thekedar', name: 'The Thekedar', role: 'Phase two · a frightened man with a spanner', state: 'atk' },
];

// Indexed positionally against STAGES[0].waves, boss gates included.
const wavePurpose = [
  'Can you parry and combo. Three goondas and nothing else.',
  'Can you protect a pickup, with two thieves working the floor.',
  'Can you evade red — and bait the arc into his own friends.',
  'USTAD PAPPU. Can you fight with no space and no props.',
  'Can you choose a target under a timer, with the runner crossing.',
  'Can you kill something in the right place. The cooker vents.',
  'Two red arcs at once, and no crowd to bait them into.',
  'All of it, with the bull crossing a full lane.',
  'LANGDA. Can you fight something that will not hold still.',
  'Meet the water. The back of the lane is now a way to die.',
  'Terrain you make yourself, among the chemical drums.',
  'Poise, on a slope, in a slick — and the dhobi among the sheets.',
  'The back lane is hostile, on a floor that moves.',
  'The exam, with the sluice running.',
  'THE DREDGER. Can you fight the arena itself.',
];

const propMeta = [
  ['crate', 'Breakable supply crate · +30'],
  ['table', 'Stall table · +15'],
  ['mithai', 'The level’s only 1-UP · behind a stall, one lane back'],
  ['drum', 'Chemical drum · bursts into a 12s slick, terrain you place yourself'],
  ['bracket', 'Awning bracket · six of them, each shortens Langda’s wire'],
  ['thelacart', 'The heavy’s handcart · break it and the ram is gone for good'],
  ['thelapole', 'The heavy’s boat pole · the same rig, the ghat’s prop'],
  ['dhobislab', 'Washing slab · deletes the dhobi’s charged whip'],
  ['matka', 'Small clay-pot breakable'],
  ['tyres', 'Durable low obstacle'], ['sign', 'Fragile street signage'],
];

const storyAssets = [
  ['assets/story/entrance_v8/contact_sheet.png', 'V8 cinematic contact sheet', 'Nineteen combined cels: six-step drift, near-side dismount, slow Cuban-cigar beat, voice, two-part crack, and guard'],
].concat(Array.from({ length: 19 }, (_, i) => [
  `assets/story/entrance_v8/combined_${String(i + 1).padStart(2, '0')}.png`, `V8 cinematic cel ${i + 1}/19`,
  i < 6 ? 'Combined compression, counter-steer, drift-apex, and recovery rig' : i < 13 ? 'Combined fixed-bike near-side dismount rig' : 'Combined slow cigar, voice-line, shoulder preparation, crack, and guard rig',
]));

const effectAssets = [
  ['assets/fx/bird1.png', 'Pigeon idle', 'Scatters when CHAD or an impact approaches'],
  ['assets/fx/bird2.png', 'Pigeon flight A', 'Reactive background life'],
  ['assets/fx/bird3.png', 'Pigeon flight B', 'Reactive background life'],
  ['assets/fx/powder1.png', 'Chilli powder A', 'Masala projectile'],
  ['assets/fx/powder2.png', 'Chilli powder B', 'Masala projectile'],
  ['assets/fx/powder3.png', 'Chilli powder C', 'Masala projectile'],
  ['assets/fx/pick_lassi.png', 'Health shake', 'Crate / enemy drop'],
  ['assets/fx/pick_chaat.png', 'Food plate', 'Table / enemy drop'],
];

const audioAssets = [
  ['audio/voice/duke_out_of_gum.wav', 'Entrance voice', 'Motorcycle character beat'],
  ['audio/voice/duke_come_get_some.wav', 'First-wave voice', 'Opening challenge'],
  ['audio/sfx/parry.wav', 'Parry clash', 'Successful counter or reflection'],
  ['audio/sfx/punch.wav', 'Punch', 'Light confirmed hit'],
  ['audio/sfx/heavy.wav', 'Heavy impact', 'Power contact'],
  ['audio/sfx/weapon.wav', 'Weapon impact', 'Bat, lathi, wrench'],
  ['audio/sfx/slam.wav', 'Slam', 'Wall, throw, and boss-scale impact'],
  ['audio/sfx/ko.wav', 'KO', 'Enemy defeat'],
  ['audio/sfx/super.wav', 'Super activation', 'Meteor Lariat startup'],
  ['audio/sfx/entrance_engine.wav', 'Entrance engine', 'Road Rash 95 engine loop with stepped acceleration'],
  ['audio/sfx/entrance_skid.wav', 'Controlled brake', 'Road Rash 95 on-road skid'],
  ['audio/sfx/entrance_boot.wav', 'Boot plant', 'Double Dragon II source cue'],
  ['audio/sfx/entrance_stand.wav', 'Side stand', 'Double Dragon II source cue'],
  ['audio/sfx/entrance_birds.wav', 'Pigeon scatter', 'Classic arcade cue'],
  ['audio/sfx/entrance_crack.wav', 'Knuckle crack', 'Two timed double-pop cues with a second heavy impact layer'],
];

const stageView = document.getElementById('stageView');
const sctx = stageView.getContext('2d');
const overview = document.getElementById('overview');
const octx = overview.getContext('2d');
const camera = document.getElementById('camera');
camera.max = String(CAM_MAX);   // from the stage, so the slider cannot outlive the route
const cameraReadout = document.getElementById('cameraReadout');
const playRoute = document.getElementById('playRoute');
const castCanvases = new Map();
const entranceView = document.getElementById('entranceView');
const entranceCtx = entranceView.getContext('2d');
const entranceFrame = document.getElementById('entranceFrame');
const entrancePlay = document.getElementById('entrancePlay');
const entranceReadout = document.getElementById('entranceReadout');
const entranceSpeed = document.getElementById('entranceSpeed');
const entranceOnion = document.getElementById('entranceOnion');
const entranceGuides = document.getElementById('entranceGuides');
const onionCanvas = document.createElement('canvas');
onionCanvas.width = entranceView.width;
onionCanvas.height = entranceView.height;
const onionCtx = onionCanvas.getContext('2d');

const state = {
  camX: 0,
  playing: false,
  selectedWave: 0,
  dragging: false,
  dragX: 0,
  dragCam: 0,
  t: 0,
};

const entranceState = {
  frame: 0, playing: false, ready: false, dirty: true, audioStarted: false,
  lastClock: 0, frameCarry: 0, speed: 1,
};

function card(parent, src, title, description) {
  const el = document.createElement('article');
  el.className = 'asset-card';
  el.innerHTML = `<div class="preview"><img loading="lazy" src="${src}" alt="${title}"></div>` +
    `<div class="meta"><h3>${title}</h3><p>${description}</p><code>${src}</code></div>`;
  parent.appendChild(el);
  return el;
}

// Draws a prop through the game's own art()/drawProp path, so the card shows exactly
// what the level shows - authored PNG where one exists, code fallback where it does not.
function propCard(parent, kind, broken, title, description) {
  const png = `assets/props/${kind}${broken ? '_b' : ''}.png`;
  const authored = !!ASSETS[`prop_${kind}${broken ? '_b' : ''}`];
  const el = document.createElement('article');
  el.className = 'asset-card';
  el.innerHTML = '<div class="preview"></div>'
    + `<div class="meta"><h3>${title}</h3><p>${description}</p>`
    + `<code>${authored ? png : 'code fallback · js/props.js'}</code></div>`;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  c.style.cssText = 'width:128px;height:128px;image-rendering:pixelated';
  const cx = c.getContext('2d');
  cx.imageSmoothingEnabled = false;
  const pr = createProp(kind, 0, 0);
  if (broken) { pr.broken = true; pr.dead = true; }
  cx.save();
  cx.translate(64, 96);
  cx.scale(2, 2);
  drawProp(cx, pr, 0);
  cx.restore();
  el.querySelector('.preview').appendChild(c);
  parent.appendChild(el);
}

function buildInventory() {
  const propCards = document.getElementById('propCards');
  for (const [kind, description] of propMeta) {
    // A prop with no PNG yet draws its code fallback in the game, so the reviewer
    // has to show that rather than a broken image - otherwise the page says "missing"
    // about something the player will see perfectly well.
    propCard(propCards, kind, false, kind, description);
    propCard(propCards, kind, true, `${kind} · broken`, 'Destroyed state');
  }
  const storyCards = document.getElementById('storyCards');
  for (const a of storyAssets) card(storyCards, ...a);
  const effectCards = document.getElementById('effectCards');
  for (const a of effectAssets) card(effectCards, ...a);

  const audioCards = document.getElementById('audioCards');
  for (const [src, title, description] of audioAssets) {
    const el = document.createElement('article');
    el.className = 'audio-card';
    el.innerHTML = `<h3>${title}</h3><p class="muted">${description}</p><audio controls preload="none" src="${src}"></audio><code>${src}</code>`;
    audioCards.appendChild(el);
  }
}

function buildWaves() {
  const rows = document.getElementById('waveRows');
  STAGE.waves.forEach((wave, i) => {
    const tr = document.createElement('tr');
    const composition = wave.boss ? 'RICKSHAW RAJA' : wave.spawns.map(nameFor).join(' · ');
    tr.innerHTML = `<td>${wave.boss ? 'BOSS' : `WAVE ${i + 1}`}</td><td>${wave.x}</td><td>${composition}</td><td>${wavePurpose[i]}</td>`;
    tr.onclick = () => jumpToWave(i);
    rows.appendChild(tr);
  });
}

function nameFor(key) {
  const found = cast.find((c) => c.key === key);
  return found ? found.name.toUpperCase() : key.toUpperCase();
}

function buildCastCards() {
  const parent = document.getElementById('castCards');
  cast.forEach((data) => {
    const el = document.createElement('article');
    el.className = 'asset-card';
    el.innerHTML = '<div class="preview"></div>' +
      `<div class="meta"><h3>${data.name}</h3><p>${data.role}<br>Idle + combat pose</p>` +
      `<code>assets/frames/manifest.json · ${data.key}</code></div>`;
    const cv = document.createElement('canvas');
    cv.width = 356; cv.height = 340;
    el.querySelector('.preview').appendChild(cv);
    parent.appendChild(el);
    castCanvases.set(data.key, { canvas: cv, data });
  });
}

function drawCastCards() {
  for (const { canvas: cv, data } of castCanvases.values()) {
    const x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, cv.width, cv.height);
    x.imageSmoothingEnabled = false;
    x.setTransform(RS, 0, 0, RS, 0, 0);
    x.fillStyle = 'rgba(0,0,0,.28)';
    x.beginPath(); x.ellipse(48, 157, 22, 5, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(130, 157, 22, 5, 0, 0, Math.PI * 2); x.fill();
    const set = SPR[data.key];
    const idle = getFrame(set, 'idle', (state.t / 18) | 0, 1);
    const atk = getFrame(set, data.state, (state.t / 10) | 0, 1);
    blit(x, idle, 48 - frameW(idle) / 2, 158 - frameH(idle));
    blit(x, atk, 130 - frameW(atk) / 2, 158 - frameH(atk));
  }
}

function setCamera(value) {
  state.camX = clamp(Number(value) || 0, 0, CAM_MAX);
  camera.value = state.camX;
  const center = Math.round(state.camX + W / 2);
  cameraReadout.textContent = `camera ${Math.round(state.camX)} · world ${center} / ${STAGE.width}`;
}

function jumpToWave(index) {
  state.selectedWave = clamp(index, 0, STAGE.waves.length - 1);
  const wave = STAGE.waves[state.selectedWave];
  setCamera(wave.x - W / 2);
  state.playing = false;
  playRoute.textContent = 'PLAY ROUTE';
}

function adjacentWave(direction) {
  const center = state.camX + W / 2;
  const points = STAGE.waves.map((w) => w.x);
  if (direction > 0) {
    const n = points.findIndex((x) => x > center + 16);
    jumpToWave(n < 0 ? points.length - 1 : n);
  } else {
    let n = 0;
    for (let i = points.length - 1; i >= 0; i--) if (points[i] < center - 16) { n = i; break; }
    jumpToWave(n);
  }
}

function drawStageViewport() {
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, stageView.width, stageView.height);
  sctx.imageSmoothingEnabled = false;
  sctx.setTransform(RS, 0, 0, RS, 0, 0);
  G.stage = STAGE;
  G.rawTime = state.t;
  G.time = state.t;

  if (!document.getElementById('showAmbience').checked) {
    const keep = STAGE.ambient;
    STAGE.ambient = () => {};
    drawStage(sctx, state.camX);
    STAGE.ambient = keep;
  } else drawStage(sctx, state.camX);

  if (document.getElementById('showProps').checked) {
    for (const prop of G.props) drawProp(sctx, prop, state.camX);
  }
  if (document.getElementById('showCast').checked) drawEncounterSilhouettes();
  if (document.getElementById('showMarkers').checked) drawWaveMarkers();
  if (document.getElementById('showGrid').checked) drawDepthGrid();
  drawEffects(sctx, state.camX);
}

function entranceBeat(frame) {
  if (frame < 24) return 'empty street · engine approaching';
  if (frame < 72) return 'low motorcycle approach';
  if (frame < 92) return 'front brake bites · fork compression';
  if (frame < 116) return 'rear tire breaks loose';
  if (frame < 140) return 'counter-steer deepens';
  if (frame < 164) return 'aggressive powerslide apex';
  if (frame < 190) return 'drift recovery';
  if (frame < 214) return 'motorcycle settles straight';
  if (frame < 240) return 'hard boot plant';
  if (frame < 268) return 'rise from saddle';
  if (frame < 296) return 'near-side leg swing';
  if (frame < 324) return 'leg arc apex';
  if (frame < 346) return 'both boots land';
  if (frame < 372) return 'straighten beside bike';
  if (frame < 438) return 'slow Cuban-cigar inhale';
  if (frame < 474) return 'slow smoke exhale';
  if (frame < 734) return 'voice-line stare';
  if (frame < 760) return 'shoulders and neck roll';
  if (frame < 804) return 'double knuckle crack';
  if (frame < 837) return 'fighting-ready guard';
  return 'bars retract + control handoff';
}

function setEntranceFrame(value) {
  entranceState.frame = clamp(Math.round(Number(value) || 0), 0, ENTRANCE_LAST_FRAME);
  entranceFrame.value = String(entranceState.frame);
  entranceState.dirty = true;
  entranceReadout.textContent = `frame ${String(entranceState.frame).padStart(3, '0')} / ${ENTRANCE_LAST_FRAME} · ${entranceBeat(entranceState.frame)}`;
}

function renderEntranceAt(target, frame, options = {}) {
  target.setTransform(1, 0, 0, 1, 0, 0);
  target.clearRect(0, 0, entranceView.width, entranceView.height);
  target.imageSmoothingEnabled = false;
  target.setTransform(RS, 0, 0, RS, 0, 0);
  const keepRawTime = G.rawTime;
  const keepTime = G.time;
  const keepStateT = G.stateT;
  const keepStage = G.stage;
  G.stage = STAGE;
  G.rawTime = frame;
  G.time = frame;
  G.stateT = 0;
  drawMotorcycleArrival(target, options);
  G.rawTime = keepRawTime;
  G.time = keepTime;
  G.stateT = keepStateT;
  G.stage = keepStage;
}

function drawEntranceFrame() {
  if (!entranceState.ready || !entranceState.dirty) return;
  entranceState.dirty = false;
  renderEntranceAt(entranceCtx, entranceState.frame, { guides: entranceGuides.checked });
  if (entranceOnion.checked && entranceState.frame > 0) {
    renderEntranceAt(onionCtx, entranceState.frame - 1, { subjectOnly: true });
    entranceCtx.setTransform(1, 0, 0, 1, 0, 0);
    entranceCtx.globalAlpha = .28;
    entranceCtx.drawImage(onionCanvas, 0, 0);
    entranceCtx.globalAlpha = 1;
  }
}

function stopEntrancePlayer() {
  entranceState.playing = false;
  entranceState.audioStarted = false;
  entranceState.frameCarry = 0;
  entrancePlay.textContent = 'PLAY';
  resetStory();
}

function wireEntranceControls() {
  entranceFrame.oninput = () => {
    stopEntrancePlayer();
    setEntranceFrame(entranceFrame.value);
  };
  document.getElementById('entrancePrev').onclick = () => {
    stopEntrancePlayer();
    setEntranceFrame(entranceState.frame - 1);
  };
  document.getElementById('entranceNext').onclick = () => {
    stopEntrancePlayer();
    setEntranceFrame(entranceState.frame + 1);
  };
  entranceSpeed.onchange = () => {
    stopEntrancePlayer();
    entranceState.speed = Number(entranceSpeed.value) || 1;
    entranceState.dirty = true;
  };
  entranceOnion.onchange = () => { entranceState.dirty = true; };
  entranceGuides.onchange = () => { entranceState.dirty = true; };
  document.querySelectorAll('[data-entrance-frame]').forEach((button) => {
    button.onclick = () => { stopEntrancePlayer(); setEntranceFrame(button.dataset.entranceFrame); };
  });
  entrancePlay.onclick = () => {
    if (entranceState.playing) { stopEntrancePlayer(); return; }
    if (entranceState.frame >= ENTRANCE_LAST_FRAME) setEntranceFrame(0);
    if (!entranceState.playing && !entranceState.audioStarted) {
      audio.unlock();
      resetStory();
      if (entranceState.frame > 0) setEntranceFrame(0);
      entranceState.audioStarted = entranceState.speed === 1;
    }
    entranceState.playing = true;
    entranceState.lastClock = performance.now();
    entranceState.frameCarry = 0;
    entrancePlay.textContent = 'PAUSE';
  };
}

function drawWaveMarkers() {
  sctx.font = '6px ui-monospace, monospace';
  STAGE.waves.forEach((wave, i) => {
    const x = Math.round(wave.x - state.camX);
    if (x < -10 || x > W + 10) return;
    sctx.strokeStyle = wave.boss ? 'rgba(219,63,71,.9)' : 'rgba(255,212,92,.72)';
    sctx.setLineDash([3, 3]);
    sctx.beginPath(); sctx.moveTo(x + .5, 20); sctx.lineTo(x + .5, H - 8); sctx.stroke();
    sctx.setLineDash([]);
    sctx.fillStyle = '#100d13'; sctx.fillRect(x - 21, 22, 42, 11);
    sctx.fillStyle = wave.boss ? '#ff6870' : '#ffd45c';
    const txt = wave.boss ? 'BOSS' : `WAVE ${i + 1}`;
    sctx.fillText(txt, x - txt.length * 1.8, 30);
  });
}

function drawDepthGrid() {
  sctx.lineWidth = .5;
  sctx.strokeStyle = 'rgba(100,210,232,.35)';
  for (let x = 0; x <= W; x += 32) { sctx.beginPath(); sctx.moveTo(x, FLOOR_TOP); sctx.lineTo(x, FLOOR_BOT); sctx.stroke(); }
  for (let y = FLOOR_TOP; y <= FLOOR_BOT; y += 16) { sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(W, y); sctx.stroke(); }
  sctx.strokeStyle = 'rgba(255,104,112,.6)';
  for (const y of [FLOOR_TOP, FLOOR_BOT]) { sctx.beginPath(); sctx.moveTo(0, y); sctx.lineTo(W, y); sctx.stroke(); }
}

function encounterForCamera() {
  const center = state.camX + W / 2;
  let best = 0, dist = Infinity;
  STAGE.waves.forEach((wave, i) => {
    const d = Math.abs(wave.x - center);
    if (d < dist) { dist = d; best = i; }
  });
  state.selectedWave = best;
  return STAGE.waves[best];
}

function drawEncounterSilhouettes() {
  const wave = encounterForCamera();
  // Derived, so a boss gate keeps showing the right body when the act's boss changes.
  const keys = wave.boss ? [STAGE.boss]
    : wave.miniboss ? [wave.miniboss, ...wave.spawns]
      : wave.spawns;
  const gap = Math.min(70, 360 / Math.max(1, keys.length - 1));
  keys.forEach((key, i) => {
    const set = SPR[key];
    if (!set) return;
    const f = getFrame(set, 'idle', (state.t / 18 + i) | 0, i & 1 ? -1 : 1);
    const x = W / 2 + (i - (keys.length - 1) / 2) * gap;
    const y = FLOOR_TOP + 18 + (i % 3) * ((FLOOR_BOT - FLOOR_TOP - 22) / 2);
    sctx.fillStyle = 'rgba(0,0,0,.32)';
    sctx.beginPath(); sctx.ellipse(x, y + 2, 15, 4, 0, 0, Math.PI * 2); sctx.fill();
    blit(sctx, f, Math.round(x - frameW(f) / 2), Math.round(y - frameH(f) + 4));
    sctx.fillStyle = 'rgba(10,8,12,.82)'; sctx.fillRect(x - 24, y + 7, 48, 9);
    sctx.fillStyle = '#f0e8dc'; sctx.font = '5px ui-monospace, monospace';
    const n = nameFor(key);
    sctx.fillText(n, x - Math.min(22, n.length * 1.5), y + 13);
  });
}

function drawOverview() {
  const w = overview.width, h = overview.height;
  octx.setTransform(1, 0, 0, 1, 0, 0);
  octx.clearRect(0, 0, w, h);
  const wall = ASSETS[STAGE.wallKey];
  const floor = ASSETS[STAGE.floorKey];
  if (wall) {
    const tileW = Math.max(1, Math.round(wall.width / RS / STAGE.width * w));
    for (let x = 0; x < w; x += tileW) octx.drawImage(wall, x, 0, tileW, 49);
  } else { octx.fillStyle = '#6f4935'; octx.fillRect(0, 0, w, 49); }
  if (floor) octx.drawImage(floor, 0, 49, w, 25);
  else { octx.fillStyle = '#776a5c'; octx.fillRect(0, 49, w, 25); }

  for (const prop of STAGE.props) {
    const x = prop.x / STAGE.width * w;
    octx.fillStyle = '#7ee0bb'; octx.fillRect(x, 58, 2, 9);
  }
  STAGE.waves.forEach((wave, i) => {
    const x = wave.x / STAGE.width * w;
    octx.fillStyle = wave.boss ? '#ff5964' : '#ffd45c';
    octx.beginPath(); octx.arc(x, 51, wave.boss ? 6 : 4, 0, Math.PI * 2); octx.fill();
    octx.fillStyle = '#100d13'; octx.font = '10px ui-monospace, monospace';
    octx.fillText(wave.boss ? 'B' : String(i + 1), x - 3, 35);
  });
  const vx = state.camX / STAGE.width * w;
  const vw = W / STAGE.width * w;
  octx.strokeStyle = '#fff'; octx.lineWidth = 2; octx.strokeRect(vx + 1, 1, Math.max(2, vw - 2), h - 2);
  octx.fillStyle = 'rgba(255,255,255,.08)'; octx.fillRect(vx, 0, vw, h);
}

function wireControls() {
  camera.oninput = () => { setCamera(camera.value); state.playing = false; playRoute.textContent = 'PLAY ROUTE'; };
  playRoute.onclick = () => {
    state.playing = !state.playing;
    playRoute.textContent = state.playing ? 'PAUSE ROUTE' : 'PLAY ROUTE';
  };
  document.getElementById('prevWave').onclick = () => adjacentWave(-1);
  document.getElementById('nextWave').onclick = () => adjacentWave(1);
  document.getElementById('impactStage').onclick = () => reactStage(state.camX + W / 2, 1.5);
  stageView.addEventListener('pointerdown', (e) => {
    state.dragging = true; state.dragX = e.clientX; state.dragCam = state.camX;
    stageView.setPointerCapture(e.pointerId);
  });
  stageView.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const logical = (e.clientX - state.dragX) * W / stageView.getBoundingClientRect().width;
    setCamera(state.dragCam - logical);
  });
  stageView.addEventListener('pointerup', () => { state.dragging = false; });
  stageView.addEventListener('wheel', (e) => {
    e.preventDefault(); setCamera(state.camX + (e.deltaX || e.deltaY) * .7);
  }, { passive: false });
  overview.onclick = (e) => {
    const r = overview.getBoundingClientRect();
    const world = (e.clientX - r.left) / r.width * STAGE.width;
    setCamera(world - W / 2);
  };
}

function frame(now = performance.now()) {
  state.t++;
  if (state.playing) {
    const next = state.camX + 1.35;
    setCamera(next >= CAM_MAX ? 0 : next);
  }
  G.rawTime = state.t; G.time = state.t;
  G.player.x = state.camX + W / 2;
  G.player.y = (FLOOR_TOP + FLOOR_BOT) / 2;
  updateAmbience();
  updateMotes();
  updateEffects();
  drawStageViewport();
  drawOverview();
  if (entranceState.playing) {
    const elapsed = Math.min(50, Math.max(0, now - entranceState.lastClock));
    entranceState.lastClock = now;
    entranceState.frameCarry += elapsed * 60 * entranceState.speed / 1000;
    while (entranceState.frameCarry >= 1 && entranceState.playing) {
      entranceState.frameCarry -= 1;
      if (entranceState.frame >= ENTRANCE_LAST_FRAME) {
        stopEntrancePlayer();
      } else {
        setEntranceFrame(entranceState.frame + 1);
        if (entranceState.speed === 1) updateMotorcycleArrival(entranceState.frame);
      }
    }
  }
  drawEntranceFrame();
  if (!(state.t % 8)) drawCastCards();
  requestAnimationFrame(frame);
}

G.effects = [];
G.motes = [];
G.pickups = [];
G.shots = [];
G.zones = [];
G.enemies = [];
G.player = { x: W / 2, y: (FLOOR_TOP + FLOOR_BOT) / 2 };

buildInventory();
buildWaves();
buildCastCards();
wireControls();
wireEntranceControls();
setCamera(0);
setEntranceFrame(0);

Promise.all([loadAssets(), loadAIFrames(), loadAmbience(), loadStory(), loadFX(), loadSFX()]).then(() => {
  initStage(0);
  G.player = { x: W / 2, y: (FLOOR_TOP + FLOOR_BOT) / 2 };
  entranceState.ready = true;
  entranceState.dirty = true;
  document.getElementById('loadState').textContent = 'Production assets loaded';
  drawCastCards();
  frame();
}).catch((err) => {
  document.getElementById('loadState').textContent = `Load error: ${err}`;
  console.error(err);
});
