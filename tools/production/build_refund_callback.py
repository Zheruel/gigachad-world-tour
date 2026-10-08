"""Register the Refund Tower "Callback" intro: yanked caller, CHAD's breach/grab/phone poses and the desk phone."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageOps
from build_delhi_cast_performances import cells, components, SOLE
from sprite_edges import alpha, edges
from chad_cutscene import finish

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/overhaul/callback'
OUT = ROOT / 'assets/stages/refund_tower/overhaul'
PROOF = ROOT / 'tmp/review/refund-overhaul/callback'
CHAD_H = 178      # standing CHAD at 2x
SEATED_H = 148    # the seated caller (ic_office_life_high) at 2x
STANDING_H = 176  # the caller upright against the wall
STUB = {(0, 2): ((208, 236), 112), (0, 3): ((228, 252), 116)}  # air/drag cells: stub rows, thin runs cut left of the face
CORD_CUT = 112  # desk-top height above CHAD's boots (2x); the runtime cord starts here


def place(im, size, anchor_x, floor=True, dy=0):
    """Paste `im` into a cell with its anchor x at the cell centre and its lowest pixel on the sole line."""
    out = Image.new('RGBA', size)
    x = round(size[0] / 2 - anchor_x)
    y = SOLE - im.height + dy if floor else (size[1] - im.height) // 2 + dy
    if x < 0 or x + im.width > size[0] or y < 0:
        raise ValueError(f'frame exceeds cell: {im.size} at {(x, y)}')
    out.alpha_composite(im, (x, y))
    return out


def scaled(im, scale):
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    return edges(alpha(im))


def jeans_x(im):
    """CHAD's hip line: median x of saturated blue denim, stable across poses and paired frames."""
    a = np.asarray(im).astype(int)
    r, g, b, k = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    m = (k > 0) & (b > r + 35) & (b > g + 10)
    ys, xs = np.where(m)
    top = np.percentile(ys, 5)
    band = ys < top + (ys.max() - top) * .3
    return float(np.median(xs[band]))


def largest(im, cut_right=None):
    """Keep the main silhouette (drops a separated flying prop/body). cut_right keeps pixels left of a column."""
    a = np.array(im)
    parts = components(a[..., 3] > 0)
    body = max(parts, key=len)
    keep = np.zeros(a.shape[:2], bool); keep[body[:, 0], body[:, 1]] = True
    y0, x0 = body.min(0) - 6; y1, x1 = body.max(0) + 6
    for p in parts:
        if p is not body and len(p) > 40 and p[:, 0].min() >= y0 and p[:, 0].max() <= y1 and p[:, 1].min() >= x0 and p[:, 1].max() <= x1:
            keep[p[:, 0], p[:, 1]] = True
    if cut_right is not None:
        keep[:, cut_right:] = False
    a[~keep] = 0
    out = Image.fromarray(a)
    return out.crop(out.getbbox()), body


def detached(im):
    """The pixels that are NOT part of the main silhouette (a thrown prop)."""
    a = np.array(im)
    parts = components(a[..., 3] > 0)
    body = max(parts, key=len)
    a[body[:, 0], body[:, 1]] = 0
    for p in parts:
        if p is not body and abs(p[:, 1].mean() - body[:, 1].mean()) < 60: a[p[:, 0], p[:, 1]] = 0
    out = Image.fromarray(a)
    return out.crop(out.getbbox())


def split(path, count):
    """Strip -> poses: the `count` largest silhouettes ordered left to right; small parts join the nearest one."""
    im = alpha(Image.open(path).convert('RGBA')); a = np.array(im)
    parts = sorted(components(a[..., 3] > 0), key=len, reverse=True)
    big = sorted(parts[:count], key=lambda p: p[:, 1].mean())
    boxes = [(p[:, 1].min(), p[:, 1].max()) for p in big]
    groups = [[p] for p in big]
    for p in parts[count:]:
        if len(p) < 30 or len(p) > .4 * len(big[-1]) and len(p) > .4 * min(map(len, big)): continue  # specks, or an unselected figure
        x = p[:, 1].mean()
        d = [0 if x0 <= x <= x1 else min(abs(x - x0), abs(x - x1)) for x0, x1 in boxes]
        if min(d) < 140: groups[int(np.argmin(d))].append(p)
    out = {}
    for i, g in enumerate(groups):
        b = np.zeros_like(a)
        for p in g: b[p[:, 0], p[:, 1]] = a[p[:, 0], p[:, 1]]
        c = Image.fromarray(b); out[i] = c.crop(c.getbbox())
    return out


