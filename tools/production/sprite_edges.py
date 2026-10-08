"""Shared silhouette edge pass for keyed or true-alpha GPT sprites, run after keying, scaling and registration.

edges(im): works in place on the registered canvas (never moves, grows or re-thresholds the silhouette):
  1. binary alpha; drop isolated pixels and one-pixel spurs hanging off the silhouette (two-pixel ones too
     when they are light or key-tinted; longer strands such as hair, tails and cues stay); fill 1-3 px
     air pockets enclosed by the figure;
  2. decontaminate the 2 px band touching transparency: pixels whose hue is pushed toward green/teal
     (despill overshoot), blue/purple or magenta against the nearest interior, or a pale grey where the
     interior is coloured (the old degrade() greys), are rebuilt from the interior colour at their own
     brightness;
  3. close a CHAD-style outline: on parts at least 5 px thick, an outer-ring pixel that is contaminated
     or much lighter than the local outline becomes a darkened, slightly more saturated interior colour.
     Existing dark outline pixels, thin details and everything deeper than 2 px keep their colour.
alpha(im): true-alpha generations (no key colour) in place of key(): threshold alpha near 128, drop specks,
repaint the soft rim from opaque neighbours. Builders then scale/register and call edges() as usual.
harden(im): alpha() then edges(), for a sprite already at gameplay scale.
"""
import numpy as np
from PIL import Image

LUM = np.array([.3, .59, .11])
# Per-set tone pass toward CHAD's shading density (paler, flatter GPT families only): luminance gamma, highlights
# above `knee` compressed by `comp`, saturation scaled around the pixel mean, hue kept. `white` shields pale
# neutrals (caps, vests, cups, sacks) from greying: 1 = untouched.
TONE = {
    'scam_king': dict(gamma=1.08, knee=.65, comp=.94, sat=1.02, white=.65),
    'nr_brawler': dict(gamma=1.3, knee=.6, comp=.8, sat=1.12, white=.5),
    'nr_chai': dict(gamma=1.3, knee=.6, comp=.8, sat=1.12, white=.6),
    'nr_paan': dict(gamma=1.3, knee=.6, comp=.8, sat=1.12, white=.5),
    'nr_rack': dict(gamma=1.3, knee=.6, comp=.8, sat=1.12, white=.5),
    'nr_neta': dict(gamma=1.15, knee=.6, comp=.85, sat=1.06, white=.35),
}


def tone(a, gamma=1., knee=.6, comp=1., sat=1., white=0.):
    """Deepen midtones and shadows on an RGBA array (RGB only), keeping hue."""
    rgb = a[:, :, :3].astype(float) / 255; lum = np.maximum(rgb @ LUM, 1e-4)
    t = lum ** gamma; t = np.where(t > knee, knee + (t - knee) * comp, t)
    out = rgb * (t / lum)[..., None]
    m = out.mean(2, keepdims=True); out = m + (out - m) * sat
    if white:
        mx, mn = rgb.max(2), rgb.min(2); pale = np.clip((lum - .7) / .2, 0, 1) * np.clip(1 - (mx - mn) / .25, 0, 1)
        out += (rgb - out) * (pale * white)[..., None]
    a = a.copy(); a[:, :, :3] = (out.clip(0, 1) * 255).round().astype(np.uint8)
    return a


def _shift(m, dy, dx):
    """m moved by (dy, dx) with zero fill (no wrap)."""
    h, w = m.shape[:2]; o = np.zeros_like(m)
    o[max(dy, 0):h + min(dy, 0), max(dx, 0):w + min(dx, 0)] = m[max(-dy, 0):h + min(-dy, 0), max(-dx, 0):w + min(-dx, 0)]
    return o


