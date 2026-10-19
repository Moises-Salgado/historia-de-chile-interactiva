// Genera docs/FUENTES.md (fuentes e imagen de cada evento, por período) y las listas automáticas
// del final de docs/REVISION_PENDIENTE.md. Uso: npm run docs, cada vez que cambien los datos.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseFecha } from '../src/fechas.js';
import { nombreFuente } from '../src/util.js';

const RAIZ = resolve(import.meta.dirname, '..');
const leer = (archivo) => JSON.parse(readFileSync(join(RAIZ, 'data', archivo), 'utf8'));
const periodos = leer('periodos.json');
const eventos = readdirSync(join(RAIZ, 'data'))
  .filter((nombre) => /^\d{2}-.+\.json$/.test(nombre))
  .sort()
  .flatMap(leer)
  .map((ev) => ({ ...ev, t: parseFecha(ev.fecha).valor }))
  .sort((a, b) => a.t - b.t);

const md = (texto) => String(texto).replace(/[\\*_[\]<>|`]/g, '\\$&');
const enlace = (texto, url) => `[${md(texto)}](<${url}>)`;
const evento = (ev) => `${md(ev.fechaTexto)} · ${md(ev.titulo)} (\`${ev.id}\`)`;

function contar(lista) {
  const cuentas = new Map();
  for (const x of lista) cuentas.set(x, (cuentas.get(x) ?? 0) + 1);
  return [...cuentas].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
}

const tabla = (titulo, filas) => [`| ${titulo} | Cantidad |`, '|---|---:|', ...filas.map(([n, c]) => `| ${md(n)} | ${c} |`)];

// Igual que en el detalle de la app: si una institución se repite, sus enlaces se numeran.
function fuentesDe(ev) {
  const nombres = ev.fuentes.map(nombreFuente);
  const vistos = new Map();
  return ev.fuentes
    .map((url, i) => {
      const nombre = nombres[i];
      vistos.set(nombre, (vistos.get(nombre) ?? 0) + 1);
      return enlace(nombres.indexOf(nombre) !== nombres.lastIndexOf(nombre) ? `${nombre} ${vistos.get(nombre)}` : nombre, url);
    })
    .join(' · ');
}

// docs/FUENTES.md
const enlaces = eventos.flatMap((ev) => ev.fuentes.map(nombreFuente));
const fuentes = [
  '# Fuentes por evento',
  '',
  '> Archivo generado con `npm run docs` a partir de `data/`: no se edita a mano.',
  '',
  `${eventos.length} eventos en ${periodos.length} períodos, con ${enlaces.length} enlaces a fuentes. Las imágenes vienen de Wikimedia Commons y conservan el autor y la licencia indicados; la app los muestra junto a cada imagen.`,
  '',
  '## Resumen',
  '',
  ...tabla('Fuente', contar(enlaces)),
  '',
  ...tabla('Licencia de la imagen', contar(eventos.map((ev) => ev.imagen.licencia))),
];
for (const p of periodos) {
  fuentes.push('', `## ${p.id} · ${md(p.nombre)} (${p.fechasTexto})`, '');
  for (const ev of eventos.filter((e) => e.periodoId === p.id)) {
    const { archivo, autor, licencia, urlPagina } = ev.imagen;
    fuentes.push(
      `- **${md(ev.fechaTexto)} · ${md(ev.titulo)}** · \`${ev.id}\`${ev.pendienteVerificacion ? ' · *pendiente de verificación: no se muestra en la app*' : ''}`,
      `  - Fuentes: ${fuentesDe(ev)}`,
      `  - Imagen: ${enlace(archivo.replaceAll('_', ' '), urlPagina)} · ${md(autor)} · ${md(licencia)}`,
    );
  }
}
writeFileSync(join(RAIZ, 'docs/FUENTES.md'), `${fuentes.join('\n')}\n`);

// Listas automáticas de docs/REVISION_PENDIENTE.md (entre las dos marcas; el resto se escribe a mano).
const INICIO = '<!-- generado con npm run docs: inicio -->';
const FIN = '<!-- generado con npm run docs: fin -->';
const lista = (titulo, elegidos, vacio) => ['', `### ${titulo} (${elegidos.length})`, '', ...(elegidos.length ? elegidos.map((ev) => `- ${evento(ev)}`) : [vacio])];
const aproximadas = eventos.filter((ev) => ev.fechaAproximada);
// Mapa: los lugares cuyo punto representa un sitio o una zona (con su nota y los eventos que lo usan).
const { lugares } = leer('lugares.json');
const ubicaciones = leer('ubicaciones.json');
const lugaresAproximados = lugares.filter((l) => l.aproximado);
const usos = (id) => eventos.filter((ev) => ubicaciones[ev.id]?.includes(id)).map((ev) => `\`${ev.id}\``);
// Glosario: todas sus explicaciones esperan revisión humana (docs/PLAN_MVP.md, M8).
let glosario = [];
try {
  glosario = leer('glosario.json');
} catch {
  // Sin glosario todavía.
}
const deDonde = (g) => (g.fuente ? enlace(nombreFuente(g.fuente), g.fuente) : `del texto de \`${g.deTexto?.evento}\`: «${md(g.deTexto?.frase ?? '')}»`);
const seccion = [
  INICIO,
  '## Listas automáticas',
  ...lista('Fechas aproximadas', aproximadas, 'Ninguna.'),
  ...lista('Pendientes de verificación (no se muestran en la app)', eventos.filter((ev) => ev.pendienteVerificacion), 'Ninguno.'),
  ...lista('Con Wikipedia como única fuente', eventos.filter((ev) => ev.fuentes.every((url) => nombreFuente(url) === 'Wikipedia')), 'Ninguno.'),
  '',
  `### Lugares del mapa con ubicación aproximada (${lugaresAproximados.length})`,
  '',
  ...(lugaresAproximados.length
    ? lugaresAproximados.map(
        (l) => `- ${md(l.nombre)} (\`${l.id}\`): ${md(l.nota)}. ${enlace(`Wikidata ${l.wikidata}`, `https://www.wikidata.org/wiki/${l.wikidata}`)} · eventos: ${usos(l.id).join(', ')}`,
      )
    : ['Ninguno.']),
  '',
  `### Glosario: explicaciones por revisar (${glosario.length})`,
  '',
  ...(glosario.length ? glosario.map((g) => `- **${md(g.termino)}**: ${md(g.definicion)} (${deDonde(g)})`) : ['Ninguna.']),
  FIN,
].join('\n');
const ruta = join(RAIZ, 'docs/REVISION_PENDIENTE.md');
const actual = readFileSync(ruta, 'utf8');
const desde = actual.indexOf(INICIO);
const hasta = actual.indexOf(FIN);
writeFileSync(ruta, desde >= 0 && hasta > desde ? actual.slice(0, desde) + seccion + actual.slice(hasta + FIN.length) : `${actual.trimEnd()}\n\n${seccion}\n`);

console.log(`docs/FUENTES.md: ${eventos.length} eventos y ${enlaces.length} enlaces. docs/REVISION_PENDIENTE.md: ${aproximadas.length} fechas aproximadas.`);
