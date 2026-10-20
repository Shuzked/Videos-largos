#!/bin/bash
# Masteriza el audio del reel: voz tratada + efectos (stem de Remotion) + beat con ducking → -14 LUFS, pico -1 dB
# Uso: master.sh <video_con_stem_sfx.mp4> <salida.mp4> [crf_video|copy]
set -e
cd "$(dirname "$0")"
IN="$1"; OUT="$2"; V="${3:-copy}"
VOZ=original/A1_EVERGREEN.mp4
MUS=../musica-hiphop/738.mp3   # beat hip hop/upbeat de Mixkit (sin copyright ni atribución)
MOFF=0    # segundo del beat en el que empieza (para entrar ya con energía)
DUR=68.08

FC="
[1:a]pan=mono|c0=c0,aresample=48000,highpass=f=80,lowpass=f=15000,
 equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.0:g=2.5,equalizer=f=9000:t=h:w=1:g=1.5,
 deesser=i=0.35,acompressor=threshold=-22dB:ratio=3:attack=6:release=90:makeup=3dB,
 asplit=2[voz][llave];
[2:a]aresample=48000,atrim=$MOFF:$(python3 -c "print($MOFF+$DUR)"),asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st=$(python3 -c "print($DUR-1.6)"):d=1.6,equalizer=f=2500:t=q:w=1.2:g=-5,equalizer=f=450:t=q:w=1.0:g=-2,volume=0.13[mus];
[mus][llave]sidechaincompress=threshold=0.015:ratio=10:attack=10:release=450:makeup=1[musd];
[0:a]aresample=48000[sfx];
[voz][musd][sfx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.84:attack=3:release=60[mix]"

# 1ª pasada: medir
ffmpeg -hide_banner -nostats -v info -i "$IN" -i "$VOZ" -i "$MUS" -filter_complex "$FC;[mix]loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json[ao]" -map "[ao]" -f null - 2> medida.txt
read IL TP LRA TH OFF <<< $(python3 -c "
import json;t=open('medida.txt').read();d=json.loads(t[t.rindex('{'):t.rindex('}')+1])
print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
echo "medido I=$IL TP=$TP LRA=$LRA"
# 2ª pasada: aplicar
if [ "$V" = copy ]; then VC="-c:v copy"; else VC="-c:v libx264 -preset slow -crf $V -pix_fmt yuv420p -profile:v high"; fi
ffmpeg -v error -y -i "$IN" -i "$VOZ" -i "$MUS" -filter_complex "$FC;[mix]loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=$IL:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true[ao]" \
  -map 0:v -map "[ao]" $VC -c:a aac -b:a 320k -ar 48000 -movflags +faststart -t $DUR "$OUT"
ffmpeg -i "$OUT" -af ebur128=framelog=quiet:peak=true -vn -f null - 2>&1 | grep -E " I:|Peak:" | head -2
