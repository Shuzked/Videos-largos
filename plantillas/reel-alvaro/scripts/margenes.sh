#!/bin/bash
# Zona segura de un reel: render solo de los elementos → ajuste por escena (zonas.json) → render de toda la capa gráfica → control.
# Uso: margenes.sh A7 [E6 …]   (composición sin «Reel»)
R=/home/user/videos-largos/trabajo/intro/remotion-intro; P=/home/user/videos-largos/plantillas/reel-alvaro/scripts
cd $R
for C in "$@"; do
  c=$(echo $C | tr A-Z a-z)
  echo '[]' > src/$c/zonas.json        # se mide sin ajustes (si no, un segundo pase vería la escena ya corregida)
  nice -n 3 npx remotion render Reel$C out/lottie_$c.mp4 --props='{"stem":"efectos","capa":"lottie"}' --scale=0.5 --muted --crf=28 --concurrency=2 --log=error > /dev/null 2>&1
  echo "== $C"; python3 $P/zonas.py out/lottie_$c.mp4 src/$c/zonas.json
  nice -n 3 npx remotion render Reel$C out/margen2_$c.mp4 --props='{"stem":"efectos"}' --scale=0.5 --muted --crf=28 --concurrency=2 --log=error > /dev/null 2>&1
  python3 $P/margenes.py out/margen2_$c.mp4 --json out/margen2_$c.json
done
echo MARGENES_FIN
