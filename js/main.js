// main.js - boot, fixed-timestep loop, game state machine, rendering, debug hook
import { G, W, H, RS, STEP, DIFF, METER_MAX, FLOOR_TOP, FLOOR_BOT, clamp, addScore } from './engine.js';
import { initInput, input, endFrameInput, pollGamepad, debugPress, debugRelease } from './input.js';
import { SPR, drawTextShadow, textWidth, blit, frameW, frameH } from './sprites.js';
import { initStage, initStageObj, drawStage, updateMotes, STAGES, stageDef } from './stages.js';
import { HUB_STAGE, CHAPTERS, FIXTURES, RELIC_SLOTS, BED_X, hubBed, hubSay, hubTiger, petsWatch, hubTank, createBag, resetHub, updateHub, drawHubWall, drawHubUI } from './hub.js';
import { createProp } from './props.js';
import { loadAmbience, updateAmbience, reactStage } from './ambience.js';
import { loadFX, fx } from './fx.js';
import { loadFG, drawFG } from './fg.js';
import { createPlayer, updatePlayer, drawPlayer, hurtPlayer } from './player.js';
import { spawnEnemy, updateEnemies, drawEnemy, aliveEnemies } from './enemies.js';
import { createBoss, updateBoss, drawBoss, BOSSES } from './bosses.js';
import { updateShots, drawShots, drawZones, spawnShot, spawnZone } from './shots.js';
import { updateProps, drawProp } from './props.js';
import { updateEffects, drawEffects, drawRagnarokGround, spawnPop, spawnSteam } from './effects.js';
import { drawHUD, drawPause } from './hud.js';
import { drawTitle, drawIntro, drawBossIntro, drawClear, drawOver, drawEnding } from './screens.js';
import { audio, loadManifest, loadSFX } from './audio.js';
import { loadAssets } from './assets.js';
import { loadAIFrames } from './aiframes.js';
import { ENTRANCE_LAST_FRAME, loadStory, resetStory, updateMotorcycleArrival, drawMotorcycleArrival } from './story.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function resize() {
  // Fill the window keeping 16:9. The buffer is already 2x supersampled so a
  // fractional scale still reads crisp, and it beats thick letterbox bars.
  const s = Math.min(window.innerWidth / (W * RS), window.innerHeight / (H * RS));
  canvas.style.width = Math.round(W * RS * s) + 'px';
  canvas.style.height = Math.round(H * RS * s) + 'px';
}
window.addEventListener('resize', resize);
resize();

initInput();
G.audio = audio;
loadManifest();
window.addEventListener('keydown', () => audio.unlock(), { once: false });

// ---- persistence ----
const SAVE_KEY = 'gigachadworldtour.save';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (typeof s.hiscore === 'number') G.hiscore = s.hiscore;
    if (typeof s.unlockedStage === 'number') G.unlockedStage = clamp(s.unlockedStage, 0, STAGES.length - 1);
    if (typeof s.bestComboAll === 'number') G.bestComboAll = s.bestComboAll;
    if (s.actBest && typeof s.actBest === 'object') G.actBest = s.actBest;
    G.selectedStage = G.unlockedStage;
  } catch (e) { /* first run */ }
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      hiscore: G.hiscore, unlockedStage: G.unlockedStage,
      bestComboAll: G.bestComboAll, actBest: G.actBest,
    }));
  } catch (e) { /* private mode */ }
}

// ---- state transitions ----
function setState(s) { G.state = s; G.stateT = G.rawTime; }

function resetRun() {
  G.score = 0;
  G.lives = DIFF.lives;
  G.stageIndex = G.selectedStage || 0;
  G.meter = 0;
  G.stats = { hits: 0, kos: 0 };
  G.bestCombo = 0;
}

function startStage(index) {
  const carriedMeter = G.meter || 0;
  G.stageIndex = index;
  initStage(index);
  const st = stageDef(index);
  const keepHp = G.player ? Math.max(G.player.hp, 60) : 100;
  G.player = createPlayer();
  if (index > 0) G.player.hp = Math.min(G.player.maxhp, keepHp + 35);
  G.enemies = [];
  G.pickups = [];
  G.effects = [];
  G.shots = [];
  G.zones = [];
  G.boss = null;
  G.meter = index > 0 ? carriedMeter : 0;
  G.combo = 0;
  G.paused = false;
  G.fade = 1;
  resetStory();
  setState('intro');
  audio.music(st.music);
}

function startGame(index = G.selectedStage || 0) {
  resetRun();
  startStage(index);
}

// The lair: a stage with no waves, so everything below is the ordinary stage setup
// plus the heavy bag. `fresh` starts a new run; clearing an act comes back here with
// the score and lives it was carrying.
// Meter the run was carrying when it walked into the lair. Punching the bag builds
// meter so you can try the super in there, but you leave with what you arrived with.
let hubMeter = 0;
let hubGate = false;   // panel-dismiss keys are held; hold the player until released

function enterHub(fresh) {
  if (fresh) resetRun();
  hubMeter = fresh ? 0 : G.meter;
  hubGate = false;
  initStageObj(HUB_STAGE);
  G.player = createPlayer();
  G.player.x = 640;   // in front of the world map, so the way out is the first thing you see
  G.player.y = 218;
  G.enemies = [];
  G.pickups = [];
  G.effects = [];
  G.shots = [];
  G.zones = [];
  G.boss = null;
  G.combo = 0;
  G.comboT = 0;
  G.props = [createBag()];
  G.hubAct = 0;
  G.shakePoster = 0;
  resetHub();
  // walking back in after clearing an act, you come home with something off that boss
  const boss = fresh ? null : STAGES[G.stageIndex] && STAGES[G.stageIndex].boss;
  G.hubRelicKey = boss || null;
  G.hubRelicT = boss ? 150 : 0;
  G.paused = false;
  G.fade = 1;
  G.camX = clamp(G.player.x - W / 2, 0, G.camMax);
  setState('hub');
  audio.music(HUB_STAGE.music);
}

function spawnFromQueue() {
  if (!G.spawnQueue || !G.spawnQueue.length) return;
  if (aliveEnemies() >= 6) return;
  if (G.spawnCd > 0) return;
  const type = G.spawnQueue.shift();
  const fromLeft = (G.spawnSide = !G.spawnSide);
  // just inside the arena edge: they run in rather than trudging on from off-screen
  const x = fromLeft ? G.camX + 18 : G.camX + W - 18;
  const y = FLOOR_TOP + Math.random() * (FLOOR_BOT - FLOOR_TOP);
  spawnEnemy(type, x, y);
  G.spawnCd = 36;
}

function updateWaves() {
  const p = G.player;
  const waves = G.stage.waves;
  if (G.spawnCd > 0) G.spawnCd--;
  if (!G.waveActive) {
    const next = waves[G.waveIndex + 1];
    if (next && p.x >= next.x) {
      G.waveIndex++;
      if (next.boss) {
        G.locked = true;
        G.camLock = clamp(next.x - 60, 0, G.camMax);
        const boss = createBoss(G.stage.boss, G.camLock + W - 40, 211);
        if (boss.def.cart) {
          boss.cart = createProp('cart', boss.x - 34, boss.y + 7);
          boss.cart.onBreak = () => { boss.cartGone = true; };
          G.props.push(boss.cart);
        }
        setState('bossintro');
        G.fade = 0.85;
        G.shake = 6;
        audio.music(null);
        if (G.stage.boss === 'refund') audio.voice('duke_back_to_work', 1800);
      } else {
        next.done = true;
        G.waveActive = true;
        G.locked = true;
        G.camLock = G.camX;
        G.spawnQueue = [...next.spawns];
        G.spawnCd = 0;
        if (next.miniboss) {
          const b = createBoss(next.miniboss, G.camX + W - 40, 211);
          if (next.miniboss === 'mirchi') {
            // his cart is a real breakable prop - smash it and he loses the charge
            // slightly nearer the camera than he is, so he reads as standing behind it
            b.cart = createProp('cart', b.x - 34, b.y + 7);
            b.cart.onBreak = () => { b.cartGone = true; };
            G.props.push(b.cart);
          }
          spawnPop(G.camX + W / 2, 84, b.def.name + ' APPEARS');
          audio.sfx('enrage');
          audio.music(G.stage.bossMusic);
        } else {
          audio.sfx('blip');
          if (G.waveIndex === 0) audio.voice('duke_come_get_some', 1200);
        }
      }
    }
  } else {
    spawnFromQueue();
    const bossBusy = G.boss && !G.boss.removeMe;
    if (!G.spawnQueue.length && aliveEnemies() === 0 && !bossBusy) {
      G.waveActive = false;
      G.locked = false;
      G.goTimer = 200;
      audio.sfx('go');
      addScore(50);
      if (G.stage.music) audio.music(G.stage.music);
    }
  }
  if (G.goTimer > 0) G.goTimer--;
  // camera: forward-only scroll, locked during waves
  if (!G.locked) {
    G.camX = clamp(Math.max(G.camX, p.x - 255), 0, G.camMax);
  } else {
    G.camX = clamp(G.camX, 0, G.camLock);
  }
}

