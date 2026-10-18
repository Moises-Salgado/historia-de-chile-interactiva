import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';

// Escribe dist/sw.js a partir de la plantilla src/sw.js, con la lista de archivos del build y una
// versión que cambia si cambia cualquiera de ellos (así el navegador renueva la copia sin conexión).
function serviceWorker() {
  let raiz;
  let salida;
  return {
    name: 'historia-chile:service-worker',
    apply: 'build',
    configResolved(config) {
      raiz = config.root;
      salida = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const archivos = readdirSync(salida, { recursive: true, withFileTypes: true })
        .filter((f) => f.isFile() && !f.name.startsWith('.') && f.name !== 'sw.js')
        .map((f) => relative(salida, join(f.parentPath, f.name)).replaceAll('\\', '/'))
        .sort();
      const plantilla = readFileSync(join(raiz, 'src/sw.js'), 'utf8');
      const hash = createHash('sha256').update(plantilla);
      for (const archivo of archivos) hash.update(archivo).update(readFileSync(join(salida, archivo)));
      const codigo = plantilla
        .replace("'__VERSION__'", () => `'${hash.digest('hex').slice(0, 12)}'`)
        .replace('__ARCHIVOS__', () => JSON.stringify(archivos));
      writeFileSync(join(salida, 'sw.js'), codigo);
    },
  };
}

// Base relativa: el build funciona igual en GitHub Pages (subcarpeta /<repo>/), Netlify o Vercel,
// porque la navegación usa rutas con hash (#evento/<id>).
export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
});
