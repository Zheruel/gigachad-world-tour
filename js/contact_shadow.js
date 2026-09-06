// Small stepped contact patch, anchored to the floor even when a person jumps.
export function drawContactShadow(ctx, x, y, radius = 14, height = 0, scale = 1) {
  const lift = Math.min(1, Math.max(0, height) / 65);
  const half = Math.max(5, Math.round(Math.min(16, radius * .75) * scale * (1 - lift * .3)));
  x = Math.round(x); y = Math.round(y + 1);
  ctx.save();
  ctx.globalAlpha *= 1 - lift * .55;
  ctx.fillStyle = 'rgba(0,0,0,.10)';
  ctx.fillRect(x - half + 3, y - 1, Math.max(2, half * 2 - 6), 1);
  ctx.fillRect(x - half + 2, y + 1, Math.max(2, half * 2 - 4), 1);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(x - half, y, half * 2, 1);
  ctx.restore();
}
