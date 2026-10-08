"""Register selected super/daze performances against gameplay anatomy.

Run after build_chad_identity.py. One anatomical scale per sheet/character;
never normalize a crouch by its bounds. Existing super paths/cues stay intact.
"""
from pathlib import Path
import json
from collections import deque
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from chad_palette import lock, _gold_rgb

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT/'assets/sources/production'
OUT = ROOT/'assets/frames'
REVIEW = ROOT/'tmp/review/signature-identity'

def clean(im):
    a = np.array(im.convert('RGBA'))
    rgb = a[:, :, :3].astype(int)
    # Generated matte spill is confined to translucent edges, not costume reds.
    a[a[:, :, 3] < 48] = 0
    rim = np.array(Image.fromarray(a[:, :, 3]).filter(ImageFilter.MinFilter(3))) < 64
    spill = (rgb[:, :, 0] > 175) & (rgb[:, :, 1] < 65) & (rgb[:, :, 2] < 65)
    a[rim & spill] = 0
    a[a[:, :, 3] == 0] = 0
    return Image.fromarray(a)

def extract(path, rows, cols=4):
    a = np.array(clean(Image.open(path)))
    mask = a[:, :, 3] > 48
    remaining = mask.copy()
    parts = []
    for y, x in zip(*np.where(mask)):
        if not remaining[y, x]:
            continue
        q = deque([(y, x)]); remaining[y, x] = False; pts = []
        while q:
            yy, xx = q.popleft(); pts.append((yy, xx))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = yy + dy, xx + dx
                if 0 <= ny < mask.shape[0] and 0 <= nx < mask.shape[1] and remaining[ny, nx]:
                    remaining[ny, nx] = False; q.append((ny, nx))
        if len(pts) < 1500:
            continue
        yy, xx = np.array(pts).T
        x0, y0 = xx.min(), yy.min()
        p = np.zeros((yy.max()-y0+1, xx.max()-x0+1, 4), dtype=np.uint8)
        p[yy-y0, xx-x0] = a[yy, xx]
        parts.append((float(yy.mean()), float(xx.mean()), Image.fromarray(p)))
    assert len(parts) == rows*cols, (path, len(parts))
    parts.sort(key=lambda p: p[0])
    return [p[2] for r in range(rows) for p in sorted(parts[r*cols:(r+1)*cols], key=lambda p: p[1])]

def palette(ref):
    # Reuse the actual original inks, including gold skin and muted denim.
    im = Image.open(OUT/ref).convert('RGBA')
    return im.convert('RGB').quantize(colors=256)

def register(p, scale, size, inks, forward=True):
    a = np.array(p)[:, :, 3] > 64
    yy, xx = np.where(a[-max(8, round(10/scale)):])
    # Front boot is the grounded pivot during the planted punch sequences.
    anchor = float(np.median(xx[xx > (xx.min()+xx.max())/2])) if forward else float(np.median(xx))
    p = p.resize((round(p.width*scale), round(p.height*scale)), Image.Resampling.LANCZOS)
    p = clean(p)
    rgb = p.convert('RGB').quantize(palette=inks, dither=Image.Dither.NONE).convert('RGBA')
    rgb.putalpha(p.getchannel('A'))
    f = Image.new('RGBA', size)
    f.alpha_composite(rgb, (round(size[0]/2 + (14 if forward else 0)-anchor*scale), size[1]-7-p.height))
    return f

def sheet(name, frames, ref):
    for bg in ['#20242c', '#e8e4dc']:
        w, h = frames[0].size; out = Image.new('RGB', (w*4, h*((len(frames)+3)//4)), bg)
        d = ImageDraw.Draw(out)
        for i, f in enumerate(frames):
            x, y = i%4*w, i//4*h
            out.paste(f, (x, y), f); d.text((x+4, y+4), str(i), fill='white' if bg[1]=='2' else 'black')
        out.save(REVIEW/(name+('-dark' if bg[1]=='2' else '-light')+'.png'))

def original_pose(path, size):
    """Keep every original pixel; only register it on the super canvas."""
    p = Image.open(OUT/path).convert('RGBA')
    a = np.array(p)[:, :, 3] > 16
    yy, xx = np.where(a)
    low = yy.min()+int((yy.max()-yy.min()+1)*.4)
    # Same lower-body pivot as the ordinary gameplay frame loader.
    yb, xb = np.where(a[low:yy.max()+1])
    anchor = float(xb.mean())
    f = Image.new('RGBA', size)
    f.alpha_composite(p, (round(size[0]/2-anchor), size[1]-7-int(yy.max())))
    return f

def main():
    REVIEW.mkdir(parents=True, exist_ok=True)
    m = json.loads((OUT/'manifest.json').read_text())
    # Whole-sheet generations drifted from the approved face and anatomy.
    # Use the original artist's action bank without recolouring or resizing.
    p=m['player']; idle=p['idle']; walk=p['walk']; a=p['combo_power_a']; b=p['combo_power_b']; upper=p['upper']
    barrage=[idle[0],walk[0],a[5],a[6],a[1],a[2],a[3],a[4],a[5],a[6],b[0],b[1],b[2],b[3],a[0],idle[0]]
    electric=[idle[0],walk[0],a[5],a[6],a[1],a[4],upper[0],upper[1],b[4],upper[2],upper[2],upper[0],a[0],idle[0]]
    for state, poses in [('super_barrage', barrage), ('super_electric', electric)]:
        frames = []
        for path, source in zip(m['player'][state], poses):
            dest = OUT/path
            f = original_pose(source, Image.open(dest).size)
            # Sources are gameplay frames already in the gold palette; lock only a stray one
            # (lock is not idempotent, so already-locked art is left as is).
            a = np.array(f); cols = {tuple(c) for c in a[a[:, :, 3] > 127][:, :3]}
            if not cols <= {tuple(c) for c in _gold_rgb()}:
                f = lock(f)
            f.save(dest); frames.append(f)
        sheet(state, frames, None)
    # Train enemies' daze loops now come from their own sheets (build_train_passengers.py).
    (OUT/'manifest.json').write_text(json.dumps(m, indent=2)+'\n')

if __name__ == '__main__':
    main()
