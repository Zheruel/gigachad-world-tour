#!/usr/bin/env python3
"""Turn raw prop generations into game-ready sprites.

Same treatment as the character pipeline (chroma key, hard alpha, outline,
quantize) but sized per prop from the logical footprint in js/props.js, and
scaled by HEIGHT so a prop always sits at the right size against a fighter.
Output is at RS device pixels per logical pixel.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from process_char import key_green, subject, hard_alpha, outline

RS = 2
SRC = "assets/ai/props/"
OUT = "assets/props/"

# name -> (logical width, logical height) from PROP_TYPES in js/props.js
SIZES = {
    "crate": (30, 32),
    "matka": (24, 26),
    "tyres": (32, 34),
    "table": (44, 30),
    "sign": (40, 22),
    "rickshaw": (96, 80),
    "cart": (58, 44),
    "bag": (30, 84),
}

# The lair fixtures get the same treatment but are not breakable props, so they live
# in their own directory rather than PROP_TYPES. Mirror of LAIR_ART in js/hub.js.
LAIR_SRC = "assets/ai/lair/"
LAIR_OUT = "assets/lair/"
LAIR = {
    "worldmap": (80, 48),
    "arcade": (34, 68),
    "hifi": (28, 60),
    # The gym in front of the glass, all of it furniture. The rack and the bench were
    # walk-up stations with CHAD lifting on them for a while, which meant keeping two
    # drawings of the same equipment in agreement frame by frame - a whole apparatus in
    # build_lair_extras.py - for a second and third way to do what the bag already does.
    # World scale is ~50 logical px per metre, so the bench's posts stand about 1.4 m.
    "gym_plates": (28, 62),
    "gym_kettles": (56, 26),
    "gym_curl": (112, 54),
    "gym_bench": (122, 82),
    # the widened room: the painting over the sofa, the oil over the fireplace, and the
    # cigar cabinet - which is now a flush front built into the second niche's base panel
    # (logical 482.5-591 x 147-165.5), not a box standing against the wall
    # Freestanding again: built flush into the panelling it read as joinery rather than
    # as a thing CHAD owns. 56 wide is the clear window between the trophy wall's last
    # relic (ends 740) and the world map's frame (starts 796).
    "humidor": (56, 78),
    # The tank floor: ONE generation spanning the full 299 of glass. Two pieces butted
    # together showed their join however well they matched. Tall - the masts and the kelp
    # reach most of the way up on purpose, and the shark swims in FRONT of the wreck
    # rather than in a strip of empty blue above it.
    "tankscape": (299, 92),
    "lounge_rug": (240, 49),
    # The matching armchair. Sized by height against the sofa's own back, so the pair
    # reads as one suite; the generation arrives with a slab of the room's panelling
    # behind it, which is cropped off in tools/gen_lair_deco.sh's note.
    "lounge_chair": (70, 50),
    "overmantel": (76, 70),
    # exactly the run from the ceiling bracket to the bag's collar, so it never tiles
    "bag_chain": (10, 100),
    # One relic per boss, standing in a niche. Every bay is ~32 logical of headroom
    # (SHELF_Y in js/hub.js is measured off the plate's glass shelf lines), so 26 is the
    # ceiling. They are NOT all 26: drawn to one height a police cap came out the same
    # size as a payphone, which is what made the shelf read wrong. Height is roughly the
    # real object at the room's ~50 logical px per metre, capped at the bay.
    "relic_raja": (22, 20),      # a taxi meter, about 40cm on its bracket
    "bar_stools": (44, 40),
    "gloves": (20, 30),
    # the master suite. The bed itself is a strip and comes from build_lair_extras.py.
    "bed_wardrobe": (60, 96),
    "bed_nightstand": (44, 40),
    "bed_rug": (126, 54),   # sized by HEIGHT here; the width follows the art
}


# DIRTY DELHI: the stage's own props, the dredger's rig, and the market shutter. Raw
# generations come from tools/gen_d1_props.sh. Sizes are logical (w, h); only h drives the
# scale, the width follows the art. `out` overrides the default assets/props/ destination.
D1_SRC = "assets/ai/d1props/"
D1 = {
    "drum": (30, 40),
    "mithai": (26, 20),
    # MIRCHI's chaat cart, from tools/gen_d1_mirchi.sh: PROP_TYPES.mirchicart
    "mirchicart": (70, 56),
    "thelapole": (84, 14),
    "dhobislab": (46, 18),
    # the bucket IS the boss's body in js/delhi_bosses.js: 96 tall including the chain stub,
    # so the steel itself reads about 70 against a 90-tall fighter
    "dredger_bucket": (72, 96),
    "dredger_bucket_open": (96, 96),
    "dredger_winch": (54, 40),
    "hose_nozzle": (28, 14),
    "shutter": (60, 80),
    # ambience: the ring crowd (backs, a head shorter than a fighter), the ghat's rats
    # and what floats past the pontoon. Not breakable, so they go to assets/ambience/.
    "crowd_a_key": (220, 84),
    "crowd_b_key": (220, 84),
    "rat": (16, 8),
    "debris_bottle": (12, 6),
    "debris_garland": (16, 5),
    "debris_scooter": (24, 12),
}
# raw name -> runtime file name (js/assets.js keys)
D1_NAME = {"dredger_bucket": "bucket", "dredger_bucket_open": "bucket_open", "dredger_winch": "winch"}
D1_OUT = {
    "shutter": "assets/ambience/delhi_shutter_1.png",
    "crowd_a_key": "assets/ambience/delhi_crowd_a.png",
    "crowd_b_key": "assets/ambience/delhi_crowd_b.png",
    "rat": "assets/ambience/delhi_rat.png",
    "debris_bottle": "assets/ambience/delhi_debris_bottle.png",
    "debris_garland": "assets/ambience/delhi_debris_garland.png",
    "debris_scooter": "assets/ambience/delhi_debris_scooter.png",
}
D1_NO_BROKEN = {"dredger_bucket", "dredger_bucket_open", "hose_nozzle", "shutter",
                "crowd_a_key", "crowd_b_key", "rat", "debris_bottle", "debris_garland", "debris_scooter"}
# How tall the broken state is, as a fraction of the whole prop. The default 0.45 is
# rubble on the floor; the wrecked winch is still most of a winch, and the tipped cart
# still has its wheels in the air.
# long flat things are sized by WIDTH: a punting pole scaled to 14 tall came out 167 long
D1_BY_WIDTH = {"thelapole", "dhobislab"}
D1_BROKEN_H = {"mirchicart": 0.7, "dredger_winch": 0.85, "drum": 0.6, "thelapole": 0.9, "dhobislab": 0.7, "mithai": 0.5}
# THE NIGHT TRAIN: props from tools/gen_d2_props.sh, plus the rake, the family and the
# pigeons for the wall plane (assets/ambience/).
D2_SRC = "assets/ai/d2props/"
D2 = {
    "trolley": (36, 40), "trunk": (38, 26), "parcel": (34, 36), "berthtable": (30, 20),
    "glasses": (26, 22), "urn": (24, 40), "fridge": (30, 48), "chain": (14, 30),
    "thelatrunk": (44, 30), "handtruck": (40, 36),
    "portrait_tte": (48, 48), "portrait_birju": (48, 48),
    "family": (96, 40), "pigeons": (110, 14),
    # the rake standing at platform 1: two coaches, sized to stand on the platform edge
    # with its roof under the canopy (the wall band is 181 tall)
    "rake": (760, 250),
}
D2_OUT = {
    "portrait_tte": "assets/portrait_tte.png", "portrait_birju": "assets/portrait_birju.png",
    "family": "assets/ambience/train_family.png", "pigeons": "assets/ambience/train_pigeons.png",
    "rake": "assets/ambience/train_rake.png",
}
D2_NO_BROKEN = {"handtruck", "portrait_tte", "portrait_birju", "family", "pigeons", "rake"}
D2_BROKEN_H = {"chain": 0.5, "fridge": 0.6, "urn": 0.55, "trolley": 0.6, "thelatrunk": 0.7}
D2_BY_WIDTH = {"family", "pigeons"}

# the relics for the trophy wall, sized like the others in LAIR
LAIR.update({
    "relic_dredger": (22, 22),   # the brass permit token on its block
    "relic_birju": (16, 26),     # a coupling pin, standing
    "relic_sir": (24, 18),       # the headset on its stand
})


# A few props have to hit an exact WIDTH as well as a height, because they sit inside an
# opening that was measured off the plate. Sizing by height alone let the overmantel oil come
# out 92 logical wide into the 87-wide bay between the fireplace's fluted pilasters, covering
# the fluting either side. A few percent of horizontal squash is invisible on a painting.
# Nothing needs this at the moment. The overmantel oil did while it was a wide trophy pose
# forced into an 87-wide bay; the battle canvas that replaced it is nearly square (1.08) and
# forcing it to 87 stretched the figures 18% wide, so it is sized by height and simply comes
# out narrower than the bay - which a painting is allowed to be.
EXACT_W = {}


def scaled(img, h):
    """Two-step downscale keeps the detail that a single resize smears away."""
    w = max(1, round(img.width * h / img.height))
    return img.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)


def process(name, broken, sizes=SIZES, src_dir=SRC, out_dir=OUT, out_name=None, out_path=None, broken_h=0.45):
    src = src_dir + name + ("_b" if broken else "") + ".png"
    if not os.path.exists(src):
        print(f"SKIP {src}")
        return
    lw, lh = sizes[name]
    # a broken prop is rubble: it sits lower and spreads wider
    th = int(lh * (broken_h if broken else 1.0) * RS)
    img = hard_alpha(subject(key_green(Image.open(src), tol=40)), 128)
    if name in (D1_BY_WIDTH | D2_BY_WIDTH) and not broken:
        tw = int(lw * RS)
        th = max(1, round(img.height * tw / img.width))
    img = scaled(img, th)
    if name in EXACT_W:
        img = img.resize((EXACT_W[name] * RS, img.height), Image.LANCZOS)
    img = hard_alpha(img, 110)
    img = outline(img)
    # MEDIANCUT only takes RGB, so quantize the colour and re-attach the alpha
    alpha = img.getchannel("A")
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img.convert("RGB"), (0, 0), alpha)
    q = rgb.quantize(colors=40, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGBA")
    q.putalpha(alpha)
    dst = out_path or (out_dir + (out_name or name) + ("_b" if broken else "") + ".png")
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    q.save(dst)
    print(f"{dst:<34} {q.width}x{q.height}  (logical {round(q.width / RS)}x{round(q.height / RS)})")


if __name__ == "__main__":
    names = sys.argv[1:] or list(SIZES) + list(LAIR) + list(D1) + list(D2)
    for n in names:
        if n in LAIR and n.startswith("relic_") and os.path.exists(D1_SRC + n + ".png"):
            process(n, False, LAIR, D1_SRC, LAIR_OUT)
        elif n in LAIR and n.startswith("relic_") and os.path.exists(D2_SRC + n + ".png"):
            process(n, False, LAIR, D2_SRC, LAIR_OUT)
        elif n in LAIR:
            process(n, False, LAIR, LAIR_SRC, LAIR_OUT)
        elif n in D1:
            process(n, False, D1, D1_SRC, OUT, D1_NAME.get(n), D1_OUT.get(n))
            if n not in D1_NO_BROKEN:
                process(n, True, D1, D1_SRC, OUT, D1_NAME.get(n), broken_h=D1_BROKEN_H.get(n, 0.45))
        elif n in D2:
            process(n, False, D2, D2_SRC, OUT, None, D2_OUT.get(n))
            if n not in D2_NO_BROKEN:
                process(n, True, D2, D2_SRC, OUT, None, broken_h=D2_BROKEN_H.get(n, 0.45))
        else:
            process(n, False)
            process(n, True)
