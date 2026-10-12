"""Tiles QA stills into one image: python contact-sheet.py out.jpeg in1 in2 ..."""
import sys
from PIL import Image, ImageDraw
out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f) for f in files]
w, h = ims[0].size
cols = min(5, len(ims)); rows = (len(ims) + cols - 1) // cols
scale = 0.6
tw, th = int(w * scale), int(h * scale)
sheet = Image.new("RGB", (cols * tw, rows * th + rows * 22), "white")
d = ImageDraw.Draw(sheet)
for i, (im, f) in enumerate(zip(ims, files)):
    x, y = (i % cols) * tw, (i // cols) * (th + 22)
    sheet.paste(im.resize((tw, th)), (x, y + 22))
    d.text((x + 6, y + 4), f.split("/")[-1], fill="black")
sheet.save(out, quality=85)
print(out, sheet.size)
