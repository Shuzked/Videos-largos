# Seguimiento de la cara de Álvaro en los tramos de cámara: centro (entre ojos/nariz) a 10 fps, suavizado
import json, subprocess, sys, numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

VID, MODELO, SALIDA = sys.argv[1], sys.argv[2], sys.argv[3]
TRAMOS = [(0, 65.0)]
W, H, FPS = 360, 640, 10
det = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=mpp.BaseOptions(model_asset_path=MODELO), running_mode=vision.RunningMode.VIDEO, num_faces=1))
res = []
ts_ms = 0
for a, b in TRAMOS:
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(a), '-i', VID, '-t', str(b - a), '-vf', f'fps={FPS},scale={W}:{H}',
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    k = 0
    pts = []
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.frombuffer(buf, np.uint8).reshape(H, W, 3))
        ts_ms += 100
        r = det.detect_for_video(img, ts_ms)
        t = a + k / FPS
        if r.face_landmarks:
            lm = r.face_landmarks[0]
            # centro de la cara: media de ojos (33, 263) y punta de nariz (1)
            x = np.mean([lm[i].x for i in (33, 263, 1)]) * 1080
            y = np.mean([lm[i].y for i in (33, 263, 1)]) * 1920
            pts.append((t, x, y))
        else:
            pts.append((t, np.nan, np.nan))
        k += 1
    arr = np.array(pts)
    # rellena huecos y suaviza (gaussiana ~0,6 s) para que el encuadre no tiemble
    for c in (1, 2):
        v = arr[:, c]
        ok = ~np.isnan(v)
        v[~ok] = np.interp(arr[~ok, 0], arr[ok, 0], v[ok]) if ok.any() else (540 if c == 1 else 600)
        g = np.exp(-0.5 * (np.arange(-12, 13) / 6.0) ** 2); g /= g.sum()
        arr[:, c] = np.convolve(np.pad(v, 12, mode='edge'), g, 'valid')
    res += [[round(t, 2), round(x, 1), round(y, 1)] for t, x, y in arr]
    print(f'tramo {a}-{b}: {len(arr)} muestras, sin cara {int((~ok).sum())}')
json.dump(res, open(SALIDA, 'w'))
