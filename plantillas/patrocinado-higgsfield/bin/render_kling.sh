#!/bin/bash
# Render del vídeo de Kling por trozos (un proceso por trozo para que la memoria no se acumule; se retoma tras un
# reinicio) + la mezcla de audio. Uso: bin/render_kling.sh <salida.mp4> <escala> <crf> [trozo]
#   revisión rápida: bin/render_kling.sh final/revision.mp4 0.5 26 · final: bin/render_kling.sh final/Kling4-FINAL-v1.mp4 1 16
set -e
cd /home/user/videos-largos/trabajo/kling4
SAL=$(realpath -m "$1"); ESC=$2; CRF=$3; TROZO=${4:-1800}
N=$(node -e "console.log(Math.round(require('./remotion/src/kling/edl.json').dur*30))")
D=${SAL%.mp4}_trozos; mkdir -p "$D"
[ -d bundle ] || node bin/empaquetar.cjs
for ((a = 0; a < N; a += TROZO)); do
  b=$((a + TROZO - 1)); [ $b -ge $N ] && b=$((N - 1))
  o=$D/$(printf %06d $a).mp4
  [ -s "$o" ] && continue
  rm -rf /tmp/remotion-*-assets* /tmp/react-motion-render* 2>/dev/null || true
  node bin/render.cjs "$o.tmp.mp4" $a $b $ESC $CRF 2>&1 | grep -vE "Detected differing|Memory reported|inadvertently|Using the lower" > "$D/log_$a.txt" || true
  [ -s "$o.tmp.mp4" ] && grep -q TROZO_OK "$D/log_$a.txt" || { echo "TROZO_FALLO $a"; tail -20 "$D/log_$a.txt"; exit 1; }
  mv "$o.tmp.mp4" "$o"; echo "TROZO $a-$b $(date +%T)"
done
rm -rf /tmp/remotion-*-assets* /tmp/react-motion-render* 2>/dev/null || true
ls "$D"/*.mp4 | grep -v '\.tmp\.mp4$' | sed "s|^|file '|;s|$|'|" > "$D/lista.txt"
ffmpeg -nostdin -v error -y -f concat -safe 0 -i "$D/lista.txt" -i final/mezcla.wav -map 0:v -map 1:a -c:v copy -af apad \
  -map_metadata -1 -c:a aac -b:a 256k -shortest -movflags +faststart "$SAL"
echo "RENDER_OK $SAL $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SAL")"