def _box(v, r):
    """Sum of v over a (2r+1)^2 window (zero outside), via an integral image."""
    p = np.pad(v, ((r + 1, r), (r + 1, r)) + ((0, 0),) * (v.ndim - 2)).cumsum(0).cumsum(1)
    n = 2 * r + 1
    return p[n:, n:] - p[:-n, n:] - p[n:, :-n] + p[:-n, :-n]


def _n8(s):
    return sum(_shift(s, dy, dx).astype(int) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx)


def _depth(s, n=4):
    """4-connected distance to transparency, capped at n (1 = outer ring)."""
    d = np.zeros(s.shape, int); cur = s.copy()
    for k in range(1, n + 1):
        d[cur] = k; cur = cur & _shift(cur, 1, 0) & _shift(cur, -1, 0) & _shift(cur, 0, 1) & _shift(cur, 0, -1)
    return d


def _axes(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    return dict(lum=rgb @ LUM, green=g - (r + b) / 2, blue=b - (r + g) / 2, magenta=np.minimum(r, b) - g,
                sat=(mx - mn) / np.maximum(mx, 1))


def _tinted(p, q):
    """Pixels p whose hue is pushed toward the key/despill colours relative to reference q, or pale grey on colour."""
    return (((p['green'] - q['green'] > 10) & (p['green'] > 3))
            | ((p['blue'] - q['blue'] > 12) & (p['blue'] > 5))
            | ((p['magenta'] - q['magenta'] > 10) & (p['magenta'] > 4))
            | ((p['lum'] > q['lum'] + 30) & (p['sat'] < q['sat'] * .5) & (q['sat'] > .25)))


def _mean(rgb, ok, r):
    n = _box(ok.astype(float), r)
    return _box(rgb * ok[..., None], r) / np.maximum(n, 1)[..., None], n > 0


def _spurs(s, rgb):
    """Single pixels hanging off the silhouette by one neighbour; two-pixel stubs too when light or key-tinted."""
    n = _n8(s); drop = np.zeros_like(s)
    for y, x in zip(*np.where(s & (n <= 1))):
        path, cur = [(y, x)], (y, x)
        while len(path) <= 3:
            nb = [(cur[0] + dy, cur[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx)
                  and 0 <= cur[0] + dy < s.shape[0] and 0 <= cur[1] + dx < s.shape[1] and s[cur[0] + dy, cur[1] + dx]
                  and (cur[0] + dy, cur[1] + dx) not in path]
            if len(nb) != 1 or n[nb[0]] >= 3:
                break
            cur = nb[0]; path.append(cur)
        if n[path[-1]] == 0 or len(path) == 1:
            ys, xs = zip(*path)
        elif len(path) == 2:
            c = rgb[[p[0] for p in path], [p[1] for p in path]]; ax = _axes(c)
            if not ((ax['lum'] > 60) | (ax['magenta'] > 4) | (ax['blue'] > 12) | (ax['green'] > 12)).any():
                continue
            ys, xs = zip(*path)
        else:
            continue
        drop[list(ys), list(xs)] = True
    return drop


def _pinholes(s, rgb):
    """Enclosed air pockets of 1-3 px (key specks punched through the figure): filled from their neighbours."""
    from keying import components
    air = ~s; n4 = sum(_shift(s, dy, dx).astype(int) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)))
    cand = air & (n4 >= 2); cand[[0, -1]] = False; cand[:, [0, -1]] = False
    for part in components(cand):
        if len(part) > 3:
            continue
        m = np.zeros_like(s); m[part[:, 0], part[:, 1]] = True
        ring = (_shift(m, 1, 0) | _shift(m, -1, 0) | _shift(m, 0, 1) | _shift(m, 0, -1)) & ~m
        if (ring & air).any():
            continue
        near = (_box(m.astype(float), 1) > 0) & s
        rgb[m] = rgb[near].mean(0); s[m] = True
    return s


