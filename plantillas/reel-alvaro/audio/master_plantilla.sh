#!/bin/bash
# Masteriza el audio del reel: voz del cliente SIN retocar + efectos (stem de Remotion) + música de fondo con ducking → -14 LUFS, pico < -1 dB
# La música se calibra sola: queda SEP LU por debajo de la voz (de fondo, se oye pero nunca tapa la voz).
# Uso: master.sh <video_con_stem_sfx.mp4> <salida.mp4> [crf_video|copy]
set -e
cd "$(dirname "$0")"
IN="$1"; OUT="$2"; V="${3:-copy}"
VOZ=trabajo/voz-original.mka   # audio de la nueva versión del cliente
MUS=../musica-hiphop/34.mp3   # Raising Me Higher (Ahjay Stelino, Mixkit): motivacional con ritmo
MOFF=2    # segundo de la música en el que empieza (la parte con más fuerza)
HOOK=8.52   # fin del hook: hasta aquí la música sube un poco (hook con más fuerza)
DUR=68.08
SEP=23       # LU que la música queda por debajo de la voz (23 = muy de fondo; el cliente pidió -10 dB respecto a 13)

fc() { # $1 = ganancia de la música en dB (después del ducking)
echo "
[1:a]pan=mono|c0=c0,aresample=48000,
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
[voz][musd][sfx]amix=inputs=3:duration=first:normalize=0[mix]; [vm]anullsink"

# Normalización LINEAL (la voz del cliente no se toca): se mide la mezcla y se aplica una ganancia fija hasta -14 LUFS;
# después solo un limitador SIN autonivel (level=0) y sobremuestreado (picos entre muestras) que actúa en los picos sueltos.
IL=$(ffmpeg -hide_banner -nostats -i "$IN" -i "$VOZ" -i "$MUS" -filter_complex "$FC;[mix]ebur128=framelog=quiet[x]" -map "[x]" -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14-($IL),2))")
echo "mezcla $IL LUFS → ganancia lineal $G dB"
if [ "$V" = copy ]; then VC="-c:v copy"; else VC="-c:v libx264 -preset slow -crf $V -pix_fmt yuv420p -profile:v high"; fi
renderiza() {
ffmpeg -v error -y -i "$IN" -i "$VOZ" -i "$MUS" -filter_complex "$FC;[mix]volume=${G}dB,aresample=192000,alimiter=limit=0.82:attack=1:release=50:level=0,aresample=48000[ao]" \
  -map 0:v -map "[ao]" $VC -c:a aac -b:a 320k -ar 48000 -movflags +faststart -t $DUR "$OUT"
}
renderiza
# el limitador baja un poco la sonoridad: si se aparta más de 0,3 LU de -14, se corrige la ganancia una vez
I1=$(ffmpeg -i "$OUT" -af ebur128=framelog=quiet -vn -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
DIF=$(python3 -c "print(round(-14-($I1),2))")
if python3 -c "import sys; sys.exit(0 if abs($DIF) > 0.3 else 1)"; then
  G=$(python3 -c "print(round($G+$DIF,2))"); echo "salida $I1 LUFS → ganancia corregida $G dB"; renderiza
fi
ffmpeg -i "$OUT" -af ebur128=framelog=quiet:peak=true -vn -f null - 2>&1 | grep -E " I:|Peak:" | head -2
