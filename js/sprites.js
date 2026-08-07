// sprites.js - all art authored in code: palette, pixel painter, bitmap font,
// parametric muscle-fighter renderer. Everything pre-rendered to offscreen canvases.
// Character looks follow assets/ai/ref_* references (never loaded at runtime).
import { getAIFrame } from './aiframes.js';
import { G } from './engine.js';

export const PAL = {
  outline: '#241016',
  white: '#f8f0e0',
  black: '#100a0c',
  // warm skin
  skinD: '#7a3b20', skin: '#c97e4e', skinL: '#eaa96e', skinH: '#ffd0a0',
  // darker skin (heavy)
  skin2D: '#4e2a16', skin2: '#96633a', skin2L: '#c08a52', skin2H: '#e0b078',
  hairD: '#8a6a20', hair: '#d8a838', hairL: '#ffe08a',
  jeansD: '#1c2f66', jeans: '#2e5db8', jeansL: '#5d8ee0',     // Billy blue jeans
  camoD: '#2a4a1e', camo: '#4a7a34', camoL: '#6ba04a', camoT: '#a89858',
  purpD: '#2c144e', purp: '#6a3ab8', purpL: '#9a6ae8',
  brownD: '#3a2415', brown: '#6b4526', brownL: '#a06b3c',     // heavy pants
  leatherD: '#100c0c', leather: '#28201e', leatherL: '#4a3c36', leatherH: '#6e5a4e',
  gloveD: '#6e1420', glove: '#b8202e', gloveL: '#ff5a4e',     // red gloves/boots
  bandD: '#6e1020', band: '#d82838', bandL: '#ff7a6a',
  metalD: '#3a3f4a', metal: '#7a8292', metalL: '#c0c8d8',
  eye: '#201018',
  mouth: '#7a2830',
  beard: '#4a2e18',
  sparkY: '#ffd94a', sparkW: '#fff8d0',
  dustD: '#6e5a48', dust: '#a89078', dustL: '#d0bc9e',
};

export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function flipH(src) {
  const c = mkCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(src.width, 0); x.scale(-1, 1);
  x.drawImage(src, 0, 0);
  return c;
}

export function rot(src, deg) {
  const c = mkCanvas(src.width, src.height);
  const x = c.getContext('2d');
  x.translate(src.width / 2, src.height / 2);
  x.rotate(deg * Math.PI / 180);
  x.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}

// ---- pixel painter ----
export class Pix {
  constructor(w, h) { this.c = mkCanvas(w, h); this.x = this.c.getContext('2d'); this.w = w; this.h = h; }
  px(x, y, col) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.x.fillStyle = col; this.x.fillRect(x, y, 1, 1);
  }
  rect(x, y, w, h, col) { this.x.fillStyle = col; this.x.fillRect(x | 0, y | 0, Math.ceil(w), Math.ceil(h)); }
  hline(x0, x1, y, col) { if (x0 > x1) { const t = x0; x0 = x1; x1 = t; } this.rect(x0, y, x1 - x0 + 1, 1, col); }
  vline(x, y0, y1, col) { if (y0 > y1) { const t = y0; y0 = y1; y1 = t; } this.rect(x, y0, 1, y1 - y0 + 1, col); }
  disc(cx, cy, r, col) {
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++)
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++)
        if (dx * dx + dy * dy <= r * r) this.px(cx + dx, cy + dy, col);
  }
  // thick segment built from discs
  seg(x0, y0, x1, y1, r, col) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d * 2));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, col);
    }
  }
  art(rows, map, ox, oy) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (ch !== '.' && map[ch]) this.px(ox + i, oy + j, map[ch]);
      }
    }
  }
}

