// effects.js - hit sparks, dust, shockwaves, rings, steam, score popups, shake/flash
import { ASSETS } from './assets.js';
import { G } from './engine.js';
import { SPR, getFrame, drawTextShadow, textWidth, blit, frameW, frameH } from './sprites.js';
import { fx } from './fx.js';
import { updateDefeatFX, drawDefeatFX, drawDefeatGround, endBackdropFrame } from './defeat_fx.js';

export function spawnSpark(x, y) {
  // the spark art already has a bright core; the extra 4x4 white square that used
  // to fire alongside it on every hit was just a visible rectangle
  G.effects.push({ type: 'spark', x, y, t: 0, life: 9 });
}

// Authored contact accents, with no random calls or extra gameplay hitstop.
export function spawnBoxingImpact(x,y,upper,face) {
  G.effects.push({type:'boxingImpact',x,y,upper,face,t:0,life:upper?17:11});
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

// A timed parry: a green-white flare at the contact, a double shockwave, rays and a brief
// green wash over the screen. It holds on its first frame through the parry hitstop.
export function spawnParryBurst(x, y) {
  G.effects.push({ type: 'parry', x, y, t: 0, life: 14, born: G.rawTime });
}

// A deflected plain strike: a small white-steel glint, a fan of short rays and one thin ring.
// No green and no screen wash, so it never reads as a parry.
export function spawnDeflect(x, y, face) {
  G.effects.push({ type: 'deflect', x, y, face: face || 1, t: 0, life: 10, born: G.rawTime });
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

// opts.life lengthens the callout; opts.stack lifts it above any live callout it would overprint.
export function spawnPop(x, y, text, opts) {
  const e = { type: 'pop', x, y, text, t: 0, life: opts?.life || 46 };
  if (opts?.stack) for (let k = 0; k < 4; k++) {
    const o = G.effects.find(o => o.type === 'pop' && Math.abs(o.y - e.y) < 11 && Math.abs(o.x - e.x) < (textWidth(text, 1) + textWidth(o.text, 1)) / 2 + 4);
    if (!o) break; e.y = o.y - 12;
  }
  G.effects.push(e);
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
  G.shake = Math.max(G.shake, heavy ? 5 : 2);
}
// The one full-screen flash, kept for knockouts and boss turns: a faint warm blink of two
// drawn frames (main.js counts them in render, so hitstop cannot stretch it).
export function screenFlash() { G.flash = 2; }

export function updateEffects() {
  for (let i = G.effects.length - 1; i >= 0; i--) {
    const e = G.effects[i];
    e.t++;
    updateDefeatFX(e);
    if (e.step) e.step(e);   // self-driving pieces (a prop's burst chunks)
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
}

// Debris shards, four tumble phases: [dx, dy, 0 lit | 1 body | 2 dark].
const SHARDS = [
  [[0,0,0],[1,0,0],[2,0,1],[0,1,1],[1,1,1],[2,1,1],[3,1,2],[1,2,2],[2,2,2]],
  [[1,0,0],[0,1,0],[1,1,1],[2,1,1],[1,2,1],[2,2,2],[2,3,2]],
  [[1,0,0],[2,0,0],[3,0,1],[0,1,0],[1,1,1],[2,1,1],[3,1,2],[1,2,2]],
  [[2,0,0],[1,1,0],[2,1,1],[3,1,1],[1,2,1],[2,2,2],[1,3,2]],
];
const SHADE = {};
function shades(col) {
  if (SHADE[col]) return SHADE[col];
  const n = parseInt(col.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  const f = k => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k))).toString(16).padStart(2, '0')).join('');
  return (SHADE[col] = [f(1.35), col, f(.45)]);
}

