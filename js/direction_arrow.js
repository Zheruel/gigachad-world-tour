import { ASSETS } from './assets.js';

// Shared destination/level marker. x/y are its center in logical pixels.
export function drawDirectionArrow(ctx, { x, y, direction = 'right', size = 42, time = 0, bob = 2 }) {
  const step = Math.round(Math.sin(time * .09) * bob);
  const vertical = direction === 'up' || direction === 'down';
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(x + (vertical ? 0 : step * sign)), Math.round(y + (vertical ? step * sign : 0)));
  if (vertical) ctx.rotate(sign * Math.PI / 2);
  else if (sign < 0) ctx.scale(-1, 1);
  const art = ASSETS.direction_arrow;
  if (art) {
    const height = Math.round(size * art.height / art.width);
    ctx.drawImage(art, -Math.round(size / 2), -Math.round(height / 2), size, height);
  } else {
    ctx.scale(size / 32, size / 32);
    ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(1, -9); ctx.lineTo(1, -4);
    ctx.lineTo(-11, -4); ctx.lineTo(-11, 4); ctx.lineTo(1, 4); ctx.lineTo(1, 9); ctx.closePath();
    ctx.strokeStyle = '#231510'; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = '#ffda76'; ctx.fill();
  }
  ctx.restore();
}