// ---- 3x5 bitmap font ----
const FONT = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '#.#', '#.#', '#.#'], N: ['#.#', '###', '###', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '#.#', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'], '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['###', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'], '9': ['###', '#.#', '###', '..#', '###'],
  ' ': ['...', '...', '...', '...', '...'], '-': ['...', '...', '###', '...', '...'],
  '.': ['...', '...', '...', '...', '.#.'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  ':': ['...', '.#.', '...', '.#.', '...'], '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'], "'": ['.#.', '.#.', '...', '...', '...'],
  '/': ['..#', '..#', '.#.', '#..', '#..'], '+': ['...', '.#.', '###', '.#.', '...'],
  '?': ['##.', '..#', '.#.', '...', '.#.'], ',': ['...', '...', '...', '.#.', '#..'],
  '*': ['#.#', '.#.', '###', '.#.', '#.#'],
  // the mars symbol needs 5 columns: circle bottom-left, arrow head top-right
  '♂': ['...##', '...##', '###..', '#.#..', '###..'],
};

const charW = (ch) => (ch === '♂' ? 6 : 4);

export function textWidth(str, scale) {
  scale = scale || 1;
  let w = 0;
  for (const ch of String(str).toUpperCase()) w += charW(ch) * scale;
  return w - scale;
}

export function drawText(ctx, str, x, y, color, scale) {
  scale = scale || 1;
  ctx.fillStyle = color;
  let cx = Math.round(x);
  y = Math.round(y);
  for (const ch of String(str).toUpperCase()) {
    const g = FONT[ch];
    if (g) {
      for (let j = 0; j < 5; j++)
        for (let i = 0; i < g[j].length; i++)
          if (g[j][i] === '#') ctx.fillRect(cx + i * scale, y + j * scale, scale, scale);
    }
    cx += charW(ch) * scale;
  }
}

export function drawTextShadow(ctx, str, x, y, color, scale, shadow) {
  drawText(ctx, str, x + (scale || 1), y + (scale || 1), shadow || PAL.black, scale);
  drawText(ctx, str, x, y, color, scale);
}

// ---- heads (string art, 14x12) ----
// o=outline s=skin S=skinL n=skinD e=eye b=brow m=mouth w/teeth=white
// h=hair H=hairL k/K=mohawk r/R=bandana d=beard l/L=leather c=chain g=shades
const HEAD_HERO = [
  '...oo.oo.oo...',
  '..oHHHHHHHHo..',
  '..oHHhhhhhhHo..',
  '..ohssssssho..',
  '..ohssssssho..',
  '..osbbssbbso..',
  '..ossessseso..',
  '...osssnso....',
  '....ossso.....',
  '....osmso.....',
  '....ossso.....',
  '.....ss.......',
];

function headMap(pal) {
  return {
    o: PAL.outline, s: pal.skin, S: pal.skinL, e: PAL.eye, n: pal.skinD,
    m: PAL.mouth, w: '#f0f0e8', h: pal.hair, H: pal.hairL, b: pal.brow,
    k: '#1e7a2e', K: '#4fae5e', r: PAL.band, R: PAL.bandL, d: PAL.beard,
    l: pal.helmetD || PAL.leather, L: pal.helmetL || PAL.leatherL, c: PAL.metalL, g: '#101018',
  };
}

// ---- parametric muscle fighter renderer ----
// M: measurements. pose: limb keypoints (absolute canvas coords, facing right).
function drawFighter(M, pal, pose) {
  const P = new Pix(M.w, M.h);
  const cx = M.cx + (pose.lean || 0);
  const cy = pose.crouch || 0;
  const neckY = M.neck + cy;
  const hipY = M.hipY + cy;
  const shoB = [cx - M.sho + 3, neckY + 3];
  const shoF = [cx + M.sho - 3, neckY + 3];
  const hipB = [cx - 3, hipY];
  const hipF = [cx + 3, hipY];
  const skinBase = pal.skin, skinD = pal.skinD, skinL = pal.skinL, skinH = pal.skinH;
  const clothBase = pal.pants, clothD = pal.pantsD, clothL = pal.pantsL;
  let seed = M.seed || 13;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function drawArm(sho, arm, back) {
    const [ex, ey, fx, fy] = arm;
    const base = back ? skinD : skinBase;
    const hi = back ? skinBase : skinL;
    const r = M.armW;
    P.seg(sho[0], sho[1], ex, ey, r + 1, PAL.outline);
    P.seg(ex, ey, fx, fy, r + 0.5, PAL.outline);
    P.seg(sho[0], sho[1], ex, ey, r, base);
    // bicep bulge + highlight + vein
    const mx = (sho[0] + ex) / 2, my = (sho[1] + ey) / 2;
    P.disc(mx, my, r + 0.7, base);
    P.disc(mx - 1, my - 1, r - 0.6, hi);
    if (!back) P.px(mx - 1, my + 1, skinH);
    P.seg(ex, ey, fx, fy, r - 0.5, back ? base : skinL);
    // forearm shading line
    P.seg(ex + 0.5, ey + 0.5, fx - 1, fy, r - 1.4, base);
    // wristband (spiked) or glove cuff
    if (M.wristband) {
      const wx = ex + (fx - ex) * 0.72, wy = ey + (fy - ey) * 0.72;
      P.disc(wx, wy, r + 0.6, PAL.outline);
      P.disc(wx, wy, r, PAL.metalD);
      P.disc(wx - 0.5, wy - 0.5, r - 0.8, PAL.metal);
      // spikes
      P.px(wx - r - 1, wy, PAL.metalL); P.px(wx + r, wy - 1, PAL.metalL);
      P.px(wx, wy - r - 1, PAL.metalL);
    }
    // fist / glove
    if (pal.gloveStyle === 'bare') {
      P.disc(fx, fy, 3, PAL.outline);
      P.disc(fx, fy, 2.3, back ? skinD : skinBase);
      P.px(fx - 1, fy - 1, skinL);
      P.px(fx + 1, fy - 2, skinD); // knuckle line
    } else {
      P.disc(fx, fy, 3, PAL.outline);
      P.disc(fx, fy, 2.3, pal.glove);
      P.px(fx - 1, fy - 1, pal.gloveL);
      if (pal.gloveStyle === 'fingerless') {
        P.px(fx + 2, fy - 1, skinBase); P.px(fx + 2, fy, skinBase);
        P.px(fx + 1, fy + 2, skinD);
      }
    }
  }

  function drawBoot(fx, fy, back) {
    const st = pal.bootStyle || 'black';
    if (st === 'hero') {
      // tall red ring boots with white laces + white sole
      P.rect(fx - 4, fy - 10, 8, 10, PAL.outline);
      P.rect(fx - 3, fy - 9, 6, 8, PAL.glove);
      P.hline(fx - 3, fx + 2, fy - 9, PAL.gloveL);
      // lace crosses
      for (let i = 0; i < 3; i++) {
        P.px(fx - 1, fy - 8 + i * 2, PAL.white); P.px(fx + 1, fy - 8 + i * 2, PAL.white);
        P.px(fx, fy - 7 + i * 2, PAL.white);
      }
      P.hline(fx - 3, fx + 2, fy - 3, PAL.gloveD);
      P.rect(fx - 4, fy - 2, 9, 2, PAL.outline);
      P.hline(fx - 3, fx + 4, fy - 2, PAL.white); // sole
      P.rect(fx + 2, fy - 4, 2, 2, PAL.glove); // toe
      P.px(fx + 3, fy - 4, PAL.gloveL);
    } else if (st === 'white') {
      // sneakers
      P.rect(fx - 4, fy - 5, 9, 5, PAL.outline);
      P.rect(fx - 3, fy - 4, 7, 3, '#e8e8e0');
      P.hline(fx - 3, fx + 2, fy - 4, PAL.white);
      P.px(fx - 1, fy - 3, PAL.metalD); P.px(fx + 1, fy - 3, PAL.metalD); // laces
      P.hline(fx - 3, fx + 4, fy - 1, PAL.metalD); // sole
      P.rect(fx + 2, fy - 3, 2, 1, '#e8e8e0');
    } else if (st === 'bare') {
      // bare foot / sandal
      P.rect(fx - 3, fy - 4, 7, 4, PAL.outline);
      P.rect(fx - 2, fy - 3, 6, 3, back ? skinD : skinBase);
      P.px(fx - 2, fy - 3, skinL);
      P.hline(fx - 3, fx + 3, fy - 1, skinD);
    } else if (st === 'leather') {
      P.rect(fx - 4, fy - 8, 8, 8, PAL.outline);
      P.rect(fx - 3, fy - 7, 6, 6, '#181214');
      P.seg(fx - 2, fy - 6, fx + 1, fy - 2, 0.8, PAL.leatherH); // gloss
      P.rect(fx - 4, fy - 2, 9, 2, PAL.outline);
      P.hline(fx - 3, fx + 4, fy - 1, '#28201e');
      P.rect(fx + 2, fy - 3, 2, 1, '#181214');
    } else {
      // black lace-up boots
      P.rect(fx - 4, fy - 7, 8, 7, PAL.outline);
      P.rect(fx - 3, fy - 6, 6, 5, '#1a1512');
      P.px(fx - 1, fy - 5, PAL.metalD); P.px(fx + 1, fy - 4, PAL.metalD); // laces
      P.hline(fx - 3, fx + 2, fy - 6, PAL.leatherL);
      P.rect(fx - 4, fy - 2, 9, 2, PAL.outline);
      P.hline(fx - 3, fx + 4, fy - 1, '#0a0806');
      P.rect(fx + 2, fy - 3, 2, 1, '#1a1512');
    }
  }

  function drawLeg(hip, leg, back) {
    const [kx, ky, fx, fy] = leg;
    const base = back ? clothD : clothBase;
    const r = M.legW;
    const bootTop = pal.bootStyle === 'hero' ? 9 : (pal.bootStyle === 'leather' ? 7 : 5);
    P.seg(hip[0], hip[1], kx, ky, r + 1, PAL.outline);
    P.seg(kx, ky, fx, fy - bootTop + 2, r, PAL.outline);
    P.seg(hip[0], hip[1], kx, ky, r, base);
    P.disc((hip[0] + kx) / 2 - 1, (hip[1] + ky) / 2, r - 0.8, back ? base : clothL);
    P.seg(kx, ky, fx, fy - bootTop + 2, r - 0.8, base);
    // camo blotches
    if (pal.camo && !back) {
      for (let j = 0; j < 8; j++) {
        const t = rnd();
        const seg2 = j % 2 === 0;
        const bx = seg2 ? hip[0] + (kx - hip[0]) * t : kx + (fx - kx) * t;
        const by = seg2 ? hip[1] + (ky - hip[1]) * t : ky + (fy - bootTop - ky) * t;
        const off = (rnd() - 0.5) * r * 1.4;
        const col = j % 3 === 0 ? pal.camoT : (j % 3 === 1 ? clothD : clothL);
        P.disc(bx + off, by, 1.1, col);
      }
    }
    // side stripe (runner)
    if (pal.stripe && !back) {
      P.seg(hip[0] + r * 0.5, hip[1] + 1, fx + r * 0.4, fy - bootTop + 1, 0.8, PAL.white);
    }
    drawBoot(fx, fy, back);
  }

  // back limbs behind torso
  drawLeg(hipB, pose.legB, true);
  drawArm(shoB, pose.armB, true);

  // torso: wide lats tapering to waist (or bulging belly for heavy)
  const th = hipY + 2 - neckY;
  const hwAt = (t) => Math.round(M.sho + (M.waist - M.sho) * t +
    (M.belly ? M.belly * Math.sin(Math.min(1, t * 1.2) * Math.PI) : 0));
  for (let i = 0; i <= th; i++) {
    const t = i / th;
    const hw = hwAt(t);
    P.hline(cx - hw - 1, cx + hw + 1, neckY + i, PAL.outline);
    P.hline(cx - hw, cx + hw, neckY + i, skinBase);
  }
  // pecs
  const pecY = neckY + 4 + Math.round(M.sho * 0.1);
  P.disc(cx - Math.round(M.sho * 0.45), pecY, 3, skinL);
  P.disc(cx + Math.round(M.sho * 0.45), pecY, 3, skinL);
  P.hline(cx - M.sho + 2, cx - 1, pecY + 3, skinD);
  P.hline(cx + 1, cx + M.sho - 2, pecY + 3, skinD);
  P.px(cx - Math.round(M.sho * 0.45) - 1, pecY - 1, skinH);
  if (M.belly) {
    // big belly: sheen + navel, no abs
    const by = neckY + Math.round(th * 0.68);
    P.disc(cx - 2, by, 3.2, skinL);
    P.disc(cx - 3, by - 1, 1.4, skinH);
    P.px(cx, by + 4, skinD);
    P.hline(cx - hwAt(0.9) + 1, cx + hwAt(0.9) - 1, hipY + 1, skinD); // overhang shadow
  } else {
    // abs
    P.vline(cx, pecY + 4, hipY - 1, skinD);
    P.hline(cx - 3, cx + 3, pecY + 6, skinD);
    P.hline(cx - 3, cx + 3, pecY + 9, skinD);
    P.px(cx - 2, pecY + 5, skinL); P.px(cx + 2, pecY + 5, skinL);
    P.px(cx - 2, pecY + 8, skinL); P.px(cx + 2, pecY + 8, skinL);
    P.px(cx, hipY - 1, skinD); // navel
  }
  // side shade (light from upper-left, rim only on upper torso)
  for (let i = 0; i <= th; i++) {
    const t = i / th;
    const hw = hwAt(t);
    P.px(cx + hw, neckY + i, skinD);
    if (t < 0.55) P.px(cx - hw, neckY + i, skinH);
  }

  // belt
  if (M.belt === 'hero') {
    P.hline(cx - M.waist - 1, cx + M.waist + 1, hipY + 1, '#4a2e18');
    P.hline(cx - M.waist - 1, cx + M.waist + 1, hipY + 2, '#6b4526');
    P.rect(cx, hipY, 3, 3, PAL.metalL); P.px(cx + 1, hipY + 1, PAL.metalD);
  } else if (M.belt === 'buckle') {
    P.hline(cx - M.waist - 1, cx + M.waist + 1, hipY + 1, PAL.black);
    P.rect(cx, hipY, 3, 3, PAL.metalL); P.px(cx + 1, hipY + 1, PAL.metalD);
  } else if (M.belt === 'studded') {
    P.hline(cx - M.waist - 1, cx + M.waist + 1, hipY + 1, PAL.leatherD);
    P.hline(cx - M.waist - 1, cx + M.waist + 1, hipY + 2, PAL.leather);
    for (let bx = cx - M.waist; bx <= cx + M.waist; bx += 3) P.px(bx, hipY + 1, PAL.metalL);
    P.rect(cx, hipY, 3, 3, PAL.metalL); P.px(cx + 1, hipY + 1, PAL.metalD);
  }

  if (M.harness) { // boss leather X-harness with studs + center ring
    const s1 = [cx - M.sho + 1, neckY + 1], e1 = [cx + M.waist, hipY];
    const s2 = [cx + M.sho - 1, neckY + 1], e2 = [cx - M.waist, hipY];
    P.seg(s1[0], s1[1], e1[0], e1[1], 1.8, PAL.outline);
    P.seg(s2[0], s2[1], e2[0], e2[1], 1.8, PAL.outline);
    P.seg(s1[0], s1[1], e1[0], e1[1], 1.1, PAL.leather);
    P.seg(s2[0], s2[1], e2[0], e2[1], 1.1, PAL.leather);
    P.seg(s1[0], s1[1], e1[0], e1[1], 0.5, PAL.leatherL);
    P.seg(s2[0], s2[1], e2[0], e2[1], 0.5, PAL.leatherL);
    // studs
    for (const t of [0.25, 0.75]) {
      P.px(s1[0] + (e1[0] - s1[0]) * t, s1[1] + (e1[1] - s1[1]) * t, PAL.metalL);
      P.px(s2[0] + (e2[0] - s2[0]) * t, s2[1] + (e2[1] - s2[1]) * t, PAL.metalL);
    }
    // center ring
    P.disc(cx, neckY + 6, 2.2, PAL.metalL);
    P.disc(cx, neckY + 6, 1.1, PAL.black);
  }
  // head
  const hx = cx + (pose.headDx || 0), hy = M.hy + cy + (pose.headDy || 0);
  P.rect(hx - 2, neckY - 4, 4, 4, skinD); // neck
  P.art(M.head, headMap(pal), hx - 7, hy - 6);

  // front limbs
  drawLeg(hipF, pose.legF, false);
  drawArm(shoF, pose.armF, false);

  if (M.shoulderPad) { // heavy metal pauldrons with rivets (on top of arms)
    for (const s of [shoB, shoF]) {
      P.disc(s[0], s[1], 5.2, PAL.outline);
      P.disc(s[0], s[1], 4.2, PAL.metal);
      P.disc(s[0] - 1.5, s[1] - 1.5, 2, PAL.metalL);
      P.px(s[0] + 2, s[1] + 3, PAL.metalD);
      // rivets
      P.px(s[0] - 3, s[1] + 2, PAL.metalL); P.px(s[0] + 3, s[1] - 2, PAL.metalL);
      P.px(s[0], s[1] - 4, PAL.metalL);
    }
  }

  return P.c;
}

// ---- measurements per character class ----
const M_PLAYER = { w: 32, h: 48, cx: 16, hy: 8, neck: 12, sho: 9, waist: 5, hipY: 28, armW: 3, legW: 3, head: HEAD_HERO, belt: 'hero', seed: 13 };

// ---- palettes per character ----
const PAL_BILLY = {
  skin: PAL.skin, skinD: PAL.skinD, skinL: PAL.skinL, skinH: PAL.skinH,
  pants: PAL.jeans, pantsD: PAL.jeansD, pantsL: PAL.jeansL,
  glove: PAL.glove, gloveL: PAL.gloveL, gloveStyle: 'fingerless', bootStyle: 'hero',
  hair: PAL.hair, hairL: PAL.hairL, brow: '#5a3a12',
};

// ---- poses ----
// limb arrays: [elbowX,elbowY, fistX,fistY] for arms, [kneeX,kneeY, footX,footY] for legs
function basePoses(cx, neck, hipY, footY) {
  const b = {
    lean: 0, crouch: 0, headDx: 0, headDy: 0,
    armB: [cx - 8, neck + 10, cx - 6, neck + 14],
    armF: [cx + 9, neck + 10, cx + 7, neck + 14],
    legB: [cx - 4, hipY + 8, cx - 5, footY],
    legF: [cx + 5, hipY + 8, cx + 6, footY],
  };
  return b;
}
function ps(base, o) { return Object.assign({}, base, o); }

function buildPlayer() {
  const b = basePoses(16, 12, 28, 45);
  const F = {};
  F.idle = [drawFighter(M_PLAYER, PAL_BILLY, b),
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, { crouch: 1, headDy: 0 }))];
  F.walk = [
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      armB: [9, 22, 13, 26], armF: [24, 22, 20, 27],
      legB: [10, 36, 6, 43], legF: [21, 36, 26, 44],
    })),
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      crouch: -1, armB: [10, 21, 11, 25], armF: [23, 21, 22, 25],
      legB: [12, 36, 11, 44], legF: [20, 36, 19, 44],
    })),
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      armB: [8, 22, 6, 26], armF: [24, 22, 26, 27],
      legB: [11, 36, 8, 44], legF: [21, 36, 24, 43],
    })),
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      crouch: -1, armB: [10, 21, 12, 25], armF: [22, 21, 21, 25],
      legB: [13, 36, 14, 44], legF: [19, 36, 17, 44],
    })),
  ];
  F.dash = [
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      lean: 3, armB: [8, 20, 5, 16], armF: [25, 22, 28, 26],
      legB: [11, 36, 4, 42], legF: [23, 36, 28, 44],
    })),
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      lean: 3, crouch: 1, armB: [9, 22, 7, 26], armF: [24, 20, 26, 16],
      legB: [12, 37, 10, 44], legF: [22, 37, 20, 44],
    })),
  ];
  F.jump = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    armB: [8, 18, 5, 14], armF: [25, 18, 28, 14],
    legB: [10, 33, 8, 38], legF: [22, 33, 24, 38],
  }))];
  F.jumpkick = F.jump; // visual fallback when no AI frame; AI manifest may override
  F.jab = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: 2, armB: [10, 18, 14, 14], armF: [26, 15, 31, 15],
    legB: [11, 36, 9, 45], legF: [22, 36, 24, 45],
  }))];
  F.hook = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: 3, crouch: 1, armB: [8, 20, 6, 25], armF: [21, 21, 29, 19],
    legB: [11, 37, 8, 45], legF: [23, 37, 26, 45],
  }))];
  F.upper = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: 1, crouch: 2, armB: [9, 22, 7, 27], armF: [24, 18, 27, 7], headDx: 1,
    legB: [11, 38, 9, 45], legF: [22, 38, 25, 45],
  }))];
  F.knee = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: 2, armB: [12, 20, 20, 21], armF: [24, 21, 26, 22],
    legB: [12, 36, 10, 45], legF: [24, 27, 21, 38],
  }))];
  F.grab = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: 2, armB: [12, 19, 22, 18], armF: [25, 20, 28, 19],
  }))];
  F.throw = [
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      crouch: 2, armB: [11, 14, 15, 6], armF: [22, 14, 26, 6], headDy: 1,
    })),
    drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
      lean: 4, armB: [10, 20, 8, 26], armF: [27, 22, 30, 24],
      legB: [11, 36, 7, 45], legF: [24, 36, 28, 45],
    })),
  ];
  F.hurt = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: -3, headDx: -2, armB: [6, 18, 3, 13], armF: [18, 14, 14, 10],
  }))];
  F.down = [rot(F.hurt[0], -80)];
  F.getup = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    crouch: 5, headDy: 1, armB: [9, 24, 7, 30], armF: [23, 24, 25, 30],
    legB: [11, 38, 9, 45], legF: [22, 38, 25, 45],
  }))];
  F.victory = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    lean: 0, armB: [7, 12, 5, 4], armF: [25, 12, 27, 4], headDy: -1,
  }))];
  F.special = [drawFighter(M_PLAYER, PAL_BILLY, ps(b, {
    armB: [4, 16, -1, 14], armF: [28, 16, 33, 14], crouch: -1,
    legB: [10, 36, 5, 45], legF: [23, 36, 28, 45],
  })), F.victory[0]];
  return F;
}


