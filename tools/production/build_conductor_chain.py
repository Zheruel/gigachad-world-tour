"""Conductor's office alarm chain: ceiling mount, a seamless two-link chain tile and the red pull handle.

Sources (GPT Image, true alpha hardened by sprite_edges.alpha) in assets/sources/production/stages/night_train/rebuild/:
  conductor_chain.png        mount | dark iron chain strip (unused: too dark on the office wall) | handle
  conductor_chain_links.png  the bright steel chain strip redrawn in the same style, used for the link tile
Output (2x art, drawn at half size by drawChain in js/train_conductor.js):
  conductor_chain_mount.png   anchor (the chain's exit, the pulley ring's hole) at the image centre
  conductor_chain_link.png    one period (face link + edge link), centred; tiles seamlessly along its height
  conductor_chain_handle.png  anchor (the shackle eye's hole, where the chain ends) at the image centre
"""
import numpy as np
from PIL import Image
from build_train_rebuild import SOURCE, OUT
from sprite_edges import edges

MOUNT_W, LINK_W, LINK_P, HANDLE_W = 44, 8, 14, 40   # 2x pixels; the handle loop matches the one in his fist


def parts(a):
    """Column spans of the three objects on the sheet."""
    cols = (a[:, :, 3] > 0).any(0); spans = []; x = 0
    while x < len(cols):
        if cols[x]:
            x0 = x
            while x < len(cols) and cols[x]: x += 1
            spans.append((x0, x))
        x += 1
    spans = [s for s in spans if s[1] - s[0] > 20]
    assert len(spans) == 3, spans
    return spans


def holes(s):
    """Transparent pixels not reachable from the border (enclosed holes), as a mask."""
    from collections import deque
    h, w = s.shape; seen = np.zeros_like(s); q = deque()
    for y in range(h):
        for x in (0, w - 1):
            if not s[y, x]: seen[y, x] = True; q.append((y, x))
    for x in range(w):
        for y in (0, h - 1):
            if not s[y, x] and not seen[y, x]: seen[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < h and 0 <= xx < w and not s[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; q.append((yy, xx))
    return ~s & ~seen


def hole_centre(s, pick):
    """Centre of the enclosed hole chosen by pick(list of (cy, cx, n))."""
    from keying import components
    found = [(p[:, 0].mean(), p[:, 1].mean(), len(p)) for p in components(holes(s)) if len(p) > 20]
    cy, cx, _ = pick(found)
    return cx, cy


def shrink(im, k):
    """Premultiplied downscale, then binary alpha (edges() closes the outline)."""
    im = im.convert('RGBa').resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS).convert('RGBA')
    a = np.array(im); a[a[:, :, 3] < 110] = 0; a[:, :, 3][a[:, :, 3] > 0] = 255
    return Image.fromarray(a)


def centred(im, ax, ay):
    """Pad so (ax, ay) sits at the exact centre of an even-sized canvas."""
    ax, ay = round(ax), round(ay)
    hw = max(ax, im.width - ax); hh = max(ay, im.height - ay)
    out = Image.new('RGBA', (2 * hw, 2 * hh)); out.alpha_composite(im, (hw - ax, hh - ay))
    return out


def anchored(obj, k, pick):
    """Scale an object, then centre it on its chosen hole (measured at source scale)."""
    s = obj.getchannel('A').point(lambda v: 255 if v else 0)
    cx, cy = hole_centre(np.array(s) > 0, pick)
    small = edges(shrink(obj, k))
    return centred(small, cx * small.width / obj.width, cy * small.height / obj.height)


def tile(strip):
    """One period of the vertical chain, cut in the middle of an edge link so the seam hides in a thin bar."""
    s = np.array(strip.getchannel('A')) > 0
    prof = s.sum(1).astype(float); prof -= prof.mean()
    n = len(prof); ac = [np.dot(prof[:n - d], prof[d:]) / (n - d) for d in range(n // 2)]
    lo = n // 20
    period = lo + int(np.argmax(ac[lo:]))
    # Refine: the strongest peak may be a multiple of the true period (face + edge link pair).
    for m in (3, 2):
        d = round(period / m)
        if d > lo and ac[d] > .6 * ac[period]: period = d; break
    k = LINK_P / period
    # Three periods from the strip's middle, scaled together; keep the middle one.
    widths = s.sum(1); mid = n // 2
    y0 = mid - period + int(np.argmin(widths[mid - period:mid]))   # thinnest row: inside an edge link
    band = strip.crop((0, y0 - period, strip.width, y0 + 2 * period))
    small = shrink(band, k)
    small = small.resize((small.width, 3 * LINK_P), Image.Resampling.NEAREST)
    small = edges(small)
    one = small.crop((0, LINK_P, small.width, 2 * LINK_P))
    a = np.array(one); cols = np.where((a[:, :, 3] > 0).any(0))[0]
    cx = (cols[0] + cols[-1] + 1) / 2
    out = Image.new('RGBA', (LINK_W, LINK_P)); out.alpha_composite(one, (round(LINK_W / 2 - cx), 0))
    return out, period


def main():
    sheet = Image.open(SOURCE / 'conductor_chain.png').convert('RGBA')
    a = np.array(sheet); (m0, m1), (c0, c1), (h0, h1) = parts(a)
    crop = lambda x0, x1: (lambda im: im.crop(im.getbbox()))(sheet.crop((x0, 0, x1, sheet.height)))
    mount, handle = crop(m0, m1), crop(h0, h1)
    # Mount: the lowest hole is the pulley ring the chain drops through.
    anchored(mount, MOUNT_W / mount.width, lambda f: max(f, key=lambda t: t[0])).save(OUT / 'conductor_chain_mount.png')
    # Handle: the highest hole is the shackle eye; the loop's slot is below it.
    loop_w = (np.array(handle.getchannel('A')) > 0).any(0).sum()
    anchored(handle, HANDLE_W / loop_w, lambda f: min(f, key=lambda t: t[0])).save(OUT / 'conductor_chain_handle.png')
    links = Image.open(SOURCE / 'conductor_chain_links.png').convert('RGBA')
    link, period = tile(links.crop(links.getbbox()))
    link.save(OUT / 'conductor_chain_link.png')
    for n in ('mount', 'link', 'handle'):
        im = Image.open(OUT / f'conductor_chain_{n}.png'); print(n, im.size)
    print('source period', period)


if __name__ == '__main__':
    main()
