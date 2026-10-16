# Videos-largos

Aquí pides ediciones de vídeos largos y Claude las hace con HyperFrames.

## Cómo pedir una edición

1. Sube el vídeo a **Google Drive** (o Dropbox / YouTube) y compártelo como **"Cualquier persona con el enlace"**.
2. Copia `pedidos/PLANTILLA.md` a un archivo nuevo, por ejemplo `pedidos/2026-10-20-entrevista.md`.
3. Pega el enlace, marca lo que quieres (subtítulos, recortes, clips, gráficos) y añade detalles.
4. Abre una sesión de Claude con este repositorio y dile: **"haz los pedidos pendientes"**.

Claude descarga el vídeo, lo edita y te deja el resultado en **[Releases](https://github.com/Shuzked/Videos-largos/releases)**, y pone el enlace en el propio pedido.

## Otra forma: subir tus vídeos a Releases y que Claude monte el vídeo

1. Entra en **[Releases → Draft a new release](https://github.com/Shuzked/Videos-largos/releases/new)**.
2. En **Choose a tag** escribe un nombre para el proyecto (por ejemplo `video-viaje`) y pulsa **Create new tag**.
3. Arrastra tus vídeos (hasta 2 GB cada uno) y, si quieres, el guion en un archivo de texto.
4. Pulsa **Publish release** y dile a Claude el nombre del tag y qué quieres.

Claude analiza tu material con el guion y completa el montaje con vídeo de stock gratuito (Coverr, Mixkit, Internet Archive) cuando haga falta.

## Qué hay en el repo

| Carpeta | Para qué |
|---|---|
| `pedidos/` | Un archivo por vídeo: enlace + qué edición quieres |
| `scripts/setup.sh` | Instala las herramientas al empezar una sesión |
| `scripts/descargar.sh` | Descarga el vídeo desde el enlace |
| `scripts/stock.py` | Busca y descarga vídeo de stock gratuito |
| `.claude/skills/` | Skills de HyperFrames para Claude |
| `trabajo/` | Archivos temporales (no se suben a GitHub) |

> **Ojo:** el repositorio es público, así que los vídeos publicados en Releases también lo son. Si los vídeos son privados, haz el repositorio privado en Settings.
