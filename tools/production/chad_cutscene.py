#!/usr/bin/env python3
"""CHAD cutscene sheets (airport stairs/board/descent/duck, night-train board/entry/cinema/roof climb): import GPT head
edits onto the approved sources and finish runtime sheets on the gold palette.

align(new, old, cols, rows): per grid cell, scale and move the edited figure onto the original's body (rows below the
  head), so builder pivots, feet and hand anchors keep working. One-off import step for an edit of a keyed source.
finish(path, cell): per cell of a runtime sheet, after the builder wrote it: drop key-tinted rim pixels,
  sprite_edges.edges(), then chad_palette.lock() last. The builders call it for every CHAD sheet.

  .venv/bin/python tools/production/chad_cutscene.py import EDIT.png ORIGINAL_KEYED.png COLSxROWS OUT.png
  .venv/bin/python tools/production/chad_cutscene.py finish SHEET.png WxH
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_edges import edges  # noqa: E402
from chad_palette import lock, _gold_rgb  # noqa: E402
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'verification'))
import chad_identity_check as C  # noqa: E402


def _boxes(size, cols, rows):
    w, h = size
    return [(round(c * w / cols), round(r * h / rows), round((c + 1) * w / cols), round((r + 1) * h / rows))
            for r in range(rows) for c in range(cols)]


def _body(m, head=.3):
    """Mask without the head: rows above top + head * height cleared (hair and face are what the edit changes)."""
    ys = np.nonzero(m.any(1))[0]
    if not len(ys):
        return m
    b = m.copy(); b[:ys[0] + int(head * (ys[-1] - ys[0] + 1))] = False
    return b


def _xcorr(a, b):
    """Integer shift (dy, dx) moving b onto a with the largest overlap (FFT cross-correlation)."""
    H, W = a.shape[0] + b.shape[0], a.shape[1] + b.shape[1]
    c = np.fft.irfft2(np.fft.rfft2(a, (H, W)) * np.conj(np.fft.rfft2(b, (H, W))), (H, W))
    dy, dx = np.unravel_index(np.argmax(c), c.shape)
    return (dy - H if dy > H // 2 else dy), (dx - W if dx > W // 2 else dx)


def _shift(m, dy, dx):
    o = np.zeros_like(m); h, w = m.shape[:2]
    o[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = m[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return o


def _own(im, box, m):
    """Crop box grown by m px; keep only the regions whose centre lies inside box (not the neighbouring poses)."""
    from keying import components
    x0, y0 = max(0, box[0] - m), max(0, box[1] - m); x1, y1 = min(im.width, box[2] + m), min(im.height, box[3] + m)
    a = np.array(im.crop((x0, y0, x1, y1)))
    for p in components(a[..., 3] > 0):
        cy, cx = p.mean(0) + (y0, x0)
        if not (box[0] <= cx < box[2] and box[1] <= cy < box[3]):
            a[p[:, 0], p[:, 1]] = 0
    return a, (x0, y0)


def align(new, old, cols, rows, scales=np.arange(.9, 1.101, .01), boxes=None, margin=48):
    """new, old: RGBA sheets of the same layout (boxes: explicit cell boxes, else a cols x rows grid). Each edited pose
    (taken with a margin, so a fist the edit drew past the cell edge survives) is scaled about its feet and shifted so
    its body overlaps the original's best. Returns (aligned RGBA sheet at old's size, per-cell (scale, dy, dx, iou))."""
    new = new.convert('RGBA').resize(old.size, Image.Resampling.LANCZOS) if new.size != old.size else new.convert('RGBA')
    out = Image.new('RGBA', old.size); report = []
    for box in boxes or _boxes(old.size, cols, rows):
        oa, org = _own(old, box, margin); na, _ = _own(new, box, margin)
        ob = _body(oa[..., 3] > 127).astype(float); nc = Image.fromarray(na); best = None
        ys, xs = np.nonzero(na[..., 3] > 127); fx, fy = xs.mean(), ys.max()
        for s in scales:
            # Scale about the pose's feet, then search the shift.
            sc = nc.resize((round(nc.width * s), round(nc.height * s)), Image.Resampling.LANCZOS)
            ns = Image.new('RGBA', (nc.width * 2, nc.height * 2)); ns.alpha_composite(sc, (round(nc.width / 2 + fx - fx * s), round(nc.height / 2 + fy - fy * s)))
            ns = ns.crop((nc.width // 2, nc.height // 2, nc.width // 2 + nc.width, nc.height // 2 + nc.height))
            nm = np.array(ns)[..., 3] > 127
            dy, dx = _xcorr(ob, _body(nm).astype(float))
            mv = _shift(_body(nm), dy, dx); iou = (mv & (ob > 0)).sum() / max(1, (mv | (ob > 0)).sum())
            if best is None or iou > best[3]:
                best = (round(float(s), 3), int(dy), int(dx), round(float(iou), 3), ns)
        a = _shift(np.array(best[4]), best[1], best[2])
        cell = Image.new('RGBA', old.size); cell.alpha_composite(Image.fromarray(a), org)
        out.alpha_composite(cell.crop(box), box[:2]); report.append(best[:4])
    return out, report


def _unfringe(a):
    """Clear 1-2 px rim pixels still tinted by a magenta/green key (spill the key pass left), before edges()."""
    s = a[..., 3] > 127; r, g, b = [a[..., i].astype(int) for i in range(3)]
    p = np.pad(s, 2); inner = np.ones_like(s)
    for dy in range(5):
        for dx in range(5):
            inner &= p[dy:dy + s.shape[0], dx:dx + s.shape[1]]
    rim = s & ~inner
    key = ((r > g + 45) & (b > g + 45) & (b > 70)) | ((g > r + 60) & (g > b + 60))
    a[rim & key, 3] = 0; a[a[..., 3] == 0, :3] = 0
    return a


def _head(a, m):
    """(crown row, column slice, lowest hair row) of the head: from the shades when found, else the topmost part
    over the hips' centre line (back views)."""
    L, Ch, h = C.lch(C.lab(a[..., :3])); ys, xs = np.nonzero(m)
    sh = C.shades(a, m)
    if sh is not None:
        cols = slice(max(0, int(sh[1]) - 24), int(sh[1]) + 8)
        above = m[:int(sh[0]), cols]
        if not above.any():
            return None
        top = int(np.nonzero(above.any(1))[0].min())
        return top, cols, int(sh[0]) - 3
    jm = m & (h >= 235) & (h < 310) & (Ch >= 12)
    cx = int(np.median(np.nonzero(jm)[1])) if jm.sum() > 25 else int(np.median(xs))
    near = m[:, max(0, cx - 16):cx + 16]; top = int(np.nonzero(near.any(1))[0].min())
    tc = np.nonzero(m[top:top + 4].any(0))[0]; tc = tc[np.abs(tc - cx) <= 24]
    if not len(tc):
        return None
    return top, slice(max(0, tc.min() - 14), tc.max() + 14), top + 18


