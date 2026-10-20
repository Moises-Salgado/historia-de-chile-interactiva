// Carga y une los JSON de /data. Vite los incluye en el build, así que no hay peticiones extra, salvo los textos
// largos de cada evento (detalle y fuentes): van aparte, un archivo por período, y se piden al abrir un evento
// (cargarTextos; ver textosAPedido en vite.config.js).
import { parseFecha } from './fechas.js';

// «Lo que se discute» y el glosario tampoco van en la carga inicial: viajan con los textos de cada evento y en
// virtual:glosario (vite.config.js). Las preguntas escritas a mano viajan con el repaso (src/repaso.js).
const archivos = import.meta.glob(['../data/*.json', '!../data/[0-9][0-9]-*.json', '!../data/se-discute.json', '!../data/glosario.json', '!../data/preguntas.json'], {
  eager: true,
  import: 'default',
});
const porPeriodo = import.meta.glob('../data/[0-9][0-9]-*.json', { eager: true, import: 'default', query: '?ligero' });
const textosPorPeriodo = import.meta.glob('../data/[0-9][0-9]-*.json', { import: 'default', query: '?textos' });
const eventosDe = new Map(); // JSON de período → sus eventos visibles
const pedidos = new Map(); // JSON de período → promesa de sus textos

/**
 * Suma a los eventos de `lista` su detalle y sus fuentes. Devuelve una promesa o, si ya los tienen todos, null.
 * Cada período se pide una vez; si falla, se puede volver a intentar.
 */
export function cargarTextos(lista) {
  const faltan = new Set(lista.filter((ev) => !ev.fuentes).map((ev) => ev.periodoArchivo));
  if (!faltan.size) return null;
  return Promise.all(
    [...faltan].map((ruta) => {
      if (!pedidos.has(ruta)) {
        const pedido = textosPorPeriodo[ruta]().then((textos) => {
          for (const ev of eventosDe.get(ruta)) Object.assign(ev, textos[ev.id]);
        });
        pedidos.set(ruta, pedido.catch((error) => {
          pedidos.delete(ruta);
          throw error;
        }));
      }
      return pedidos.get(ruta);
    }),
  );
}

/**
 * Devuelve { periodos, temas, eventos, recorridos, grupos, mapa } con los eventos visibles ordenados por fecha.
 * Cada evento suma t y tFin (año decimal de inicio y fin), anio y anioFin (años enteros), periodoArchivo (su JSON,
 * para cargarTextos; hasta entonces no trae detalle ni fuentes) y, si tiene,
 * su frase de «¿Sabías que?» y sus ubicaciones (ids de lugares o zonas, «chile» o «fuera:País»). Historias y
 * grupos traen sus eventos como objetos (los ids sin evento visible se omiten; npm test los rechaza). `mapa`
 * trae las regiones, lugares y zonas de lugares.json.
 */
export function cargarDatos() {
  const { periodos, temas, eventos } = cargarEventos();
  const sabiasQue = archivos['../data/sabias-que.json'] ?? {};
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const ubicaciones = archivos['../data/ubicaciones.json'] ?? {};
  const titulosCortos = archivos['../data/titulos-cortos.json'] ?? {};
  // Ancho y alto del original de cada imagen (scripts/medir-imagenes.mjs): el detalle la compone según su forma.
  const medidas = archivos['../data/imagenes-medidas.json'] ?? {};
  for (const ev of eventos) {
    ev.sabiasQue = sabiasQue[ev.id] ?? null;
    ev.ubicaciones = ubicaciones[ev.id] ?? [];
    ev.tituloCorto = titulosCortos[ev.id] ?? null; // solo para la lámina de la línea de tiempo
    const medida = medidas[ev.imagen?.archivo];
    if (medida) ev.imagen = { ...ev.imagen, ancho: medida[0], alto: medida[1] };
  }
  const conEventos = (lista) => (lista ?? []).map((x) => ({ ...x, eventos: x.eventos.map((id) => porId.get(id)).filter(Boolean) }));
  return {
    periodos,
    temas,
    eventos,
    recorridos: conEventos(archivos['../data/recorridos.json']).filter((r) => r.eventos.length),
    grupos: conEventos(archivos['../data/grupos.json']).filter((g) => g.eventos.length > 1),
    mapa: archivos['../data/lugares.json'] ?? { regiones: [], lugares: [], zonas: [] },
  };
}

// Color de un período, más sobrio (CLAUDE.md, «Dirección de arte»: desaturado para que no compita con las
// imágenes): la misma luz en OKLab, con el 65 % de su croma. Así el contraste medido de cada par casi no cambia.
const lineal = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
export function sobrio(hex, croma = 0.65) {
  const [r, g, b] = [1, 3, 5].map((i) => lineal(parseInt(hex.slice(i, i + 2), 16) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = (1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s) * croma;
  const B = (0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s) * croma;
  const [l2, m2, s2] = [L + 0.3963377774 * A + 0.2158037573 * B, L - 0.1055613458 * A - 0.0638541728 * B, L - 0.0894841775 * A - 1.291485548 * B].map((v) => v ** 3);
  const rgb = [4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2, -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2, -0.0041960863 * l2 - 0.7034186147 * m2 + 1.707614701 * s2];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, gamma(c))) * 255).toString(16).padStart(2, '0')).join('')}`;
}

function cargarEventos() {
  const periodos = (archivos['../data/periodos.json'] ?? []).map((p) => ({ ...p, color: sobrio(p.color) }));
  const temas = archivos['../data/temas.json'] ?? [];
  const eventos = Object.entries(porPeriodo)
    .flatMap(([ruta, lista]) => lista.map((ev) => [ruta, ev]))
    .filter(([, ev]) => !ev.pendienteVerificacion)
    .map(([ruta, ev]) => {
      const inicio = parseFecha(ev.fecha);
      const fin = ev.fechaFin ? parseFecha(ev.fechaFin) : null;
      const evento = { ...ev, t: inicio.valor, tFin: fin?.valor ?? null, anio: inicio.anio, anioFin: fin?.anio ?? inicio.anio, periodoArchivo: ruta };
      if (!eventosDe.has(ruta)) eventosDe.set(ruta, []);
      eventosDe.get(ruta).push(evento);
      return evento;
    })
    .sort((a, b) => a.t - b.t);
  return { periodos, temas, eventos };
}
