#!/usr/bin/env python3
"""Normalize generated lobby layers and register staff poses at the torso/feet."""
from pathlib import Path
from PIL import Image, ImageDraw
from process_char import clean_walk_fragments as keep_body, key_green

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/travel/lobby'
OUT = ROOT / 'assets/travel/lobby'

def palette(image):
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    result = image.convert('RGB').quantize(colors=128, dither=Image.Dither.NONE).convert('RGBA')
    result.putalpha(alpha)
    return result

def sheet(name, cuts, height, cell, anchor):
    source = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    if name in ('bartender_shake', 'porter_wait'): source = key_green(source)
    frames = [source.crop((a, 0, b, source.height)) for a, b in zip(cuts, cuts[1:])]
    boxes = [f.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox() for f in frames]
    ratio = height / max(box[3] - box[1] for box in boxes)
    atlas = Image.new('RGBA', (cell[0] * len(frames), cell[1]))
    for i, (frame, box) in enumerate(zip(frames, boxes)):
        # Anchor the feet/hips, never the silhouette center (an extended arm shifts it).
        lower = frame.getchannel('A').crop((0, round(box[3] * (.50 if name.startswith('porter') else .88)), frame.width, round(box[3] * .62) if name.startswith('porter') else box[3])).getbbox()
        center = (lower[0] + lower[2]) / 2
        sprite = frame.crop(box).resize((round((box[2]-box[0])*ratio), round((box[3]-box[1])*ratio)), Image.Resampling.LANCZOS)
        # Remove isolated slivers from neighboring generated poses after downsampling.
        sprite = keep_body(palette(sprite))
        x = round(anchor - (center - box[0]) * ratio)
        assert x >= 0 and x + sprite.width <= cell[0], (name, i, x, sprite.width)
        atlas.alpha_composite(sprite, (i * cell[0] + x, cell[1] - sprite.height))
    palette(atlas).save(OUT / f'{name}.png', optimize=True)

def walk_sheet(name, xs, ys):
    source = key_green(Image.open(SOURCE / f'{name}.png'))
    frames = [source.crop((x0,y0,x1,y1)) for y0,y1 in zip(ys,ys[1:]) for x0,x1 in zip(xs,xs[1:])]
    # Reverse the front-to-profile turn at the destination rather than showing a back turn.
    frames[10] = frames[1].copy()
    boxes = [frame.getchannel('A').getbbox() for frame in frames]
    ratio = 212 / max(b[3]-b[1] for b in boxes)
    atlas = Image.new('RGBA', (160*12,220))
    for i,(frame,b) in enumerate(zip(frames,boxes)):
        waist = frame.getchannel('A').crop((0,b[1]+round((b[3]-b[1])*.43),frame.width,b[1]+round((b[3]-b[1])*.53))).getbbox()
        center = (waist[0]+waist[2])/2
        sprite = frame.crop(b).resize((round((b[2]-b[0])*ratio),round((b[3]-b[1])*ratio)),Image.Resampling.LANCZOS)
        sprite = keep_body(palette(sprite))
        atlas.alpha_composite(sprite,(i*160+round(80-(center-b[0])*ratio),220-sprite.height))
    palette(atlas).save(OUT / f'{name}.png',optimize=True)

