// Capturas para la verificación visual (CLAUDE.md, «Verificación visual»): seis vistas en celular (390×844) y en
// escritorio (1440×900), en claro y en oscuro, con y sin «Texto grande», en capturas/ (ignorada en git). Levanta
// su propio servidor de Vite y usa el Edge instalado (Playwright sin navegadores propios; otro canal con
// CAPTURAS_CANAL=chrome). Con movimiento reducido, para que ninguna captura quede a mitad de una animación.
// Uso: npm run capturas, o npm run capturas -- portada mapa (solo esas vistas).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const VISTAS = [
  { nombre: 'portada', ruta: '#inicio' },
  { nombre: 'linea', ruta: '#linea' },
  { nombre: 'evento', ruta: '#evento/1818-batalla-de-maipu' },
  // El mapa con un período elegido en el filtro (Independencia).
  { nombre: 'mapa', ruta: '#mapa', preparar: (p) => p.click('.mapa-filtro .chip[data-periodo="03"]', { timeout: 5000 }) },
  { nombre: 'historia', ruta: '#historia/independencia/7' },
  { nombre: 'glosario', ruta: '#glosario' },
];
const TAMANOS = [
  { nombre: 'celular', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  { nombre: 'escritorio', viewport: { width: 1440, height: 900 } },
];
const TEMAS = [
  ['light', 'claro'],
  ['dark', 'oscuro'],
];
const DIR = 'capturas';

const pedidas = process.argv.slice(2);
const vistas = pedidas.length ? VISTAS.filter((v) => pedidas.includes(v.nombre)) : VISTAS;
if (!vistas.length) {
  console.error(`No conozco esas vistas. Las vistas son: ${VISTAS.map((v) => v.nombre).join(', ')}.`);
  process.exit(1);
}
mkdirSync(DIR, { recursive: true });

const servidor = await createServer({ logLevel: 'error', server: { port: 5199 } });
await servidor.listen();
const base = servidor.resolvedUrls.local[0];
const navegador = await chromium.launch({ channel: process.env.CAPTURAS_CANAL ?? 'msedge' });

// Lo que se ve en pantalla, listo: las letras y las imágenes a la vista (cargadas o ya cambiadas por el
// placeholder del período), y un respiro para que el diseño se acomode. Las de capas ocultas (la sección de
// abajo, con visibility: hidden) no cuentan: con loading=lazy no se piden nunca.
async function esperar(pagina) {
  await pagina.evaluate(() => document.fonts.ready);
  await pagina
    .waitForFunction(
      () =>
        [...document.images]
          .filter((img) => {
            const r = img.getBoundingClientRect();
            return r.width && r.height && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && img.checkVisibility({ visibilityProperty: true });
          })
          .every((img) => img.complete),
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  await pagina.waitForTimeout(500);
}

const errores = [];
const avisos = [];
let n = 0;
try {
  for (const t of TAMANOS) {
    const contexto = await navegador.newContext({
      viewport: t.viewport,
      isMobile: t.isMobile ?? false,
      hasTouch: t.hasTouch ?? false,
      deviceScaleFactor: 1,
      locale: 'es-CL',
    });
    const pagina = await contexto.newPage();
    pagina.on('pageerror', (e) => errores.push(`${pagina.url()}: ${e.message}`));
    await pagina.goto(base);
    for (const v of vistas) {
      for (const [esquema, tema] of TEMAS) {
        for (const grande of [false, true]) {
          // Cada captura parte de cero (primera visita), con «Texto grande» guardado si corresponde.
          await pagina.emulateMedia({ colorScheme: esquema, reducedMotion: 'reduce' });
          await pagina.evaluate((g) => {
            localStorage.clear();
            sessionStorage.clear();
            if (g) localStorage.setItem('historia-chile:texto', 'grande');
          }, grande);
          await pagina.goto(`${base}?c=${++n}${v.ruta}`, { waitUntil: 'load' });
          await esperar(pagina);
          if (v.preparar) {
            // Como lo haría una persona (el clic falla si otro elemento tapa el botón); si no se puede, se avisa
            // como problema y la captura se toma igual.
            await v.preparar(pagina).catch((e) => avisos.push(`${v.nombre}, ${t.nombre}, ${tema}${grande ? ', texto grande' : ''}: ${e.message.split('\n')[0]}`));
            await esperar(pagina);
          }
          await pagina.screenshot({ path: join(DIR, `${v.nombre}-${t.nombre}-${tema}${grande ? '-grande' : ''}.png`) });
        }
      }
    }
    await contexto.close();
  }
} finally {
  await navegador.close();
  await servidor.close();
}

console.log(`${n} capturas en ${DIR}/ (${vistas.map((v) => v.nombre).join(', ')}).`);
if (avisos.length) console.warn(`No se pudo preparar la vista como lo haría una persona (${avisos.length}):\n${avisos.map((a) => `  - ${a}`).join('\n')}`);
if (errores.length) {
  console.error(`Errores en la página (${errores.length}):\n${[...new Set(errores)].map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
