// Carga y une los JSON de /data. Vite los incluye en el build, así que no hay peticiones extra.
import { parseFecha } from './fechas.js';

const archivos = import.meta.glob('../data/*.json', { eager: true, import: 'default' });

/**
 * Devuelve { periodos, temas, eventos } con los eventos visibles ordenados por fecha.
 * Cada evento suma t y tFin (año decimal de inicio y fin) y anio y anioFin (años enteros).
 */
export function cargarDatos() {
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
