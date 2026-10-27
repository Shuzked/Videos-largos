# Vídeo patrocinado de Higgsfield (16:9, 30 fps) — «Kling 4.0 en Higgsfield»

Código del montaje (sin vídeos). Base: el corte del usuario (cámara + pantalla con la web de Higgsfield). Se apoya en los
componentes del showdown (`src/anim.tsx`, `texto.tsx`, `estilo.ts`, `lottie.tsx` de `plantillas/reel-alvaro`).

- `bin/montaje.py` → `src/kling/edl.json` (segmentos, zooms, anillos, difuminado de la barra del navegador, gráficos,
  cortes con la transición del cliente) y `plan_audio.json`. Los resultados entran enteros donde el usuario los mira.
- `src/kling/Kling.tsx` → la composición (sin audio). El zoom solo amplía la ventana del navegador; la burbuja de cámara
  va fuera: en los tramos de pantalla se ve la web sola, ampliada sobre el fondo del vídeo.
- `bin/mezcla.py` → voz intacta + resultados con su audio + efectos (tabla SB) + música muy de fondo (sin música encima
  de los resultados ni de las comparativas) → -14 LUFS con ganancia lineal y limitador sin autonivel.
- `bin/render_kling.sh` → render por trozos desde el bundle (`empaquetar.cjs` + `enlaces.cjs`, ver CLAUDE.md) y mux.
- `bin/fotogramas.cjs` + `bin/hoja.py` → fotogramas sueltos y hoja de contacto para revisar.
- `bin/marcos.py` → mide el rectángulo del borde blanco de la ventana y de la burbuja en todo el corte (la ventana cambia
  de alto cuando la web reproduce un vídeo): con eso se recorta exacto y se le pone el contorno blanco sin cortarlo.
- `bin/seguir_r4.py` → sigue en un resultado la cara (FaceLandmarker), el pecho y el frasco, para que un foco o una
  etiqueta acompañen lo que se señala mientras el vídeo corre.
- Fondo desenfocado (como el del corte): `medios/corte_fondo.mp4` = el corte a 384×216 con `gblur=sigma=5`, ampliado
  ×1,3 detrás de la escena de pantalla y de las escenas a pantalla completa (`PlanoDifuminado` / `FondoDifuminado`).
  Se hace una vez con ffmpeg: el render no tiene que desenfocar un 1080p en cada fotograma.
- `bin/buscar_texto.py` + `bin/tramos_texto.py` → localizan en todo el corte un texto de la web que no debe leerse
  (aquí «ChatGPT Plugin» del menú) y cuándo se ve, afinado fotograma a fotograma; `DifuminaWeb` (Kling.tsx) lo difumina
  dentro de la ventana (sigue zooms y cambios de escena): desenfoque fuerte de esa franja, bordes fundidos y relleno con
  el color del menú para que no arrastre el borde blanco. Sin cajas ni pixelado.
