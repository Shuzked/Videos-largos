# Audio del vídeo «Kling 4.0 en Higgsfield». La voz es la del corte del usuario y NO se toca (ni EQ ni compresión): solo se
# coloca donde va cada tramo (fundidos de 10 ms en los cortes). Los tres resultados suenan enteros con su propio audio,
# llevados con una ganancia fija al nivel de la voz. Encima: los efectos del banco del cliente (alineados por el pico, con
# la tabla SB de src/anim.tsx) y la música de la Biblioteca de audio de YouTube («Beyond» y «Project», de Patrick
# Patrikios) muy de fondo: 23 LU por debajo de la voz mientras habla, apartándose con ducking, con hueco de EQ en 2,5 kHz
# y SIN música encima de los resultados ni de las comparativas. El conjunto se lleva a -14 LUFS con una ganancia LINEAL y
# un limitador sin autonivel que solo toca los picos.
# Uso: python3 bin/mezcla.py salida.wav
import json, os, subprocess, sys, numpy as np
R = "/home/user/videos-largos/trabajo/kling4"
SR = 48000; OUT = sys.argv[1]
plan = json.load(open(f"{R}/plan_audio.json"))
DUR = plan["dur"]; N = int(round(DUR * SR))
db = lambda v: 10 ** (v / 20)
CORTE = f"{R}/original/Video cortado.mp4"
MED = f"{R}/remotion/public/medios"
MUS = "/home/user/videos-largos/trabajo/showdown/musica"
SB = f"{R}/remotion/public/sb"

def lee(src, desde=0.0, dur=None, af="anull"):
    cmd = ["ffmpeg", "-nostdin", "-v", "error", "-ss", f"{max(0, desde):.4f}", "-i", src]
    if dur: cmd += ["-t", f"{dur:.4f}"]
    cmd += ["-vn", "-af", af, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    return np.frombuffer(subprocess.run(cmd, capture_output=True).stdout, np.float32).reshape(-1, 2).copy()
def lufs(x):
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
                        "-af", "ebur128=framelog=quiet", "-f", "null", "-"], input=x.astype(np.float32).tobytes(), capture_output=True)
    l = [s for s in r.stderr.decode().splitlines() if s.strip().startswith("I:")]
    return float(l[-1].split()[1]) if l else -70.0
