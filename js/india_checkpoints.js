// Checkpoint rollback for the two replacement India stages. Train retries remain
// owned by train.js; these snapshots never alter their state or balance.
import { G, W, clamp, laneMin, laneMax } from './engine.js';
import { createPlayer, releaseSuper, releaseGrab } from './player.js';
import { createProp } from './props.js';
import { debugResetInput } from './input.js';

export const INDIA_CHECKPOINTS = Object.freeze({
  delhi: [
    { id: 'after-vendor', at: 3240 },
    { id: 'before-dredger', at: 5800 },
  ],
  refund: [
    { id: 'after-servers', at: 4050 },
    { id: 'before-closer', at: 5800 },
  ],
});

function save(point) {
  const s = G.india;
  s.retryPoint = {
    ...point, score: G.score, bestCombo: G.bestCombo,
    stats: { ...G.stats }, time: s.t,
    wallBroken: s.wallBroken, bullDone: s.bullDone,
    cues: [...s.cues], recoveryWaves: [...(s.recoveryWaves || [])],
    props: G.props.filter(p => !p.indiaBossProp).map(p => ({
      kind: p.prop, x: p.x, y: p.y, z: p.z, hp: p.hp, broken: p.broken, dead: p.dead,
    })),
  };
  s.checkpoint = point.at;
  s.checkpointScore = G.score;
}

function ensureInitial() {
  if (!G.stage?.chapter || !G.india) return false;
  if (!G.india.retryPoint) {
    save({ id: 'entrance', at: 0, x: G.stage.id === 'refund' ? 225 : 190,
      camX: 0, completedWave: -1, bossKey: null });
  }
  return true;
}

export function updateIndiaCheckpoint() {
  if (!ensureInitial() || G.boss || G.waveActive || G.india.cinematic) return;
  for (const gate of INDIA_CHECKPOINTS[G.stage.id] || []) {
    if (G.player.x < gate.at || G.india.checkpoint >= gate.at) continue;
    save({ ...gate, x: gate.at + 60, camX: clamp(gate.at - 120, 0, G.camMax),
      completedWave: G.waveIndex, bossKey: null });
  }
}

// Called after waveIndex advances but before a boss and its props are created.
// A retry restarts the same full encounter, not a partly damaged boss.
export function captureIndiaBossCheckpoint(wave, key) {
  if (!ensureInitial()) return;
  const id = `boss-${key}`;
  if (G.india.retryPoint.id === id) return;
  save({ id, at: wave.x, x: wave.x, camX: clamp(wave.camX ?? wave.x - 60, 0, G.camMax),
    completedWave: G.waveIndex - 1, bossKey: key });
}

export function restoreIndiaCheckpoint() {
  if (!ensureInitial()) return false;
  const s = G.india, saved = s.retryPoint;
  releaseSuper(G.player);
  releaseGrab(G.player);
  G.audio.stopSamples?.();
  G.audio.stopRoomAudio?.();
  debugResetInput();
  G.boss = null; G.enemies = []; G.shots = []; G.zones = [];
  G.effects = []; G.pickups = []; G.spawnQueue = []; G.spawnCd = 0;
  G.waveActive = false; G.locked = false; G.introResume = null;
  G.arenaSqueeze = G.arenaSqueezeTarget = 0;
  G.hitstop = G.slowmo = G.parrySlow = G.shake = G.flash = 0;
  G.camX = G.camLock = clamp(saved.camX, 0, G.camMax);
  G.waveIndex = saved.completedWave;
  G.stage.waves.forEach((wave, i) => { wave.done = i <= saved.completedWave; });
  G.stage.events?.forEach(event => { event.done = event.x <= saved.x; });
  G.props = saved.props.map(data => {
    const p = createProp(data.kind, data.x, data.y, data.z);
    Object.assign(p, { hp: data.hp, broken: data.broken, dead: data.dead });
    return p;
  });
  G.score = saved.score; G.stats = { ...saved.stats }; G.bestCombo = saved.bestCombo;
  G.combo = G.comboT = G.rankT = 0; G.rank = -1;
  G.meter = 50;
  G.player = createPlayer();
  Object.assign(G.player, { x: clamp(saved.x, G.camX + 14, G.camX + W - 14),
    y: clamp(236, laneMin(saved.x), laneMax(saved.x)), hp: G.player.maxhp,
    state: 'idle', dying: false, invuln: 90, face: 1 });
  s.cinematic = null; s.endingDone = false; s.displayBroken = false;
  s.office=null;s.pendingEntries=0;s.defeated=null;s.reserveWave=-1;s.reserveIndex=0;
  s.wallCracked=false;
  s.t = saved.time; s.cues = new Set(saved.cues);
  s.recoveryWaves = new Set(saved.recoveryWaves || []);
  s.wallBroken = saved.wallBroken; s.bullDone = saved.bullDone;
  s.retryBoss = saved.bossKey;
  G.audio.music(G.stage.musicB && saved.camX >= G.stage.musicBX ? G.stage.musicB : G.stage.music);
  return true;
}
