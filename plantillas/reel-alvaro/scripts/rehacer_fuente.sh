#!/bin/bash
# Uso: rehacer_fuente.sh <proyecto> <reel> <id_original> <id_chroma> [corte_a corte_b]
# Descarga la nueva versión, etalona, genera proxy 1440 + voz original + recorte del hook etalonado, y borra los 4K.
set -e
P=$1; RL=$2; IDO=$3; IDC=$4; CA=$5; CB=$6
T=/home/user/videos-largos/trabajo; R=$T/intro/remotion-intro; D=$T/$P/nuevo
mkdir -p $D $T/$P/trabajo $R/public/$RL
cd $D
[ -s orig.mp4 ] || gdown -q "https://drive.google.com/uc?id=$IDO" -O orig.mp4
[ -s chroma.mp4 ] || gdown -q "https://drive.google.com/uc?id=$IDC" -O chroma.mp4
DO=$(ffprobe -v error -show_entries format=duration -of csv=p=0 orig.mp4); DC=$(ffprobe -v error -show_entries format=duration -of csv=p=0 chroma.mp4)
echo "[$P] duraciones original $DO chroma $DC"
# sin etalonaje: el cliente entrega el material ya etalonado (no se toca el color)
F="null"
echo "[$P] filtro: $F"
if [ -n "$CA" ]; then
  # versión con un tramo cortado (repetición)
  ffmpeg -v error -y -i orig.mp4 -filter_complex "[0:v]trim=0:$CA,setpts=PTS-STARTPTS[v1];[0:v]trim=$CB,setpts=PTS-STARTPTS[v2];[v1][v2]concat=n=2:v=1:a=0,$F,scale=1440:2560:flags=lanczos,format=yuv420p[v];[0:a]atrim=0:$CA,asetpts=PTS-STARTPTS[a1];[0:a]atrim=$CB,asetpts=PTS-STARTPTS[a2];[a1][a2]concat=n=2:v=0:a=1[a]" \
    -map "[v]" -map "[a]" -c:v libx264 -preset veryfast -crf 14 -c:a aac -b:a 256k -movflags +faststart ../trabajo/proxy-etalonado.mp4
  ffmpeg -v error -y -i orig.mp4 -filter_complex "[0:a]atrim=0:$CA,asetpts=PTS-STARTPTS[a1];[0:a]atrim=$CB,asetpts=PTS-STARTPTS[a2];[a1][a2]concat=n=2:v=0:a=1[a]" -map "[a]" -c:a pcm_s24le ../trabajo/voz-original.wav
  VOZ=trabajo/voz-original.wav
else
  ffmpeg -v error -y -i orig.mp4 -vf "$F,scale=1440:2560:flags=lanczos,format=yuv420p" -c:v libx264 -preset veryfast -crf 14 -c:a aac -b:a 256k -movflags +faststart ../trabajo/proxy-etalonado.mp4
  ffmpeg -v error -y -i orig.mp4 -vn -c:a copy ../trabajo/voz-original.mka
  VOZ=trabajo/voz-original.mka
fi
echo "[$P] proxy y voz listos"
# recorte del hook (10 s): chroma → alfa, y el mismo etalonaje sobre el color (el alfa no se toca)
ffmpeg -v error -y -t 10 -i chroma.mp4 -an -filter_complex "[0:v]scale=1080:1920:flags=lanczos,chromakey=0x39FF25:0.17:0.06,despill=type=green:mix=0.6:expand=0.05,format=yuva444p,split[x][y];[x]alphaextract[al];[y]format=gbrp,$F[g];[g][al]alphamerge,format=yuva420p[v]" \
  -map "[v]" -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 0 -crf 20 -row-mt 1 -deadline good -cpu-used 4 -auto-alt-ref 0 -metadata:s:v:0 alpha_mode=1 ../trabajo/hook-etalonado.webm
echo "[$P] hook listo"
# enlazar en Remotion (rompiendo el enlace anterior)
rm -f $R/public/$RL/$RL.mp4 $R/public/$RL/recorte-hook.webm
ln ../trabajo/proxy-etalonado.mp4 $R/public/$RL/$RL.mp4
ln ../trabajo/hook-etalonado.webm $R/public/$RL/recorte-hook.webm
sed -i "s|^VOZ=.*|VOZ=$VOZ   # audio de la nueva versión del cliente|" $T/$P/master.sh 2>/dev/null || true
# hoja de control (fotograma + forma de onda + vectorscopio, antes/después)
# fotograma antes/después para revisar
ffmpeg -v error -y -ss 20 -i orig.mp4 -frames:v 1 -vf scale=360:-1 ../trabajo/antes.jpg
ffmpeg -v error -y -ss 20 -i ../trabajo/proxy-etalonado.mp4 -frames:v 1 -vf scale=360:-1 ../trabajo/despues.jpg
cd .. && rm -rf nuevo
echo "[$P] FUENTE_OK"