def cut_cord(im, keep_above):
    """Drop the generated handset cord below `keep_above` (cell y): thin, detached runs right of the hips.
    The runtime draws its own cord from there to the desk phone. Returns the cut end (x, y) or None."""
    a = np.array(im); k = a[..., 3] > 0; hip = jeans_x(im); end = None
    for y in range(keep_above, a.shape[0]):
        row = k[y]; x = 0
        while x < a.shape[1]:
            if not row[x]: x += 1; continue
            x1 = x
            while x1 < a.shape[1] and row[x1]: x1 += 1
            if x > hip + 6 and x1 - x <= 9 and not row[x - 1]:
                if y == keep_above: end = ((x + x1) / 2, y)
                a[y, x:x1] = 0
            x = x1
    return Image.fromarray(a), end


def board(atlas, name):
    b = Image.new('RGB', atlas.size, '#17171b'); b.paste(atlas, mask=atlas.getchannel('A')); b.save(PROOF / f'{name}-registered.png')


def victim():
    size = (360, 300)
    yank = split(SOURCE / 'victim_yank.png', 4)
    wall = split(SOURCE / 'victim_wall.png', 4)
    thrown = split(SOURCE / 'victim_thrown.png', 4)
    s_yank = SEATED_H / yank[0].height
    s_wall = STANDING_H / wall[0].height
    # The sprawl and the on-back pose share the caller's lying length.
    s_thrown = s_wall * wall[2].width / thrown[3].width * .97
    atlas = Image.new('RGBA', (4 * size[0], 3 * size[1])); meta = []
    for row, (poses, scale) in enumerate([(yank, s_yank), (wall, s_wall), (thrown, s_thrown)]):
        for i, im in poses.items():
            if row == 1 and i == 1:
                im, _ = largest(im)          # the headset flies off as its own prop
            f = scaled(im, scale)
            # Seated / wall / kneeling poses anchor on the body column; lying and flying poses on the bbox centre.
            a = np.asarray(f)[..., 3] > 0; ys, xs = np.where(a)
            band = (ys > f.height * .4) & (ys < f.height * .62)
            ax = float(np.median(xs[band])) if (row, i) in [(0, 0), (0, 1), (1, 0)] else f.width / 2
            cell = place(f, size, ax)
            if (row, i) in STUB:
                # The generated cord sticks out of the face like a spike; the runtime cable leaves the ear cup instead.
                (y0, y1), x1 = STUB[row, i]; c = np.array(cell); k = c[..., 3] > 0
                for x in range(x1):
                    y = y0
                    while y < y1:
                        if not k[y, x]: y += 1; continue
                        e = y
                        while e < y1 and k[e, x]: e += 1
                        if e - y <= 10: c[y:e, x] = 0
                        y = e
                cell = Image.fromarray(c)
            atlas.alpha_composite(cell, (i * size[0], row * size[1]))
            meta.append({'frame': row * 4 + i, 'size': f.size})
    atlas.save(OUT / 'callback-victim.png', optimize=True)
    board(atlas, 'callback-victim')
    hs = scaled(detached(wall[1]), s_wall)
    return meta, hs


