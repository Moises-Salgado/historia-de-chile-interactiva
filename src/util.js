// Utilidades compartidas: texto seguro para HTML, búsqueda sin tildes, preferencias guardadas,
// imágenes de Wikimedia Commons, licencias y nombres legibles de las fuentes.

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto para insertarlo en HTML. */
export const esc = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);

/** Minúsculas y sin tildes («Ñuñoa» → «nunoa»), para buscar sin importar cómo se escriba. */
export const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

export const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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

// Nombre visible de las fuentes más usadas, por dominio (también vale para sus subdominios).
const FUENTES = {
  'memoriachilena.gob.cl': 'Memoria Chilena',
  'bcn.cl': 'Biblioteca del Congreso Nacional',
  'mhn.gob.cl': 'Museo Histórico Nacional',
  'archivonacional.gob.cl': 'Archivo Nacional',
  'museodelamemoria.cl': 'Museo de la Memoria y los Derechos Humanos',
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
