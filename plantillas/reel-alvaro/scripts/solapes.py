# Control de solapes: que el texto (titulares, subtítulos, CTA) nunca pise un elemento animado (iconos, barras de progreso,
# tarjetas…). Compara, fotograma a fotograma, un render solo del texto y otro solo de los elementos (fondo negro: lo que
# brilla es lo que se ve) y avisa de los tramos (≥ 0,2 s) en que se tocan.
#   npx remotion render ReelA6 out/texto_a6.mp4     --props='{"stem":"efectos","capa":"texto"}'     --scale=0.5 --muted
#   npx remotion render ReelA6 out/elementos_a6.mp4 --props='{"stem":"efectos","capa":"elementos"}' --scale=0.5 --muted
#   python3 solapes.py out/texto_a6.mp4 out/elementos_a6.mp4
import subprocess, sys, numpy as np, cv2
def lee(f):
    w, h, fps = [x for x in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                                             "-of", "csv=p=0", f], capture_output=True, text=True).stdout.strip().split(",") if x][:3]
    w, h = int(w), int(h)
    return w, h, eval(fps), subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", f, "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
w, h, fps, pt = lee(sys.argv[1]); _, _, _, pe = lee(sys.argv[2])
k = w / 1080; nucleo = np.ones((int(12 * k) | 1, int(12 * k) | 1), np.uint8)   # ~12 px de aire alrededor del texto
MIN = max(20, int(400 * k * k))
malos, i = [], 0
while True:
    a, b = pt.stdout.read(w * h), pe.stdout.read(w * h)
    if len(a) < w * h or len(b) < w * h: break
    T = cv2.dilate((np.frombuffer(a, np.uint8).reshape(h, w) > 140).astype(np.uint8), nucleo)
    E = np.frombuffer(b, np.uint8).reshape(h, w) > 140
    n = int((T.astype(bool) & E).sum())
    if n >= MIN:
        ys, xs = np.nonzero(T.astype(bool) & E); malos.append((i / fps, n, int(ys.mean() / k)))
    i += 1
tramos = []
for t, n, y in malos:
    if tramos and t - tramos[-1][1] <= 0.09: tramos[-1][1] = t; tramos[-1][2] = max(tramos[-1][2], n); tramos[-1][3] = y
    else: tramos.append([t, t, n, y])
tramos = [x for x in tramos if x[1] - x[0] >= 0.2 - 1e-6]
for a, b, n, y in tramos: print(f"solape   {a:6.2f}-{b:6.2f} s  (y≈{y} px, {n} px)")
print(f"{len(tramos)} solapes texto/elementos ({i} fotogramas)")
