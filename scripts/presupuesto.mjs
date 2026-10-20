// Presupuesto del plan MVP (docs/PLAN_MVP.md, «Reglas para todo lo nuevo»): peso del sitio construido y reglas
// del CSS que se pueden comprobar sin navegador. Uso: npm run build && npm run presupuesto
// Falla (código 1) si algo se pasa; LCP, CLS y cuadros por segundo se miden aparte, con el navegador.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

// Peso gzip antes del plan (KB; zlib con su nivel por omisión, medido sobre lo publicado en el commit 405478a):
// la carga inicial puede crecer 8 KB; el mapa ya existía y conserva su peso con 2 KB de margen (1 KB del plan
// MVP y 1 KB más de la auditoría externa: el recuadro de la región, la leyenda y las clases fijas, docs/
// PLAN_AUDITORIA.md); cada módulo nuevo a pedido, 15 KB, y 60 KB en total.
const BASE = { inicial: 11.39 + 122.24, mapa: 21.97 };
const TOPE = { extraInicial: 8, mapaExtra: 2, mapaCss: 3, modulo: 15, modulosTotal: 60, pagina: 2 };
const DIST = 'dist';

const errores = [];
const avisos = [];
const kb = (bytes) => bytes / 1000;
const gz = (archivo) => kb(gzipSync(readFileSync(archivo)).length);
const f = (n) => n.toFixed(2).padStart(7);

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('No hay sitio construido: corre primero «npm run build».');
  process.exit(1);
}

// ---- Peso: lo que pide index.html es la carga inicial; los demás módulos se cargan a pedido ----
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const pedidos = new Set([...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]));
const activos = readdirSync(join(DIST, 'assets')).filter((a) => /\.(js|css)$/.test(a));
let inicial = 0;
let modulos = 0;
let textos = 0;
console.log('Peso gzip (KB)');
for (const a of activos.sort()) {
  const peso = gz(join(DIST, 'assets', a));
  const ruta = `assets/${a}`;
  if (pedidos.has(ruta)) {
    inicial += peso;
    console.log(`  inicial  ${f(peso)}  ${a}`);
  } else if (/^\d\d-/.test(a)) {
    // Detalle y fuentes de los eventos de un período (mvp 7): salieron de la carga inicial, no son peso nuevo.
    textos += peso;
    console.log(`  textos   ${f(peso)}  ${a}`);
    if (peso > TOPE.modulo) errores.push(`${a} pesa ${peso.toFixed(2)} KB (tope ${TOPE.modulo} por archivo).`);
  } else if (a.startsWith('mapa-')) {
    // Su CSS (src/mapa.css) salió de la carga inicial (mvp 5): tiene su propio tope.
    const tope = a.endsWith('.css') ? TOPE.mapaCss : BASE.mapa + TOPE.mapaExtra;
    console.log(`  mapa     ${f(peso)}  ${a}`);
    if (peso > tope) errores.push(`${a} pesa ${peso.toFixed(2)} KB (tope ${tope.toFixed(2)}).`);
  } else {
    modulos += peso;
    console.log(`  a pedido ${f(peso)}  ${a}`);
    if (peso > TOPE.modulo) errores.push(`${a} pesa ${peso.toFixed(2)} KB (tope ${TOPE.modulo} por módulo).`);
  }
}
const topeInicial = BASE.inicial + TOPE.extraInicial;
console.log(`  Carga inicial: ${inicial.toFixed(2)} KB (antes del plan ${BASE.inicial.toFixed(2)}, tope ${topeInicial.toFixed(2)})`);
console.log(`  Módulos nuevos a pedido: ${modulos.toFixed(2)} KB (tope ${TOPE.modulosTotal})`);
console.log(`  Textos de los eventos, al abrir uno: ${textos.toFixed(2)} KB en total (antes, en la carga inicial)`);
if (inicial > topeInicial) errores.push(`La carga inicial pesa ${inicial.toFixed(2)} KB (tope ${topeInicial.toFixed(2)}).`);
if (modulos > TOPE.modulosTotal) errores.push(`Los módulos a pedido suman ${modulos.toFixed(2)} KB (tope ${TOPE.modulosTotal}).`);

// Páginas para compartir (e/<id>.html), si existen: 2 KB cada una.
if (existsSync(join(DIST, 'e'))) {
  const paginas = readdirSync(join(DIST, 'e'));
  const grandes = paginas.filter((p) => kb(readFileSync(join(DIST, 'e', p)).length) > TOPE.pagina);
  console.log(`  Páginas para compartir: ${paginas.length}${grandes.length ? `, ${grandes.length} sobre ${TOPE.pagina} KB` : ''}`);
  if (grandes.length) errores.push(`Páginas para compartir sobre ${TOPE.pagina} KB: ${grandes.slice(0, 5).join(', ')}.`);
}

// ---- CSS: letra de 1rem o más, duraciones de 400 ms o menos y nada en bucle ----
// Sin comentarios, pero con sus saltos de línea: así el número de línea calza con el archivo.
for (const hoja of ['src/styles.css', 'src/mapa.css', 'src/vistas.css'].filter(existsSync)) {
  const css = readFileSync(hoja, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
  const donde = (i) => `${hoja}:${css.slice(0, i).split('\n').length}`;
  // El primer valor fijo de la declaración (en max(), clamp() o calc(), el mínimo va primero).
  for (const m of css.matchAll(/font-size:\s*([^;}]+)/g)) {
    const valor = m[1].trim();
    const n = /(-?[\d.]+)(rem|px)\b/.exec(valor);
    if (!n) continue;
    const rem = n[2] === 'px' ? Number(n[1]) / 18 : Number(n[1]);
    if (/^min\(/.test(valor)) avisos.push(`font-size con min() (${donde(m.index)}): revisar que no baje de 1rem.`);
    else if (rem < 1) errores.push(`font-size bajo 1rem (${donde(m.index)}): ${valor}`);
  }
  for (const m of css.matchAll(/(transition|animation)(-duration)?:\s*([^;}]+)/g)) {
    // La única excepción al tope (CLAUDE.md, «Movimiento»): el Ken Burns lento del encabezado de un evento.
    if (/\bken-burns\b/.test(m[3])) {
      avisos.push(`Ken Burns (${donde(m.index)}): excepción al tope de 400 ms, una sola vez y sin movimiento reducido.`);
      continue;
    }
    for (const d of m[3].matchAll(/(?<![\w-])([\d.]+)(ms|s)\b/g)) {
      const ms = d[2] === 's' ? Number(d[1]) * 1000 : Number(d[1]);
      if (ms > 400) errores.push(`Duración de ${ms} ms (${donde(m.index)}): el tope es 400 ms.`);
    }
    if (/\binfinite\b/.test(m[3])) errores.push(`Animación en bucle (${donde(m.index)}): no se permite.`);
  }
}

for (const a of avisos) console.log(`Aviso: ${a}`);
if (errores.length) {
  console.error(`\n${errores.length} ${errores.length === 1 ? 'problema' : 'problemas'}:`);
  for (const e of errores) console.error(`  - ${e}`);
  process.exit(1);
}
console.log('\nOK: dentro del presupuesto.');
