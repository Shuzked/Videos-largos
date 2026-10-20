#!/bin/bash
# Masteriza el audio del reel: voz tratada + efectos (stem de Remotion) + música de fondo con ducking → -14 LUFS, pico < -1 dB
# La música se calibra sola: queda SEP LU por debajo de la voz (de fondo, se oye pero nunca tapa la voz).
# Uso: master.sh <video_con_stem_sfx.mp4> <salida.mp4> [crf_video|copy]
set -e
cd "$(dirname "$0")"
IN="$1"; OUT="$2"; V="${3:-copy}"
VOZ=original/REEL.mp4
MUS=../musica-hiphop/ID.mp3   # título (autor, Mixkit)
MOFF=0    # segundo de la música en el que empieza (la parte con más fuerza)
HOOK=8.0   # fin del hook: hasta aquí la música sube un poco (hook con más fuerza)
DUR=60.0
SEP=13       # LU que la música queda por debajo de la voz (12-14 = fondo sutil que se oye)

fc() { # $1 = ganancia de la música en dB (después del ducking)
echo "
[1:a]pan=mono|c0=c0,aresample=48000,highpass=f=80,lowpass=f=15000,
 equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.0:g=2.5,equalizer=f=9000:t=h:w=1:g=1.5,
 deesser=i=0.35,acompressor=threshold=-22dB:ratio=3:attack=6:release=90:makeup=3dB,
 asplit=3[voz][llave][vm];
[2:a]aresample=48000,atrim=$MOFF:$(python3 -c "print($MOFF+$DUR)"),asetpts=PTS-STARTPTS,afade=t=in:d=0.15,afade=t=out:st=$(python3 -c "print($DUR-1.6)"):d=1.6,equalizer=f=2500:t=q:w=1.2:g=-5,equalizer=f=450:t=q:w=1.0:g=-2,volume=0.15[mus];
[mus][llave]sidechaincompress=threshold=0.02:ratio=6:attack=10:release=450:makeup=1,volume=$1dB,volume='1+0.6*clip(($HOOK+0.5-t)/0.5\,0\,1)':eval=frame[musd]"
}
# 0) calibrar la música respecto a la voz (fuera del hook)
mide() { ffmpeg -hide_banner -nostats -i "$IN" -i "$VOZ" -i "$MUS" -filter_complex "$(fc 0); [$1]atrim=$HOOK:$DUR,ebur128=framelog=quiet[x]; [$2]anullsink; [voz]anullsink" -map "[x]" -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}'; }
IM=$(mide musd vm)
IV=$(mide vm musd)
MGAIN=$(python3 -c "print(round(($IV-$SEP)-($IM),2))")
echo "voz $IV LUFS, música $IM LUFS → ganancia música $MGAIN dB"
FC="$(fc $MGAIN);
[0:a]aresample=48000[sfx];
[voz][musd][sfx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.84:attack=3:release=60[mix]; [vm]anullsink"

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