def edges(im, threshold=1, band=2, look=None):
    """look: a TONE key (runtime set name); its tone pass runs first, so the outline follows the new interior."""
    a = np.array(im.convert('RGBA')); s = a[:, :, 3] >= threshold
    if look in TONE:
        a = tone(a, **TONE[look])
    rgb = a[:, :, :3].astype(float)
    s &= _n8(s) > 0
    s &= ~_spurs(s, rgb)
    s = _pinholes(s, rgb)
    d = _depth(s); ax = _axes(rgb)
    # Reference: nearest clean interior (>= 3 px in); thin parts fall back to clean pixels 2 px in, then any clean pixel.
    def reference(ok):
        ref, has = _mean(rgb, ok & (d >= 3), 3)
        for m, r in ((ok & (d >= 2), 2), (ok, 2)):
            alt, got = _mean(rgb, m, r); ref[~has] = alt[~has]; has |= got
        return ref, has
    clean = s & ~(((ax['magenta'] > 12) | (ax['blue'] > 30)) & (d <= band))
    ref, has = reference(clean)
    bad = s & (d <= band) & has & _tinted(ax, _axes(ref))
    # Second look with the tinted pixels out of the reference, so a thin part is judged against clean colour only.
    ref, has = reference(clean & ~bad)
    bad = s & (d <= band) & has & _tinted(ax, _axes(ref))
    rl = np.maximum(ref @ LUM, 1)
    out = rgb.copy()
    # Decontaminate: interior colour at the pixel's own brightness.
    k = np.clip(ax['lum'] / rl, .5, 1.2)[..., None]
    out[bad] = (ref * k)[bad]
    # Outline: darkened, slightly saturated interior colour on parts >= 5 px thick.
    thick = _box((d >= 3).astype(float), 2) > 0
    tl = np.clip(rl * .22, 8, 28)
    dark = ref * (tl / rl)[..., None]; dark = tl[..., None] + (dark - tl[..., None]) * 1.3
    ring = s & (d == 1) & thick & has & (bad | (ax['lum'] > tl + 18))
    out[ring] = dark[ring]
    a[:, :, :3] = out.clip(0, 255).round().astype(np.uint8)
    a[:, :, 3] = s * 255; a[~s, :3] = 0
    return Image.fromarray(a)


def alpha(im, threshold=128, speck=30):
    """True-alpha generations, before scaling (in place of key()): binary alpha at `threshold`, 4-connected
    specks under `speck` px dropped, and the soft-alpha rim (the generator's matte blend) repainted from the
    nearest fully opaque pixels."""
    from keying import components
    a = np.array(im.convert('RGBA')); soft = a[:, :, 3]; s = soft >= threshold
    for part in components(s):
        if len(part) < speck:
            s[part[:, 0], part[:, 1]] = False
    # Only the 2 px band touching transparency is matte blend: a thin opaque part drawn at alpha ~245 (a steel
    # baton) keeps its own colour, and the rim is repainted from the pixels inside it.
    rgb = a[:, :, :3].astype(float); rim = s & (soft < 250) & (_depth(s, 3) <= 2)
    for r in (2, 4):
        ref, has = _mean(rgb, s & ~rim, r); fix = rim & has
        rgb[fix] = ref[fix]; rim &= ~fix
    a[:, :, :3] = rgb.round().astype(np.uint8); a[:, :, 3] = s * 255; a[~s, :3] = 0
    return Image.fromarray(a)


def harden(im, threshold=128, speck=30):
    """alpha() then edges(): for a true-alpha sprite already at gameplay scale."""
    return edges(alpha(im, threshold, speck))


if __name__ == '__main__':
    import sys
    modes = {'--alpha': alpha, '--harden': harden}
    if len(sys.argv) < 3 or (sys.argv[1] in modes and len(sys.argv) < 4):
        sys.exit('usage: sprite_edges.py [--alpha|--harden] IN.png OUT.png  (default: edges only)')
    fn = modes.get(sys.argv[1], edges); src, dst = sys.argv[-2:]
    fn(Image.open(src)).save(dst)
