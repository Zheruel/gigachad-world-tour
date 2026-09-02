// hud.js - SNES-style HUD: portrait, health, lives, super meter, combo, boss bar
import { G, W, H, METER_MAX, RANKS } from './engine.js';
import { drawTextShadow, textWidth, blit, frameW, frameH } from './sprites.js';
import { ASSETS } from './assets.js';
import { fx } from './fx.js';

// Draw a generated bar housing at an arbitrary width by 9-slicing it: fixed end
// caps, stretched middle. Lets the art define the look while the code picks the size.
const CAP = 5;
function barHousing(ctx, img, x, y, w) {
  const iw = frameW(img), ih = frameH(img);
  const cap = Math.min(CAP, Math.floor(iw / 2) - 1);
  const s = img._as || 1;
  ctx.drawImage(img, 0, 0, cap * s, ih * s, x, y, cap, ih);
  ctx.drawImage(img, cap * s, 0, (iw - cap * 2) * s, ih * s, x + cap, y, w - cap * 2, ih);
  ctx.drawImage(img, (iw - cap) * s, 0, cap * s, ih * s, x + w - cap, y, cap, ih);
  return ih;
}

// Fill inside a housing, inset by its rim.
function barFill(ctx, x, y, w, h, frac, colour, hi) {
  const fw = Math.max(0, Math.round(w * frac));
  if (!fw) return;
  ctx.fillStyle = colour;
  ctx.fillRect(x, y, fw, h);
  if (hi) { ctx.fillStyle = hi; ctx.fillRect(x, y, fw, Math.max(1, (h / 3) | 0)); }
}

// The style gauge, top right under the score: the letter big, the word under it, and a
// bar draining with the chain's timer. The letter punches in oversized on a new rank and
// the top ranks shiver; the whole thing is the combo made into a grade, DMC-style.
function drawStyleRank(ctx) {
  const rk = G.rank >= 0 ? RANKS[G.rank] : null;
  if (!rk || G.comboT <= 0) return;
  const age = 90 - G.rankT;
  const sc = G.rankT > 0 && age < 3 ? 5 : G.rankT > 0 && age < 6 ? 4 : 3;
  const jit = G.rank >= 4 ? Math.round(Math.sin(G.rawTime * 1.7) * (G.rank - 3) * 0.5) : 0;
  const right = W - 8;
  const y0 = 44;
  const letterW = textWidth(rk.letter, sc);
  const col = G.rank === 6 && ((G.rawTime >> 2) & 1) ? '#ffffff' : rk.color;
  drawTextShadow(ctx, rk.letter, right - letterW + jit, y0 - (sc - 3) * 2, col, sc, '#2a0810');
  const wordW = textWidth(rk.word, 1);
  drawTextShadow(ctx, rk.word, right - wordW, y0 + 5 * sc + 3, rk.color, 1);
  // the gauge: the chain timer, in the rank's colour, with a dark trough behind it
  const gw = Math.max(wordW, 40), gh = 3;
  const gx = right - gw, gy = y0 + 5 * sc + 11;
  ctx.fillStyle = '#1a1018'; ctx.fillRect(gx - 1, gy - 1, gw + 2, gh + 2);
  ctx.fillStyle = rk.color; ctx.fillRect(gx, gy, Math.round(gw * G.comboT / 100), gh);
}

