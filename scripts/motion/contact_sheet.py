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

try:  # PIL here has no raqm: shape + reorder Arabic ourselves
    import arabic_reshaper
    from bidi.algorithm import get_display

    def shaped(s):
        return get_display(arabic_reshaper.reshape(s)) if re.search(r"[\u0600-\u06FF]", s) else s
except ImportError:  # pragma: no cover
    def shaped(s):
        return s

ROOT = "out/five"
OUT = sys.argv[1] if len(sys.argv) > 1 else "out/contact-sheet.png"
ROW_H = 420
GAP = 12
LABEL_H = 64
report = json.load(open(os.path.join(ROOT, "report.json")))


def font(size):
    for f in ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/GeezaPro.ttc", "/Library/Fonts/Arial.ttf"):
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


FPS = 30


def t_of(path):
    """Stills are named still-<frame>.jpeg → seconds."""
    m = re.search(r"(\d+)", os.path.basename(path))
    return int(m.group(1)) / FPS if m else 0.0


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
    d.text((GAP, y + 4), f"{r['brand']}  ·  {r['format']}  ·  {r['length_s']}s  ·  {r['dialect']}  ·  QA r{len(r['qa_rounds'])} {r['qa_rounds'][-1]['score']}/10  ·  ${r['cost_usd']:.2f}", fill=(255, 255, 255), font=big)
    d.text((GAP, y + 36), shaped(r["motion_language"]), fill=(170, 170, 190), font=small)
    x = GAP
    for im, f in zip(ims, files):
        sheet.paste(im, (x, y + LABEL_H))
        label = f"{t_of(f):.1f}s"
        box = d.textbbox((0, 0), label, font=small)
        d.rounded_rectangle((x + 6, y + LABEL_H + 6, x + 18 + box[2], y + LABEL_H + 14 + box[3]), 6, fill=(0, 0, 0))
        d.text((x + 12, y + LABEL_H + 8), label, fill=(255, 255, 255), font=small)
        x += im.width + GAP
    y += ROW_H + LABEL_H + GAP
sheet.save(OUT)
print(OUT, sheet.size, f"{len(rows)} videos")
