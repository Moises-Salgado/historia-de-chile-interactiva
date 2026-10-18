// Fechas del esquema de datos: "AAAA", "AAAA-MM" o "AAAA-MM-DD"; año negativo = a.C. (ver data/README.md).
// Lo usan la app (src/datos.js) y el validador (scripts/validar-datos.mjs).
const FORMATO = /^(-?)(\d{1,5})(?:-(\d{2})(?:-(\d{2}))?)?$/;

/** Devuelve { anio, mes, dia, valor } (valor = año decimal para ordenar y ubicar) o null si no es válida. */
export function parseFecha(texto) {
  const m = FORMATO.exec(typeof texto === 'string' ? texto : '');
  if (!m) return null;
  const anio = Number(m[2]) * (m[1] ? -1 : 1);
  const mes = m[3] ? Number(m[3]) : null;
  const dia = m[4] ? Number(m[4]) : null;
  if (anio === 0 || (mes !== null && (mes < 1 || mes > 12))) return null;
  if (dia !== null && (dia < 1 || dia > diasDelMes(anio, mes))) return null;
  return { anio, mes, dia, valor: anio + (((mes ?? 1) - 1) * 31 + (dia ?? 1) - 1) / 372 };
}

/** Año decimal de una fecha del calendario, en la misma escala que parseFecha(…).valor. */
export const anioDecimal = (fecha) => fecha.getFullYear() + (fecha.getMonth() * 31 + fecha.getDate() - 1) / 372;

// Separador de miles solo desde 5 cifras, como en los textos: «5000 a.C.», «12.500 a.C.».
const NUMERO = new Intl.NumberFormat('es-CL', { useGrouping: 'min2' });

/** Año legible: «1879», «5000 a.C.». */
export const formatearAnio = (anio) => (anio < 0 ? `${NUMERO.format(-anio)} a.C.` : String(anio));

/** Fecha breve de las tarjetas, solo con años: «1879», «1879-1884», «c. 1500», «c. 5000 a.C.». */
export function fechaCorta({ anio, anioFin, fechaAproximada }) {
  return `${fechaAproximada ? 'c. ' : ''}${formatearAnio(anio)}${anioFin !== anio ? `-${formatearAnio(anioFin)}` : ''}`;
}

function diasDelMes(anio, mes) {
  // Calendario juliano antes de 1582 (bisiesto cada 4 años) y gregoriano desde entonces.
  const bisiesto = anio % 4 === 0 && (anio < 1582 || anio % 100 !== 0 || anio % 400 === 0);
  return [31, bisiesto ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mes - 1];
}
