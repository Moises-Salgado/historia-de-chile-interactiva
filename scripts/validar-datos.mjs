// Test de humo de los datos: comprueba que cada JSON de /data cumpla el esquema de data/README.md.
// Uso: node scripts/validar-datos.mjs [carpeta]   (por defecto ./data). Sale con código 1 si hay errores.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseFecha } from '../src/fechas.js';

const DIR = resolve(process.argv[2] ?? 'data');
const ARCHIVO_EVENTOS = /^(\d{2})-[a-z0-9-]+\.json$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LICENCIA = /^(?:Dominio público|CC0 1\.0|CC BY(?:-SA)? (?:1\.0|2\.0|2\.5|3\.0|4\.0)(?: [A-Z]{2,3})?)$/;
const EXTENSION = /\.(?:jpe?g|png|gif|svg|tiff?|webp)$/i;
const COMMONS = 'https://commons.wikimedia.org/wiki/File:';
const ABREVIATURAS = /\b(?:c|a\.C|d\.C|Sr|Sra|Dr|Gral|Pdte|aprox|Sto|Sta)\./g;
const TEXTOS = ['id', 'titulo', 'fechaTexto', 'periodoId', 'lugar', 'resumenNino', 'resumen', 'detalle'];
const CAMPOS = new Set([...TEXTOS, 'fecha', 'fechaFin', 'fechaAproximada', 'temas', 'importancia', 'personajes',
  'imagen', 'fuentes', 'pendienteVerificacion']);
const CAMPOS_IMAGEN = ['archivo', 'autor', 'licencia', 'urlPagina', 'pieDeFoto'];
const ANIO_ACTUAL = new Date().getFullYear();

const errores = [];
const avisos = [];
const error = (donde, msg) => errores.push(`${donde}: ${msg}`);
const aviso = (donde, msg) => avisos.push(`${donde}: ${msg}`);
const esTexto = (v) => typeof v === 'string' && v.trim() !== '';

function leer(nombre) {
  try {
    return JSON.parse(readFileSync(join(DIR, nombre), 'utf8'));
  } catch (e) {
    error(nombre, `no es un JSON válido (${e.message})`);
    return null;
  }
}

