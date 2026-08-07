#!/usr/bin/env python3
"""Build the three-act chapter plates and motorcycle runtime frames."""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[1]


def plate(src, out, crop):
    im = Image.open(src).convert("RGB").crop(crop)
    im = ImageOps.fit(im, (1920, 362), method=Image.Resampling.LANCZOS)
    im.save(out, quality=95)


def floor(out, tint):
    im = Image.open(ROOT / "assets/bg_delhi_floor.png").convert("RGB")
    im = ImageOps.fit(im, (1920, 178), method=Image.Resampling.LANCZOS)
    wash = Image.new("RGB", im.size, tint)
    Image.blend(im, wash, 0.24).save(out)


def keyed(im):
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if g > 115 and g > r * 1.30 and g > b * 1.25:
                px[x, y] = (r, g, b, 0)
    box = im.getchannel("A").getbbox()
    return im.crop(box) if box else im


def motorcycle():
    frames = [keyed(Image.open(ROOT / f"assets/ai/story_v4/chad_motor_{i}.png")) for i in range(1, 9)]
    # CHAD's canonical processed standing silhouette is 178 device pixels.
    # The old 196px target made him grow by about 10% during this cinematic.
    target_h = 178
    fitted = []
    for im in frames:
        s = min(1.0, target_h / im.height)
        fitted.append(im.resize((round(im.width * s), round(im.height * s)), Image.Resampling.LANCZOS))
    cw = max(i.width for i in fitted) + 12
    out_dir = ROOT / "assets/story"
    out_dir.mkdir(exist_ok=True)
    for n, im in enumerate(fitted, 1):
        cv = Image.new("RGBA", (cw, target_h + 8))
        cv.alpha_composite(im, ((cw - im.width) // 2, target_h - im.height))
        cv.save(out_dir / f"chad_motor_{n}.png")

    parked = keyed(Image.open(ROOT / "assets/ai/story_v5/chad_motorcycle_parked_v5.png"))
    # Match the bike's measured height in the final dismount frame. The first
    # clean-bike pass was 132px and visibly grew during the handoff.
    target_bike_h = 96
    s = target_bike_h / parked.height
    parked = parked.resize((round(parked.width * s), target_bike_h), Image.Resampling.LANCZOS)
    cv = Image.new("RGBA", (parked.width + 8, target_h + 8))
    cv.alpha_composite(parked, (4, target_h - parked.height))
    cv.save(out_dir / "motorcycle_parked.png")


def main():
    plate(ROOT / "assets/ai/bg_police_v4.png", ROOT / "assets/bg_police_wall.png", (0, 0, 1920, 680))
    plate(ROOT / "assets/ai/bg_fort_v4.png", ROOT / "assets/bg_fort_wall.png", (0, 40, 1536, 805))
    floor(ROOT / "assets/bg_police_floor.png", (62, 78, 94))
    floor(ROOT / "assets/bg_fort_floor.png", (82, 42, 43))
    motorcycle()


if __name__ == "__main__":
    main()
