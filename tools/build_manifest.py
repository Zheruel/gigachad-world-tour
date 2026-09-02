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

# ---- DIRTY DELHI --------------------------------------------------------
# Every one of these is generated as strips, so the frames are numbered from 1 and
# the idle is four frames of breathing rather than one still pose. The older cast's
# one-frame idle is why they stand dead still between waves.
# Extra states beyond the drawn set are carried anyway: NAMEMAP in js/aiframes.js
# resolves them, and a state the code does not ask for yet costs nothing.
D1_ENEMIES = {
    "cooker": {
        "idle": ["cooker_idle1.png", "cooker_idle2.png", "cooker_idle3.png", "cooker_idle4.png"],
        "walk": ["cooker_walk1.png", "cooker_walk2.png", "cooker_walk3.png", "cooker_walk4.png"],
        "atk": ["cooker_beam2.png", "cooker_beam3.png", "cooker_beam4.png"],
        "beam": ["cooker_beam1.png", "cooker_beam2.png", "cooker_beam3.png", "cooker_beam4.png"],
        "hurt": ["cooker_hurt1.png", "cooker_hurt2.png"],
        "down": ["cooker_hurt3.png"],
    },
    "thela": {
        "idle": ["thela_idle1.png", "thela_idle2.png", "thela_idle3.png", "thela_idle4.png"],
        "walk": ["thela_walk1.png", "thela_walk2.png", "thela_walk3.png", "thela_walk4.png"],
        # the ram is his signature, so it is what the attack state plays
        "atk": ["thela_ram2.png", "thela_ram3.png", "thela_ram4.png"],
        "ram": ["thela_ram1.png", "thela_ram2.png", "thela_ram3.png", "thela_ram4.png"],
        "punch": ["thela_atk1.png", "thela_atk2.png", "thela_atk3.png"],
        "hurt": ["thela_hurt1.png", "thela_hurt2.png"],
        "down": ["thela_hurt3.png"],
    },
    "mudlark": {
        "idle": ["mudlark_idle1.png", "mudlark_idle2.png", "mudlark_idle3.png", "mudlark_idle4.png"],
        "walk": ["mudlark_walk1.png", "mudlark_walk2.png", "mudlark_walk3.png", "mudlark_walk4.png"],
        "atk": ["mudlark_grab1.png", "mudlark_grab2.png", "mudlark_grab3.png"],
        "rise": ["mudlark_rise1.png", "mudlark_rise2.png", "mudlark_rise3.png", "mudlark_rise4.png"],
        "hurt": ["mudlark_hurt1.png", "mudlark_hurt2.png"],
        "down": ["mudlark_hurt3.png"],
    },
    "dhobi": {
        "idle": ["dhobi_idle1.png", "dhobi_idle2.png", "dhobi_idle3.png", "dhobi_idle4.png"],
        "walk": ["dhobi_walk1.png", "dhobi_walk2.png", "dhobi_walk3.png", "dhobi_walk4.png"],
        "atk": ["dhobi_whip2.png", "dhobi_whip3.png", "dhobi_whip4.png"],
        "whip": ["dhobi_whip1.png", "dhobi_whip2.png", "dhobi_whip3.png", "dhobi_whip4.png"],
        "hurt": ["dhobi_hurt1.png", "dhobi_hurt2.png"],
        "down": ["dhobi_hurt3.png"],
    },
    "bull": {
        "idle": ["sandh_paw1.png"],
        "walk": ["sandh_walk1.png", "sandh_walk2.png", "sandh_walk3.png", "sandh_walk4.png"],
        # the paw IS the telegraph, so it is what the wind-up and the strike play
        "atk": ["sandh_paw4.png", "sandh_charge2.png", "sandh_charge3.png"],
        "paw": ["sandh_paw1.png", "sandh_paw2.png", "sandh_paw3.png", "sandh_paw4.png"],
        "charge": ["sandh_charge1.png", "sandh_charge2.png", "sandh_charge3.png", "sandh_charge4.png"],
        "hurt": ["sandh_hurt1.png", "sandh_hurt2.png"],
        "down": ["sandh_hurt3.png"],
    },
    "dabbawala": {
        "idle": ["dabbawala_run1.png"],
        "walk": ["dabbawala_run1.png", "dabbawala_run2.png", "dabbawala_run3.png", "dabbawala_run4.png"],
        "run": ["dabbawala_run1.png", "dabbawala_run2.png", "dabbawala_run3.png", "dabbawala_run4.png"],
        "hurt": ["dabbawala_drop1.png", "dabbawala_drop2.png"],
        "down": ["dabbawala_drop3.png"],
    },
    "thekedar": {
        "idle": ["thekedar_idle1.png", "thekedar_idle2.png", "thekedar_idle3.png", "thekedar_idle4.png"],
        "walk": ["thekedar_idle1.png", "thekedar_idle2.png", "thekedar_idle3.png", "thekedar_idle4.png"],
        "atk": ["thekedar_swing1.png", "thekedar_swing2.png", "thekedar_swing3.png"],
        "punch": ["thekedar_swing1.png", "thekedar_swing2.png", "thekedar_swing3.png"],
        "hurt": ["thekedar_hurt1.png", "thekedar_hurt2.png"],
        "down": ["thekedar_hurt3.png"],
    },
}

