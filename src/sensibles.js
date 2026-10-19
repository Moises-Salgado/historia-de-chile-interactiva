// Temas sensibles (CLAUDE.md): guerras de la Conquista y la Araucanía, guerras del período 05 (incluida la del
// Pacífico), la dictadura, matanzas, el estallido social y lo que los sigue. Ahí no van curiosidades
// («¿Sabías que?») ni preguntas de repaso. Lo usan la app y el validador (scripts/validar-datos.mjs).
export const SENSIBLES = new Set([
  '1907-matanza-escuela-santa-maria',
  '1938-matanza-seguro-obrero',
  '2019-estallido-social',
  '1991-informe-rettig',
  '1998-detencion-pinochet-londres',
]);

export const esSensible = (ev) =>
  ev.periodoId === '08' || SENSIBLES.has(ev.id) || (ev.temas.includes('guerra') && (ev.periodoId === '05' || ev.temas.includes('pueblos-originarios')));

// Fuera del repaso sin nota, además de los temas sensibles: lo que está en debate abierto (la edad de Monte
// Verde), los eventos cuyo hecho central es una muerte, lo posterior a 2023 y, fuera del período 01, los de
// pueblos originarios (tratan de conquista, ocupación o pérdida de tierras): en el repaso, los pueblos aparecen
// por su territorio y no por su conquista.
const SIN_REPASO = new Set(['ac12500-monte-verde', '1837-asesinato-de-diego-portales', '1891-muerte-de-balmaceda', '2025-eleccion-presidencial']);
export const paraRepaso = (ev) => !esSensible(ev) && !SIN_REPASO.has(ev.id) && !(ev.temas.includes('pueblos-originarios') && ev.periodoId !== '01');