_HAIR = None


def _gold_hair():
    """Gold hair Lab samples: warm light pixels in the top 10 rows of each gold head."""
    global _HAIR
    if _HAIR is None:
        out = []
        for p in C.GOLD:
            a = np.array(Image.open(p).convert('RGBA')); m = C.figure(a); hd = _head(a, m)
            lab = C.lab(a[..., :3]); L, Ch, h = C.lch(lab); w = np.zeros(m.shape, bool)
            w[hd[0]:hd[0] + 10, hd[1]] = True; out.append(lab[w & m & (L >= 45) & (h >= 40) & (h < 120)])
        _HAIR = np.concatenate(out)
    return _HAIR


def _hair(a, locked):
    """Hair keeps its own ramp: lock() tone-matches it as skin (GPT's pale hair is skin-hued), so hair pixels are
    L-matched to gold hair and snapped to the gold palette instead."""
    m = C.figure(a)
    if m is None:
        return locked
    hd = _head(a, m)
    if hd is None:
        return locked
    top, cols, low = hd; lab = C.lab(a[..., :3]); L, Ch, h = C.lch(lab)
    w = np.zeros(m.shape, bool); w[top:max(top + 6, low), cols] = True
    hair = w & m & (L >= 40) & (h >= 64) & (h < 120) & (Ch >= 12)
    # The top 8 rows of the head are all hair (gold's hair band); the sel-out rim stays dark.
    crown = np.zeros(m.shape, bool); crown[top:top + 8, cols] = True; hair |= crown & m & (L >= 35)
    hair &= ~(C.ring(m) | C.ring(m & ~C.ring(m)))
    if hair.sum() < 12:
        return locked
    ref = _gold_hair(); x = lab[hair]
    q = (np.argsort(np.argsort(x[:, 0])) + .5) / len(x); newL = np.quantile(ref[:, 0], q)
    x = np.stack([newL, np.full(len(x), np.median(ref[:, 1])), np.full(len(x), np.median(ref[:, 2]))], -1)
    # Keep a little of each pixel's own a/b so strands still read, then snap to gold.
    x[:, 1:] = .7 * x[:, 1:] + .3 * lab[hair][:, 1:]
    pal = C.gold_palette(); d = ((x[:, None, :] - pal[None]) ** 2).sum(-1)
    out = np.array(locked); out[hair, :3] = _gold_rgb()[d.argmin(1)]
    return Image.fromarray(out)