function updatePickups() {
  const p = G.player;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i];
    pk.t++;
    if (pk.t > 600) { G.pickups.splice(i, 1); continue; }
    const usable = p.hp < p.maxhp;
    if (Math.abs(p.x - pk.x) < 11 && Math.abs(p.y - pk.y) < 9 && p.z < 8 && usable) {
      p.hp = Math.min(p.maxhp, p.hp + pk.heal);
      spawnPop(pk.x, pk.y - 20, '+' + pk.heal);
      audio.sfx('pickup');
      addScore(50);
      G.pickups.splice(i, 1);
    }
  }
}

function checkPlayerDeath() {
  const p = G.player;
  if (!p.dying) return;
  if (p.state === 'down' && p.t > 70) {
    G.lives--;
    if (G.lives >= 0) {
      p.hp = p.maxhp;
      p.dying = false;
      p.x = clamp(G.camX + 80, G.camX + 12, G.camX + W - 20);
      p.y = 211; p.z = 0; p.vx = 0; p.vz = 0;
      p.state = 'getup'; p.t = 0; p.invuln = 120;
      G.meter = Math.max(G.meter, 40);
    } else {
      p.state = 'dead';
      G.continueT = 9 * 60 + 59;
      setState('over');
      audio.music(null);
      persist();
    }
  }
}

function checkBossClear() {
  const b = G.boss;
  if (!b || !b.dead || G.state !== 'play') return;
  if (b.mini) {
    if (b.t > 60) {
      G.boss = null;
      addScore(500);
    }
    return;
  }
  if (b.t > 70) {
    if (!b.victoryLine) {
      b.victoryLine = true;
      if (b.key === 'mirchi') audio.voice('duke_gotta_hurt', 1600);
      else if (b.key === 'yadav') audio.voice('duke_book_em', 1600);
      else if (b.key === 'rana') audio.voice('duke_hail', 1800);
    }
    G.clearStats = {
      hits: G.stats.hits, kos: G.stats.kos,
      bonus: G.lives * 500, combo: G.bestCombo,
    };
    addScore(G.lives * 500 + G.bestCombo * 25);
    G.player.state = 'victory';
    setState('clear');
    // the lair's track, started here so it carries through the tally and into the hub
    // without restarting - audio.music() is a no-op when the slot is already playing
    audio.music(G.stageIndex >= STAGES.length - 1 ? null : HUB_STAGE.music);
    persist();
  }
}

// ---- fixed update ----
function update() {
  if (G.freezeTime) return false;
  G.rawTime++;
  pollGamepad();
  if (G.fade > 0) G.fade = Math.max(0, G.fade - 0.06);

  if (G.state === 'title') {
    if (input.pressed('attack') || input.pressed('pause')) { audio.unlock(); enterHub(true); }
    return;
  }
  if (G.state === 'hub') {
    if (G.hitstop > 0) { G.hitstop--; return false; }
    // the room has no pause button of its own; this is the console's, and without it
    // step(n) from a tool call lands hundreds of frames past wherever it was aimed
    if (G.paused) return false;
    G.time++;
    if (G.comboT > 0 && --G.comboT === 0) G.combo = 0;
    // The play camera only ever scrolls forward; in a room you have to walk back.
    // It runs before the player because clampToArena derives the room's walls from
    // it, and a camera that lags the body by a frame pins him against a stale wall.
    G.camX = clamp(G.player.x - W / 2, 0, G.camMax);
    const panelOpen = !!G.hubPanel;
    // ESC backs out of a panel or gets him off the sofa before it leaves the room
    if (!panelOpen && !G.hubSeat && input.pressed('back')) { setState('title'); G.fade = 1; return; }
    const pick = updateHub();
    // A panel owns the buttons while it is up, and keeps them until they are let go.
    // Without the latch, C to back out also throws a parry whose recovery eats the
    // next punch.
    if (panelOpen && !G.hubPanel) hubGate = true;
    if (hubGate && !input.held('parry') && !input.held('jump')) hubGate = false;
    if (!panelOpen && !G.hubPanel && !hubGate && !G.hubSeat) updatePlayer(G.player);
    updateProps();
    updateEffects();
    updateMotes();
    updateAmbience();
    if (pick >= 0) { G.meter = hubMeter; startStage(pick); }
    return;
  }
  if (G.state === 'intro') {
    const introT = G.rawTime - G.stateT;
    if (G.stageIndex === 0) updateMotorcycleArrival(introT);
    const introLife = G.stageIndex === 0 ? ENTRANCE_LAST_FRAME : 130;
    if (G.rawTime - G.stateT > introLife || input.pressed('attack')) { setState('play'); G.fade = 1; }
    return;
  }
  if (G.state === 'bossintro') {
    const t = G.rawTime - G.stateT;
    const b = G.boss;
    if (b) {
      const stop = G.camX + (b.key === 'mirchi' ? 338 : b.key === 'rana' ? 350 : 320);
      const startAt = b.key === 'rana' ? 90 : 28;
      if (t > startAt && b.x > stop) b.x -= b.key === 'yadav' ? 1.25 : 0.9;
      if (b.key === 'rana' && (t === 52 || t === 132)) audio.sfx('heavy');
    }
    const life = b && b.key === 'rana' ? 230 : b && b.key === 'yadav' ? 210 : 195;
    if (t > life || (t > 75 && input.pressed('attack'))) {
      setState('play');
      audio.music(G.stage.bossMusic);
    }
    return;
  }
  if (G.state === 'clear') {
    G.unlockedStage = Math.max(G.unlockedStage, Math.min(STAGES.length - 1, G.stageIndex + 1));
    G.selectedStage = G.unlockedStage;
    // the lair's records panel reads these; a run only ever raises them
    G.bestComboAll = Math.max(G.bestComboAll, G.bestCombo);
    G.actBest[G.stageIndex] = Math.max(G.actBest[G.stageIndex] || 0, G.score);
    persist();
    if (G.rawTime - G.stateT > 160 && input.pressed('attack')) {
      if (G.stageIndex < STAGES.length - 1) {
        enterHub(false);   // back to the lair with the next act unlocked
      } else {
        setState('ending');
        audio.music('ending');
      }
    }
    return;
  }
  if (G.state === 'ending') {
    const t = G.rawTime - G.stateT;
    if (t > 60 * 26 && input.pressed('attack')) {
      persist();
      setState('title');
      audio.music('title');
    }
    return;
  }
  if (G.state === 'over') {
    G.continueT--;
    if (input.pressed('attack')) {
      const p = G.player;
      G.lives = Math.max(1, DIFF.lives - 1);
      p.hp = p.maxhp; p.dying = false;
      p.x = clamp(G.camX + 80, G.camX + 12, G.camX + W - 20);
      p.y = 211; p.z = 0; p.vx = 0; p.vz = 0;
      p.state = 'getup'; p.t = 0; p.invuln = 120;
      G.meter = METER_MAX / 2;
      setState('play');
      audio.music(G.boss && !G.boss.dead ? G.stage.bossMusic : G.stage.music);
      return;
    }
    if (G.continueT <= 0) enterHub(true);
    return;
  }

  // state === 'play'
  if (input.pressed('pause')) { G.paused = !G.paused; audio.sfx('blip'); }
  if (G.paused) return;

  if (G.hitstop > 0) { G.hitstop--; return false; } // input persists through hitstop (buffering)
  if (G.parrySlow > 0) {
    G.parrySlow--;
    if (G.parrySlow & 1) return false;
  }
  G.time++;
  if (G.comboT > 0 && --G.comboT === 0) G.combo = 0;

  updatePlayer(G.player);
  updateProps();
  updateEnemies();
  if (G.boss) updateBoss();
  updateShots();
  updateEffects();
  updateMotes();
  updateAmbience();
  if (G.stage.id === 'locker' && G.time % 24 === 0) {
    spawnSteam(G.camX + Math.random() * W, 200 + Math.random() * 16, 1);
  }
  updateWaves();
  updatePickups();
  checkPlayerDeath();
  checkBossClear();
}

