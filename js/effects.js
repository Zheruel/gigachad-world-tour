// effects.js - hit sparks, dust, shockwaves, rings, steam, score popups, shake/flash
import { G } from './engine.js';
import { SPR, getFrame, drawTextShadow, textWidth, blit, frameW, frameH } from './sprites.js';
import { fx } from './fx.js';

export function spawnSpark(x, y) {
  // the spark art already has a bright core; the extra 4x4 white square that used
  // to fire alongside it on every hit was just a visible rectangle
  G.effects.push({ type: 'spark', x, y, t: 0, life: 9 });
}

export function spawnDust(x, y, n) {
  n = n || 1;
  for (let i = 0; i < n; i++) {
    G.effects.push({
      type: 'dust', x: x + (Math.random() * 10 - 5), y: y - Math.random() * 2,
      vx: Math.random() * 1.2 - 0.6, vy: -0.4 - Math.random() * 0.5,
      t: 0, life: 18 + Math.random() * 8,
    });
  }
}

export function spawnShock(x, y) {
  G.effects.push({ type: 'shock', x, y, t: 0, life: 14 });
  spawnDust(x - 8, y, 3);
  spawnDust(x + 8, y, 3);
}

export function spawnRagnarokImpact(x, y) {
  G.effects.push({ type: 'ragnarok', x, y, t: 0, life: 34 });
}

export function spawnRing(x, y, color) {
  G.effects.push({ type: 'ring', x, y, color: color || '#ffd94a', t: 0, life: 16 });
}

export function spawnSteam(x, y, n) {
  for (let i = 0; i < (n || 1); i++) {
    G.effects.push({
      type: 'steam', x: x + (Math.random() * 14 - 7), y,
      vx: Math.random() * 0.4 - 0.2, vy: -0.5 - Math.random() * 0.4,
      t: 0, life: 30 + Math.random() * 20,
    });
  }
}

export function spawnPop(x, y, text) {
  G.effects.push({ type: 'pop', x, y, text, t: 0, life: 46 });
}

export function spawnSmoke(x, y, n) {
  for (let i = 0; i < (n || 1); i++) {
    G.effects.push({
      type: 'smoke', x: x + (Math.random() * 5 - 2.5), y,
      vx: 0.12 + Math.random() * 0.2, vy: -0.28 - Math.random() * 0.2,
      t: 0, life: 46 + Math.random() * 26,
    });
  }
}

// Lounge cigar smoke needs more contrast than combat smoke because it is usually drawn
// over pale aquarium water. Keep it thin and long-lived so several puffs join into a
// readable curl instead of one large opaque blob.
export function spawnCigarSmoke(x, y, n) {
  for (let i = 0; i < (n || 1); i++) {
    G.effects.push({
      type: 'cigarSmoke', x: x + (Math.random() * 3 - 1.5), y,
      vx: -0.08 + Math.random() * 0.22, vy: -0.20 - Math.random() * 0.18,
      t: 0, life: 64 + Math.random() * 30,
    });
  }
}

export function spawnDebris(x, y, n, colors) {
  const pal = colors || ['#b0682e', '#8a4a20', '#d8a860'];
  for (let i = 0; i < (n || 6); i++) {
    G.effects.push({
      type: 'debris', x, y: y - 6 - Math.random() * 10,
      vx: (Math.random() * 4 - 2), vy: -1.4 - Math.random() * 1.4,
      col: pal[(Math.random() * pal.length) | 0],
      t: 0, life: 34 + Math.random() * 18,
    });
  }
}

// Hitstop scales with how hard the hit was, so a jab stays snappy while a
// launcher lands with real weight. dmg is optional; heavy alone still works.
export function impact(heavy, dmg) {
  const d = dmg || (heavy ? 13 : 6);
  G.hitstop = Math.max(G.hitstop, Math.round(Math.min(12, 3 + d * 0.42)));
  if (heavy) { G.shake = Math.max(G.shake, 5); G.flash = 2; }
  else G.shake = Math.max(G.shake, 2);
}

