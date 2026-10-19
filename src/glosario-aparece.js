// Si una palabra del glosario (data/glosario.json) aparece en un evento: su término o una de sus formas está en
// sus textos como palabra completa, sin importar mayúsculas. Si la palabra tiene otro sentido en algunos
// textos, `eventos` dice dónde vale. Lo usan vite.config.js (textos de cada evento y #glosario) y el validador.
const escRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Si el término o una de sus formas está, como palabra completa, en `texto`. */
export function apareceEn(g, texto) {
  const formas = [g.termino, ...(g.formas ?? [])].map(escRegex).join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${formas})(?![\\p{L}\\p{N}])`, 'iu').test(texto);
}

export function aparece(g, ev) {
  if (g.eventos) return g.eventos.includes(ev.id);
  return apareceEn(g, [ev.titulo, ev.resumenNino, ev.resumen, ev.detalle].join('\n'));
}

/**
 * Niveles de lectura en que la palabra está a la vista: el título y el texto de cada nivel («Detallado» muestra
 * el resumen general y el detalle). Si no está en ninguno (vale por `eventos`), en todos.
 */
export function nivelesDe(g, ev) {
  const niveles = Object.entries({
    nino: [ev.titulo, ev.resumenNino],
    general: [ev.titulo, ev.resumen],
    detallado: [ev.titulo, ev.resumen, ev.detalle],
  })
    .filter(([, textos]) => apareceEn(g, textos.join('\n')))
    .map(([nivel]) => nivel);
  return niveles.length ? niveles : ['nino', 'general', 'detallado'];
}
