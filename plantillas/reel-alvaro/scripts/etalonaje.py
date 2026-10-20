#!/usr/bin/env python3
"""Etalonaje automático y prudente de la cámara de Álvaro (vídeos 4K 9:16).

Analiza ~16 fotogramas del vídeo y devuelve un filtro ffmpeg que:
  1. corrige solo parte de la dominante de color (balance de blancos parcial, la escena sigue cálida),
  2. levanta un poco los negros aplastados, deja los medios y recoge las altas luces con un hombro suave (sin brillos excesivos),
  3. baja la saturación hasta un nivel natural (sin pasar de -30 %), sin tocar el tono.
Uso: etalonaje.py <video> [--json]   → imprime el filtro (o un JSON con medidas y filtro).
"""
import json, subprocess, sys
import numpy as np

SAT_OBJ = 0.31     # saturación media objetivo (HSV, píxeles con luz; eq rinde un poco por encima)
NEGRO_OBJ = 0.022  # nivel del 0,5 % más oscuro tras el etalonaje
WB_PARCIAL = 0.35  # cuánto se corrige la dominante (0 = nada, 1 = neutro total)


def muestras(video, n=16, ancho=270):
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout)
    fr = []
    for k in range(n):
        t = dur * (k + 0.5) / n
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', f'scale={ancho}:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        h = len(raw) // (ancho * 3)
        fr.append(np.frombuffer(raw, np.uint8).reshape(h, ancho, 3))
    return np.concatenate([f.reshape(-1, 3) for f in fr]).astype(np.float64) / 255


def medir(a):
    y = 0.2126 * a[:, 0] + 0.7152 * a[:, 1] + 0.0722 * a[:, 2]
    mx, mn = a.max(1), a.min(1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    luz = mx > 0.15
    medios = (y > 0.12) & (y < 0.7) & (sat < 0.45)
    return {
        'y_p05': float(np.percentile(y, 0.5)), 'y_p50': float(np.percentile(y, 50)), 'y_p995': float(np.percentile(y, 99.5)),
        'sat': float(sat[luz].mean()) if luz.any() else 0.0,
        'rgb_medios': [float(v) for v in (a[medios].mean(0) if medios.any() else a.mean(0))],
    }


def filtro(m):
    # 1) balance de blancos parcial (ganancias por canal hacia el gris de los medios)
    r, g, b = m['rgb_medios']
    gris = (r + g + b) / 3
    gan = [1 + WB_PARCIAL * (gris / max(c, 1e-3) - 1) for c in (r, g, b)]
    gan = [min(1.12, max(0.9, x)) for x in gan]
    # 2) curva de tono: negros levantados suavemente, medios igual y hombro suave en las altas luces
    #    (los brillos de piel y reflejos se recogen para que la imagen no se vea "brillosa"; más cuanto más alto llega el material)
    negro = max(0.0, NEGRO_OBJ - m['y_p05'])
    techo = 0.93 if m['y_p995'] < 0.85 else 0.90  # blanco máximo tras el hombro
    pts = [(0, negro), (0.06, 0.06 + negro * 0.55), (0.25, 0.235), (0.5, 0.485), (0.7, 0.655), (0.85, 0.765), (1, techo)]
    curva = ' '.join(f'{x:.3f}/{y:.3f}' for x, y in pts)
    # 3) saturación hacia el objetivo, sin quitar más de un 30 % ni añadir
    s = min(1.0, max(0.7, SAT_OBJ / max(m['sat'], 1e-3)))
    return (f"colorchannelmixer=rr={gan[0]:.4f}:gg={gan[1]:.4f}:bb={gan[2]:.4f},"
            f"curves=master='{curva}',eq=saturation={s:.3f}"), {'ganancias': gan, 'curva': curva, 'saturacion': s}


if __name__ == '__main__':
    m = medir(muestras(sys.argv[1]))
    f, info = filtro(m)
    print(json.dumps({'medidas': m, 'ajustes': info, 'filtro': f}, ensure_ascii=False) if '--json' in sys.argv else f)