// ---- small sprite art ----
// ---- 32-bit effect art (authored at RS device pixels per logical pixel) ----
function hiCanvas(w, h) {
  const c = mkCanvas(w * 2, h * 2);
  c._as = 2;
  return c;
}

function buildSparkHi() {
  // two-frame impact burst: hot core, spikes, then a ragged ring
  const out = [];
  for (let f = 0; f < 2; f++) {
    const c = hiCanvas(22, 22);
    const x = c.getContext('2d');
    const cx = 22, cy = 22;
    const spikes = f === 0 ? 6 : 10;
    const inner = f === 0 ? 5 : 9, outer = f === 0 ? 20 : 26;
    x.translate(cx, cy);
    x.fillStyle = '#fff8d0';
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2 + f * 0.3;
      const w = f === 0 ? 3.2 : 2.0;
      x.save(); x.rotate(a);
      x.beginPath();
      x.moveTo(0, -w); x.lineTo(outer, 0); x.lineTo(0, w); x.closePath();
      x.fillStyle = i % 2 ? '#ffd94a' : '#fff8d0';
      x.fill();
      x.restore();
    }
    const g = x.createRadialGradient(0, 0, 0, 0, 0, inner + 4);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.45, 'rgba(255,217,74,0.9)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, inner + 4, 0, Math.PI * 2); x.fill();
    out.push(c);
  }
  return out;
}