export function drawEffects(ctx, camX) {
  for (const e of G.effects) {
    const sx = Math.round(e.x - camX), sy = Math.round(e.y);
    if(drawDefeatFX(ctx,e,camX))continue;
    if (e.draw) { e.draw(ctx, camX); continue; }
    if(e.type==='superElectric') {
      const im=ASSETS.electric_impact;if(im){const frame=Math.min(7,Math.floor(e.t*8/e.life));ctx.save();ctx.translate(sx,sy);ctx.scale(e.face,1);ctx.globalAlpha=.78;ctx.drawImage(im,frame%4*128,Math.floor(frame/4)*128,128,128,-26,-30,52,52);ctx.restore();}continue;
    }
    if(e.type==='boxingImpact') {
      const im=ASSETS.boxing_impacts;
      if(im){const frame=Math.min(3,Math.floor(e.t/(e.upper?4:3))),w=e.upper?50:32,h=w*1.5;
        ctx.save();ctx.translate(sx,sy);ctx.scale(e.face,1);ctx.globalAlpha=e.upper?.88:.95;
        ctx.drawImage(im,frame*128,e.upper?192:0,128,192,-w/2,-h*(e.upper?.84:.65),w,h);ctx.restore();}
    } else if (e.type === 'spark') {
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
    } else if (e.type === 'parry') {
      drawParryBurst(ctx, e, sx, sy);
    } else if (e.type === 'deflect') {
      drawDeflect(ctx, e, sx, sy);
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
      const k=e.t/e.life,im=ASSETS.nr_finale_smoke;
      ctx.globalAlpha=Math.max(0,.38*(1-k));
      if(im){const frame=Math.min(5,Math.floor(k*6)),w=e.type==='cigarSmoke'?13:18,h=w*1.5;ctx.drawImage(im,frame*64,0,64,96,Math.round(sx-w/2),Math.round(sy-h+3),w,h);}
      else{ctx.fillStyle='#a9afb3';ctx.fillRect(Math.round(sx),Math.round(sy),2,2);}
      ctx.globalAlpha=1;
    } else if (e.type === 'debris') {
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - e.life * 0.6) / (e.life * 0.4));
      // A tumbling shaded shard: lit edge, body, dark underside, alternating orientation.
      const [lit, body, dark] = shades(e.col), x = Math.round(sx) - 2, y = Math.round(sy) - 1, turn = ((e.t >> 2) + (e.x & 3)) & 3;
      for (const [dx, dy, c] of SHARDS[turn]) { ctx.fillStyle = c === 0 ? lit : c === 1 ? body : dark; ctx.fillRect(x + dx, y + dy, 1, 1); }
      ctx.globalAlpha = 1;
    } else if (e.type === 'pop') {
      ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e.t - 24) / (e.life - 24));
      // Below the mid-boss entrance banner (hud.js: y 60-86 for 140 frames) while it shows.
      // Beside his head rather than on it, toward the roomier side of the screen.
      const b = G.boss, banner = b?.mini && G.rawTime - b.spawnT < 140 && sy > 52 && sy < 92;
      const tw = textWidth(e.text, 1), bx = banner ? sx + (sx < 240 ? 1 : -1) * (tw / 2 + 34) : sx;
      drawTextShadow(ctx, e.text, Math.round(bx - tw / 2), banner ? 92 : sy, '#ffd94a', 1);
      ctx.globalAlpha = 1;
    }
  }
  endBackdropFrame();
}

// The authored crater is floor art, so it must sit behind bodies. Drawing it in the
// regular effects pass covered CHAD at the exact payoff frame of RAGNAROK.
export function drawRagnarokGround(ctx, camX) {
  if(G.india?.review.fx!==false)drawDefeatGround(ctx,camX);
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
// Brake-shoe sparks at wheel/rail contacts: a warm glow plus streaks thrown the way the train travels.
export function drawWheelSparks(ctx,xs,railY,t,power,speed,dir=-1){
  if(power<=0)return;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [b,x]of xs.entries()){
    const flicker=.65+.35*Math.sin(t*1.7+b*2.1);
    const glow=ctx.createRadialGradient(x,railY,0,x,railY,22);
    glow.addColorStop(0,`rgba(255,196,110,${.5*power*flicker})`);glow.addColorStop(1,'rgba(255,120,40,0)');
    ctx.fillStyle=glow;ctx.fillRect(x-22,railY-22,44,26);
    for(let i=0;i<26;i++){
      const life=9+(i*7+b*3)%10,clock=t+i*3+b*11,age=clock%life,k=age/life;
      if(Math.sin(i*12.9+b*4.1+Math.floor(clock/life)*2.7)>power*1.8-.4)continue;
      const vx=dir*((1+((i*37+b*13)%10)/3.5)*speed+.5),vy=-(1.1+((i*53+b*7)%9)/3.5);
      const px=x+(i%5-2)*3+vx*age,py=railY+vy*age+.2*age*age;if(py>railY+1)continue;
      ctx.strokeStyle=k<.3?'#fffbe6':k<.65?'#ffc864':'#f0702c';ctx.lineWidth=k<.4?1.5:1;
      ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-vx*1.6,py-(vy+.4*age)*1.6);ctx.stroke();
    }
  }
  ctx.restore();
}

