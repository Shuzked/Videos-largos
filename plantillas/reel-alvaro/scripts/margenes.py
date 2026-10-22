# Control de márgenes de un reel 9:16: que ningún texto ni gráfico se meta en las zonas que tapa la interfaz de Instagram
# (lados y parte de arriba; en los anuncios también el botón «Ver detalles» de abajo).
# Se analiza un render SOLO de la capa gráfica (stem «efectos»: los vídeos no se cargan y el fondo queda negro), así lo que
# brilla es texto, subtítulos, pastillas, iconos… y no la imagen de la cámara.
#   npx remotion render ReelA6 out/margen_a6.mp4 --props='{"stem":"efectos"}' --scale=0.5 --muted --crf=28
#   python3 margenes.py out/margen_a6.mp4 [--final final.mp4 --fotos carpeta]
# Zonas (en px de 1080×1920), medidas sobre capturas de un anuncio en un móvil alto (Instagram recorta ~56 px por lado):
# lados < 100, arriba < 220 (barra del móvil), abajo > 1500 (botón «Ver detalles» del anuncio) y la columna de botones
# (me gusta, comentar…) a la derecha, x > 930 con y > 1330. Imprime los tramos (≥ 0,2 s) que invaden.
import argparse, json, subprocess, numpy as np, os
ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--final"); ap.add_argument("--fotos")
ap.add_argument("--lado", type=int, default=100); ap.add_argument("--arriba", type=int, default=220); ap.add_argument("--abajo", type=int, default=1500)
ap.add_argument("--json")
a = ap.parse_args()
w, h, fps = [x for x in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                                         "-of", "csv=p=0", a.video], capture_output=True, text=True).stdout.strip().split(",") if x][:3]
w, h = int(w), int(h); fps = eval(fps); k = w / 1080
p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", a.video, "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
L, A, B = int(a.lado * k), int(a.arriba * k), int(a.abajo * k)
MIN = max(6, int(40 * k * k))                     # píxeles brillantes mínimos para contar (ignora chispas sueltas)
eventos = {"izquierda": [], "derecha": [], "arriba": [], "abajo": [], "botones": []}
i = 0
while True:
    buf = p.stdout.read(w * h)
    if len(buf) < w * h: break
    f = np.frombuffer(buf, np.uint8).reshape(h, w) > 170
    zonas = {"izquierda": f[:, :L], "derecha": f[:, w - L:], "arriba": f[:A, :], "abajo": f[B:, :], "botones": f[int(1330 * k):B, int(930 * k):w - L]}
    for z, m in zonas.items():
        n = int(m.sum())
        if n >= MIN:
            ys, xs = np.nonzero(m)
            ext = {"izquierda": xs.min() / k, "derecha": (w - L + xs.max()) / k, "arriba": ys.min() / k, "abajo": (B + ys.max()) / k,
                   "botones": (int(930 * k) + xs.max()) / k}[z]
            eventos[z].append((i / fps, ext))
    i += 1
tramos = []
for z, ev in eventos.items():
    cur = None
    for t, e in ev:
        if cur and t - cur["b"] <= 0.09: cur["b"] = t; cur["peor"] = min(cur["peor"], e) if z in ("izquierda", "arriba") else max(cur["peor"], e)
        else:
            if cur: tramos.append(cur)
            cur = dict(zona=z, a=t, b=t, peor=e)
    if cur: tramos.append(cur)
tramos = [x for x in tramos if x["b"] - x["a"] >= 0.2 - 1e-6]
tramos.sort(key=lambda x: x["a"])
for x in tramos:
    print(f"{x['zona']:9s} {x['a']:6.2f}-{x['b']:6.2f} s  peor {x['peor']:.0f} px")
    if a.final and a.fotos:
        os.makedirs(a.fotos, exist_ok=True); t = (x["a"] + x["b"]) / 2
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", a.final, "-frames:v", "1", "-vf", "scale=540:-1",
                        f"{a.fotos}/{x['zona']}_{t:06.2f}.jpg"])
if a.json: json.dump(tramos, open(a.json, "w"))
print(f"{len(tramos)} tramos fuera de márgenes ({i} fotogramas)")
