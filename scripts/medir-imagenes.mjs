// Mide en Wikimedia Commons el ancho y el alto del original de cada imagen de /data y los guarda en
// data/imagenes-medidas.json ({ "Archivo.jpg": [ancho, alto] }). El detalle de cada evento compone la imagen según
// su forma (vertical, horizontal o cuadrada) sin saltos al cargarla, y no la amplía más de 1,5 veces su tamaño.
// Uso: node scripts/medir-imagenes.mjs   (después de agregar o cambiar imágenes; luego, npm test).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = resolve('data');
const API = 'https://commons.wikimedia.org/w/api.php';
const HEADERS = { 'User-Agent': 'HistoriaDeChileInteractiva/0.1 (sitio educativo; medidas de imagenes)' };
const LOTE = 50; // máximo de títulos por consulta a la API

const archivos = [
  ...new Set(
    readdirSync(DIR)
      .filter((n) => /^\d{2}-[a-z0-9-]+\.json$/.test(n))
      .flatMap((n) => JSON.parse(readFileSync(join(DIR, n), 'utf8')).map((ev) => ev.imagen?.archivo))
      .filter((a) => typeof a === 'string' && a.trim()),
  ),
].sort();

async function pedir(url) {
  for (let intento = 1; ; intento++) {
    const res = await fetch(url, { headers: HEADERS });
    if ((res.status !== 429 && res.status < 500) || intento === 5) return res;
    await res.body?.cancel();
    await new Promise((listo) => setTimeout(listo, 2000 * 2 ** (intento - 1)));
  }
}

const medidas = {};
const faltan = [];
for (let i = 0; i < archivos.length; i += LOTE) {
  const lote = archivos.slice(i, i + LOTE);
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'imageinfo',
    iiprop: 'size',
    titles: lote.map((a) => `File:${a}`).join('|'),
  });
  const res = await pedir(`${API}?${params}`);
  if (!res.ok) throw new Error(`La API de Commons respondió ${res.status}`);
  const { query } = await res.json();
  // La API normaliza los títulos (guiones bajos por espacios): se vuelve al nombre del archivo en los datos.
  const original = new Map(lote.map((a) => [`File:${a}`, a]));
  for (const { from, to } of query.normalized ?? []) original.set(to, original.get(from));
  for (const pagina of query.pages) {
    const info = pagina.imageinfo?.[0];
    const archivo = original.get(pagina.title);
    if (archivo && info?.width && info?.height) medidas[archivo] = [info.width, info.height];
  }
}
for (const a of archivos) if (!medidas[a]) faltan.push(a);

const lineas = Object.keys(medidas)
  .sort()
  .map((a) => `  ${JSON.stringify(a)}: [${medidas[a].join(', ')}]`);
writeFileSync(join(DIR, 'imagenes-medidas.json'), `{\n${lineas.join(',\n')}\n}\n`);
console.log(`Medidas de ${Object.keys(medidas).length} de ${archivos.length} imágenes en data/imagenes-medidas.json.`);
if (faltan.length) {
  console.log(`Sin medida (revisar con npm run verificar-imagenes):\n  ${faltan.join('\n  ')}`);
  process.exitCode = 1;
}
