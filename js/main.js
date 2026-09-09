import { updateResults } from './results.js';
import { bossIntroDialogue, updateDialogue } from './room_dialogue.js';
import { captureIndiaBossCheckpoint, restoreIndiaCheckpoint } from './india_checkpoints.js';
import { queueOfficeWorker } from './india_office.js';
import { INDIA_AREAS, updateIndia, updateIndiaIntro, drawIndiaIntro, drawIndiaCard, drawIndiaPerformance } from './india_stage.js';
import { INDIA_FINISHERS } from './india_cinematics.js';
import { drawContactShadow } from './contact_shadow.js';
import { readProgress, writeProgress } from './progress.js';
import { startElevatorRide, beginTravel, clearTravel, updateTravel, drawTravel, loadTravel, travelReady, drawTravelLoading, TRAVEL_PHASES, TRAVEL_DURATIONS } from './travel.js';
// main.js - boot, fixed-timestep loop, game state machine, rendering, debug hook
import { G, W, H, RS, STEP, DIFF, METER_MAX, FLOOR_TOP, FLOOR_BOT, RANKS, clamp, addScore, laneMin, laneMax, arenaMin, arenaMax } from './engine.js';
import { initInput, input, endFrameInput, pollGamepad, debugPress, debugRelease, debugResetInput } from './input.js';
import { SPR, drawTextShadow, textWidth, blit, frameW, frameH } from './sprites.js';
import { initStage, initStageObj, drawStage, updateMotes, STAGES, stageDef } from './stages.js';
import { HUB_STAGE, CHAPTERS, FIXTURES, RELIC_SLOTS, BED_X, hubBed, hubSay, hubTiger, petsWatch, hubTank, createBag, resetHub, updateHub, drawHubWall, drawHubUI } from './hub.js';
import { createProp } from './props.js';
import { loadAmbience, updateAmbience, reactStage, updateShutters, shutterState } from './ambience.js';
import { loadCrowd, updateCrowd } from './crowd.js';
import { loadFX, fx } from './fx.js';
import { loadFG, drawFG } from './fg.js';
import { createPlayer, updatePlayer, drawPlayer, hurtPlayer } from './player.js';
import { spawnEnemy, updateEnemies, drawEnemy, aliveEnemies } from './enemies.js';
import { createBoss, updateBoss, drawBoss, BOSSES } from './bosses.js';
import { delhiIntro } from './delhi_bosses.js';
import { drawFinale, FINALE_TICKS } from './train_finale.js';
import { resetTrainVista } from './train_vistas.js';
import { updateTrain, updateTrainMotion, drawTrainOverlay, startTrainCinematic, restoreTrainCheckpoint, TRAIN_AREAS, ABOARD_X, ROOF_X, vistaTargetFor } from './train.js';
import { updateShots, drawShots, drawZones, spawnShot, spawnZone } from './shots.js';
import { updateProps, drawProp, PROP_TYPES } from './props.js';
import { updateEffects, drawEffects, drawRagnarokGround, spawnPop, spawnSteam } from './effects.js';
import { drawHUD, drawPause } from './hud.js';
import { titleReady, drawWelcome, drawTitle, drawIntro, drawBossIntro, drawClear, drawOver, drawEnding } from './screens.js';
import { audio, loadManifest, loadSFX } from './audio.js';
import { loadAssets } from './assets.js';
import { loadAIFrames } from './aiframes.js';
import { ENTRANCE_LAST_FRAME, STATION_LAST_FRAME, loadStory, resetStory, updateMotorcycleArrival, finishMotorcycleArrival, drawMotorcycleArrival, updateStationArrival, drawStationArrival } from './story.js';

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
const manifestReady = loadManifest();
let welcomeRequested=false,titleInputGate=false;
function activateWelcome() {
  if(G.state==='boot')return;
  audio.unlock();
  if(G.state==='welcome')welcomeRequested=true;
}
window.addEventListener('keydown', e => {
  if(!e.repeat&&!['Shift','Control','Alt','Meta','CapsLock','Tab'].includes(e.key))activateWelcome();
});
canvas.addEventListener('pointerdown', e => {if(e.button===0)activateWelcome();});

// ---- persistence ----
const SAVE_KEY = 'gigachadworldtour.save';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (typeof s.hiscore === 'number') G.hiscore = s.hiscore;
    Object.assign(G, readProgress(s, STAGES));
    if (typeof s.bestComboAll === 'number') G.bestComboAll = s.bestComboAll;
    G.selectedStage = G.unlockedStage;
  } catch (e) { /* first run */ }
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(writeProgress(G, STAGES)));
  } catch (e) { /* private mode */ }
}

// ---- state transitions ----
function setState(s) {
  if(s==='title'){G.train=null;G.india=null;}
  if (s === 'clear') { G.results=null; clearSaved = false; clearJinglePlayed = false; trainClearUseReady = false; } // one save and one sting per tally
  G.transition = null;   // a direct change of scene cancels a cut that was on its way
  G.state = s; G.stateT = G.rawTime;
}

// Every change of scene goes out through black: the picture darkens over `dur`
// frames with the world frozen, `then` builds the next scene, and G.fade brings it up.
// One owner of the cut, so no state has to know how another one starts.
function transitionTo(then, dur = 26) {
  if (G.transition) return;
  G.transition = { t: 0, dur, then };
}

function goTitle() {
  clearTravel();
  audio.stopSamples();
  audio.fadeMusic(0.4);
  transitionTo(() => { setState('title'); audio.music('title'); }, 24);
}

function resetRun() {
  G.score = 0;
  G.lives = DIFF.lives;
  G.stageIndex = G.selectedStage || 0;
  G.meter = 0;
  G.stats = { hits: 0, kos: 0 };
  G.bestCombo = 0;
}

