#!/usr/bin/env python3
"""The parked bike without its rider, registered like the entrance cels.

The arrival ends with the rider gone and the bike still in the street, so the bike
needs a cel of its own on the same canvas, at the same scale, with the front tyre on
the same spot as tools/build_entrance_v9.py puts it. Reads the raw green-screen
generation from assets/ai/entrance_bike/bike_only.png, writes
assets/story/entrance_v9/bike.png.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

from build_entrance_v9 import CANVAS, OUT, WHEEL_BOTTOM, WHEEL_X, front_template, front_wheel, load_frames, rear_template, register_rear

RAW = Path(__file__).resolve().parents[1] / "assets/ai/entrance_bike/bike_only.png"


def key_green(img):
    a = np.array(img.convert("RGBA")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 120) & (g > r + 60) & (g > b + 60)
    a[..., 3] = np.where(green, 0, 255)
    # a soft edge where the key bled into the chrome
    out = Image.fromarray(a.astype(np.uint8))
    alpha = out.getchannel("A").filter(ImageFilter.MinFilter(3))
    out.putalpha(alpha)
    return out


def build():
    frames = load_frames()
    ref = frames[0]
    tmpl = front_template(frames)
    raw = key_green(Image.open(RAW))
    box = raw.getchannel("A").getbbox()
    raw = raw.crop(box)
    # bring the raw generation near the cel scale first so the NCC scale sweep is small
    approx = ref.width * 0.62 / raw.width
    raw = raw.resize((round(raw.width * approx), round(raw.height * approx)), Image.Resampling.LANCZOS)
    # front_wheel() searches the lower right of a cel-shaped canvas, so give it one
    stage = Image.new("RGBA", ref.size, (0, 0, 0, 0))
    stage.paste(raw, (ref.width - raw.width - 40, ref.height - raw.height - 4), raw)
    raw = stage
    scales = [round(0.7 + 0.025 * k, 3) for k in range(29)]
    c, scale, cx, ybot = front_wheel(raw, tmpl, scales)
    print(f"bike match={c:.2f} scale={scale:.3f} wheel=({cx},{ybot})")
    rig = raw.resize((round(raw.width * scale), round(raw.height * scale)), Image.Resampling.LANCZOS)
    rig = rig.filter(ImageFilter.UnsharpMask(radius=.4, percent=40, threshold=2))
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.paste(rig, (WHEEL_X - cx, WHEEL_BOTTOM - ybot), rig)
    # the same rear-tyre register the cels get
    canvas = register_rear(canvas, rear_template(frames, tmpl))
    canvas.save(OUT / "bike.png", optimize=True)
    a = np.array(canvas)[..., 3] > 40
    xs = np.where(a[160:184].any(0))[0]
    print(f"tyres x {xs.min()}..{xs.max()}  wrote {OUT / 'bike.png'}")


if __name__ == "__main__":
    build()
