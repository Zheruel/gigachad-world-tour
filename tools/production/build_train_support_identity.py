"""Register selected Night Train supporting cast art at existing runtime anchors.

Run with the project Python environment. Selected GPT Image sources live under
night_train/identity; the six clerk poses share the counter contact line.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/night_train/identity'

def clean_alpha(image):
    a = np.array(image.convert('RGBA'))
    rgb = a[:, :, :3].astype(int)
    # The selected transparent generation has isolated red extraction pixels.
    # No red cloth is present on this khaki clerk; preserve warm gold highlights.
    red = (rgb[:, :, 0] > 170) & (rgb[:, :, 1] < 65) & (rgb[:, :, 2] < 65)
    a[(a[:, :, 3] < 48) | red] = 0
    # Unpremultiplied alpha retains edge colour without a white/black matte.
    a[a[:, :, 3] == 0, :3] = 0
    return Image.fromarray(a)

def clerk():
    source = clean_alpha(Image.open(SOURCE / 'ticket_clerk.png'))
    sheet = Image.new('RGBA', (960, 112))
    # Match the game's existing 2x sprite detail, with integer registered anchors.
    # One scale preserves anatomy; all hands share the same counter baseline.
    scale = .18
    torso_anchors = [244, 730, 1295, 1805]
    counter_y = 619
    for i in range(2):
        x0, x1 = round(i * source.width / 4), round((i + 1) * source.width / 4)
        cell = source.crop((x0, 0, x1, source.height))
        cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (160, 112))
        frame.alpha_composite(cell, (80 - round((torso_anchors[i] - x0) * scale), 98 - round(counter_y * scale)))
        frame = clean_alpha(frame)
        sheet.alpha_composite(frame, (i * 160, 0))
    reactions = clean_alpha(Image.open(SOURCE / 'ticket_clerk_surrender.png'))
    # Cap and skull measurements match the standing reference at this sheet scale.
    # Crouches are not resized to the standing silhouette height.
    scale = .16
    for i, anchor in enumerate([265, 770, 1230, 1742]):
        x0, x1 = round(i * reactions.width / 4), round((i + 1) * reactions.width / 4)
        cell = reactions.crop((x0, 0, x1, reactions.height))
        cell = cell.resize((round(cell.width * scale), round(cell.height * scale)), Image.Resampling.LANCZOS)
        frame = Image.new('RGBA', (160, 112))
        frame.alpha_composite(cell, (80 - round((anchor - x0) * scale), 98 - round(620 * scale)))
        sheet.alpha_composite(clean_alpha(frame), ((i + 2) * 160, 0))
    sheet.save(ROOT / 'assets/stages/night_train/rebuild/ticket_clerk.png')
    folder = ROOT / 'tmp/review/train-identity'
    folder.mkdir(parents=True, exist_ok=True)
    review = Image.new('RGB', (sheet.width, 224), '#181820')
    review.paste(sheet, (0, 0), sheet)
    light = Image.new('RGB', sheet.size, '#ece5d6')
    light.paste(sheet, (0, 0), sheet)
    review.paste(light, (0, 112))
    review.save(folder / 'ticket-clerk-edges.png')

if __name__ == '__main__':
    clerk()
