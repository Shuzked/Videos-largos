# Pista de efectos: coloca cada sonido del banco del cliente con su golpe (pico) en el segundo de la lista.
# Plantilla: genera la pista de efectos a partir de una lista «segundo<TAB>sonido<TAB>dB<TAB>duración<TAB>nota» (ejemplo: Alva patr #1).
# Mismos parámetros que <Son> de src/anim.tsx (pk = segundo del golpe dentro del archivo, peak = pico en dBFS,
# obj = nivel de pico objetivo, desde = recorte inicial). Uso: genera_sfx.py eventos.tsv salida.wav duración
import numpy as np, subprocess, sys, wave

SBDIR = "/home/user/videos-largos/trabajo/intro/remotion-intro/public/sb"
SB = {
    "whoosh": dict(pk=0.51, dur=1.2, peak=-4, obj=-19),
    "slide2": dict(pk=2.608, dur=1.78, peak=-11.8, obj=-19, desde=2.108),
    "pop": dict(pk=0.03, dur=0.6, peak=-2.9, obj=-18),
    "ticw": dict(pk=0.25, dur=0.3, peak=0, desde=0.22, obj=-22),
    "tapcorto": dict(pk=0.014, dur=0.6, peak=-0.5, obj=-19),
    "hit": dict(pk=0.6, dur=1.8, peak=0, obj=-13),
    "snap": dict(pk=0.18, dur=1.2, peak=0, obj=-17),
    "snappy": dict(pk=0.054, dur=2.5, peak=-4.8, obj=-13),
    "cineboom": dict(pk=0.13, dur=3, peak=1.0, obj=-13),
    "riserm": dict(pk=1.9, dur=2.0, peak=-10.1, obj=-18),
    "shutter": dict(pk=0.56, dur=0.45, peak=-3, desde=0.5, obj=-16),
    "typing": dict(pk=30, dur=5, peak=-17, desde=30, obj=-26),
    "twinkle": dict(pk=0.02, dur=1.6, peak=-10.8, obj=-19),
    "ding": dict(pk=0.03, dur=1.2, peak=-13, obj=-18),
    "swoosh3": dict(pk=1.658, dur=1.45, peak=-1.7, obj=-19, desde=1.158),
    "bloop": dict(pk=0.062, dur=0.25, peak=-13.1, obj=-19),
    "burbuja": dict(pk=0.037, dur=0.2, peak=-12.9, obj=-19),
    "burbuja2": dict(pk=0.02, dur=0.26, peak=-14.5, obj=-19),
    "exito": dict(pk=0.024, dur=2.0, peak=-9.9, obj=-19),
    "datos": dict(pk=0.021, dur=2.0, peak=-11.5, obj=-19),
    "puntos": dict(pk=0.178, dur=1.5, peak=-8.1, obj=-19),
    "swish": dict(pk=4.433, dur=2.07, peak=-1.4, obj=-19, desde=3.933),
}
SR = 48000

def lee(nombre):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", f"{SBDIR}/{nombre}.mp3", "-ac", "2", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2)

eventos, durt = sys.argv[1], float(sys.argv[3])
pista = np.zeros((int(durt * SR) + SR, 2), np.float32)
cache = {}
for l in open(eventos, encoding="utf-8"):
    if l.startswith("#") or not l.strip():
        continue
    c = l.rstrip("\n").split("\t")
    t, s, db = float(c[0]), c[1], float(c[2])
    k = SB[s]
    desde = k.get("desde", 0.0)
    dur = float(c[3]) if len(c) > 3 and c[3] else k["dur"]
    x = cache.setdefault(s, lee(s))
    a = int(desde * SR)
    trozo = x[a:a + int(dur * SR)].copy()
    inicio = t - (k["pk"] - desde)          # el golpe del sonido cae en t
    if inicio < 0:                           # al principio del vídeo: se recorta la cola previa al golpe
        trozo = trozo[int(-inicio * SR):]
        inicio = 0.0
    n = len(trozo)
    fi = min(n, int(0.004 * SR)); fo = min(n, int(0.015 * SR))
    trozo[:fi] *= np.linspace(0, 1, fi)[:, None]   # sin clics al cortar
    trozo[n - fo:] *= np.linspace(1, 0, fo)[:, None]
    g = 10 ** ((k.get("obj", -17) + db - k["peak"]) / 20)
    i = int(round(inicio * SR))
    pista[i:i + n] += trozo * g
pista = pista[:int(durt * SR)]
print(f"pico de la pista de efectos: {20*np.log10(np.abs(pista).max()+1e-12):.1f} dBFS")
with wave.open(sys.argv[2], "wb") as w:
    w.setnchannels(2); w.setsampwidth(3); w.setframerate(SR)
    v = np.clip(pista, -1, 1 - 2**-23)
    i24 = (v * 2**23).astype(np.int32).reshape(-1)
    w.writeframes(np.stack([i24 & 255, (i24 >> 8) & 255, (i24 >> 16) & 255], 1).astype(np.uint8).tobytes())