function drawDeflect(ctx, e, sx, sy) {
  // Real time, like the parry flare, so it plays through the short deflect hitstop.
  const w = Math.min(G.rawTime - (e.born ?? G.rawTime), e.t + 6), k = Math.min(1, w / 10);
  if (k >= 1) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = 5 + w * 1.2, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(.45, `rgba(190,210,230,${.7 * (1 - k)})`); g.addColorStop(1, 'rgba(120,150,180,0)');
  ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  // Six short rays fanned back toward the attacker, the side the blow came from.
  ctx.strokeStyle = `rgba(235,242,255,${1 - k})`; ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * .42 + (e.face > 0 ? 0 : Math.PI), r0 = 4 + k * 10, r1 = r0 + (i === 2 || i === 3 ? 9 : 5) * (1 - k * .6);
    ctx.beginPath(); ctx.moveTo(Math.round(sx + Math.cos(a) * r0), Math.round(sy + Math.sin(a) * r0));
    ctx.lineTo(Math.round(sx + Math.cos(a) * r1), Math.round(sy + Math.sin(a) * r1)); ctx.stroke();
  }
  ctx.strokeStyle = `rgba(200,215,235,${(1 - k) * .8})`;
  ctx.beginPath(); ctx.ellipse(sx, sy, 5 + k * 16, 4 + k * 11, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

function drawParryBurst(ctx, e, sx, sy) {
  const t = e.t;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  // The wash runs on real time: a two-frame blink, not a tint held through the hitstop.
  const w = G.rawTime - (e.born ?? G.rawTime);
  if (w < 3 && !G.reflecting) { ctx.fillStyle = `rgba(90,255,130,${0.18 * (1 - w / 3)})`; ctx.fillRect(0, 0, 480, 270); }
  // The core flares on real time, so it fades during the parry freeze instead of hiding the hit.
  if (w < 10) {
    const k = w / 10, r = 12 + w * 2, g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(255,255,255,${1 - k})`); g.addColorStop(.35, `rgba(150,255,170,${.85 * (1 - k)})`); g.addColorStop(1, 'rgba(40,255,90,0)');
    ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  // Rays: twelve spokes flung outward, alternating long and short.
  if (w < 10) {
    const k = w / 10; ctx.strokeStyle = `rgba(200,255,210,${1 - k})`; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6 + .26, r0 = 6 + k * 26, r1 = r0 + (i & 1 ? 8 : 18) * (1 - k * .5);
      ctx.beginPath(); ctx.moveTo(Math.round(sx + Math.cos(a) * r0), Math.round(sy + Math.sin(a) * r0 * .7));
      ctx.lineTo(Math.round(sx + Math.cos(a) * r1), Math.round(sy + Math.sin(a) * r1 * .7)); ctx.stroke();
    }
  }
  for (const d of [0, 4]) {
    const q = (t - d) / 10; if (q < 0 || q > 1) continue;
    ctx.strokeStyle = `rgba(110,255,140,${(1 - q) * .95})`; ctx.lineWidth = d ? 1 : 2;
    ctx.beginPath(); ctx.ellipse(sx, sy, 8 + q * 64, 5 + q * 40, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}
