# Recorre los tramos de pantalla del corte (5 fps) y apunta el rectángulo del borde blanco de la ventana y de la burbuja
import subprocess, json, numpy as np
SRC = "/home/user/videos-largos/trabajo/kling4/original/Video cortado.mp4"
OUT = "/home/user/videos-largos/trabajo/kling4/trans/marcos.json"
FPS = 5
res = []
for a, b in [(34.0, 45.08), (105.36, 492.92)]:
    p = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(a), '-t', str(b - a), '-i', SRC, '-vf', f'fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
    n = 0
    while True:
        buf = p.stdout.read(1920 * 1080 * 3)
        if len(buf) < 1920 * 1080 * 3: break
        x = np.frombuffer(buf, np.uint8).reshape(1080, 1920, 3).astype(np.int16)
        g = (x.min(2) > 175) & (x.max(2) - x.min(2) < 40)
        def h(y0, y1, x0, x1):
            m = g[y0:y1, x0:x1].mean(1); i = int(m.argmax()); return [y0 + i, round(float(m[i]), 2)]
        def v(x0, x1, y0, y1):
            m = g[y0:y1, x0:x1].mean(0); i = int(m.argmax()); return [x0 + i, round(float(m[i]), 2)]
        res.append(dict(c=round(a + n / FPS, 2), top=h(90, 330, 700, 1700), bot=h(780, 1010, 700, 1700), izq=v(506, 640, 350, 750), der=v(1800, 1920, 350, 750),
                        btop=h(100, 220, 60, 460), bbot=h(860, 1000, 60, 460), bizq=v(0, 60, 300, 800), bder=v(460, 506, 300, 800)))
        n += 1
    p.wait()
json.dump(res, open(OUT, 'w'))
print(len(res))
