"""Contact sheet of the escape finale CHAD cells next to gold (sidle1, swlk3, srun1), on dark and light, at
authoring scale (2x) and game scale (1x shown x2), plus the Netaji blast set next to nr_neta a_00/e_08.

  .venv/bin/python tools/verification/finale_escape_sheet.py OUTDIR
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[2]
R = ROOT / 'assets/stages/night_train/rebuild'; F = ROOT / 'assets/frames'
CW, CH, COLS = 240, 224, 8
sys.path.insert(0, str(ROOT / 'tools/production'))
from build_train_finale_escape import CELLS, NETA  # noqa: E402


def chad_cells():
    at = Image.open(R / 'finale_chad.png'); out = []
    for i in range(len(CELLS)):
        c = at.crop(((i % COLS) * CW, (i // COLS) * CH, (i % COLS + 1) * CW, (i // COLS + 1) * CH)); out.append(c.crop(c.getbbox()))
    return out


def strip(figs, bg, h, pad=8):
    W = sum(f.width for f in figs) + pad * (len(figs) + 1); s = Image.new('RGBA', (W, h + 16), bg); x = pad
    for f in figs:
        s.alpha_composite(f, (x, h + 8 - f.height)); x += f.width + pad
    return s


def main(out):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    gold = [Image.open(F / f'{n}.png').convert('RGBA') for n in ('chad_sidle1', 'chad_swlk3', 'chad_srun1')]
    gold = [g.crop(g.getbbox()) for g in gold]
    cs = chad_cells()
    for bg, tag in (((34, 30, 42, 255), 'dark'), ((206, 200, 190, 255), 'light')):
        rows = [strip(gold + cs[i:i + 10], bg, 200) for i in range(0, len(cs), 10)]
        W = max(r.width for r in rows); s = Image.new('RGBA', (W, sum(r.height for r in rows)), bg); y = 0
        for r in rows:
            s.alpha_composite(r, (0, y)); y += r.height
        s.save(out / f'chad_cells_2x_{tag}.png')
        g1 = s.resize((s.width // 2, s.height // 2), Image.NEAREST).resize((s.width, s.height), Image.NEAREST)
        g1.save(out / f'chad_cells_1x_{tag}.png')
    nb = Image.open(R / 'finale_neta_blast.png'); ns = [nb.crop((i * 400, 0, i * 400 + 400, 300)) for i in range(len(NETA))]
    ref = [Image.open(F / f'nr_neta/{n}.png') for n in ('a_00', 'e_08')]
    for bg, tag in (((34, 30, 42, 255), 'dark'), ((206, 200, 190, 255), 'light')):
        s = Image.new('RGBA', (400 * 11 // 2, 160), bg)
        for i, c in enumerate(ref + ns):
            s.alpha_composite(c.resize((200, 150), Image.NEAREST), (i * 200, 5))
        s.save(out / f'neta_blast_{tag}.png')
    print(out)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'tmp/review/shera_rework/run2/escape')