function startStage(index, silent = false) {
  clearTravel();
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
  setState(st.chapter?'chapter-card':'intro');
  audio.music(silent||st.chapter ? null : st.music);
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
let clearSaved = false;  // the STAGE CLEAR tally writes the save once, on arrival
let clearJinglePlayed = false;
let trainClearUseReady = false;

function enterHub(fresh) {
  clearTravel();
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
  G.rank = -1; G.rankT = 0;
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
  audio.music(G.hubTrack || HUB_STAGE.music);
}

function spawnFromQueue() {
  if (!G.spawnQueue || !G.spawnQueue.length) return;
  const visibleCap=G.stage.chapter?(G.stage.waves[G.waveIndex]?.visibleCap||6):6;
  if (aliveEnemies()+(G.india?.pendingEntries||0) >= visibleCap) return;
  if (G.spawnCd > 0) return;
  const type = G.spawnQueue.shift();
  if(queueOfficeWorker(type)){G.spawnCd=36;return;}
  const fromLeft = (G.spawnSide = !G.spawnSide);

  // just inside the arena edge: they run in rather than trudging on from off-screen
  const x = fromLeft ? G.camX + 18 : G.camX + W - 18;
  const lo = laneMin(x);
  const y = lo + Math.random() * (laneMax(x) - lo);
  const e = spawnEnemy(type, x, y);
  G.spawnCd = 36;
}

// A route milestone selects the second track. Repeated calls preserve playback.
function stageTrack() {
  const st = G.stage;
  if (!st.musicB) return st.music;
  return G.camX >= st.musicBX ? st.musicB : st.music;
}

// Route beats fire once when the player crosses their milestone.
function updateEvents() {
  const p = G.player;
  for (const ev of (G.stage.events || [])) {
    if (ev.done || p.x < ev.x) continue;
    ev.done = true;
    if (ev.kind === 'music') audio.music(ev.slot);
    else if (ev.kind === 'bull') spawnEnemy('bull', G.camX + W - 20, p.y);
    else if (ev.kind === 'crane') { G.shake = Math.max(G.shake, 5); audio.sfx('enrage'); }
    // THE NIGHT TRAIN
    else if (ev.kind === 'whistle') { audio.sfx('go'); G.shake = Math.max(G.shake, 2); }
  }
}

function updateWaves() {
  const p = G.player;
  const waves = G.stage.waves;
  if (G.spawnCd > 0) G.spawnCd--;
  updateEvents();
  if (!G.waveActive) {
    const next = waves[G.waveIndex + 1];
    if (next && p.x >= next.x) {
      G.waveIndex++;
      if (next.boss) {
        if(G.train){G.train.checkpoint=next.x;G.train.checkpointScore=G.score;}
        G.locked = true;
        G.camLock = clamp(next.camX ?? next.x - 60, 0, G.camMax);
        captureIndiaBossCheckpoint(next, G.stage.boss);
        const boss = createBoss(G.stage.boss, G.camLock + W - 40, 211);
        if (G.stage.chapter && boss.key === 'closer') {
          spawnEnemy('ic_security', G.camLock + 325, clamp(234, laneMin(G.camLock + 325), laneMax(G.camLock + 325)));
        }
        if (boss.def.cart) {
          boss.cart = createProp('cart', boss.x - 34, boss.y + 7);
          boss.cart.onBreak = () => { boss.cartGone = true; };
          G.props.push(boss.cart);
        }
        setState('bossintro');
        if(G.train?.retryBoss&&boss.key==='vikram')G.stateT-=240;
        G.fade = 0.85;
        G.shake = 6;
        audio.sfx('enrage');
        // the theme starts ON the reveal, not after the card
        audio.music(G.stage.bossMusicFinal || G.stage.bossMusic);
        if (G.stage.boss === 'refund') audio.voice('duke_back_to_work', 1800);
      } else {
        next.done = true;
        G.waveActive = true;
        G.locked = true;
        // A boss arena is designed before the boss, so a fight that has one pins the
        // camera there rather than wherever the player happened to stop walking.
        G.camLock = clamp(next.camX === undefined ? G.camX : next.camX, G.camX, G.camMax);
        G.spawnQueue = [...next.spawns];
        G.spawnCd = 0;
        if(G.india){G.india.reserveWave=G.waveIndex;G.india.reserveIndex=0;}
        // The runner got away last time, so this wave is two men heavier. The
        // consequence lands a gate late, which is what makes it a decision.
        if (G.runnerEscaped) { G.spawnQueue.push('goonda', 'goonda'); G.runnerEscaped = false; }
        if (next.runner) {
          const r = spawnEnemy(next.runner, G.camX - 30, laneMin(G.camX) + 30);
          r.face = 1;

        }
        if (next.bull) spawnEnemy('bull', G.camX + W - 20, p.y);
        if (next.miniboss) {
          captureIndiaBossCheckpoint(next, next.miniboss);
          const b = createBoss(next.miniboss, G.camLock + W - 40, 211);
          // BOSSES entries carry `mini` now, but a wave can still force it: checkBossClear
          // would otherwise take the full-boss branch and end the act when one died.
          b.mini = true;
          audio.sfx('enrage');
          if(next.miniboss!=='conductor')audio.music(G.stage.bossMusic);
          // A miniboss with a designed arena gets a real reveal, and the wave state is
          // parked across it: bossintro used to belong to the terminal boss alone, which
          // assumed the fight it was introducing ended the act.
          if (next.intro) {
            G.introResume = { waveActive: true, locked: true };
            setState('bossintro');
            G.fade = 0.7;
            G.shake = 5;
          } else {
            spawnPop(G.camX + W / 2, 84, b.def.name + ' APPEARS');
          }
        } else {
          audio.sfx('blip');
          if (G.waveIndex === 0 && !G.stage.introVoice) audio.voice('duke_come_get_some', 1200);
        }
      }
    }
  } else {
    const current=waves[G.waveIndex];
    if(G.india&&G.india.reserveWave!==G.waveIndex){G.india.reserveWave=G.waveIndex;G.india.reserveIndex=0;}
    if(G.stage.chapter&&current?.reserves?.length&&!G.spawnQueue.length&&
      aliveEnemies()+(G.india?.pendingEntries||0)<=2&&G.india.reserveIndex<current.reserves.length){
      G.spawnQueue=[...current.reserves[G.india.reserveIndex++]];
      G.spawnCd=0;
    }
    spawnFromQueue();
    const bossBusy = G.boss && !G.boss.removeMe;
    const reservesPending=G.stage.chapter&&G.india.reserveIndex<(current?.reserves?.length||0);
    if (!G.spawnQueue.length && aliveEnemies() === 0 && !bossBusy && !(G.india?.pendingEntries>0)&&!reservesPending) {
      G.waveActive = false;
      G.locked = false;
      if(G.stage.chapter&&current?.recovery){
        const given=G.india.recoveryWaves||(G.india.recoveryWaves=new Set());
        if(!given.has(G.waveIndex)){
          given.add(G.waveIndex);
          const x=clamp(p.x+44,G.camX+36,G.camX+W-28);
          G.pickups.push({x,y:laneMax(x)-2,kind:'shake',heal:current.recovery,t:0,indiaRecovery:G.waveIndex});
        }
      }
      G.arenaSqueezeTarget = 0;   // belt and braces: a fight ending any other way still lets go
      G.goTimer = 200;
      audio.sfx('go');
      addScore(50);
      if (G.stage.music) audio.music(stageTrack());
    }
  }
  if (G.goTimer > 0) G.goTimer--;
  // One owner of the number, many writers of the target. A fight that drove the walls
  // directly would fight its own release for as long as it took to die, and 0.6 px a
  // frame is what makes a crowd WALK inward rather than snap.
  const sq = G.arenaSqueezeTarget - G.arenaSqueeze;
  if (sq) G.arenaSqueeze += clamp(sq, -0.6, 0.6);
  if (G.ringWobble > 0) G.ringWobble--;
  // camera: forward-only scroll, locked during waves
  if (!G.locked) {
    G.camX = clamp(Math.max(G.camX, p.x - 255), 0, G.camMax);
  } else {
    G.camX = clamp(G.camX, 0, G.camLock);
  }
  // The coach interior belongs to the boarding transition. Do not reveal its
  // cutaway next to the platform while CHAD is still waiting outside.
  if(G.stage.id==='train'&&G.train)G.camX=G.train.climbed?Math.max(ROOF_X,G.camX):Math.min(G.camX,(G.train.aboard?ROOF_X:ABOARD_X)-W);
}

function updatePickups() {
  const p = G.player;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const pk = G.pickups[i];
    pk.t++;
    // A 1-up you can lose to a timer is worse than no 1-up, and one you cannot take
    // at full health is one a good run never gets to keep.
    const life = pk.kind === 'life';
    if (!life && pk.t > 600) { G.pickups.splice(i, 1); continue; }
    const usable = life || p.hp < p.maxhp;
    if (Math.abs(p.x - pk.x) < 11 && Math.abs(p.y - pk.y) < 9 && p.z < 8 && usable) {
      if (life) {
        if(G.train&&!G.train.claimedLives.includes(pk.x))G.train.claimedLives.push(pk.x);
        G.lives++;
        spawnPop(pk.x, pk.y - 24, '1UP');
        audio.jingle('oneup');
        addScore(2000);
      } else {
        p.hp = Math.min(p.maxhp, p.hp + pk.heal);
        spawnPop(pk.x, pk.y - 20, '+' + pk.heal);
        audio.sfx('pickup');
        addScore(50);
      }
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
      if(G.train)restoreTrainCheckpoint();
      else if(G.india)restoreIndiaCheckpoint();
    } else {
      p.state = 'dead';
      G.continueT = 9 * 60 + 59;
      setState('over');
      audio.music(null);
      audio.jingle('gameover');
      audio.voice('duke_game_over', 2400, true);
      persist();
    }
  }
}

function checkBossClear() {
  const b = G.boss;
  if (!b || !b.dead || G.state !== 'play') return;
  if(G.india&&(G.player.dying||G.player.hp<=0))return;
  if(b.finishStarted&&(G.india?.cinematic||G.india?.pendingFinisher))return;
  if (b.mini) {
    if (b.t > 60) {
      G.boss = null;
      G.arenaSqueezeTarget = 0;
      addScore(500);
    }
    return;
  }
  if(b.key==='vikram'&&!G.train.endingDone){if(!G.train.cinematic)startTrainCinematic('escape');return;}
  if (b.t > 70) {
    if (!b.victoryLine) {
      b.victoryLine = true;
      // urgent: a combo callout must not swallow the act's last word
      if (b.key === 'dredger'&&!b.finishStarted) audio.voice('duke_gotta_hurt', 1600, true);
      else if (b.key === 'yadav') audio.voice('duke_book_em', 1600, true);
      else if (b.key === 'rana') audio.voice('duke_hail', 1800, true);
    }
    G.clearStats = {
      hits: G.stats.hits, kos: G.stats.kos,
      bonus: G.lives * 500, combo: G.bestCombo,
    };
    addScore(G.lives * 500 + G.bestCombo * 25);
    G.player.state = 'victory';
    setState('clear');
    audio.music(null);
    if(G.stage.id!=='train'&&!G.stage.chapter){audio.jingle('clear');clearJinglePlayed=true;persist();}
  }
}

