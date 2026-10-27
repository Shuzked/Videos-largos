# Vídeo patrocinado de Higgsfield (16:9, 30 fps) — «Kling 4.0 en Higgsfield»

Código del montaje (sin vídeos). Base: el corte del usuario (cámara + pantalla con la web de Higgsfield). Se apoya en los
componentes del showdown (`src/anim.tsx`, `texto.tsx`, `estilo.ts`, `lottie.tsx` de `plantillas/reel-alvaro`).

- `bin/montaje.py` → `src/kling/edl.json` (segmentos, zooms, anillos, difuminado de la barra del navegador, gráficos,
  cortes con la transición del cliente) y `plan_audio.json`. Los resultados entran enteros donde el usuario los mira.
- `src/kling/Kling.tsx` → la composición (sin audio). El zoom solo amplía la ventana del navegador; la burbuja de cámara
  se queda quieta.
- `bin/mezcla.py` → voz intacta + resultados con su audio + efectos (tabla SB) + música muy de fondo (sin música encima
  de los resultados ni de las comparativas) → -14 LUFS con ganancia lineal y limitador sin autonivel.
- `bin/render_kling.sh` → render por trozos desde el bundle (`empaquetar.cjs` + `enlaces.cjs`, ver CLAUDE.md) y mux.
- `bin/fotogramas.cjs` + `bin/hoja.py` → fotogramas sueltos y hoja de contacto para revisar.
