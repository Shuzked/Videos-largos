#!/usr/bin/env python3
"""Etalonaje profesional de la cámara de Álvaro, medido sobre su piel (v3).

Mide 14 fotogramas: piel en las mejillas (posición de cara.json), negros, altas luces y saturación,
y construye un filtro ffmpeg con objetivos de colorista:
  - piel (luma Rec.709 codificada) ≈ 0,60, saturación de piel ≈ 0,27, tono de piel 15-22°
  - negros (p0,5) ≈ 0,022 con detalle; altas luces con hombro suave (blanco máx. 0,90-0,93, nada quemado)
  - fondos fríos/neón (azules, cianes, magentas) se calman aparte si la imagen está muy saturada
  - balance de blancos parcial: corrige dominantes sin quitar la calidez de la escena
Aplica el filtro, vuelve a medir y corrige una segunda vez (bucle cerrado).
Uso: etalonaje.py <video> <cara.json> [--json]
"""
import json, math, subprocess, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from medir_piel import medir  # noqa: E402

PIEL_Y = 0.60
PIEL_SAT = 0.27
NEGRO = 0.022
SAT_GLOBAL_MAX = 0.36
WB_PARCIAL = 0.35


def curva(gamma, negro, techo):
    # potencia suave para llevar la piel a su nivel + hombro en altas luces + negros levantados
    xs = [0.06, 0.15, 0.3, 0.45, 0.6, 0.75, 0.88]
    pts = [(0.0, negro)]
    for x in xs:
        y = x ** gamma
        if y > 0.72:  # hombro: las altas luces se recogen poco a poco
            y = 0.72 + (y - 0.72) * 0.62
        y = negro + y * (1 - negro / 0.9) if x < 0.2 else y
        pts.append((x, min(techo, y)))
    pts.append((1.0, techo))
    # monótona
    out = [pts[0]]
    for x, y in pts[1:]:
        out.append((x, max(y, out[-1][1] + 0.004)))
    return ' '.join(f'{x:.3f}/{min(y, 1):.3f}' for x, y in out)


def construir(m, ajuste):
    r, g, b = m['rgb_medios']
    gris = (r + g + b) / 3
    gan = [min(1.1, max(0.92, 1 + WB_PARCIAL * (gris / max(c, 1e-3) - 1))) for c in (r, g, b)]
    # exposición de la piel → gamma (limitado a ±0,2 de cambio de nivel)
    py = min(0.95, max(0.2, m['piel_Y']))
    obj = min(py + 0.12, max(py - 0.22, ajuste['piel_obj']))
    gamma = math.log(obj) / math.log(py)
    gamma = min(1.9, max(0.7, gamma))
    negro = max(0.0, NEGRO - m['y_p05'])
    techo = 0.93 if m['y_p999'] < 0.85 else 0.905
    # saturación: la de la piel manda; los fondos fríos se calman aparte si la imagen está muy saturada
    s = ajuste['sat']
    frios = max(0.0, min(0.45, (m['sat'] * s - SAT_GLOBAL_MAX) * 2.2))
    f = (f"colorchannelmixer=rr={gan[0]:.4f}:gg={gan[1]:.4f}:bb={gan[2]:.4f},"
         f"curves=master='{curva(gamma, negro, techo)}',eq=saturation={s:.3f}")
    if frios > 0.02:
        f += f",huesaturation=saturation={-frios:.3f}:colors=c+b+m:strength=1.5"
    return f, {'ganancias': [round(x, 4) for x in gan], 'gamma': round(gamma, 3), 'negro': round(negro, 3), 'techo': techo, 'saturacion': round(s, 3), 'frios': round(frios, 3)}


def medir_filtrado(video, cara, filtro):
    tmp = f'/tmp/etal_{os.getpid()}.mp4'
    # 14 fotogramas filtrados (los mismos instantes) para volver a medir
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], capture_output=True, text=True).stdout)
    P = json.load(open(cara))
    n = 14
    ts = [min(dur, len(P) / 10) * (k + 0.5) / n for k in range(n)]
    partes = []
    for k, t in enumerate(ts):
        p = f'/tmp/etal_{os.getpid()}_{k}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', video, '-frames:v', '1', '-vf', f'{filtro},scale=540:-2', p], check=True)
        partes.append(p)
    # vídeo de 14 fotogramas con los instantes "re-mapeados" para reutilizar medir()
    lista = f'/tmp/etal_{os.getpid()}.txt'
    with open(lista, 'w') as fh:
        for p in partes:
            fh.write(f"file '{p}'\nduration {min(dur, len(P) / 10) / n:.3f}\n")
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-vf', 'fps=10,format=yuv444p', '-c:v', 'libx264', '-crf', '4', tmp], check=True)
    m = medir(tmp, cara)
    for p in partes + [lista, tmp]:
        os.remove(p)
    return m


def etalonar(video, cara):
    m0 = medir(video, cara)
    ajuste = {'piel_obj': PIEL_Y, 'sat': min(1.3, max(0.72, PIEL_SAT / max(m0['piel_sat'], 0.05)))}
    f, info = construir(m0, ajuste)
    m1 = medir_filtrado(video, cara, f)
    # segunda pasada: corrige lo que falte en piel (nivel y saturación)
    ajuste['piel_obj'] = ajuste['piel_obj'] + (PIEL_Y - m1['piel_Y'])
    ajuste['sat'] = min(1.35, max(0.7, ajuste['sat'] * (PIEL_SAT / max(m1['piel_sat'], 0.05)) ** 0.8))
    f, info = construir(m0, ajuste)
    m2 = medir_filtrado(video, cara, f)
    return {'antes': m0, 'despues': m2, 'ajustes': info, 'filtro': f}


if __name__ == '__main__':
    r = etalonar(sys.argv[1], sys.argv[2])
    print(json.dumps(r, ensure_ascii=False) if '--json' in sys.argv else r['filtro'])