def fundido(x, n=480):
    n = min(n, len(x) // 2)
    if n > 0:
        r = np.linspace(0, 1, n, dtype=np.float32)[:, None]; x[:n] *= r; x[-n:] *= r[::-1]
    return x
def pon(bus, x, t0, g=1.0):
    n0 = int(round(t0 * SR))
    if n0 < 0: x = x[-n0:]; n0 = 0
    n = min(len(x), N - n0)
    if n > 0: bus[n0:n0 + n] += x[:n] * g

# ---------- 1) voz (tal cual) ----------
voz = np.zeros((N, 2), np.float32)
for v in plan["voz"]:
    pon(voz, fundido(lee(CORTE, v["desde"], v["dur"])), v["ini"])
L_voz = lufs(voz[np.abs(voz).max(1) > 1e-4])
print(f"voz (sin tocar) {L_voz:.1f} LUFS", flush=True)

# ---------- 2) resultados enteros, con su audio, al nivel de la voz ----------
res = np.zeros((N, 2), np.float32)
for r_ in plan["resultados"]:
    x = fundido(lee(f"{MED}/{r_['src']}", 0.0, r_["dur"]), 240)
    L = lufs(x); g = min(6.0, L_voz - 2.0 - L)
    print(f"resultado {r_['src']} en {r_['ini']:.2f}: {L:.1f} LUFS → {g:+.1f} dB", flush=True)
    pon(res, x, r_["ini"], db(g))

# ---------- 3) actividad de la voz (para apartar la música mientras habla) ----------
H = 480; nT = N // H
e = np.sqrt((voz[:nT * H, 0].reshape(nT, H) ** 2).mean(1))
act_obj = (20 * np.log10(e + 1e-9) > L_voz - 12).astype(np.float32)
act = np.zeros(nT, np.float32); a_ = 0.0
for i in range(nT):
    obj = act_obj[i]; k = 1 - np.exp(-H / SR / (0.06 if obj > a_ else 0.7)); a_ += (obj - a_) * k; act[i] = a_
act_m = np.repeat(act, H); act_m = np.concatenate([act_m, np.full(N - len(act_m), act_m[-1] if len(act_m) else 0)])[:, None]

# ---------- 4) música ----------
EQ = "equalizer=f=2500:t=q:w=1.2:g=-4"  # hueco en medios para la voz
mus = np.zeros((N, 2), np.float32)
def bucle(pista, desde, dur, cruce=1.5):
    entero = lee(f"{MUS}/{pista}.mp3", 0.0, af=EQ)
    x = entero[int(desde * SR):].copy()
    n_c = int(cruce * SR)
    while len(x) < dur * SR:
        r = np.linspace(0, 1, n_c, dtype=np.float32)[:, None]
        x = np.concatenate([x[:-n_c], x[-n_c:] * r[::-1] + entero[:n_c] * r, entero[n_c:]])
    return x[:int(dur * SR)]
def base(pista, desde, t0, t1, bajo_voz=23, libre=16, fi=1.0, ff=1.5):
    """música en [t0, t1]: «libre» dB por debajo de la voz sin voz y «bajo_voz» dB por debajo mientras habla"""
    x = bucle(pista, desde, t1 - t0)
    Lm = lufs(x)
    env = np.ones(len(x), np.float32)
    a, b = int(fi * SR), int(ff * SR)
    if a: env[:a] = np.linspace(0, 1, a)
    if b: env[-b:] *= np.linspace(1, 0, b)
    x = x * env[:, None] * db(L_voz - libre - Lm)
    n0 = int(t0 * SR); n1 = min(N, n0 + len(x))
    mus[n0:n1] += x[:n1 - n0] * db(-(bajo_voz - libre)) ** act_m[n0:n1]
for m in plan["musica"]:
    base(m["pista"], 0.0, m["ini"], m["fin"])
# sin música encima de los resultados ni de las comparativas: se va antes y vuelve suave después
tt = np.arange(N, dtype=np.float32) / SR
env = np.ones(N, np.float32)
for a, b in plan["mudos"]:
    env = np.minimum(env, np.clip(np.maximum((a - tt) / 0.6, (tt - b) / 0.9), 0, 1))
mus *= env[:, None]
del tt, env

# ---------- 5) efectos (banco del cliente; tabla SB de src/anim.tsx: pico en el instante, nivel objetivo de pico) ----------
SBT = {
    "whoosh": dict(pk=0.51, dur=1.2, peak=-4, obj=-19), "pop": dict(pk=0.03, dur=0.6, peak=-2.9, obj=-18),
    "popup": dict(pk=0.16, dur=0.45, peak=-6.1, desde=0.1), "hit": dict(pk=0.6, dur=1.8, peak=0, obj=-13),
    "riser": dict(pk=0.75, dur=0.85, peak=-6.2, obj=-18), "ding": dict(pk=0.03, dur=1.2, peak=-13, obj=-18),
    "swish": dict(pk=4.433, dur=2.07, peak=-1.4, obj=-19, desde=3.933), "reveal": dict(pk=4.264, dur=2.24, peak=-9.3, obj=-19, desde=3.764),
    "negativo": dict(pk=0.024, dur=0.78, peak=-8.6, obj=-19), "exito": dict(pk=0.024, dur=2.0, peak=-9.9, obj=-19),
    "confirmar": dict(pk=0.005, dur=0.64, peak=-17.1, obj=-19), "mensaje": dict(pk=3.089, dur=2.71, peak=-8.3, obj=-19, desde=2.589),
    "tap": dict(pk=0.118, dur=0.8, peak=-10.0, obj=-19),
}
efx = np.zeros((N, 2), np.float32)
_cache = {}
for s in plan["sfx"]:
    k = SBT[s["s"]]; desde = k.get("desde", 0.0)
    clave = s["s"]
    if clave not in _cache: _cache[clave] = fundido(lee(f"{SB}/{clave}.mp3", desde, k["dur"]), 240)
    pon(efx, _cache[clave], s["en"] - (k["pk"] - desde), db(k.get("obj", -17) + s["db"] - k["peak"]))

# ---------- 6) suma, sonoridad y limitador ----------
mezcla = voz + res + mus + efx
L = lufs(mezcla); g = -14.0 - L
LIMIT = "aresample=192000,alimiter=limit=0.89:level=0:attack=5:release=50,aresample=48000"
tmp = OUT + ".tmp.f32"
mezcla.astype(np.float32).tofile(tmp)
for _ in range(2):  # el limitador baja algo el nivel integrado: se mide ya limitado y se corrige la ganancia
    r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                        "-af", f"volume={g:.2f}dB,{LIMIT},ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True)
    l1 = float([s for s in r.stderr.decode().splitlines() if s.strip().startswith("I:")][-1].split()[1])
    g += -14.0 - l1
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", tmp,
                "-af", f"volume={g:.2f}dB,{LIMIT}", "-c:a", "pcm_s24le", OUT], check=True)
os.remove(tmp)
Lv = lufs(voz); Lmus = lufs(mus[np.abs(mus).max(1) > 1e-5])
print(f"música {Lmus:.1f} LUFS frente a voz {Lv:.1f} (mientras suena: {Lmus - L_voz:+.1f} LU)")
r = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-nostats", "-i", OUT, "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"], capture_output=True)
print("MEZCLA_OK", OUT, f"ganancia {g:+.1f} dB", [s.strip() for s in r.stderr.decode().splitlines() if s.strip().startswith(("I:", "Peak:"))])
