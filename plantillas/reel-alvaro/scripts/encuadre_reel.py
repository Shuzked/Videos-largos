# Encuadre automático de todo el B-roll de un reel: lee la lista BROLL de src/<reel>/Reel.tsx y genera src/<reel>/encuadre.json
# Uso (desde el proyecto Remotion): python3 encuadre_reel.py <reel>   p. ej. a2
import json, re, subprocess, sys, os, tempfile
n = sys.argv[1]
s = open(f'src/{n}/Reel.tsx').read()
blk = s[s.index('const BROLL: B[] = ['):]
blk = blk[:blk.index('];')]
clips = []
for m in re.finditer(r"\{src: '([^']+)', a: ([\d.]+), b: ([\d.]+)(?:, etiqueta: .*?)?, desde: ([\d.]+), foco: [\d.]+(, vertical: true)?\}", blk):
    src, a, b, desde, vert = m.groups()
    if vert:
        continue
    clips.append({'src': src, 'ruta': f'public/{n}/broll/{src}.mp4', 'desde': float(desde), 'dur': round(float(b) - float(a), 2)})
tmp = tempfile.mktemp(suffix='.json')
json.dump(clips, open(tmp, 'w'))
here = os.path.dirname(os.path.abspath(__file__))
subprocess.run(['python3', f'{here}/encuadre.py', tmp, f'src/{n}/encuadre.json'], check=False)
print(n, len(clips), 'clips')
