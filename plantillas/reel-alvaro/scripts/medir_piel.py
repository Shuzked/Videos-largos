#!/usr/bin/env python3
"""Mide la imagen como un colorista: piel de Álvaro (en las mejillas, con la posición de cara.json), negros, blancos y saturación.
Uso: medir_piel.py <video> <cara.json> [desplazamiento_s]   → JSON
"""
import json, subprocess, sys, colorsys
import numpy as np

def fotogramas(video, ts, w=540):
    out = []
    for t in ts:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', f'scale={w}:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        h = len(raw) // (w * 3)
        out.append(np.frombuffer(raw, np.uint8).reshape(h, w, 3).astype(np.float64) / 255)
    return out

def Y(a):
    return 0.2126 * a[:, 0] + 0.7152 * a[:, 1] + 0.0722 * a[:, 2]

def medir(video, cara_json, n=14):
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout)
    P = json.load(open(cara_json))
    ts = [min(dur, len(P) / 10) * (k + 0.5) / n for k in range(n)]
    F = fotogramas(video, ts)
    piel, todo = [], []
    for f, t in zip(F, ts):
        i = min(len(P) - 1, int(t * 10))
        x, y = P[i][1], P[i][2]
        s = f.shape[1] / 1080
        for dx in (-52, 52):  # mejilla izquierda y derecha
            cx, cy = int((x + dx) * s), int((y + 48) * s)
            piel.append(f[max(0, cy - 8):cy + 8, max(0, cx - 10):cx + 10].reshape(-1, 3))
        todo.append(f.reshape(-1, 3))
    p = np.concatenate(piel); a = np.concatenate(todo)
    hsv = np.array([colorsys.rgb_to_hsv(*c) for c in p])
    mx, mn = a.max(1), a.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    luz = mx > 0.15
    medios = (Y(a) > 0.12) & (Y(a) < 0.7) & (sat < 0.45)
    return {
        'piel_Y': float(np.median(Y(p))), 'piel_sat': float(np.median(hsv[:, 1])), 'piel_hue': float(np.median(hsv[:, 0]) * 360),
        'y_p05': float(np.percentile(Y(a), 0.5)), 'y_p50': float(np.percentile(Y(a), 50)), 'y_p995': float(np.percentile(Y(a), 99.5)), 'y_p999': float(np.percentile(Y(a), 99.9)),
        'sat': float(sat[luz].mean()) if luz.any() else 0.0,
        'rgb_medios': [float(v) for v in (a[medios].mean(0) if medios.any() else a.mean(0))],
    }

if __name__ == '__main__':
    print(json.dumps({k: round(v, 3) if isinstance(v, float) else [round(x, 3) for x in v] for k, v in medir(sys.argv[1], sys.argv[2]).items()}))