def grid_sheet(name, columns, rows, height, cell, row_cuts=None):
    source=key_green(Image.open(SOURCE/f'{name}.png'))
    ys=row_cuts or [round(row*source.height/rows) for row in range(rows+1)]
    frames=[source.crop((round(col*source.width/columns),ys[row],round((col+1)*source.width/columns),ys[row+1])) for row in range(rows) for col in range(columns)]
    frames=[keep_body(frame) for frame in frames]
    boxes=[frame.getchannel('A').getbbox() for frame in frames]
    ratio=height/max(b[3]-b[1] for b in boxes)
    atlas=Image.new('RGBA',(cell[0]*len(frames),cell[1]))
    for i,(frame,b) in enumerate(zip(frames,boxes)):
        if name.startswith('porter'):
            assert b[1]>0 and b[3]<frame.height, (name,i,'pose touches crop boundary',b)
        if name=='porter_service':
            # The source's standing row was authored larger than the walking rows.
            group=boxes[:6] if i<6 else boxes[6:]
            ratio=height/max(box[3]-box[1] for box in group)
        band=frame.getchannel('A').crop((0,b[1]+round((b[3]-b[1])*.45),frame.width,b[1]+round((b[3]-b[1])*.60))).getbbox()
        if name=='porter_idle':
            band=frame.getchannel('A').crop((0,b[1]+round((b[3]-b[1])*.92),frame.width,b[3])).getbbox()
        center=(band[0]+band[2])/2
        sprite=frame.crop(b).resize((round((b[2]-b[0])*ratio),round((b[3]-b[1])*ratio)),Image.Resampling.LANCZOS)
        sprite=keep_body(palette(sprite))
        x=round(cell[0]/2-(center-b[0])*ratio)
        assert x>=0 and x+sprite.width<=cell[0] and sprite.height<cell[1], (name,i,'sprite exceeds cell')
        atlas.alpha_composite(sprite,(i*cell[0]+x,cell[1]-sprite.height))
    palette(atlas).save(OUT/f'{name}.png',optimize=True)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE / 'lobby.png').convert('RGB').resize((1920, 632), Image.Resampling.LANCZOS).crop((0, 44, 1920, 584))
    # Preserve the registered animated elevator and street windows from the original plate.
    original = Image.open(SOURCE / 'architecture_reference.png').convert('RGB').resize((1920, 540), Image.Resampling.LANCZOS)
    image.paste(original.crop((0, 0, 348, 540)), (0, 0))
    entrance = Image.open(SOURCE / 'quiet_entrance.png').convert('RGB').resize((1920, 540), Image.Resampling.LANCZOS)
    image.paste(entrance.crop((1400, 0, 1920, 540)), (1400, 0))
    image.quantize(colors=192, dither=Image.Dither.NONE).save(OUT / 'lobby.png', optimize=True)
    for name, width in [('reception_desk', 460), ('bar_front', 440)]:
        prop = Image.open(SOURCE / f'{name}.png').convert('RGBA')
        prop = prop.crop(prop.getchannel('A').point(lambda a: 255 if a >= 128 else 0).getbbox())
        prop = prop.resize((width, round(prop.height * width / prop.width)), Image.Resampling.LANCZOS)
        palette(prop).save(OUT / f'{name}.png', optimize=True)
    sheet('bartender_service', [0, 370, 724, 1036, 1357, 1725, 2073], 144, (160, 152), 80)
    sheet('bartender_shake', [0, 355, 731, 1109, 1497, 1837, 2172], 144, (160, 152), 80)
    walk_sheet('bartender_walk',[0,423,754,1070,1536],[0,342,674,1024])
    grid_sheet('concierge_seated',4,3,124,(160,160))
    grid_sheet('porter_service',3,3,172,(120,180),[0,397,794,1254])
    grid_sheet('porter_idle',4,3,172,(120,180))
    opening = Image.open(SOURCE / 'entrance_open.png').convert('RGB').resize((500,310),Image.Resampling.LANCZOS)
    opening.crop((140,48,368,280)).save(OUT / 'entrance_open.png',optimize=True)
    leaves = image.crop((1540,138,1768,370)).convert('RGBA')
    alpha = Image.new('L',leaves.size); d = ImageDraw.Draw(alpha)
    for x in [0,114]:
        d.rectangle((x,0,x+113,9),fill=255);d.rectangle((x,218,x+113,231),fill=255)
        d.rectangle((x,0,x+7,231),fill=255);d.rectangle((x+106,0,x+113,231),fill=255)
        d.rectangle((x,128,x+113,137),fill=255)
    d.rectangle((96,96,130,164),fill=255)
    leaves.putalpha(alpha); leaves.save(OUT / 'entrance_leaves.png',optimize=True)
    dialogue=Image.open(ROOT/'assets/sources/ui/dialogue_frame.png').convert('RGBA')
    dialogue=dialogue.crop(dialogue.getchannel('A').point(lambda a:255 if a>=128 else 0).getbbox())
    dialogue=dialogue.resize((600,round(dialogue.height*600/dialogue.width)),Image.Resampling.LANCZOS)
    palette(dialogue).save(ROOT/'assets/ui/dialogue_frame.png',optimize=True)
    plant = SOURCE / 'palm.png'
    if plant.exists():
        image = Image.open(plant).convert('RGBA'); image = image.crop(image.getchannel('A').getbbox())
        image = image.resize((round(image.width * 240 / image.height), 240), Image.Resampling.LANCZOS)
        palette(image).save(OUT / 'palm.png', optimize=True)

if __name__ == '__main__': main()
