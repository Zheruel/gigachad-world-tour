import { ASSETS } from './assets.js';
import { G, W, H, clamp } from './engine.js';
import { drawTextShadow, textWidth } from './sprites.js';
import { drawDirectionArrow } from './direction_arrow.js';

// Measured inside the existing walnut portal, leaving its painted trim intact.
export const ELEVATOR_BOUNDS = [1448, 63, 44, 103];
export const ELEVATOR_X = 1470;
export const CABIN_BOUNDS = { left: 38, right: 445, back: 222, front: 246 };
const smooth = (n) => { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); };
const mod = (n, d) => ((n % d) + d) % d;

export function elevatorGuide(camX) {
  const target = ELEVATOR_X - camX;
  return { x: clamp(target, 26, W - 26), visible: target >= 26 && target <= W - 26,
    direction: target < 26 ? -1 : target > W - 26 ? 1 : 0 };
}

export function drawElevatorGuide(ctx) {
  if (G.pendingDestination === null || G.hubPanel) return;
  const guide = elevatorGuide(G.camX);
  drawDirectionArrow(ctx, { x: guide.x, y: guide.visible ? 49 : 103,
    direction: guide.visible ? 'down' : guide.direction < 0 ? 'left' : 'right',
    size: guide.visible ? 24 : 42, time: G.time });
  if (!guide.visible) {
    const title = 'ELEVATOR', w = textWidth(title, 1), tx = guide.direction > 0 ? W - w - 10 : 10;
    ctx.fillStyle = 'rgba(12,9,17,.9)'; ctx.fillRect(tx - 5, 121, w + 10, 15);
    drawTextShadow(ctx, title, tx, 126, '#ffe1a0', 1);
  }
}

export function drawElevatorDoor(ctx, camX) {
  const [worldX, y, w, h] = ELEVATOR_BOUNDS, x = worldX - camX;
  if (x > W || x + w < 0) return;
  const ready = G.pendingDestination !== null;
  const opening = G.transition && G.hubSel === 'elevator' && ready
    ? smooth(G.transition.t / G.transition.dur) : 0;
  ctx.fillStyle = '#100c14'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#9b6a34'; ctx.fillRect(x + 2, y + 1, w - 4, 1);
  // Reveal the actual glass cabin, with its sunset view, rather than a flat recess.
  ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y + 1, w - 2, h - 2); ctx.clip();
  const sky = ASSETS.bg_lair_sky_far;
  if (sky) ctx.drawImage(sky, 650, 0, 550, 362, x, y + 8, w, h - 15);
  const cabin = ASSETS.travel_elevator_cabin;
  if (cabin) ctx.drawImage(cabin, 65, 0, 310, 330, x, y, w, h);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  // Crop only the paired bronze leaves. The generated marble surround does not
  // belong to this room; the original portal supplies the jambs and lintel.
  const art = ASSETS.travel_elevator_frame;
  for (let i = 0; i < 2; i++) {
    const dx = x + i * w / 2 + (i ? 1 : -1) * opening * w / 2;
    if (art) ctx.drawImage(art, 33 + i * 52, 76, 52, 207, dx, y, w / 2, h);
    else {
      const bronze = ctx.createLinearGradient(dx, 0, dx + w / 2, 0);
      bronze.addColorStop(0, '#271409'); bronze.addColorStop(.28, '#985621');
      bronze.addColorStop(.55, '#4f260e'); bronze.addColorStop(1, '#231009');
      ctx.fillStyle = bronze; ctx.fillRect(dx, y, w / 2, h);
      ctx.fillStyle = '#bc823a'; ctx.fillRect(dx + 2, y + 4, 1, h - 8);
    }
  }
  ctx.restore();
  ctx.fillStyle = '#b68743'; ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillStyle = '#100c0b'; ctx.fillRect(x + 16, y - 13, 13, 7);
  drawTextShadow(ctx, ready ? 'G' : 'PH', x + (ready ? 20 : 17), y - 12, '#e8b657', 1);
  ctx.fillStyle = '#281911'; ctx.fillRect(x + w + 9, y + 58, 4, 8);
  ctx.fillStyle = '#9f743f'; ctx.fillRect(x + w + 10, y + 59, 2, 6);
  ctx.fillStyle = ready ? '#9fead4' : '#e6b768'; ctx.fillRect(x + w + 10, y + 61, 2, 2);
}

