// shots.js - projectiles (burning samosas, chilli powder, steam) and the
// lingering floor hazards they leave behind (chutney puddles, tear gas).
import { G, W, clamp } from './engine.js';
import { hurtPlayer, blindPlayer, poisonPlayer, resolveIncomingHit } from './player.js';
import { spawnDust } from './effects.js';
import { fx } from './fx.js';
import { blit, frameW, frameH } from './sprites.js';

const LIFE = { powder: 90, samosa: 140, steam: 40, brick: 160, slurry: 150, weight: 150, hook: 90, handset: 140 };

export function spawnShot(kind, x, y, vx, dmg, options = {}) {
  const s = { kind, x, y, z: 0, vx, vz: 0, dmg, t: 0, life: LIFE[kind] || 110,
    source: options.source || null,
    parryClass: options.parryClass || (options.parryable ? 'reflect' : 'unblockable'),
    reflected: false };
  G.shots.push(s);
  return s;
}

// Lobbed arc: rises, falls, and bursts into a zone where it lands.
export function spawnArc(kind, x, y, vx, vz, dmg, burst, options = {}) {
  G.shots.push({ kind, x, y, z: options.z === undefined ? 20 : options.z, vx, vz, dmg, t: 0, life: LIFE[kind] || 140, burst,
    source: options.source || null,
    parryClass: options.parryClass || (options.parryable ? 'reflect' : 'unblockable'),
    reflected: false });
}

// kind: 'chutney' (poison) | 'gas' (poison) | 'fire' (burn) | 'spoil' (wet sand)
// opts: { both } also hurts enemies, { drag } multiplies movement inside it.
// Both default off, so every zone that existed before this behaves exactly as it did -
// making all zones two-sided would silently change five fights.
export function spawnZone(kind, x, y, r, life, opts) {
  G.zones.push({ kind, x, y, r, t: 0, life, both: !!(opts && opts.both), drag: (opts && opts.drag) || 1 });
}

export function updateShots() {
  const p = G.player;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i];
    s.t++;
    s.x += s.vx;
    if (s.reflected && s.source && !s.source.dead) {
      const tgt = s.source.reflectTarget;
      if (tgt && s.source.delhi && s.source.delhi.onReflectHit) {
        // a fixed target off the lane - the dredger's cab glass. It flies there, not
        // back along the floor, and the source decides what a hit means.
        s.x += clamp(tgt.x - s.x, -3.6, 3.6) - s.vx;
        s.z += clamp((s.y - tgt.y) - s.z, -3.2, 3.2);
        s.vz = 0;
        if (Math.abs(tgt.x - s.x) < 8 && Math.abs((s.y - s.z) - tgt.y) < 8) {
          s.source.delhi.onReflectHit(s.source, s);
          spawnDust(s.x, s.y, 3);
          G.shots.splice(i, 1);
          continue;
        }
      } else {
        s.y += clamp(s.source.y - s.y, -2.2, 2.2);
        if (Math.abs(s.source.x - s.x) < 20 && Math.abs(s.source.y - s.y) < 22) {
          s.source.hurt(Math.round(s.dmg * 1.5), Math.sign(s.vx) || 1, true, false);
          spawnDust(s.x, s.y, 3);
          G.shots.splice(i, 1);
          continue;
        }
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
      if (s.onHit) { s.onHit(s); G.shots.splice(i, 1); continue; }   // the source decides what a catch means
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
      else if (z.kind !== 'spoil') poisonPlayer(p, 180);
    }
    if (z.both && z.t % 24 === 0) {
      for (const e of G.enemies) {
        if (e.dead || e.state === 'dying') continue;
        if (Math.abs(e.x - z.x) < z.r && Math.abs(e.y - z.y) < 14 && e.z < 12) e.hurt(4, Math.sign(e.x - z.x) || 1, false, false);
      }
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
    } else if (z.kind === 'spoil') {
      // wet river sand: dark, flat, and it glistens where the light hits the water in it
      ctx.globalAlpha = Math.min(1, fade * 1.6) * 0.85;
      ctx.fillStyle = '#4a3c2c';
      ctx.beginPath(); ctx.ellipse(sx, sy, z.r, z.r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5c4a36';
      ctx.beginPath(); ctx.ellipse(sx - z.r * 0.15, sy - 2, z.r * 0.7, z.r * 0.18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(190,200,190,0.35)';
      for (let i = 0; i < 5; i++) {
        const gx = sx + Math.sin(i * 2.1 + z.t * 0.03) * z.r * 0.6, gy = sy - 1 + Math.cos(i * 1.7) * z.r * 0.14;
        ctx.fillRect(Math.round(gx), Math.round(gy), 3, 1);
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
    } else if (s.kind === 'brick') {
      ctx.save();
      ctx.translate(sx, sy - 14);
      ctx.rotate(s.t * 0.22);
      ctx.fillStyle = '#9a4a30';
      ctx.fillRect(-6, -3, 12, 6);
      ctx.fillStyle = '#c8705a';
      ctx.fillRect(-6, -3, 12, 2);
      ctx.fillStyle = '#5a2418';
      ctx.fillRect(-6, 2, 12, 1);
      ctx.restore();
    } else if (s.kind === 'weight') {
      // MANJA's iron weight on its glass string, drawn back to him
      const sx = Math.round(s.x - camX), sy = Math.round(s.y - s.z);
      ctx.strokeStyle = 'rgba(255,120,200,0.8)';
      ctx.lineWidth = 1;
      if (s.source && !s.source.dead) {
        ctx.beginPath(); ctx.moveTo(Math.round(s.source.x - camX), Math.round(s.source.y - s.source.z - 40)); ctx.lineTo(sx, sy); ctx.stroke();
      }
      ctx.fillStyle = '#4a4a52';
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.fillStyle = '#8a8a92';
      ctx.fillRect(sx - 2, sy - 3, 2, 2);
    } else if (s.kind === 'hook') {
      // BIRJU's shunting hook on its chain
      const sx = Math.round(s.x - camX), sy = Math.round(s.y - s.z);
      if (s.source && !s.source.dead) {
        const bx = Math.round(s.source.x - camX), by = Math.round(s.source.y - s.source.z - 46);
        ctx.strokeStyle = '#5a5a62'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.strokeStyle = '#9a9aa2'; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(sx, sy); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.fillStyle = '#c8c8d0';
      ctx.fillRect(sx - 4, sy - 4, 8, 8);
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(sx - 2, sy - 2, 4, 4);
    } else if (s.kind === 'handset') {
      const sx = Math.round(s.x - camX), sy = Math.round(s.y - s.z);
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(s.t * 0.3);
      ctx.fillStyle = '#e8e8f0'; ctx.fillRect(-7, -3, 14, 6);
      ctx.fillStyle = '#30303a'; ctx.fillRect(-7, -3, 4, 6); ctx.fillRect(3, -3, 4, 6);
      ctx.restore();
    } else if (s.kind === 'slurry') {
      // a gout of grey river mud, with the drips coming off it
      const wob = Math.sin(s.t * 0.6) * 1.5;
      ctx.fillStyle = s.reflected ? '#b0b8a8' : '#7a7466';
      ctx.beginPath(); ctx.ellipse(sx, sy - 12 + wob, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a5448';
      ctx.beginPath(); ctx.ellipse(sx + 3, sy - 10 + wob, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8a8474';
      ctx.fillRect(sx - 4, sy - 6 + ((s.t >> 1) & 3), 2, 3);
      ctx.fillRect(sx + 4, sy - 5 + ((s.t + 2 >> 1) & 3), 2, 2);
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
