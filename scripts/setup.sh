#!/usr/bin/env bash
# Prepara el entorno de edición en una sesión en la nube.
# Es idempotente: si algo ya está instalado, lo salta.
# Deja el registro en trabajo/setup.log y crea trabajo/.setup-ok al terminar bien.
set -uo pipefail

cd "$(dirname "$0")/.."
mkdir -p trabajo
LOG=trabajo/setup.log
rm -f trabajo/.setup-ok
: > "$LOG"

# El fetch de Node no usa HTTPS_PROXY si no se le pide.
export NODE_USE_ENV_PROXY=1
export NODE_NO_WARNINGS=1

paso() { echo "== $1" >> "$LOG"; }
fallo=0

paso "herramientas de descarga (gdown, yt-dlp)"
if ! command -v gdown >/dev/null || ! command -v yt-dlp >/dev/null; then
  pip install -q gdown yt-dlp >> "$LOG" 2>&1 || fallo=1
fi

paso "Kokoro (voz local)"
python3 -c "import kokoro_onnx, soundfile" 2>/dev/null \
  || pip install -q kokoro-onnx soundfile >> "$LOG" 2>&1 || fallo=1

paso "Chrome Headless Shell"
npx -y hyperframes browser ensure >> "$LOG" 2>&1 || fallo=1

paso "Parakeet (transcripción)"
if ! npx -y hyperframes models list 2>/dev/null | grep -q "parakeet.*installed"; then
  npx -y hyperframes models install parakeet >> "$LOG" 2>&1 || fallo=1
fi

if [ "$fallo" -eq 0 ]; then
  touch trabajo/.setup-ok
  paso "listo"
else
  paso "TERMINÓ CON ERRORES (revisa arriba)"
fi