// Cuenta oraciones sin confundir abreviaturas ("c. 1470", "a.C.", "Gral.") con puntos finales.
function oraciones(texto) {
  const limpio = texto.replace(ABREVIATURAS, '');
  return (limpio.match(/[.!?…]+["»”)]*(?=\s|$)/g) ?? []).length || 1;
}

function validarTemas(lista) {
  const ids = new Set();
  if (!Array.isArray(lista)) {
    error('temas.json', 'debe ser una lista');
    return ids;
  }
  lista.forEach((t, i) => {
    const d = `temas.json [${t?.id ?? i}]`;
    if (!ID.test(t?.id ?? '')) error(d, 'id inválido (minúsculas y guiones)');
    else if (ids.has(t.id)) error(d, 'id repetido');
    else ids.add(t.id);
    if (!esTexto(t?.nombre)) error(d, 'falta "nombre"');
  });
  return ids;
}

function validarPeriodos(lista) {
  const periodos = new Map();
  if (!Array.isArray(lista)) {
    error('periodos.json', 'debe ser una lista');
    return periodos;
  }
  lista.forEach((p, i) => {
    const d = `periodos.json [${p?.id ?? i}]`;
    if (!/^\d{2}$/.test(p?.id ?? '')) return error(d, 'id debe tener dos dígitos ("01")');
    if (periodos.has(p.id)) return error(d, 'id repetido');
    periodos.set(p.id, p);
    for (const k of ['nombre', 'fechasTexto', 'descripcion']) if (!esTexto(p[k])) error(d, `falta "${k}"`);
    if (!Number.isInteger(p.inicio)) error(d, '"inicio" debe ser un año entero');
    if (p.fin !== null && !(Number.isInteger(p.fin) && p.fin >= p.inicio)) error(d, '"fin" debe ser un año ≥ "inicio", o null');
    if (!/^#[0-9a-f]{6}$/i.test(p.color ?? '')) error(d, '"color" debe ser hex #rrggbb');
  });
  return periodos;
}

function validarFechas(ev, d, ctx) {
  const f = parseFecha(ev.fecha);
  if (typeof ev.fechaAproximada !== 'boolean') error(d, 'falta "fechaAproximada" (true o false)');
  if (!f) {
    error(d, `fecha inválida "${ev.fecha}" (AAAA, AAAA-MM o AAAA-MM-DD; a.C. con año negativo)`);
  } else {
    if (f.anio < 0 && f.mes) error(d, 'las fechas a.C. llevan solo el año');
    if (f.anio < 0 && ev.fechaAproximada !== true) error(d, 'las fechas a.C. deben tener "fechaAproximada": true');
    if (f.anio > ANIO_ACTUAL) error(d, 'fecha en el futuro');
    if (f.anio > 2023 && ev.pendienteVerificacion !== true) ctx.recientes.push(ev.id);
    const p = ctx.periodos.get(ev.periodoId);
    // Un proceso (con fechaFin) basta con que se cruce con el período.
    const anioFin = (typeof ev.fechaFin === 'string' && parseFecha(ev.fechaFin)?.anio) || f.anio;
    if (p && (anioFin < p.inicio || f.anio > (p.fin ?? ANIO_ACTUAL))) {
      aviso(d, `fecha fuera del rango del período ${p.id} (${p.fechasTexto})`);
    }
  }
  if (ev.fechaFin !== undefined) {
    const fin = parseFecha(ev.fechaFin);
    if (!fin) error(d, `fechaFin inválida "${ev.fechaFin}"`);
    else if (f && fin.valor <= f.valor) error(d, 'fechaFin debe ser posterior a fecha');
  }
  if (esTexto(ev.fechaTexto)) {
    const conC = /(?:^|[\s(])c\.\s?\d/.test(ev.fechaTexto);
    if (ev.fechaAproximada === true && !conC) aviso(d, 'fecha aproximada: falta "c." en fechaTexto');
    if (ev.fechaAproximada === false && conC) error(d, 'fechaTexto dice "c." pero "fechaAproximada" es false');
  }
}

function validarImagen(ev, d, ctx) {
  const img = ev.imagen;
  if (!img || typeof img !== 'object' || Array.isArray(img)) return error(d, 'falta "imagen"');
  for (const k of CAMPOS_IMAGEN) if (!esTexto(img[k])) error(d, `imagen sin "${k}"`);
  if (esTexto(img.licencia) && !LICENCIA.test(img.licencia)) {
    error(d, `licencia no permitida "${img.licencia}" (Dominio público, CC0 1.0, CC BY x.x o CC BY-SA x.x)`);
  }
  if (!esTexto(img.archivo)) return;
  if (/^(?:file|archivo|image|imagen):/i.test(img.archivo)) error(d, 'imagen.archivo va sin el prefijo "File:"');
  if (!EXTENSION.test(img.archivo)) error(d, 'imagen.archivo sin extensión de imagen');
  if (esTexto(img.urlPagina)) {
    const nombre = (s) => s.replace(/_/g, ' ').trim();
    let enUrl = null;
    try {
      if (img.urlPagina.startsWith(COMMONS)) enUrl = decodeURIComponent(img.urlPagina.slice(COMMONS.length));
    } catch {
      // URL mal codificada: se informa abajo.
    }
    if (enUrl === null || nombre(enUrl) !== nombre(img.archivo)) error(d, `imagen.urlPagina debe ser ${COMMONS}<archivo>`);
  }
  if (ctx.imagenes.has(img.archivo)) aviso(d, `imagen repetida (también en ${ctx.imagenes.get(img.archivo)})`);
  ctx.imagenes.set(img.archivo, ev.id);
}

function validarFuentes(ev, d) {
  if (!Array.isArray(ev.fuentes) || !ev.fuentes.length) return error(d, '"fuentes" debe tener al menos una URL');
  const hosts = [];
  for (const u of ev.fuentes) {
    try {
      const url = new URL(u);
      if (url.protocol !== 'https:') error(d, `fuente sin https: ${u}`);
      hosts.push(url.hostname);
    } catch {
      error(d, `fuente que no es URL: ${u}`);
    }
  }
  if (new Set(ev.fuentes).size !== ev.fuentes.length) aviso(d, 'fuentes repetidas');
  if (hosts.length && hosts.every((h) => h.endsWith('wikipedia.org'))) {
    aviso(d, 'solo Wikipedia como fuente: contrastar con Memoria Chilena, BCN u otra fuente primaria');
  }
}

function validarEvento(ev, archivo, prefijo, ctx) {
  const d = `${archivo} [${ev?.id ?? '¿sin id?'}]`;
  if (!ev || typeof ev !== 'object' || Array.isArray(ev)) return error(d, 'cada evento debe ser un objeto');

  for (const k of Object.keys(ev)) if (!CAMPOS.has(k)) aviso(d, `campo desconocido "${k}"`);
  for (const k of TEXTOS) if (!esTexto(ev[k])) error(d, `falta "${k}" (texto no vacío)`);

  if (esTexto(ev.id)) {
    if (!ID.test(ev.id)) error(d, 'id solo admite minúsculas sin tildes, números y guiones');
    if (ctx.ids.has(ev.id)) error(d, `id repetido (también en ${ctx.ids.get(ev.id)})`);
    ctx.ids.set(ev.id, archivo);
    ctx.eventos.set(ev.id, ev);
  }
  if (esTexto(ev.titulo) && ev.titulo.length > 80) aviso(d, 'título de más de 80 caracteres');
  if (esTexto(ev.periodoId)) {
    if (!ctx.periodos.has(ev.periodoId)) error(d, `periodoId "${ev.periodoId}" no existe en periodos.json`);
    if (ev.periodoId !== prefijo) error(d, `periodoId "${ev.periodoId}" no coincide con el archivo (${prefijo})`);
  }
  validarFechas(ev, d, ctx);

  if (!Array.isArray(ev.temas) || !ev.temas.length) {
    error(d, '"temas" debe ser una lista con al menos un tema');
  } else {
    for (const t of ev.temas) if (!ctx.temas.has(t)) error(d, `tema desconocido "${t}" (ver temas.json)`);
    if (new Set(ev.temas).size !== ev.temas.length) aviso(d, 'temas repetidos');
  }
  if (![1, 2, 3].includes(ev.importancia)) error(d, '"importancia" debe ser 1, 2 o 3');
  if (!Array.isArray(ev.personajes) || !ev.personajes.every(esTexto)) {
    error(d, '"personajes" debe ser una lista de nombres (puede ir vacía)');
  }

  if (esTexto(ev.resumenNino) && oraciones(ev.resumenNino) > 2) aviso(d, 'resumenNino con más de 2 oraciones');
  if (esTexto(ev.resumen)) {
    const n = oraciones(ev.resumen);
    if (n < 3 || n > 4) aviso(d, `resumen con ${n} oraciones (se esperan 3-4)`);
  }
  if (esTexto(ev.detalle)) {
    const n = ev.detalle.split(/\n\s*\n/).filter(esTexto).length;
    if (n > 3) aviso(d, `detalle con ${n} párrafos (máximo 3)`);
  }

  validarImagen(ev, d, ctx);
  validarFuentes(ev, d);

  if (ev.pendienteVerificacion !== undefined && typeof ev.pendienteVerificacion !== 'boolean') {
    error(d, '"pendienteVerificacion" debe ser true o false');
  }
  if (ev.pendienteVerificacion === true) ctx.pendientes.push(ev.id);
}

// Ids de eventos que usan las historias y los grupos: deben existir, verse en la app y no repetirse.
function idsDeEventos(lista, d, ctx, minimo) {
  if (!Array.isArray(lista) || lista.length < minimo) {
    error(d, `"eventos" debe ser una lista de al menos ${minimo} ids`);
    return [];
  }
  if (new Set(lista).size !== lista.length) error(d, 'eventos repetidos');
  return lista.filter((id) => {
    const ev = ctx.eventos.get(id);
    if (!ev) error(d, `el evento "${id}" no existe`);
    else if (ev.pendienteVerificacion) error(d, `el evento "${id}" está pendiente de verificación (no se muestra)`);
    return ev && !ev.pendienteVerificacion;
  });
}

function validarLista(nombre, lista, validar) {
  if (!Array.isArray(lista)) return error(nombre, 'debe ser una lista');
  const ids = new Set();
  lista.forEach((x, i) => {
    const d = `${nombre} [${x?.id ?? i}]`;
    if (!ID.test(x?.id ?? '')) error(d, 'id inválido (minúsculas, números y guiones)');
    else if (ids.has(x.id)) error(d, 'id repetido');
    ids.add(x?.id);
    for (const k of ['titulo', 'descripcion']) if (!esTexto(x?.[k])) error(d, `falta "${k}"`);
    validar(x ?? {}, d);
  });
}

// Historias guiadas: pasos en orden cronológico.
function validarRecorridos(lista, ctx) {
  validarLista('recorridos.json', lista, (r, d) => {
    const valores = idsDeEventos(r.eventos, d, ctx, 3).map((id) => parseFecha(ctx.eventos.get(id).fecha)?.valor ?? 0);
    if (valores.some((v, i) => i > 0 && v < valores[i - 1])) error(d, 'los pasos deben ir en orden cronológico');
  });
}

// Grupos: eventos de una misma fecha que la línea de tiempo muestra en una sola tarjeta.
function validarGrupos(lista, ctx) {
  const usados = new Map();
  validarLista('grupos.json', lista, (g, d) => {
    if (!esTexto(g.miembros)) error(d, 'falta "miembros" (sustantivo en plural, ej. "pueblos")');
    const ids = idsDeEventos(g.eventos, d, ctx, 2);
    if (new Set(ids.map((id) => ctx.eventos.get(id).fecha)).size > 1) error(d, 'los eventos de un grupo deben tener la misma fecha');
    for (const id of ids) {
      if (usados.has(id)) error(d, `el evento "${id}" ya está en el grupo ${usados.get(id)}`);
      usados.set(id, g.id);
    }
  });
}

// Temas sensibles (CLAUDE.md) donde no corresponde una ficha de curiosidades: guerras de la Conquista y la
// Araucanía, guerras del período 05 (incluida la del Pacífico), la dictadura, matanzas y el estallido social.
const SENSIBLES = new Set(['1907-matanza-escuela-santa-maria', '1938-matanza-seguro-obrero', '2019-estallido-social', '1991-informe-rettig', '1998-detencion-pinochet-londres']);
const esSensible = (ev) =>
  ev.periodoId === '08' || SENSIBLES.has(ev.id) || (ev.temas.includes('guerra') && (ev.periodoId === '05' || ev.temas.includes('pueblos-originarios')));

// «¿Sabías que?»: una oración copiada textualmente del detalle del evento, nunca en temas sensibles.
function validarSabiasQue(mapa, ctx) {
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return error('sabias-que.json', 'debe ser un objeto { "id": "oración" }');
  for (const [id, frase] of Object.entries(mapa)) {
    const d = `sabias-que.json [${id}]`;
    const ev = ctx.eventos.get(id);
    if (!ev) error(d, 'el evento no existe');
    else if (!esTexto(frase)) error(d, 'la frase está vacía');
    else if (!ev.detalle.includes(frase)) error(d, 'la frase debe copiarse textualmente del detalle');
    else if (esSensible(ev)) error(d, 'tema sensible: aquí no corresponde un «¿Sabías que?»');
  }
}

// Mapa (lugares.json): las 16 regiones actuales de norte a sur, lugares con coordenadas e ítem de Wikidata
// (si el punto representa un sitio o una zona, `aproximado` y una `nota` que lo explica) y zonas sin
// alfiler, que cuentan en sus regiones. Devuelve los ids que puede usar ubicaciones.json.
const REGIONES = ['AP', 'TA', 'AN', 'AT', 'CO', 'VS', 'RM', 'LI', 'ML', 'NB', 'BI', 'AR', 'LR', 'LL', 'AI', 'MA'];
const enChile = (lat, lon) => (lat <= -17 && lat >= -56.5 && lon >= -81 && lon <= -66) || (Math.abs(lat + 27.1) < 0.5 && Math.abs(lon + 109.35) < 0.6);
function validarLugares(datos) {
  const ids = new Set();
  const d = 'lugares.json';
  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    error(d, 'debe ser un objeto { regiones, lugares, zonas }');
    return ids;
  }
  const regiones = Array.isArray(datos.regiones) ? datos.regiones : [];
  if (regiones.map((r) => r?.codigo).join() !== REGIONES.join()) error(d, `"regiones" deben ser las 16 actuales, de norte a sur: ${REGIONES.join(', ')}`);
  for (const r of regiones) if (!esTexto(r?.nombre) || !esTexto(r?.corto)) error(`${d} [${r?.codigo}]`, 'falta "nombre" o "corto"');
  const nuevo = (x, donde) => {
    if (!ID.test(x?.id ?? '') || x.id === 'chile') error(donde, 'id inválido (minúsculas, números y guiones; «chile» está reservado)');
    else if (ids.has(x.id)) error(donde, 'id repetido entre lugares y zonas');
    ids.add(x?.id);
    if (!esTexto(x?.nombre)) error(donde, 'falta "nombre"');
  };
  for (const l of Array.isArray(datos.lugares) ? datos.lugares : []) {
    const donde = `${d} [${l?.id}]`;
    nuevo(l, donde);
    if (!REGIONES.includes(l?.region)) error(donde, `región desconocida "${l?.region}"`);
    if (!Number.isFinite(l?.lat) || !Number.isFinite(l?.lon) || !enChile(l.lat, l.lon)) error(donde, 'coordenadas inválidas o fuera de Chile');
    if (!/^Q\d+$/.test(l?.wikidata ?? '')) error(donde, 'falta el ítem de Wikidata ("wikidata": "Q…") de donde salen las coordenadas');
    if (l?.aproximado !== undefined && l.aproximado !== true) error(donde, '"aproximado" solo puede ser true');
    if (l?.aproximado && !esTexto(l.nota)) error(donde, 'un lugar aproximado necesita una "nota" que explique qué representa el punto');
  }
  for (const z of Array.isArray(datos.zonas) ? datos.zonas : []) {
    const donde = `${d} [${z?.id}]`;
    nuevo(z, donde);
    if (!Array.isArray(z?.regiones) || !z.regiones.length || z.regiones.some((c) => !REGIONES.includes(c))) error(donde, '"regiones" debe listar códigos de región válidos');
  }
  return ids;
}

// Ubicaciones (ubicaciones.json): cada evento visible tiene al menos una, que es un lugar o una zona de
// lugares.json, «chile» (alcance nacional) o «fuera:<país>» (ocurrido total o parcialmente en otro país).
function validarUbicaciones(mapa, ctx, lugares) {
  const d = 'ubicaciones.json';
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return error(d, 'debe ser un objeto { "id-del-evento": ["lugar", …] }');
  for (const [id, lista] of Object.entries(mapa)) {
    const donde = `${d} [${id}]`;
    if (!ctx.eventos.has(id)) error(donde, 'el evento no existe');
    if (!Array.isArray(lista) || !lista.length) {
      error(donde, 'debe ser una lista con al menos una ubicación');
      continue;
    }
    if (new Set(lista).size !== lista.length) error(donde, 'ubicaciones repetidas');
    for (const u of lista) {
      if (u !== 'chile' && !lugares.has(u) && !/^fuera:\p{Lu}[\p{L} ]+$/u.test(u)) error(donde, `ubicación desconocida "${u}" (lugar o zona de lugares.json, «chile» o «fuera:País»)`);
    }
  }
  for (const [id, ev] of ctx.eventos) if (!ev.pendienteVerificacion && !mapa[id]) error(d, `falta la ubicación del evento "${id}"`);
}

if (!existsSync(DIR)) {
  console.error(`No existe la carpeta de datos: ${DIR}`);
  process.exit(1);
}

const nombres = readdirSync(DIR).filter((n) => n.endsWith('.json')).sort();
const archivosEventos = nombres.filter((n) => ARCHIVO_EVENTOS.test(n));
const OPCIONALES = ['recorridos.json', 'grupos.json', 'sabias-que.json', 'lugares.json', 'ubicaciones.json'];
for (const n of nombres) {
  if (!ARCHIVO_EVENTOS.test(n) && !['periodos.json', 'temas.json', ...OPCIONALES].includes(n)) aviso(n, 'archivo no reconocido (la app lo ignora)');
}

function cargarMeta(nombre) {
  if (nombres.includes(nombre)) return leer(nombre);
  (archivosEventos.length ? error : aviso)(nombre, 'falta el archivo');
  return null;
}

const ctx = {
  temas: validarTemas(cargarMeta('temas.json') ?? []),
  periodos: validarPeriodos(cargarMeta('periodos.json') ?? []),
  ids: new Map(),
  eventos: new Map(),
  imagenes: new Map(),
  pendientes: [],
  recientes: [],
};

let total = 0;
for (const archivo of archivosEventos) {
  const prefijo = ARCHIVO_EVENTOS.exec(archivo)[1];
  if (!ctx.periodos.has(prefijo)) error(archivo, `no hay período "${prefijo}" en periodos.json`);
  const lista = leer(archivo);
  if (lista === null) continue;
  if (!Array.isArray(lista)) {
    error(archivo, 'debe contener una lista de eventos');
    continue;
  }
  lista.forEach((ev) => validarEvento(ev, archivo, prefijo, ctx));
  total += lista.length;
  const orden = lista.map((ev) => parseFecha(ev?.fecha)?.valor ?? -Infinity);
  if (orden.some((v, i) => i > 0 && v < orden[i - 1])) aviso(archivo, 'los eventos no están ordenados por fecha');
}
for (const id of ctx.periodos.keys()) {
  if (!archivosEventos.some((n) => n.startsWith(`${id}-`))) aviso('periodos.json', `el período ${id} aún no tiene archivo de eventos`);
}
const opcional = (n) => (nombres.includes(n) ? leer(n) : null);
const recorridos = opcional('recorridos.json');
const grupos = opcional('grupos.json');
const sabiasQue = opcional('sabias-que.json');
if (recorridos) validarRecorridos(recorridos, ctx);
if (grupos) validarGrupos(grupos, ctx);
if (sabiasQue) validarSabiasQue(sabiasQue, ctx);
const lugares = opcional('lugares.json');
const ubicaciones = opcional('ubicaciones.json');
if (lugares || ubicaciones) validarUbicaciones(ubicaciones, ctx, validarLugares(lugares));

console.log(`Datos: ${ctx.periodos.size} períodos · ${ctx.temas.size} temas · ${total} eventos en ${archivosEventos.length} archivos`);
console.log(`Historias: ${recorridos?.length ?? 0} · grupos: ${grupos?.length ?? 0} · «¿Sabías que?»: ${Object.keys(sabiasQue ?? {}).length}`);
if (lugares?.lugares) console.log(`Mapa: ${lugares.lugares.length} lugares (${lugares.lugares.filter((l) => l.aproximado).length} aproximados) · ${lugares.zonas?.length ?? 0} zonas · ${Object.keys(ubicaciones ?? {}).length} eventos ubicados`);
if (ctx.pendientes.length) console.log(`Ocultos por pendienteVerificacion (${ctx.pendientes.length}): ${ctx.pendientes.join(', ')}`);
if (ctx.recientes.length) console.log(`Posteriores a 2023 visibles, confirmar certeza (${ctx.recientes.length}): ${ctx.recientes.join(', ')}`);
if (avisos.length) console.log(`\nAVISOS (${avisos.length}):\n${avisos.map((a) => `  - ${a}`).join('\n')}`);
if (errores.length) {
  console.log(`\nERRORES (${errores.length}):\n${errores.map((e) => `  - ${e}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('\nOK: los datos cumplen el esquema.');
}
