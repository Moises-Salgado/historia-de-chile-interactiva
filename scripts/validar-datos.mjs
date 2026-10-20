// Test de humo de los datos: comprueba que cada JSON de /data cumpla el esquema de data/README.md.
// Uso: node scripts/validar-datos.mjs [carpeta]   (por defecto ./data). Sale con código 1 si hay errores.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseFecha } from '../src/fechas.js';
import { aparece } from '../src/glosario-aparece.js';
import { esSensible } from '../src/sensibles.js';

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

// «Lo que se discute»: una oración (o un párrafo breve) copiada textualmente del detalle del evento, sobre sus
// distintas interpretaciones; distinta de su «¿Sabías que?». No va en los hechos que el Estado y la justicia
// reconocen como violaciones a los derechos humanos ni en las matanzas: fuera de su párrafo, un recuadro de
// debate se leería como una duda sobre los hechos.
const SIN_DEBATE = new Set([
  '1973-violaciones-derechos-humanos',
  '1974-dina-y-cni',
  '1973-exilio',
  '1991-informe-rettig',
  '1907-matanza-escuela-santa-maria',
  '1938-matanza-seguro-obrero',
]);
function validarSeDiscute(mapa, ctx, sabiasQue) {
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return error('se-discute.json', 'debe ser un objeto { "id": "oración" }');
  for (const [id, frase] of Object.entries(mapa)) {
    const d = `se-discute.json [${id}]`;
    const ev = ctx.eventos.get(id);
    if (!ev) error(d, 'el evento no existe');
    else if (!esTexto(frase)) error(d, 'la frase está vacía');
    else if (!ev.detalle.includes(frase)) error(d, 'la frase debe copiarse textualmente del detalle');
    else if (SIN_DEBATE.has(id)) error(d, 'hecho reconocido por el Estado y la justicia: aquí no corresponde «Lo que se discute»');
    else if (sabiasQue?.[id] && (sabiasQue[id].includes(frase) || frase.includes(sabiasQue[id]))) error(d, 'repite su «¿Sabías que?»');
  }
}

// Glosario: palabras de los textos con una explicación breve. Cada una lleva su fuente (https) o sale de una
// oración textual de un evento («deTexto»: { evento, frase }); «formas» son otras maneras de escribirla (el
// plural) y «eventos», si se da, limita dónde vale. Debe aparecer en algún evento visible.
function validarGlosario(lista, ctx) {
  if (!Array.isArray(lista)) return error('glosario.json', 'debe ser una lista');
  const ids = new Set();
  lista.forEach((g, i) => {
    const d = `glosario.json [${g?.id ?? i}]`;
    if (!ID.test(g?.id ?? '')) error(d, 'id inválido (minúsculas, números y guiones)');
    else if (ids.has(g.id)) error(d, 'id repetido');
    ids.add(g?.id);
    if (!esTexto(g?.termino)) return error(d, 'falta "termino"');
    if (!esTexto(g.definicion)) error(d, 'falta "definicion"');
    else if (g.definicion.length > 240) aviso(d, 'definición de más de 240 caracteres');
    if (g.formas !== undefined && !(Array.isArray(g.formas) && g.formas.every(esTexto))) error(d, '"formas" debe ser una lista de textos');
    if (g.eventos !== undefined) {
      if (!Array.isArray(g.eventos) || !g.eventos.length) error(d, '"eventos" debe ser una lista de ids');
      // Cada evento listado debe usar la palabra (o una de sus formas) en sus textos.
      else
        for (const id of g.eventos) {
          const x = ctx.eventos.get(id);
          if (!x) error(d, `el evento "${id}" no existe`);
          else if (!aparece({ ...g, eventos: undefined }, x)) error(d, `la palabra no aparece en los textos de "${id}"`);
        }
    }
    const conFuente = typeof g.fuente === 'string' && /^https:\/\/\S+$/.test(g.fuente);
    const ev = ctx.eventos.get(g.deTexto?.evento);
    const delTexto = Boolean(ev && esTexto(g.deTexto.frase) && [ev.resumenNino, ev.resumen, ev.detalle].some((t) => t.includes(g.deTexto.frase)));
    if (g.fuente !== undefined && !conFuente) error(d, '"fuente" debe ser una URL https');
    if (g.deTexto !== undefined && !delTexto) error(d, '"deTexto" debe tener un evento existente y una oración copiada de sus textos');
    if (!conFuente && !delTexto) error(d, 'necesita "fuente" (https) o "deTexto" (oración textual de un evento)');
    const visibles = [...ctx.eventos.values()].filter((x) => !x.pendienteVerificacion);
    if (!visibles.some((x) => aparece(g, x))) error(d, 'no aparece en ningún evento visible');
  });
}

