// Utilidades compartidas: texto seguro para HTML, búsqueda sin tildes, preferencias guardadas,
// imágenes de Wikimedia Commons, licencias y nombres legibles de las fuentes.

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para insertarlo en HTML. */
export const esc = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/** Ícono del set de index.html (#i-<nombre>), decorativo: siempre va junto a una palabra. */
export const icono = (nombre) => `<svg class="icono" aria-hidden="true" focusable="false"><use href="#i-${nombre}"/></svg>`;

/** Minúsculas y sin tildes («Ñuñoa» → «nunoa»), para buscar sin importar cómo se escriba. */
export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Duración de lectura en voz alta (en clase o con «Escuchar»): unas 130 palabras por minuto. «Detallado» lee el
// resumen general y el detalle (palabrasDetalle viene con los datos, sin cargar el texto: vite.config.js).
export const PALABRAS_POR_MINUTO = 130;
const contarPalabras = (texto) => String(texto ?? '').split(/\s+/).filter(Boolean).length;
const palabrasEn = (ev, nivel) =>
  nivel === 'nino' ? contarPalabras(ev.resumenNino) : contarPalabras(ev.resumen) + (nivel === 'detallado' ? (ev.palabrasDetalle ?? 0) : 0);
/** Minutos (al menos 1) que toma leer en voz alta los eventos de `lista` en el nivel pedido. */
export const minutosDeLectura = (lista, nivel) => Math.max(1, Math.round(lista.reduce((s, ev) => s + palabrasEn(ev, nivel), 0) / PALABRAS_POR_MINUTO));

/** Anima con la Web Animations API; si se pidió reducir el movimiento, no hace nada. */
export const animar = (el, cuadros, opciones) => (movimientoReducido() || !el?.animate ? null : el.animate(cuadros, opciones));

// Mejora progresiva: sin View Transitions (o con movimiento reducido) el cambio es inmediato, igual que antes.
let transicion = 0;

/**
 * Hace un cambio de la página con una View Transition. cambiar(animado) puede ser asíncrona (la vista
 * anterior queda congelada mientras tanto). `tipo` queda en <html data-transicion> mientras dura, para el
 * CSS. Devuelve una promesa que se cumple al terminar la animación (o el cambio, si no hay animación).
 */
export function conTransicion(cambiar, tipo = '') {
  if (movimientoReducido() || !document.startViewTransition || document.hidden) return Promise.resolve(cambiar(false));
  const raiz = document.documentElement;
  const n = ++transicion;
  raiz.dataset.transicion = tipo;
  const t = document.startViewTransition(() => cambiar(true));
  return t.finished
    .catch(() => {})
    .finally(() => {
      if (n === transicion) delete raiz.dataset.transicion;
    });
}

// localStorage puede no estar disponible (modo privado o bloqueado): la app funciona igual, sin recordar.
const PREFIJO = 'historia-chile:';

export function leerPreferencia(clave, porDefecto = null) {
  try {
    return localStorage.getItem(PREFIJO + clave) ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

export function guardarPreferencia(clave, valor) {
  try {
    localStorage.setItem(PREFIJO + clave, valor);
  } catch {
    // Sin almacenamiento: la preferencia vale solo para esta visita.
  }
}

/** Año de nacimiento de quien lee («¿Qué edad tenías?», solo en este navegador), entre 1900 y hoy, o null. */
export function leerNacimiento() {
  const n = Number(leerPreferencia('nacimiento'));
  return Number.isInteger(n) && n >= 1900 && n <= new Date().getFullYear() ? n : null;
}

export function borrarPreferencia(clave) {
  try {
    localStorage.removeItem(PREFIJO + clave);
  } catch {
    // Sin almacenamiento: no había nada guardado.
  }
}

/** Imagen de Commons al ancho pedido. Solo anchos estándar (120, 250, 330, 500, 800→960…): ver CLAUDE.md. */
export const urlImagen = (archivo, ancho) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(archivo)}?width=${ancho}`;

/** Placeholder SVG del período, para las imágenes que no cargan. */
export const urlPlaceholder = (periodoId) => `${import.meta.env.BASE_URL}placeholders/periodo-${periodoId}.svg`;

/** Página de la licencia Creative Commons (en español); null para «Dominio público». */
export function urlLicencia(licencia) {
  const cc = /^CC (BY(?:-SA)?) (\d\.\d)$/.exec(licencia);
  if (cc) return `https://creativecommons.org/licenses/${cc[1].toLowerCase()}/${cc[2]}/deed.es`;
  if (licencia.startsWith('CC0')) return 'https://creativecommons.org/publicdomain/zero/1.0/deed.es';
  return null;
}

