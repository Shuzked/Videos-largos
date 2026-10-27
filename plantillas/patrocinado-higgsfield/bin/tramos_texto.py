# Agrupa lo que encontró buscar_texto.py en tramos (dónde y cuándo se ve) y afina cada borde fotograma a fotograma (25 fps).
# Uso: python3 bin/tramos_texto.py trans/chatgpt.json trans/chatgpt_tramos.json
import json, subprocess, sys, numpy as np, cv2
SRC = "/home/user/videos-largos/trabajo/kling4/original/Video cortado.mp4"
UMBRAL = 0.75
datos = json.load(open(sys.argv[1]))
def frame(c):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{c:.3f}', '-i', SRC, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(1080, 1920)
tramos = []
for c, s, x, y in datos:
    ok = s >= UMBRAL
    if ok and tramos and tramos[-1]["fin"] and abs(c - tramos[-1]["b"] - 0.2) < 0.05 and abs(x - tramos[-1]["x"]) <= 2 and abs(y - tramos[-1]["y"]) <= 2:
        tramos[-1]["b"] = c
    elif ok:
        tramos.append(dict(a=c, b=c, x=x, y=y, fin=True))
plantilla = None
ref = max(datos, key=lambda d: d[1])
g = frame(ref[0]); plantilla = g[ref[3]:ref[3] + 17, ref[2]:ref[2] + 84].copy()
def esta(c, x, y):
    g = frame(c)[y - 6:y + 23, x - 6:x + 90]
    return cv2.minMaxLoc(cv2.matchTemplate(g, plantilla, cv2.TM_CCOEFF_NORMED))[1] >= UMBRAL
out = []
for t in tramos:
    a, b = t["a"], t["b"]
    while a - 0.04 >= 0 and esta(a - 0.04, t["x"], t["y"]): a = round(a - 0.04, 2)   # afina el inicio (25 fps)
    while esta(b + 0.04, t["x"], t["y"]): b = round(b + 0.04, 2)                      # y el final
    out.append(dict(a=a, b=round(b + 0.04, 2), x=t["x"], y=t["y"]))
json.dump(out, open(sys.argv[2], "w"))
for o in out: print(o)