// Mapa (lugares.json): las 16 regiones actuales de norte a sur, lugares con coordenadas e ítem de Wikidata
// (si el punto representa un sitio o una zona, `aproximado` y una `nota` que lo explica) y zonas sin
// alfiler, que cuentan en sus regiones. Devuelve los ids que puede usar ubicaciones.json.
const REGIONES = ['AP', 'TA', 'AN', 'AT', 'CO', 'VS', 'RM', 'LI', 'ML', 'NB', 'BI', 'AR', 'LR', 'LL', 'AI', 'MA'];
const RUTA_LATITUDES = new URL('../src/chile-latitudes.json', import.meta.url);
const LATITUDES = existsSync(RUTA_LATITUDES) ? JSON.parse(readFileSync(RUTA_LATITUDES, 'utf8')) : {};
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
    // La latitud debe caer en la franja de su región (src/chile-latitudes.json, en la escala del mapa, con
    // 3 unidades de margen); Rapa Nui va en un recuadro aparte. Los casos en el límite se revisan a mano.
    else if (LATITUDES[l.region] && l.id !== 'rapa-nui') {
      const y = (-17.4 - l.lat) * 26;
      const [norte, sur] = LATITUDES[l.region];
      if (y < norte - 3 || y > sur + 3) error(donde, `la latitud ${l.lat} no cae en la región ${l.region}`);
    }
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

// Títulos cortos (titulos-cortos.json): solo para la lámina de la línea de tiempo, cuando el título no cabe.
// Hasta 42 caracteres y sin datos nuevos: cada palabra de 4 letras o más (comparando sus 6 primeras) está en
// el título o en el resumen del evento.
const sinTildes = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const raices = (texto) => new Set(sinTildes(texto).split(/[^\p{L}\p{N}]+/u).filter((p) => p.length >= 4).map((p) => p.slice(0, 6)));
function validarTitulosCortos(mapa, ctx) {
  if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) return error('titulos-cortos.json', 'debe ser un objeto { "id": "título corto" }');
  for (const [id, corto] of Object.entries(mapa)) {
    const d = `titulos-cortos.json [${id}]`;
    const ev = ctx.eventos.get(id);
    if (!ev) {
      error(d, 'el evento no existe');
      continue;
    }
    if (!esTexto(corto) || corto.length > 42) {
      error(d, 'debe tener entre 1 y 42 caracteres');
      continue;
    }
    if (corto.length >= ev.titulo.length) error(d, 'no es más corto que el título');
    const fuente = raices(`${ev.titulo} ${ev.resumen}`);
    const ajenas = [...raices(corto)].filter((p) => !fuente.has(p));
    if (ajenas.length) error(d, `palabras que no están en el título ni en el resumen: ${ajenas.join(', ')}`);
  }
}

