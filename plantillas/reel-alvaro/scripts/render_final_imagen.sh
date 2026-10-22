#!/bin/bash
# Vuelve a renderizar SOLO la imagen de un reel ya entregado (p. ej. tras corregir márgenes) y le pone el audio del final
# anterior tal cual (ya masterizado: voz limpia + música + efectos; los tiempos no cambian). El final anterior se guarda
# como *_antes.mp4 hasta comprobar el nuevo.
# Uso: render_final_imagen.sh <Comp sin «Reel»> <proyecto> <NOMBRE>    p. ej. A6 a6-evergreen A6_EVERGREEN
set -e
C=$1; P=$2; N=$3; c=$(echo $C | tr A-Z a-z)
R=/home/user/videos-largos/trabajo/intro/remotion-intro; T=/home/user/videos-largos/trabajo
F=$T/$P/final/${N}_final.mp4; A=$T/$P/final/${N}_final_antes.mp4
[ -s $A ] || cp $F $A
cd $R && nice -n 3 npx remotion render Reel$C out/$c-imagen.mp4 --props='{"stem":"sfx"}' --muted --crf=14 --jpeg-quality=95 --concurrency=2 \
  --offthreadvideo-cache-size-in-bytes=1200000000 --media-cache-size-in-bytes=800000000 --timeout=120000 --log=error 2>&1 | grep -v "^ *at " | tail -3
[ -s out/$c-imagen.mp4 ] || { echo "ERROR_RENDER_$C"; exit 1; }
dv=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/$c-imagen.mp4); da=$(ffprobe -v error -select_streams a:0 -show_entries stream=duration -of csv=p=0 $A)
ffmpeg -nostdin -v error -y -i out/$c-imagen.mp4 -i $A -map 0:v -map 1:a -c copy -movflags +faststart $F.tmp.mp4 && mv $F.tmp.mp4 $F
rm -f out/$c-imagen.mp4
echo "FINAL_IMAGEN_OK $C (vídeo $dv s, audio $da s) → $F"
