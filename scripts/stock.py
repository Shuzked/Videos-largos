#!/usr/bin/env python3
"""Busca y descarga vídeo de stock gratuito sin clave de API.

Uso:
  scripts/stock.py buscar "<términos en inglés>" [--fuente pixabay|coverr|mixkit|archive|wikimedia|todas] [-n 5]
  scripts/stock.py bajar <url> <carpeta>

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
    for c in clips[:n]:
        yield {"fuente": "coverr", "url": f"https://cdn.coverr.co/videos/{c}/1080p.mp4",
               "pagina": f"https://coverr.co/stock-video-footage/{c.removeprefix('coverr-')}",
               "licencia": "Coverr License (gratis, sin atribución)"}


def wikimedia(q, n):
    data = json.loads(get("https://commons.wikimedia.org/w/api.php", {
        "action": "query", "format": "json", "generator": "search", "gsrnamespace": 6,
        "gsrsearch": f"{q} filetype:video", "gsrlimit": n,
        "prop": "imageinfo", "iiprop": "url|extmetadata"}))
    for p in data.get("query", {}).get("pages", {}).values():
        info = p["imageinfo"][0]
        meta = info.get("extmetadata", {})
        lic = meta.get("LicenseShortName", {}).get("value", "ver página")
        autor = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()
        yield {"fuente": "wikimedia", "url": info["url"], "pagina": info["descriptionurl"],
               "licencia": f"{lic} — {autor}" if autor else lic}


def archive(q, n):
    data = json.loads(get("https://archive.org/advancedsearch.php", {
        "q": f"({q}) AND mediatype:movies AND licenseurl:*publicdomain*",
        "fl[]": "identifier", "rows": n, "output": "json"}))
    for d in data["response"]["docs"]:
        ident = d["identifier"]
        files = json.loads(get(f"https://archive.org/metadata/{ident}"))["files"]
        mp4 = [f for f in files if f["name"].lower().endswith(".mp4")]
        if not mp4:
            continue
        mejor = max(mp4, key=lambda f: int(f.get("size", 0)))
        yield {"fuente": "archive",
               "url": f"https://archive.org/download/{ident}/{urllib.parse.quote(mejor['name'])}",
               "pagina": f"https://archive.org/details/{ident}", "licencia": "Dominio público"}


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


FUENTES = {"pixabay": pixabay, "mixkit": mixkit, "coverr": coverr, "wikimedia": wikimedia, "archive": archive}
# Wikimedia limita las descargas desde servidores en la nube (HTTP 429): solo bajo petición.
POR_DEFECTO = ["pixabay", "coverr", "mixkit", "archive"]


def buscar(args):
    nombres = POR_DEFECTO if args.fuente == "todas" else [args.fuente]
    for nombre in nombres:
        try:
            for r in FUENTES[nombre](args.q, args.n):
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
    b.add_argument("--fuente", default="todas", choices=["todas", *FUENTES])
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