// Medidas de las imágenes (imagenes-medidas.json, de scripts/medir-imagenes.mjs): cada imagen de un evento debe
// tener su ancho y alto en píxeles (el detalle compone la obra según su forma, sin saltos al cargar).
function validarMedidas(medidas, ctx) {
  if (!medidas || typeof medidas !== 'object' || Array.isArray(medidas)) return error('imagenes-medidas.json', 'debe ser un objeto { "Archivo.jpg": [ancho, alto] }');
  for (const [archivo, m] of Object.entries(medidas)) {
    if (!Array.isArray(m) || m.length !== 2 || !m.every((n) => Number.isInteger(n) && n > 0)) error(`imagenes-medidas.json [${archivo}]`, 'debe ser [ancho, alto] en píxeles');
  }
  const usados = new Set([...ctx.eventos.values()].map((ev) => ev.imagen?.archivo).filter(Boolean));
  for (const archivo of usados) if (!medidas[archivo]) aviso('imagenes-medidas.json', `falta la medida de «${archivo}»: ejecuta node scripts/medir-imagenes.mjs`);
  for (const archivo of Object.keys(medidas)) if (!usados.has(archivo)) aviso('imagenes-medidas.json', `«${archivo}» ya no la usa ningún evento: ejecuta node scripts/medir-imagenes.mjs`);
}

if (!existsSync(DIR)) {
  console.error(`No existe la carpeta de datos: ${DIR}`);
  process.exit(1);
}

const nombres = readdirSync(DIR).filter((n) => n.endsWith('.json')).sort();
const archivosEventos = nombres.filter((n) => ARCHIVO_EVENTOS.test(n));
const OPCIONALES = ['recorridos.json', 'grupos.json', 'sabias-que.json', 'lugares.json', 'ubicaciones.json', 'titulos-cortos.json', 'se-discute.json', 'glosario.json', 'imagenes-medidas.json'];
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
const titulosCortos = opcional('titulos-cortos.json');
if (titulosCortos) validarTitulosCortos(titulosCortos, ctx);
const seDiscute = opcional('se-discute.json');
if (seDiscute) validarSeDiscute(seDiscute, ctx, sabiasQue);
const glosario = opcional('glosario.json');
if (glosario) validarGlosario(glosario, ctx);
const lugares = opcional('lugares.json');
const ubicaciones = opcional('ubicaciones.json');
if (lugares || ubicaciones) validarUbicaciones(ubicaciones, ctx, validarLugares(lugares));
const medidas = opcional('imagenes-medidas.json');
if (medidas) validarMedidas(medidas, ctx);

// index.html precarga la lámina del primer evento al entrar a #linea: debe ser su imagen actual.
const RUTA_INDEX = resolve(DIR, '../index.html');
if (existsSync(RUTA_INDEX)) {
  const precarga = /Special:FilePath\/([^?']+)\?width=' \+ a/.exec(readFileSync(RUTA_INDEX, 'utf8'))?.[1];
  const primero = [...ctx.eventos.values()].filter((ev) => !ev.pendienteVerificacion).sort((a, b) => (parseFecha(a.fecha)?.valor ?? 0) - (parseFecha(b.fecha)?.valor ?? 0))[0];
  if (precarga && primero && decodeURIComponent(precarga) !== primero.imagen?.archivo) {
    aviso('index.html', `la precarga de la línea de tiempo pide «${decodeURIComponent(precarga)}», pero el primer evento (${primero.id}) usa «${primero.imagen?.archivo}»`);
  }
}

console.log(`Datos: ${ctx.periodos.size} períodos · ${ctx.temas.size} temas · ${total} eventos en ${archivosEventos.length} archivos`);
console.log(`Historias: ${recorridos?.length ?? 0} · grupos: ${grupos?.length ?? 0} · «¿Sabías que?»: ${Object.keys(sabiasQue ?? {}).length} · títulos cortos: ${Object.keys(titulosCortos ?? {}).length}`);
console.log(`«Lo que se discute»: ${Object.keys(seDiscute ?? {}).length} · glosario: ${glosario?.length ?? 0} palabras`);
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
