#!/bin/bash
# Sustituye la voz de reels ya entregados por la voz limpia nueva (MP3 del cliente), sin volver a renderizar la imagen:
# desfase medido contra la voz de cámara -> voz-cliente.wav alineada -> stem de efectos (solo audio) -> master.sh (copy)
R=/home/user/videos-largos/trabajo/intro/remotion-intro; T=/home/user/videos-largos/trabajo; V=$T/voces-limpias
AL=/home/user/videos-largos/plantillas/reel-alvaro/scripts/alinear_voz.py
while read -u 3 C P N MP3; do
  [ -z "$C" ] && continue
  c=$(echo $C | tr A-Z a-z); cd $T/$P || continue
  python3 $AL trabajo/voz-original.mka $V/$MP3 > trabajo/alinear_limpia.txt 2>&1
  OFF=$(python3 -c "
import re,statistics
v=[(float(a),float(b)) for a,b in re.findall(r'desfase=([+-][0-9.]+) ms  corr=([0-9.]+)',open('trabajo/alinear_limpia.txt').read())]
v=[a for a,b in v if b>0.5]
print(round(statistics.median(v),2) if v else 'NA')")
  [ "$OFF" = NA ] && { echo "$N ERROR_ALINEAR"; cat trabajo/alinear_limpia.txt; continue; }
  [ -s trabajo/voz-cliente-anterior.wav ] || cp trabajo/voz-cliente.wav trabajo/voz-cliente-anterior.wav
  if python3 -c "import sys; sys.exit(0 if $OFF >= 0 else 1)"; then AF="atrim=start=$(python3 -c "print($OFF/1000)"),asetpts=PTS-STARTPTS"
  else AF="adelay=$(python3 -c "print(abs($OFF))"):all=1"; fi
  ffmpeg -nostdin -v error -y -i $V/$MP3 -af "$AF" -ar 48000 -c:a pcm_s24le trabajo/voz-cliente.wav
  RES=$(python3 $AL trabajo/voz-original.mka trabajo/voz-cliente.wav 2>&1 | grep -o "desfase=[+-][0-9.]* ms" | tr '\n' ' ')
  cd $R && npx remotion render Reel$C out/$c-efectos.wav --codec=wav --props='{"stem":"efectos"}' --concurrency=2 --timeout=120000 --log=error 2>&1 < /dev/null | grep -v "^ *at " | tail -2
  [ -s out/$c-efectos.wav ] || { echo "$N ERROR_EFECTOS"; continue; }
  F=$T/$P/final/${N}_final.mp4; ANT=$T/$P/final/${N}_final_voz-anterior.mp4
  [ -s $ANT ] || mv $F $ANT
  ffmpeg -nostdin -v error -y -i $ANT -i out/$c-efectos.wav -map 0:v -map 1:a -c:v copy -c:a pcm_s16le out/$c-remux.mkv || { echo "$N ERROR_MUX"; continue; }
  cd $T/$P && ./master.sh $R/out/$c-remux.mkv final/${N}_final.mp4 copy > trabajo/master_limpia.log 2>&1 < /dev/null || { echo "$N ERROR_MASTER"; continue; }
  rm -f $R/out/$c-efectos.wav $R/out/$c-remux.mkv
  M=$(ffmpeg -i final/${N}_final.mp4 -af ebur128=framelog=quiet:peak=true -vn -f null - 2>&1 | grep -E "^\s+(I|Peak):" | awk '{print $2}' | tr '\n' ' ')
  D1=$(ffprobe -v error -show_entries format=duration -of csv=p=0 final/${N}_final.mp4); D0=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $ANT)
  SY=$(python3 $AL trabajo/voz-original.mka final/${N}_final.mp4 2>&1 | grep -o "desfase=[+-][0-9.]* ms  corr=[0-9.]*" | sed 's/desfase=//; s/  corr=/@/' | tr '\n' ' ')
  echo "$N | MP3 desfase ${OFF} ms -> residual: $RES | I/pico: $M | dur $D1 (antes $D0) | sync final vs cámara: $SY"
done 3<&0 < /dev/null
echo REMEZCLA_FIN