// The menu owns input during gameplay, including panels and transitions.
let menuGate = false;
function resumeMenu() { G.paused = false; audio.setPaused(false); menuGate = true; }
function updateMenu() {
  if (G.state === 'title' || G.state === 'welcome') return false;
  if (input.pressed('pause')) {
    if (G.paused) resumeMenu();
    else { G.paused = true; G.menuIndex = 0; audio.setPaused(true); }
    return true;
  }
  if (!G.paused) return false;
  if (input.pressed('up') || input.pressed('down')) G.menuIndex = 1 - (G.menuIndex || 0);
  const pointer = input.pointerPressed();
  if (pointer && pointer.x * W >= 130 && pointer.x * W <= 350) {
    const y = pointer.y * H;
    if (y >= 109 && y < 139) { G.menuIndex = 0; resumeMenu(); return true; }
    if (y >= 143 && y < 173) { resumeMenu(); goTitle(); return true; }
  }
  if (input.pressed('attack') || input.pressed('use')) {
    const quit = G.menuIndex === 1; resumeMenu(); if (quit) goTitle();
  } else if (input.pressed('back')) { resumeMenu(); goTitle(); }
  return true;
}
// ---- fixed update ----
function update() {
  if (G.freezeTime) return false;
  pollGamepad();
  if(G.state==='welcome') {
    G.rawTime++;
    const padPress=Array.from(navigator.getGamepads?.()||[]).some(p=>p?.connected&&p.buttons.some(b=>b.pressed||b.value>.5));
    if(welcomeRequested||padPress) {
      welcomeRequested=false;audio.unlock();setState('title');G.rawTime=0;G.stateT=0;
      titleInputGate=true;audio.music('title');
    }
    return;
  }
  if(titleInputGate) {
    const held=['attack','use','jump','parry','super','pause','back','left','right','up','down'].some(a=>input.held(a));
    if(held)return;
    titleInputGate=false;return;
  }
  if (updateMenu()) return;
  if (menuGate) {
    if (['attack','use','jump','parry','super','pause'].some(a => input.held(a))) return;
    menuGate = false;
  }
  G.rawTime++;
  if(G.stage?.id==='train'&&['play','bossintro'].includes(G.state))updateTrainMotion();
  if (G.fade > 0 && !G.paused) G.fade = Math.max(0, G.fade - 0.06);
  if (G.transition) {
    const tr = G.transition;
    if (++tr.t >= tr.dur) { G.transition = null; tr.then(); G.fade = 1; }
    return;
  }

  if (G.state === 'title') {
    if (input.pressed('attack')) {
      audio.unlock();
      audio.sfx('blip');
      audio.fadeMusic(0.4);
      transitionTo(() => enterHub(true), 24);
    }
    return;
  }
  if (G.state === 'hub') {
    if (G.hitstop > 0) { G.hitstop--; return false; }
    G.time++;
    if (G.comboT > 0 && --G.comboT === 0) { G.combo = 0; G.rank = -1; }
    // The play camera only ever scrolls forward; in a room you have to walk back.
    // It runs before the player because clampToArena derives the room's walls from
    // it, and a camera that lags the body by a frame pins him against a stale wall.
    G.camX = clamp(G.player.x - W / 2, 0, G.camMax);
    const panelOpen = !!G.hubPanel;
    // BACKSPACE backs out of a panel or leaves the room for the title; ESC pauses
    if (!panelOpen && !G.hubSeat && input.pressed('back')) { audio.sfx('blip'); goTitle(); return; }
    const pick = updateHub();
    // A panel owns the buttons while it is up, and keeps them until they are let go.
    // Without the latch, C to back out also throws a parry whose recovery eats the
    // next punch.
    if (panelOpen && !G.hubPanel) hubGate = true;
    if (hubGate && !['parry', 'jump', 'attack', 'use'].some((a) => input.held(a))) hubGate = false;
    if (!panelOpen && !G.hubPanel && !hubGate && !G.hubSeat) updatePlayer(G.player);
    updateProps();
    updateEffects();
    updateMotes();
    updateAmbience();
    updateCrowd();
    if (pick >= 0) {
      if (STAGES[pick].departureRoute) {
        G.pendingDestination = pick;
        audio.destinationSelected();
        hubGate = true;
        loadTravel();
      } else {
        audio.sfx('go');
        G.pendingDestination = null;
        audio.fadeMusic(0.5);
        transitionTo(() => { G.meter = hubMeter; startStage(pick); }, 34);
      }
    }
    if (G.departureRequested) {
      const target = G.pendingDestination;
      G.departureRequested = false;
      transitionTo(() => { beginTravel(target); setState('travel'); }, 26);
    }
    return;
  }
  if (G.state === 'travel' || G.state === 'loading') {
    G.time++;
    if (G.state === 'travel') {
      if (updateTravel()) {
        const target = G.travel.targetStage;
        transitionTo(() => {
          G.meter = hubMeter;
          startStage(target, true); // prepare the actual level before the loading card becomes ready
          G.loadingAge = 0; G.loadingGate = true;
          setState('loading');
        }, 30);
      }
    } else {
      if (!input.held('use')) G.loadingGate = false;
      if (travelReady) G.loadingAge++;
      if (travelReady && !G.loadingGate && input.pressed('use')) {
        transitionTo(() => { resetStory(); setState('intro'); audio.music(G.stage.music); }, 24);
      }
    }
    return;
  }
  if(G.state==='chapter-card'){
    if(!input.held('use'))G.india.cardReleased=true;
    if(G.india.cardReleased&&input.pressed('use')){setState('intro');G.audio.music(G.stage.music);}
    return;
  }
  if (G.state === 'intro') {
    const introT = G.rawTime - G.stateT;
    const station = G.stage.id === 'train';
    if(G.stage.chapter){updateIndiaIntro(introT);updateEffects();if(introT>=G.stage.introTicks){G.player.state='idle';G.player.invuln=90;G.player.invulnFlashAfter=G.time+90;setState('play');}return;}
    if (G.stage.arrival === 'motorcycle') updateMotorcycleArrival(introT);
    else if (station) { updateStationArrival(introT); updateEffects(); }
    const introLife = G.stage.arrival === 'motorcycle' ? ENTRANCE_LAST_FRAME : station ? STATION_LAST_FRAME : 130;
    if (G.rawTime - G.stateT > introLife || input.pressed('attack')) {
      if (station) { updateStationArrival(STATION_LAST_FRAME); G.effects.length = 0; }
      // Skipping has to land on the same picture as finishing: the man standing by the
      // parked bike, engine off (it loops, and nothing else ever stops it).
      if (G.stage.arrival === 'motorcycle') finishMotorcycleArrival();
      else audio.stopEntranceBike();
      setState('play'); G.fade = 1;
    }
    return;
  }
  if (G.state === 'bossintro') {
    // updateEffects is the only thing that decays shake and this branch returns before it,
    // so the 6 set on entry used to jitter the whole intro from end to end.
    if (G.shake > 0) { G.shake *= 0.85; if (G.shake < 0.3) G.shake = 0; }
    const t = G.rawTime - G.stateT;
    const b = G.boss;
    const speech=bossIntroDialogue(b,t,G.camX);
    if(speech)updateDialogue(speech.text,speech.age,speech);
    // The arena was designed at camLock; the camera arrives there during the reveal
    // rather than staying wherever the player happened to trip the gate.
    if (G.camX < G.camLock) G.camX = Math.min(G.camLock, G.camX + 1.5);
    if (b && !delhiIntro(b, t)) {
      const stop = G.camX + (b.key === 'rana' ? 350 : 320);
      const startAt = b.key === 'rana' ? 90 : 28;
      if (t > startAt && b.x > stop) b.x -= b.key === 'yadav' ? 1.25 : 0.9;
      if (b.key === 'rana' && (t === 52 || t === 132)) audio.sfx('heavy');
    }
    const life = b && b.key === 'conductor' ? 300 : b && b.key === 'vikram' ? 315 : b && b.key === 'rana' ? 230 : b && b.key === 'yadav' ? 210 : 195;
    if (t >= life || (b?.key!=='conductor' && t > 75 && input.pressed('attack'))) {
      if(b?.key==='conductor'){Object.assign(b,{x:5935,y:218,face:-1,state:'idle',t:0,atkCd:60});}
      if(b?.key==='vikram'){b.x=G.camLock+364;b.y=218;b.face=-1;b.state='idle';b.t=0;b.atkCd=60;}
      setState('play');
      // A miniboss reveal has a wave running behind it and has to hand that back; the
      // terminal boss does not, and its music is the level's own rather than the shared
      // one every miniboss and mid-boss shares.
      if (G.introResume) {
        G.waveActive = G.introResume.waveActive;
        G.locked = G.introResume.locked;
        G.introResume = null;
        if(b?.key!=='conductor')audio.music(G.stage.bossMusic);
      } else {
        audio.music(b?.key==='conductor'?stageTrack():(G.stage.bossMusicFinal || G.stage.bossMusic));
      }
    }
    return;
  }
  if (G.state === 'clear') {
    const trainClear=G.stage?.id==='train'||G.stage?.chapter,clearT=G.rawTime-G.stateT;
    updateResults(clearT);
    if(trainClear&&clearT>=45&&!clearJinglePlayed){clearJinglePlayed=true;audio.jingle('clear');}
    // Require a release after the tally is ready, followed by a new F/LB edge.
    if(trainClear&&clearT>=195&&!input.held('use'))trainClearUseReady=true;
    // Once, on arrival. This ran every frame the tally was on screen, so walking away from
    // a cleared act wrote localStorage 60 times a second until you came back.
    if (!clearSaved) {
      clearSaved = true;
      G.unlockedStage = Math.max(G.unlockedStage, Math.min(STAGES.length - 1, G.stageIndex + 1));
      G.selectedStage = G.unlockedStage;
      // the lair's records panel reads these; a run only ever raises them
      G.bestComboAll = Math.max(G.bestComboAll, G.bestCombo);
      G.actBest[G.stageIndex] = Math.max(G.actBest[G.stageIndex] || 0, G.score);
      persist();
    }
    if (trainClear ? (clearT>=195&&trainClearUseReady&&input.pressed('use')) : (clearT>150&&input.pressed('attack'))) {
      if(trainClear){audio.stopRoomAudio?.();audio.stopSamples?.();}
      audio.sfx('blip');
      // The tally promises the next act, so the next act is what comes: straight on,
      // the arcade way. The lair is home after the tour's last act. The ENDING belongs
      // to the act flagged as the finale, not to whichever act is last in the array.
      const st = STAGES[G.stageIndex];
      if (st.final) transitionTo(() => { setState('ending'); audio.music('ending'); }, 30);
      else if (G.stageIndex + 1 < STAGES.length) transitionTo(() => startStage(G.stageIndex + 1), 30);
      else transitionTo(() => enterHub(false), 30);
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
      audio.sfx('blip');
      if(G.train)restoreTrainCheckpoint();
      else if(G.india)restoreIndiaCheckpoint();
      transitionTo(() => {
        setState('play');
        audio.music(G.boss && !G.boss.dead
          ? (G.boss.key==='conductor' ? stageTrack() : G.boss.mini ? G.stage.bossMusic : (G.stage.bossMusicFinal || G.stage.bossMusic))
          : stageTrack());
      }, 20);
      return;
    }
    if (G.continueT <= 0) goTitle();   // the clock ran out: the attract loop, not the lounge
    return;
  }

  // state === 'play'
  if (G.hitstop > 0) { G.hitstop--; return false; } // input persists through hitstop (buffering)
  if (G.slowmo > 0) { G.slowmo--; if (G.slowmo & 1) return false; }
  if (G.parrySlow > 0) {
    G.parrySlow--;
    if (G.parrySlow & 1) return false;
  }
  G.time++;
  if (G.comboT > 0 && --G.comboT === 0) { G.combo = 0; G.rank = -1; }
  if (G.rankT > 0) G.rankT--;

  // the cut onto the train holds the world still for a second of black
  if (updateTrain()) { if(G.train?.endingDone)checkBossClear(); return; }
  if(updateIndia()){updateEffects();checkBossClear();return;}
  updatePlayer(G.player);
  updateProps();
  updateEnemies();
  if (G.boss) updateBoss();
  updateShots();
  updateEffects();
  updateMotes();
  updateAmbience();
  updateCrowd();
  updateShutters();
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
  drawContactShadow(ctx, e.x - camX, e.y, e.shadowR || 14, e.z || 0);
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
    case 'welcome': drawWelcome(ctx); break;
    case 'title': drawTitle(ctx); break;
    case 'hub':
      drawStage(ctx, G.camX);
      drawHubWall(ctx, G.camX);   // posters are wall, so you can stand in front of them
      drawWorld(ctx);
      drawFG(ctx, G.camX);
      drawHubUI(ctx);

      break;
    case 'travel':
      drawTravel(ctx);

      break;
    case 'loading':
      drawTravelLoading(ctx, travelReady);

      break;
    case 'chapter-card':drawIndiaCard(ctx);break;
    case 'intro':
      if(G.stage.chapter){drawIndiaIntro(ctx,G.rawTime-G.stateT);if(G.india?.review.fx!==false)drawEffects(ctx,G.camX);break;}
      if (G.stage.arrival === 'motorcycle') drawMotorcycleArrival(ctx);
      else if (G.stage.id === 'train') drawStationArrival(ctx);
      else drawIntro(ctx);
      if (G.rawTime - G.stateT > 90 && ((G.rawTime >> 5) & 1)) drawTextShadow(ctx, 'Z: SKIP', W - textWidth('Z: SKIP', 1) - 8, H - 12, '#a89ab8', 1);
      break;
    case 'bossintro': drawBossIntro(ctx, G.camX); break;
    case 'clear':
      if(G.stage?.id==='train'){drawFinale(ctx,FINALE_TICKS);}
      else {
        drawStage(ctx, G.camX);
        drawWorld(ctx);
        drawFG(ctx, G.camX);
        drawTrainOverlay(ctx, G.camX);
        if(G.stage.chapter)drawIndiaPerformance(ctx);
      }
      drawClear(ctx);
      break;
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
      drawTrainOverlay(ctx, G.camX);
      ctx.restore();
      drawIndiaPerformance(ctx);
      if(!G.train?.cinematic&&!G.india?.cinematic)drawHUD(ctx);

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
    if (!G.paused) c.t++;
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
  if (G.transition) {
    ctx.setTransform(RS, 0, 0, RS, 0, 0);
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, G.transition.t / G.transition.dur)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.paused) { ctx.setTransform(RS, 0, 0, RS, 0, 0); drawPause(ctx); }
}

