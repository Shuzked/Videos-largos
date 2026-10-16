#!/usr/bin/env bash
# Descarga un vídeo a partir de un enlace.
# Uso: scripts/descargar.sh <enlace> <carpeta-destino>
# Google Drive -> gdown, YouTube/Vimeo/etc. -> yt-dlp, Dropbox y enlaces directos -> curl.
set -euo pipefail

url="$1"
dest="$2"
mkdir -p "$dest"

case "$url" in
  *drive.google.com*|*docs.google.com*)
    gdown --fuzzy "$url" -O "$dest/" ;;
  *dropbox.com*)
    # dl=1 fuerza la descarga directa en lugar de la página de vista previa.
    direct="$(echo "$url" | sed -E 's/([?&])dl=0/\1dl=1/')"
    case "$direct" in *dl=1*) ;; *\?*) direct="$direct&dl=1" ;; *) direct="$direct?dl=1" ;; esac
    (cd "$dest" && curl -fL --retry 3 -OJ "$direct") ;;
  *youtube.com*|*youtu.be*|*vimeo.com*)
    yt-dlp --js-runtimes node -f "bv*+ba/b" --merge-output-format mp4 -o "$dest/%(title)s.%(ext)s" "$url" ;;
  *)
    (cd "$dest" && curl -fL --retry 3 -OJ "$url") ;;
esac

ls -la "$dest"
