# Compara el audio del corte nuevo con el del antiguo (trans/voz16k.wav) y saca los tramos comunes: para cada tramo del
# nuevo, el desfase d (segundo antiguo = segundo nuevo + d). Lo que falta en el nuevo son trozos que el usuario ha cortado.
# Uso: python3 bin/alinear_corte.py trans/voz16k_nuevo.wav  → trans/mapa_corte.json
import json, sys, numpy as np, wave
def lee(p):
    with wave.open(p) as w:
        return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
SR = 16000
viejo = lee("trans/voz16k.wav"); nuevo = lee(sys.argv[1])
print(f"viejo {len(viejo) / SR:.2f} s · nuevo {len(nuevo) / SR:.2f} s")
W, HOP, LAG = int(1.5 * SR), int(0.25 * SR), int(0.08 * SR)

def ncc(a, b):
    a = a - a.mean(); b = b - b.mean()
    return float((a * b).sum() / (np.sqrt((a * a).sum() * (b * b).sum()) + 1e-9))
def global_(x):
    """mejor desfase del trozo x en todo el audio antiguo (correlación por FFT)"""
    n = 1 << int(np.ceil(np.log2(len(viejo) + len(x))))
    c = np.fft.irfft(np.fft.rfft(viejo, n) * np.conj(np.fft.rfft(x - x.mean(), n)), n)[:len(viejo) - len(x)]
    e = np.sqrt(np.convolve(viejo ** 2, np.ones(len(x)), "valid")[:len(c)] + 1e-9)
    c = c / (e * np.sqrt(((x - x.mean()) ** 2).sum()) + 1e-9)
    k = int(np.argmax(c)); return k, float(c[k])

marcas = []  # (t_nuevo, d, corr)
d = 0
for i in range(0, len(nuevo) - W, HOP):
    x = nuevo[i:i + W]
    if np.sqrt((x ** 2).mean()) < 0.003: continue  # silencio: no informa
    j0 = i + d
    mejor = (-1.0, d)
    if 0 <= j0 - LAG and j0 + LAG + W <= len(viejo):
        seg = viejo[j0 - LAG:j0 + LAG + W]
        for lag in range(-LAG, LAG + 1, 16):
            cc = ncc(x, seg[LAG + lag:LAG + lag + W])
            if cc > mejor[0]: mejor = (cc, d + lag)
    if mejor[0] < 0.85:
        k, cc = global_(x)
        mejor = (cc, k - i)
    if mejor[0] >= 0.85:
        d = mejor[1]
        marcas.append((i / SR, d / SR, mejor[0]))
# tramos con desfase constante (±20 ms)
tramos = []
for t, dd, cc in marcas:
    if tramos and abs(dd - tramos[-1]["d"]) < 0.02:
        tramos[-1]["fin"] = t + W / SR; tramos[-1]["n"] += 1
    else:
        tramos.append(dict(ini=t, fin=t + W / SR, d=dd, n=1))
tramos = [x for x in tramos if x["n"] >= 3]
for x in tramos:
    print(f"nuevo {x['ini']:8.2f}–{x['fin']:8.2f}  ←  viejo {x['ini'] + x['d']:8.2f}–{x['fin'] + x['d']:8.2f}  (d {x['d']:+.3f}, {x['n']} ventanas)")
json.dump(tramos, open("trans/mapa_corte.json", "w"), indent=1)
