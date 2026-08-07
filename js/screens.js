// screens.js - title, stage intro, boss intro, stage clear, ending, game over
import { G, W, H } from './engine.js';
import { SPR, drawText, drawTextShadow, textWidth, getFrame, blit, frameW, frameH } from './sprites.js';
import { drawStage, STAGES } from './stages.js';
import { ASSETS } from './assets.js';
import { drawProp } from './props.js';

function center(str, scale) { return (W - textWidth(str, scale)) / 2; }

const STAGE_NAMES = STAGES.map((s) => s.name);
const STAGE_COUNT = STAGES.length;

function drawLogo(ctx, y0) {
  const t = G.rawTime;
  const bob = Math.round(Math.sin(t * 0.05) * 2);
  drawText(ctx, 'GIGACHAD', center('GIGACHAD', 4) + 2, y0 + bob + 2, '#100a0c', 4);
  drawText(ctx, 'GIGACHAD', center('GIGACHAD', 4), y0 + bob, '#ffd94a', 4);
  drawText(ctx, 'WORLD TOUR', center('WORLD TOUR', 2) + 2, y0 + 30 + bob + 2, '#100a0c', 2);
  drawText(ctx, 'WORLD TOUR', center('WORLD TOUR', 2), y0 + 30 + bob, '#d82838', 2);
  ctx.fillStyle = '#ffd94a';
  const lw = textWidth('WORLD TOUR', 2);
  ctx.fillRect(center('WORLD TOUR', 2) - 14, y0 + 34 + bob, 10, 1);
  ctx.fillRect(center('WORLD TOUR', 2) + lw + 4, y0 + 34 + bob, 10, 1);
}

function drawControls(ctx, y0) {
  const lines = [
    'ARROWS/WASD MOVE   DOUBLE TAP DASH, HOLD TO RUN',
    'Z PUNCH   X JUMP   HOLD C PARRY   SPACE METEOR LARIAT',
    'GREEN CUE: PARRY   RED CUE: EVADE   REFLECT PROJECTILES',
    'TAP Z OR X WHILE DOWN TO GET UP FAST   P PAUSE',
  ];
  for (let i = 0; i < lines.length; i++) {
    drawTextShadow(ctx, lines[i], center(lines[i], 1), y0 + i * 10, '#c8c0e0', 1);
  }
}

