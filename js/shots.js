// shots.js - projectiles (burning samosas, chilli powder, steam) and the
// lingering floor hazards they leave behind (chutney puddles, tear gas).
import { G, W, clamp } from './engine.js';
import { hurtPlayer, shockPlayer, blindPlayer, poisonPlayer, chipPlayer, resolveIncomingHit, parryStagger } from './player.js';
import { spawnDust } from './effects.js';
import { fx } from './fx.js';
import { blit, frameW, frameH } from './sprites.js';
import { getAIFrame } from './aiframes.js';
const grabArt = (name) => getAIFrame('dl_grab', name)?.f[0] || null;
import { ASSETS } from './assets.js';
import { pappu } from './vendor_sound.js';

export const VENDOR_OIL_LANDING_GRACE = 24; // 0.4 seconds after a jump, scoped to Pappu's oil.
const oilAirborne = p => p.state === 'jump' || p.state === 'jumpkick' || p.z > 0;
const inZone = (p, z, reach=z.r) => Math.abs(p.x-z.x)<reach && Math.abs(p.y-z.y)<14;

const LIFE = { powder: 90, samosa: 140, steam: 40, brick: 160, slurry: 150, weight: 150, hook: 90, handset: 140, suitcase: 150, chai: 150, sack: 150, sludge: 150, pot: 140, naan: 150, oil: 140, crack: 30, taser: 30, paan: 24 };

export function spawnShot(kind, x, y, vx, dmg, options = {}) {
  const s = { kind, x, y, x0: x, z: 0, vx, vz: 0, dmg, t: 0, life: LIFE[kind] || 110,
    source: options.source || null, fx: !!options.fx,
    parryClass: options.parryClass || (options.parryable ? 'reflect' : 'unblockable'),
    reflected: false, bowl: !!options.bowl, landed: options.landed, h: options.h };
  if (kind === 'steam') { s.h = options.h || 10; s.spout = options.spout ?? x; }   // drawSteam: spout height above the lane, spout x
  G.shots.push(s);
  return s;
}

// Lobbed arc: rises, falls, and bursts into a zone where it lands.
export function spawnArc(kind, x, y, vx, vz, dmg, burst, options = {}) {
  G.shots.push({ kind, x, y, z: options.z === undefined ? 20 : options.z, vx, vz, dmg, t: 0, life: LIFE[kind] || 140, burst,
    source: options.source || null,
    parryClass: options.parryClass || (options.parryable ? 'reflect' : 'unblockable'),
    reflected: false, landed: options.landed, jumpSafe: !!options.jumpSafe, jumpEvaded: false,oilBomb:!!options.oilBomb,spicy:!!options.spicy,visualScale:options.visualScale||1,burstRadius:options.burstRadius||22,hitRadius:options.hitRadius||16 });
}

// kind: 'chutney' (poison) | 'gas' (poison) | 'fire' (burn) | 'spoil' (wet sand) | 'sludge' (river muck, slows)
// opts: { both } also hurts enemies, { drag } multiplies movement inside it.
// { jumpSafe } makes Pappu's oil burn only on grounded entry, never on a jump landing.
// Both default off, so every zone that existed before this behaves exactly as it did -
// making all zones two-sided would silently change five fights.
export function spawnZone(kind, x, y, r, life, opts) {
  const z={ kind, x, y, r, t: 0, life, both: !!(opts && opts.both), drag: (opts && opts.drag) || 1, jumpSafe: !!opts?.jumpSafe };
  if(z.jumpSafe)z.playerInside=inZone(G.player,z);
  G.zones.push(z);
}

// The chai puddle's life (tools/production/build_chai_puddle.py): splash row 0 (cols 1-5, 3 ticks each), the hot
// loop row 1 (ripples 0,1,5; a bubble rises and pops over 2-4), then row 2 cools to a cold stain over the last 38%.
// CHAI_BODY is each frame's body half-width at z.r 20, so the burn reaches exactly as far as the tea is drawn.
const CHAI_BODY = [12.4, 17.3, 18.9, 20.2, 19.9, 19.2, 20.0, 20.0, 20.3, 20.1, 20.1, 19.6, 20.0, 19.9, 20.1, 18.1, 14.3, 9.7];
const CHAI_LOOP = [0, 1, 5, 0, 1, 5, 0, 1, 2, 3, 4, 5], CHAI_SPLASH = 15;
const chaiSeed = z => (Math.round(z.x) * 7 + Math.round(z.y) * 3) % 12;
function chaiFrame(z) {
  const cool = Math.round(z.life * 0.62);
  if (z.t < CHAI_SPLASH) return [0, 1 + Math.min(4, (z.t / 3) | 0), 0];
  if (z.t < cool) return [1, CHAI_LOOP[(((z.t - CHAI_SPLASH) / 5 | 0) + chaiSeed(z)) % 12], 0];
  const u = clamp((z.t - cool) / Math.max(1, z.life - cool), 0, 1);
  return [2, Math.min(5, (u * 6) | 0), u];
}
// The cold stain (last two cooling frames) no longer scalds.
export function chaiReach(z) {
  const [row, col] = chaiFrame(z);
  return row === 2 && col >= 4 ? 0 : z.r * CHAI_BODY[row * 6 + col] / 20;
}

