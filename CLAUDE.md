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
4. Publica el resultado como asset de una **GitHub Release** del repo (hasta 2 GB por archivo): `scripts/release.sh subir <nombre-del-pedido> <archivo>`. `gh release` no funciona aquí (usa GraphQL); usa siempre este script.
5. Actualiza el `Estado` del pedido a `listo` con el enlace de descarga, y haz commit y push de ese cambio.

## Vídeos que el usuario sube a Releases

El usuario también puede subir su material como assets de una release (tag = nombre del proyecto), junto con un guion o indicaciones (archivo en la release o en el chat). Descárgalo con:
`scripts/release.sh bajar <tag> trabajo/<tag>/original`
Analiza el material (duración, contenido, transcripción con Parakeet si hay voz) junto con el guion antes de proponer el montaje.

## Stock gratuito: vídeo, música y efectos

Usa `scripts/stock.py` (búsquedas en inglés):
- `scripts/stock.py buscar "<términos>" -n 5` → vídeo: Pixabay, Coverr (1080p) y Mixkit (720p).
- `--tipo musica` → Mixkit e Incompetech. `--tipo efectos` → Mixkit.
- `--fuente <nombre>` para una sola fuente.
- `scripts/stock.py bajar <url> trabajo/<proyecto>/stock`.
- **Solo material gratuito y sin marca de agua** (lo pidió el usuario). Por eso no se usan Vecteezy, los clips premium de Coverr (el script ya los filtra), NASA (títulos y marca de la NASA incrustados) ni Internet Archive (licencias mal etiquetadas). Antes de usar un clip, mira un fotograma y descártalo si lleva logo o marca.

Pixabay (la fuente con más variedad, hasta 4K) necesita la variable de entorno `PIXABAY_API_KEY`; si no existe, se salta y sigue con las demás. La clave nunca va al repo.

Apunta fuente, página y licencia de cada recurso en `trabajo/<proyecto>/creditos.md`. **Incompetech exige atribución**: pon el texto de su campo `licencia` en los créditos del vídeo y en la descripción donde se publique.

## Reglas

- Nunca hagas commit de vídeo, audio ni nada de `trabajo/` (está en `.gitignore`).
- Conserva siempre el original; trabaja sobre copias.
- El repo es público: las releases también lo son. Recuérdaselo al usuario si el vídeo parece privado.
- El disco de la sesión es limitado (~30 GB). Borra `trabajo/<pedido>/` cuando el resultado ya esté publicado.