def _toplight(im):
    """Gold's sel-out is lit from above: the top edge of the hair, shoulders and arms carries the light local colour,
    not the dark rim. Top-facing rim pixels over light skin/hair take the colour just inside them."""
    a = np.array(im); m = a[..., 3] > 127
    if not m.any():
        return im
    L, Ch, h = C.lch(C.lab(a[..., :3]))
    up = np.zeros_like(m); up[1:] = ~m[:-1]; up[0] = True
    below = np.zeros_like(m); below[:-2] = m[1:-1] & m[2:]
    src = np.zeros(a.shape, np.uint8); src[:-1] = a[1:]
    Lb = np.zeros(L.shape); Lb[:-1] = L[1:]; hb = np.zeros(h.shape); hb[:-1] = h[1:]; Cb = np.zeros(Ch.shape); Cb[:-1] = Ch[1:]
    fix = m & up & below & (Lb >= 50) & (hb >= 38) & (hb < 100) & (Cb >= 20)
    a[fix, :3] = src[fix, :3]
    return Image.fromarray(a)


def _keep_fx(a, locked):
    """Detached grey parts (a cigar smoke puff) are effects, not CHAD: they keep their own colours."""
    from keying import components
    parts = components(a[..., 3] > 127)
    if len(parts) < 2:
        return locked
    out = np.array(locked); L, Ch, h = C.lch(C.lab(a[..., :3]))
    for p in parts[1:]:
        if Ch[p[:, 0], p[:, 1]].mean() < 14:
            out[p[:, 0], p[:, 1]] = a[p[:, 0], p[:, 1]]
    return Image.fromarray(out)


def finish(path, cell, save=True):
    """Per cell: unfringe, edges(), lock(), gold hair ramp. Writes the sheet back (8-bit RGBA)."""
    im = Image.open(path).convert('RGBA'); w, h = cell; out = Image.new('RGBA', im.size)
    for y in range(0, im.height, h):
        for x in range(0, im.width, w):
            c = np.array(im.crop((x, y, x + w, y + h)))
            if not (c[..., 3] > 0).any():
                continue
            e = edges(Image.fromarray(_unfringe(c)))
            c = _keep_fx(np.array(e), _toplight(_hair(np.array(e), lock(e))))
            out.paste(c, (x, y))
    if save:
        out.save(path, optimize=True)
    return out


if __name__ == '__main__':
    if sys.argv[1] == 'import':
        cols, rows = map(int, sys.argv[4].split('x'))
        im, rep = align(Image.open(sys.argv[2]), Image.open(sys.argv[3]).convert('RGBA'), cols, rows)
        im.save(sys.argv[5]); print('\n'.join(f'cell {i}: scale {r[0]} dy {r[1]} dx {r[2]} body IoU {r[3]}' for i, r in enumerate(rep)))
    elif sys.argv[1] == 'finish':
        finish(sys.argv[2], tuple(map(int, sys.argv[3].split('x'))))
