#!/usr/bin/env python3
"""Busca y descarga vídeo, música y efectos de sonido gratuitos y sin marca de agua.

Uso:
  scripts/stock.py buscar "<términos en inglés>" [--tipo video|musica|efectos] [--fuente <nombre>|todas] [-n 5]
  scripts/stock.py bajar <url> <carpeta>

Fuentes:
  video:   pixabay (necesita PIXABAY_API_KEY), coverr, mixkit
  musica:  mixkit-musica, incompetech (atribución obligatoria)
  efectos: mixkit-efectos

`buscar` imprime una línea JSON por resultado: fuente, url, pagina, licencia.
Guarda siempre la fuente y la licencia de lo que uses para los créditos del vídeo.
"""
import argparse
import json
import os
import re
import sys
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (videos-largos; +https://github.com/Shuzked/Videos-largos)"


def get(url, params=None):
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def url_segura(u):
    """Codifica espacios y otros caracteres del path (NASA los incluye sin codificar)."""
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit(p._replace(path=urllib.parse.quote(urllib.parse.unquote(p.path))))


def unicos(urls):
    vistos = []
    for u in urls:
        if u not in vistos:
            vistos.append(u)
    return vistos


def mixkit(q, n):
    slug = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")
    html = get(f"https://mixkit.co/free-stock-video/{slug}/")
    # La página solo enlaza previsualizaciones; 720p es la mayor resolución descargable directamente.
    ids = unicos(re.findall(r"https://assets\.mixkit\.co/videos/(\d+)/\1-\d+\.mp4", html))
    for vid in ids[:n]:
        yield {"fuente": "mixkit", "url": f"https://assets.mixkit.co/videos/{vid}/{vid}-720.mp4",
               "pagina": f"https://mixkit.co/free-stock-video/{slug}/",
               "licencia": "Mixkit Free License (sin atribución)"}


def coverr(q, n):
    html = get("https://coverr.co/s", {"q": q})
    clips = unicos(re.findall(r"https://cdn\.coverr\.co/videos/([^/\"]+)/\d+p\.mp4", html))
    # Los clips premium y los "temp/watermarked" llevan marca de agua: fuera.
    clips = [c for c in clips if not re.search(r"premium|watermark|-temp-", c)]
    for c in clips[:n]:
        yield {"fuente": "coverr", "url": f"https://cdn.coverr.co/videos/{c}/1080p.mp4",
               "pagina": f"https://coverr.co/stock-video-footage/{c.removeprefix('coverr-')}",
               "licencia": "Coverr License (gratis, sin atribución)"}






def pixabay(q, n):
    clave = os.environ.get("PIXABAY_API_KEY")
    if not clave:
        raise RuntimeError("falta la variable de entorno PIXABAY_API_KEY")
    data = json.loads(get("https://pixabay.com/api/videos/", {"key": clave, "q": q, "per_page": max(n, 3)}))
    for h in data["hits"][:n]:
        v = h["videos"]
        mejor = next(v[t] for t in ("large", "medium", "small", "tiny") if v.get(t, {}).get("url"))
        yield {"fuente": "pixabay", "url": mejor["url"], "pagina": h["pageURL"],
               "licencia": f"Pixabay Content License (sin atribución) — {h['user']}"}




def mixkit_musica(q, n):
    slug = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")
    html = get(f"https://mixkit.co/free-stock-music/tag/{slug}/")
    for mid in unicos(re.findall(r"https://assets\.mixkit\.co/music/(\d+)/\1\.mp3", html))[:n]:
        yield {"fuente": "mixkit-musica", "url": f"https://assets.mixkit.co/music/{mid}/{mid}.mp3",
               "pagina": f"https://mixkit.co/free-stock-music/tag/{slug}/",
               "licencia": "Mixkit Free License (sin atribución)"}


def mixkit_efectos(q, n):
    slug = re.sub(r"[^a-z0-9]+", "-", q.lower()).strip("-")
    html = get(f"https://mixkit.co/free-sound-effects/{slug}/")
    for sid in unicos(re.findall(r"https://assets\.mixkit\.co/active_storage/sfx/(\d+)/\1-preview\.mp3", html))[:n]:
        yield {"fuente": "mixkit-efectos", "url": f"https://assets.mixkit.co/active_storage/sfx/{sid}/{sid}-preview.mp3",
               "pagina": f"https://mixkit.co/free-sound-effects/{slug}/",
               "licencia": "Mixkit Free License (sin atribución)"}


def incompetech(q, n):
    piezas = json.loads(get("https://incompetech.com/music/royalty-free/pieces.json"))
    palabras = q.lower().split()
    def texto(p):
        return " ".join(str(p.get(k) or "") for k in ("title", "feel", "description", "instruments")).lower()
    # Primero las que contienen todas las palabras, luego las que contienen alguna.
    todas = [p for p in piezas if all(w in texto(p) for w in palabras)]
    alguna = [p for p in piezas if p not in todas and any(w in texto(p) for w in palabras)]
    for p in (todas + alguna)[:n]:
        yield {"fuente": "incompetech",
               "url": "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + urllib.parse.quote(p["filename"]),
               "pagina": "https://incompetech.com/music/royalty-free/music.html",
               "duracion": p.get("length"), "estilo": p.get("feel"),
               "licencia": f'CC BY 4.0 — ATRIBUCIÓN OBLIGATORIA: "{p["title"]}" Kevin MacLeod (incompetech.com), '
                           "Licensed under Creative Commons: By Attribution 4.0 License"}


FUENTES = {
    "video": {"pixabay": pixabay, "coverr": coverr, "mixkit": mixkit},
    "musica": {"mixkit-musica": mixkit_musica, "incompetech": incompetech},
    "efectos": {"mixkit-efectos": mixkit_efectos},
}
POR_DEFECTO = {
    "video": ["pixabay", "coverr", "mixkit"],
    "musica": ["mixkit-musica", "incompetech"],
    "efectos": ["mixkit-efectos"],
}
TODAS = {nombre: f for grupo in FUENTES.values() for nombre, f in grupo.items()}


def buscar(args):
    nombres = POR_DEFECTO[args.tipo] if args.fuente == "todas" else [args.fuente]
    for nombre in nombres:
        try:
            for r in TODAS[nombre](args.q, args.n):
                print(json.dumps(r, ensure_ascii=False))
        except Exception as e:  # una fuente caída no debe tumbar las demás
            print(f"[{nombre}] error: {e}", file=sys.stderr)


def bajar(args):
    os.makedirs(args.carpeta, exist_ok=True)
    nombre = urllib.parse.unquote(urllib.parse.urlparse(args.url).path.rstrip("/").split("/")[-1])
    if "coverr.co" in args.url:  # todos se llaman 1080p.mp4
        nombre = args.url.split("/")[-2] + ".mp4"
    destino = os.path.join(args.carpeta, nombre)
    req = urllib.request.Request(args.url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=300) as r, open(destino, "wb") as f:
        while bloque := r.read(1 << 20):
            f.write(bloque)
    print(destino)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("buscar")
    b.add_argument("q")
    b.add_argument("--tipo", default="video", choices=list(FUENTES))
    b.add_argument("--fuente", default="todas", choices=["todas", *TODAS])
    b.add_argument("-n", type=int, default=5)
    b.set_defaults(func=buscar)
    d = sub.add_parser("bajar")
    d.add_argument("url")
    d.add_argument("carpeta")
    d.set_defaults(func=bajar)
    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
