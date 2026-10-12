"""Phase 3F: contact sheet of library illustrations — each cell shows progress 0 / 0.5 / 1.

  .venv/bin/python scripts/motion/illustration_sheet.py out/3f/seed/report.json out/3f/seed-sheet.png
"""
import json
import sys

from PIL import Image, ImageDraw, ImageFont

report = json.load(open(sys.argv[1]))
out = sys.argv[2]
items = [s for s in report["sheet"] if s.get("stills")]
COLS, S, GAP, LABEL = 5, 150, 14, 26
cell_w = 3 * S + 2 * 4
W = COLS * cell_w + (COLS + 1) * GAP
rows = (len(items) + COLS - 1) // COLS
H = 60 + rows * (S + LABEL + GAP) + GAP
sheet = Image.new("RGB", (W, H), (245, 245, 242))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17)
    big = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 26)
except OSError:
    font = big = ImageFont.load_default()
d.text((GAP, 16), f"MotionGX illustration library — {len(items)} seeds, style \"{report['style']}\" (each: progress 0 · 0.5 · 1)", fill=(20, 20, 20), font=big)
for i, it in enumerate(items):
    r, c = divmod(i, COLS)
    x = GAP + c * (cell_w + GAP)
    y = 60 + r * (S + LABEL + GAP)
    for k, p in enumerate(it["stills"]):
        im = Image.open(p).convert("RGB").resize((S, S), Image.LANCZOS)
        sheet.paste(im, (x + k * (S + 4), y))
    d.text((x, y + S + 4), it["name"], fill=(30, 30, 30), font=font)
sheet.save(out)
print(out, sheet.size)
