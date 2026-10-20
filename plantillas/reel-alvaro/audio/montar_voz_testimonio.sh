#!/bin/bash
# Voz del reel A5: Álvaro [0, T1) + testimonio de Billy (igualado al nivel de Álvaro) + Álvaro [T1, fin)
set -e
cd /home/user/videos-largos/trabajo/a5-evergreen
T1=64.95
A=trabajo/voz-original.mka; B=testimonio/frag-billy-48k.wav
LA=$(ffmpeg -nostats -i $A -af "pan=mono|c0=c0,ebur128" -f null - 2>&1 | grep -A3 Summary | grep "I:" | awk '{print $2}')
echo "Álvaro (canal izq.) $LA LUFS → Billy a ese nivel"
ffmpeg -v error -y -i $A -i $B -filter_complex "
[0:a]aresample=48000,pan=stereo|c0=c0|c1=c1,atrim=0:$T1,asetpts=PTS-STARTPTS,afade=t=out:st=$(python3 -c "print($T1-0.02)"):d=0.02[a1];
[1:a]aresample=48000,highpass=f=90,loudnorm=I=$LA:TP=-2:LRA=7,aresample=48000,pan=stereo|c0=c0|c1=c0,afade=t=in:d=0.03,areverse,afade=t=in:d=0.03,areverse[b];
[0:a]aresample=48000,pan=stereo|c0=c0|c1=c1,atrim=$T1,asetpts=PTS-STARTPTS,afade=t=in:d=0.02[a2];
[a1][b][a2]concat=n=3:v=0:a=1[o]" -map "[o]" -c:a pcm_s24le trabajo/voz-montada.wav
ffprobe -v error -show_entries format=duration -of csv=p=0 trabajo/voz-montada.wav
