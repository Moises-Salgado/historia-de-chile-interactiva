// Si una palabra del glosario (data/glosario.json) aparece en un evento: su término o una de sus formas está en
// sus textos como palabra completa, sin importar mayúsculas. Si la palabra tiene otro sentido en algunos
// textos, `eventos` dice dónde vale. Lo usan vite.config.js (textos de cada evento y #glosario) y el validador.
const escRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function aparece(g, ev) {
  if (g.eventos) return g.eventos.includes(ev.id);
  const formas = [g.termino, ...(g.formas ?? [])].map(escRegex).join('|');
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${formas})(?![\\p{L}\\p{N}])`, 'iu').test([ev.titulo, ev.resumenNino, ev.resumen, ev.detalle].join('\n'));
}