function buildDustHi() {
  const out = [];
  for (let f = 0; f < 2; f++) {
    const c = hiCanvas(14, 10);
    const x = c.getContext('2d');
    const puffs = f === 0
      ? [[8, 14, 6], [20, 12, 5], [14, 16, 4]]
      : [[6, 10, 7], [22, 9, 6], [14, 14, 5]];
    for (const [px, py, r] of puffs) {
      const g = x.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, 'rgba(208,188,158,0.9)');
      g.addColorStop(0.6, 'rgba(168,144,120,0.55)');
      g.addColorStop(1, 'rgba(110,90,72,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
    }
    out.push(c);
  }
  return out;
}

function buildShockHi() {
  const c = hiCanvas(48, 12);
  const x = c.getContext('2d');
  x.strokeStyle = 'rgba(232,220,190,0.95)';
  x.lineWidth = 3;
  x.beginPath(); x.ellipse(48, 16, 44, 8, 0, 0, Math.PI * 2); x.stroke();
  x.strokeStyle = 'rgba(160,138,110,0.7)';
  x.lineWidth = 2;
  x.beginPath(); x.ellipse(48, 16, 34, 6, 0, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    x.fillStyle = 'rgba(210,190,160,0.8)';
    x.fillRect(48 + Math.cos(a) * 44 - 2, 16 + Math.sin(a) * 8 - 2, 4, 4);
  }
  return c;
}