const OTRA_PESTANA = '<span class="solo-lector"> (se abre en otra pestaña)</span>';

/** Enlace a otro sitio, en otra pestaña (avisado a los lectores de pantalla). `texto` va como HTML. */
export const externo = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener">${texto}${OTRA_PESTANA}</a>`;

/** Crédito de una imagen de Commons (HTML): «autor · licencia · Wikimedia Commons», con enlaces. */
export function creditoImagen({ autor, licencia, urlPagina }) {
  const enlace = urlLicencia(licencia);
  return `${esc(autor)} · ${enlace ? externo(enlace, esc(licencia)) : esc(licencia)} · ${externo(urlPagina, 'Wikimedia Commons')}`;
}

// Nombre visible de las fuentes más usadas, por dominio (también vale para sus subdominios).
const FUENTES = {
  'memoriachilena.gob.cl': 'Memoria Chilena',
  'bcn.cl': 'Biblioteca del Congreso Nacional',
  'mhn.gob.cl': 'Museo Histórico Nacional',
  'archivonacional.gob.cl': 'Archivo Nacional',
  'museodelamemoria.cl': 'Museo de la Memoria y los Derechos Humanos',
  'indh.cl': 'Instituto Nacional de Derechos Humanos',
  'precolombino.cl': 'Museo Chileno de Arte Precolombino',
  'chileprecolombino.cl': 'Museo Chileno de Arte Precolombino',
  'monumentos.gob.cl': 'Consejo de Monumentos Nacionales',
  'museodeatacama.gob.cl': 'Museo Regional de Atacama',
  'armada.cl': 'Armada de Chile',
  'senado.cl': 'Senado de Chile',
  'pjud.cl': 'Poder Judicial de Chile',
  'csn.uchile.cl': 'Centro Sismológico Nacional',
  'uchile.cl': 'Universidad de Chile',
  'uc.cl': 'Pontificia Universidad Católica de Chile',
  'udec.cl': 'Universidad de Concepción',
  'ucn.cl': 'Universidad Católica del Norte',
  'udp.cl': 'Universidad Diego Portales',
  'redalyc.org': 'Redalyc',
  'dialnet.unirioja.es': 'Dialnet',
  'wikipedia.org': 'Wikipedia',
  'nobelprize.org': 'Fundación Nobel',
  'history.state.gov': 'Departamento de Estado de EE. UU.',
  'icj-cij.org': 'Corte Internacional de Justicia',
  'gob.cl': 'Gobierno de Chile',
  'cultura.gob.cl': 'Ministerio de las Culturas, las Artes y el Patrimonio',
  'interior.gob.cl': 'Ministerio del Interior',
  'minvu.gob.cl': 'Ministerio de Vivienda y Urbanismo',
  'msgg.gob.cl': 'Ministerio Secretaría General de Gobierno',
  'minsal.cl': 'Ministerio de Salud',
  'difrol.cl': 'Dirección Nacional de Fronteras y Límites del Estado',
  'efe.cl': 'Empresa de los Ferrocarriles del Estado',
  'surdoc.cl': 'SURDOC (Servicio Nacional del Patrimonio Cultural)',
  'cepchile.cl': 'Centro de Estudios Públicos',
  'rededucacionalignaciana.cl': 'Red Educacional Ignaciana',
  'argentina.gob.ar': 'Gobierno de Argentina',
  'cancilleria.gob.ar': 'Cancillería de Argentina',
  'pucp.edu.pe': 'Pontificia Universidad Católica del Perú',
  'scielo.org.pe': 'SciELO Perú',
  'ub.edu': 'Universitat de Barcelona',
  'hawaii.edu': 'Universidad de Hawái',
  'pmc.ncbi.nlm.nih.gov': 'PubMed Central',
  'gsa.confex.com': 'Geological Society of America',
  'fao.org': 'FAO',
  'cidob.org': 'CIDOB',
  'latercera.com': 'La Tercera',
  'emol.com': 'Emol',
  'cooperativa.cl': 'Radio Cooperativa',
  'biobiochile.cl': 'BioBioChile',
  'cnnchile.com': 'CNN Chile',
  't13.cl': 'T13',
  'theclinic.cl': 'The Clinic',
  'df.cl': 'Diario Financiero',
  'pagina12.com.ar': 'Página/12',
  'internazionale.it': 'Internazionale',
  'nationalgeographic.com': 'National Geographic',
};

/** Nombre legible de una fuente según su dominio (o el dominio mismo, si no está en la lista). */
export function nombreFuente(url) {
  let dominio;
  try {
    dominio = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
  for (let d = dominio; d.includes('.'); d = d.slice(d.indexOf('.') + 1)) if (FUENTES[d]) return FUENTES[d];
  return dominio;
}
