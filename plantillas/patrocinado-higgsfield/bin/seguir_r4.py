# Sigue en el resultado de Edit (r4; r3 es el mismo plano con otro fondo) lo que va señalando en «solo cambia el fondo»:
# la cara (FaceLandmarker), el pecho (la camiseta, bajo la barbilla) y el frasco (lo más ámbar y saturado bajo la cara).
# Salida: trans/r4_puntos.json → {t: [...], cara: [[x,y]], pecho: [[x,y]], frasco: [[x,y] | null]} en píxeles de r4 (1920×1080).
import json, subprocess, numpy as np, cv2
import mediapipe as mp
R = "/home/user/videos-largos/trabajo/kling4"
SRC = f"{R}/remotion/public/medios/r4.mp4"
W, H, FPS = 1920, 1080, 24
BaseOptions = mp.tasks.BaseOptions
opts = mp.tasks.vision.FaceLandmarkerOptions(base_options=BaseOptions(model_asset_path="/home/user/videos-largos/trabajo/modelos/face_landmarker.task"),
                                             running_mode=mp.tasks.vision.RunningMode.VIDEO, num_faces=1)
det = mp.tasks.vision.FaceLandmarker.create_from_options(opts)
p = subprocess.Popen(["ffmpeg", "-nostdin", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
out = dict(t=[], cara=[], pecho=[], frasco=[], alto_cara=[])
n = 0
while True:
    buf = p.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    rgb = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    r = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb)), int(n * 1000 / FPS))
    cara = pecho = None; alto = None
    if r.face_landmarks:
        lm = r.face_landmarks[0]
        P = lambda i: (lm[i].x * W, lm[i].y * H)
        nariz, menton, frente = P(1), P(152), P(10)
        alto = menton[1] - frente[1]
        cara = [round(nariz[0], 1), round(nariz[1], 1)]
        pecho = [round(menton[0] - 0.55 * alto, 1), round(menton[1] + 1.05 * alto, 1)]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    m = ((hsv[..., 0] >= 3) & (hsv[..., 0] <= 22) & (hsv[..., 1] > 150) & (hsv[..., 2] > 60)).astype(np.uint8)
    if cara: m[: int(cara[1] + 0.3 * alto)] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    k, lab, st, cen = cv2.connectedComponentsWithStats(m)
    frasco = None
    if k > 1:
        i = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
        if st[i, cv2.CC_STAT_AREA] > 1500: frasco = [round(float(cen[i][0]), 1), round(float(cen[i][1]), 1)]
    out["t"].append(round(n / FPS, 4)); out["cara"].append(cara); out["pecho"].append(pecho); out["frasco"].append(frasco); out["alto_cara"].append(alto and round(alto, 1))
    n += 1
p.wait()
json.dump(out, open(f"{R}/trans/r4_puntos.json", "w"))
for i in range(0, n, 12): print(out["t"][i], out["cara"][i], out["pecho"][i], out["frasco"][i], out["alto_cara"][i])
