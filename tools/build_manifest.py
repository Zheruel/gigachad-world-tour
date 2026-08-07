#!/usr/bin/env python3
"""Rebuild assets/frames/manifest.json from whatever frames exist on disk.

Character key -> file prefix. Missing files are simply left out, so the game
falls back to the code-drawn sprite for that state.
"""
import json
import os

FRAMES = "assets/frames/"

BOSSES = {
    "raja": "raja", "mirchi": "mirchi", "refund": "refund", "yadav": "yadav", "rana": "rana",
}
ENEMIES = {
    "goonda": "goonda", "batta": "batta", "masala": "masala",
    "bandar": "bandar", "pehlwan": "pehlwan", "rickshaw": "rickshaw",
    "constable": "constable", "operator": "operator", "sepoy": "sepoy",
}

PLAYER = {
    # Sheet-generated (pass 4). Each animation was drawn as ONE sprite sheet and
    # sliced, so the model laid the poses out as a set the way an artist would.
    # Measured against the same poses generated one at a time, the jab's leg pixels
    # went from changing 61% between frames to 15% - that jitter was the whole
    # reason the walk and the punches never looked smooth.
    "idle": ["chad_sidle1.png", "chad_sidle2.png", "chad_sidle3.png", "chad_sidle4.png"],
    "walk": ["chad_swlk1.png", "chad_swlk2.png", "chad_swlk3.png",
             "chad_swlk4.png", "chad_swlk5.png", "chad_swlk6.png"],
    "run": ["chad_srun1.png", "chad_srun2.png", "chad_srun3.png",
            "chad_srun4.png", "chad_srun5.png", "chad_srun6.png"],
    "dash": ["chad_dash1.png", "chad_dash2.png"],
    "jump": ["chad_jump.png"],
    "jumpfall": ["chad_jumpfall.png"],
    "jumpkick": ["chad_jumpkick.png"],
    # wind-up / strike / recovery, so a punch reads as a punch
    "jab": ["chad_sjab1.png", "chad_sjab2.png", "chad_sjab3.png", "chad_sjab4.png"],
    "hook": ["chad_shook1.png", "chad_shook2.png", "chad_shook3.png", "chad_shook4.png"],
    "upper": ["chad_supper1.png", "chad_supper2.png", "chad_supper3.png", "chad_supper4.png"],
    "combo_power_a": [f"chad_combo_power_a_{i}.png" for i in range(1, 9)],
    "combo_power_b": [f"chad_combo_power_b_{i}.png" for i in range(1, 9)],
    "combo_power_finish": ["chad_combo_power_a_7.png", "chad_combo_power_a_8.png",
                           "chad_combo_power_b_1.png", "chad_combo_power_b_2.png",
                           "chad_combo_power_b_3.png"],
    "parry_counter": [f"chad_parry_counter_{i}.png" for i in range(1, 9)],
    "meteor_lariat": [f"chad_meteor_lariat_{i}.png" for i in range(1, 9)],
    "ragnarok_ground": [f"chad_ragnarok_ground_{i}.png" for i in range(1, 9)],
    "ragnarok_air": [f"chad_ragnarok_air_{i}.png" for i in range(1, 9)],
    "grab": ["chad_grab.png"],
    "knee": ["chad_kne1.png", "chad_kne2.png"],
    "throw": ["chad_throw1.png", "chad_throw2.png"],
    "suplex": ["chad_suplex1.png", "chad_suplex2.png"],
    "hurt": ["chad_hurt.png"],
    "down": ["chad_down.png"],
    "getup": ["chad_getup.png"],
    "wallsplat": ["chad_wallsplat.png"],
    "victory": ["chad_victory.png"],
    "taunt": ["chad_taunt.png"],
    "special": ["chad_sup1.png", "chad_sup2.png", "chad_sup3.png", "chad_sup4.png"],
    # idle flavour animations, played once when you stand still
    "idle_cigar": ["chad_idle_cigar1.png", "chad_idle_cigar2.png", "chad_idle_cigar3.png",
                   "chad_idle_cigar4.png", "chad_idle_cigar5.png", "chad_idle_cigar6.png"],
    "idle_shades": ["chad_idle_shades1.png", "chad_idle_shades2.png",
                    "chad_idle_shades3.png", "chad_idle_shades4.png"],
    "idle_flex": ["chad_idle_flex1.png", "chad_idle_flex2.png",
                  "chad_idle_flex3.png", "chad_idle_flex4.png"],
    "idle_knuckles": ["chad_idle_knuckles1.png", "chad_idle_knuckles2.png",
                      "chad_idle_knuckles3.png", "chad_idle_knuckles4.png"],
}

BOSS_STATES = {
    "idle": ["{p}_idle.png"],
    "walk": ["{p}_walk1.png", "{p}_walk2.png"],
    "punch": ["{p}_punch.png", "{p}_punch2.png", "{p}_punch3.png"],
    "grab": ["{p}_grab.png"],
    "slam": ["{p}_slam.png", "{p}_slam2.png", "{p}_slam3.png"],
    "hurt": ["{p}_hurt.png", "{p}_hurt2.png"],
    "down": ["{p}_down.png"],
}

RANA_STATES = {
    "idle": ["rana_1.png"],
    "walk": ["rana_2.png", "rana_3.png"],
    "punch": ["rana_4.png", "rana_chain_lash.png"],
    "grab": ["rana_4.png"],
    # The generator connected the lash and slam with a continuous chain, so a
    # small post-process separates the two intact bodies into clean frames.
    "slam": ["rana_chain_slam.png"],
    "hurt": ["rana_react_hurt.png"],
    "down": ["rana_react_down.png"],
}

ENEMY_STATES = {
    "idle": ["{p}_idle.png"],
    "walk": ["{p}_walk1.png", "{p}_walk2.png", "{p}_walk3.png", "{p}_walk4.png"],
    "atk": ["{p}_atk.png", "{p}_atk2.png", "{p}_atk3.png"],
    # two recoil frames: one static hurt pose gives the punch nothing to land on
    "hurt": ["{p}_hurt.png", "{p}_hurt2.png"],
    "down": ["{p}_down.png"],
    "getup": ["{p}_idle.png"],
}


def existing(files):
    return [f for f in files if os.path.exists(FRAMES + f)]


def build_set(prefix, states):
    out = {}
    for state, files in states.items():
        got = existing([f.format(p=prefix) for f in files])
        if got:
            out[state] = got
    return out


def main():
    manifest = {}
    player = {k: existing(v) for k, v in PLAYER.items()}
    manifest["player"] = {k: v for k, v in player.items() if v}
    for key, prefix in ENEMIES.items():
        s = build_set(prefix, ENEMY_STATES)
        if s:
            manifest[key] = s
    for key, prefix in BOSSES.items():
        s = build_set(prefix, RANA_STATES if key == "rana" else BOSS_STATES)
        if s:
            manifest[key] = s
    with open(FRAMES + "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    total = sum(len(v) for c in manifest.values() for v in c.values())
    print(f"manifest: {len(manifest)} characters, {total} frames")
    for k, v in manifest.items():
        print(" ", k, ",".join(sorted(v)))


if __name__ == "__main__":
    main()