// Fixed world geometry. At each depth, lowering camera height raises rooftops
// by a different amount. Buildings never recycle or dissolve into a street plate.
const BUILDINGS = [
  { x: -14, w: 57, h: 238, travel: 150, base: 222, texture: 0, depth: .25 },
  { x: 46, w: 39, h: 185, travel: 160, base: 222, texture: 1, depth: .27 },
  { x: 92, w: 48, h: 213, travel: 165, base: 228, texture: 2, depth: .3 },
  { x: 340, w: 49, h: 222, travel: 174, base: 230, texture: 0, depth: .32 },
  { x: 395, w: 73, h: 255, travel: 180, base: 230, texture: 1, depth: .34 },
  { x: -49, w: 112, h: 390, travel: 470, base: 238, texture: 2, depth: .7 },
  { x: 67, w: 59, h: 337, travel: 360, base: 239, texture: 0, depth: .56 },
  { x: 370, w: 72, h: 356, travel: 405, base: 240, texture: 1, depth: .62 },
  { x: 455, w: 96, h: 493, travel: 565, base: 243, texture: 2, depth: .85 },
];
function drawTower(ctx, b, index, p, look, art, t) {
  const image = art['tower_' + (b.texture + 1)];
  const width = image ? b.h * image.width / image.height : b.w;
  const x = b.x + (b.w - width) / 2 - look * b.depth;
  const y = b.base + (1 - p) * b.travel - b.h;
  ctx.save();
  ctx.globalAlpha = 1;
  if (image) ctx.drawImage(image, Math.round(x), Math.round(y), width, b.h);
  else {
    ctx.fillStyle = '#27203e'; ctx.fillRect(x, y, width, b.h);
    for (let wy = 7; wy < b.h; wy += 8) for (let wx = 3; wx < width - 3; wx += 6) {
      ctx.fillStyle = (wx * 13 + wy * 7 + index) % 11 < 4 ? '#ca8857' : '#514061';
      ctx.fillRect(x + wx, y + wy, 2, 3);
    }
  }
  ctx.restore();
  if ((Math.floor(t / 45) + index) % 3 === 0) {
    ctx.fillStyle = '#ffb37e'; ctx.fillRect(x + width * .5, y + 1, 1, 1);
  }
}

function shaftWall(ctx, t, art) {
  // The opaque marble podium rises past the glass as the cabin reaches the lobby.
  const y = Math.round(224 - smooth((t - 555) / 140) * 173);
  if (y >= 224) return;
  ctx.fillStyle = '#211a19'; ctx.fillRect(0, y, W, H);
  if (art.arrival_wall) ctx.drawImage(art.arrival_wall, 90, y, 300, 200);
}

function vista(ctx, tr, p, art) {
  const look = tr.look || 0, sky = ASSETS.bg_lair_sky_far;
  ctx.fillStyle = '#4c244c'; ctx.fillRect(0, 0, W, H);
  if (sky) ctx.drawImage(sky, -398 - look * .12, 4 - p * 24, 1280, 242);
  else {
    const sunset = ctx.createLinearGradient(0, 0, 0, 220);
    sunset.addColorStop(0, '#79275c'); sunset.addColorStop(.5, '#f3a148'); sunset.addColorStop(1, '#342746');
    ctx.fillStyle = sunset; ctx.fillRect(0, 0, W, H);
  }
  for (let i = 0; i < BUILDINGS.length; i++) drawTower(ctx, BUILDINGS[i], i, p, look, art, tr.t);
  shaftWall(ctx, tr.t, art);
  const haze = ctx.createLinearGradient(0, 45, 0, 237);
  haze.addColorStop(0, 'rgba(255,143,114,.06)'); haze.addColorStop(.55, 'rgba(239,123,112,0)');
  haze.addColorStop(1, 'rgba(70,37,62,.18)'); ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
  // Structure immediately outside the cabin: rapid vertical motion at the
  // edges, without black bands cutting through the entire panoramic window.
  for (const x of [88, 389]) {
    ctx.fillStyle = '#161725'; ctx.fillRect(x, 0, 5, 244);
    ctx.fillStyle = '#98654f'; ctx.fillRect(x + 1, 0, 1, 238);
    for (let i = -1; i < 5; i++) {
      const y = mod(i * 104 - p * 1610, 520) - 104;
      ctx.fillStyle = '#25212e'; ctx.fillRect(x - 2, y, 9, 5);
      ctx.fillStyle = '#b78361'; ctx.fillRect(x - 2, y, 9, 1);
      ctx.fillStyle = '#635065'; ctx.fillRect(x + 2, y + 2, 1, 1);
    }
  }
}

