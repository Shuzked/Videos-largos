# Videos-largos

Repositorio de trabajo para editar vídeos largos con HyperFrames. El usuario habla español: responde siempre en español.

Los vídeos NO viven en el repo (GitHub no admite archivos grandes). El usuario deja un **pedido** en `pedidos/` con un enlace al vídeo; yo lo descargo, lo edito y publico el resultado.

## Al empezar cada sesión

1. Si no existe `trabajo/.setup-ok`, ejecuta `scripts/setup.sh` (tarda unos minutos la primera vez: Chrome, Kokoro, Parakeet, gdown, yt-dlp). Si falla, mira `trabajo/setup.log`.
2. Si un comando de `npx hyperframes` descarga algo, ejecútalo con `NODE_USE_ENV_PROXY=1`; sin eso el `fetch` de Node no pasa por el proxy y falla con "fetch failed".
3. Las skills de HyperFrames están en `.claude/skills/`. Para cualquier edición, empieza por la skill `hyperframes`.

## Flujo de un pedido

1. Lee el pedido en `pedidos/*.md` (los que tengan `Estado: pendiente`). Si falta información importante, pregunta antes de empezar.
2. Descarga: `scripts/descargar.sh "<enlace>" trabajo/<nombre-del-pedido>/original`.
   - Drive necesita compartir como "Cualquier persona con el enlace". Si gdown falla por permisos, díselo al usuario.
3. Edita en `trabajo/<nombre-del-pedido>/` según lo marcado:
   - Subtítulos → skill `embedded-captions`.
   - Recortar y limpiar → transcribe con Parakeet (`hyperframes transcribe`) y corta con ffmpeg o `media-use`.
   - Clips cortos verticales → elige los mejores momentos por la transcripción, reencuadre 9:16.
   - Gráficos y títulos → skill `talking-head-recut`.
   Antes de un render largo, enseña al usuario un fragmento corto o un fotograma para validar el estilo.
4. Publica el resultado como asset de una **GitHub Release** del repo (hasta 2 GB por archivo) con `gh api` / `uploads.github.com`. Nombre de la release: el del pedido.
5. Actualiza el `Estado` del pedido a `listo` con el enlace de descarga, y haz commit y push de ese cambio.

## Reglas

- Nunca hagas commit de vídeo, audio ni nada de `trabajo/` (está en `.gitignore`).
- Conserva siempre el original; trabaja sobre copias.
- El repo es público: las releases también lo son. Recuérdaselo al usuario si el vídeo parece privado.
- El disco de la sesión es limitado (~30 GB). Borra `trabajo/<pedido>/` cuando el resultado ya esté publicado.
