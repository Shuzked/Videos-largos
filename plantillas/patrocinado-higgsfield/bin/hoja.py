"""Hoja de contacto de fotogramas: python3 bin/hoja.py <dir> <salida.jpg> [columnas] [ancho]"""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 2
W = int(sys.argv[4]) if len(sys.argv) > 4 else 900
fs = sorted(glob.glob(f"{d}/f_*.jpg"), key=lambda p: float(os.path.basename(p)[2:-4]))
ims = [Image.open(f).convert("RGB") for f in fs]
H = int(W * 9 / 16)
rows = (len(ims) + cols - 1) // cols
hoja = Image.new("RGB", (cols * W, rows * H), "black")
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 30)
except Exception:
    font = ImageFont.load_default()
for i, (f, im) in enumerate(zip(fs, ims)):
    im = im.resize((W, H))
    dr = ImageDraw.Draw(im)
    dr.rectangle([0, 0, 150, 40], fill="black")
    dr.text((8, 4), os.path.basename(f)[2:-4], fill="yellow", font=font)
    hoja.paste(im, ((i % cols) * W, (i // cols) * H))
hoja.save(out, quality=85)
