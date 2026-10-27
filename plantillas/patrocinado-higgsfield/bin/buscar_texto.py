# Busca en los tramos de pantalla del corte (5 fps) dónde está un trozo de la web (p. ej. «ChatGPT Plugin» en el menú de
# Higgsfield) para difuminarlo solo cuando se ve. Uso: python3 bin/buscar_texto.py <t_ref> x y w h salida.json
import json, subprocess, sys, numpy as np, cv2
SRC = "/home/user/videos-largos/trabajo/kling4/original/Video cortado.mp4"
tref, x, y, w, h = float(sys.argv[1]), *map(int, sys.argv[2:6])
OUT = sys.argv[6]
def frame(c):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{c:.3f}', '-i', SRC, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True)
    return np.frombuffer(r.stdout, np.uint8).reshape(1080, 1920)
plantilla = frame(tref)[y:y + h, x:x + w].copy()
FPS = 5; res = []
for a, b in [(34.0, 45.08), (105.36, 492.92)]:
    p = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', SRC, '-vf', f'fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
    n = 0
    while True:
        buf = p.stdout.read(1920 * 1080)
        if len(buf) < 1920 * 1080: break
        g = np.frombuffer(buf, np.uint8).reshape(1080, 1920)
        zona = g[max(0, y - 60):y + h + 60, max(0, x - 200):x + w + 200]
        m = cv2.matchTemplate(zona, plantilla, cv2.TM_CCOEFF_NORMED)
        _, mx, _, pos = cv2.minMaxLoc(m)
        res.append([round(a + n / FPS, 2), round(float(mx), 3), pos[0] + max(0, x - 200), pos[1] + max(0, y - 60)])
        n += 1
    p.wait()
json.dump(res, open(OUT, 'w'))
print(len(res))
