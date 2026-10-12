"""Phase 3B contact sheet: one row per video, 6 stills each (mixed formats → fixed row height).

  .venv/bin/python scripts/motion/contact_sheet.py [out/contact-sheet.png]

Reads out/five/report.json and out/five/<slug>/sheet/*.{png,jpeg,jpg}.
"""
import glob
import json
import os
import re
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = "out/five"
OUT = sys.argv[1] if len(sys.argv) > 1 else "out/contact-sheet.png"
ROW_H = 420
GAP = 12
LABEL_H = 64
report = json.load(open(os.path.join(ROOT, "report.json")))


def font(size):
    for f in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def t_of(path):
    m = re.search(r"(\d+(?:\.\d+)?)", os.path.basename(path))
    return float(m.group(1)) if m else 0.0


rows = []
for slug, r in report.items():
    if r.get("status") != "passed":
        continue
    files = sorted(
        [f for f in glob.glob(os.path.join(ROOT, slug, "sheet", "*")) if f.lower().endswith((".png", ".jpg", ".jpeg"))],
        key=t_of,
    )[:6]
    if not files:
        continue
    ims = []
    for f in files:
        im = Image.open(f).convert("RGB")
        ims.append(im.resize((round(im.width * ROW_H / im.height), ROW_H), Image.LANCZOS))
    rows.append((slug, r, ims, files))

width = max(sum(i.width for i in ims) + GAP * (len(ims) + 1) for _, _, ims, _ in rows)
height = sum(ROW_H + LABEL_H + GAP for _ in rows) + GAP
sheet = Image.new("RGB", (width, height), (18, 18, 24))
d = ImageDraw.Draw(sheet)
big, small = font(26), font(18)
y = GAP
for slug, r, ims, files in rows:
    d.text((GAP, y + 4), f"{r['brand']}  ·  {r['format']}  ·  {r['length_s']}s  ·  {r['dialect']}  ·  “{r['motion_language']}”", fill=(255, 255, 255), font=big)
    d.text((GAP, y + 36), (r["concept"][:170] + ("…" if len(r["concept"]) > 170 else "")), fill=(170, 170, 190), font=small)
    x = GAP
    for im, f in zip(ims, files):
        sheet.paste(im, (x, y + LABEL_H))
        d.text((x + 6, y + LABEL_H + 6), f"{t_of(f):.2f}s", fill=(255, 255, 255), font=small)
        x += im.width + GAP
    y += ROW_H + LABEL_H + GAP
sheet.save(OUT)
print(OUT, sheet.size, f"{len(rows)} videos")
