#!/bin/bash
# Plantilla: vídeo ya editado por el cliente al que solo se le añaden música y efectos (ejemplo: Alva patr #1).
# Rutas relativas a trabajo/<proyecto>/: original/solo_voz.mov, sfx/efectos.wav (sfx_por_lista.py), musica/musica.wav.
# «Alva patr #1»: la imagen y la voz limpia del cliente se usan TAL CUAL (vídeo copiado sin recodificar, voz sin EQ,
# compresión ni reducción de ruido); solo se añaden música de fondo con ducking y efectos, y el conjunto va a -14 LUFS
# con una ganancia lineal + limitador sin autonivel (igual que master.sh de los reels). Salida en estéreo:
# voz centrada (doble mono), música y efectos en estéreo.
# Uso: master.sh <salida.mov>
set -e
cd "$(dirname "$0")"
OUT="$1"
IN=original/solo_voz.mov       # vídeo + voz limpia del cliente (WeTransfer «Alva patr #1_Audio Cambiado.mov»)
SFX=sfx/efectos.wav            # sfx/genera_sfx.py sfx/eventos_final.tsv
MUS=musica/musica.wav          # musica/genera_musica.sh (Mixkit 637 + 1136)
HOOK=5.2     # fin del hook (salen «de negocio» y el icono IA): hasta aquí la música suena un poco más
DUR=221.935
SEP=23.4     # LU música bajo la voz, medidas ambas en estéreo: reproduce el mismo equilibrio que los reels (salida mono, SEP 23)

fc() { # $1 = ganancia de la música en dB (después del ducking)
echo "
[0:a]pan=mono|c0=c0,aresample=48000,asplit=3[vozm][llave][vmm];
[vozm]pan=stereo|c0=c0|c1=c0[voz]; [vmm]pan=stereo|c0=c0|c1=c0[vm];
[2:a]aresample=48000,equalizer=f=2500:t=q:w=1.2:g=-5,equalizer=f=450:t=q:w=1.0:g=-2,volume=0.15[mus];
[mus][llave]sidechaincompress=threshold=0.02:ratio=6:attack=10:release=450:makeup=1,volume=$1dB,volume='1+0.6*clip(($HOOK+0.5-t)/0.5\,0\,1)':eval=frame[musd]"
}
mide() { ffmpeg -hide_banner -nostats -i "$IN" -i "$SFX" -i "$MUS" -filter_complex "$(fc 0); [$1]atrim=$HOOK:$DUR,ebur128=framelog=quiet[x]; [$2]anullsink; [voz]anullsink; [1:a]anullsink" -map "[x]" -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}'; }
IM=$(mide musd vm)
IV=$(mide vm musd)
MGAIN=$(python3 -c "print(round(($IV-$SEP)-($IM),2))")
echo "voz $IV LUFS, música $IM LUFS → ganancia música $MGAIN dB"
FC="$(fc $MGAIN);
[1:a]aresample=48000[sfx];
[voz][musd][sfx]amix=inputs=3:duration=first:normalize=0[mix]; [vm]anullsink"

IL=$(ffmpeg -hide_banner -nostats -i "$IN" -i "$SFX" -i "$MUS" -filter_complex "$FC;[mix]ebur128=framelog=quiet[x]" -map "[x]" -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
G=$(python3 -c "print(round(-14-($IL),2))")
echo "mezcla $IL LUFS → ganancia lineal $G dB"
renderiza() {
ffmpeg -v error -y -i "$IN" -i "$SFX" -i "$MUS" -filter_complex "$FC;[mix]volume=${G}dB,aresample=192000,alimiter=limit=0.82:attack=1:release=50:level=0:latency=1,aresample=48000,apad,atrim=0:$DUR[ao]" \
  -map 0:v -map "[ao]" -c:v copy -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$OUT"
}
renderiza
I1=$(ffmpeg -i "$OUT" -af ebur128=framelog=quiet -vn -f null - 2>&1 | grep -E "^\s+I:" | tail -1 | awk '{print $2}')
DIF=$(python3 -c "print(round(-14-($I1),2))")
if python3 -c "import sys; sys.exit(0 if abs($DIF) > 0.3 else 1)"; then
  G=$(python3 -c "print(round($G+$DIF,2))"); echo "salida $I1 LUFS → ganancia corregida $G dB"; renderiza
fi
ffmpeg -i "$OUT" -af ebur128=framelog=quiet:peak=true -vn -f null - 2>&1 | grep -E " I:|Peak:" | head -2
