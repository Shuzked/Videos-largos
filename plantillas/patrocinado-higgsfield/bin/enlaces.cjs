// Remotion «descarga» cada vídeo de public/ a una carpeta temporal (una copia entera por proceso): con el corte de 3,4 GB
// el disco se llena. Este parche cambia esa copia por un enlace duro al archivo del bundle (mismo disco, 0 bytes).
const fs = require('fs');
const path = require('path');
const R = path.resolve(__dirname, '../remotion');
const BUNDLE = path.resolve(__dirname, '..', process.env.KBUNDLE || 'bundle');
const df = require(R + '/node_modules/@remotion/renderer/dist/assets/download-file.js');
const original = df.downloadFile;
df.downloadFile = async (opts, ...resto) => {
  try {
    const u = new URL(opts.url);
    const local = path.join(BUNDLE, decodeURIComponent(u.pathname));
    if (['localhost', '127.0.0.1'].includes(u.hostname) && u.pathname.startsWith('/public/') && fs.existsSync(local)) {
      const to = opts.to(null, null);
      fs.mkdirSync(path.dirname(to), {recursive: true});
      if (fs.existsSync(to)) fs.unlinkSync(to);
      fs.linkSync(fs.realpathSync(local), to);
      return {sizeInBytes: fs.statSync(to).size, to};
    }
  } catch (e) {
    console.error('enlace fallido, se copia', opts.url, e.message);
  }
  return original(opts, ...resto);
};