function buildSpark() {
  const map = { o: PAL.outline, Y: PAL.sparkY, W: PAL.sparkW };
  const s0 = new Pix(11, 11);
  s0.art([
    '.....W.....',
    '....WYW....',
    '....WYW....',
    '.W..WYW..W.',
    'WYWWWWWWWY.',
    'WYWWWWWWWY.',
    '.W..WYW..W.',
    '....WYW....',
    '....WYW....',
    '.....W.....',
    '...........',
  ], map, 0, 0);
  const s1 = new Pix(11, 11);
  s1.art([
    '...........',
    '.W.......W.',
    '..W..W..W..',
    '...WWWWW...',
    '....WWWW.W.',
    '..WWWWWW...',
    '...WWWWW...',
    '..W..W..W..',
    '.W.......W.',
    '...........',
    '...........',
  ], map, 0, 0);
  return [s0.c, s1.c];
}

function buildDust() {
  const map = { d: PAL.dust, D: PAL.dustD, L: PAL.dustL };
  const d0 = new Pix(9, 6);
  d0.art([
    '.........',
    '..d...d..',
    '.dLd.dLd.',
    '.ddd.ddd.',
    '..dDddd...',
    '...DDd...',
  ], map, 0, 0);
  const d1 = new Pix(9, 6);
  d1.art([
    '..d...d..',
    '.dLd.dLd.',
    'd.ddddd.d',
    '.ddD.Ddd.',
    '..d...d..',
    '.........',
  ], map, 0, 0);
  return [d0.c, d1.c];
}

