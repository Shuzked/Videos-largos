#!/bin/bash
# Hoja de control de color: fotograma, forma de onda (IRE) y vectorscopio (con línea de piel), antes y después.
# Uso: hoja_qc.sh <video_original> <filtro> <segundo> <salida.jpg>
V=$1; F=$2; T=$3; O=$4
ffmpeg -v error -y -ss $T -i "$V" -frames:v 1 -filter_complex "
[0:v]scale=540:960,split=2[a][b];
[b]$F,split=3[b1][b2][b3];
[a]split=3[a1][a2][a3];
[a2]format=rgb24,waveform=mode=column:intensity=0.08:graticule=green:flags=numbers+dots:scale=ire,scale=540:300[wa];
[b2]format=rgb24,waveform=mode=column:intensity=0.08:graticule=green:flags=numbers+dots:scale=ire,scale=540:300[wb];
[a3]format=yuv444p,vectorscope=mode=color3:graticule=color:flags=name,scale=300:300,pad=540:300:120:0[va];
[b3]format=yuv444p,vectorscope=mode=color3:graticule=color:flags=name,scale=300:300,pad=540:300:120:0[vb];
[a1][wa][va]vstack=3[ca];[b1][wb][vb]vstack=3[cb];[ca][cb]hstack" "$O"
# línea de tono de piel (I-line, 123°) dibujada sobre los dos vectorscopios
python3 - "$O" <<'PY'
import sys, math
from PIL import Image, ImageDraw
o = sys.argv[1]; im = Image.open(o).convert('RGB'); d = ImageDraw.Draw(im)
for x0 in (0, 540):
    cx, cy, r = x0 + 120 + 150, 960 + 300 + 150, 150
    a = math.radians(123)
    d.line([cx, cy, cx + r * math.cos(a), cy - r * math.sin(a)], fill=(255, 170, 120), width=2)
im.save(o, quality=92)
PY