export function updateEffects() {
  for (let i = G.effects.length - 1; i >= 0; i--) {
    const e = G.effects[i];
    e.t++;
    if (e.type === 'dust') { e.x += e.vx; e.y += e.vy; e.vy += 0.04; }
    if (e.type === 'steam') { e.x += e.vx; e.y += e.vy; e.vy *= 0.99; }
    if (e.type === 'smoke' || e.type === 'cigarSmoke') {
      e.x += e.vx; e.y += e.vy; e.vy *= 0.985; e.vx *= 0.99;
    }
    if (e.type === 'debris') { e.x += e.vx; e.y += e.vy; e.vy += 0.14; e.vx *= 0.985; }
    if (e.type === 'pop') { e.y -= 0.5; }
    if (e.t >= e.life) G.effects.splice(i, 1);
  }
  if (G.shake > 0) G.shake *= 0.85;
  if (G.shake < 0.3) G.shake = 0;
  if (G.flash > 0) G.flash--;
}

export function drawEffects(ctx, camX) {
  for (const e of G.effects) {
    const sx = Math.round(e.x - camX), sy = Math.round(e.y);
    if (e.type === 'spark') {
      const f = SPR.spark[Math.min(1, (e.t / 4) | 0)];
      blit(ctx, f, sx - frameW(f) / 2, sy - frameH(f) / 2);
    } else if (e.type === 'dust') {
      const f = SPR.dust[e.t > 8 ? 1 : 0];
      ctx.globalAlpha = Math.max(0, 1 - e.t / e.life);
      blit(ctx, f, sx - frameW(f) / 2, sy - frameH(f) + 2);
      ctx.globalAlpha = 1;
    } else if (e.type === 'shock') {
      const k = e.t / e.life;
      ctx.globalAlpha = 1 - k;
      const w = 24 + k * 46;
      const h = w * (frameH(SPR.shock) / frameW(SPR.shock));
      ctx.drawImage(SPR.shock, sx - w / 2, sy - h * 0.6, w, h);
      ctx.globalAlpha = 1;
    } else if (e.type === 'ring') {
      const k = e.t / e.life;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 6 + k * 34, 3 + k * 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.type === 'steam') {
      const k = e.t / e.life;
      ctx.globalAlpha = Math.max(0, 0.55 - k * 0.55);
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 5 + k * 8, 4 + k * 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'smoke' || e.type === 'cigarSmoke') {
      const k = e.t / e.life;
      const cigar = e.type === 'cigarSmoke';
      ctx.globalAlpha = Math.max(0, (cigar ? 0.52 : 0.4) * (1 - k));
      ctx.fillStyle = cigar ? '#aab3ba' : '#d8d4c8';
      ctx.beginPath();
      ctx.ellipse(sx, sy, (cigar ? 1.5 : 2) + k * (cigar ? 7 : 9),
        (cigar ? 1.5 : 2) + k * (cigar ? 6 : 7), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (e.type === 'debris') {
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - e.life * 0.6) / (e.life * 0.4));
      ctx.fillStyle = e.col;
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
      ctx.globalAlpha = 1;
    } else if (e.type === 'pop') {
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - 24) / (e.life - 24));
      drawTextShadow(ctx, e.text, sx - textWidth(e.text, 1) / 2, sy, '#ffd94a', 1);
      ctx.globalAlpha = 1;
    }
  }
}

// The authored crater is floor art, so it must sit behind bodies. Drawing it in the
// regular effects pass covered CHAD at the exact payoff frame of RAGNAROK.
export function drawRagnarokGround(ctx, camX) {
  for (const e of G.effects) {
    if (e.type !== 'ragnarok') continue;
    const f = fx('ragnarok_impact', Math.min(5, (e.t / 5) | 0));
    if (!f) continue;
    const sx = Math.round(e.x - camX), sy = Math.round(e.y);
    const k = e.t / e.life;
    ctx.globalAlpha = Math.min(1, 1.5 - k);
    blit(ctx, f, sx - frameW(f) / 2, sy - frameH(f) * 0.68);
    ctx.globalAlpha = 1;
  }
}