function buildShock() {
  const P = new Pix(24, 8);
  const map = { L: PAL.dustL, d: PAL.dust };
  P.art([
    '........................',
    '........................',
    '..LL................LL..',
    '.LddL..............LddL.',
    'LddddLL..........LLddddL',
    'ddddddddd......ddddddddd',
    '.dddddddddddddddddddddd.',
    '..ddddddddddddddddddd...',
  ], map, 0, 0);
  return P.c;
}

function buildPickupShake() {
  const P = new Pix(10, 12);
  const map = { o: PAL.outline, W: '#f0e8d8', w: '#d0c0a8', r: PAL.glove, R: PAL.gloveL, s: PAL.metalL };
  P.art([
    '..oooooo..',
    '.oWWWWWWo.',
    '.oWwwwwWo.',
    '.orrrrrro.',
    '.oRRRRRRo.',
    '.orrrrrro.',
    '.oWssssWo.',
    '.oWssssWo.',
    '.oWWWWWWo.',
    '..oooooo..',
    '....ss....',
    '....ss....',
  ], map, 0, 0);
  return P.c;
}

function buildPickupPlate() {
  const P = new Pix(12, 12);
  const map = { o: PAL.outline, m: PAL.metal, M: PAL.metalD, L: PAL.metalL };
  P.art([
    '....oooo....',
    '..oommmmo...',
    '.omLLmmMmo..',
    '.mLmooomMm..',
    'omLmo.ooMmmo',
    'ommmo..mmmmo',
    'ommmo..mmmmo',
    'omMmo.oomMmo',
    '.mMmooomMmo.',
    '.omMmmmMmo..',
    '..oommmmo...',
    '....oooo....',
  ], map, 0, 0);
  return P.c;
}