export function drawHUD(ctx) {
  const p = G.player;
  const scrim = ctx.createLinearGradient(0, 0, 0, 62);
  scrim.addColorStop(0, 'rgba(10,6,10,0.62)');
  scrim.addColorStop(1, 'rgba(10,6,10,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, 62);

  // ---- portrait in its generated bezel ----
  const frame = fx('hud_frame', 0);
  const FX0 = 5, FY0 = 3;
  if (frame) {
    // the bezel's window, measured from the art
    if (ASSETS.portrait_chad) ctx.drawImage(ASSETS.portrait_chad, FX0 + 7, FY0 + 11, 20, 19);
    blit(ctx, frame, FX0, FY0);
  } else if (ASSETS.portrait_chad) {
    ctx.drawImage(ASSETS.portrait_chad, FX0, FY0, 30, 30);
  }

  const barX = FX0 + 42;
  const bw = 168;
  drawTextShadow(ctx, 'CHAD', barX + 2, FY0 - 1, '#ffd94a', 1);

  const housing = fx('hud_bar', 0);
  const RIM = 2;

  // ---- health ----
  const hy = FY0 + 7;
  let hh = 10;
  if (housing) hh = barHousing(ctx, housing, barX, hy, bw);
  else { ctx.fillStyle = '#0c0810'; ctx.fillRect(barX, hy, bw, hh); }
  p.hpGhost = p.hpGhost === undefined ? p.hp : p.hpGhost;
  if (p.hpGhost > p.hp) p.hpGhost = Math.max(p.hp, p.hpGhost - 0.6);
  else p.hpGhost = p.hp;
  const ix = barX + RIM, iy = hy + RIM, iw = bw - RIM * 2, ih = hh - RIM * 2;
  barFill(ctx, ix, iy, iw, ih, p.hpGhost / p.maxhp, '#c86a2a');
  const low = p.hp <= 30, pulse = low && ((G.rawTime >> 3) & 1);
  barFill(ctx, ix, iy, iw, ih, Math.max(0, p.hp) / p.maxhp,
    pulse ? '#ff7a5a' : (low ? '#e03828' : '#e02838'), pulse ? '#ffd0c0' : '#ff9a8a');

  // ---- super meter ----
  const my = hy + hh + 1;
  let mh = 10;
  if (housing) mh = barHousing(ctx, housing, barX, my, bw);
  else { ctx.fillStyle = '#0c0810'; ctx.fillRect(barX, my, bw, mh); }
  const full = G.meter >= METER_MAX;
  const mx = barX + RIM, myy = my + RIM, mw = bw - RIM * 2, mhh = mh - RIM * 2;
  if (full) {
    const t = (G.rawTime >> 2) & 1;
    barFill(ctx, mx, myy, mw, mhh, 1, t ? '#ffd94a' : '#fff8d0', t ? '#fff8d0' : '#ffffff');
    drawTextShadow(ctx, 'SPACE: SUPER', barX + bw + 5, my + 1, t ? '#ffd94a' : '#f8f0e0', 1);
  } else {
    barFill(ctx, mx, myy, mw, mhh, G.meter / METER_MAX, '#3a8ad0', '#8ad4ff');
  }

  // ---- lives ----
  const livesY = my + mh + 2;
  const life = fx('hud_life', 0);
  const pipW = life ? frameW(life) + 2 : 15;
  const shown = Math.min(G.lives, 6);
  for (let i = 0; i < shown; i++) {
    if (life) blit(ctx, life, barX + i * pipW, livesY);
    else { ctx.fillStyle = '#ffd94a'; ctx.fillRect(barX + i * pipW, livesY, 10, 10); }
  }
  if (G.lives > 6) drawTextShadow(ctx, 'x' + G.lives, barX + shown * pipW + 2, livesY + 2, '#f8f0e0', 1);

  // score + stage name
  const s = String(G.score).padStart(6, '0');
  drawTextShadow(ctx, 'SCORE', W - 8 - textWidth('SCORE', 1), 6, '#f8f0e0', 1);
  drawTextShadow(ctx, s, W - 8 - textWidth(s, 1), 14, '#ffd94a', 1);
  if (G.stage) {
    const label = 'STAGE ' + G.stage.num;
    drawTextShadow(ctx, label, W - 8 - textWidth(label, 1), 24, '#c8c0e0', 1);
  }
  // combo counter
  if (G.combo >= 2) {
    const c = G.combo + ' HITS';
    const wob = Math.sin(G.rawTime * 0.4) * 1;
    const rk = G.rank >= 0 ? RANKS[G.rank] : null;
    drawTextShadow(ctx, c, W / 2 - textWidth(c, 2) / 2, 36 + wob, rk ? rk.color : '#ffd94a', 2);
  }
  drawStyleRank(ctx);

  // GO sign
  if (G.goTimer > 0 && ((G.rawTime >> 3) & 1)) {
    const go = ASSETS.go_sign;
    if (go) {
      blit(ctx, go, W - 12 - go.width / (go._as || 1), 104);
    } else {
      drawTextShadow(ctx, 'GO', W - 46, 110, '#ffd94a', 2);
      const ax = W - 24, ay = 110;
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.moveTo(ax, ay + 2); ctx.lineTo(ax + 12, ay + 7); ctx.lineTo(ax, ay + 12);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(ax - 8, ay + 4, 8, 6);
    }
  }

  // boss health bar
  if (G.boss && !G.boss.removeMe && (G.state === 'play' || G.state === 'bossintro')) {
    const b = G.boss;
    // mid-boss entrance banner
    const since = G.rawTime - b.spawnT;
    if (b.mini && since < 140) {
      const slide = Math.min(1, since / 12) * Math.min(1, (140 - since) / 12);
      const bh = Math.round(26 * slide);
      if (bh > 2) {
        ctx.fillStyle = '#100a0c';
        ctx.fillRect(0, 60, W, bh);
        ctx.fillStyle = '#d82838';
        ctx.fillRect(0, 60, W, 1); ctx.fillRect(0, 60 + bh - 1, W, 1);
        if (bh > 20) {
          drawTextShadow(ctx, b.label || b.def.name, (W - textWidth(b.label || b.def.name, 2)) / 2, 64, '#d85838', 2);
          drawTextShadow(ctx, b.def.title, (W - textWidth(b.def.title, 1)) / 2, 76, '#f8f0e0', 1);
        }
      }
    }
    const bw2 = b.mini ? 110 : 160, bx2 = Math.round((W - bw2) / 2), by2 = b.mini ? 242 : 252;
    const portrait = ASSETS[b.def.portrait];
    if (portrait) {
      ctx.fillStyle = '#100a0c';
      ctx.fillRect(bx2 - 19, by2 - 5, 16, 16);
      ctx.drawImage(portrait, bx2 - 18, by2 - 4, 14, 14);
      ctx.fillStyle = '#d85838';
      ctx.fillRect(bx2 - 19, by2 - 5, 16, 1); ctx.fillRect(bx2 - 19, by2 + 10, 16, 1);
      ctx.fillRect(bx2 - 19, by2 - 5, 1, 16); ctx.fillRect(bx2 - 4, by2 - 5, 1, 16);
    }
    ctx.fillStyle = 'rgba(12,8,12,0.7)';
    ctx.fillRect(bx2 - 2, by2 - 9, textWidth(b.label || b.def.name, 1) + 4, 8);
    drawTextShadow(ctx, b.label || b.def.name, bx2, by2 - 8, '#ff8a6a', 1);
    ctx.fillStyle = '#100a0c';
    ctx.fillRect(bx2 - 1, by2 - 1, bw2 + 2, 7);
    ctx.fillStyle = '#38141c';
    ctx.fillRect(bx2, by2, bw2, 5);
    // the bar fills on across the reveal, the arcade way, instead of arriving full
    const fill = G.state === 'bossintro' ? Math.min(1, Math.max(0, (G.rawTime - G.stateT - 40) / 70)) : 1;
    const w = Math.round(bw2 * fill * b.hp / b.maxhp);
    ctx.fillStyle = b.enraged ? '#ff5a3a' : '#b8202e';
    ctx.fillRect(bx2, by2, w, 5);
    ctx.fillStyle = '#ff9a8a';
    ctx.fillRect(bx2, by2, w, 1);
  }
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  drawTextShadow(ctx, 'PAUSE', W / 2 - textWidth('PAUSE', 2) / 2, 100, '#f8f0e0', 2);
  const lines = [
    'Z COMBO   X JUMP   HOLD C PARRY',
    'SPACE RAGNAROK (FULL METER)',
    'DOUBLE TAP TO DASH, HOLD TO RUN',
    'TAP Z AGAIN DURING EACH HIT TO CHAIN',
    'GREEN = PARRY   RED = DODGE',
    'TAP Z OR X WHILE DOWN TO GET UP FAST',
    'ESC RESUME   BACKSPACE QUIT TO TITLE',
  ];
  let y = 130;
  for (const l of lines) {
    drawTextShadow(ctx, l, W / 2 - textWidth(l, 1) / 2, y, '#c8c0e0', 1);
    y += 11;
  }
}
