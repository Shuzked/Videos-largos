// Fotogramas sueltos de la composición Kling (un solo empaquetado): node bin/fotogramas.cjs <salida> <seg1> <seg2> …
const path = require('path');
require('./enlaces.cjs');
const R = path.resolve(__dirname, '../remotion');
const {renderStill, selectComposition} = require(R + '/node_modules/@remotion/renderer');
const [out, ...ts] = process.argv.slice(2);
(async () => {
  const serveUrl = await require('./empaquetar.cjs')();
  const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
  const composition = await selectComposition({serveUrl, id: process.env.COMP || 'Kling', browserExecutable});
  require('fs').mkdirSync(out, {recursive: true});
  for (const t of ts) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(parseFloat(t) * 30));
    await renderStill({composition, serveUrl, frame, output: `${out}/f_${t}.jpg`, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.5, browserExecutable});
    process.stdout.write(t + ' ');
  }
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