def chad():
    size = (560, 300)
    breach = split(SOURCE / 'chad_breach_headset.png', 4)
    grab = split(SOURCE / 'chad_grab_throw-v4.png', 4)
    phone = split(SOURCE / 'chad_phone_crush-v2.png', 4)
    toss_headset = detached(breach[2])
    breach[2], _ = largest(breach[2])
    # Release frame: CHAD only (the flying caller is the strip's fifth silhouette and is not selected).
    atlas = Image.new('RGBA', (4 * size[0], 3 * size[1]))
    scales = {}; cords = {}
    for row, (poses, ref) in enumerate([(breach, 3), (grab, 1), (phone, 1)]):
        if row == 1:
            # Measure CHAD alone in the paired lift frame: his boots to his flat-top.
            a = np.asarray(poses[1]); blue = (a[..., 2].astype(int) > a[..., 0].astype(int) + 35) & (a[..., 3] > 0)
            xs = np.where(blue)[1]; x0, x1 = xs.min(), xs.max()
            col = a[:, x0:x1 + 1, 3] > 0
            h = a.shape[0] - np.where(col.any(1))[0].min()
            scale = CHAD_H / h
        elif row == 2:
            a = np.asarray(poses[ref])[..., 3] > 0; w = a.sum(1)
            scale = CHAD_H / (np.where(w > 60)[0].max() + 1 - np.where(a.any(1))[0].min())
        else:
            scale = CHAD_H / poses[ref].height
        scales[row] = scale
        for i, im in poses.items():
            f = scaled(im, scale)
            if row == 2 and i in (1, 2):
                # The generated cord hangs below the boots; register on the boots after cutting it.
                wide = np.where((np.asarray(f)[..., 3] > 0).sum(1) > 30)[0].max()
                f, end = cut_cord(f, int(wide) - CORD_CUT)
                f = f.crop(f.getbbox())
                ax = jeans_x(f)
                cords[i] = end and (round((end[0] - ax) / 2, 1), round((end[1] - wide) / 2, 1))
            f = place(f, size, jeans_x(f))
            atlas.alpha_composite(f, (i * size[0], row * size[1]))
    path = OUT / 'callback-chad.png'
    atlas.save(path, optimize=True)
    finish(path, size)
    keep_caller(path, atlas, size)
    board(Image.open(path).convert('RGBA'), 'callback-chad')
    return scales, cords, scaled(toss_headset, scales[0])


CALLER_X = {0: (318, 560), 1: (318, 560), 2: (130, 252)}  # cell-local caller columns in the paired grab row


def keep_caller(path, pre, size):
    """finish() locks every pixel to CHAD's palette, bleaching the caller's mustard shirt and skin. Restore the
    pre-finish colours over the caller's columns (denim excluded); CHAD's hand there barely changes."""
    from PIL import ImageFilter
    post = Image.open(path).convert('RGBA'); w, h = size
    a = np.asarray(pre).astype(int); m = np.zeros(a.shape[:2], np.uint8)
    for i, (x0, x1) in CALLER_X.items():
        m[h:2 * h, i * w + x0:i * w + x1] = 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m[(b > r + 35) & (b > g + 10)] = 0
    m = np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(1.5))) / 255.
    out = np.asarray(post).astype(float)
    out[..., :3] = out[..., :3] * (1 - m[..., None]) + np.asarray(pre)[..., :3] * m[..., None]
    Image.fromarray(out.round().astype('uint8')).save(path, optimize=True)


