// Carga y une los JSON de /data. Vite los incluye en el build, así que no hay peticiones extra.
import { parseFecha } from './fechas.js';

const archivos = import.meta.glob('../data/*.json', { eager: true, import: 'default' });

/** Devuelve { periodos, temas, eventos } con los eventos visibles ordenados por fecha (t = año decimal). */
export function cargarDatos() {
  const periodos = archivos['../data/periodos.json'] ?? [];
  const temas = archivos['../data/temas.json'] ?? [];
  const eventos = Object.entries(archivos)
    .filter(([ruta]) => /\/\d{2}-[^/]+\.json$/.test(ruta))
    .flatMap(([, lista]) => lista)
    .filter((ev) => !ev.pendienteVerificacion)
    .map((ev) => ({ ...ev, t: parseFecha(ev.fecha).valor, tFin: ev.fechaFin ? parseFecha(ev.fechaFin).valor : null }))
    .sort((a, b) => a.t - b.t);
  return { periodos, temas, eventos };
}
