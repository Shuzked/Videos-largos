#!/bin/bash
# Masteriza el audio del reel: voz tratada + efectos (stem de Remotion) + música con ducking → -14 LUFS, pico -1 dB
# Uso: master.sh <video_con_stem_sfx.mp4> <salida.mp4> [crf_video|copy]
set -e
cd "$(dirname "$0")"
IN="$1"; OUT="$2"; V="${3:-copy}"
VOZ=original/A1_EVERGREEN.mp4
MA=musica/614.mp3   # Silent Descent (Eugenio Mininni, Mixkit): hook e historia, tensión que crece
MB=musica/32.mp3    # Driving Ambition (Ahjay Stelino, Mixkit): desde "pero seguí" hasta el final
DUR=68.08
GIRO=36.8

FC="
[1:a]pan=mono|c0=c0,aresample=48000,highpass=f=80,lowpass=f=15000,
 equalizer=f=220:t=q:w=1.2:g=-2.5,equalizer=f=3200:t=q:w=1.0:g=2.5,equalizer=f=9000:t=h:w=1:g=1.5,
 deesser=i=0.35,acompressor=threshold=-22dB:ratio=3:attack=6:release=90:makeup=3dB,
 asplit=2[voz][llave];
[2:a]aresample=48000,atrim=0:$GIRO,asetpts=PTS-STARTPTS,afade=t=in:d=0.4,afade=t=out:st=$(python3 -c "print($GIRO-0.25)"):d=0.25[m1];
[3:a]aresample=48000,atrim=0:$(python3 -c "print($DUR-$GIRO)"),asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st=$(python3 -c "print($DUR-$GIRO-1.6)"):d=1.6[m2];
[m1][m2]concat=n=2:v=0:a=1,volume=0.30[mus];
[mus][llave]sidechaincompress=threshold=0.025:ratio=7:attack=15:release=380:makeup=1[musd];
[0:a]aresample=48000[sfx];
[voz][musd][sfx]amix=inputs=3:duration=first:normalize=0,alimiter=limit=0.89:attack=3:release=60[mix]"

# 1ª pasada: medir
ffmpeg -hide_banner -nostats -v info -i "$IN" -i "$VOZ" -i "$MA" -i "$MB" -filter_complex "$FC;[mix]loudnorm=I=-14:TP=-1:LRA=9:print_format=json[ao]" -map "[ao]" -f null - 2> medida.txt
read IL TP LRA TH OFF <<< $(python3 -c "
import json;t=open('medida.txt').read();d=json.loads(t[t.rindex('{'):t.rindex('}')+1])
print(d['input_i'],d['input_tp'],d['input_lra'],d['input_thresh'],d['target_offset'])")
echo "medido I=$IL TP=$TP LRA=$LRA"
# 2ª pasada: aplicar
if [ "$V" = copy ]; then VC="-c:v copy"; else VC="-c:v libx264 -preset slow -crf $V -pix_fmt yuv420p -profile:v high"; fi
ffmpeg -v error -y -i "$IN" -i "$VOZ" -i "$MA" -i "$MB" -filter_complex "$FC;[mix]loudnorm=I=-14:TP=-1:LRA=9:measured_I=$IL:measured_TP=$TP:measured_LRA=$LRA:measured_thresh=$TH:offset=$OFF:linear=true[ao]" \
  -map 0:v -map "[ao]" $VC -c:a aac -b:a 320k -ar 48000 -movflags +faststart -t $DUR "$OUT"
ffmpeg -i "$OUT" -af ebur128=framelog=quiet:peak=true -vn -f null - 2>&1 | grep -E " I:|Peak:" | head -2