function drawWorld(ctx) {
  const camX = G.camX;
  // lingering floor hazards go under everything else
  drawZones(ctx, camX);
  drawRagnarokGround(ctx, camX);
  // pickups: real objects now - a chilli, a lassi, a plate of chaat - instead of a
  // strobing orange square and a grey disc.
  for (const pk of G.pickups) {
    const bob = Math.sin(pk.t * 0.1) * 2;
    const name = pk.kind === 'shake' ? 'pick_lassi' : 'pick_chaat';
    const img = fx(name, 0);
    const x = Math.round(pk.x - camX);
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
  for (const e of G.enemies) if (!['bandar', 'bull'].includes(e.kind)) drawShadow(ctx, e, camX);
  if (G.boss && !G.boss.removeMe) drawShadow(ctx, G.boss, camX);
  // y-sorted entities (props included, so you can stand behind a crate). G.actors is
  // scenery that draws itself - the lair's tiger - and CHAD drops out of the list while
  // he is sat on the sofa, because the seated art draws him.
  const ents = [...G.enemies, ...(G.india?.review.props===false?[]:G.props), ...G.actors];
  if (!G.hubSeat&&!G.india?.cinematic&&!G.india?.finalPose) ents.push(G.player);
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
  if(G.india?.review.fx!==false)drawEffects(ctx, camX);
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
Promise.all([manifestReady, titleReady, loadAssets(), loadAIFrames(), loadSFX(), loadFX(), loadFG(), loadAmbience(), loadCrowd(), loadStory(), location.search.includes('auto=') ? loadTravel() : Promise.resolve()]).then(() => {
  initStage(0); // build background layers + motes so the title can scroll them
  const scripted = location.search.includes('auto=');
  setState(scripted ? 'title' : 'welcome');
  if(scripted)audio.music('title');
  requestAnimationFrame(frame);
  runAuto();
});

// ---- debug / test hook ----
window.__game = {
  G, BOSSES, STAGES,
  indiaScene:(id='delhi',name='market',t=0)=>{
    audio.stopSamples();audio.stopRoomAudio();debugResetInput();resetRun();
    startStage(STAGES.findIndex(s=>s.id===id));setState('play');G.freezeTime=true;
    G.fade=G.shake=G.hitstop=G.slowmo=G.parrySlow=0;G.enemies=[];G.spawnQueue=[];
    G.waveIndex=G.stage.waves.length-1;G.waveActive=false;G.locked=false;
    const ix=Math.max(0,INDIA_AREAS[id].indexOf(name));G.camX=Math.min(ix*810,G.camMax);
    G.player.x=G.camX+150;G.player.y=236;G.india.t=t;
    if(name==='intro'){setState('intro');G.stateT=G.rawTime-t;for(let i=0;i<=t;i++){updateIndiaIntro(i);updateEffects();}}
    if(name==='card')setState('chapter-card');
    if(['vendor','closer','dredger','vendor-finish','dredger-finish','closer-finish','finish','clear'].includes(name)){
      const cinematic=name.endsWith('-finish')||name==='finish';
      const key=name==='finish'||name==='clear'?(id==='refund'?'closer':'dredger'):name.replace('-finish','');
      G.camLock=key==='vendor'?2670:key==='closer'?5900:6000;G.camX=G.camLock;
      G.player.x=G.camX+90;G.boss=createBoss(key,G.camX+270,226);G.locked=true;G.boss.mini=key==='vendor';
      if(cinematic||name==='clear'){
        if(key==='dredger')G.boss.delhi.operatorPhase(G.boss);
        G.boss.hp=0;G.boss.dead=true;G.boss.finishStarted=G.india.startCinematic(key+'-finish',G.boss);
        const limit=INDIA_FINISHERS[key+'-finish'].ticks;
        for(let i=0;i<Math.min(name==='clear'?limit:t,limit);i++){updateIndia();updateEffects();}
      }
      if(name==='clear'){
        G.clearStats={hits:G.stats.hits,kos:G.stats.kos,bonus:G.lives*500,combo:G.bestCombo};setState('clear');G.stateT=G.rawTime-t;
      }
    }
    render();
  },
  playStage:(id='delhi')=>{resetRun();startStage(STAGES.findIndex(s=>s.id===id));G.freezeTime=false;},
  trainScene: (name='yard',t=0) => {
    audio.stopSamples();audio.stopRoomAudio();debugResetInput();resetRun();startStage(0);setState('play');G.fade=0;G.shake=0;G.hitstop=0;G.slowmo=0;G.parrySlow=0;G.freezeTime=true;
    G.enemies=[];G.spawnQueue=[];G.waveIndex=G.stage.waves.length-1;G.waveActive=false;G.locked=false;
    const area=TRAIN_AREAS.find(a=>a[0]===name);
    if(area){G.camX=area[1];G.player.x=area[1]+140;G.train.aboard=area[1]>=ABOARD_X;G.train.climbed=name==='roof';if(name==='roof')G.player.y=210;G.train.scene=area[1]>=7200?2:area[1]>=4320?1:0;G.train.t=t;G.train.distance=t*2.6;if(name==='platform')G.train.arrival=t;}
    else if(name==='train-arrival'){G.train.arrival=t;G.camX=2400;G.player.x=2650;G.train.t=t;}
    else if(name==='intro'){setState('intro');G.stateT=G.rawTime-t;updateStationArrival(t);}
    else if(name==='knockout'){G.camX=G.camLock=8640;G.player.x=8820;G.player.y=218;G.train.aboard=G.train.climbed=true;const b=createBoss('vikram',8860,218);b.roof=b.dead=true;b.hp=0;G.train.knockoutBody=true;startTrainCinematic('knockout');G.train.cinematic.t=t;}
    else if(['boarding','roof-transition','escape'].includes(name)){G.train.aboard=name!=='boarding';G.train.scene=2;startTrainCinematic(name==='roof-transition'?'roof':name);G.train.cinematic.t=t;if(name==='roof-transition')Object.assign(G.train.cinematic,{fromX:7920,fromY:218,fromCam:7680,fromBossX:7996,fromBossY:218});if(name==='boarding'){G.train.arrival=240;G.camX=2400;Object.assign(G.train.cinematic,{fromX:2705,fromY:218,fromCam:2400});}}
    else if(name==='clear'){G.train.aboard=true;G.train.endingDone=true;G.train.cinematic={kind:'escape',t:FINALE_TICKS};G.clearStats={hits:G.stats.hits,kos:G.stats.kos,bonus:G.lives*500,combo:G.bestCombo};setState('clear');G.stateT=G.rawTime-t;}
    else if(name==='conductor'){audio.music(G.stage.musicB||G.stage.music);G.camX=G.camLock=5760;G.player.x=5850;G.train.aboard=true;createBoss('conductor',6100,218);G.locked=true;setState('bossintro');}
    else if(name==='seth-intro'){G.camX=G.camLock=7680;G.player.x=7950;G.player.y=218;G.train.aboard=true;createBoss('vikram',8120,218);G.locked=true;setState('bossintro');}
    else if(name==='roof-guards'){G.camX=G.camLock=8160;G.player.x=8265;G.train.aboard=G.train.climbed=true;const b=createBoss('vikram',9010,218);b.roof=b.trainWaiting=true;b.set=SPR.nr_vikram_roof;G.locked=true;updateBoss();}
    else if(name==='boss'||name==='boss-roof'){G.camX=G.camLock=name==='boss'?7680:8640;G.train.aboard=true;G.train.scene=2;G.train.climbed=name==='boss-roof';G.player.y=218;G.player.x=G.camX+120;const b=createBoss('vikram',G.camX+330,218);b.roof=name==='boss-roof';if(b.roof)b.set=SPR.nr_vikram_roof;G.locked=true;}
    if(name==='escape'){G.train.knockoutBody=true;const b=createBoss('vikram',ROOF_X+850,218);Object.assign(b,{dead:true,hp:0,t:71,roof:true});}
    G.train.vistaX=G.train.vistaTarget=vistaTargetFor(name==='roof-transition'||name==='escape'?ROOF_X:G.player.x);G.train.motionT=G.train.vistaX/.12;resetTrainVista(G.train,['roof-transition','knockout','escape'].includes(name)?ROOF_X:G.player.x);
    if(['conductor','seth-intro'].includes(name)&&t>0)window.__game.step(t);
    render();
  },
  trainCheckpoint: restoreTrainCheckpoint,
  travelReady: () => travelReady,
  travel: (phase = 'elevator', running = false) => { enterHub(true); beginTravel(0, phase); if (running) startElevatorRide(); setState('travel'); G.fade = 0; },
  loading: () => { startStage(0, true); G.loadingAge = 0; G.loadingGate = true; setState('loading'); G.fade = 0; loadTravel(); },
  start: () => { startGame(); },
  hub: () => { enterHub(true); },
  state: () => G.state,
  press: (a) => debugPress(a),
  release: (a) => debugRelease(a),
  resetInput: debugResetInput,
  stage: (i) => { resetRun(); startStage(i); setState('play'); },
  render: () => render(),   // draw the current state now, for frame-stepping a cinematic
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
    const frozen=G.freezeTime;G.freezeTime=false;
    try{for (let i = 0; i < (n || 1); i++) if (update() !== false) endFrameInput();}
    finally{G.freezeTime=frozen;}
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
  if (autoMode.startsWith('travel')) {
    window.__game.travel(autoMode.slice(7) || 'elevator', true);
    step(parseInt(params.get('t') || '1', 10));
    G.freezeTime = true; G.fade = 0;
  } else if (autoMode === 'loading') {
    window.__game.loading(); G.freezeTime = false;
  } else if (autoMode === 'play') {
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
    // The bull and the dabbawala are deliberately absent: neither has an idle the
    // soak's abuse loop makes sense against, and neither counts toward a wave, so
    // "never recovers" is not a failure for them.
    const kinds = ['goonda', 'batta', 'masala', 'bandar', 'pehlwan',
      'constable', 'operator', 'sepoy',
      'cooker', 'thela', 'mudlark', 'dhobi'];
    const stuck = {};
    const seen = {};
    let frames = 0;
    // Stop the crowd fighting EACH OTHER, without touching the recovery states this
    // harness exists to measure. Only the attack family is cancelled.
    const hush = () => {
      for (const e of G.enemies) {
        if (e.state === 'approach' || e.state === 'windup' || e.state === 'attack' || e.state === 'backoff') {
          e.state = 'idle'; e.t = 0;
        }
        if (e.state === 'idle') e.atkCd = 99999;
      }
    };
    const note = (e) => {
      const key = e.kind + ':' + e.state;
      stuck[key] = (stuck[key] || 0) + 1;
    };
    for (let round = 0; round < 40; round++) {
      G.enemies.length = 0;
      p.hp = p.maxhp; p.dying = false; p.state = 'idle'; p.invuln = 999;
      const kind = kinds[round % kinds.length];
      for (let i = 0; i < 4; i++) {
        const e = spawnEnemy(kind, p.x + 30 + i * 14, laneMin(p.x) + 6 + i * 18);
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
      // Give everything a long, undisturbed window to recover - and with friendly
      // fire on every red, "undisturbed" now has to be arranged. Four battas left to
      // themselves keep arcing each other, so one is legitimately down at any sample
      // and the harness would report the mechanic working as a stuck body.
      // It has to be re-applied every frame: a finished attack hands itself a fresh
      // atkCd, so parking the number once buys about a second of quiet.
      for (let i = 0; i < 400; i++) { hush(); update(); endFrameInput(); frames++; }
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
      for (let i = 0; i < 300; i++) { hush(); update(); endFrameInput(); frames++; }
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
        if (e.dead || e.state === 'dying' || e.cow) continue;   // she is not a target, she is a mistake
        const d = Math.abs(e.x - p.x) + Math.abs(e.y - p.y) * 2;
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    };
    // A stage is fifteen minutes, so five minutes of bot is a timeout, not a result.
    while (frames < 60 * 1100 && G.state !== 'clear' && G.state !== 'over') {
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
        // The global menu preserves the panel beneath it.
        tap('pause');
        t('hub-panel-' + id + '-menu', G.hubPanel === id && G.paused);
        tap('pause'); step(1); tap('back');
        t('hub-panel-' + id + '-backs-out', !G.hubPanel && !G.paused);
      }
      // The jukebox SETS the room's music rather than auditioning it: the pick has to
      // outlive the panel, which is what closing it used to undo.
      {
        at('hifi'); tap('use');
        tap('down'); tap('attack');
        const picked = G.hubTrack;
        tap('back'); step(4);
        t('hub-jukebox-sets-the-room', !!picked && picked !== HUB_STAGE.music
          && !G.hubPanel && G.hubTrack === picked);
        G.hubTrack = null;
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
            // facing follows the smoothed velocity (hub.js), so judge it on that
            if (Math.abs(f.vs) > 0.03) { moving++; if (Math.sign(f.vs) !== f.face) wrong++; }
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
      // the map panel. The cursor and the locked-act refusal are not testable with a
      // single act - the cursor has nowhere to go and nothing is locked - so what is left
      // is that the map opens on the newest act and starting one works.
      G.unlockedStage = 0;
      at('map'); tap('use');
      t('hub-map-opens-on-newest', G.hubAct === 0);
      tap('attack'); step(40);   // through the cut to black
      t('hub-arms-departure', G.state === 'hub' && G.pendingDestination === 0);
      at('elevator'); tap('use'); step(30);
      t('elevator-starts-travel', G.state === 'travel' && G.travel.phase === 'elevator');
      tap('attack');
      t('elevator-cannot-skip', G.travel.phase === 'elevator');
      const cabinX = G.travel.x;
      debugPress('right'); step(20); debugRelease('right');
      t('elevator-walkable', G.travel.x > cabinX && G.travel.phase === 'elevator');
      t('elevator-waits-for-button', G.travel.t === 0 && !G.travel.started);
      debugPress('right'); step(160); debugRelease('right'); tap('use');
      t('elevator-button-starts-descent', G.travel.started);
      step(780 - G.travel.t);
      t('elevator-arrives-in-lobby', G.travel.phase === 'lobby');
      step(192); // finish the doorway exit and release the arrival input gate before a fresh lobby interaction
      G.travel.x = 827; tap('use');
      t('lobby-door-opens-before-exit', !!G.travel.exiting); step(110);
      t('lobby-exit-reaches-curb', G.travel.phase === 'curb');
      step(134); // exterior doors open and CHAD steps out before curbside control
      G.travel.x = 402; tap('use');
      t('car-boarding', G.travel.phase === 'car-board');
      tap('attack');
      t('car-attack-cannot-skip', G.travel.phase === 'car-board');
      step(78-G.travel.t+300+60);
      t('drive-reaches-private-apron', G.travel.phase === 'apron');
      step(2); G.travel.x = 774; tap('use');
      t('jet-boarding', G.travel.phase === 'jet-board');
      tap('attack');
      t('jet-attack-cannot-skip', G.travel.phase === 'jet-board');
      step(['jet-board','takeoff','flight','india-approach','landing','disembark','papers'].reduce((n,phase)=>n+TRAVEL_DURATIONS[phase],0)-G.travel.t);
      t('arrival-returns-control', G.travel.phase === 'arrival-exit');
      step(2); G.travel.x=968; G.travel.y=208; tap('use'); step(35);
      t('airport-exit-reaches-loading', G.state === 'loading' && G.stage.id === 'train');
      step(180); tap('attack'); step(30);
      t('loading-waits-for-use', G.state === 'loading');
      tap('use'); step(30);
      t('loading-enters-train-intro', G.state === 'intro' && G.stage.id === 'train');

      enterHub(true);
      {
        const bag = G.props[0];
        G.player.x = bag.x - 30; G.player.y = bag.y; G.combo = 0; step(2);
        debugPress('attack'); step(14); debugRelease('attack'); step(6);
        t('hub-bag-unbreakable', !bag.broken && bag.hp === bag.maxhp);
        t('hub-bag-swings', Math.abs(bag.swing) > 0.001 && G.combo >= 1);
        t('hub-bag-reflects', bag.reflect === true);
      }
      // the room pauses like a stage does, and a paused room is frozen solid
      {
        const tg = hubTiger();
        tap('pause');
        const frozenT = G.time, frozenX = tg.x;
        step(60);
        t('hub-pauses', G.paused && G.time === frozenT && tg.x === frozenX);
        tap('pause'); step(4);
        t('hub-unpauses', !G.paused && G.time > frozenT);
      }
      G.hubSel = null; step(2);
      tap('back'); step(30);
      t('hub-leaves-on-back', G.state === 'title');

      setState('title');
      startGame(STAGES.findIndex((s) => s.id === 'delhi'));
      t('delhi-loading-card', G.state === 'chapter-card');
      step(2); tap('use'); step(2); t('intro-state', G.state === 'intro');
      step(G.stage.introTicks+2); t('play-state', G.state === 'play');
      t('delhi-arrival', G.stage.id === 'delhi' && G.stage.arrival === 'market');
      // One act, deliberately: the rest were cut to be rebuilt one at a time. What still
      // has to hold is that every act names a boss that exists.
      t('every-act-has-a-boss', STAGES.length >= 1
        && STAGES.every((st) => !!BOSSES[st.boss]));
      // ESC is a real pause: the sim stops dead and the audio context is suspended with it.
      // hub-pauses is the same assertion one state over, since the room pauses too.
      {
        debugPress('pause'); step(1); debugRelease('pause');
        const frozen = G.time;
        step(40);
        const held = G.paused && G.time === frozen;
        debugPress('pause'); step(1); debugRelease('pause'); step(4);
        t('esc-pauses-everything', held && !G.paused && G.time > frozen);
      }
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
      // the style ladder: the first word lands on the fifth hit of a chain and the HUD holds it
      t('rank-ladder', G.bestCombo < RANKS[0].at || (G.rank >= 0 && RANKS[G.rank].at <= G.bestCombo && G.rankT > 0));
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

      // The replacement has authored layered street activity, with a clear rear curb.
      t('delhi-authored-route', !!G.india && INDIA_AREAS.delhi.length === 8);
      t('delhi-lanes-clear-architecture', laneMin(500) >= 213 && laneMax(500) <= 245);
      t('delhi-no-alpha-ambient', G.stage.crowd.length === 0 && G.stage.emitters.length === 0);

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

      // ---- DIRTY DELHI: friendly fire on every red ----
      // The skill ceiling of the level is "make them hit each other" rather than
      // "press harder", so this is the highest fun-per-line in it and it is asserted
      // on the bull, whose whole tell is that he does 18 to ANYTHING he touches.
      G.enemies.length = 0; G.boss = null; G.zones.length = 0;
      G.player.hp = 100; G.player.invuln = 0; G.player.dying = false;
      G.player.state = 'idle'; G.player.z = 0;
      {
        const victim = spawnEnemy('goonda', G.player.x + 130, G.player.y);
        victim.state = 'idle'; victim.atkCd = 999; victim.hp = 400; victim.maxhp = 400;
        const bull = spawnEnemy('bull', G.player.x - 60, G.player.y);
        bull.state = 'attack'; bull.t = 0; bull.face = 1; bull.vx = 3.2; bull.hitLanded = false;
        const vhp = victim.hp, php = G.player.hp;
        step(90);
        t('bull-hurts-both-sides', victim.hp < vhp && G.player.hp < php);
      }
      G.enemies.length = 0; G.player.hp = 100; G.player.invuln = 0; step(6);

      // ---- the water is a pit, on the DEPTH axis, and it is a free kill ----
      // Pushed onto the live stage rather than waiting for the ghat, so the mechanic
      // is asserted independently of any one level's geography.
      const realPits = G.stage.pits, realLanes = G.stage.lanes;
      G.stage.lanes = [];
      G.stage.pits = [{ x0: 0, x1: 99999, y: FLOOR_TOP + 20 }];
      {
        const lip = laneMin(G.player.x);
        const wet = spawnEnemy('goonda', G.player.x + 40, lip + 6);
        wet.hp = 400; wet.maxhp = 400;
        wet.state = 'down'; wet.t = 0; wet.y = lip - 8; wet.vx = 0;
        step(6);
        t('water-edge-kills', wet.dead === true);
        t('water-edge-is-not-a-wall', wet.x > G.camX + 20 && wet.x < G.camX + W - 20);
      }
      G.enemies.length = 0;
      {
        // He pays health and dignity, never a life: a hole that eats a life on a
        // knockdown near the edge is a loop you cannot climb out of.
        const lives0 = G.lives;
        // The ring-out above left 12 frames of hitstop, and update() returns false
        // through those - four steps of "nothing happened" is a check that measures
        // the previous check.
        G.hitstop = 0;
        G.player.hp = 100; G.player.invuln = 0; G.player.dying = false; G.player.pitCd = 0;
        // groundT too, or a leftover count from an earlier check gets him up on the
        // first frame and the clamp never sees a body that is down.
        G.player.state = 'down'; G.player.t = 0; G.player.groundT = 0; G.player.quickGetup = false;
        G.player.y = laneMin(G.player.x) - 8;
        step(4);
        t('water-edge-costs-the-player-health', G.player.hp < 100 && G.player.hp > 0
          && G.lives === lives0 && !G.player.dying
          && G.player.y >= laneMin(G.player.x));
      }
      G.stage.pits = realPits; G.stage.lanes = realLanes;
      G.player.hp = 100; G.player.invuln = 0; G.player.state = 'idle'; step(6);

      // ---- the one 1-up in the level ----
      {
        const others = Object.entries(PROP_TYPES).filter(([k, T]) => T.drop === 'life');
        const lifeKinds = others.map(([k]) => k).sort().join(',');
        t('train-one-up-preserved', STAGES.find(s=>s.id==='train').props.filter(q=>PROP_TYPES[q.kind].drop==='life').length===1);
        G.pickups.length = 0;
        const box = createProp('nr_contraband', G.player.x + 24, G.player.y);
        G.props.push(box);
        box.hurt(999, 1);
        const up = G.pickups.find((q) => q.kind === 'life');
        t('one-up-drops-from-contraband', !!up);
        step(700);   // the ordinary despawn window, and then some
        t('one-up-never-expires', G.pickups.includes(up));
        const lives0 = G.lives;
        G.player.hp = G.player.maxhp;   // and it is not gated on being hurt
        G.player.x = up.x; G.player.y = up.y; G.player.z = 0;
        step(4);
        t('one-up-is-taken-at-full-health', G.lives === lives0 + 1);
      }
      G.pickups.length = 0; G.enemies.length = 0; step(6);

      // The new route replaces the long drain and two obsolete miniboss arenas.
      {
        const st=G.stage,w=st.waves;
        t('delhi-eight-connected-areas', INDIA_AREAS.delhi.length===8 && st.width===6480);
        t('delhi-two-boss-fights',w.filter(q=>q.miniboss||q.boss).length===2 && w.at(-1).boss);
        t('waves-are-ordered-and-inside-the-route',w.every((q,i)=>q.x>=0&&q.x<st.width&&(!i||q.x>w[i-1].x)));
        t('culvert-is-short-and-clear',!w.some(q=>q.x>3240&&q.x<4050)&&810/82.8<12);
        t('delhi-fresh-enemy-families',w.flatMap(q=>q.spawns).every(k=>k.startsWith('ic_')));
        t('delhi-healing-placed-along-route',st.props.filter(q=>PROP_TYPES[q.kind].drop==='shake').length>=6);
      }

      // ---- a miniboss with a designed arena gets a real reveal ----
      {
        const idx = G.stage.waves.findIndex((q) => q.miniboss);
        const wv = G.stage.waves[idx];
        G.waveIndex = idx - 1; G.waveActive = false; G.locked = false;
        G.enemies.length = 0; G.spawnQueue = []; G.boss = null; G.hitstop = 0;
        for (const q of G.stage.waves) q.done = false;
        G.player.x = wv.x + 2; G.player.hp = 100; G.camX = wv.x - 300;
        step(3);
        t('miniboss-gets-a-reveal', G.state === 'bossintro' && !!G.boss && G.boss.mini === true);
        t('miniboss-arena-is-designed', Math.round(G.camLock) === wv.camX);
        step(210);
        // and the wave it interrupted is handed back rather than lost
        t('miniboss-reveal-returns-the-wave',
          G.state === 'play' && G.waveActive === true && G.locked === true);
        G.boss.hurt(9999, 1, true, false); step(600);
        t('miniboss-does-not-end-the-act', G.state === 'play' && G.boss === null);
      }
      G.enemies.length = 0; G.spawnQueue = []; G.hitstop = 0;

      // ---- the three DIRTY DELHI fights: each one has a thing that is not damage ----
      {
        const jump = (key) => {
          const ws = G.stage.waves;
          const i = ws.findIndex((q) => q.miniboss === key || (key === 'dredger' && q.boss));
          for (const q of ws) q.done = false;
          for (let k = 0; k < i; k++) ws[k].done = true;
          G.waveIndex = i - 1; G.waveActive = false; G.locked = false;
          G.enemies.length = 0; G.spawnQueue = []; G.boss = null; G.hitstop = 0;
          G.zones = []; G.shots = []; G.pickups = [];
          G.player.hp = 100; G.player.state = 'idle'; G.player.invuln = 0; G.player.z = 0; G.player.vz = 0;
          G.player.x = ws[i].x + 2; G.player.y = 215; G.camX = Math.max(0, ws[i].x - 255);
          step(3);
          if (G.state === 'bossintro') step(210);
          G.enemies.length = 0;
          return G.boss;
        };
        let b=jump('vendor');
        t('vendor-arrives-with-cart-and-valve',!!b.cart&&!!b.valve&&G.props.includes(b.station));
        b.cart.hurt(9999,1,true,true);step(2);
        t('vendor-loses-rush-permanently',b.cartGone&&b.cart.broken);
        b.hurt(9999,1,true,true);step(600);
        // THE DREDGER: the bucket, the crew, the cab, the winch, the man
        b = jump('dredger');
        t('dredger-rests-out-of-reach', !!b && b.phase === 'machine' && b.z >= 60);
        t('dredger-arena-is-the-pontoon', G.camX === G.camLock && b.reflectTarget.x - G.camX < W);
        let crew = false;
        for (let i = 0; i < 400 && !crew; i++) { step(1); crew = G.enemies.some((e) => e.trainType === 'ic_docker'); }
        t('dredger-always-has-crew', crew);
        G.shots = [{ kind: 'slurry', x: b.rail.x - 60, y: 215, z: 0, vx: -3, vz: 0, dmg: 9, t: 0, life: 400,
          source: b, parryClass: 'reflect', reflected: true }];
        for (let i = 0; i < 150 && G.shots.length; i++) step(1);
        t('dredger-reflected-hose-cracks-the-cab', b.glass === 2 && G.shots.length === 0);
        b.winch.hurt(999, 1); step(200);
        const stopped = b.winchGone === true && b.state === 'grounded' && b.z === 0;
        step(400);
        t('dredger-winch-stops-the-bucket', stopped && b.state === 'grounded' && b.z === 0);
        b.hurt(b.hp - 80, 1, false, false); step(5);
        t('dredger-operator-comes-out', b.phase === 'operator' && b.label === 'THE THEKEDAR' && b.maxhp === 90);
        b.hurt(9999, 1, true, true); step(80);
        t('dredger-dies-as-a-man', b.dead === true && b.state === 'dying');
        // hand the suite a quiet street again
        G.boss = null; G.enemies.length = 0; G.spawnQueue = []; G.zones = []; G.shots = []; G.pickups = [];
        G.arenaSqueeze = 0; G.arenaSqueezeTarget = 0; G.hitstop = 0;
        for (const q of G.stage.waves) q.done = false;
        G.waveIndex = -1; G.waveActive = false; G.locked = false;
        G.player.x = 200; G.player.y = 215; G.player.hp = 100; G.player.state = 'idle'; G.camX = 0;
        G.props = (G.stage.props || []).map((d) => createProp(d.kind, d.x, d.y, d.z));
        setState('play');
      }

      t('river-music-follows-geography',G.stage.music==='stage1a'&&G.stage.musicB==='stage1b'&&G.stage.musicBX===4050);

      // Fresh train route invariants. Detailed cinematic checks live in train_rebuild_check.cjs.
      {
        startStage(0);setState('play');G.fade=0;
        t('train-is-act-one',G.stage.id==='train'&&G.stage.boss==='vikram'&&!!G.train);
        t('train-office-enforcers-before-inspector',G.stage.waves.filter(w=>!w.boss).length===13&&G.stage.waves[7].spawns.length===2&&G.stage.waves[8].miniboss==='conductor');
        t('train-floor-clears-seats',laneMin(3300)===205&&laneMax(3300)===241);
        t('train-floor-clears-counter',laneMin(5500)===194);
        t('train-platform-clears-wall',laneMin(2400)===211);
        t('train-no-alpha-rules',!G.stage.waves.some(w=>w.depart||w.thief||w.runner||w.miniboss==='tte'));
        startStage(STAGES.findIndex(s=>s.id==='delhi'));setState('play');G.fade=0;G.player.x=200;G.player.y=215;G.camX=0;
      }

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

      // Holding beyond the timed window guards with chip; it cannot counter again.
      G.player.state = 'idle'; G.player.invuln = 0; G.player.hp = 100;
      debugPress('parry'); step(30);
      t('parry-hold-stance', G.player.state === 'parry');
      const heldPc = spawnEnemy('goonda', G.player.x + 18, G.player.y);
      heldPc.state = 'attack'; heldPc.t = 3; heldPc.face = -1;
      step(2);
      t('held-guard-chip-no-counter', G.player.state === 'parry' && G.player.hp === 99 && heldPc.state !== 'stagger');
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
      // Just past the first gate, with the camera behind it. Derived, not typed: it used
      // to be 421/160 against a wave at 380, and it only passed by coincidence.
      G.player.x = G.stage.waves[0].x + 41; G.player.hp = 100;
      G.camX = Math.max(0, G.stage.waves[0].x - 220);
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

      // ---- Act I's boss, whoever the act names ----
      window.__game.skipToBoss(); G.player.x = G.camX + 230; step(3);
      t('act1-boss-arrives', !!G.boss && G.boss.key === G.stage.boss);
      t('boss-has-its-breakable', !!G.boss
        && (!G.boss.def.cart || (!!G.boss.cart && G.props.includes(G.boss.cart))));
      // "a breakable in the world that deletes a pattern for good" used to be asserted
      // on RAJA's rickshaw. No stage names him any more, so the contract is asserted
      // where it is actually reachable - on the thela's cart above, and on the dredger's
      // winch below once that fight exists. Kept as an explicit check rather than a
      // guarded block that silently stops running when the boss changes.
      t('boss-breakable-contract-is-covered',
        PROP_TYPES.thelacart.hp > 0 && (!G.boss.def.cart || G.boss.cartGone !== undefined));
      step(205);
      t('boss-intro-ends', G.state === 'play');
      // The rest of the boss state machine, which used to be asserted on YADAV in Act IV:
      // armour at full health, enrage on the way through half, and death.
      if (G.boss) {
        G.boss.hurt(Math.ceil(G.boss.maxhp / 2) + 1, 1, false, false);
        t('boss-enrages-at-half', G.boss.enraged === true);
        G.boss.hurt(9999, 1, true, true);
        if(G.boss.phase==='operator'&&!G.boss.dead){G.hitstop=0;step(2);G.boss.hurt(9999,1,true,true);}
        t('boss-dies', G.boss.dead === true);
      }
      G.enemies.length = 0; G.spawnQueue = [];
      step(1000);
      t('act1-clear', G.state === 'clear');
      step(200); debugPress('use'); step(4); debugRelease('use'); step(36);
      // the tally goes straight on to the next act, the arcade way; home is after the last
      t('delhi-clear-goes-to-refund', G.state === 'chapter-card' && G.stage.id === 'refund');
      startStage(0); setState('clear'); debugPress('use'); step(200);
      t('train-clear-held-use-waits',G.state==='clear'&&!G.transition);
      debugRelease('use'); step(1); debugPress('attack'); step(4); debugRelease('attack'); step(36);
      t('train-clear-attack-ignored',G.state==='clear'&&!G.transition);
      debugPress('use'); step(4); debugRelease('use'); step(36);
      t('train-clear-goes-to-delhi', G.state === 'chapter-card' && G.stage.id === 'delhi');
      G.stageIndex = 0; enterHub(false);
      t('clear-brings-home-a-relic', G.hubRelicKey === STAGES[0].boss && G.hubRelicT > 0);
      // Clearing an act is the one thing that writes the save, so this is the point at
      // which "the jukebox is not persisted" is testable against a save THIS build wrote.
      // A fresh start has to come up on the room's own track.
      {
        const save = JSON.parse(localStorage.getItem('gigachadworldtour.save') || '{}');
        t('hub-jukebox-is-session-only', !('hubTrack' in save));
      }

      // Acts IV and V drove YADAV and RANA. Both are cut, and the boss state machine they
      // exercised - intro, enrage at half, death - is asserted on RAJA above instead. The
      // whistle summon went with YADAV; it is his pattern and no remaining boss has it.
      // The ending is reached directly until an act is flagged final.
      setState('ending');
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
