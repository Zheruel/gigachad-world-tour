#!/usr/bin/env python3
"""Composite assets/title_art.png under the same scrims screens.js draws, so the
crop can be judged without opening the game. Writes /tmp/title_preview.png."""
from PIL import Image, ImageDraw

RS = 2
W, H = 480 * RS, 270 * RS
ART_H = 186 * RS

art = Image.open("assets/title_art.png").convert("RGB")
canvas = Image.new("RGB", (W, H), (0, 0, 0))
canvas.paste(art.resize((W + 12 * RS, ART_H), Image.LANCZOS), (-6 * RS, 0))

over = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(over)
for y in range(RS, ART_H, 3 * RS):
    d.rectangle([0, y, W, y + RS - 1], fill=(0, 0, 0, 36))
for y in range(0, 62 * RS):  # top scrim
    d.line([(0, y), (W, y)], fill=(8, 4, 8, int(217 * (1 - y / (62 * RS)))))
for y in range(86 * RS, H):  # bottom scrim
    t = (y - 86 * RS) / (H - 86 * RS)
    a = t / 0.45 * 0.85 if t < 0.45 else 0.85 + (t - 0.45) / 0.55 * 0.11
    d.line([(0, y), (W, y)], fill=(8, 4, 8, int(255 * a)))
canvas = Image.alpha_composite(canvas.convert("RGBA"), over).convert("RGB")

d = ImageDraw.Draw(canvas)
for box, label in [((160, 14, 320, 46), "LOGO"), ((196, 124, 284, 138), "PRESS Z"),
                   ((60, 158, 420, 198), "CONTROLS"), ((150, 210, 330, 252), "STAGE/HI")]:
    x0, y0, x1, y1 = (v * RS for v in box)
    d.rectangle([x0, y0, x1, y1], outline=(255, 0, 128), width=2)
    d.text((x0 + 4, y0 + 2), label, fill=(255, 0, 128))
canvas.save("/tmp/title_preview.png")
print("wrote /tmp/title_preview.png")
