import { INDIA_STAGES } from './india_stages.js';
import { drawIndiaStage } from './india_stage.js';
// Campaign definitions and shared stage lifecycle. Authored chapter scenery is
// rendered by india_stage.js; the train and penthouse keep their own renderers.
import { G, W, H, clamp, rand, irand } from './engine.js';
import { artScale } from './sprites.js';
import { ASSETS } from './assets.js';
import { drawTrainScene, initTrain } from './train.js';
import { createProp } from './props.js';
import { initAmbience, drawAmbienceFacade, drawBirds } from './ambience.js';
import { initCrowd, drawCrowd } from './crowd.js';

const FLOOR_Y = 181; // where the facades meet the street, all stages

// Shared optional dusk grading, retained for the existing stage lifecycle.
const DUSK_FROM = 4400, DUSK_TO = 9000;
export function dusk(camX) { return clamp((camX - DUSK_FROM) / (DUSK_TO - DUSK_FROM), 0, 1); }

// ------------------------------------------------------------- definitions
export const STAGES = [
  {
    id:'train',num:'1-1',name:'THE NIGHT TRAIN',sub:'ACT I - NIGHT SERVICE TO DELHI',arrival:'station',departureRoute:'india',loadingArt:'loading_train',
    width:9120,floorW:9120,music:'stage2a',musicB:'stage2b',musicBX:2880,bossMusic:'boss',bossMusicFinal:'boss2',boss:'vikram',introVoice:true,
    init:initTrain,areas:[],skyLayers:[],lanes:[{x0:0,x1:2880,top:211,bot:241},{x0:2880,x1:3840,top:205,bot:241},{x0:3840,x1:5280,top:209,bot:241,berth:115},{x0:5280,x1:5760,top:194,bot:241},{x0:5760,x1:6240,top:202,bot:241},{x0:6240,x1:8160,top:202,bot:241},{x0:8160,x1:9120,top:181,bot:220}],
    lamps:[],lampCol:'255,200,120',lampA:0,rim:null,moteCount:0,moteStyle:'dust',gradeA:0,glows:[],birds:[],fg:[],ambience:[],emitters:[],events:[],
    props:[{kind:'nr_case',x:570,y:227},{kind:'nr_trolley',x:1270,y:222},{kind:'nr_case',x:2140,y:230},{kind:'nr_table',x:3110,y:215},{kind:'nr_case',x:3720,y:227},{kind:'nr_table',x:4560,y:212},{kind:'nr_urn',x:5490,y:203},{kind:'nr_contraband',x:6080,y:225},{kind:'nr_case',x:6760,y:226},{kind:'nr_table',x:7500,y:221},{kind:'nr_case',x:8030,y:208}],
    waves:[
      {x:550,spawns:['nr_tough','nr_tough','nr_tough','nr_tough','nr_tough']},
      {x:850,spawns:['nr_tough','nr_runner','nr_tough','nr_bruiser','nr_tough','nr_runner']},
      {x:1550,spawns:['nr_bruiser','nr_bruiser','nr_tough','nr_runner','nr_runner','nr_tough','nr_bruiser'],elite:true},
      {x:2380,spawns:['nr_runner','nr_tough','nr_heavy','nr_tough','nr_bruiser','nr_tough','nr_runner','nr_tough']},
      {x:3290,spawns:['nr_tough','nr_tough','nr_runner','nr_heavy','nr_tough','nr_runner','nr_tough','nr_tough']},
      {x:4170,spawns:['nr_ambusher','nr_tough','nr_runner','nr_ambusher','nr_runner','nr_ambusher','nr_tough']},
      {x:4890,spawns:['nr_heavy','nr_ambusher','nr_bruiser','nr_tough','nr_runner','nr_runner','nr_tough']},
      {x:5805,spawns:['nr_guard','nr_guard'],camX:5760},
      {x:5880,spawns:[],elite:true,miniboss:'conductor',intro:true,camX:5760},
      {x:6520,spawns:['nr_guard','nr_guard','nr_runner','nr_tough','nr_guard','nr_runner','nr_tough']},
      {x:6910,spawns:['nr_guard','nr_bruiser','nr_guard','nr_runner','nr_guard','nr_runner']},
      {x:7370,spawns:['nr_guard','nr_guard','nr_heavy','nr_guard','nr_guard','nr_runner','nr_guard']},
      {x:7760,spawns:['nr_guard','nr_guard','nr_bruiser','nr_guard','nr_guard','nr_bruiser','nr_guard']},
      {x:7950,spawns:[],boss:true,camX:7680},
    ],
    build:()=>({}),ambient:()=>{},
  },
  ...INDIA_STAGES,
];

const layerCache = {};

export function stageDef(i) { return STAGES[clamp(i, 0, STAGES.length - 1)]; }

export function initStage(index) {
  initStageObj(stageDef(index === undefined ? G.stageIndex : index));
}

