# Control de caras: ningún texto ni elemento gráfico encima de una cara (la de Álvaro o las del B-roll).
# Detecta caras (MediaPipe) en el vídeo final y mira, en los mismos fotogramas, si lo que brilla en la capa gráfica
# (render con stem «efectos», fondo negro) cae dentro de la cara (ojos, nariz, boca; el pelo no cuenta).
#   python3 caras.py final.mp4 capa_grafica.mp4 [modelo.task]
import subprocess, sys, numpy as np, mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision
FIN, CAPA = sys.argv[1], sys.argv[2]
MOD = sys.argv[3] if len(sys.argv) > 3 else "/home/user/videos-largos/trabajo/modelos/face_landmarker.task"
W, H, FPS = 270, 480, 5
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(base_options=mpp.BaseOptions(model_asset_path=MOD),
                                                running_mode=vision.RunningMode.VIDEO, num_faces=3))
def fl(f, fmt, n):
    return subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", f, "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", fmt, "-"],
                            stdout=subprocess.PIPE), n
pf, nf = fl(FIN, "rgb24", W * H * 3); pc, nc = fl(CAPA, "gray", W * H)
malos, i = [], 0
while True:
    a, b = pf.stdout.read(nf), pc.stdout.read(nc)
    if len(a) < nf or len(b) < nc: break
    img = np.frombuffer(a, np.uint8).reshape(H, W, 3)
    capa = np.frombuffer(b, np.uint8).reshape(H, W) > 140
    r = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img)), int(i * 1000 / FPS))
    for cara in r.face_landmarks:
        xs = np.array([p.x for p in cara]) * W; ys = np.array([p.y for p in cara]) * H
        # de las cejas a la barbilla (sin frente ni pelo)
        x0, x1 = int(max(0, xs.min())), int(min(W, xs.max())); y0, y1 = int(max(0, np.percentile(ys, 8))), int(min(H, ys.max()))
        n = int(capa[y0:y1, x0:x1].sum())
        if n >= 6: malos.append((i / FPS, n, (x1 - x0) * 4)); break
    i += 1
tramos = []
for t, n, w in malos:
    if tramos and t - tramos[-1][1] <= 0.21: tramos[-1][1] = t; tramos[-1][2] = max(tramos[-1][2], n)
    else: tramos.append([t, t, n])
tramos = [x for x in tramos if x[1] - x[0] >= 0.2 - 1e-6]
for a, b, n in tramos: print(f"cara     {a:6.2f}-{b:6.2f} s  ({n} px de gráfico sobre la cara)")
print(f"{len(tramos)} tramos con gráficos sobre una cara ({i} fotogramas)")
