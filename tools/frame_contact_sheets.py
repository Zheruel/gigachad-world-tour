#!/usr/bin/env python3
"""Render every shipped animation frame as labeled contact sheets for visual QA."""
import json, os
from PIL import Image, ImageDraw

ROOT = "assets/frames"
OUT = "assets/qa"
os.makedirs(OUT, exist_ok=True)
manifest = json.load(open(f"{ROOT}/manifest.json"))
rows = []
for char, states in manifest.items():
    files = [(state, i, f) for state, fs in states.items() for i, f in enumerate(fs)]
    cols, cell_w, cell_h = 6, 190, 245
    sheet = Image.new("RGB", (cols * cell_w, ((len(files)+cols-1)//cols)*cell_h), (18,15,24))
    d = ImageDraw.Draw(sheet)
    metrics = []
    for n, (state, idx, file) in enumerate(files):
        im = Image.open(f"{ROOT}/{file}").convert("RGBA")
        bbox = im.getchannel("A").getbbox()
        opaque = sum(1 for a in im.getchannel("A").getdata() if a > 16)
        if not bbox or opaque < 24: metrics.append(f"EMPTY {state}[{idx}] {file}")
        x = (n%cols)*cell_w; y=(n//cols)*cell_h
        for yy in range(y+20,y+cell_h-8,12):
            for xx in range(x,x+cell_w,12):
                d.rectangle((xx,yy,xx+11,yy+11), fill=(38,32,48) if ((xx//12+yy//12)&1) else (27,23,35))
        scale = min(1.0, (cell_w-12)/im.width, (cell_h-45)/im.height)
        rw,rh=max(1,int(im.width*scale)),max(1,int(im.height*scale))
        im=im.resize((rw,rh),Image.Resampling.NEAREST)
        sheet.paste(im,(x+(cell_w-rw)//2,y+cell_h-18-rh),im)
        d.text((x+4,y+3),f"{state}[{idx}]",fill=(255,217,74))
        if bbox: d.text((x+4,y+cell_h-14),f"{bbox[2]-bbox[0]}x{bbox[3]-bbox[1]} px={opaque}",fill=(170,160,185))
    path=f"{OUT}/{char}_frames.png"
    sheet.save(path)
    rows.append(f"{char}: {len(files)} frames -> {path}" + (" | "+", ".join(metrics) if metrics else ""))
open(f"{OUT}/frame_report.txt","w").write("\n".join(rows)+"\n")
print("\n".join(rows))
