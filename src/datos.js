// Carga y une los JSON de /data. Vite los incluye en el build, así que no hay peticiones extra.
import { parseFecha } from './fechas.js';

const archivos = import.meta.glob('../data/*.json', { eager: true, import: 'default' });

/**
 * Devuelve { periodos, temas, eventos, recorridos, grupos, mapa } con los eventos visibles ordenados por fecha.
 * Cada evento suma t y tFin (año decimal de inicio y fin), anio y anioFin (años enteros) y, si tiene,
 * su frase de «¿Sabías que?» y sus ubicaciones (ids de lugares o zonas, «chile» o «fuera:País»). Historias y
 * grupos traen sus eventos como objetos (los ids sin evento visible se omiten; npm test los rechaza). `mapa`
 * trae las regiones, lugares y zonas de lugares.json.
 */
export function cargarDatos() {
  const { periodos, temas, eventos } = cargarEventos();
  const sabiasQue = archivos['../data/sabias-que.json'] ?? {};
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const ubicaciones = archivos['../data/ubicaciones.json'] ?? {};
  for (const ev of eventos) {
    ev.sabiasQue = sabiasQue[ev.id] ?? null;
    ev.ubicaciones = ubicaciones[ev.id] ?? [];
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
  const eventos = Object.entries(archivos)
    .filter(([ruta]) => /\/\d{2}-[^/]+\.json$/.test(ruta))
    .flatMap(([, lista]) => lista)
    .filter((ev) => !ev.pendienteVerificacion)
    .map((ev) => {
      const inicio = parseFecha(ev.fecha);
      const fin = ev.fechaFin ? parseFecha(ev.fechaFin) : null;
      return { ...ev, t: inicio.valor, tFin: fin?.valor ?? null, anio: inicio.anio, anioFin: fin?.anio ?? inicio.anio };
    })
    .sort((a, b) => a.t - b.t);
  return { periodos, temas, eventos };
}