// Same setup from a stage-shaped object rather than an index, so the dojo hub in
// js/hub.js can reuse all of it without living in STAGES (which is the act list).
export function initStageObj(st) {
  G.stage = st;
  if (!layerCache[st.id]) layerCache[st.id] = st.build();
  G.camX = 0;
  G.camMax = st.width - W;
  G.camLock = 0;
  G.locked = false;
  // a retry or a stage change must never inherit a squeezed arena
  G.arenaSqueeze = 0;
  G.arenaSqueezeTarget = 0;
  G.train = null;
  G.india = null;
  G.runnerEscaped = false;
  G.introResume = null;
  G.shutterT = 0;
  for (const ev of (st.events || [])) ev.done = false;
  G.waveIndex = -1;
  G.waveActive = false;
  G.spawnQueue = [];
  G.spawnCd = 0;
  G.goTimer = 0;
  G.motes = [];
  for (let i = 0; i < st.moteCount; i++) {
    const up = st.moteStyle === 'steam';
    G.motes.push({
      x: rand(0, st.width), y: rand(20, H - 20),
      vx: rand(-0.15, 0.15), vy: up ? rand(-0.5, -0.2) : rand(-0.06, 0.06),
      tw: irand(0, 60),
    });
  }
  G.props = (st.props || []).map((d) => createProp(d.kind, d.x, d.y, d.z));
  // lair leftovers that must not survive into a fight: its tiger, and CHAD sat down
  G.actors = [];
  G.hubSeat = 0;
  initAmbience(st);
  initCrowd(st.crowd);
  G.zones = [];
  for (const w of st.waves) { w.done = false; if (w.spawns0) w.spawns = [...w.spawns0]; else w.spawns0 = [...w.spawns]; }
  if (st.init) st.init(st);
}

export function drawStage(ctx, camX) {
  const st = G.stage || STAGES[0];
  if(st.id==='train'){drawTrainScene(ctx,camX);return;}
  if(st.chapter){drawIndiaStage(ctx,camX);return;}
  const layers = layerCache[st.id] || (layerCache[st.id] = st.build());
  const wall = ASSETS[st.wallKey];
  const floorImg = ASSETS[st.floorKey];

  // Optional layers behind the wall, for a wall with holes in it: the lair's glass is
  // keyed out, so the city sits back here and parallaxes through the window. Each entry
  // is either a tiling plate at its own parallax, or a draw hook - the lair's sun goes
  // between its two city layers so the near towers occlude it.
  for (const layer of (st.skyLayers || [])) {
    if (layer.draw) { layer.draw(ctx, camX); continue; }
    const img = ASSETS[layer.key];
    if (!img) continue;
    const sw = img.width / artScale(img), sh = img.height / artScale(img);
    const off = ((Math.round(camX * layer.par) % sw) + sw) % sw;
    for (let x = -off; x < W; x += sw) ctx.drawImage(img, x, 0, sw, sh);
  }

  if (wall) {
    const ww = wall.width / artScale(wall), wh = wall.height / artScale(wall);
    const off = ((Math.round(camX) % ww) + ww) % ww;
    for (let x = -off; x < W; x += ww) ctx.drawImage(wall, x, 0, ww, wh);
  } else {
    let fx = Math.round(camX * 0.2) % 900;
    ctx.drawImage(layers.far, -fx, 0);
    if (900 - fx < W) ctx.drawImage(layers.far, 900 - fx, 0);
    let mx = Math.round(camX * 0.55) % 1400;
    ctx.drawImage(layers.mid, -mx, 0);
    if (1400 - mx < W) ctx.drawImage(layers.mid, 1400 - mx, 0);
  }

  drawAmbienceFacade(ctx, camX);
  // people in the shopfronts take the same light as the facade behind them
  drawCrowd(ctx, camX, 'facade');

  // light pools anchored to world positions
  for (const lx of st.lamps) {
    const sx = lx - camX;
    if (sx < -140 || sx > W + 140) continue;
    const grad = ctx.createRadialGradient(sx, 22, 5, sx, 22, 130);
    grad.addColorStop(0, `rgba(${st.lampCol},${st.lampA})`);
    grad.addColorStop(1, `rgba(${st.lampCol},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(sx - 130, 0, 260, FLOOR_Y);
  }

  if (floorImg) {
    const fw = st.floorW;
    const off = ((Math.round(camX) % fw) + fw) % fw;
    const fs = artScale(floorImg);
    for (let x = -off; x < W; x += fw) ctx.drawImage(floorImg, x, FLOOR_Y, floorImg.width / fs, floorImg.height / fs);
  } else {
    const off = ((Math.round(camX) % 160) + 160) % 160;
    for (let x = -off; x < W; x += 160) ctx.drawImage(layers.floor, x, FLOOR_Y);
  }

  // anyone on the road stays on the back lane, so drawing them under the fighters holds
  drawCrowd(ctx, camX, 'street');
  drawBirds(ctx, camX);
  st.ambient(ctx, camX, layers);
}

export function updateMotes() {
  const st = G.stage || STAGES[0];
  // The light is simulation, not draw. drawStage reads st.lampA before it ever calls
  // ambient(), so setting it in there would light the room with the previous frame's
  // camera - and the review page and the lab call drawStage more than once a frame.
  if (st.areas) st.lampA = 0.02 + dusk(G.camX) * 0.10;
  const steam = st.moteStyle === 'steam';
  for (const m of G.motes) {
    m.x += m.vx; m.y += m.vy;
    if (steam) {
      if (m.y < 96) { m.y = H - 10; m.x = rand(0, W); }
    } else {
      if (m.y < 10) m.y = H - 20;
      if (m.y > H - 10) m.y = 20;
      if (m.x < 0) m.x = st.width;
      if (m.x > st.width) m.x = 0;
    }
  }
}
