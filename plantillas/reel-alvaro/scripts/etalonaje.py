#!/usr/bin/env python3
"""Etalonaje de la cámara de Álvaro igualado al look de referencia (A3 1E, el que eligió el cliente).

La referencia está medida en `plantillas/reel-alvaro/referencia_color.json` (piel en las mejillas, negros,
altas luces, saturación). Para cada vídeo se miden 14 fotogramas y se construye un filtro ffmpeg que lleva:
  - la exposición de la piel al nivel de la referencia (curva de potencia suave),
  - los negros al nivel de la referencia (con detalle, sin aplastar),
  - las altas luces como mucho al nivel de la referencia (hombro suave solo si el material viene más brillante),
  - la saturación de la piel a la de la referencia, sin pasar de la saturación global de la referencia
    (si sobra saturación en fondos fríos/neón, se calman aparte sin tocar la piel),
  - el balance de blancos parcialmente hacia la neutralidad de la referencia (conserva la calidez de cada escena).
Aplica el filtro, vuelve a medir y corrige una segunda vez (bucle cerrado).
Uso: etalonaje.py <video> <cara.json> [--json]
"""
import json, math, subprocess, sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from medir_piel import medir  # noqa: E402

REF = json.load(open(os.path.join(AQUI, '..', 'referencia_color.json')))
WB_PARCIAL = 0.35
SAT_MAX = REF['sat'] + 0.02          # saturación global como mucho la de la referencia (+ margen)
PIEL_SAT_MIN = REF['piel_sat'] - 0.04  # la piel nunca por debajo de esto


def curva(gamma, negro, hombro, techo):
    xs = [0.06, 0.15, 0.3, 0.45, 0.6, 0.72, 0.84, 0.93]
    pts = [(0.0, negro)]
    for x in xs:
        y = x ** gamma
        if y > hombro:  # hombro: las altas luces se recogen poco a poco
            y = hombro + (y - hombro) * 0.55
        if x < 0.2:  # pie: negros levantados lo justo, fundiéndose con la curva
            y = negro * (1 - x / 0.2) + y * (x / 0.2) if y < negro + x else y
        pts.append((x, min(techo, y)))
    pts.append((1.0, techo))
    out = [pts[0]]
    for x, y in pts[1:]:
        out.append((x, max(y, out[-1][1] + 0.004)))
    return ' '.join(f'{x:.3f}/{min(y, 1):.3f}' for x, y in out)


def construir(m, aj):
    # balance sobre la piel (no sobre el fondo): solo si el tono de piel se aparta del de la referencia;
    # cada escena conserva su luz. Piel más amarilla → baja un poco el verde; más roja/magenta → lo sube.
    dh = max(-8.0, min(8.0, m['piel_hue'] - REF['piel_hue']))
    gan = [1.0, 1.0 - 0.004 * dh if abs(dh) > 2 else 1.0, 1.0]
    # exposición de la piel → gamma (sin cambiar más de ±0,2 el nivel de la piel)
    py = min(0.95, max(0.2, m['piel_Y']))
    obj = min(py + 0.14, max(py - 0.24, aj['piel_obj']))
    gamma = min(1.9, max(0.7, math.log(obj) / math.log(py)))
    negro = max(0.0, REF['y_p05'] + 0.004 - m['y_p05'])
    # altas luces: como mucho las de la referencia; si el material viene más brillante, hombro suave
    y999 = m['y_p999'] ** gamma
    if y999 > REF['y_p999'] + 0.03:
        hombro, techo = 0.68, 0.93
    else:
        hombro, techo = 0.95, 1.0
    s = aj['sat']
    if m['sat'] * s > SAT_MAX:  # saturación sobrante por tonos cálidos: se baja en conjunto sin dejar pálida la piel
        s = max(min(s, SAT_MAX / max(m['sat'], 1e-3)), PIEL_SAT_MIN / max(m['piel_sat'], 0.05))
    frios = 0.0
    if m.get('frac_frios', 0) > 0.06 and m.get('sat_frios', 0) * s > REF['sat_frios'] + 0.12:
        frios = min(0.45, (m['sat_frios'] * s - (REF['sat_frios'] + 0.12)) * 1.8)
    f = (f"colorchannelmixer=rr={gan[0]:.4f}:gg={gan[1]:.4f}:bb={gan[2]:.4f},"
         f"curves=master='{curva(gamma, negro, hombro, techo)}',eq=saturation={s:.3f}")
    if frios > 0.02:
        f += f",huesaturation=saturation={-frios:.3f}:colors=c+b:strength=1"
    return f, {'ganancias': [round(x, 4) for x in gan], 'gamma': round(gamma, 3), 'negro': round(negro, 3), 'hombro': hombro, 'techo': techo, 'saturacion': round(s, 3), 'frios': round(frios, 3)}


def medir_filtrado(video, cara, filtro):
    tmp = f'/tmp/etal_{os.getpid()}.mp4'
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout)
    P = json.load(open(cara))
    n = 14
    base = min(dur, len(P) / 10)
    ts = [base * (k + 0.5) / n for k in range(n)]
    partes = []
    for k, t in enumerate(ts):
        p = f'/tmp/etal_{os.getpid()}_{k}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', f'{filtro},scale=540:-2', p], check=True)
        partes.append(p)
    lista = f'/tmp/etal_{os.getpid()}.txt'
    with open(lista, 'w') as fh:
        for p in partes:
            fh.write(f"file '{p}'\nduration {base / n:.3f}\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-vf', 'fps=10,format=yuv444p', '-c:v', 'libx264', '-crf', '4', tmp], check=True)
    m = medir(tmp, cara)
    for p in partes + [lista, tmp]:
        os.remove(p)
    return m


def etalonar(video, cara):
    m0 = medir(video, cara)
    aj = {'piel_obj': REF['piel_Y'], 'sat': min(1.3, max(0.72, REF['piel_sat'] / max(m0['piel_sat'], 0.05)))}
    f, info = construir(m0, aj)
    m1 = medir_filtrado(video, cara, f)
    # segunda pasada: corrige lo que falte para igualar la piel de la referencia
    aj['piel_obj'] = aj['piel_obj'] + (REF['piel_Y'] - m1['piel_Y'])
    aj['sat'] = min(1.35, max(0.7, aj['sat'] * (REF['piel_sat'] / max(m1['piel_sat'], 0.05)) ** 0.8))
    f, info = construir(m0, aj)
    m2 = medir_filtrado(video, cara, f)
    return {'antes': m0, 'despues': m2, 'referencia': REF, 'ajustes': info, 'filtro': f}


if __name__ == '__main__':
    r = etalonar(sys.argv[1], sys.argv[2])
    print(json.dumps(r, ensure_ascii=False) if '--json' in sys.argv else r['filtro'])