# ---- THE NIGHT TRAIN ----------------------------------------------------
D2_ENEMIES = {
    "coolie": {
        "idle": ["coolie_idle1.png", "coolie_idle2.png", "coolie_idle3.png", "coolie_idle4.png"],
        "walk": ["coolie_walk1.png", "coolie_walk2.png", "coolie_walk3.png", "coolie_walk4.png"],
        "atk": ["coolie_atk1.png", "coolie_atk2.png", "coolie_atk3.png"],
        "hurt": ["coolie_hurt1.png", "coolie_hurt2.png"],
        "down": ["coolie_hurt3.png"],
        "getup": ["coolie_hurt2.png"],
    },
    "gai": {
        "idle": ["gai_idle1.png", "gai_idle2.png", "gai_idle3.png", "gai_idle4.png"],
        "walk": ["gai_walk1.png", "gai_walk2.png", "gai_walk3.png", "gai_walk4.png"],
        "atk": ["gai_kick1.png", "gai_kick2.png", "gai_kick3.png"],
        "hurt": ["gai_hurt1.png", "gai_hurt2.png"],
        "down": ["gai_hurt2.png"],
    },
    "manja": {
        "idle": ["manja_idle1.png", "manja_idle2.png", "manja_idle3.png", "manja_idle4.png"],
        "perch": ["manja_idle1.png", "manja_idle2.png", "manja_idle3.png", "manja_idle4.png"],
        "walk": ["manja_walk1.png", "manja_walk2.png", "manja_walk3.png", "manja_walk4.png"],
        "throw": ["manja_throw1.png", "manja_throw2.png", "manja_throw3.png", "manja_throw4.png"],
        # on the ground he fights with the drop: the leap is his only strike
        "atk": ["manja_drop1.png", "manja_drop3.png", "manja_drop4.png"],
        "drop": ["manja_drop1.png", "manja_drop2.png", "manja_drop3.png", "manja_drop4.png"],
        "hurt": ["manja_hurt1.png", "manja_hurt2.png"],
        "down": ["manja_hurt3.png"],
    },
}
D2_BOSSES = {
    "tte": {
        "idle": ["tte_idle1.png", "tte_idle2.png", "tte_idle3.png", "tte_idle4.png"],
        "walk": ["tte_walk1.png", "tte_walk2.png", "tte_walk3.png", "tte_walk4.png"],
        "punch": ["tte_ledger1.png", "tte_ledger2.png", "tte_ledger3.png"],
        "ledger": ["tte_ledger1.png", "tte_ledger2.png", "tte_ledger3.png"],
        "torch": ["tte_torch1.png", "tte_torch2.png", "tte_torch3.png", "tte_torch4.png"],
        "grab": ["tte_stamp1.png", "tte_stamp2.png", "tte_stamp3.png"],
        "stamp": ["tte_stamp1.png", "tte_stamp2.png", "tte_stamp3.png", "tte_stamp4.png"],
        "slam": ["tte_stamp2.png", "tte_stamp3.png", "tte_stamp4.png"],
        "hurt": ["tte_hurt1.png", "tte_hurt2.png"],
        "down": ["tte_hurt3.png"],
    },
    "birju": {
        "idle": ["birju_idle1.png", "birju_idle2.png", "birju_idle3.png", "birju_idle4.png"],
        "walk": ["birju_walk1.png", "birju_walk2.png", "birju_walk3.png", "birju_walk4.png"],
        "punch": ["birju_chain2.png", "birju_chain3.png", "birju_chain4.png"],
        "chain": ["birju_chain1.png", "birju_chain2.png", "birju_chain3.png", "birju_chain4.png"],
        "hook": ["birju_hook1.png", "birju_hook2.png", "birju_hook3.png", "birju_hook4.png"],
        "charge": ["birju_charge1.png", "birju_charge2.png", "birju_charge3.png", "birju_charge4.png"],
        "grab": ["birju_grab1.png", "birju_grab2.png", "birju_grab3.png"],
        "slam": ["birju_grab2.png", "birju_grab3.png", "birju_grab3.png"],
        "uncouple": ["birju_uncouple1.png", "birju_uncouple2.png", "birju_uncouple3.png"],
        "hurt": ["birju_hurt1.png", "birju_hurt2.png"],
        "down": ["birju_hurt3.png"],
    },
}