// ---- render ----
function drawShadow(ctx, e, camX) {
  const k = clamp(1 - e.z / 70, 0.25, 1);
  ctx.globalAlpha = 0.3 * k;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(Math.round(e.x - camX), Math.round(e.y + 3), e.shadowR * k + 2, 3 * k + 1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function render() {
  // everything below draws in 320x224 logical units; the transform blows it up
  // to the 640x448 buffer so 2x art lands pixel-exact
  ctx.setTransform(RS, 0, 0, RS, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (G.shake > 0) {
    ctx.translate((Math.random() * 2 - 1) * G.shake | 0, (Math.random() * 2 - 1) * G.shake | 0);
  }

  switch (G.state) {
    case 'title': drawTitle(ctx); break;
    case 'hub':
      drawStage(ctx, G.camX);
      drawHubWall(ctx, G.camX);   // posters are wall, so you can stand in front of them
      drawWorld(ctx);
      drawFG(ctx, G.camX);
      drawHubUI(ctx);
      break;
    case 'intro':
      if (G.stageIndex === 0) drawMotorcycleArrival(ctx);
      else drawIntro(ctx);
      break;
    case 'bossintro': drawBossIntro(ctx, G.camX); break;
    case 'clear': drawClear(ctx); break;
    case 'ending': drawEnding(ctx); break;
    case 'over': {
      drawStage(ctx, G.camX);
      drawWorld(ctx);
      drawFG(ctx, G.camX);
      drawOver(ctx);
      break;
    }
    default: { // play
      ctx.save();
      if (G.cinematic && G.cinematic.zoom > 1) {
        const c = G.cinematic;
        const focusX = (c.focusX === undefined ? G.player.x : c.focusX) - G.camX;
        const focusY = 156;
        ctx.translate(W / 2, focusY);
        ctx.scale(c.zoom, c.zoom);
        ctx.translate(-focusX, -focusY);
      }
      drawStage(ctx, G.camX);
      drawWorld(ctx);
      drawFG(ctx, G.camX);
      ctx.restore();
      drawHUD(ctx);
      if (G.paused) drawPause(ctx);
    }
  }

  if (G.cinematic) {
    const c = G.cinematic;
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    const intro = Math.min(1, c.t / 8);
    const outro = Math.min(1, (c.life - c.t) / 10);
    const k = Math.max(0, Math.min(intro, outro));
    ctx.fillStyle = `rgba(5,2,8,${0.42 * k})`;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#08050b';
    ctx.fillRect(0, 0, W, Math.round(18 * k));
    ctx.fillRect(0, H - Math.round(18 * k), W, Math.round(18 * k));
    if (c.title && c.t > 5 && c.t < c.life - 10) {
      const col = c.color || '#ffd94a';
      drawTextShadow(ctx, c.title, (W - textWidth(c.title, 2)) / 2, 22, col, 2);
    }
    c.t++;
    if (c.t >= c.life) G.cinematic = null;
  }
  if (G.flash > 0) {
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.fillStyle = 'rgba(255,250,230,0.35)';
    ctx.fillRect(0, 0, W, H);
  }
  if (G.fade > 0) {
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${G.fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawWorld(ctx) {
  const camX = G.camX;
  // lingering floor hazards go under everything else
  drawZones(ctx, camX);
  drawRagnarokGround(ctx, camX);
  // pickups: real objects now - a chilli, a lassi, a plate of chaat - instead of a
  // strobing orange square and a grey disc. They also get a shadow, without which
  // they read as stickers floating over the street.
  for (const pk of G.pickups) {
    const bob = Math.sin(pk.t * 0.1) * 2;
    const name = pk.kind === 'shake' ? 'pick_lassi' : 'pick_chaat';
    const img = fx(name, 0);
    const x = Math.round(pk.x - camX);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, Math.round(pk.y), 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (img) {
      const w = frameW(img), h = frameH(img);
      blit(ctx, img, x - w / 2, Math.round(pk.y - h + 2 + bob));
    } else {
      const spr = pk.kind === 'shake' ? SPR.shake : SPR.plate;
      blit(ctx, spr, x - frameW(spr) / 2, Math.round(pk.y - frameH(spr) + 3 + bob));
    }
  }
  // shadows first
  if (!G.hubSeat) drawShadow(ctx, G.player, camX);
  for (const e of G.enemies) drawShadow(ctx, e, camX);
  for (const pr of G.props) if (!pr.broken && pr.shadowR) drawShadow(ctx, pr, camX);
  if (G.boss && !G.boss.removeMe) drawShadow(ctx, G.boss, camX);
  // y-sorted entities (props included, so you can stand behind a crate). G.actors is
  // scenery that draws itself - the lair's tiger - and CHAD drops out of the list while
  // he is sat on the sofa, because the seated art draws him.
  const ents = [...G.enemies, ...G.props, ...G.actors];
  if (!G.hubSeat) ents.push(G.player);
  if (G.boss && !G.boss.removeMe) ents.push(G.boss);
  ents.sort((a, b) => a.y - b.y);
  const drawEnt = (e) => {
    if (e.draw) e.draw(ctx, camX);
    else if (e.kind === 'player') drawPlayer(ctx, e, camX);
    else if (e.kind === 'boss') drawBoss(ctx, camX);
    else if (e.kind === 'prop') drawProp(ctx, e, camX);
    else drawEnemy(ctx, e, camX);
  };
  for (const e of ents) drawEnt(e);
  // cheap glossy-floor reflections (mirrored around each entity's ground line)
  ctx.save();
  ctx.globalAlpha = 0.10;
  G.reflecting = true;
  for (const e of ents) {
    // props opt in: on street dirt a reflected crate looks wrong, on the lair's
    // polished granite the heavy bag not reflecting is the thing that looks wrong
    if (e.state === 'dying' || (e.kind === 'prop' && !e.reflect)) continue;
    const gy = Math.round(e.y + 3);
    ctx.save();
    ctx.translate(0, Math.round(gy * 1.5));
    ctx.scale(1, -0.5);
    drawEnt(e);
    ctx.restore();
  }
  G.reflecting = false;
  ctx.restore();
  drawShots(ctx, camX);
  drawEffects(ctx, camX);
}

// ---- fixed-timestep loop ----
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  acc += now - last;
  last = now;
  if (acc > 200) acc = 200; // avoid spiral after tab switch
  while (acc >= STEP) {
    if (update() !== false) endFrameInput();
    acc -= STEP;
  }
  render();
}

// boot: load PNG assets + AI frames first (posters/title/sprites need them), then start
loadSave();
Promise.all([loadAssets(), loadAIFrames(), loadSFX(), loadFX(), loadFG(), loadAmbience(), loadStory()]).then(() => {
  initStage(0); // build background layers + motes so the title can scroll them
  setState('title');
  requestAnimationFrame(frame);
  runAuto();
});

// ---- debug / test hook ----
window.__game = {
  G, BOSSES, STAGES,
  start: () => { startGame(); },
  hub: () => { enterHub(true); },
  state: () => G.state,
  press: (a) => debugPress(a),
  release: (a) => debugRelease(a),
  stage: (i) => { resetRun(); startStage(i); setState('play'); },
  skipToBoss: () => {
    if (G.state === 'title' || G.state === 'hub') startGame();
    setState('play');
    const waves = G.stage.waves;
    const bossWave = waves[waves.length - 1];
    G.camX = clamp(bossWave.x - 120, 0, G.camMax);
    G.player.x = G.camX + 100;
    for (const w of waves) w.done = true;
    G.waveIndex = waves.length - 2;
    G.enemies = [];
    G.spawnQueue = [];
    G.waveActive = false; G.locked = false;
    G.boss = null;
  },
  hurtBoss: (n) => { if (G.boss) G.boss.hurt(n, 1, true, false); },
  step: (n) => {
    for (let i = 0; i < (n || 1); i++) if (update() !== false) endFrameInput();
  },
  spawn: (type, dx, dy) => spawnEnemy(type, G.player.x + (dx || 20), G.player.y + (dy || 0)),
  setPlayerPos: (x, y) => { G.player.x = x; if (y) G.player.y = y; },
};

// ---- scripted auto-demo for headless verification (not part of gameplay) ----
// Runs update() synchronously so headless screenshots don't depend on rAF pacing.
function runAuto() {
const params = new URLSearchParams(location.search);
const autoMode = params.get('auto');
const stageParam = parseInt(params.get('stage') || '0', 10) || 0;
if (autoMode) {
  // Match the real loop: hitstop freezes the simulation without consuming a
  // buffered edge press. This matters most for combo inputs at contact.
  const step = (n) => {
    for (let i = 0; i < n; i++) if (update() !== false) endFrameInput();
  };
  const startAt = (i) => { startGame(0); if (i) { startStage(i); } setState('play'); };
  if (autoMode === 'play') {
    startAt(stageParam);
    G.player.x = 300; G.camX = 130;
    debugPress('right'); step(80); debugRelease('right');
  } else if (autoMode === 'arrival') {
    startGame(0);
    G.rawTime = G.stateT + (parseInt(params.get('t') || '500', 10) || 500);
    G.fade = 0;
    G.freezeTime = true;
  } else if (autoMode === 'walk') {
    startAt(stageParam);
    G.player.x = 200; G.camX = 60;
    debugPress('right'); step(11); // stop mid-stride for the screenshot
  } else if (autoMode === 'jab') {
    startAt(stageParam);
    G.player.x = 200; G.player.y = 211; G.camX = 60;
    const g1 = spawnEnemy('goonda', 232, 211);
    g1.state = 'idle'; g1.atkCd = 999;
    step(2);
    debugPress('attack'); step(5); // freeze at the jab contact frame
    G.hitstop = 999999;
  } else if (autoMode === 'combo') {
    startAt(stageParam);
    G.player.x = 200; G.player.y = 211; G.camX = 60;
    const r1 = spawnEnemy('goonda', 242, 211);
    r1.state = 'hurt'; r1.atkCd = 999; r1.hp = 500; r1.maxhp = 500;
    G.player.state = 'attack'; G.player.t = 8; G.player.combo = 4;
    G.player.route = 'flow'; G.player.face = 1;
    G.hitstop = 999999;
  } else if (autoMode === 'parry') {
    startAt(stageParam);
    G.player.x = 200; G.player.y = 211; G.camX = 60;
    const p1 = spawnEnemy('goonda', 218, 211);
    p1.state = 'attack'; p1.t = 3; p1.face = -1;
    G.player.state = 'idle'; G.player.invuln = 0;
    debugPress('parry'); step(5); debugRelease('parry');
    G.hitstop = 999999;
  } else if (autoMode === 'combat') {
    startAt(stageParam);
    G.player.x = 160; G.player.y = 211;
    const types = ['goonda', 'batta', 'pehlwan'];
    const g1 = spawnEnemy(types[0], 220, 210);
    spawnEnemy(types[1], 300, 232);
    spawnEnemy(types[2], 110, 190);
    for (const e of G.enemies) { e.state = 'idle'; e.t = 0; e.atkCd = 400; }
    g1.x = G.player.x + 22; g1.y = G.player.y;
    step(5);
    debugPress('attack'); step(2); debugRelease('attack'); step(12);
    debugPress('attack'); step(2); debugRelease('attack'); step(10);
  } else if (autoMode === 'super' || autoMode === 'ragnarok') {
    startAt(stageParam);
    G.player.x = 160; G.meter = METER_MAX;
    spawnEnemy('goonda', 200, 211); spawnEnemy('goonda', 120, 211);
    for (const e of G.enemies) { e.state = 'idle'; e.atkCd = 999; }
    step(3);
    debugPress('super'); step(2); debugRelease('super');
    const contact = 48;
    let guard = 0;
    while (G.player.state === 'special' && G.player.superT < contact && guard++ < 160) step(1);
    if (G.cinematic) { G.cinematic.t = 12; G.cinematic.life = 999999; }
    G.flash = 0;
    const impactFrame = G.effects.find((e) => e.type === 'ragnarok');
    if (impactFrame) impactFrame.t = 12;
    G.hitstop = 999999;
  } else if (autoMode === 'boss') {
    startAt(stageParam); window.__game.skipToBoss();
    const bossWave = G.stage.waves[G.stage.waves.length - 1];
    G.player.x = bossWave.x + 2;
    step(150); // bossintro: boss strides in, taunt types out
    G.freezeTime = true;
  } else if (autoMode === 'bossfight') {
    startAt(stageParam); window.__game.skipToBoss();
    G.player.x = G.camX + 160;
    step(220);
    if (G.boss) { G.boss.x = G.player.x + 64; G.boss.y = G.player.y; G.boss.state = 'idle'; }
    debugPress('attack'); step(3); debugRelease('attack'); step(20);
  } else if (autoMode === 'miniboss' || autoMode === 'foodboss') {
    startAt(0); window.__game.skipToBoss();
    G.player.x = G.camX + 160; step(80);
  } else if (autoMode === 'soak') {
    // Stuck-entity hunt: hammer every knockdown path and report anything that
    // never recovers (an enemy frozen in 'down' also blocks the wave forever).
    startAt(stageParam);
    const p = G.player;
    const kinds = ['goonda', 'batta', 'masala', 'bandar', 'pehlwan',
      'constable', 'operator', 'sepoy'];
    const stuck = {};
    const seen = {};
    let frames = 0;
    const note = (e) => {
      const key = e.kind + ':' + e.state;
      stuck[key] = (stuck[key] || 0) + 1;
    };
    for (let round = 0; round < 40; round++) {
      G.enemies.length = 0;
      p.hp = p.maxhp; p.dying = false; p.state = 'idle'; p.invuln = 999;
      const kind = kinds[round % kinds.length];
      for (let i = 0; i < 4; i++) {
        const e = spawnEnemy(kind, p.x + 30 + i * 14, FLOOR_TOP + 6 + i * 18);
        e.state = 'idle'; e.atkCd = 20; e.hp = 400;
        seen[kind] = true;
      }
      for (let i = 0; i < 240; i++) {
        // random abuse: launches, body collisions, supers and hazards
        const e = G.enemies[i % G.enemies.length];
        if (e && !e.dead) {
          const r = (i * 7 + round) % 5;
          if (r === 0) e.hurt(3, 1, true, true);
          else if (r === 1) e.hurt(3, -1, true, false);
          else if (r === 2 && e.state !== 'thrown') e.thrown(i % 2 ? 1 : -1);
          else if (r === 3) e.hurt(2, 1, false, false);
        }
        update(); endFrameInput();
        frames++;
      }
      // give everything a long, undisturbed window to recover
      for (let i = 0; i < 400; i++) { update(); endFrameInput(); frames++; }
      for (const e of G.enemies) {
        if (e.dead || e.removeMe) continue;
        if (e.state !== 'idle' && e.state !== 'approach' && e.state !== 'windup' &&
            e.state !== 'attack' && e.state !== 'backoff' && e.state !== 'spawn' &&
            e.state !== 'loot') note(e);
        if (!isFinite(e.x) || !isFinite(e.y) || !isFinite(e.z)) note({ kind: e.kind, state: 'NaN' });
      }
    }
    // second pass: break enemy holds every supported way
    for (let round = 0; round < 60; round++) {
      G.enemies.length = 0; G.boss = null;
      G.lives = 9; setState('play'); // keep the sim in play so nothing freezes on us
      p.hp = p.maxhp; p.dying = false; p.state = 'idle'; p.invuln = 0;
      p.grabbedBy = null;
      const holder = spawnEnemy('pehlwan', p.x + 14, p.y);
      holder.state = 'windup'; holder.t = 30; holder.hp = 500; holder.maxhp = 500;
      const other = spawnEnemy('goonda', p.x + 60, p.y);
      other.state = 'idle'; other.atkCd = 999; other.hp = 500;
      step(14);
      switch (round % 6) {
        case 0:
          for (let i = 0; i < 6; i++) { debugPress('attack'); step(2); debugRelease('attack'); step(2); }
          break;
        case 1: holder.hurt(999, 1, true, true); break;            // holder is knocked out
        case 2: p.grabbedBy = null; break;                         // ownership is lost
        case 3: hurtPlayer(p, 12, -1, true); break;                // player is knocked down
        case 4: other.thrown(-1); break;                           // flying body crosses the hold
        case 5: break;                                             // natural hold timeout
      }
      step(400);
      // settle window: any legitimate hold or knockdown resolves well inside this
      p.invuln = 999;
      step(300);
      for (const e of G.enemies) {
        if (e.dead || e.removeMe) continue;
        // genuinely stuck = passive state with nobody holding it up, or way past its timeout
        const frozen =
          (e.state === 'grabhold' && (p.grabbedBy !== e || e.holdT > 150)) ||
          ((e.state === 'down' || e.state === 'thrown') && e.t > 240);
        if (frozen) {
          const tag = 'holdcase' + (round % 6) + ':' + e.kind + ':' + e.state;
          stuck[tag] = (stuck[tag] || 0) + 1;
          if (!stuck._detail) {
            stuck._detail = 1;
            document.body.dataset.stuck = JSON.stringify({
              tag, z: e.z, vz: e.vz, t: e.t, holdT: e.holdT, hp: e.hp, dead: e.dead,
              heldByThis: G.player.grabbedBy === e, grabbedByAny: !!G.player.grabbedBy,
              playerState: G.player.state, gameState: G.state,
              dupes: G.enemies.filter((o) => o === e).length,
            });
          }
        }
      }
      frames += 410;
    }
    const bad = Object.keys(stuck);
    document.title = (bad.length ? 'STUCK ' + bad.map((k) => k + 'x' + stuck[k]).join(',') : 'SOAK-CLEAN')
      + ' | kinds=' + Object.keys(seen).length + ' | frames=' + frames;
  } else if (autoMode === 'bot') {
    // Balance harness: a naive bot plays a whole stage; reports pacing in the title.
    startAt(stageParam);
    const p = G.player;
    let frames = 0, deaths = 0, damage = 0, lastHp = p.hp;
    const stuckLog = {};
    const target = () => {
      let best = null, bd = 1e9;
      const list = G.boss && !G.boss.dead ? [...G.enemies, G.boss] : G.enemies;
      for (const e of list) {
        if (e.dead || e.state === 'dying') continue;
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 2;
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    };
    while (frames < 60 * 300 && G.state !== 'clear' && G.state !== 'over') {
      const t = target();
      debugRelease('left'); debugRelease('right'); debugRelease('up'); debugRelease('down');
      if (t) {
        const dx = t.x - p.x, dy = t.y - p.y;
        if (Math.abs(dy) > 6) debugPress(dy > 0 ? 'down' : 'up');
        else if (Math.abs(dx) > 20) debugPress(dx > 0 ? 'right' : 'left');
        else if (frames % 12 < 3) debugPress('attack');
        if (G.meter >= METER_MAX && Math.abs(dx) < 60) debugPress('super');
        if (p.state === 'held' && frames % 2 === 0) debugPress('attack');
      } else {
        debugPress('right');
      }
      update(); endFrameInput();
      frames++;
      // stuck watchdog: nobody should sit in a recovery state for 5 seconds
      for (const e of G.enemies) {
        const recovering = ['down', 'thrown', 'grabbed', 'getup', 'hurt', 'grabhold', 'dying'].includes(e.state);
        e._age = recovering ? (e._age || 0) + 1 : 0;
        if (e._age === 300) stuckLog[e.kind + ':' + e.state] = (stuckLog[e.kind + ':' + e.state] || 0) + 1;
      }
      if (p.hp < lastHp) damage += lastHp - p.hp;
      if (p.hp > lastHp && p.state === 'getup') deaths++;
      lastHp = p.hp;
    }
    const stuckKeys = Object.keys(stuckLog);
    document.title = (stuckKeys.length ? 'STUCK:' + stuckKeys.map((k) => k + 'x' + stuckLog[k]).join(',') + ' | ' : '') + [
      'stage=' + G.stage.name, 'result=' + G.state, 'seconds=' + (frames / 60 | 0),
      'kos=' + G.stats.kos, 'damage=' + damage, 'deaths=' + deaths,
      'lives=' + G.lives, 'score=' + G.score, 'bestCombo=' + G.bestCombo,
    ].join(' | ');
  } else if (autoMode === 'ending') {
    startGame(); setState('ending'); G.score = 74000;
    step(60 * 25);
  } else if (autoMode === 'verify') {
    const R = [];
    const t = (name, cond) => R.push((cond ? 'PASS' : 'FAIL') + ':' + name);
    try {
      // flow: title -> hub -> intro -> play
      t('title-state', G.state === 'title');

      // ---- the lair hub: walk-up fixtures, the world map picks the act ----
      const at = (id) => { G.player.x = FIXTURES.find((f) => f.id === id).x; step(2); };
      const tap = (a, n) => { debugPress(a); step(n || 2); debugRelease(a); step(2); };
      enterHub(true);
      t('hub-state', G.state === 'hub');
      t('hub-bag-present', G.props.length === 1 && G.props[0].prop === 'bag');
      t('hub-chapter-count', CHAPTERS.length === 1 && CHAPTERS[0].acts.length === STAGES.length);
      // every fixture is reachable and >= 2*REACH from its neighbours
      t('hub-fixtures-spaced', FIXTURES.every((f, i) =>
        i === 0 || f.x - FIXTURES[i - 1].x >= 80));
      t('hub-fixtures-selectable', FIXTURES.every((f) => { at(f.id); return G.hubSel === f.id; }));
      at('bag');
      tap('use');
      t('hub-bag-opens-nothing', !G.hubPanel);
      for (const id of ['map', 'hifi', 'trophies']) {
        at(id); tap('use');
        t('hub-panel-' + id, G.hubPanel === id);
        tap('back');
        t('hub-panel-' + id + '-escapes', !G.hubPanel);
      }
      at('mirror'); tap('use');
      t('hub-mirror-flex', G.player.state === 'victory' && G.hubFlex > 0);
      step(120);
      t('hub-mirror-ends', G.player.state !== 'victory');
      at('lounge'); tap('use'); step(30);
      t('hub-sits', G.hubSeat > 0 && G.hubStation === 'lounge');
      tap('attack'); step(2);
      t('hub-stands', G.hubSeat === 0 && G.hubStation === null && G.state === 'hub');
      at('bar'); tap('use');
      t('hub-bar-pours', G.hubSeat > 0 && G.hubStation === 'bar');
      // it plays once and stands him back up on its own, unlike the sofa
      step(140);
      t('hub-bar-ends', G.hubSeat === 0 && G.hubStation === null);
      // the tank is decor, not a fixture: nothing to walk up to, but he is always smoking
      step(60);
      t('hub-shark-smokes', hubTank().smoke.length > 0);
      // A fish must face where it is GOING. Facing by which side of the ball it sat on -
      // the first attempt - had half of them swimming backwards at any moment.
      {
        const tank = hubTank();
        let wrong = 0, moving = 0;
        const was = tank.bait.fish.map((f) => f.x);
        for (let i = 0; i < 200; i++) {
          step(1);
          tank.bait.fish.forEach((f, n) => {
            const dx = f.x - was[n];
            if (Math.abs(dx) > 0.05) { moving++; if (Math.sign(dx) !== f.face) wrong++; }
            was[n] = f.x;
          });
        }
        t('hub-baitfish-face-forwards', moving > 500 && wrong === 0);
      }
      // the tiger, drawing himself and living at the hearth
      t('hub-tiger-present', G.actors.length === 1
        && G.actors.every((a) => typeof a.draw === 'function'));
      {
        const tg = hubTiger();
        // he gets up in STAGES. A cat that goes from flat out to walking on one frame is a
        // switch, so the order matters more than the timing: head up, sit, stretch, walk.
        G.player.x = tg.x - 400;
        tg.state = 'lie'; tg.t = 0; tg.alert = 0; tg.target = tg.x;
        const order = ['lie'];
        petsWatch(tg.x, 260);
        for (let i = 0; i < 500 && tg.state !== 'walk'; i++) {
          step(1);
          if (order[order.length - 1] !== tg.state) order.push(tg.state);
        }
        t('hub-tiger-gets-up-in-stages', order.join(',') === 'lie,wake,sit,stretch,walk');
        // and he lives WITH CHAD: park the man at the far end and the tiger turns up
        G.player.x = 220;
        let closest = 9999;
        for (let i = 0; i < 12000; i++) { step(1); closest = Math.min(closest, Math.abs(tg.x - 220)); }
        t('hub-tiger-follows-him', closest < 200);
        // and settles beside him rather than walking through him
        t('hub-tiger-settles-beside-him', Math.abs(tg.x - 220) > 20 && Math.abs(tg.x - 220) < 320);
      }
      // the master suite: she shifts about on her own and speaks now and then. She does
      // NOT react to him, so walking up must change nothing.
      {
        const poses = new Set();
        let lineFrames = 0, changes = 0, last = hubBed().pose;
        G.player.x = 900;
        // 650 samples, not 400: her pose is a random walk over NEIGHBOURS, and over 400 the
        // distinct-pose count bottomed out at exactly the 3 this asserts - measured over 25
        // runs. The window was on the boundary, so the check failed now and then for no
        // reason. At 650 the minimum is 4.
        for (let i = 0; i < 650; i++) {
          step(15);
          poses.add(hubBed().pose);
          if (hubBed().lineT > 0) lineFrames++;
          if (hubBed().pose !== last) { changes++; last = hubBed().pose; }
        }
        t('hub-bed-shifts-about', poses.size >= 3 && changes >= 3);
        t('hub-bed-poses-are-adjacent-steps', [...poses].every((p) => p >= 0 && p < 8));
        // a line now and then, not a running commentary. Simulated over 400 runs of this
        // window the bubble is up for 110-170 of the 650 samples, so 34% leaves real margin
        // over the 26% worst case - a bound sitting on the measured maximum is a coin flip.
        t('hub-bed-speaks-with-pauses', lineFrames > 0 && lineFrames < 650 * 0.34);
        // Her own pose timer has to be taken out of the way first. POSE_HOLD is 200-520
        // frames, so it lands inside any 6-frame window about 1.7% of the time - this
        // failed at random for months on a pose she changed for her own reasons.
        const before = hubBed().pose;
        hubBed().hold = 600;
        G.player.x = BED_X - 60; step(6);
        t('hub-bed-ignores-him', hubBed().pose === before);
      }
      t('hub-room-is-four-screens', G.stage.width === 1920 && G.camMax === 1920 - W);
      // The trophy wall is sized for the tour, not for the acts that exist today: two
      // niches x three shelves x three across is six countries at three acts each.
      // drawAlcove silently drops any relic past the last slot, so this is the check
      // that the wall has not quietly run out of room.
      t('hub-trophy-wall-fits-six-countries', RELIC_SLOTS.length >= 18);
      t('hub-relics-clear-each-other', RELIC_SLOTS.every(([x, y], i) =>
        RELIC_SLOTS.every(([x2, y2], j) => i === j || y !== y2 || Math.abs(x - x2) >= 30)));
      // the map panel: cursor moves, a locked act refuses, an unlocked one starts
      G.unlockedStage = 0;
      at('map'); tap('use');
      t('hub-map-opens-on-newest', G.hubAct === 0);
      tap('down');
      t('hub-map-moves', G.hubAct === 1);
      tap('attack');
      t('hub-locked-act-blocked', G.state === 'hub' && G.hubPanel === 'map');
      tap('up');
      tap('attack');
      t('hub-starts-act', G.state === 'intro' && G.stageIndex === 0);

      enterHub(true);
      {
        const bag = G.props[0];
        G.player.x = bag.x - 30; G.player.y = bag.y; G.combo = 0; step(2);
        debugPress('attack'); step(14); debugRelease('attack'); step(6);
        t('hub-bag-unbreakable', !bag.broken && bag.hp === bag.maxhp);
        t('hub-bag-swings', Math.abs(bag.swing) > 0.001 && G.combo >= 1);
        t('hub-bag-reflects', bag.reflect === true);
      }
      G.hubSel = null; step(2);
      tap('back');
      t('hub-escape-leaves', G.state === 'title');

      setState('title');
      startGame(0); t('intro-state', G.state === 'intro');
      step(500); t('arrival-holds-for-character-beat', G.state === 'intro');
      step(ENTRANCE_LAST_FRAME - 498); t('play-state', G.state === 'play');
      t('stage1-name', G.stage.name === 'BAZAAR HEAT');
      t('five-act-chapter', STAGES.length === 5 &&
        STAGES.map((s) => s.boss).join(',') === 'raja,mirchi,refund,yadav,rana');
      // movement
      const x0 = G.player.x;
      debugPress('right'); step(30); debugRelease('right');
      t('walk-right', G.player.x > x0 + 20);
      const y0 = G.player.y;
      debugPress('up'); step(10); debugRelease('up');
      t('depth-move', G.player.y < y0);
      debugPress('jump'); step(2); debugRelease('jump');
      t('jump', G.player.z > 1 || G.player.state === 'jump');
      step(40);

      // combo on an adjacent goonda
      const gr = spawnEnemy('goonda', G.player.x + 20, G.player.y);
      gr.state = 'idle'; gr.atkCd = 999; gr.hp = 500; gr.maxhp = 500;
      const hp0 = gr.hp;
      debugPress('attack'); step(2); debugRelease('attack');
      // Tap once after each contact, inside the visible recovery/cancel window.
      for (let next = 1; next < 5; next++) {
        let guard = 0;
        while (G.player.state === 'attack' && !G.player.hitDone && guard++ < 80) step(1);
        debugPress('attack'); step(2); debugRelease('attack');
        guard = 0;
        while (G.player.state === 'attack' && G.player.combo < next && guard++ < 80) step(1);
      }
      { let guard = 0; while (G.player.state === 'attack' && !G.player.hitDone && guard++ < 80) step(1); }
      step(20);
      t('combo-damage', gr.hp < hp0);
      t('combo-launch', gr.state === 'down' || gr.dead);
      t('meter-gain', G.meter > 0);
      t('combo-counter', G.bestCombo >= 2);
      t('combo-flow-route', G.player.route === 'flow');
      step(80);
      G.enemies.length = 0; step(20);

      // ---- juggle: an airborne body stays hittable, at reduced damage ----
      const ju = spawnEnemy('goonda', G.player.x + 22, G.player.y);
      ju.state = 'idle'; ju.atkCd = 999; ju.hp = 500; ju.maxhp = 500;
      ju.state = 'down'; ju.z = 20; ju.vz = 1.5;   // mid-launch
      const jHp = ju.hp;
      G.player.combo = 0;
      debugPress('attack'); step(2); debugRelease('attack'); step(8);
      t('juggle-hit', ju.hp < jHp);
      t('juggle-scaling', ju.juggle >= 1);
      G.enemies.length = 0; step(20);

      // ---- wall splat: knocked into the arena edge, bounced back in ----
      G.locked = true; G.camLock = G.camX;
      const ws = spawnEnemy('goonda', G.camX + 40, G.player.y);
      ws.state = 'idle'; ws.atkCd = 999; ws.hp = 500; ws.maxhp = 500;
      const wHp = ws.hp;
      ws.hurt(5, -1, true, true);       // launch him at the left wall
      ws.vx = -9;
      for (let i = 0; i < 40; i++) step(1);
      t('wall-splat-damage', ws.dead || ws.hp < wHp - 5);
      t('wall-splat-inbounds', ws.x >= G.camX + 10 && ws.x <= G.camX + W - 10);
      t('wall-bounce-inward', ws.dead || ws.vx >= 0);
      G.enemies.length = 0; G.locked = false; step(20);

      // ---- the world still renders with a pickup on screen ----
      // A missing import in drawWorld threw at the pickup loop and silently killed
      // every draw after it, player included. Rendering is not otherwise covered.
      G.pickups.length = 0;
      G.pickups.push({ x: G.player.x + 8, y: G.player.y, kind: 'shake', heal: 30, t: 0 });
      G.pickups.push({ x: G.player.x + 24, y: G.player.y, kind: 'plate', heal: 15, t: 0 });
      let renderOk = true;
      try { render(); } catch (e) { renderOk = false; R.push('RENDER-THREW:' + e.message); }
      t('renders-with-pickups', renderOk);
      G.pickups.length = 0;

      // ---- the living street (environmental, never pasted-on full-body NPCs) ----
      t('background-npcs-removed', !('crowd' in G.stage));
      // Stage 1 deliberately replaced bolted-on cloth/fan/foreground pieces
      // with reactive pigeons and a clean playfield. Verify the shipped art
      // direction rather than the discarded ambience prototype.
      t('reactive-birds-authored', (G.stage.birds || []).length >= 8);
      t('bolted-ambience-removed', (G.stage.ambience || []).length === 0 && (G.stage.emitters || []).length === 0);
      t('foreground-clutter-removed', (G.stage.fg || []).length === 0);
      reactStage(G.player.x, 1.5);
      t('stage-reacts', G.stageReacts.length > 0);
      step(40);
      t('stage-settles', G.stageReacts.length === 0);

      // ---- breakable props ----
      const pr0 = G.props.length;
      const prop = G.props.find((q) => !q.broken);
      t('props-exist', pr0 > 0 && !!prop);
      if (prop) {
        G.player.x = prop.x - 20; G.player.y = prop.y; G.player.face = 1;
        prop.hurt(999, 1);
        t('prop-breaks', prop.broken === true);
      }
      G.pickups.length = 0;
      const lootEnemy = spawnEnemy('goonda', G.player.x + 30, G.player.y);
      lootEnemy.hurt(999, 1, true, true);
      t('enemy-drops-disabled', G.pickups.length === 0);
      G.enemies.length = 0;
      const lootCrate = createProp('crate', G.player.x + 30, G.player.y);
      G.props.push(lootCrate);
      lootCrate.hurt(999, 1);
      t('breakable-health-drop', G.pickups.length === 1 && G.pickups[0].kind === 'shake');
      G.pickups.length = 0;
      step(20);

      // ---- poison status from a chutney puddle ----
      G.player.hp = 100; G.player.invuln = 0; G.player.poison = 0;
      spawnZone('chutney', G.player.x, G.player.y, 26, 200);
      step(40);
      t('poison-applied', G.player.poison > 0);
      G.zones.length = 0; G.player.poison = 0;

      // ---- quick getup ----
      G.player.hp = 100; G.player.invuln = 0;
      hurtPlayer(G.player, 5, 1, true);
      step(10);
      debugPress('attack'); step(2); debugRelease('attack');   // buffered mid-air
      t('quick-getup-buffered', G.player.quickGetup === true);
      step(50);
      t('quick-getup', G.player.state === 'getup' || G.player.state === 'idle');
      step(30);

      // ---- run: hold the direction out of a dash ----
      // An enemy left over from an earlier wave lands a hit often enough to make this
      // flaky, and a hit clears runT. Park him and reset the gating first: this is a
      // check on the dash-to-run handoff, not on enemy pressure.
      G.player.x = 200; G.camX = 0;
      G.waveIndex = -1; G.waveActive = false; G.locked = false;
      G.enemies.length = 0; G.spawnQueue = [];
      for (const w of G.stage.waves) w.done = false;
      G.player.state = 'idle'; G.player.hp = 100;
      debugPress('dashR'); step(2); debugRelease('dashR');
      debugPress('right'); step(26);
      t('run-state', G.player.state === 'run' || G.player.runT > 0);
      debugRelease('right'); step(20);

      // ---- idle animation fires after standing still ----
      // running right above can trip a wave, so park him and reset the gating
      G.player.x = 200; G.player.hp = 100; G.camX = 0;
      G.waveIndex = -1; G.waveActive = false; G.locked = false;
      G.enemies.length = 0; G.spawnQueue = [];
      for (const w of G.stage.waves) w.done = false;
      G.player.state = 'idle'; G.player.idleT = 0;
      step(240);
      t('idle-anim', G.player.state === 'idleanim' || G.player.idleT > 200);
      debugPress('right'); step(3); debugRelease('right');
      t('idle-anim-cancels', G.player.state !== 'idleanim');
      step(10);

      // ---- dedicated parry: green attacks counter, red attacks do not ----
      G.enemies.length = 0;
      const pc = spawnEnemy('goonda', G.player.x + 18, G.player.y);
      pc.state = 'attack'; pc.t = 3; pc.face = -1; pc.hp = 100; pc.maxhp = 100;
      G.player.state = 'idle'; G.player.invuln = 0; G.player.hp = 100;
      const meterBeforeParry = G.meter;
      debugPress('parry'); step(2); debugRelease('parry'); step(3);
      t('parry-counter', G.player.state === 'parry_counter' || pc.state === 'stagger');
      t('parry-no-damage', G.player.hp === 100);
      t('parry-staggers', pc.state === 'stagger' || pc.dead);
      t('parry-meter', G.meter > meterBeforeParry);
      step(30); G.enemies.length = 0;

      // Holding parry remains active beyond the old tap window. Releasing it
      // has recovery, while red heavy attacks still punch straight through.
      G.player.state = 'idle'; G.player.invuln = 0; G.player.hp = 100;
      debugPress('parry'); step(30);
      t('parry-hold-stance', G.player.state === 'parry');
      const heldPc = spawnEnemy('goonda', G.player.x + 18, G.player.y);
      heldPc.state = 'attack'; heldPc.t = 3; heldPc.face = -1;
      step(2);
      t('parry-hold-counter', G.player.state === 'parry_counter' || heldPc.state === 'stagger');
      debugRelease('parry'); step(30); G.enemies.length = 0;

      G.player.state = 'idle'; G.player.invuln = 0; G.player.hp = 100;
      debugPress('parry'); step(5);
      const redPc = spawnEnemy('batta', G.player.x + 18, G.player.y);
      redPc.state = 'attack'; redPc.t = 6; redPc.face = -1;
      step(2); debugRelease('parry');
      t('parry-red-breaks-through', G.player.hp < 100);
      G.enemies.length = 0; G.player.state = 'idle'; G.player.hp = 100; step(20);

      // ---- poise armour on the pehlwan ----
      const ph = spawnEnemy('pehlwan', G.player.x + 22, G.player.y);
      ph.state = 'idle'; ph.atkCd = 999;
      const phHp = ph.hp, poise0 = ph.poise;
      t('poise-exists', poise0 > 0);
      ph.hurt(10, 1, false, false);
      t('poise-absorbs', ph.hp === phHp && ph.poise === poise0 - 1);
      ph.poise = 0;
      ph.hurt(10, 1, false, false);
      t('poise-broken-takes-damage', ph.hp < phHp);
      G.enemies.length = 0; step(20);

      // ---- masala chilli powder blinds ----
      G.player.hp = 100; G.player.invuln = 0; G.player.blind = 0;
      spawnShot('powder', G.player.x - 10, G.player.y, 2.6, 6);
      step(20);
      t('blind-applied', G.player.blind > 0);
      G.shots.length = 0; G.player.blind = 0;

      // ---- one authored full-meter cinematic super ----
      G.enemies.length = 0;
      const s1 = spawnEnemy('goonda', G.player.x + 24, G.player.y);
      s1.state = 'idle'; s1.atkCd = 999; s1.hp = 500; s1.maxhp = 500;
      G.meter = METER_MAX; G.player.state = 'idle';
      debugPress('super'); step(2); debugRelease('super');
      t('ragnarok-state', G.player.state === 'special' && G.player.superMove === 0);
      step(150);
      t('ragnarok-damage', s1.hp < 500);
      t('ragnarok-cost', G.meter === 0);
      t('ragnarok-finishes', G.player.state === 'idle');
      G.cinematic = null; step(20);
      G.meter = 0; G.player.state = 'idle';
      debugPress('super'); step(2); debugRelease('super');
      t('super-requires-full-meter', G.player.state === 'idle');
      step(20);

      // ---- pehlwan bear hug + mash escape ----
      G.enemies.length = 0;
      const bh = spawnEnemy('pehlwan', G.player.x + 14, G.player.y);
      bh.state = 'idle'; bh.hp = 600; bh.maxhp = 600;
      G.player.invuln = 0; G.player.state = 'idle';
      bh.state = 'windup'; bh.t = 30;
      step(14);
      t('bearhug', G.player.state === 'held' || bh.state === 'grabhold');
      for (let i = 0; i < 8; i++) { debugPress('attack'); step(2); debugRelease('attack'); step(2); }
      t('mash-free', !G.player.grabbedBy);
      G.enemies.length = 0;
      step(20);

      // ---- wave gating ----
      G.waveIndex = -1; G.waveActive = false; G.locked = false;
      G.enemies.length = 0; G.spawnQueue = [];
      for (const w of G.stage.waves) w.done = false;
      G.player.x = 421; G.player.hp = 100; G.camX = 160;
      step(5);
      t('wave-trigger', G.waveActive === true && G.locked === true);
      step(120);
      t('wave-spawned', G.enemies.length > 0 || G.spawnQueue.length > 0);
      for (const e of G.enemies) e.hurt(999, 1, true, true);
      G.spawnQueue = [];
      step(80);
      t('wave-clear', G.waveActive === false && G.goTimer > 0);

      // ---- player hurt + knockdown + life loss ----
      const lives0 = G.lives;
      G.player.hp = 5; G.player.invuln = 0;
      hurtPlayer(G.player, 10, 1, true);
      t('player-heavy-down', G.player.state === 'down');
      step(140);
      t('life-lost', G.lives === lives0 - 1);
      t('respawn', G.player.hp === G.player.maxhp && G.state === 'play');

      // ---- Act I: RICKSHAW RAJA + his breakable vehicle ----
      window.__game.skipToBoss(); G.player.x = G.camX + 230; step(3);
      t('boss-raja', !!G.boss && G.boss.key === 'raja');
      t('raja-has-rickshaw', !!G.boss && !!G.boss.cart && G.props.includes(G.boss.cart));
      if (G.boss && G.boss.cart) {
        G.boss.cart.hurt(999, 1);
        step(4);
        t('cart-breaks-disables-charge', G.boss.cartGone === true);
      }
      step(205);
      t('mirchi-intro-distinct', G.state === 'play');
      if (G.boss) G.boss.hurt(9999, 1, true, true);
      G.enemies.length = 0; G.spawnQueue = [];
      step(140);
      t('act1-clear', G.state === 'clear');
      step(200); debugPress('attack'); step(4); debugRelease('attack');
      t('clear-returns-to-hub', G.state === 'hub');
      t('clear-brings-home-a-relic', G.hubRelicKey === 'raja' && G.hubRelicT > 0);

      // ---- Act IV: station-integrated YADAV boss ----
      startStage(3); setState('play');
      window.__game.skipToBoss();
      G.player.x = G.stage.waves[G.stage.waves.length - 1].x + 2; step(3);
      t('boss-intro', G.state === 'bossintro' && !!G.boss);
      t('boss-is-yadav', G.boss.key === 'yadav');
      step(230);
      t('boss-fight', G.state === 'play');
      // his whistle summons constables
      G.enemies.length = 0;
      G.boss.state = 'whistle'; G.boss.t = 0; G.boss.whistles = 0;
      step(10);
      t('yadav-whistle-summons', G.enemies.length >= 1);
      G.enemies.length = 0;
      // enrage at half health
      G.boss.hurt(Math.ceil(G.boss.maxhp / 2) + 1, 1, false, false);
      t('boss-enrage', G.boss.enraged === true);
      G.boss.hurt(9999, 1, true, true);
      t('boss-dead', G.boss.dead === true);
      step(140);
      t('act2-clear', G.state === 'clear');

      // ---- Act V: storm-fort finale with COMMANDER RANA ----
      startStage(4); setState('play');
      window.__game.skipToBoss(); G.player.x = G.stage.waves[G.stage.waves.length - 1].x + 2; step(3);
      t('boss-is-rana', G.boss && G.boss.key === 'rana');
      step(250);
      if (G.boss) G.boss.hurt(9999, 1, true, true); step(150);
      t('act3-clear', G.state === 'clear');
      step(200); debugPress('attack'); step(2); debugRelease('attack'); step(20);
      t('ending', G.state === 'ending');

      // ---- game over path ----
      setState('play');
      G.boss = null; G.enemies.length = 0;
      G.lives = 0; G.player.hp = 1; G.player.dying = false;
      G.player.state = 'idle'; G.player.invuln = 0;
      hurtPlayer(G.player, 50, 1, true);
      step(140);
      t('game-over', G.state === 'over');
    } catch (err) {
      R.push('ERROR:' + (err && err.message));
    }
    document.title = R.join('|') || 'NO-RESULTS';
  } else if (autoMode === 'clear') {
    startAt(stageParam); window.__game.skipToBoss();
    G.player.x = G.camX + 160;
    step(220);
    G.boss.hurt(9999, 1, true, true);
    step(130); // -> stage clear tally
  } else if (autoMode === 'over') {
    startAt(stageParam);
    G.lives = 0; G.player.hp = 1;
    hurtPlayer(G.player, 50, 1, true);
    step(130); // -> game over / continue countdown
  } else if (autoMode === 'title') {
    setState('title');
    step(30);
  } else if (autoMode.startsWith('hub')) {
    // ?auto=hub[-<fixture id>] parks CHAD at that fixture with its panel open, plus
    // hub-bag (mid-punch), hub-window (the bag framed against the sunset) and hub-bed
    // (standing in the master suite while she shifts about and says something).
    enterHub(true);
    G.unlockedStage = parseInt(params.get('unlocked') || '2', 10) || 0;
    G.fade = 0;
    const where = autoMode.slice(4);
    const f = FIXTURES.find((x) => x.id === where);
    if (autoMode === 'hub-bag') {
      const bag = G.props[0];
      G.player.x = bag.x - 30; G.player.y = bag.y; step(3);
      debugPress('attack'); step(10); debugRelease('attack'); step(6);
    } else if (autoMode === 'hub-window') {
      G.player.x = 1000; G.player.y = 232; step(30);
    } else if (autoMode === 'hub-bed') {
      // not a fixture and not a reaction - just park him there and let her talk
      G.player.x = BED_X - 110; G.player.y = 236;
      hubSay('you already won, big guy');
      step(20);
    } else if (f) {
      G.player.x = f.x; step(3);
      debugPress('use'); step(2); debugRelease('use'); step(20);
    } else {
      step(40);
    }
  }
}
}
