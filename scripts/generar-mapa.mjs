// Genera el mapa de Chile de la app a partir de Natural Earth (dominio público):
//   · src/chile-regiones.json: las 16 regiones como caminos SVG simplificados (se carga al abrir el mapa).
//   · la silueta de la portada, dentro de <symbol id="silueta-chile"> en index.html.
// Uso: node scripts/generar-mapa.mjs <ne_10m_admin_1_states_provinces.geojson>
// Fuente (versión 5.1.2): https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_1_states_provinces.geojson
// Proyección equirectangular centrada en la latitud media de Chile (36,75° S); Rapa Nui va en un recuadro
// a 8 veces la escala y Salas y Gómez queda fuera. Ver docs/IDEA_MAESTRA.md.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , entrada] = process.argv;
if (!entrada) {
  console.error('Uso: node scripts/generar-mapa.mjs <ne_10m_admin_1_states_provinces.geojson>');
  process.exit(1);
}
const features = JSON.parse(readFileSync(entrada, 'utf8')).features.filter((f) => f.properties.adm0_a3 === 'CHL');

const LON_MIN = -80.5;
const LAT_MAX = -17.4;
const LAT_MIN = -56.1;
const K = Math.cos((36.75 * Math.PI) / 180);
const S = 26; // unidades SVG por grado
const ANCHO = (-66 - LON_MIN) * K * S;
const ALTO = (LAT_MAX - LAT_MIN) * S;
const RAPA = { lon: -109.35, lat: -27.12, escala: 8, x: 34, y: 300 };
const proyectar = ([lon, lat]) => [(lon - LON_MIN) * K * S, (LAT_MAX - lat) * S];
const proyectarRapa = ([lon, lat]) => [RAPA.x + (lon - RAPA.lon) * K * S * RAPA.escala, RAPA.y + (RAPA.lat - lat) * S * RAPA.escala];
const ORDEN = ['AP', 'TA', 'AN', 'AT', 'CO', 'VS', 'RM', 'LI', 'ML', 'NB', 'BI', 'AR', 'LR', 'LL', 'AI', 'MA'];

function area(anillo) {
  let a = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) a += (anillo[j][0] + anillo[i][0]) * (anillo[j][1] - anillo[i][1]);
  return Math.abs(a / 2);
}

function centroide(anillo) {
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const f = anillo[j][0] * anillo[i][1] - anillo[i][0] * anillo[j][1];
    x += (anillo[j][0] + anillo[i][0]) * f;
    y += (anillo[j][1] + anillo[i][1]) * f;
    a += f;
  }
  return [x / (3 * a), y / (3 * a)];
}

// Douglas-Peucker sobre coordenadas ya proyectadas.
function simplificar(puntos, eps) {
  if (puntos.length < 4) return puntos;
  const marcar = new Uint8Array(puntos.length);
  marcar[0] = marcar[puntos.length - 1] = 1;
  const pila = [[0, puntos.length - 1]];
  while (pila.length) {
    const [a, b] = pila.pop();
    const [x1, y1] = puntos[a];
    const [x2, y2] = puntos[b];
    const largo = Math.hypot(x2 - x1, y2 - y1) || 1;
    let max = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((y2 - y1) * puntos[i][0] - (x2 - x1) * puntos[i][1] + x2 * y1 - y2 * x1) / largo;
      if (d > max) [max, idx] = [d, i];
    }
    if (max > eps) {
      marcar[idx] = 1;
      pila.push([a, idx], [idx, b]);
    }
  }
  return puntos.filter((_, i) => marcar[i]);
}

// Un anillo cerrado empieza y termina en el mismo punto: se parte en el punto más lejano del inicio.
function simplificarAnillo(anillo, eps) {
  let lejos = 0;
  let max = 0;
  for (let i = 1; i < anillo.length; i++) {
    const d = Math.hypot(anillo[i][0] - anillo[0][0], anillo[i][1] - anillo[0][1]);
    if (d > max) [max, lejos] = [d, i];
  }
  if (!lejos) return anillo;
  return [...simplificar(anillo.slice(0, lejos + 1), eps).slice(0, -1), ...simplificar(anillo.slice(lejos), eps)];
}

const camino = (anillo) => `M${anillo.map(([x, y]) => `${+x.toFixed(1)} ${+y.toFixed(1)}`).join('L')}Z`;

// Camino corto para la silueta: coordenadas enteras y relativas.
function caminoCorto(anillo) {
  const pts = anillo.map(([x, y]) => [Math.round(x), Math.round(y)]).filter((p, i, a) => !i || p[0] !== a[i - 1][0] || p[1] !== a[i - 1][1]);
  if (pts.length < 3) return '';
  return `M${pts[0][0]} ${pts[0][1]}${pts
    .slice(1)
    .map(([x, y], i) => `l${x - pts[i][0]} ${y - pts[i][1]}`)
    .join('')}z`.replace(/ -/g, '-');
}

const regiones = [];
let silueta = '';
for (const f of features) {
  const codigo = f.properties.iso_3166_2.replace('CL-', '');
  const polis = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const partes = [];
  let mayor = null;
  let rapa = '';
  for (const pol of polis) {
    const exterior = pol[0];
    const lonMedia = exterior.reduce((s, c) => s + c[0], 0) / exterior.length;
    const latMedia = exterior.reduce((s, c) => s + c[1], 0) / exterior.length;
    if (lonMedia < -100) {
      if (lonMedia > -110 && lonMedia < -108) rapa = camino(simplificarAnillo(exterior.map(proyectarRapa), 0.4));
      continue;
    }
    if (lonMedia < LON_MIN || latMedia < LAT_MIN) continue;
    const proyectado = exterior.map(proyectar);
    const a = area(proyectado);
    const isla = lonMedia < -78; // Juan Fernández y las Desventuradas: se dibujan aunque sean chicas
    if (a < 1.2 && !isla) continue;
    partes.push(camino(simplificarAnillo(proyectado, isla ? 0.15 : 0.55)));
    if (!isla && a >= 25) silueta += caminoCorto(simplificarAnillo(proyectado, 2.5));
    if (!mayor || a > mayor.a) mayor = { a, c: centroide(proyectado) };
  }
  regiones.push({ codigo, d: partes.join(''), rapa, centro: mayor.c.map((v) => +v.toFixed(1)) });
}
regiones.sort((a, b) => ORDEN.indexOf(a.codigo) - ORDEN.indexOf(b.codigo));
if (regiones.length !== 16 || regiones.some((r) => !ORDEN.includes(r.codigo))) throw new Error('No se encontraron las 16 regiones de Chile.');

const datos = { ancho: +ANCHO.toFixed(1), alto: +ALTO.toFixed(1), proyeccion: { LON_MIN, LAT_MAX, K: +K.toFixed(6), S }, rapa: RAPA, regiones };
writeFileSync(new URL('../src/chile-regiones.json', import.meta.url), `${JSON.stringify(datos)}\n`);

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const simbolo = /(<symbol id="silueta-chile" viewBox="0 0 302 1006"><path d=")[^"]*(")/;
if (!simbolo.test(html)) throw new Error('No se encontró <symbol id="silueta-chile"> en index.html.');
writeFileSync(new URL('../index.html', import.meta.url), html.replace(simbolo, `$1${silueta}$2`));
console.log(`Regiones: ${regiones.length} (${(JSON.stringify(datos).length / 1024).toFixed(1)} KB) · silueta: ${(silueta.length / 1024).toFixed(1)} KB`);
