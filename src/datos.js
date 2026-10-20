// Carga y une los JSON de /data. Vite los incluye en el build, así que no hay peticiones extra, salvo los textos
// largos de cada evento (detalle y fuentes): van aparte, un archivo por período, y se piden al abrir un evento
// (cargarTextos; ver textosAPedido en vite.config.js).
import { parseFecha } from './fechas.js';

// «Lo que se discute» y el glosario tampoco van en la carga inicial: viajan con los textos de cada evento y en
// virtual:glosario (vite.config.js).
const archivos = import.meta.glob(['../data/*.json', '!../data/[0-9][0-9]-*.json', '!../data/se-discute.json', '!../data/glosario.json'], {
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

function cargarEventos() {
  const periodos = archivos['../data/periodos.json'] ?? [];
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
