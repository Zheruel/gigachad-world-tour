"""Register the smuggler's contraband crate props (prop_nr_crate, prop_nr_crate_b).

Source: assets/sources/production/stages/night_train/smuggler/sheet_unarmed_act.png, a 4x3
GPT Image grid on magenta; cells 8 and 9 are the intact and smashed crate. The smuggler
himself (nr_heavy, nr_heavy_unarmed) is built by build_train_passengers.py.
"""
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT
from build_train_enemy_performances import extract

SRC = ROOT / 'assets/sources/production/stages/night_train/smuggler'
STAGE = ROOT / 'assets/stages/night_train/rebuild'


def main():
    cells = extract(Image.open(SRC / 'sheet_unarmed_act.png'), 3)
    # 2x art, 48 logical px wide like the suitcase: intact and smashed with spilled contraband.
    s = 96 / cells[8].width
    for i, name in [(8, 'prop_nr_crate'), (9, 'prop_nr_crate_b')]:
        c = cells[i]; c = c.resize((round(c.width * s), round(c.height * s)), Image.Resampling.LANCZOS)
        a = np.array(c); a[a[:, :, 3] < 40] = 0; Image.fromarray(a).save(STAGE / f'{name}.png')


if __name__ == '__main__':
    main()
