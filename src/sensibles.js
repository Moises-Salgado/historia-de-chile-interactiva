// Temas sensibles (CLAUDE.md): guerras de la Conquista y la Araucanía, guerras del período 05 (incluida la del
// Pacífico), la dictadura, matanzas, el estallido social y lo que los sigue. Ahí no van curiosidades
// («¿Sabías que?») ni preguntas de repaso armadas solas: solo «¿Qué pasó primero?» y las escritas a mano
// (data/preguntas.json). Lo usan la app y el validador (scripts/validar-datos.mjs).
export const SENSIBLES = new Set([
  '1907-matanza-escuela-santa-maria',
  '1938-matanza-seguro-obrero',
  '2019-estallido-social',
  '1991-informe-rettig',
  '1998-detencion-pinochet-londres',
]);

export const esSensible = (ev) =>
  ev.periodoId === '08' || SENSIBLES.has(ev.id) || (ev.temas.includes('guerra') && (ev.periodoId === '05' || ev.temas.includes('pueblos-originarios')));

// Repaso sin nota (src/repaso.js). Nunca entra lo que está en debate abierto (la edad de Monte Verde), los eventos
// cuyo hecho central es una muerte ni lo posterior a 2023 (enRepaso). Los temas sensibles y, fuera del período 01,
// los de pueblos originarios (tratan de conquista, ocupación o pérdida de tierras) entran solo en «¿Qué pasó
// primero?» y con las preguntas escritas a mano que su texto responde (decisión del dueño, 2026-10-20); las
// preguntas que se arman solas (siglo, lugar y personas) usan los demás (paraRepaso).
const SIN_REPASO = new Set(['ac12500-monte-verde', '1837-asesinato-de-diego-portales', '1891-muerte-de-balmaceda', '2025-eleccion-presidencial']);
export const enRepaso = (ev) => !SIN_REPASO.has(ev.id);
export const paraRepaso = (ev) => enRepaso(ev) && !esSensible(ev) && !(ev.temas.includes('pueblos-originarios') && ev.periodoId !== '01');
