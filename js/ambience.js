// ambience.js - living Delhi without pasted-on background people.
// Cloth, fans, steam, dust and pigeons all share the stage's light and react to hits.
import { G, W } from './engine.js';
import { blit, frameW, frameH } from './sprites.js';
import { fx } from './fx.js';
import { spawnSteam, spawnSmoke, spawnDust } from './effects.js';

const ART = {};
const SETS = { laundry: 4, awning: 4, fan: 4 };

export function loadAmbience() {
  return Promise.all(Object.entries(SETS).flatMap(([name, n]) => {
    ART[name] = [];
    return Array.from({ length: n }, (_, i) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => { img._as = 2; ART[name][i] = img; resolve(); };
      img.onerror = () => resolve();
      img.src = `assets/ambience/delhi_${name}_${i + 1}.png`;
    }));
  }));
}

export function initAmbience(stage) {
  G.stageReacts = [];
  G.ambientEmitters = (stage.emitters || []).map((e, i) => ({ ...e, wait: 20 + i * 17 }));
  G.birds = (stage.birds || []).map((b) => ({
    homeX: b.x, homeY: b.y, x: b.x, y: b.y,
    vx: 0, vy: 0, flying: false, t: 0, phase: (b.x | 0) % 40,
  }));
}

export function reactStage(x, strength = 1) {
  G.stageReacts.push({ x, t: 0, life: 34, strength });
  // Ground-level detail answers the hit immediately while hanging pieces lag behind.
  spawnDust(x - 12, 238, Math.ceil(2 * strength));
  spawnDust(x + 12, 238, Math.ceil(2 * strength));
  for (const b of G.birds || []) {
    if (!b.flying && Math.abs(b.x - x) < 150 * strength) launchBird(b, x);
  }
}

function launchBird(b, dangerX) {
  b.flying = true; b.t = 0;
  b.vx = (b.x < dangerX ? -1 : 1) * (1.1 + Math.random() * 0.9);
  b.vy = -(0.9 + Math.random() * 0.6);
}

export function updateAmbience() {
  for (let i = G.stageReacts.length - 1; i >= 0; i--) {
    const r = G.stageReacts[i];
    if (++r.t >= r.life) G.stageReacts.splice(i, 1);
  }
  for (const e of G.ambientEmitters || []) {
    if (--e.wait <= 0) {
      if (e.kind === 'steam') spawnSteam(e.x, e.y, 1);
      else spawnSmoke(e.x, e.y, 1);
      e.wait = (e.every || 72) + Math.random() * (e.jitter || 40);
    }
  }
  const p = G.player;
  for (const b of G.birds || []) {
    if (!b.flying) {
      if (p && Math.abs(p.x - b.x) < 40 && Math.abs(p.y - b.y) < 26) launchBird(b, p.x);
      continue;
    }
    b.t++; b.x += b.vx; b.y += b.vy; b.vy += 0.012;
    if (b.t > 190) {
      b.flying = false; b.t = 0; b.x = b.homeX; b.y = b.homeY; b.vx = 0; b.vy = 0;
    }
  }
}

function reactionAt(x) {
  let n = 0;
  for (const r of G.stageReacts || []) {
    const reach = 220 * r.strength;
    const d = Math.abs(x - r.x);
    if (d < reach) n += (1 - d / reach) * (1 - r.t / r.life) * r.strength;
  }
  return n;
}

export function drawAmbienceFacade(ctx, camX) {
  for (const a of (G.stage.ambience || [])) {
    const set = ART[a.kind];
    if (!set || !set.length) continue;
    const speed = a.kind === 'fan' ? 5 : 12;
    const idx = Math.floor((G.rawTime + (a.phase || 0)) / speed) % set.length;
    const img = set[idx];
    if (!img) continue;
    const w = frameW(img), h = frameH(img);
    const sx = Math.round(a.x - camX);
    if (sx + w < -30 || sx > W + 30) continue;
    const kick = reactionAt(a.x);
    const sway = Math.sin(G.rawTime * 0.16 + (a.phase || 0)) * kick * (a.kind === 'fan' ? 1 : 3);
    ctx.save();
    ctx.translate(sx + w / 2, a.y);
    if (a.kind !== 'fan') ctx.rotate(sway * 0.015);
    ctx.globalAlpha = a.alpha === undefined ? 0.92 : a.alpha;
    blit(ctx, img, -w / 2 + sway, 0);
    ctx.restore();
  }
}

export function drawBirds(ctx, camX) {
  for (const b of G.birds || []) {
    const f = fx('bird', b.flying ? 1 + (((G.rawTime + b.phase) >> 2) & 1) : 0);
    if (!f) continue;
    const sx = Math.round(b.x - camX);
    if (sx < -20 || sx > W + 20) continue;
    blit(ctx, f, sx - frameW(f) / 2, Math.round(b.y) - frameH(f));
  }
}
