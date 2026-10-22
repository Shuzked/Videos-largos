#!/bin/bash
# Render largo de Remotion por trozos: un proceso nuevo por trozo y la caché de vídeo limitada, para que la memoria no se
# acumule (el contenedor se reinicia si pasa de ~11 GB). Se retoma tras un reinicio: los trozos ya hechos no se repiten.
# Al final une los trozos sin recomprimir.
# Uso: scripts/render_trozos.sh <dir_proyecto_remotion> <composición> <salida.mp4> <nº_fotogramas> [opciones de remotion…]
#   p. ej. scripts/render_trozos.sh trabajo/x/remotion Taxi trabajo/x/entregas/final.mp4 16033 --crf=16
set -e
P=$(realpath "$1"); COMP=$2; SAL=$(realpath -m "$3"); N=$4; shift 4
TROZO=${TROZO:-3000}
D=${SAL%.mp4}_trozos; mkdir -p "$D"
cd "$P"
for ((a = 0; a < N; a += TROZO)); do
  b=$((a + TROZO - 1)); [ $b -ge $N ] && b=$((N - 1))
  o=$D/$(printf %06d $a).mp4
  [ -s "$o" ] && continue
  nice -n 3 npx remotion render src/index.ts "$COMP" "$o.tmp.mp4" --frames=$a-$b --concurrency=3 \
    --offthreadvideo-cache-size-in-bytes=1500000000 "$@" 2>&1 | grep -vE "Detected differing|Memory reported|inadvertently|Using the lower" > "$D/log_$a.txt"
  [ -s "$o.tmp.mp4" ] || { echo "TROZO_FALLO $a (mira $D/log_$a.txt)"; tail -20 "$D/log_$a.txt"; exit 1; }
  mv "$o.tmp.mp4" "$o"; echo "TROZO $a-$b $(date +%T)"
done
ls "$D"/*.mp4 | grep -v '\.tmp\.mp4$' | sed "s|^|file '|;s|$|'|" > "$D/lista.txt"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$D/lista.txt" -c copy "$SAL"
echo "RENDER_OK $SAL"