// ---- assemble everything ----
function addFlips(F) {
  for (const k of Object.keys(F)) F[k + '_f'] = F[k].map(flipH);
  return F;
}

// Art scale: AI art is authored at RS:1 (2 device pixels per logical pixel),
// code-drawn art at 1:1. blit() draws either at the right logical size, so
// callers keep working in logical coordinates.
export function artScale(img) { return img._as || 1; }

// dw/dh are optional tuning overrides; shipping character art normally draws at
// its authored scale.
export function blit(ctx, img, dx, dy, dw, dh) {
  const s = img._as || 1;
  if (dw !== undefined) ctx.drawImage(img, dx, dy, dw, dh);
  else if (s === 1) ctx.drawImage(img, dx, dy);
  else ctx.drawImage(img, dx, dy, img.width / s, img.height / s);
}

export function frameW(img) { return img.width / (img._as || 1); }
export function frameH(img) { return img.height / (img._as || 1); }

// Rim light: on dark stages a bright 1px halo keeps leather-clad fighters
// readable against the background. G.stage.rim controls the strength.
// Silhouettes are baked once per frame+hue; running a canvas filter on every
// sprite every frame was the single most expensive thing in the renderer.
const rimCache = new WeakMap();
function rimSilhouette(f, hue) {
  let byHue = rimCache.get(f);
  if (!byHue) { byHue = new Map(); rimCache.set(f, byHue); }
  let c = byHue.get(hue);
  if (!c) {
    c = mkCanvas(f.width, f.height);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.filter = `brightness(0) invert(1) sepia(1) saturate(6) hue-rotate(${hue}deg)`;
    x.drawImage(f, 0, 0);
    c._as = f._as;
    byHue.set(hue, c);
  }
  return c;
}

