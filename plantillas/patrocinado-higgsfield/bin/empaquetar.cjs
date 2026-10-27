// Empaqueta la composición en trabajo/kling4/bundle y cambia los enlaces simbólicos de public/ por enlaces duros:
// el servidor de Remotion no sirve enlaces simbólicos (404) y copiar el corte (3,4 GB) no cabe en el disco.
const fs = require('fs');
const path = require('path');
const R = path.resolve(__dirname, '../remotion');
const OUT = path.resolve(__dirname, '..', process.env.KBUNDLE || 'bundle');
const {bundle} = require(R + '/node_modules/@remotion/bundler');
const duros = (dir) => {
  for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      const real = fs.realpathSync(p);
      if (fs.statSync(real).isDirectory()) { fs.unlinkSync(p); fs.cpSync(real, p, {recursive: true, dereference: true}); duros(p); continue; }
      fs.unlinkSync(p);
      fs.linkSync(real, p);
    } else if (e.isDirectory()) duros(p);
  }
};
module.exports = async () => {
  fs.rmSync(OUT, {recursive: true, force: true});
  await bundle({entryPoint: R + '/src/index.ts', publicDir: R + '/public', outDir: OUT});
  duros(path.join(OUT, 'public'));
  return OUT;
};
if (require.main === module) module.exports().then((o) => console.log(o));
