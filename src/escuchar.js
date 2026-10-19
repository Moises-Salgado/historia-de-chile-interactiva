// «Escuchar»: lee en voz alta el evento abierto con una voz en español del sistema (speechSynthesis). Nunca empieza
// solo; main.js lo detiene al cambiar de vista o de nivel y con Escape. Sin una voz en español el botón no
// aparece. Cómo pronuncia los nombres de los pueblos originarios está por revisar (docs/REVISION_PENDIENTE.md).

// Primero las voces de Chile y de América Latina; después cualquier otra en español.
const PREFERIDAS = ['es-CL', 'es-419', 'es-US', 'es-MX', 'es-AR', 'es-CO', 'es-PE', 'es-ES'];

function vozEspanola() {
  const voces = speechSynthesis.getVoices().filter((v) => /^es(?:[-_]|$)/i.test(v.lang));
  const idioma = (v) => v.lang.replace('_', '-');
  for (const preferida of PREFERIDAS) {
    const voz = voces.find((v) => idioma(v).toLowerCase() === preferida.toLowerCase());
    if (voz) return voz;
  }
  return voces[0] ?? null;
}

// Una frase por vez: algunos navegadores cortan las lecturas largas. No se corta en «c. 1500» ni en «a.C.»: la
// frase siguiente debe empezar con mayúscula o con signo de apertura. Las abreviaturas de fecha se dicen enteras
// y los rangos, con «a» («1879-1884», «16 de octubre de 1998 - 2 de marzo de 2000»): el guion suena distinto
// según la voz.
const frases = (texto) =>
  texto
    .replace(/\bc\.\s?(?=\d)/g, 'cerca de ')
    .replace(/\ba\.\s?C\./g, 'antes de Cristo')
    .replace(/(\d)\s*[-–]\s*(?=\d)/g, '$1 a ')
    .replace(/\s[-–]\s/g, ' a ')
    .split(/(?<=[.!?…»])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])/u)
    .filter((f) => f.trim());

// Cada lectura tiene su turno: los avisos tardíos de una lectura detenida no afectan a la siguiente.
let turno = 0;

/** Lee `partes` (título, fecha, párrafos) en orden; alTerminar() se llama cuando termina sola. */
export function leer(partes, { alTerminar } = {}) {
  const mio = ++turno;
  speechSynthesis.cancel();
  const voz = vozEspanola();
  if (!voz) return false;
  const lista = partes.flatMap(frases);
  const fin = () => mio === turno && alTerminar?.();
  lista.forEach((texto, i) => {
    const u = new SpeechSynthesisUtterance(texto);
    u.voice = voz;
    u.lang = voz.lang;
    u.rate = 0.95;
    if (i === lista.length - 1) {
      u.addEventListener('end', fin);
      u.addEventListener('error', fin);
    }
    speechSynthesis.speak(u);
  });
  return true;
}

export function detener() {
  turno++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