export function updateShots() {
  const p = G.player, shots = G.shots;
  const airborne=oilAirborne(p);
  p.vendorOilGrace=airborne?VENDOR_OIL_LANDING_GRACE:Math.max(0,(p.vendorOilGrace||0)-1);
  const walking=!airborne&&['idle','walk','run','dash'].includes(p.state)&&Math.hypot(p.x-(p.vendorOilX??p.x),p.y-(p.vendorOilY??p.y))>.08;
  p.vendorOilX=p.x;p.vendorOilY=p.y;
  // A reflected lethal hit can enter a cinematic and replace the projectile list.
  // Finish this collision only; never process or splice its replacement.
  for (let i = shots.length - 1; i >= 0 && shots === G.shots; i--) {
    const s = shots[i];
    if (!s) break;
    s.t++;
    s.x += s.vx;
    // Barbs in CHAD: the wires stay on him, crackling, until the captain lets go.
    if (s.latched) { s.x = p.x; s.y = p.y; if (s.t > s.life || p.state !== 'hurt' || !s.source || s.source.dead || s.source.state !== 'attack') shots.splice(i, 1); continue; }
    if (s.reflected && s.source && !s.source.dead && !s.source.backupProtected) {
      const tgt = s.source.reflectTarget;
      if (tgt && s.source.delhi && s.source.delhi.onReflectHit) {
        // a fixed target off the lane - the dredger's cab glass. It flies there, not
        // back along the floor, and the source decides what a hit means.
        s.x += clamp(tgt.x - s.x, -3.6, 3.6) - s.vx;
        s.z += clamp((s.y - tgt.y) - s.z, -3.2, 3.2);
        s.vz = 0;
        if (Math.abs(tgt.x - s.x) < 8 && Math.abs((s.y - s.z) - tgt.y) < 8) {
          s.source.delhi.onReflectHit(s.source, s);
          s.source.counterApplying=false;
          spawnDust(s.x, s.y, 3);
          shots.splice(i, 1);
          continue;
        }
      } else {
        // A parried trunk bowls over everyone between CHAD and its thrower.
        if (s.bowl) for (const o of G.enemies) {
          if (o === s.source || o.dead || ['down', 'thrown', 'dying'].includes(o.state) || (s.bowled ||= []).includes(o)) continue;
          if (Math.abs(o.x - s.x) < 18 && Math.abs(o.y - s.y) < 16 && o.z < 30) { s.bowled.push(o); o.hurt(12, Math.sign(s.vx) || 1, true, true); spawnDust(o.x, o.y, 3); }
        }
        s.y += clamp(s.source.y - s.y, -2.2, 2.2);
        // A parried lob comes back on a flat line to the thrower's chest.
        if (s.homing) { s.x += clamp(s.source.x - s.x, -4.4, 4.4) - s.vx; s.z += clamp(30 - s.z, -1.5, 1.5); }
        if (Math.abs(s.source.x - s.x) < 20 && Math.abs(s.source.y - s.y) < 22) {
          parryStagger(s.source, Math.sign(s.vx) || 1);
          s.source.counterApplying=true;s.source.reflectedKind=s.kind;
          s.source.hurt(Math.round(s.dmg * 1.5), Math.sign(s.vx) || 1, true, false);
          s.source.counterApplying=false;s.source.reflectedKind=null;
          if (s.burst === 'chai') spawnZone('chai', s.source.x, s.source.y, 20, 200, { both: true });
          spawnDust(s.x, s.y, 3);
          shots.splice(i, 1);
          continue;
        }
      }
    }
    if (!(s.homing && s.reflected && s.source && !s.source.dead) && (s.vz || s.z > 0)) { s.z += s.vz; s.vz -= 0.24; }

    // landed: burst into a lingering zone
    if (s.z < 0) {
      // Scalding chai stays on the floor and burns whoever stands in it, either side.
      if (s.burst === 'chai') { spawnZone('chai', s.x, s.y, 20, 200, { both: true }); G.audio.sfx('land'); }
      else if (s.burst === 'sludge') { spawnZone('sludge', s.x, s.y, 24, 420, { both: true, drag: 0.5 }); G.audio.sfx('land'); }
      else if (s.burst === 'sand') spawnDust(s.x, s.y, 8);
      else if (s.burst) spawnZone(s.burst, s.x, s.y, s.burstRadius||22, 240, {jumpSafe:s.jumpSafe});
      if (s.kind === 'oil') {pappu('oil_land', s.x,s.oilBomb?1.25:1);if(s.oilBomb){G.shake=Math.max(G.shake,4);spawnDust(s.x,s.y,6);}} // the vendor's flung ghee splats and sizzles where it lands
      spawnDust(s.x, s.y, 2);
      shots.splice(i, 1);
      continue;
    }

    const crossing = Math.abs(p.x-s.x)<16 && Math.abs(p.y-s.y)<18;
    if(s.jumpSafe&&crossing&&airborne)s.jumpEvaded=true;
    const hit = !(s.jumpSafe&&(airborne||p.vendorOilGrace>0||s.jumpEvaded)) && Math.abs(p.x - s.x) < (s.hitRadius||16) && Math.abs(p.y - s.y) < 18 &&
      Math.abs(p.z - s.z) < 24;
    if (hit && !s.reflected && !s.fx) {   // fx steam is the look of a hit that was already resolved
      if (resolveIncomingHit(p, s.source, { parryClass: s.parryClass, dmg:s.dmg, x:s.x, projectile:!!s.source })) {
        if(p.lastDefense==='guard'||p.lastDefense==='deflect'){shots.splice(i,1);continue;}
        spawnDust(s.x, s.y, 3);
        // A flat throw goes back flat at its release height (draws key their lift off s.t);
        // only lobbed arcs get the pop-up bounce and a fresh clock.
        const flat = !s.vz && s.z <= 0;
        s.reflected = true;
        if (s.kind === 'chai' || s.kind === 'sack') { s.homing = true; s.vz = 0; s.life = s.t + 120; } else s.burst = null;
        s.vx = -(s.vx || (p.face * 2.5)) * 1.35;
        if (flat) s.life = s.t + (LIFE[s.kind] || 110);
        else if (!s.homing) { s.vz = Math.max(s.vz, 0.4); s.t = 0; }
        continue;
      }
      if (s.onHit) { s.onHit(s); shots.splice(i, 1); continue; }   // the source decides what a catch means
      // The barbs bite: CHAD locks up on his feet for the charge, then drops; the wires stay in him till he is down.
      // (no bite on an invulnerable, floored or rising CHAD: the barbs just drop, no latch and no zap)
      if (s.kind === 'taser') { if (!shockPlayer(p, s.dmg, Math.sign(s.vx) || 1, 18)) { shots.splice(i, 1); continue; } s.latched = true; s.vx = 0; s.life = s.t + 20; G.audio.roomSfx?.('super_electric', .3, .45); continue; }
      hurtPlayer(p, s.dmg, Math.sign(s.vx) || 1, s.kind !== 'powder' && s.kind !== 'chai');
      s.landed?.(s);
      if (s.kind === 'powder') blindPlayer(p, 50);
      if (s.burst === 'sludge') spawnZone('sludge', s.x, s.y, 24, 420, { both: true, drag: 0.5 });
      else if (s.burst === 'sand') spawnDust(s.x, s.y, 8);
      else if (s.burst && s.burst !== 'chai') spawnZone(s.burst, s.x, s.y, 18, 160, {jumpSafe:s.jumpSafe});   // a direct chai hit leaves no puddle underfoot
      shots.splice(i, 1);
      continue;
    }
    if (s.t > s.life || s.x < G.camX - 40 || s.x > G.camX + W + 40) shots.splice(i, 1);
  }

  for (let i = G.zones.length - 1; i >= 0; i--) {
    const z = G.zones[i];
    z.t++;
    const reach = z.kind === 'chai' ? chaiReach(z) : z.r;
    const overlap=inZone(p,z,reach),inside=overlap&&p.z<12;
    if(z.jumpSafe){
      if(z.t<z.life&&overlap&&!z.playerInside&&walking&&p.vendorOilGrace===0)hurtPlayer(p,4,p.x<z.x?-1:1,false);
      // Track the footprint while airborne too: landing in a cleared patch is never a fresh entry.
      z.playerInside=overlap;
    }
    if (!z.jumpSafe && inside && z.t % 24 === 0) {
      if (z.kind === 'fire') hurtPlayer(p, 4, p.x < z.x ? -1 : 1, false);
      else if (z.kind === 'chai') chipPlayer(p, 2);   // scald without a flinch, so a puddle can't stun-lock
      else if (z.kind !== 'spoil' && z.kind !== 'sludge') poisonPlayer(p, 180);
    }
    if (z.both && z.t % 24 === 0 && z.kind !== 'sludge') {
      for (const e of G.enemies) {
        if (e.dead || e.state === 'dying') continue;
        if (Math.abs(e.x - z.x) < reach && Math.abs(e.y - z.y) < 14 && e.z < 12) e.hurt(4, Math.sign(e.x - z.x) || 1, false, false);
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
    } else if (z.kind === 'chai') {
      // Splash, a living hot puddle with steam, then it cools, dulls and shrinks to a stain.
      if (ASSETS.chai_puddle) drawChaiPuddle(ctx, z, sx, sy);
      else { ctx.globalAlpha = fade * 0.7; ctx.fillStyle = '#c86a18'; ctx.beginPath(); ctx.ellipse(sx, sy, z.r, z.r * 0.25, 0, 0, Math.PI * 2); ctx.fill(); }
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
    } else if (z.kind === 'sludge') {
      // Dredged river muck: a splat, a wet puddle that holds CHAD's feet, then a dry crust.
      const f = grabArt(z.t < 10 ? 'splat' : fade > 0.25 ? 'puddle' : 'dry');
      ctx.globalAlpha = Math.min(1, fade * 4);
      if (f) { const k = z.r * 2.4 / frameW(f); ctx.drawImage(f, sx - frameW(f) * k / 2, sy + 4 - frameH(f) * k, frameW(f) * k, frameH(f) * k); }
      else { ctx.fillStyle = '#3a3226'; ctx.beginPath(); ctx.ellipse(sx, sy, z.r, z.r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
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

function drawChaiPuddle(ctx, z, sx, sy) {
  const im = ASSETS.chai_puddle, steam = ASSETS.chai_steam, k = z.r / 20, seed = chaiSeed(z);
  const [row, col, u] = chaiFrame(z), end = clamp((z.life - z.t) / 14, 0, 1);
  // 112x100 cells at 2x, body centre at (56, 80): drawn at logical size, centred on the zone.
  ctx.globalAlpha = end;
  ctx.drawImage(im, col * 112, row * 100, 112, 100, sx - 28 * k, sy - 40 * k, 56 * k, 50 * k);
  const hot = row === 2 ? 1 - u : 1;
  // A glint slides across the wet surface now and then while it is hot.
  const g = (z.t + seed * 11) % 44;
  if (row === 1 && g < 8) {
    const gx = Math.round(sx + (((z.t / 44 | 0) * 13 + seed * 5) % 22 - 11) * k), gy = Math.round(sy - 2 + ((z.t / 44 | 0) % 3) - 1);
    ctx.globalAlpha = end * (g < 4 ? g / 4 : (8 - g) / 4);
    ctx.fillStyle = '#fff3d6'; ctx.fillRect(gx, gy, 1, 1);
    ctx.fillStyle = 'rgba(255,236,196,.7)'; ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3);
  }
  // Scald shimmer: two faint heat lines waver up off the tea until it cools.
  if (z.t >= CHAI_SPLASH && hot > 0.3) {
    ctx.fillStyle = '#ffe2b8';
    for (let n = 0; n < 2; n++) {
      const c = ((z.t + n * 20 + seed * 3) % 40) / 40, y = Math.round(sy - 6 - c * 14);
      ctx.globalAlpha = end * 0.16 * hot * Math.sin(Math.PI * c);
      for (let x = -9; x <= 9; x += 2) ctx.fillRect(Math.round(sx + x * k), y + Math.round(Math.sin(x * 0.7 + z.t * 0.25 + n * 2)), 2, 1);
    }
  }
  // Steam: three wisps on their own clocks; fewer as it cools, none from the stain.
  if (steam && z.t >= 6) {
    const wisps = row < 2 ? 3 : col < 2 ? 2 : col < 4 ? 1 : 0;
    for (let n = 0; n < wisps; n++) {
      const tt = z.t - 6 + n * 13 + seed * 2, cyc = tt % 38;
      if (cyc >= 30) continue;   // a short breath between wisps
      const f = (cyc / 5) | 0, ox = [-9, 3, 11][n] + ((tt / 38 | 0) * 5 + n) % 5 - 2;
      ctx.globalAlpha = end * (row === 2 ? 0.34 * hot + 0.12 : 0.46) * (z.t < 12 ? (z.t - 6) / 6 : 1);
      ctx.drawImage(steam, f * 36, 0, 36, 64, Math.round(sx + ox * k - 7.5), Math.round(sy - 29 - cyc * 0.12), 15, 27);
    }
  }
}

export function drawShots(ctx, camX) {
  for (const s of G.shots) {
    const sx = Math.round(s.x - camX), sy = Math.round(s.y - s.z);
    if (s.draw) { s.draw(ctx, s, sx, sy); continue; }   // a boss module's own projectile art
    const crewWrench=s.kind==='wrench'&&(s.source?.key==='dredger'||s.source?.trainType==='ic_docker')&&grabArt('wrench');
    if(crewWrench){const f=(s.h===68&&ASSETS.delhi_docker_wrench)||crewWrench,k=30/frameW(f);ctx.save();ctx.translate(sx,sy-(s.h||46));ctx.rotate(s.t*.3*(Math.sign(s.vx)||1));ctx.drawImage(f,-frameW(f)*k/2,-frameH(f)*k/2,frameW(f)*k,frameH(f)*k);ctx.restore();continue;}
    const chapterProp=G.stage.chapter&&(s.kind==='handset'||s.kind==='phone'||s.kind==='wrench'&&s.source?.key==='vendor');
    if(G.stage.id==='refund'&&['phone','handset'].includes(s.kind)&&ASSETS.ic_refund_equipment){
      const i=s.kind==='phone'?0:2,im=ASSETS.ic_refund_equipment;
      ctx.save();ctx.translate(sx,sy-46);ctx.rotate(s.t*.22*(Math.sign(s.vx)||1));
      ctx.drawImage(im,i%2*64,Math.floor(i/2)*64,64,64,-16,-16,32,32);ctx.restore();continue;
    }
    if(chapterProp&&ASSETS.ic_projectiles){
      // ladle, handset, keyboard / pan, desk phone, wrench
      const [c,r]=s.kind==='wrench'?[0,0]:s.kind==='phone'?[1,1]:[1,0],im=ASSETS.ic_projectiles;
      ctx.save();ctx.translate(sx,sy-46);ctx.rotate(s.t*.22);
      ctx.drawImage(im,c*64,r*64,64,64,-16,-16,32,32);ctx.restore();continue;
    }
    if(s.kind==='crack'){
      // The cricketer's slam splits the ground: a jagged line from the bat running on down his lane.
      const x0=Math.round(s.x0-camX),dir=Math.sign(s.vx)||1,y=Math.round(s.y);
      ctx.save();ctx.strokeStyle='#1c130c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0,y);
      for(let x=x0,i=0;(sx-x)*dir>0;i++){x+=dir*4;ctx.lineTo(x,y+(i*7)%5-2);}
      ctx.stroke();ctx.fillStyle='#8a6a44';ctx.fillRect(sx-2,y-3-(s.t&3),2,2);ctx.fillRect(sx+dir*2,y-2,2,1);ctx.restore();
      continue;
    }
    if(s.kind==='chai'){drawChai(ctx,s,sx,sy);continue;}
    if(s.kind==='naan'||s.kind==='oil'){
      // The vendor's naan spins flat through the air; his oil flies in glistening, wobbling globs.
      const im=ASSETS.dv_items;
      if(s.kind==='naan'){
        // Sent back, it climbs to his face (the vendor is a head taller than CHAD).
        const back=s.reflected&&s.source?50*Math.max(0,1-Math.abs(s.source.x-s.x)/110):0;
        const y=sy-44-back-18*Math.max(0,1-s.t/10),cell=(s.t>>2)&1;
        if(im){const cw=im.width/4,w=cw/2,h=im.height/2;ctx.save();ctx.translate(sx,y);ctx.rotate(cell?0:s.t*.3);ctx.drawImage(im,cell*cw,0,cw,im.height,-w/2,-h/2,w,h);ctx.restore();}
        else{ctx.fillStyle='#e8c070';ctx.fillRect(sx-8,y-3,16,6);}}
      else{const y=sy-10,large=s.oilBomb&&ASSETS.dv_oil_bomb,g=large||ASSETS.dv_glob;
        if(g){const cw=g.width/4,w=large?cw/2:cw,h=large?g.height/2:g.height;ctx.save();ctx.translate(sx,y);if(!large)ctx.scale(s.visualScale||1,s.visualScale||1);if(s.vx<0)ctx.scale(-1,1);ctx.rotate(Math.atan2(-(s.vz||0),Math.abs(s.vx)||1));const sx0=((s.t>>2)&3)*cw,dx0=large?-w/2:7-w;
          // Pappu's chilli globs: a dark closed outline and a red-hot core so each one reads against his fire-lit kitchen.
          if(s.spicy){ctx.filter='brightness(0)';for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(g,sx0,0,cw,g.height,dx0+ox,-h/2+oy,w,h);ctx.filter='saturate(1.35) hue-rotate(-8deg) brightness(1.12)';}
          ctx.drawImage(g,sx0,0,cw,g.height,dx0,-h/2,w,h);ctx.restore();}
        else{ctx.fillStyle='#d88a18';ctx.beginPath();ctx.ellipse(sx,y,4,3,0,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle=s.spicy?'rgba(20,0,0,.5)':'rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(sx,Math.round(s.y),4*(s.visualScale||1),1.5*(s.visualScale||1),0,0,Math.PI*2);ctx.fill();}
      continue;
    }
    if(s.kind==='suitcase'){
      // Leaves the conductor's hands at shoulder height, then flies flat at chest height.
      const im=ASSETS.nr_conductor_suitcase;ctx.save();ctx.translate(sx,sy-40-26*Math.max(0,1-s.t/12));ctx.rotate(s.t*.25*Math.sign(s.vx||1));
      if(im){const w=im.width/2,h=im.height/2;ctx.drawImage(im,-w/2,-h/2,w,h);}else{ctx.fillStyle='#6b3f22';ctx.fillRect(-12,-8,24,16);}
      ctx.restore();continue;
    }
    if(s.kind==='taser'){
      // Two barbed darts on crackling wires, strung back to the captain's taser.
      const src=s.source,hx=src?Math.round(src.x+src.face*30-camX):Math.round(s.x0-camX),hy=src?Math.round(src.y-src.z)-56:sy-56,d=src?src.face:Math.sign(s.vx)||1;
      // Latched, the barbs sit in CHAD's chest and ride him down; the wires sag between.
      const P=G.player,tx=s.latched?Math.round(P.x-camX)-d*4:sx,ty=s.latched?Math.round(P.y-P.z)-(P.state==='down'?18:44):hy,n=Math.max(1,Math.abs(tx-hx)/6|0);
      ctx.save();ctx.strokeStyle=s.latched&&s.t&1?'rgba(170,225,255,.95)':'rgba(210,230,255,.85)';ctx.lineWidth=1;
      for(const o of [-1,1]){ctx.beginPath();ctx.moveTo(hx,hy+o);for(let i=1;i<=n;i++){const k=i/n,sag=s.latched?Math.sin(k*Math.PI)*4:0;ctx.lineTo(Math.round(hx+(tx-hx)*k),Math.round(hy+(ty-hy)*k+o*2+sag+(i<n?((i*5+s.t)%3)-1:0)));}ctx.stroke();}
      ctx.fillStyle='#fff6a0';ctx.fillRect(tx-1,ty-3,3,2);ctx.fillRect(tx-1,ty+2,3,2);
      if(s.latched){
        // the charge arcing over him: short blue-white forks that jump about his body each tick
        // (standing, they run up and down his body; floored, along it)
        const flat=P.state==='down';
        for(let j=0;j<4;j++){const a=(s.t*7+j*23)%29,u=(a*3+j*11)%34,bx=flat?tx+u-17:tx+d*((a%13)-6),by=flat?ty-6+(a%9):ty-14+u;ctx.fillStyle=j&1?'#e8f8ff':'#6fc8ff';
          ctx.fillRect(bx,by,1,3);ctx.fillRect(bx+(j&2?1:-1),by+2,1,2);ctx.fillRect(bx,by+4,2,1);}
      }else if(s.t&2){ctx.fillStyle='#8fd8ff';ctx.fillRect(sx+d*2,hy-5,1,3);ctx.fillRect(sx+d*3,hy+3,1,3);}
      ctx.restore();continue;
    }
    if(s.kind==='paan'){
      // Paan spray aimed at CHAD's face: a wet burst at the lips, a soft noisy mist that thins along its length,
      // and ragged drops of mixed sizes. On a face-full the drops end at his face, a few specks fall off it, and the rest fades.
      const d=s.face||1,ox=s.x0-camX,oy=s.y-(s.mouthY||48),t=s.t,hit=s.stopAt!=null,reach=hit?Math.abs(s.stopAt-s.x0):130;
      const since=hit?t-(s.hitT||t):0,fade=hit?clamp(1-since/6,0,1):1,aim=Math.atan2(s.aimY??-30,s.aimX||70);
      const H=(k,n)=>{const v=Math.sin(k*127.1+n*311.7+s.x0*.013)*43758.5453;return v-Math.floor(v);};
      ctx.save();
      if(t<16){
        const L=Math.min(reach,14+t*13),life=1-t/16;
        for(let k=0;k<22;k++){
          const f=(k+H(k,1))/22,along=f*L,wide=2+along*.28,jit=H(k,2+(t>>1))-.5;
          const x=ox+d*Math.cos(aim)*along,y=oy+Math.sin(aim)*along+jit*wide;
          ctx.globalAlpha=.3*life*(1-f*.8)*fade;ctx.fillStyle=k%3?'#a8101f':'#d8404a';
          ctx.beginPath();ctx.arc(x,y,1.2+wide*.35*(.6+H(k,3)*.6),0,Math.PI*2);ctx.fill();
        }
      }
      ctx.globalAlpha=1;
      if(t<3){const X=Math.round(ox+d*3),Y=Math.round(oy-1);ctx.fillStyle='#8a0a16';ctx.fillRect(X-1,Y-1,3,3);ctx.fillStyle='#e0303e';ctx.fillRect(X,Y-1,1,3);ctx.fillRect(X-1,Y,3,1);ctx.fillStyle='#ffb0a0';ctx.fillRect(X,Y,1,1);}
      for(let i=0;i<18;i++){
        const v=11+H(i,4)*4,a=aim+(H(i,5)-.5)*.5,dist=v*Math.cos(a)*t,size=H(i,6)<.28?3:H(i,6)<.62?2:1;
        if(dist>=reach||t>22)continue;
        const faceY=oy+Math.tan(aim)*reach;
        const al=fade*clamp((24-t)/8,0,1);if(al<=0)continue;
        const x=Math.round(ox+d*dist),vy=v*Math.sin(a)+.1*t,y=Math.round(oy+v*Math.sin(a)*t+.05*t*t);
        if(hit&&(y<faceY-5||dist>reach*.8))continue;   // after a face-full nothing sails on over his head
        ctx.globalAlpha=al;
        if(y>=Math.round(s.y)-1){ctx.fillStyle='#6a0a14';ctx.fillRect(x-1,Math.round(s.y)-1,size+1,1);continue;}
        const tx=-d*Math.sign(Math.round(v*Math.cos(a))||1),ty=vy>1.2?-1:vy<-1.2?1:0;
        if(size===1){ctx.fillStyle=i%2?'#c8182a':'#e8404a';ctx.fillRect(x,y,1,1);continue;}
        ctx.fillStyle='#6a0610';ctx.fillRect(x,y+size-1,size,1);ctx.fillRect(x+tx*size,y+ty,1,1);   // shade under, tail behind
        ctx.fillStyle=i%2?'#c8182a':'#e03040';ctx.fillRect(x,y,size,size-1);if(size===3)ctx.fillRect(x+(d>0?0:1),y+2,2,1);
        ctx.fillStyle='#ffb0a0';ctx.fillRect(x+(d>0?size-1:0),y,1,1);
      }
      ctx.restore();continue;
    }
    if(s.kind==='bullet'){
      ctx.fillStyle='#fff1a6';ctx.fillRect(sx-4,sy-80,8,1);
      ctx.fillStyle='#e59c42';ctx.fillRect(sx-Math.sign(s.vx)*12,sy-80,6,1);
    } else if (s.kind === 'powder') {
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
    } else if (s.kind === 'sack' || s.kind === 'sludge') {
      const f = grabArt(s.kind === 'sack' ? 'sack' : 'blob'), k = f ? (s.kind === 'sack' ? 26 : 20) / frameW(f) : 1;
      ctx.save(); ctx.translate(sx, sy - 10); ctx.rotate(s.kind === 'sack' ? s.t * 0.12 * (Math.sign(s.vx) || 1) : Math.sin(s.t * 0.4) * 0.12);
      if (f) ctx.drawImage(f, -frameW(f) * k / 2, -frameH(f) * k / 2, frameW(f) * k, frameH(f) * k);
      else { ctx.fillStyle = s.kind === 'sack' ? '#b89868' : '#3a3226'; ctx.fillRect(-8, -6, 16, 12); }
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
    }
  }
  drawSteam(ctx, camX);
}

// Steam: every burst (one source, one direction) is drawn once, as the ic_steam jet (4x2 frames: the nozzle
// at the left edge, mid-height; 0-1 opening, 2-4 full, 5-7 breaking up) stretched from the vessel's spout
// to its farthest puff, at the spout's height (spawnShot options h / spout; enemies.js). Soft layered puffs
// if the sheet is missing.
function drawSteam(ctx, camX) {
  const groups = [];
  for (const s of G.shots) {
    if (s.kind !== 'steam') continue;
    const d = Math.sign(s.vx) || 1, src = s.reflected ? s : s.source || s;
    let g = groups.find(g => g.src === src && g.d === d);
    if (!g) groups.push(g = { src, d, list: [] });
    g.list.push(s);
  }
  const im = ASSETS.ic_steam;
  for (const { d, list } of groups) {
    const young = list.reduce((a, b) => b.t < a.t ? b : a), old = list.reduce((a, b) => b.t > a.t ? b : a);
    const spout = young.spout, far = Math.max(...list.map(s => (s.x - spout) * d)) + 16;
    const len = clamp(far, 26, 170), y = young.y - young.h, fade = clamp((young.life - young.t) / 14, 0, 1);
    if (fade <= 0) continue;
    const frame = old.t < 8 ? old.t >> 2 : young.t < 4 ? 2 + ((old.t >> 2) % 3) : Math.min(7, 5 + ((young.t - 4) / 7 | 0));
    const hh = clamp(len * .5, 14, 54);
    ctx.save(); ctx.globalAlpha = .92 * fade; ctx.translate(Math.round(spout - camX), Math.round(y)); ctx.scale(d, 1);
    if (im) {
      const fw = im.width / 4, fh = im.height / 2;
      ctx.drawImage(im, frame % 4 * fw, (frame >> 2) * fh, fw, fh, -2, -hh * .5, len * 1.03, hh);
    } else {
      ctx.fillStyle = '#e6e2d8';
      for (const s of list) { const u = s.t / s.life, x = (s.x - spout) * d; ctx.globalAlpha = .35 * (1 - u) * fade; ctx.beginPath(); ctx.ellipse(x, -u * 6, 4 + u * 9, 3 + u * 6, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
  }
}

// The chai gob art, split once: the inked tea tumbles with its arc, its steam stays upright.
let chaiLayers=null;
function chaiArt(g){
  if(chaiLayers?.src===g)return chaiLayers;
  const w=g.width,h=g.height,c=document.createElement('canvas');c.width=w;c.height=h;
  const x=c.getContext('2d');x.drawImage(g,0,0);const src=x.getImageData(0,0,w,h).data;
  const tea=new ImageData(w+2,h+2),steam=new ImageData(w,h),isTea=new Uint8Array((w+2)*(h+2));
  for(let i=0;i<w*h;i++){
    const r=src[i*4],gg=src[i*4+1],b=src[i*4+2];if(src[i*4+3]<128)continue;
    const hi=Math.max(r,gg,b),lo=Math.min(r,gg,b),o=hi-lo<45&&hi>100?steam.data:tea.data,j=o===steam.data?i*4:((((i/w)|0)+1)*(w+2)+i%w+1)*4;
    o[j]=r;o[j+1]=gg;o[j+2]=b;o[j+3]=255;if(o===tea.data)isTea[j/4]=1;
  }
  // a dark ink line round the tea, so it reads against the brown floor
  for(let y=0;y<h+2;y++)for(let x0=0;x0<w+2;x0++){const k=y*(w+2)+x0;if(isTea[k])continue;
    let near=false;for(let dy=-1;dy<=1&&!near;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x0+dx;if(yy>=0&&yy<h+2&&xx>=0&&xx<w+2&&isTea[yy*(w+2)+xx]){near=true;break;}}
    if(near){tea.data.set([42,20,8,255],k*4);}}
  const mk=(d,cw,ch)=>{const q=document.createElement('canvas');q.width=cw;q.height=ch;q.getContext('2d').putImageData(d,0,0);return q;};
  return chaiLayers={src:g,tea:mk(tea,w+2,h+2),steam:mk(steam,w,h),cw:w/4};
}
function drawChai(ctx,s,sx,sy){
  // Its shadow marks where it lands.
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,Math.round(s.y),7,2,0,0,Math.PI*2);ctx.fill();
  const g=ASSETS.chai_gob,y=sy-8,dir=s.vx<0?-1:1;
  if(!g){ctx.fillStyle='#d88a18';ctx.beginPath();ctx.ellipse(sx,y,5,4,0,0,Math.PI*2);ctx.fill();return;}
  const L=chaiArt(g),cw=L.cw,f=(s.t>>2)&3,k=.75,ang=Math.atan2(-(s.vz||0),Math.abs(s.vx)||1)*.6;
  // a spatter of drops behind it along the arc
  for(let i=1;i<=3&&i*2<=s.t;i++){const d=i*1.8,px=sx-(s.vx||0)*d,py=y+(s.homing?0:(s.vz||0)*d+.12*d*d),r=1.7-i*.4;
    ctx.fillStyle='#2a1408';ctx.beginPath();ctx.arc(px,py,r+.6,0,Math.PI*2);ctx.fill();ctx.fillStyle=i<2?'#e8a848':'#c07a28';ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.fill();}
  ctx.save();ctx.translate(sx,y);ctx.scale(dir,1);ctx.rotate(ang);
  ctx.drawImage(L.tea,f*cw,0,cw+2,g.height+2,-(cw+2)*k*.6,-(g.height+2)*k/2,(cw+2)*k,(g.height+2)*k);ctx.restore();
  // steam rises straight up whatever the tea is doing
  // soft, pale wisps: brightened and blurred so they read as vapour, not a grey shape
  ctx.save();ctx.translate(sx,y);ctx.scale(dir,1);ctx.globalAlpha=.55;ctx.filter='brightness(1.45) blur(.6px)';
  ctx.drawImage(L.steam,f*cw,0,cw,g.height,-cw*k*.5,-g.height*k*.45-4,cw*k*.8,g.height*k*.8);ctx.restore();
  // the green glint of a parry target while it is still coming at CHAD
  if(!s.reflected&&(s.t>>2)%3===0){ctx.fillStyle='#b8ffc4';const gx=Math.round(sx+dir*4),gy=Math.round(y-2);ctx.fillRect(gx-2,gy,5,1);ctx.fillRect(gx,gy-2,1,5);ctx.fillStyle='#6dff82';ctx.fillRect(gx-1,gy-1,3,3);ctx.fillStyle='#ffffff';ctx.fillRect(gx,gy,1,1);}
}
