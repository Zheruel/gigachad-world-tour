#!/usr/bin/env python3
"""Key the generated green sheets and build small runtime ambience/impact frames."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def key_green(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            # Generated backdrops are near pure green; retain warm art and shadows.
            if g > 120 and g > r * 1.35 and g > b * 1.30:
                px[x, y] = (r, g, b, 0)
    return im


def crop_alpha(im, pad=4):
    box = im.getchannel("A").getbbox()
    if not box:
        return im
    l, t, r, b = box
    return im.crop((max(0, l-pad), max(0, t-pad), min(im.width, r+pad), min(im.height, b+pad)))


def save_scaled(im, path, logical_w, fixed_box=None):
    im = crop_alpha(key_green(im))
    width = logical_w * 2
    height = max(2, round(im.height * width / im.width))
    im = im.resize((width, height), Image.Resampling.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    if fixed_box:
        box = Image.new("RGBA", (fixed_box * 2, fixed_box * 2))
        box.alpha_composite(im, ((box.width - im.width) // 2, (box.height - im.height) // 2))
        im = box
    im.save(path)


def main():
    sheet = Image.open(ROOT / "assets/ai/sheet/delhi_cloth_loops_v4.png")
    for i in range(8):
        l = round(i * sheet.width / 8)
        r = round((i + 1) * sheet.width / 8)
        name = "delhi_laundry" if i < 4 else "delhi_awning"
        save_scaled(sheet.crop((l, 0, r, sheet.height)),
                    ROOT / f"assets/ambience/{name}_{i % 4 + 1}.png", 74 if i < 4 else 64)

    for i in range(1, 5):
        src = Image.open(ROOT / f"assets/ai/ambience_v4/delhi_fan_{i}.png")
        save_scaled(src, ROOT / f"assets/ambience/delhi_fan_{i}.png", 38, 42)

    for i in range(1, 7):
        src = Image.open(ROOT / f"assets/ai/fx_v4/ragnarok_impact_{i}.png")
        save_scaled(src, ROOT / f"assets/fx/ragnarok_impact{i}.png", 142)


if __name__ == "__main__":
    main()