export function drawTitle(ctx) {
  const t = G.rawTime;
  if (ASSETS.title_art) {
    const pan = Math.round(Math.sin(t * 0.012) * 4);
    // authored 12 logical px wider than the screen so the idle pan never exposes an edge
    ctx.drawImage(ASSETS.title_art, -6 + pan, 0, W + 12, 186);
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    for (let y = 1; y < 186; y += 3) ctx.fillRect(0, y, W, 1);
    if (((t * 7) % 300) < 3) { ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(0, 0, W, 186); }
    const grad = ctx.createLinearGradient(0, 86, 0, H);
    grad.addColorStop(0, 'rgba(8,4,8,0)');
    grad.addColorStop(0.45, 'rgba(8,4,8,0.85)');
    grad.addColorStop(1, 'rgba(8,4,8,0.96)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 86, W, H - 86);
    // top scrim so the logo reads over the key art
    const top = ctx.createLinearGradient(0, 0, 0, 62);
    top.addColorStop(0, 'rgba(8,4,8,0.85)');
    top.addColorStop(1, 'rgba(8,4,8,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, 62);
    drawLogo(ctx, 14);
    ctx.fillStyle = 'rgba(8,4,8,0.55)';
    ctx.fillRect(center('PRESS Z', 2) - 8, 124, textWidth('PRESS Z', 2) + 16, 14);
    if ((t >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 2), 128, '#f8f0e0', 2);
    drawControls(ctx, 158);
  } else {
    drawStage(ctx, (t * 0.4) % 1400);
    ctx.fillStyle = 'rgba(10,6,10,0.55)';
    ctx.fillRect(0, 0, W, H);
    const hero = getFrame(SPR.player, 'victory', 0, 1);
    blit(ctx, hero, 330, 132);
    const grunt = getFrame(SPR.goonda, 'hurt', 0, -1);
    blit(ctx, grunt, 66, 142);
    drawLogo(ctx, 18);
    if ((t >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 2), 128, '#f8f0e0', 2);
    drawControls(ctx, 158);
  }
  // high score + tagline. Level select lives in the dojo now (js/hub.js).
  const hs = 'HI ' + String(G.hiscore).padStart(6, '0');
  drawTextShadow(ctx, 'ENTER THE LAIR', center('ENTER THE LAIR', 1), 214, '#f0b848', 1);
  drawTextShadow(ctx, hs, center(hs, 1), 226, '#ffd94a', 1);
  drawTextShadow(ctx, 'FOR THE LOVE OF THE GAME', center('FOR THE LOVE OF THE GAME', 1), 246, '#686098', 1);
}

export function drawIntro(ctx) {
  ctx.fillStyle = '#100a0c';
  ctx.fillRect(0, 0, W, H);
  const t = G.rawTime - G.stateT;
  const st = G.stage;
  // sliding banner bars
  const slide = Math.min(1, t / 18);
  const bx = Math.round((1 - slide) * -W);
  ctx.fillStyle = '#d82838';
  ctx.fillRect(bx, 96, W, 2);
  ctx.fillRect(-bx, 160, W, 2);
  const label = 'STAGE ' + st.num;
  drawTextShadow(ctx, label, center(label, 3) + bx, 106, '#f8f0e0', 3);
  if (t > 20) drawTextShadow(ctx, st.name, center(st.name, 2), 134, '#ffd94a', 2);
  if (t > 40) drawTextShadow(ctx, st.sub, center(st.sub, 1), 168, '#686098', 1);
}

export function drawBossIntro(ctx, camX) {
  drawStage(ctx, camX);
  const b = G.boss;
  if (!b) return;
  const t = G.rawTime - G.stateT;
  const bossFrame = (name, idx = 0, filter = '', worldX = b.x) => {
    const f = getFrame(b.set, name, idx, -1);
    ctx.save();
    if (filter) ctx.filter = filter;
    blit(ctx, f, Math.round(worldX - camX - frameW(f) / 2), Math.round(b.y - frameH(f) + 4));
    ctx.restore();
  };
  const pf = getFrame(SPR.player, 'idle', (G.rawTime >> 4) & 1, 1);
  blit(ctx, pf, Math.round(G.player.x - camX - frameW(pf) / 2), Math.round(G.player.y - frameH(pf) + 4));

  if (b.key === 'raja') {
    // Raja arrives as part of the road: brakes sideways, kills the meter,
    // and turns the vehicle itself into phase one's arena hazard.
    if (b.cart) drawProp(ctx, b.cart, camX);
    const skid = Math.max(0, 20 - Math.abs(t - 54)) / 20;
    bossFrame(t < 92 ? 'walk' : t < 132 ? 'taunt' : 'punch', t < 92 ? ((t >> 3) & 1) : 0);
    ctx.globalAlpha = skid * 0.45; ctx.fillStyle = '#e9d7b3';
    for (let i = 0; i < 7; i++) ctx.fillRect(Math.round(b.x - camX + 22 + i * 9), 224 - i % 3, 7, 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(20,8,2,0.86)'; ctx.fillRect(0, 202, W, 68);
    drawTextShadow(ctx, 'THE METER STOPS HERE', center('THE METER STOPS HERE', 1), 214, '#ffd66a', 1);
    drawTextShadow(ctx, 'RICKSHAW RAJA', center('RICKSHAW RAJA', 2), 232, '#48d278', 2);
  } else if (b.key === 'mirchi') {
    // The cart is his arena and his first mechanic: show it before the health bar.
    if (b.cart) drawProp(ctx, b.cart, camX);
    bossFrame(t < 72 ? 'idle' : t < 126 ? 'punch' : 'slam', t < 72 ? 0 : t < 126 ? 1 : 2);
    for (let i = 0; i < 4; i++) {
      const k = ((t + i * 17) % 55) / 55;
      ctx.globalAlpha = (1 - k) * 0.32;
      ctx.fillStyle = '#fff5df';
      ctx.beginPath(); ctx.ellipse(b.x - camX - 24 + i * 5, 173 - k * 32, 3 + k * 6, 2 + k * 4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(24,7,3,0.82)'; ctx.fillRect(0, 204, W, 66);
    drawTextShadow(ctx, 'THE KITCHEN CLOSES WHEN YOU DO', center('THE KITCHEN CLOSES WHEN YOU DO', 1), 214, '#ffd94a', 1);
    drawTextShadow(ctx, 'MIRCHI - THE CHAAT KING', center('MIRCHI - THE CHAAT KING', 2), 232, '#ff7044', 2);
  } else if (b.key === 'refund') {
    // Fluorescent office blackout, monitor wake-up, then the manager walks
    // out of the lift while every abandoned phone begins to ring.
    const on = t > 42;
    ctx.fillStyle = on ? 'rgba(25,220,255,0.10)' : 'rgba(0,0,0,0.76)'; ctx.fillRect(0, 0, W, H);
    if (on) bossFrame(t < 112 ? 'walk' : 'punch', t < 112 ? ((t >> 3) & 1) : 1);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = ((t / 8 + i) | 0) & 1 ? '#31dce8' : '#172c38';
      ctx.fillRect(42 + i * 92, 48 + (i & 1) * 12, 52, 23);
    }
    ctx.fillStyle = 'rgba(2,9,14,0.88)'; ctx.fillRect(0, 202, W, 68);
    drawTextShadow(ctx, 'YOUR ESCALATION HAS ARRIVED', center('YOUR ESCALATION HAS ARRIVED', 1), 214, '#79efff', 1);
    drawTextShadow(ctx, 'MR. REFUND', center('MR. REFUND', 2), 232, '#f5efb0', 2);
  } else if (b.key === 'yadav') {
    // Police lights belong to the station facade and rake across both fighters.
    const blue = ((t / 12) | 0) & 1;
    ctx.fillStyle = blue ? 'rgba(40,100,255,0.12)' : 'rgba(255,36,42,0.12)'; ctx.fillRect(0, 0, W, H);
    bossFrame(t < 105 ? 'walk' : 'punch', t < 105 ? ((t >> 3) & 1) : Math.min(2, ((t - 105) / 18) | 0));
    ctx.fillStyle = 'rgba(5,10,20,0.88)'; ctx.fillRect(0, 20, W, 54);
    drawTextShadow(ctx, 'THE STATION IS CLOSED', center('THE STATION IS CLOSED', 2), 28, '#f4f7ff', 2);
    drawTextShadow(ctx, 'INSPECTOR YADAV - NO WARRANT REQUIRED', center('INSPECTOR YADAV - NO WARRANT REQUIRED', 1), 58, blue ? '#70a8ff' : '#ff6068', 1);
  } else {
    // Rana is first read as a lightning silhouette, then answers with the chain slam.
    const reveal = Math.max(0, Math.min(1, (t - 48) / 70));
    ctx.fillStyle = `rgba(3,1,8,${0.72 * (1 - reveal * 0.65)})`; ctx.fillRect(0, 0, W, H);
    const flash = (t >= 50 && t < 58) || (t >= 130 && t < 138);
    // Hold him inside the composition even when the encounter camera begins far
    // from his spawn. The full-body reveal is the point of this intro.
    bossFrame(t < 124 ? 'idle' : 'slam', 0, t < 50 ? 'brightness(0)' : flash ? 'brightness(2.4)' : '', camX + 342);
    if (t > 92) {
      ctx.fillStyle = 'rgba(20,2,8,0.88)'; ctx.fillRect(0, 196, W, 74);
      drawTextShadow(ctx, 'EVERY ROAD LED TO THIS GATE', center('EVERY ROAD LED TO THIS GATE', 1), 207, '#d8b8b8', 1);
      drawTextShadow(ctx, 'COMMANDER RANA', center('COMMANDER RANA', 3), 224, '#ff4f4f', 3);
      drawTextShadow(ctx, 'THE IRON LION', center('THE IRON LION', 1), 254, '#ffd075', 1);
    }
  }

  const full = b.def.taunt;
  const scale = textWidth(full, 2) < W - 60 ? 2 : 1;
  const shown = full.slice(0, Math.min(full.length, Math.max(0, t / 3 | 0)));
  const portrait = ASSETS[b.def.portrait];
  if (portrait && t > 72 && b.key !== 'rana') ctx.drawImage(portrait, W - 56, 82, 48, 48);
  if (t > 72 && b.key !== 'rana') drawTextShadow(ctx, shown, center(full, scale), 108, '#f0d0b0', scale);
}

export function drawClear(ctx) {
  ctx.fillStyle = 'rgba(10,6,10,0.9)';
  ctx.fillRect(0, 0, W, H);
  const t = G.rawTime - G.stateT;
  drawTextShadow(ctx, 'STAGE CLEAR', center('STAGE CLEAR', 3), 32, '#ffd94a', 3);
  const cleared = G.stage ? G.stage.name : '';
  drawTextShadow(ctx, cleared, center(cleared, 1), 56, '#c8c0e0', 1);
  if (ASSETS.portrait_chad_48) blit(ctx, ASSETS.portrait_chad_48, 46, 112);
  const hero = getFrame(SPR.player, 'victory', 0, 1);
  blit(ctx, hero, 366, 118);
  const st = G.clearStats || { hits: 0, kos: 0, bonus: 0, combo: 0 };
  let y = 82;
  const lines = [
    ['HIT BONUS', st.hits * 10],
    ['KO BONUS', st.kos * 100],
    ['BEST COMBO', st.combo],
    ['LIFE BONUS', st.bonus],
    ['TOTAL', G.score],
  ];
  const shown = Math.min(lines.length, 1 + (t / 26 | 0));
  for (let i = 0; i < shown; i++) {
    const [label, val] = lines[i];
    drawTextShadow(ctx, label, 150, y, i === lines.length - 1 ? '#ffd94a' : '#c8c0e0', 1);
    drawTextShadow(ctx, String(val), 336 - textWidth(String(val), 1), y, '#f8f0e0', 1);
    y += 12;
  }
  const last = G.stageIndex >= STAGE_COUNT - 1;
  if (t > 120 && !last) {
    const next = 'NEXT - ' + STAGE_NAMES[G.stageIndex + 1];
    drawTextShadow(ctx, next, center(next, 1), 196, '#d85838', 1);
  }
  if (t > 150 && ((G.rawTime >> 4) & 1)) {
    const msg = last ? 'PRESS Z' : 'PRESS Z TO CONTINUE';
    drawTextShadow(ctx, msg, center(msg, 1), 220, '#ffd94a', 1);
  }
}

const CREDITS = [
  'GIGACHAD: WORLD TOUR',
  '',
  'CHAD',
  '',
  'FIVE ROADS THROUGH DELHI',
  '',
  'GOONDA  BATTA  MASALA  BANDAR  PEHLWAN',
  'RICKSHAW PUNK  CONSTABLE  OPERATOR  CHAIN SEPOY',
  '',
  'RICKSHAW RAJA - KING OF THE METER',
  'MIRCHI - THE CHAAT KING',
  'MR. REFUND - ESCALATION MANAGER',
  'INSPECTOR YADAV - CHANDNI CHOWK POLICE',
  'COMMANDER RANA - THE IRON LION',
  '',
  'HE DOES NOT DO IT FOR MONEY',
  'HE DOES NOT DO IT FOR GLORY',
  'HE DOES IT FOR THE LOVE OF THE GAME',
  '',
  'THE TOUR CONTINUES',
  '',
  'THANK YOU FOR PLAYING',
];

export function drawEnding(ctx) {
  const t = G.rawTime - G.stateT;
  ctx.fillStyle = '#0a0608';
  ctx.fillRect(0, 0, W, H);
  if (ASSETS.ending_art) {
    const zoom = 1 + Math.min(0.12, t * 0.00012);
    const w = Math.round(W * zoom), h = Math.round(186 * zoom);
    ctx.drawImage(ASSETS.ending_art, (W - w) / 2 | 0, 0, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (let y = 1; y < H; y += 3) ctx.fillRect(0, y, W, 1);
  } else {
    const hero = getFrame(SPR.player, 'victory', 0, 1);
    blit(ctx, hero, W / 2 - frameW(hero) / 2, 70);
  }
  const grad = ctx.createLinearGradient(0, 40, 0, H);
  grad.addColorStop(0, 'rgba(8,4,8,0)');
  grad.addColorStop(0.6, 'rgba(8,4,8,0.8)');
  grad.addColorStop(1, 'rgba(8,4,8,0.95)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 40, W, H - 40);

  // credits scroll
  const top = H - t * 0.35;
  for (let i = 0; i < CREDITS.length; i++) {
    const y = top + i * 13;
    if (y < 30 || y > H) continue;
    const line = CREDITS[i];
    const big = i === 0;
    drawTextShadow(ctx, line, center(line, big ? 2 : 1), y, big ? '#ffd94a' : '#f8f0e0', big ? 2 : 1);
  }
  const done = top + CREDITS.length * 13 < 60;
  if (done) {
    const score = 'FINAL SCORE ' + String(G.score).padStart(6, '0');
    drawTextShadow(ctx, score, center(score, 1), 182, '#ffd94a', 1);
    const rank = 'RANK ' + endRank();
    drawTextShadow(ctx, rank, center(rank, 2), 198, '#d85838', 2);
    if ((G.rawTime >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 1), 232, '#f8f0e0', 1);
  }
}

export function endRank() {
  const s = G.score;
  if (s > 150000) return 'GIGACHAD';
  if (s > 110000) return 'WORLD CLASS';
  if (s > 80000) return 'CONTENDER';
  if (s > 50000) return 'JOURNEYMAN';
  return 'TOURIST';
}

export function drawOver(ctx) {
  ctx.fillStyle = 'rgba(10,4,8,0.85)';
  ctx.fillRect(0, 0, W, H);
  drawTextShadow(ctx, 'GAME OVER', center('GAME OVER', 4), 88, '#d82838', 4);
  const n = Math.ceil(G.continueT / 60);
  drawTextShadow(ctx, 'CONTINUE? ' + n, center('CONTINUE? 9', 2), 144, '#f8f0e0', 2);
  if ((G.rawTime >> 4) & 1) drawTextShadow(ctx, 'PRESS Z', center('PRESS Z', 1), 178, '#ffd94a', 1);
}
