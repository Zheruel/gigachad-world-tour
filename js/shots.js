// shots.js - projectiles (burning samosas, chilli powder, steam) and the
// lingering floor hazards they leave behind (chutney puddles, tear gas).
import { G, W, clamp } from './engine.js';
import { hurtPlayer, blindPlayer, poisonPlayer, resolveIncomingHit } from './player.js';
import { spawnDust } from './effects.js';
import { fx } from './fx.js';
import { blit, frameW, frameH } from './sprites.js';

const LIFE = { powder: 90, samosa: 140, steam: 40 };

export function spawnShot(kind, x, y, vx, dmg, options = {}) {
  G.shots.push({ kind, x, y, z: 0, vx, vz: 0, dmg, t: 0, life: LIFE[kind] || 110,
    source: options.source || null,
    parryClass: options.parryClass || (options.parryable ? 'reflect' : 'unblockable'),
    reflected: false });
}

// Lobbed arc: rises, falls, and bursts into a zone where it lands.
export function spawnArc(kind, x, y, vx, vz, dmg, burst, options = {}) {
  G.shots.push({ kind, x, y, z: 20, vx, vz, dmg, t: 0, life: LIFE[kind] || 140, burst,
    source: options.source || null,
    parryClass: options.parryClass || (options.parryable ? 'reflect' : 'unblockable'),
    reflected: false });
}

// kind: 'chutney' (poison) | 'gas' (poison) | 'fire' (burn)
export function spawnZone(kind, x, y, r, life) {
  G.zones.push({ kind, x, y, r, t: 0, life });
}

export function updateShots() {
  const p = G.player;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.t++;
    s.x += s.vx;
    if (s.reflected && s.source && !s.source.dead) {
      s.y += clamp(s.source.y - s.y, -2.2, 2.2);
      if (Math.abs(s.source.x - s.x) < 20 && Math.abs(s.source.y - s.y) < 22) {
        s.source.hurt(Math.round(s.dmg * 1.5), Math.sign(s.vx) || 1, true, false);
        spawnDust(s.x, s.y, 3);
        G.shots.splice(i, 1);
        continue;
      }
    }
    if (s.vz || s.z > 0) { s.z += s.vz; s.vz -= 0.24; }

    // landed: burst into a lingering zone
    if (s.z < 0) {
      if (s.burst) spawnZone(s.burst, s.x, s.y, 22, 240);
      spawnDust(s.x, s.y, 2);
      G.shots.splice(i, 1);
      continue;
    }

    const hit = Math.abs(p.x - s.x) < 16 && Math.abs(p.y - s.y) < 18 &&
      Math.abs(p.z - s.z) < 24;
    if (hit && !s.reflected) {
      if (resolveIncomingHit(p, s.source, { parryClass: s.parryClass })) {
        spawnDust(s.x, s.y, 3);
        s.reflected = true;
        s.burst = null;
        s.vx = -(s.vx || (p.face * 2.5)) * 1.35;
        s.vz = Math.max(s.vz, 0.4);
        s.t = 0;
        continue;
      }
      hurtPlayer(p, s.dmg, Math.sign(s.vx) || 1, s.kind !== 'powder');
      if (s.kind === 'powder') blindPlayer(p, 50);
      if (s.burst) spawnZone(s.burst, s.x, s.y, 18, 160);
      G.shots.splice(i, 1);
      continue;
    }
    if (s.t > s.life || s.x < G.camX - 40 || s.x > G.camX + W + 40) G.shots.splice(i, 1);
  }

  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i];
    z.t++;
    const inside = Math.abs(p.x - z.x) < z.r && Math.abs(p.y - z.y) < 14 && p.z < 12;
    if (inside && z.t % 24 === 0) {
      if (z.kind === 'fire') hurtPlayer(p, 4, p.x < z.x ? -1 : 1, false);
      else poisonPlayer(p, 180);
    }
    if (z.t > z.life) G.zones.splice(i, 1);
  }
}

export function drawZones(ctx, camX) {
  for (const z of G.zones) {
    const sx = Math.round(z.x - camX), sy = Math.round(z.y);
    const fade = clamp(1 - z.t / z.life, 0, 1);
    ctx.save();
    if (z.kind === 'gas') {
      const f = fx('gas', z.t >> 4);
      ctx.globalAlpha = fade * 0.8;
      if (f) blit(ctx, f, sx - frameW(f) / 2, sy - frameH(f) + 4);
      else {
        ctx.globalAlpha = fade * 0.45;
        ctx.fillStyle = '#c8dcae';
        ctx.beginPath(); ctx.ellipse(sx, sy - 10, z.r, 10, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (z.kind === 'fire') {
      // one clump per few px of radius, each on its own phase so it flickers
      const n = Math.max(2, Math.round(z.r / 9));
      for (let i = 0; i < n; i++) {
        const f = fx('flame', (z.t >> 2) + i * 2);
        const bx = sx - z.r + (i + 0.5) * (z.r * 2 / n);
        ctx.globalAlpha = fade;
        if (f) blit(ctx, f, bx - frameW(f) / 2, sy - frameH(f) + 3);
        else { ctx.fillStyle = i % 2 ? '#ff8a20' : '#ffd050'; ctx.fillRect(bx - 1, sy - 12, 3, 12); }
      }
    } else {
      const f = fx('puddle', 0);
      ctx.globalAlpha = fade * 0.9;
      if (f) {
        const w = z.r * 2.1, h = frameH(f) * (w / frameW(f));
        ctx.drawImage(f, sx - w / 2, sy - h + 3, w, h);
      } else {
        ctx.fillStyle = '#3f7a26';
        ctx.beginPath(); ctx.ellipse(sx, sy, z.r, z.r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawShots(ctx, camX) {
  for (const s of G.shots) {
    const sx = Math.round(s.x - camX), sy = Math.round(s.y - s.z);
    if (s.kind === 'powder') {
      const f = fx('powder', s.t >> 3);
      ctx.globalAlpha = clamp(1 - s.t / s.life, 0.3, 1);
      if (f) blit(ctx, f, sx - frameW(f) / 2, sy - 14 - frameH(f) / 2);
      else {
        ctx.fillStyle = '#e04a10';
        ctx.fillRect(sx - 4, sy - 18, 8, 8);
      }
      ctx.globalAlpha = 1;
    } else if (s.kind === 'samosa') {
      const f = fx('samosa', s.t >> 2);
      if (f) blit(ctx, f, sx - frameW(f) / 2, sy - 14 - frameH(f) / 2);
      else {
        ctx.fillStyle = '#c8811e';
        ctx.fillRect(sx - 5, sy - 18, 10, 10);
      }
    } else if (s.kind === 'wrench' || s.kind === 'phone') {
      ctx.save();
      ctx.translate(sx, sy - 14);
      ctx.rotate(s.t * 0.32);
      ctx.fillStyle = s.kind === 'wrench' ? '#c9d2d8' : '#35e2ef';
      ctx.fillRect(-7, -2, 14, 4);
      ctx.fillStyle = '#17252e';
      ctx.fillRect(-5, -1, 10, 2);
      ctx.restore();
    } else if (s.kind === 'steam') {
      ctx.globalAlpha = clamp(1 - s.t / s.life, 0, 0.8);
      ctx.fillStyle = '#f4f8ff';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 8, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
