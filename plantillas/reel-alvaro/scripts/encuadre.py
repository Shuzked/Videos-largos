# Encuadre automático del B-roll 16:9 → 9:16: busca el sujeto en cada fotograma (caras > personas > objetos > saliencia)
# y devuelve una pista suavizada de "foco" (posición horizontal 0-1 del centro del recorte) para cada clip.
# Uso: python3 encuadre.py clips.json salida.json
#   clips.json = [{"src": "nombre", "ruta": "public/xx/broll/nombre.mp4", "desde": 2.0, "dur": 1.5}, ...]
#   salida.json = {"nombre": [[t_relativo, foco], ...]}  (t relativo al inicio del recorte, 5 muestras/s)
import json, subprocess, sys, os
import numpy as np, cv2
import mediapipe as mp
from mediapipe.tasks import python as mpp
from mediapipe.tasks.python import vision

MOD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../trabajo/modelos')
MOD = os.environ.get('MODELOS', MOD)
W, FPS = 640, 5
CARAS = vision.FaceDetector.create_from_options(vision.FaceDetectorOptions(base_options=mpp.BaseOptions(model_asset_path=f'{MOD}/blaze_face_short_range.tflite'), min_detection_confidence=0.5))
OBJ = vision.ObjectDetector.create_from_options(vision.ObjectDetectorOptions(base_options=mpp.BaseOptions(model_asset_path=f'{MOD}/efficientdet_lite0.tflite'), score_threshold=0.35, max_results=8))

def saliencia(img):
    # mapa de saliencia por residuo espectral (Hou & Zhang): resalta lo que "llama la atención"
    g = cv2.resize(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY), (128, 72)).astype(np.float32)
    f = np.fft.fft2(g)
    amp, fase = np.log(np.abs(f) + 1e-6), np.angle(f)
    res = amp - cv2.blur(amp, (3, 3))
    s = np.abs(np.fft.ifft2(np.exp(res + 1j * fase))) ** 2
    return cv2.resize(cv2.GaussianBlur(s.astype(np.float32), (0, 0), 2.5), (img.shape[1], img.shape[0]))

def frames(ruta, desde, dur):
    h = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', ruta]).decode().split(',')[1])
    w0 = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width', '-of', 'csv=p=0', ruta]).decode())
    H = int(round(W * h / w0 / 2) * 2)
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-ss', str(desde), '-i', ruta, '-t', str(dur + 0.4), '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * 3)
        if len(b) < W * H * 3:
            break
        yield np.frombuffer(b, np.uint8).reshape(H, W, 3)

def objetivo(img, prev):
    H = img.shape[0]
    mi = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(img))
    caras = CARAS.detect(mi).detections
    if caras:
        # la cara más grande manda; si hay varias cerca, su centro conjunto
        cs = sorted(caras, key=lambda d: -d.bounding_box.width * d.bounding_box.height)
        x = [c.bounding_box.origin_x + c.bounding_box.width / 2 for c in cs[:2]]
        if len(x) == 2 and abs(x[0] - x[1]) > W * 0.28:
            x = x[:1]
        return float(np.mean(x)) / W, 3
    obs = OBJ.detect(mi).detections
    if obs:
        pers = [d for d in obs if d.categories[0].category_name == 'person']
        cand = pers or obs
        d = max(cand, key=lambda d: d.bounding_box.width * d.bounding_box.height * d.categories[0].score)
        bb = d.bounding_box
        cx = bb.origin_x + bb.width / 2
        return cx / W, 2
    s = saliencia(img)
    if prev is not None:
        mov = cv2.absdiff(cv2.cvtColor(img, cv2.COLOR_RGB2GRAY), cv2.cvtColor(prev, cv2.COLOR_RGB2GRAY)).astype(np.float32)
        s = s / (s.max() + 1e-6) + 1.5 * cv2.GaussianBlur(mov, (0, 0), 9) / (mov.max() + 1e-6)
    col = s.sum(axis=0)
    col = col - col.min()
    return float((col * np.arange(W)).sum() / (col.sum() + 1e-6)) / W, 1

def pista(ruta, desde, dur):
    xs, prev = [], None
    for img in frames(ruta, desde, dur):
        xs.append(objetivo(img, prev))
        prev = img
    if not xs:
        return [[0, 0.5]]
    x = np.array([v for v, _ in xs])
    # suavizado: mediana corta + gaussiana, y velocidad máxima de barrido (encuadre tranquilo, sin saltos)
    x = np.array([np.median(x[max(0, i - 2):i + 3]) for i in range(len(x))])
    g = np.exp(-0.5 * (np.arange(-5, 6) / 2.5) ** 2); g /= g.sum()
    x = np.convolve(np.pad(x, 5, mode='edge'), g, 'valid')
    vmax = 0.035  # fracción del ancho por muestra (~0,17/s)
    for i in range(1, len(x)):
        x[i] = x[i - 1] + np.clip(x[i] - x[i - 1], -vmax, vmax)
    return [[round(i / FPS, 2), round(float(v), 3)] for i, v in enumerate(x)]

if __name__ == '__main__':
    import atexit, os as _os
    atexit.register(lambda: _os._exit(0))  # evita el error de cierre de mediapipe
    clips = json.load(open(sys.argv[1]))
    out = {c['src']: pista(c['ruta'], c['desde'], c['dur']) for c in clips}
    for k, v in out.items():
        print(k, 'foco', v[0][1], '→', v[-1][1], f'({len(v)} muestras)')
    json.dump(out, open(sys.argv[2], 'w'))