# The two minibosses draw through the boss state machine, which asks for
# idle / walk / punch / grab / slam / hurt / down.
D1_BOSSES = {
    "pappu": {
        "idle": ["pappu_idle1.png", "pappu_idle2.png", "pappu_idle3.png", "pappu_idle4.png"],
        "walk": ["pappu_walk1.png", "pappu_walk2.png", "pappu_walk3.png", "pappu_walk4.png"],
        "punch": ["pappu_charge2.png", "pappu_charge3.png", "pappu_charge4.png"],
        "charge": ["pappu_charge1.png", "pappu_charge2.png", "pappu_charge3.png", "pappu_charge4.png"],
        "grab": ["pappu_grab1.png", "pappu_grab2.png", "pappu_grab3.png"],
        "slam": ["pappu_stomp2.png", "pappu_stomp3.png", "pappu_stomp4.png"],
        "stomp": ["pappu_stomp1.png", "pappu_stomp2.png", "pappu_stomp3.png", "pappu_stomp4.png"],
        "hurt": ["pappu_hurt1.png", "pappu_hurt2.png"],
        "down": ["pappu_hurt3.png"],
    },
    "mirchi": {
        "idle": ["mirchi_idle1.png", "mirchi_idle2.png", "mirchi_idle3.png", "mirchi_idle4.png"],
        "walk": ["mirchi_walk1.png", "mirchi_walk2.png", "mirchi_walk3.png", "mirchi_walk4.png"],
        # the samosa lob
        "punch": ["mirchi_throw1.png", "mirchi_throw2.png", "mirchi_throw3.png"],
        # the chutney ladle: overhead, swing, low, recover
        "slam": ["mirchi_ladle1.png", "mirchi_ladle2.png", "mirchi_ladle3.png", "mirchi_ladle4.png"],
        "chilli": ["mirchi_chilli1.png", "mirchi_chilli2.png", "mirchi_chilli3.png", "mirchi_chilli4.png"],
        # the cart shove, and the same reach for the grab
        "charge": ["mirchi_shove1.png", "mirchi_shove2.png", "mirchi_shove3.png", "mirchi_shove4.png"],
        "grab": ["mirchi_shove1.png", "mirchi_shove4.png", "mirchi_shove4.png"],
        "hurt": ["mirchi_hurt1.png", "mirchi_hurt2.png"],
        "down": ["mirchi_hurt3.png"],
    },
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
    # DIRTY DELHI carries its states literally rather than through a shared template:
    # every family was generated as strips with its own pose list.
    for key, states in {**D1_ENEMIES, **D1_BOSSES, **D2_ENEMIES, **D2_BOSSES}.items():
        got = {state: existing(files) for state, files in states.items()}
        got = {k: v for k, v in got.items() if v}
        if got:
            manifest[key] = got
    with open(FRAMES + "manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    total = sum(len(v) for c in manifest.values() for v in c.values())
    print(f"manifest: {len(manifest)} characters, {total} frames")
    for k, v in manifest.items():
        print(" ", k, ",".join(sorted(v)))


if __name__ == "__main__":
    main()
