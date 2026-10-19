import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { defineConfig } from 'vite';

// Dirección pública del sitio: las vistas previas al compartir necesitan URL absolutas.
const SITIO = 'https://moises-salgado.github.io/historia-de-chile-interactiva/';
// Lo que no se guarda para usar sin conexión: las páginas para compartir y la imagen de su tarjeta.
const sinConexionNo = (archivo) => archivo.startsWith('e/') || archivo === 'og.png';

// Una página por evento (dist/e/<id>.html) para compartirlo: WhatsApp, Classroom o un correo no leen lo que va
// después del #, así que cada evento necesita su propia dirección con su título y su resumen. Lleva la misma
// tarjeta de marca (sin foto: no habría dónde poner su crédito) y el resumenNino entero (cortado, en un tema
// sensible podía perder «existen distintas interpretaciones»); quien la abre pasa de inmediato al evento.
function paginasParaCompartir() {
  let raiz;
  let salida;
  const attr = (texto) => String(texto).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return {
    name: 'historia-chile:paginas-para-compartir',
    apply: 'build',
    configResolved(config) {
      raiz = config.root;
      salida = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const carpeta = join(raiz, 'data');
      const eventos = readdirSync(carpeta)
        .filter((f) => /^\d\d-.*\.json$/.test(f))
        .flatMap((f) => JSON.parse(readFileSync(join(carpeta, f), 'utf8')))
        .filter((ev) => !ev.pendienteVerificacion);
      mkdirSync(join(salida, 'e'), { recursive: true });
      for (const ev of eventos) {
        const destino = `../#evento/${ev.id}`;
        const html = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8">
<title>${attr(ev.titulo)} · Historia de Chile Interactiva</title>
<meta name="description" content="${attr(ev.resumenNino)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Historia de Chile Interactiva">
<meta property="og:title" content="${attr(ev.titulo)}"><meta property="og:description" content="${attr(ev.resumenNino)}">
<meta property="og:url" content="${SITIO}e/${ev.id}.html"><meta property="og:image" content="${SITIO}og.png">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:locale" content="es_CL">
<meta name="twitter:card" content="summary_large_image">
<meta http-equiv="refresh" content="0; url=${destino}"><script>location.replace(${JSON.stringify(destino)})</script>
</head><body><p><a href="${destino}">${attr(ev.titulo)}</a></p></body></html>
`;
        writeFileSync(join(salida, 'e', `${ev.id}.html`), html);
      }
    },
  };
}

// Los textos largos de cada evento (detalle y fuentes, la mitad del peso de los datos) no van en la carga inicial:
// src/datos.js importa cada JSON de período con ?ligero (sin esos campos) y los pide con ?textos (solo esos
// campos, por id) al abrir un evento. El plugin de JSON de Vite no toca los JSON con una consulta propia, así que
// este load() entrega el módulo ya hecho, igual en npm run dev que al construir.
const TEXTOS = ['detalle', 'fuentes'];
function textosAPedido() {
  return {
    name: 'historia-chile:textos-a-pedido',
    enforce: 'pre',
    load(id) {
      // En npm run dev la consulta llega con más parámetros (?import&ligero).
      const [ruta, consulta = ''] = id.split('?');
      const parte = ['ligero', 'textos'].find((p) => new URLSearchParams(consulta).has(p));
      if (!parte || !/[\\/]data[\\/]\d\d-[^\\/]+\.json$/.test(ruta)) return null;
      this.addWatchFile(ruta);
      const eventos = JSON.parse(readFileSync(ruta, 'utf8'));
      const tomar = (ev, quedarse) => Object.fromEntries(Object.entries(ev).filter(([campo]) => TEXTOS.includes(campo) === quedarse));
      const datos = parte === 'ligero' ? eventos.map((ev) => tomar(ev, false)) : Object.fromEntries(eventos.map((ev) => [ev.id, tomar(ev, true)]));
      // Como hace Vite con los JSON grandes: JSON.parse de un texto se lee más rápido que un objeto literal.
      return { code: `export default JSON.parse(${JSON.stringify(JSON.stringify(datos))});`, moduleType: 'js' };
    },
  };
}

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
        .filter((f) => !sinConexionNo(f))
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
  plugins: [textosAPedido(), paginasParaCompartir(), serviceWorker()],
});
