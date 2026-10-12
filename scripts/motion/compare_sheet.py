"""Side-by-side contact sheet: one labelled row of 6 stills per video (mixed formats → fixed row height).

  .venv/bin/python scripts/motion/compare_sheet.py out.jpg "label|dir" "label|dir" ...

Each dir holds 6 stills (jpg/jpeg/png), sorted by the number in their file name.
"""
import glob
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

out, rows = sys.argv[1], sys.argv[2:]
ROW_H, GAP, LABEL_W = 400, 10, 330
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
except OSError:
    font = ImageFont.load_default()


def stills(d):
    files = [f for f in glob.glob(os.path.join(d, "*")) if re.search(r"\.(jpe?g|png)$", f) and not re.search(r"sheet|quick", os.path.basename(f))]
    num = lambda f: float((re.findall(r"[\d.]+", os.path.basename(f).replace(".jpeg", "").replace(".jpg", "").replace(".png", "")) or ["0"])[-1].strip(".") or 0)
    return sorted(files, key=num)[:6]


loaded = []
for r in rows:
    label, d = r.split("|", 1)
    ims = [Image.open(f).convert("RGB") for f in stills(d)]
    ims = [im.resize((int(im.width * ROW_H / im.height), ROW_H), Image.LANCZOS) for im in ims]
    loaded.append((label, ims))
W = LABEL_W + max(sum(im.width + GAP for im in ims) for _, ims in loaded) + GAP
H = len(loaded) * (ROW_H + GAP) + GAP
sheet = Image.new("RGB", (W, H), (236, 236, 232))
d = ImageDraw.Draw(sheet)
for i, (label, ims) in enumerate(loaded):
    y = GAP + i * (ROW_H + GAP)
    for k, line in enumerate(label.split("\\n")):
        d.text((GAP, y + 10 + k * 30), line, fill=(20, 20, 20), font=font)
    x = LABEL_W
    for im in ims:
        sheet.paste(im, (x, y))
        x += im.width + GAP
sheet.save(out, quality=88)
print(out, sheet.size)
