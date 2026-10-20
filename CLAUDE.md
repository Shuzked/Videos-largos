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
   - Acepta carpetas de Drive. Antes de bajar una carpeta entera, lista los archivos y su tamaño (gdown `download_folder(..., skip_download=True)` y `get_file_metadata` del conector de Google Drive) y baja solo lo necesario: el disco es de ~30 GB.
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

## Estilo de edición del cliente (aplicar SIEMPRE en todos los vídeos)

- **Color**: no cambies el color ni pongas filtros/etalonaje/viñetas sobre la cámara; deja la imagen tal cual viene. Solo se oscurece el B-roll o la pantalla cuando hay texto encima, para que se lea.
- **Animaciones**: profesionales y creativas, siempre estilo Lottie (máscaras, muelles que se asientan, trazos que se dibujan, ráfagas en los impactos, nada de plantillas genéricas ni "AI slop").
- **Texto**: Montserrat con glow (titular grande blanco + línea secundaria fina; destacados en amarillo). Subtítulos en minúsculas palabra a palabra con el "TIC" en cada palabra, en bloques de 2 a 4 palabras (1 solo si la frase es de una palabra), siempre en una sola línea (nunca dos) y sin mezclar dos frases en un bloque. Nunca dupliques texto: si algo sale en grande, no sale en pequeño, y viceversa. Los CTA ("haz clic aquí abajo", "enlace aquí debajo") van en estilo subtítulo con flecha, no como titular grande. Sin tachados.
- **Rotoscopia (recorte de la persona)**: solo cuando hay letras por detrás de la persona, y únicamente durante esos momentos. Que sea lo más limpia posible (pelo y bordes sin halo ni parpadeo); revísala sobre fondo de color antes de usarla.
- **Frase entera en grande o entera en subtítulo, nunca mezclado**: si una frase se destaca en grande, sale la frase completa en grande (palabra a palabra al ritmo de la voz, con la palabra clave enorme o en color) y en ese rato no hay subtítulos; el resto de frases van enteras como subtítulo. Un subtítulo nunca se corta a mitad por un titular ni se solapan. En un montaje seguido de varios clips de stock con gráfico de progreso abajo (p. ej. la lista "que estudies / que saques buenas notas / …"), todas las frases del montaje van en grande, nunca en subtítulo (chocarían con la línea de abajo). En el B-roll, el texto grande es la frase exacta que dice, no un resumen.
- **Demos / varias voces**: sin rótulos tipo "DEMO" ni nombres en los subtítulos; cuando habla otra voz (p. ej. el asistente de IA) sus subtítulos van en otro color y Álvaro siempre con el estilo normal.
- **Legibilidad y márgenes**: todo texto dentro de una zona segura (~100 px de margen a cada lado en 1080 de ancho, sin pegarse arriba ni abajo). Detrás del texto grande, un velo oscuro radial suave y sombra, para que se lea sobre cualquier fondo; las líneas de apoyo nunca por debajo de ~72 px (si no caben, se parten en dos, no se encogen).
- **Alternar corto y largo**: en grande solo frases cortas y de impacto (2-4 palabras, enteras); las frases largas van en subtítulo. Que se alterne grande / subtítulo y no se llene la pantalla de texto.
- **Frases largas en grande**: se parten en varias líneas centradas (p. ej. "inteligencia" / "artificial"), en vez de encoger la letra hasta que quepa en una.
- **Cámara**: tracking de la cara (la cámara sigue la cara), encuadre cuidado, zooms sutiles constantes con buena curva y zooms de impacto en las palabras clave. Nunca se ven bordes.
- **B-roll**: gratis y sin marca de agua, que muestre literalmente lo que se dice, a pantalla completa (no en recuadro), bien encuadrado: el recorte 9:16 sigue al sujeto de cada clip con `plantillas/reel-alvaro/scripts/encuadre.py` (caras > personas > objetos > saliencia, barrido suave) y el texto grande no tapa caras del B-roll (si el sujeto está arriba, el texto va abajo).
- **Transiciones**: la transición del cliente (separación RGB + desenfoque + mini zoom, 12 fotogramas) en cortes y entradas/salidas de B-roll. Transiciones limpias: nunca dejes ver unos fotogramas del plano anterior.
- **Sonido**: música inspiracional/motivacional CON RITMO elegida según el contexto del vídeo (Mixkit, sin copyright ni atribución: https://mixkit.co/free-stock-music/motivational/ , /inspiring/ , /hip-hop/ ; descargadas en `trabajo/musica-hiphop/`), una por reel, igualada de volumen entre pistas (MGAIN), entrando ya con energía desde el primer segundo, SIEMPRE de fondo y sutil, ni muy alta ni muy baja: el master la calibra sola para que quede 13 LU por debajo de la voz (se oye, pero nunca tapa la voz), con ducking bajo la voz y hueco de EQ en medios (≈2,5 kHz), y efectos de su banco de sonidos (Drive) alineados por el pico. Audio masterizado: voz limpia (EQ + compresión), -14 LUFS, pico real -1 dB.
- **Hook siempre intenso**: punch-in de zoom en el primer fotograma (1,2× → plano), golpe de sonido al empezar, sacudida de cámara en cada palabra clave del hook y la música más fuerte durante el hook (luego baja a fondo).
- **Flujo**: primero quick review en baja calidad para validar; el render final a máxima calidad solo cuando lo aprueba.


### Subtítulos sin erratas

Antes de subtitular, cruza la transcripción del cliente con el guion y con una segunda transcripción (`hyperframes transcribe <voz.wav> -e parakeet -l es --json`, palabras en las líneas de stderr) y compara palabra a palabra (difflib). Toda palabra en la que no coincidan se revisa y se corrige en `palabras.json` (p. ej. "hay"→"hoy", "termina"→"terminas"). Nunca se subtitula una palabra dudosa sin comprobarla.

### Plantilla de reels de Álvaro (para que todos se vean iguales)

Todos los reels parten de `plantillas/reel-alvaro/` (código Remotion, sin vídeos): `src/a1/Reel.tsx` (cámara con tracking, B-roll, frases grandes, subtítulos, CTA, efectos), `src/a1/transicion.tsx` (transición calcada del cliente), `src/anim.tsx` / `texto.tsx` / `estilo.ts` (animaciones, tipografía, banco de sonidos) y `audio/master.sh` (voz + música con ducking + efectos → -14 LUFS, pico -1 dB). Para un reel nuevo: copia la plantilla a `trabajo/intro/remotion-intro/src/<reel>/` (o a un proyecto Remotion nuevo con esos archivos), cambia solo los datos (palabras, cortes, B-roll, frases grandes, música) y conserva componentes y estilos. Cuando el cliente corrija algo, aplícalo en la plantilla y en `CLAUDE.md` para los siguientes vídeos.
