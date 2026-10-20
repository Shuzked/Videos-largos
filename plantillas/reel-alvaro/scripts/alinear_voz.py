#!/usr/bin/env python3
"""Desfase entre la voz de cámara y una voz entregada aparte (p. ej. MP3 mejorado por el cliente).
Uso: alinear_voz.py <voz_camara> <voz_nueva>  → desfase en ms (positivo = la nueva va retrasada; recórtalo con atrim=start=…).
Mide en tres puntos (2 s, 40 s, 60 s) para descartar deriva. Los MP3 del cliente llegan ~50,8 ms retrasados (relleno del codificador)."""
import subprocess, sys, numpy as np
SR = 8000
def pcm(f, ss, t):
    o = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(ss), '-t', str(t), '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(o, np.float32)
def lag(a, b):  # segundos que b va retrasado respecto a a
    n = 1 << int(np.ceil(np.log2(len(a) + len(b))))
    c = np.fft.irfft(np.fft.rfft(b, n) * np.conj(np.fft.rfft(a, n)), n)
    k = int(np.argmax(c)); k = k - n if k > n // 2 else k
    return k / SR, c.max() / (np.linalg.norm(a) * np.linalg.norm(b))
ref, new = sys.argv[1], sys.argv[2]
for ss in (2, 40, 60):
    d, q = lag(pcm(ref, ss, 15), pcm(new, ss, 15))
    print(f'  t={ss:>2}s desfase={d*1000:+.1f} ms  corr={q:.2f}')
