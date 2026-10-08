"""Register authored walk proportions and planted shoes without moving faces."""
import numpy as np
from PIL import Image
from sprite_edges import alpha, edges

# Heights measured from the approved twenty-pose geometry guide, at 174px.
WALK_HEIGHTS = [174, 174, 174, 174, 180, 180, 175, 173, 172, 171,
                173, 173, 172, 177, 180, 177, 176, 172, 172, 171]


def walk_scale(image, height, index):
    return height * WALK_HEIGHTS[index-2] / 174 / image.height


def place_sole(frame, shift, height):
    """Translate the authored lower body gradually below its fixed pelvis.

    Rebuild every row once, so no old limb pixels remain behind. The boot
    keeps its width and shading; the torso, head, hands and contacts stay put.
    """
    if not shift:
        return frame
    a = np.asarray(frame)
    out = np.zeros_like(a)
    start, end = 293-height*.45, 284
    for y in range(a.shape[0]):
        u = min(1, max(0, (y-start)/(end-start)))
        offset = round(shift * u*u*(3-2*u))
        if offset >= 0:
            out[y, offset:] = a[y, :a.shape[1]-offset]
        else:
            out[y, :offset] = a[y, -offset:]
    return edges(alpha(Image.fromarray(out)))
