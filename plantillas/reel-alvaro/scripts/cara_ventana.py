# Seguimiento de la cara en planos abiertos (cuerpo entero): el detector solo ve caras grandes, así que se analiza
# una ventana cuadrada alrededor de la cabeza que sigue a la última detección. Salida en coordenadas 1080x1920, 10 fps, suavizada.
import json, subprocess, sys, numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

VID, MODELO, SALIDA = sys.argv[1], sys.argv[2], sys.argv[3]
X0, Y0 = float(sys.argv[4]), float(sys.argv[5])  # posición inicial aproximada de la cara (coordenadas 1080x1920)
SW, SH, FPS = 720, 1280, 10   # fotogramas a esta escala (1080x1920 * 2/3)
V, LADO = 480, 320            # ventana de V px (escala SW) alrededor de la cabeza, redimensionada a LADO
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpp.BaseOptions(model_asset_path=MODELO), running_mode=vision.RunningMode.VIDEO, num_faces=1))
p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', VID, '-vf', f'fps={FPS},scale={SW}:{SH}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
cx, cy = X0 * SW / 1080, Y0 * SH / 1920
pts, k = [], 0
while True:
    buf = p.stdout.read(SW * SH * 3)
    if len(buf) < SW * SH * 3:
        break
    img = np.frombuffer(buf, np.uint8).reshape(SH, SW, 3)
    x0 = int(min(SW - V, max(0, cx - V / 2))); y0 = int(min(SH - V, max(0, cy - V * 0.45)))
    rec = np.ascontiguousarray(img[y0:y0 + V, x0:x0 + V])
    rec = np.array(__import__('PIL.Image', fromlist=['Image']).fromarray(rec).resize((LADO, LADO)))
    r = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rec), (k + 1) * 100)
    t = k / FPS
    if r.face_landmarks:
        lm = r.face_landmarks[0]
        fx = x0 + np.mean([lm[i].x for i in (33, 263, 1)]) * V
        fy = y0 + np.mean([lm[i].y for i in (33, 263, 1)]) * V
        cx, cy = fx, fy
        pts.append((t, fx * 1080 / SW, fy * 1920 / SH))
    else:
        pts.append((t, np.nan, np.nan))
    k += 1
arr = np.array(pts)
for c in (1, 2):
    v = arr[:, c]
    ok = ~np.isnan(v)
    v[~ok] = np.interp(arr[~ok, 0], arr[ok, 0], v[ok]) if ok.any() else (540 if c == 1 else 600)
    g = np.exp(-0.5 * (np.arange(-12, 13) / 6.0) ** 2); g /= g.sum()
    arr[:, c] = np.convolve(np.pad(v, 12, mode='edge'), g, 'valid')
json.dump([[round(t, 2), round(x, 1), round(y, 1)] for t, x, y in arr], open(SALIDA, 'w'))
print(f'{len(arr)} muestras, sin cara {int((~ok).sum())}')
