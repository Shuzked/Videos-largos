#!/usr/bin/env bash
# Baja o sube archivos de las Releases del repo usando la API REST de GitHub
# (`gh release` usa GraphQL, que no está disponible en las sesiones en la nube).
#
# Uso:
#   scripts/release.sh bajar <tag> <carpeta>     descarga todos los assets de la release
#   scripts/release.sh subir <tag> <archivo>...  crea la release si no existe y sube los archivos
set -euo pipefail

REPO="Shuzked/Videos-largos"
accion="$1"
tag="$2"
shift 2

case "$accion" in
  bajar)
    dest="$1"
    mkdir -p "$dest"
    gh api "repos/$REPO/releases/tags/$tag" --jq '.assets[] | "\(.id)\t\(.name)"' |
      while IFS=$'\t' read -r id nombre; do
        echo "Descargando $nombre"
        gh api -H "Accept: application/octet-stream" "repos/$REPO/releases/assets/$id" > "$dest/$nombre"
      done
    ls -la "$dest"
    ;;
  subir)
    id="$(gh api "repos/$REPO/releases/tags/$tag" --jq .id 2>/dev/null || true)"
    if [ -z "$id" ]; then
      id="$(gh api -X POST "repos/$REPO/releases" -f tag_name="$tag" -f name="$tag" --jq .id)"
    fi
    for archivo in "$@"; do
      nombre="$(basename "$archivo")"
      echo "Subiendo $nombre"
      gh api -X POST "https://uploads.github.com/repos/$REPO/releases/$id/assets?name=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$nombre")" \
        -H "Content-Type: application/octet-stream" --input "$archivo" --jq .browser_download_url
    done
    ;;
  *)
    echo "Acción desconocida: $accion (usa bajar o subir)" >&2
    exit 1
    ;;
esac
