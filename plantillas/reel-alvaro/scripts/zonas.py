# Calcula el ajuste de zona segura (src/zona.tsx) de cada escena de elementos gráficos de un reel.
# Entrada: render SOLO de la capa de elementos (sin cámara, B-roll, texto grande, subtítulos ni CTA):
#   npx remotion render ReelA6 out/lottie_a6.mp4 --props='{"stem":"efectos","capa":"lottie"}' --scale=0.5 --muted --crf=28
#   python3 zonas.py out/lottie_a6.mp4 src/a6/zonas.json
# Una escena = tramo seguido con algún elemento en pantalla. De cada escena se mide la caja de lo que brilla (sin chispas
# sueltas ni los fotogramas extremos de las animaciones) y, si se sale de la zona segura (x 100-980, y 220-1500), se calcula
# la escala y el desplazamiento mínimos: se encoge anclado abajo (hasta un 60 %) para que lo de arriba
# casi no baje y nunca tape la cara.
import json, subprocess, sys, numpy as np
X0, X1, Y0, Y1 = 100, 980, 220, 1500
src, out = sys.argv[1], sys.argv[2]
w, h, fps = [x for x in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
                                         "-of", "csv=p=0", src], capture_output=True, text=True).stdout.strip().split(",") if x][:3]
w, h = int(w), int(h); fps = eval(fps); k = w / 1080
p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", src, "-f", "rawvideo", "-pix_fmt", "gray", "-"], stdout=subprocess.PIPE)
vis, cajas = [], []
while True:
    buf = p.stdout.read(w * h)
    if len(buf) < w * h: break
    f = np.frombuffer(buf, np.uint8).reshape(h, w)
    vis.append(int((f > 25).sum()) >= 30)
    m = f > 140
    filas = np.nonzero(m.sum(1) >= 3)[0]; cols = np.nonzero(m.sum(0) >= 3)[0]
    cajas.append((cols.min() / k, (cols.max() + 1) / k, filas.min() / k, (filas.max() + 1) / k) if len(filas) and len(cols) else None)
n = len(vis)
escenas, i = [], 0
while i < n:
    if not vis[i]: i += 1; continue
    j = i
    while j + 1 < n and (vis[j + 1] or (j + 2 < n and vis[j + 2])): j += 1
    escenas.append((i, j)); i = j + 1
zonas = []
for i, j in escenas:
    cs = [c for c in cajas[i:j + 1] if c]
    if len(cs) < 3: continue
    a = np.array(cs)
    L, R = np.percentile(a[:, 0], 3), np.percentile(a[:, 1], 97)
    T, B = np.percentile(a[:, 2], 3), np.percentile(a[:, 3], 97)
    if L >= X0 - 4 and R <= (930 if B > 1330 else 980) + 4 and T >= Y0 - 4 and B <= Y1 + 4: continue
    X1 = 930 if B > 1330 else 980                          # abajo a la derecha está la columna de botones de Instagram
    W, H = R - L, B - T
    s = min(1.0, (X1 - X0) / W, (Y1 - Y0) / H)
    # lo de arriba se encoge anclado abajo (hasta un 60 %) y casi no baja: así nunca se mete en la cabeza ni tapa la cara
    if T < Y0: s = min(s, max(0.6, (B + 30 - Y0) / H))
    if T < Y0: ny = max(Y0, B + 30 - s * H)
    elif B > Y1: ny = max(Y0, min(T, Y1 - s * H))
    else: ny = T + (1 - s) * H / 2
    nx = (L + R) / 2 - s * W / 2
    nx = min(max(nx, X0), X1 - s * W)
    z = dict(a=round(i / fps, 3), b=round((j + 1) / fps, 3), s=round(s, 4), tx=round(nx - s * L, 1), ty=round(ny - s * T, 1))
    zonas.append(z)
    print(f"escena {z['a']:6.2f}-{z['b']:6.2f}  caja x {L:4.0f}-{R:4.0f} y {T:4.0f}-{B:4.0f}  →  escala {s:.2f}, nueva caja x {nx:4.0f}-{nx + s * W:4.0f} y {ny:4.0f}-{ny + s * H:4.0f}")
json.dump(zonas, open(out, "w"), indent=1)
print(f"{len(escenas)} escenas, {len(zonas)} con ajuste → {out}")