function drawCabinButtons(ctx, tr) {
  const nearby = !tr.gate && tr.x >= 418 && (tr.actor?.z || 0) === 0;
  if (!nearby && !tr.started) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  if (!tr.started) {
    // Match the penthouse's proximity brackets around the authored button stack.
    const strength = .3 + Math.sin((tr.animT || 0) * .09) * .08;
    for (const y of [162, 170, 178]) {
      const glow = ctx.createRadialGradient(464, y, 0, 464, y, 6);
      glow.addColorStop(0, `rgba(255,219,135,${strength})`);
      glow.addColorStop(1, 'rgba(255,185,65,0)');
      ctx.fillStyle = glow; ctx.fillRect(458, y - 6, 12, 12);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = (((tr.animT || 0) >> 3) & 1) ? '#ffd94a' : '#c8a020';
    const x = 456, y = 154, w = 16, h = 32, c = 4;
    ctx.fillRect(x, y, c, 1); ctx.fillRect(x, y, 1, c);
    ctx.fillRect(x + w - c, y, c, 1); ctx.fillRect(x + w - 1, y, 1, c);
    ctx.fillRect(x, y + h - 1, c, 1); ctx.fillRect(x, y + h - c, 1, c);
    ctx.fillRect(x + w - c, y + h - 1, c, 1); ctx.fillRect(x + w - 1, y + h - c, 1, c);
  } else {
    // The lobby selection flashes briefly on contact, then stays illuminated.
    const flash = Math.max(0, 1 - tr.t / 12);
    const radius = 6 + flash * 3;
    const glow = ctx.createRadialGradient(464, 178, 0, 464, 178, radius);
    glow.addColorStop(0, 'rgba(109,255,187,.9)');
    glow.addColorStop(.35, 'rgba(55,238,157,.55)');
    glow.addColorStop(1, 'rgba(55,238,157,0)');
    ctx.fillStyle = glow; ctx.fillRect(464 - radius, 178 - radius, radius * 2, radius * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#a8ffd1'; ctx.fillRect(463, 177, 2, 2);
    ctx.fillStyle = '#eefff6'; ctx.fillRect(463, 177, 1, 1);
  }
  ctx.restore();
}

export function drawElevatorCabin(ctx, tr, hero, art) {
  const p = smooth((tr.t - 85) / 610), look = tr.look || 0;
  // The camera is inside the cabin. Only the rear glazing can reveal the city;
  // even a missing frame cannot expose scenery around the room's silhouette.
  ctx.fillStyle = '#21130f'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.beginPath(); ctx.rect(91, 57, 298, 164); ctx.clip();
  vista(ctx, tr, p, art);
  ctx.restore();
  const cabin = art.elevator_cabin;
  if (cabin) {
    // Keep the rail at waist height while filling the view with the existing
    // ceiling, side walls and floor. Slice boundaries follow the rail/floor.
    ctx.drawImage(cabin, 0, 0, 440, 200, -12, 0, 504, 182);
    ctx.drawImage(cabin, 0, 200, 440, 70, -12, 182, 504, 39);
    ctx.drawImage(cabin, 0, 270, 440, 60, -12, 221, 504, 49);
  } else {
    ctx.fillStyle = '#43251a'; ctx.fillRect(0, 33, 91, 188); ctx.fillRect(389, 33, 91, 188);
    ctx.fillStyle = '#19151a'; ctx.fillRect(0, 221, W, 49);
    ctx.fillStyle = '#c39259'; ctx.fillRect(91, 57, 298, 2); ctx.fillRect(91, 181, 298, 3);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(99, 62, 282, 150); ctx.clip();
  ctx.fillStyle = 'rgba(251,199,165,.035)';
  ctx.beginPath(); ctx.moveTo(140 + look * .4, 62); ctx.lineTo(151 + look * .4, 62);
  ctx.lineTo(212, 212); ctx.lineTo(206, 212); ctx.fill(); ctx.restore();
  drawCabinButtons(ctx, tr);
  const x = tr.x;
  ctx.save(); ctx.beginPath(); ctx.rect(42, tr.y, 396, 270 - tr.y); ctx.clip();
  ctx.translate(0, tr.y * 2); ctx.scale(1, -1);
  hero(ctx, x, tr.y, tr.walking, tr.animT ?? tr.t, tr.facing || 1, 1.35, .12); ctx.restore();
  hero(ctx, x, tr.y, tr.walking, tr.animT ?? tr.t, tr.facing || 1, 1.35);
  return Math.max(0, Math.round(78 * (1 - p)));
}