def props(headset):
    """Desk phone (rest, ring a, ring b, empty cradle) and the loose headset, 2x."""
    size = (160, 120)
    phones = split(SOURCE / 'desk_phone.png', 4)
    rest = phones[0]
    rw = (np.asarray(rest)[..., 3] > 0).sum(1)
    # Covers the painted desk-two phone (~17 logical px); slightly larger so it reads. The cord is code.
    scale = 42 / rest.width
    atlas = Image.new('RGBA', (5 * size[0], size[1]))
    for i, im in phones.items():
        # Cut the generated cord off at the bottom of the phone body (the widest rows).
        w = (np.asarray(im)[..., 3] > 0).sum(1); bottom = int(np.where(w > w.max() * .45)[0].max()) + 1
        f = im.crop((0, 0, im.width, bottom))
        f = scaled(f, scale)
        cell = Image.new('RGBA', size)
        # Shared base line: the bottom of the phone body sits at y=100, its right edge at x=101.
        cell.alpha_composite(f, (size[0] // 2 + 21 - f.width, 100 - f.height))  # keypad edge fixed; the handset hops
        atlas.alpha_composite(cell, (i * size[0], 0))
    h = headset
    if h.width > size[0] or h.height > size[1]:
        h = scaled(h, min(size[0] / h.width, size[1] / h.height) * .9)
    atlas.alpha_composite(h, (4 * size[0] + (size[0] - h.width) // 2, (size[1] - h.height) // 2))
    atlas.save(OUT / 'callback-props.png', optimize=True)
    board(atlas, 'callback-props')


def desk():
    """The caller's desk after he lands on it: same patch footprint as entrance-desk-after, feathered edges."""
    im = ImageOps.fit(Image.open(SOURCE / 'desk_wrecked.png').convert('RGBA'), (245, 160), Image.Resampling.LANCZOS)
    x = np.arange(245); y = np.arange(160)
    ax = np.minimum(np.minimum(x / 5, (244 - x) / 5), 1).clip(0, 1)
    ay = np.minimum(np.minimum(y / 5, (159 - y) / 5), 1).clip(0, 1)
    im.putalpha(Image.fromarray((ay[:, None] * ax[None, :] * 255).astype('uint8')))
    im.save(OUT / 'callback-desk.png', optimize=True)


CORD_CELL = 16                                 # atlas column width (2x)
CORD_TILES = {'slack': (9, 4), 'taut': (10, 11)}  # 2x (width, coil period) of each seamless tile


def cord():
    """Coiled handset cord: relaxed and stretched seamless one-coil tiles plus the torn end, one 2x atlas.
    Columns of CORD_CELL: slack tile (period rows), taut tile, torn end (top-centre anchored)."""
    from build_conductor_chain import shrink
    sheet = alpha(Image.open(SOURCE / 'phone_cord.png').convert('RGBA')); a = np.array(sheet)
    cols = (a[..., 3] > 0).any(0); spans = []; x = 0
    while x < len(cols):
        if cols[x]:
            x0 = x
            while x < len(cols) and cols[x]: x += 1
            if x - x0 > 20: spans.append((x0, x))
        x += 1
    assert len(spans) == 3, spans
    parts = [(lambda im: im.crop(im.getbbox()))(sheet.crop((x0, 0, x1, sheet.height))) for x0, x1 in spans]
    tiles = []
    for strip, (w, p) in zip(parts[:2], CORD_TILES.values()):
        g = np.asarray(strip).astype(float); g = g[..., :3].mean(-1) * g[..., 3] / 255
        n = g.shape[0]; mid = g[n // 4:3 * n // 4]
        diff = [np.mean((mid - g[n // 4 + d:3 * n // 4 + d]) ** 2) for d in range(8, n // 4)]
        # The first dip close to the best match is one coil (later dips are multiples of it).
        best = min(diff); period = 8 + next(i for i, v in enumerate(diff) if v <= best * 1.6 and (i == 0 or v <= diff[i - 1]) and (i + 1 == len(diff) or v <= diff[i + 1]))
        y0 = n // 2 - period // 2
        band = strip.crop((0, y0 - period, strip.width, y0 + 2 * period))
        band = shrink(band, w / strip.width).resize((w, 3 * p), Image.Resampling.LANCZOS)
        band = edges(alpha(band))
        tiles.append((band.crop((0, p, w, 2 * p)), period))
    end = parts[2]; k = CORD_TILES['slack'][0] / (np.asarray(end)[: end.height // 3, :, 3] > 0).sum(1).max()
    end = edges(shrink(end, k))
    h = max(end.height, max(t.height for t, _ in tiles))
    atlas = Image.new('RGBA', (3 * CORD_CELL, h))
    for i, (t, _) in enumerate(tiles): atlas.alpha_composite(t, (i * CORD_CELL + (CORD_CELL - t.width) // 2, 0))
    atlas.alpha_composite(end, (2 * CORD_CELL + (CORD_CELL - end.width) // 2, 0))
    atlas.save(OUT / 'callback-cord.png', optimize=True)
    board(atlas.resize((atlas.width * 8, atlas.height * 8), Image.Resampling.NEAREST), 'callback-cord')
    return {'source_periods': [pr for _, pr in tiles], 'end': end.size, 'atlas': atlas.size}


if __name__ == '__main__':
    PROOF.mkdir(parents=True, exist_ok=True)
    vm, flying_headset = victim()
    scales, cords, toss = chad()
    props(toss)
    desk()
    print('cord', cord())
    (PROOF / 'registration.json').write_text(json.dumps({'victim': vm, 'chad_scales': scales, 'cord_ends_logical_from_hips_and_soles': cords}, indent=1, default=str) + '\n')
    print('ok', scales, cords)
