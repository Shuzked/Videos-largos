// Renderiza un trozo de la composición Kling desde el bundle ya empaquetado (bin/empaquetar.cjs), sin audio:
// node bin/render.cjs <salida.mp4> <primer_fotograma> <último_fotograma> <escala> <crf>
const path = require('path');
require('./enlaces.cjs');
const R = path.resolve(__dirname, '../remotion');
const BUNDLE = path.resolve(__dirname, '..', process.env.KBUNDLE || 'bundle');
const {renderMedia, selectComposition} = require(R + '/node_modules/@remotion/renderer');
const [out, a, b, escala, crf] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
(async () => {
  const composition = await selectComposition({serveUrl: BUNDLE, id: 'Kling', browserExecutable});
  await renderMedia({
    composition, serveUrl: BUNDLE, codec: 'h264', outputLocation: out, frameRange: [parseInt(a), parseInt(b)],
    scale: parseFloat(escala), crf: parseInt(crf), x264Preset: 'medium', pixelFormat: 'yuv420p', muted: true,
    imageFormat: 'jpeg', jpegQuality: parseFloat(escala) < 1 ? 85 : 95, concurrency: 4,
    offthreadVideoCacheSizeInBytes: 1500 * 1024 * 1024, browserExecutable, logLevel: 'error',
  });
  console.log('TROZO_OK', out);
})().catch((e) => { console.error(e); process.exit(1); });