export function drawRim(ctx, f, dx, dy, rim) {
  if (!rim || G.reflecting) return;
  const o = 1 / (f._as || 1);
  const sil = rimSilhouette(f, rim.hue);
  ctx.save();
  ctx.globalAlpha = rim.a;
  blit(ctx, sil, dx - o, dy);
  blit(ctx, sil, dx + o, dy);
  blit(ctx, sil, dx, dy - o);
  blit(ctx, sil, dx, dy + o);
  ctx.restore();
}

export function getFrame(set, name, idx, facing) {
  // AI-generated frames win when the manifest provides them for this character+state
  const ai = set._aiKey && getAIFrame(set._aiKey, name);
  if (ai) {
    const arr = facing === 1 ? ai.f : ai.fl;
    return arr[idx % arr.length];
  }
  const arr = facing === 1 ? set[name] : set[name + '_f'];
  return arr[idx % arr.length];
}

// Every character now ships AI frames. This one code-drawn set is the fallback
// getFrame() lands on when a frame is missing, so a broken asset shows a visible
// fighter instead of nothing. Enemy/boss state names alias onto the player poses.
function buildFallback() {
  const F = buildPlayer();
  F.atk = F.jab; F.punch = F.jab; F.slam = F.upper;
  F.run = F.walk; F.jumpfall = F.jump; F.suplex = F.throw;
  F.wallsplat = F.hurt; F.taunt = F.victory;
  F.idle_cigar = F.idle; F.idle_shades = F.idle;
  F.idle_flex = F.victory; F.idle_knuckles = F.idle;
  return F;
}
const FALLBACK = addFlips(buildFallback());

// One shared fallback set behind every character key. getFrame() prefers the AI
// frames named by _aiKey and only reaches this when the manifest has no entry.
// The frames are copied, not prototype-inherited: tools that enumerate a set's
// states with Object.keys (the asset lab) would otherwise see nothing. The
// arrays themselves are shared, so this costs a handful of references.
function aiSet(key) {
  return Object.assign({}, FALLBACK, { _aiKey: key });
}

export const SPR = {
  player: aiSet('player'),
  goonda: aiSet('goonda'),
  batta: aiSet('batta'),
  masala: aiSet('masala'),
  bandar: aiSet('bandar'),
  pehlwan: aiSet('pehlwan'),
  constable: aiSet('constable'),
  operator: aiSet('operator'),
  sepoy: aiSet('sepoy'),
  raja: aiSet('raja'),
  rajaRage: aiSet('raja'),
  refund: aiSet('refund'),
  refundRage: aiSet('refund'),
  mirchi: aiSet('mirchi'),
  mirchiRage: aiSet('mirchi'),
  yadav: aiSet('yadav'),
  yadavRage: aiSet('yadav'),
  rana: aiSet('rana'),
  ranaRage: aiSet('rana'),
  spark: buildSparkHi(),
  dust: buildDustHi(),
  shock: buildShockHi(),
  shake: buildPickupShake(),
  plate: buildPickupPlate(),
};

// life icon: head crop out of the fallback idle frame
SPR.lifeIcon = (() => {
  const c = mkCanvas(14, 12);
  c.getContext('2d').drawImage(FALLBACK.idle[0], -9, -2);
  return c;
})();
