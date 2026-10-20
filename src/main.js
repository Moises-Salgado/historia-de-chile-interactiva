// Arranque de la app: preferencias, secciones (portada, línea de tiempo y mapa), detalle, filtros y rutas por
// hash: #inicio, #linea, #mapa (y #mapa/<región>, #mapa/zona/<id>, #mapa/chile, #mapa/fuera, #lugar/<id>),
// #evento/<id>, #grupo/<id>, #historias, #historia/<id> (presentación), #historia/<id>/<paso>,
// #historia/<id>/fin (cierre), #secuencia/<ids>/…, #personaje/<nombre>, #acerca, #docentes y #glosario.
import './styles.css';
import './vistas.css';
import { cargarDatos, cargarTextos } from './datos.js';
import { crearDetalle, imagenDetalle, rutaHistoria, urlCompartir } from './detalle.js';
import { detener as detenerVoz, leer as leerEnVoz } from './escuchar.js';
import { crearFiltros } from './filtros.js';
import { crearInicio } from './inicio.js';
import { crearLineaDeTiempo } from './timeline.js';
import { conTransicion, guardarPreferencia, icono, leerNacimiento, leerPreferencia, marcarDesborde, movimientoReducido, normalizar, urlImagen, urlPlaceholder } from './util.js';

// Si se llega directo al mapa, su módulo se pide de inmediato, mientras se arma el resto de la app.
if (document.documentElement.dataset.base === 'mapa') import('./mapa.js').catch(() => {});

const { periodos, temas, eventos, recorridos, grupos, mapa: datosMapa } = cargarDatos();
const porId = new Map(eventos.map((ev) => [ev.id, ev]));

// Con un enlace directo a un evento, su imagen (lo más pesado de la vista) se pide antes de armar la línea de
// tiempo, con el mismo srcset del detalle para que el navegador elija la misma versión.
const enlaceDirecto = porId.get(/^#evento\/([a-z0-9-]+)$/.exec(location.hash)?.[1]);
if (enlaceDirecto) {
  const { srcset, sizes } = imagenDetalle(enlaceDirecto.imagen.archivo);
  const enlace = Object.assign(document.createElement('link'), { rel: 'preload', as: 'image', imageSrcset: srcset, imageSizes: sizes });
  enlace.fetchPriority = 'high';
  document.head.append(enlace);
}
const grupoPorId = new Map(grupos.map((g) => [g.id, g]));
const recorridoPorId = new Map(recorridos.map((r) => [r.id, r]));
const $ = (selector) => document.querySelector(selector);
const TITULO = document.title;

// Personajes que aparecen en más de un evento: tienen ficha propia (#personaje/<nombre-sin-tildes>).
const slugDe = (nombre) =>
  normalizar(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const personajes = new Map();
for (const ev of eventos) {
  for (const nombre of ev.personajes) {
    const slug = slugDe(nombre);
    if (!personajes.has(slug)) personajes.set(slug, { slug, nombre, eventos: [] });
    personajes.get(slug).eventos.push(ev);
  }
}
for (const [slug, p] of personajes) if (p.eventos.length < 2) personajes.delete(slug);

// Avisos para lectores de pantalla (región «status» oculta a la vista).
const avisos = $('#avisos');
let avisoPendiente;
function anunciar(texto) {
  clearTimeout(avisoPendiente);
  avisos.textContent = '';
  avisoPendiente = setTimeout(() => {
    avisos.textContent = texto;
  }, 100);
}

// Avisos a la vista (además del lector): un enlace que no existe o la falta de conexión. Se van solos a los
// `duracion` ms (0: hasta cerrarlo, también con Escape); `clave` permite retirar uno en particular (el de sin
// conexión) y `accion` ({ texto, alHacer }) agrega un botón, como «Recargar».
const aviso = $('#aviso');
const botonAviso = aviso.querySelector('.aviso-accion');
let avisoTiempo;
let accionAviso = null;
function avisar(texto, { duracion = 7000, clave = '', accion = null } = {}) {
  anunciar(texto);
  aviso.querySelector('.aviso-texto').textContent = texto;
  aviso.dataset.clave = clave;
  accionAviso = accion;
  botonAviso.hidden = !accion;
  botonAviso.textContent = accion?.texto ?? '';
  aviso.hidden = false;
  clearTimeout(avisoTiempo);
  if (duracion) avisoTiempo = setTimeout(() => (aviso.hidden = true), duracion);
}
function retirarAviso(clave) {
  if (aviso.dataset.clave === clave) aviso.hidden = true;
}
aviso.querySelector('.aviso-cerrar').addEventListener('click', () => (aviso.hidden = true));
botonAviso.addEventListener('click', () => accionAviso?.alHacer());
const RECARGAR = { texto: 'Recargar', alHacer: () => location.reload() };
// Algo que se carga a pedido no llegó: sin conexión o, más a menudo, porque se publicó una versión nueva mientras
// la pestaña estaba abierta (el navegador recuerda el módulo que falló: reintentar no sirve, recargar sí).
function sinModulo(error) {
  console.error(error);
  avisar('No se pudo cargar esta parte del sitio (sin conexión o porque hay una versión nueva).', { duracion: 0, clave: 'modulo', accion: RECARGAR });
}

// Copiar al portapapeles (un enlace, una cita) y decirlo; si el navegador no lo permite, se explica qué hacer.
async function copiar(texto, mensaje) {
  try {
    await navigator.clipboard.writeText(texto);
    avisar(mensaje, { duracion: 4000 });
  } catch {
    avisar('No se pudo copiar. Selecciona el texto y cópialo con el menú del navegador.');
  }
}

// «Compartir» un evento: con el menú del sistema si existe (celulares) o copiando su enlace. El enlace es su
// página propia (e/<id>.html), que muestra su título y su resumen al pegarlo en un chat o en Classroom.
async function compartir(ev) {
  const url = urlCompartir(ev);
  // Con mouse (un computador) se copia: el menú del sistema de Windows o macOS no siempre ofrece copiar.
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try {
      await navigator.share({ title: `${ev.titulo} · ${TITULO}`, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  copiar(url, 'Enlace copiado: al pegarlo se verá con el título del evento.');
}

// «Guardar para usar sin conexión» (en la presentación de una historia): la imagen de 500 px de cada paso va a una
// caché propia («historia-guardada», una historia a la vez), que el Service Worker no recorta y que usa, para
// cualquier ancho del mismo archivo, cuando falta la red o tarda. El resto del sitio ya se guarda solo. De a una,
// para no saturar a Commons; el avance se ve en el mismo botón y el resultado, junto a él.
const GUARDADA = 'historia-guardada';
let guardando = false;
async function guardarHistoria(id, boton) {
  const r = recorridoPorId.get(id);
  if (!r || guardando) return;
  if (!navigator.serviceWorker?.controller || !('caches' in window)) {
    avisar('Guardar sin conexión funciona en el sitio publicado, con el navegador conectado a internet.');
    return;
  }
  guardando = true;
  const rotulo = boton?.querySelector('span');
  const textoBoton = rotulo?.textContent;
  boton?.setAttribute('aria-disabled', 'true');
  let fallidas = 0;
  try {
    await caches.delete(GUARDADA);
    const cache = await caches.open(GUARDADA);
    for (const [i, ev] of r.eventos.entries()) {
      if (rotulo) rotulo.textContent = `Guardando… ${i + 1} de ${r.eventos.length}`;
      const url = urlImagen(ev.imagen.archivo, 500);
      try {
        await cache.put(url, await fetch(url, { mode: 'no-cors' }));
      } catch {
        fallidas++;
      }
    }
    guardarPreferencia('guardada', fallidas ? '' : r.id);
  } catch {
    fallidas = r.eventos.length;
  }
  guardando = false;
  if (rotulo) rotulo.textContent = textoBoton;
  boton?.removeAttribute('aria-disabled');
  const resultado = fallidas
    ? `Se guardó una parte de «${r.titulo}»: ${fallidas} de ${r.eventos.length} imágenes no llegaron. Prueba de nuevo con mejor conexión.`
    : `«${r.titulo}» quedó guardada en este navegador para usarla sin conexión (una historia a la vez). En iPhone, Safari la borra si no abres el sitio en 7 días, salvo que lo agregues a la pantalla de inicio.`;
  // Si la presentación sigue a la vista, el resultado va junto al botón; si no, en un aviso.
  const estado = boton?.isConnected && elDetalle.querySelector('.recorrido-guardada');
  if (estado) estado.textContent = resultado;
  else avisar(resultado, { duracion: 10000 });
}

// Imagen que carga: aparece con un fundido sobre el tono del período (styles.css).
document.addEventListener(
  'load',
  (e) => {
    if (e.target instanceof HTMLImageElement && e.target.dataset.periodo) e.target.classList.add('cargada');
  },
  true,
);

// Imagen que no carga: placeholder SVG del período; si tampoco carga, queda el fondo de color.
document.addEventListener(
  'error',
  (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.dataset.periodo) return;
    img.removeAttribute('srcset');
    if (img.dataset.respaldo) {
      img.removeAttribute('src');
      return;
    }
    img.dataset.respaldo = 'si';
    img.src = urlPlaceholder(img.dataset.periodo);
    // En el detalle, el pie describe la imagen que no cargó: se aclara qué se ve en su lugar.
    img
      .closest('figure')
      ?.querySelector('figcaption')
      ?.insertAdjacentHTML('afterbegin', '<span class="sin-imagen">No se pudo cargar la imagen; en su lugar se ve un dibujo del período.</span>');
  },
  true,
);

// Preferencias recordadas en este navegador: tamaño de texto, modo «Proyectar en clase» y nivel de lectura.
const raiz = document.documentElement;
const botonTexto = $('#btn-texto');
const botonClase = $('#btn-clase');
function ponerTextoGrande(grande) {
  if (grande) raiz.dataset.texto = 'grande';
  else delete raiz.dataset.texto;
  botonTexto.setAttribute('aria-pressed', String(grande));
}
// En clase: letra más grande, colores claros (se ven mejor proyectados), Av Pág / Re Pág para avanzar y
// «Pantalla completa» (si el navegador lo permite). Lo personal («¿Qué edad tenías?», «Tu recorrido») no se
// proyecta (styles.css).
const botonPantalla = $('#btn-pantalla');
function ponerModoClase(activo) {
  if (activo) raiz.dataset.clase = '';
  else delete raiz.dataset.clase;
  botonClase.setAttribute('aria-pressed', String(activo));
  botonPantalla.hidden = !activo || !document.fullscreenEnabled;
  if (!activo && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
botonPantalla.addEventListener('click', () => {
  const pedido = document.fullscreenElement ? document.exitFullscreen() : raiz.requestFullscreen();
  pedido.catch(() => anunciar('El navegador no permitió la pantalla completa.'));
});
document.addEventListener('fullscreenchange', () => {
  botonPantalla.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
  linea.redistribuir();
});
ponerTextoGrande(leerPreferencia('texto') === 'grande');
ponerModoClase(leerPreferencia('clase') === 'si');

const NIVELES = ['nino', 'general', 'detallado'];
let nivel = NIVELES.includes(leerPreferencia('nivel')) ? leerPreferencia('nivel') : 'general';
for (const radio of document.querySelectorAll('input[name="nivel"]')) radio.checked = radio.value === nivel;
// La píldora del nivel elegido es un elemento aparte, del tamaño de su opción: al cambiar de nivel (View
// Transition) se desliza y el texto del detalle cambia con un fundido.
const marcaNivel = $('.nivel-marca');
function marcarNivel() {
  const elegida = $('.nivel-opciones input:checked')?.parentElement;
  if (!elegida) return;
  marcaNivel.style.setProperty('--x', `${elegida.offsetLeft}px`);
  marcaNivel.style.setProperty('--ancho', `${elegida.offsetWidth}px`);
}
new ResizeObserver(marcarNivel).observe($('.nivel-opciones'));

const seccionLinea = $('#linea');
const seccionInicio = $('#inicio');
const seccionMapa = $('#mapa');

// Dónde ver un evento en el mapa: su primer lugar con alfiler; si no tiene, su zona, «Todo Chile» o «Fuera de Chile».
const lugarIds = new Set(datosMapa.lugares.map((l) => l.id));
const zonaIds = new Set(datosMapa.zonas.map((z) => z.id));
function rutaEnMapa(ev) {
  const lugar = ev.ubicaciones.find((u) => lugarIds.has(u));
  if (lugar) return `#lugar/${lugar}`;
  const zona = ev.ubicaciones.find((u) => zonaIds.has(u));
  if (zona) return `#mapa/zona/${zona}`;
  if (ev.ubicaciones.includes('chile')) return '#mapa/chile';
  return ev.ubicaciones.some((u) => u.startsWith('fuera:')) ? '#mapa/fuera' : null;
}
const elDetalle = $('#detalle');
const linea = crearLineaDeTiempo(seccionLinea, $('#minimapa'), {
  eventos,
  periodos,
  grupos,
  anunciar,
  alAbrir: (item) => ir(item.esGrupo ? `#grupo/${item.id}` : `#evento/${item.id}`),
  alCambiar: actualizarControles,
  nivel: () => nivel,
});
const detalle = crearDetalle(elDetalle, {
  periodos,
  temas,
  personajeDe: (nombre) => personajes.get(slugDe(nombre)) ?? null,
  rutaEnMapa,
  mapa: datosMapa,
  visto: (ev) => vistos.has(ev.id),
  alCambiarNacimiento: (anio) => linea.ponerNacimiento(anio),
});
linea.ponerNacimiento(leerNacimiento());
const filtros = crearFiltros($('#panel-filtros'), {
  periodos,
  temas,
  eventos,
  boton: $('#btn-buscar'),
  alCambiar: aplicarFiltros,
  alElegir: (ev) => ir(`#evento/${ev.id}`),
  alAbrirOCerrar: actualizarInert,
  alVerLinea: () => ir('#linea'),
});
// Un período elegido en la portada abre la línea de tiempo en ese tramo.
let periodoPedido = null;
const inicio = crearInicio(seccionInicio, {
  eventos,
  periodos,
  recorridos,
  mapa: datosMapa,
  nivel: () => nivel,
  alElegirNivel: (valor) => {
    const radio = document.querySelector(`input[name="nivel"][value="${valor}"]`);
    if (radio) radio.checked = true;
    ponerNivel(valor);
  },
  alElegirPeriodo: (id) => ir(`#linea/${id}`),
});

// «Ya visto»: los eventos abiertos se recuerdan en este navegador, solo para una marca discreta en la tarjeta.
const vistos = new Set((leerPreferencia('vistos') ?? '').split(',').filter((id) => porId.has(id)));
linea.marcarVistos(vistos);
// El último abierto se recuerda para «Seguir con…» en la portada. El recién visto por primera vez se marca
// al volver a la línea de tiempo (su ✓ se asienta).
let recienVisto = null;
function marcarVisto(ev) {
  guardarPreferencia('ultimo', ev.id);
  if (vistos.has(ev.id)) return;
  vistos.add(ev.id);
  guardarPreferencia('vistos', [...vistos].join(','));
  linea.marcarVistos([ev.id]);
  recienVisto = ev.id;
}

botonTexto.addEventListener('click', () => {
  const grande = botonTexto.getAttribute('aria-pressed') !== 'true';
  ponerTextoGrande(grande);
  guardarPreferencia('texto', grande ? 'grande' : 'normal');
  linea.redistribuir();
});
botonClase.addEventListener('click', () => {
  const activo = botonClase.getAttribute('aria-pressed') !== 'true';
  ponerModoClase(activo);
  guardarPreferencia('clase', activo ? 'si' : 'no');
  linea.redistribuir();
  anunciar(activo ? 'Modo para proyectar en clase activado. Av Pág y Re Pág avanzan y retroceden.' : 'Modo para proyectar en clase desactivado.');
});
// El nivel se elige arriba («Leer») o en «Empieza aquí», en la portada: los dos quedan marcados.
function ponerNivel(valor) {
  nivel = valor;
  guardarPreferencia('nivel', nivel);
  detenerLectura();
  inicio.ponerNivel(nivel);
  cambiarVista(() => {
    marcarNivel();
    detalle.ponerNivel(nivel);
    linea.ponerNivel();
  }, 'nivel');
}
$('.nivel').addEventListener('change', (e) => ponerNivel(e.target.value));

// ---- Secciones: la portada (#inicio o sin #), la línea de tiempo (#linea) y el mapa (#mapa…) se ven de a
// una; el detalle y la búsqueda se abren encima de la que está. <html data-base> la indica al CSS: index.html
// la fija antes de pintar, según la dirección, y desde ahí la cambia main.js. ----
const BASES = {
  inicio: { hash: '#inicio', titulo: TITULO },
  linea: { hash: '#linea', titulo: `Línea de tiempo · ${TITULO}` },
  mapa: { hash: '#mapa', titulo: `Mapa · ${TITULO}` },
};
const NOMBRE_BASE = { inicio: 'la portada', linea: 'la línea de tiempo', mapa: 'el mapa' };
const pestanas = [...document.querySelectorAll('.pestana')];
let base = raiz.dataset.base in BASES ? raiz.dataset.base : 'linea';

// «#linea/05»: la línea de tiempo en el período 5 (el enlace de cada período en la portada).
const periodoDeRuta = (hash) => /^#linea\/(\d\d)$/.exec(hash)?.[1] ?? null;
function baseDeRuta(hash) {
  if (hash === '' || hash === '#' || hash === '#inicio') return 'inicio';
  if (hash === '#linea') return 'linea';
  const periodo = periodoDeRuta(hash);
  if (periodo) return periodos.some((p) => p.id === periodo) ? 'linea' : null;
  if (/^#(?:mapa|lugar)(?:\/|$)/.test(hash)) return 'mapa';
  return null;
}

// Lo elegido en el mapa según la dirección; si no existe, todo el mapa.
const regionIds = new Set(datosMapa.regiones.map((r) => r.codigo));
function seleccionDeRuta(hash) {
  let m = /^#mapa\/(chile|fuera)$/.exec(hash);
  if (m) return { tipo: m[1] };
  m = /^#mapa\/zona\/([a-z0-9-]+)$/.exec(hash);
  if (m && zonaIds.has(m[1])) return { tipo: 'zona', id: m[1] };
  m = /^#mapa\/([a-z]{2})$/.exec(hash);
  if (m && regionIds.has(m[1].toUpperCase())) return { tipo: 'region', id: m[1].toUpperCase() };
  m = /^#lugar\/([a-z0-9-]+)$/.exec(hash);
  if (m && lugarIds.has(m[1])) return { tipo: 'lugar', id: m[1] };
  return { tipo: 'todo', invalida: hash !== '#mapa' };
}

// El mapa (módulo y formas de las regiones) se carga la primera vez que se abre.
let mapa = null;
let cargaMapa = null;
// Si el módulo no llega (sin conexión, o una versión nueva publicada mientras la pestaña estaba abierta), se
// avisa y se ofrece recargar: reintentar import() no sirve, el navegador recuerda el módulo que falló.
function avisarMapaFallido() {
  const aviso = seccionMapa.querySelector('.mapa-cargando');
  if (!aviso || aviso.dataset.fallo) return;
  aviso.dataset.fallo = 'si';
  aviso.textContent = 'No se pudo cargar el mapa. ';
  const boton = Object.assign(document.createElement('button'), { type: 'button', className: 'boton chico', textContent: 'Recargar la página' });
  boton.addEventListener('click', () => location.reload());
  aviso.append(boton);
  anunciar('No se pudo cargar el mapa.');
}

function mostrarMapa({ enfocar = false } = {}) {
  cargaMapa ??= import('./mapa.js')
    .then(({ crearMapa }) => {
      mapa = crearMapa(seccionMapa, { eventos, periodos, mapa: datosMapa, anunciar, alElegir: (ruta) => ir(ruta) });
    })
    .catch(avisarMapaFallido);
  cargaMapa.then(() => {
    if (base !== 'mapa') return;
    if (!mapa) {
      if (enfocar) seccionMapa.querySelector('.mapa-cargando button')?.focus();
      return;
    }
    const seleccion = seleccionDeRuta(location.hash);
    mapa.mostrar(seleccion, { enfocar: enfocar && !detalle.abierto });
    if (!detalle.abierto) document.title = seleccion.tipo === 'todo' ? BASES.mapa.titulo : `${mapa.titulo(seleccion)} · Mapa · ${TITULO}`;
  });
}

function ponerBase(nueva) {
  base = nueva;
  raiz.dataset.base = nueva;
  if (!detalle.abierto) document.title = BASES[nueva].titulo;
  if (nueva === 'inicio') inicio.mostrarAvance(vistos, leerPreferencia('ultimo'));
  actualizarInert();
  actualizarControles();
  actualizarPestanas();
}

// La pestaña de la sección a la vista (o «Historias», con una historia abierta) queda marcada. La marca es
// un elemento aparte, del tamaño de la pestaña: en el cambio de sección (View Transition) se desliza de una
// a otra sin estirar los rótulos.
const marcaPestana = $('.pestanas-marca');
const filaPestanas = $('.pestanas');
// Si las secciones no caben (letra grande en una pantalla angosta), un degradado avisa que la fila sigue.
const medirPestanas = marcarDesborde(filaPestanas);
function ubicarMarca() {
  const actual = pestanas.find((p) => p.hasAttribute('aria-current'));
  marcaPestana.hidden = !actual;
  medirPestanas();
  if (!actual) return;
  marcaPestana.style.setProperty('--x', `${actual.offsetLeft}px`);
  marcaPestana.style.setProperty('--ancho', `${actual.offsetWidth}px`);
  // La sección actual siempre a la vista dentro de la fila.
  const { offsetLeft: x, offsetWidth: w } = actual;
  if (x < filaPestanas.scrollLeft || x + w > filaPestanas.scrollLeft + filaPestanas.clientWidth) filaPestanas.scrollLeft = x - 16;
}
new ResizeObserver(ubicarMarca).observe(filaPestanas);
// En una página («Acerca de», «Para docentes», el glosario) o en la ficha de un personaje no se marca ninguna:
// no es ninguna de las secciones, y el lector de pantalla anunciaría «página actual» en la equivocada.
function actualizarPestanas() {
  const tipo = vistaActual?.tipo;
  const actual = EN_HISTORIAS.has(tipo) ? 'historias' : ['pagina', 'personaje'].includes(tipo) ? null : base;
  for (const p of pestanas) {
    if (p.dataset.seccion === actual) p.setAttribute('aria-current', 'page');
    else p.removeAttribute('aria-current');
  }
  ubicarMarca();
}

// El foco pasa a la sección (su título o la tarjeta elegida), para el teclado y los lectores de pantalla.
function enfocarBase() {
  if (base === 'inicio') inicio.enfocar();
  else if (base === 'mapa') mostrarMapa({ enfocar: true });
  else linea.enfocarActual();
}

// A la línea de tiempo se llega en el período elegido en la portada o, la primera vez en la sesión, con su
// animación de entrada; entre secciones hay un fundido breve. En el mapa, la dirección dice qué mostrar.
function cambiarBase(nueva, { enfocar = true } = {}) {
  if (nueva === base) {
    if (nueva === 'mapa') mostrarMapa({ enfocar });
    else if (enfocar) enfocarBase();
    return;
  }
  const entrada = nueva === 'linea' && !periodoPedido && primeraVisita();
  const aplicar = () => {
    ponerBase(nueva);
    if (nueva === 'linea' && periodoPedido) linea.irAPeriodo(periodoPedido, { suave: false, enfocar });
    else if (nueva === 'mapa') mostrarMapa({ enfocar });
    else if (enfocar) enfocarBase();
    periodoPedido = null;
  };
  if (entrada) {
    aplicar();
    linea.entrada();
  } else {
    // La sección nueva entra por su eje: la línea de tiempo de lado, el mapa de norte a sur (styles.css).
    cambiarVista(aplicar, `seccion-${nueva}`);
  }
}

// ---- Rutas: cada dirección con # de una vista (evento, grupo, historia, personaje) la abre sobre la sección ----
function vistaDeRuta(hash = location.hash) {
  let m = /^#evento\/([a-z0-9-]+)$/.exec(hash);
  if (m) return porId.has(m[1]) ? { tipo: 'evento', ev: porId.get(m[1]) } : { tipo: 'desconocida' };
  m = /^#grupo\/([a-z0-9-]+)$/.exec(hash);
  if (m) return grupoPorId.has(m[1]) ? { tipo: 'grupo', grupo: grupoPorId.get(m[1]) } : { tipo: 'desconocida' };
  if (hash === '#historias') return { tipo: 'historias' };
  m = /^#historia\/([a-z0-9-]+)(?:\/(\d+|fin))?$/.exec(hash);
  if (m) return recorridoPorId.has(m[1]) ? vistaDeHistoria(recorridoPorId.get(m[1]), m[2]) : { tipo: 'desconocida' };
  m = /^#personaje\/([a-z0-9-]+)$/.exec(hash);
  if (m) return personajes.has(m[1]) ? { tipo: 'personaje', persona: personajes.get(m[1]) } : { tipo: 'desconocida' };
  if (hash === '#acerca' || hash === '#docentes' || hash === '#glosario') return { tipo: 'pagina', id: hash.slice(1) };
  // Secuencia armada por un docente (#docentes): eventos elegidos, en orden cronológico, como una historia.
  m = /^#secuencia\/([a-z0-9,-]+?)(?:\/(\d+|fin))?$/.exec(hash);
  if (m) {
    const ids = [...new Set(m[1].split(','))];
    const lista = ids.map((id) => porId.get(id)).filter(Boolean).sort((a, b) => eventos.indexOf(a) - eventos.indexOf(b));
    if (lista.length < 2 || lista.length > 20 || lista.length !== ids.length) return { tipo: 'desconocida' };
    const clave = lista.map((ev) => ev.id).join(',');
    const recorrido = {
      id: 'secuencia',
      titulo: 'Secuencia para la clase',
      descripcion: 'Eventos elegidos en «Para docentes», en orden cronológico.',
      eventos: lista,
      origen: { href: '#docentes', texto: 'Para docentes' },
      salida: { href: '#linea', texto: 'Ir a la línea de tiempo' },
      ruta: (n) => `#secuencia/${clave}${n === 0 ? '' : `/${n}`}`,
    };
    return vistaDeHistoria(recorrido, m[2]);
  }
  return null;
}
// Sin número (o con 0), la presentación de la historia; con «fin», su cierre; si no, el paso pedido.
function vistaDeHistoria(recorrido, paso = '0') {
  if (paso === 'fin') return { tipo: 'historia-fin', recorrido };
  const n = Number(paso);
  if (n === 0) return { tipo: 'historia-inicio', recorrido };
  if (n > recorrido.eventos.length) return { tipo: 'desconocida' };
  return { tipo: 'historia', recorrido, paso: n, ev: recorrido.eventos[n - 1] };
}
const esRuta = (hash) => /^#(?:evento|grupo|historia|personaje|mapa|lugar|secuencia|linea)\/|^#(?:historias|inicio|linea|mapa|acerca|docentes|glosario)$/.test(hash);

// «Acerca de», «Para docentes» y el glosario se cargan a pedido (src/paginas.js), igual que los textos de cada
// evento (src/datos.js); si no llegan, se ofrece recargar.
const EN_HISTORIAS = new Set(['historias', 'historia', 'historia-inicio', 'historia-fin']);
let paginas = null;
let pedido = 0;
const datosPaginas = { eventos, periodos, recorridos };

// Historial: cada vista agrega una entrada, así el botón Atrás del navegador (y el gesto de volver del celular)
// retrocede de a un paso: al evento anterior, al paso anterior de una historia. Cada entrada recuerda cuántas
// vistas lleva desde la sección (`n`), dónde empezó la cadena de eventos que se está recorriendo con «Anterior» y
// «Siguiente» (`cadena`) y, dentro de una historia, dónde quedó su presentación (`historia.en`): así «Volver» sale
// de una vez, sin recorrer cada paso. Si la vista llegó por un enlace directo, lo anterior no está en el
// historial (`sinSeccion`) y «Volver» reemplaza la dirección. Elegir lo que ya está a la vista solo lo enfoca.
const EN_CADENA = new Set(['evento', 'grupo']);
function estadoPara(url) {
  const vista = vistaDeRuta(url);
  if (!vista || vista.tipo === 'desconocida') return { app: true, n: 0 };
  const previo = history.state?.app ? history.state : null;
  const desdeVista = detalle.abierto;
  const n = desdeVista ? (previo?.n ?? 0) + 1 : 1;
  const estado = { app: true, n };
  if (desdeVista && (!previo || previo.sinSeccion)) estado.sinSeccion = true;
  if (EN_CADENA.has(vista.tipo)) {
    const sigue = desdeVista && EN_CADENA.has(vistaActual?.tipo);
    estado.cadena = sigue ? (previo?.cadena ?? null) : desdeVista ? (previo ? previo.n : null) : 0;
  }
  if (vista.recorrido) {
    const clave = rutaHistoria(vista.recorrido, 0);
    estado.historia = desdeVista && previo?.historia?.clave === clave ? previo.historia : { clave, en: vista.tipo === 'historia-inicio' ? n : null };
  }
  return estado;
}

function ir(url, { desdeBoton = false } = {}) {
  const misma = location.hash === url || (baseDeRuta(url) === 'inicio' && baseDeRuta(location.hash) === 'inicio');
  if (!misma) history.pushState(estadoPara(url), '', url);
  aplicarRuta({ desdeBoton });
}

// Un pedido a pedido que todavía no llega se cancela al buscar o con Escape: así no cambia la vista después.
function cancelarPedido() {
  if (!('cargando' in raiz.dataset)) return;
  pedido++;
  delete raiz.dataset.cargando;
  retirarAviso('cargando');
}

// Una dirección escrita con mayúsculas o con tildes codificadas («#Linea», «#mapa/BI») vale si en minúsculas es
// una ruta conocida.
function corregirDireccion() {
  const hash = location.hash;
  let limpia = hash;
  try {
    limpia = decodeURIComponent(hash).toLowerCase();
  } catch {
    return;
  }
  if (limpia !== hash && (vistaDeRuta(limpia) || baseDeRuta(limpia))) history.replaceState(history.state, '', limpia);
}

function aplicarRuta({ desdeBoton = false, inicial = false } = {}) {
  retirarAviso('ruta');
  corregirDireccion();
  const vista = vistaDeRuta();
  const destino = baseDeRuta(location.hash);
  const hash = location.hash;
  // Un ancla de la página («Saltar al contenido» → #principal) no es una ruta: el navegador ya movió el foco.
  if (!vista && !destino && hash.length > 1 && document.getElementById(hash.slice(1))) return;
  // Desconocida: una vista que no existe (un evento, una historia sin ese paso), algo que no es ninguna ruta
  // («#evento/», «#acerca/x») o un lugar del mapa que no está.
  const rota = vista?.tipo === 'desconocida' || (!vista && !destino && hash !== '' && hash !== '#') || (destino === 'mapa' && seleccionDeRuta(hash).invalida);
  // Un período pedido por la dirección: la línea se abre en él y la dirección queda en «#linea».
  const periodo = !rota && periodoDeRuta(hash);
  if (periodo) {
    history.replaceState(history.state, '', '#linea');
    if (base === 'linea' && !detalle.abierto) return linea.irAPeriodo(periodo, { suave: !inicial, enfocar: !inicial });
    periodoPedido = periodo;
  }
  if (vista && !rota) mostrarVista(vista, desdeBoton);
  else if (detalle.abierto) cerrarDetalle(rota ? base : (destino ?? base));
  else if (destino && !rota) cambiarBase(destino, { enfocar: !inicial });
  // Un enlace roto: se dice a la vista y la dirección vuelve a la sección que se está mostrando.
  if (rota) {
    history.replaceState(null, '', BASES[base].hash);
    avisar(`No encontramos esa página: puede que el enlace esté incompleto o sea antiguo. Estás en ${NOMBRE_BASE[base]}.`, { clave: 'ruta' });
  }
}

// En celulares, el gesto de volver trae su propia animación: entonces no se suma otra.
window.addEventListener('popstate', (e) => {
  sinAnimar = e.hasUAVisualTransition === true;
});
window.addEventListener('hashchange', () => {
  aplicarRuta();
  sinAnimar = false;
});

// «Volver»: desde un paso o el cierre de una historia, a su presentación; desde un evento (o una cadena de
// eventos recorrida con «Siguiente»), a donde empezó la cadena: la sección, la ficha de un personaje, la lista
// de un lugar; desde lo demás (una página, un personaje, la presentación de una historia), un paso atrás.
// Si eso no está en el historial (se llegó por un enlace directo), se reemplaza la dirección.
function volver() {
  const e = history.state?.app ? history.state : null;
  const v = vistaActual;
  const enHistoria = v?.recorrido && v.tipo !== 'historia-inicio';
  let atras = null;
  if (e && enHistoria) atras = e.historia?.en != null ? e.historia.en - e.n : null;
  else if (e && EN_CADENA.has(v?.tipo)) atras = e.cadena != null ? e.cadena - e.n : null;
  else if (e) atras = -1;
  if (atras !== null && atras < 0) return history.go(atras);
  if (enHistoria) {
    const portada = rutaHistoria(v.recorrido, 0);
    history.replaceState({ app: true, n: e?.n ?? 1, sinSeccion: true, historia: { clave: portada, en: e?.n ?? 1 } }, '', portada);
  } else {
    history.replaceState(null, '', BASES[base].hash);
  }
  aplicarRuta();
}

// ---- Transiciones: la miniatura crece hasta la lámina del detalle (y vuelve al cerrarlo) y, entre
// vistas, la página pasa hacia el lado del recorrido. Sin View Transitions, el cambio es inmediato. ----
const LAMINA = 'lamina';
let animarCambios = false; // la ruta con que se abre la página no se anima
let sinAnimar = false;
let vistaActual = null;
let nav = { antes: null, despues: null }; // direcciones de «Anterior» y «Siguiente» en la vista abierta
const esperar = (ms) => new Promise((listo) => setTimeout(listo, ms));
const laminaDetalle = () => elDetalle.querySelector('.detalle-marco img');
const posicion = (vista) => vista?.ev?.u ?? vista?.grupo?.u ?? null;
// Hacia dónde pasa la página: dentro de una historia, según el paso (la presentación es el 0 y el cierre va
// al final); entre eventos, según su lugar en la línea de tiempo. Entre una historia y otra cosa, sin lado.
function lado(previa, vista) {
  const historia = (v) => (v?.recorrido ? rutaHistoria(v.recorrido, 0) : null);
  if (historia(previa) || historia(vista)) {
    if (historia(previa) !== historia(vista)) return '';
    const n = (v) => (v.tipo === 'historia-inicio' ? 0 : v.tipo === 'historia-fin' ? Infinity : v.paso);
    return n(vista) > n(previa) ? 'siguiente' : n(vista) < n(previa) ? 'anterior' : '';
  }
  const [a, b] = [posicion(previa), posicion(vista)];
  return a === null || b === null || a === b ? '' : b > a ? 'siguiente' : 'anterior';
}

// La lámina solo crece o se encoge si se ve entera dentro del detalle (no tapada por la cabecera).
function laminaALaVista(img) {
  const r = img.getBoundingClientRect();
  const marco = elDetalle.getBoundingClientRect();
  return r.width > 0 && r.top >= marco.top - 1 && r.bottom <= marco.bottom + 1;
}

function cambiarVista(cambiar, tipo) {
  if (animarCambios && !sinAnimar) return conTransicion(cambiar, tipo);
  cambiar(false);
  return null;
}

// Antes y después de un evento: según el filtro activo (si el evento lo cumple) o entre todos los eventos.
// Como en la línea de tiempo, un grupo vecino (con dos o más eventos a la vista) cuenta como uno solo.
const grupoDeEvento = new Map(grupos.flatMap((g) => g.eventos.map((ev) => [ev, g])));
function vecinosDe(ev) {
  const lista = linea.visibles.includes(ev) ? linea.visibles : eventos;
  const i = lista.indexOf(ev);
  const comoItem = (x) => {
    const g = grupoDeEvento.get(x);
    return g && g !== grupoDeEvento.get(ev) && g.eventos.filter((m) => lista.includes(m)).length > 1 ? g : x;
  };
  return { antes: lista[i - 1] ? comoItem(lista[i - 1]) : null, despues: lista[i + 1] ? comoItem(lista[i + 1]) : null };
}
const rutaEvento = (item) => (!item ? null : item.esGrupo ? `#grupo/${item.id}` : `#evento/${item.id}`);

function pintarVista(vista, desdeBoton) {
  const enfocar = !desdeBoton;
  let titulo;
  detenerLectura();
  filtros.cerrar({ devolverFoco: false });
  if (vista.tipo === 'evento') {
    const { ev } = vista;
    const { antes, despues } = vecinosDe(ev);
    detalle.mostrar(ev, { antes, despues, nivel, regla: linea.regla(ev), enfocar });
    nav = { antes: rutaEvento(antes), despues: rutaEvento(despues) };
    titulo = ev.titulo;
    if (desdeBoton) anunciar(`${ev.fechaTexto}: ${ev.titulo}`);
  } else if (vista.tipo === 'historia') {
    const { ev, recorrido: r, paso } = vista;
    const antes = r.eventos[paso - 2] ?? null;
    const despues = r.eventos[paso] ?? null;
    detalle.mostrar(ev, { antes, despues, nivel, regla: linea.regla(ev), enfocar, historia: { recorrido: r, paso } });
    // Antes del primer paso está la presentación; después del último, el cierre.
    nav = { antes: rutaHistoria(r, paso - 1), despues: rutaHistoria(r, despues ? paso + 1 : 'fin') };
    titulo = `${ev.titulo} · ${r.titulo}`;
    anunciar(`${r.titulo}, paso ${paso} de ${r.eventos.length}${desdeBoton ? `: ${ev.fechaTexto}, ${ev.titulo}` : ''}`);
  } else if (vista.tipo === 'historia-inicio') {
    const { recorrido: r } = vista;
    detalle.mostrarInicioHistoria(r, { nivel, enfocar });
    nav = { antes: null, despues: rutaHistoria(r, 1) };
    titulo = r.titulo;
    if (desdeBoton) anunciar(`${r.titulo}: presentación`);
  } else if (vista.tipo === 'historia-fin') {
    const { recorrido: r } = vista;
    detalle.mostrarFinHistoria(r, { enfocar, otras: r.ruta ? [] : recorridos.filter((x) => x !== r) });
    nav = { antes: rutaHistoria(r, r.eventos.length), despues: null };
    titulo = `Fin · ${r.titulo}`;
    if (desdeBoton) anunciar(`Fin de ${r.titulo}`);
  } else if (vista.tipo === 'grupo') {
    const { grupo } = vista;
    const antes = vecinosDe(grupo.eventos[0]).antes;
    const despues = vecinosDe(grupo.eventos.at(-1)).despues;
    detalle.mostrarGrupo(grupo, { antes, despues, nivel, regla: linea.regla(grupo), enfocar });
    nav = { antes: rutaEvento(antes), despues: rutaEvento(despues) };
    titulo = grupo.titulo;
    if (desdeBoton) anunciar(`${grupo.fechaTexto}: ${grupo.titulo}`);
  } else if (vista.tipo === 'historias') {
    detalle.mostrarHistorias(recorridos, { enfocar });
    nav = { antes: null, despues: null };
    titulo = 'Historias guiadas';
  } else if (vista.tipo === 'pagina') {
    const contenido = paginas.pagina(vista.id, datosPaginas);
    detalle.mostrarPagina(contenido, { enfocar });
    paginas.activar(elDetalle.querySelector('.pagina'), { eventos, copiar, avisar });
    nav = { antes: null, despues: null };
    titulo = contenido.titulo;
  } else {
    const { persona } = vista;
    detalle.mostrarPersonaje(persona, { nivel, regla: linea.regla(persona.eventos), enfocar });
    nav = { antes: null, despues: null };
    titulo = persona.nombre;
  }
  vistaActual = vista;
  mostrarEscuchar();
  document.body.dataset.vista = 'detalle';
  document.title = `${titulo} · ${TITULO}`;
  actualizarInert();
  actualizarPestanas();
  const marcado = vista.ev ?? vista.grupo;
  if (marcado) linea.seleccionar(marcado, { suave: false });
  if (vista.ev) marcarVisto(vista.ev);
  actualizarControles();
}

// Al pasar con Anterior y Siguiente, lo que sigue en pantalla viaja en vez de irse con la página: el punto del
// mini-mapa va de un lugar al otro (si el evento nuevo es de una zona, de todo Chile o de fuera, solo se
// funde), la marca de la regla corre y, en una historia, avanza el paso. La ficha y la barra de la historia
// quedan quietas. Se nombra solo lo que está a la vista, a lo más cuatro (styles.css, View Transitions).
const VIAJEROS = [
  ['.historia-barra', 'barra'],
  ['.historia-pasos .actual', 'paso'],
  ['.detalle-ficha', 'ficha'],
  ['.minimapa-viajero', 'lugar'],
  ['.regla-marca', 'marca'],
];
function nombrarViajeros(activo) {
  const marco = elDetalle.getBoundingClientRect();
  let nombrados = 0;
  for (const [selector, nombre] of VIAJEROS) {
    const el = elDetalle.querySelector(selector);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    const aLaVista = activo && nombrados < 4 && r.height > 0 && r.bottom > marco.top && r.top < marco.bottom;
    el.style.viewTransitionName = aLaVista ? nombre : '';
    if (aLaVista) nombrados++;
  }
}

// La lámina crece desde cualquier miniatura que lleve al evento (resultados, el mapa, fichas, el destacado de la
// portada), no solo desde la línea de tiempo. Al presionarla se recuerda cuál fue y se pide la imagen grande.
let origen = null;
document.addEventListener(
  'pointerdown',
  (e) => {
    const enlace = e.target.closest('a[href^="#evento/"], button.resultado[data-id]');
    const img = enlace?.querySelector('img');
    const id = enlace?.dataset.id ?? enlace?.getAttribute('href')?.slice('#evento/'.length);
    const ev = porId.get(id);
    origen = img && ev ? { img, id } : null;
    // Sus textos se piden ya, también al elegir una lámina de la línea de tiempo (lo siguiente suele ser «Leer»);
    // si fallan, mostrarVista vuelve a intentarlo.
    const paraLeer = ev ?? porId.get(e.target.closest('li.evento')?.dataset.id);
    if (paraLeer) cargarTextos([paraLeer])?.catch(() => {});
    if (ev && e.pointerType !== 'touch') {
      // sizes y srcset antes que src: así se pide solo la versión que usará el detalle.
      const { src, srcset, sizes } = imagenDetalle(ev.imagen.archivo);
      Object.assign(new Image(), { sizes, srcset, src });
    }
  },
  true,
);
const origenDe = (ev) => {
  if (!ev || origen?.id !== ev.id || !origen.img.isConnected) return null;
  const r = origen.img.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < innerHeight ? origen.img : null;
};

function mostrarVista(vista, desdeBoton) {
  const faltan = [
    vista.tipo === 'pagina' && !paginas && import('./paginas.js').then((m) => (paginas = m)),
    // El evento abierto lleva su detalle y sus fuentes.
    vista.ev && cargarTextos([vista.ev]),
  ].filter(Boolean);
  if (faltan.length) {
    const [turno, hash] = [++pedido, location.hash];
    raiz.dataset.cargando = '';
    // Si tarda (la primera vez, con red lenta), se ve y se oye que está cargando.
    const lento = setTimeout(() => turno === pedido && avisar('Cargando…', { duracion: 0, clave: 'cargando' }), 300);
    Promise.all(faltan)
      .then(() => turno === pedido && location.hash === hash && mostrarVista(vista, desdeBoton))
      .catch(sinModulo)
      .finally(() => {
        clearTimeout(lento);
        retirarAviso('cargando');
        if (turno === pedido) delete raiz.dataset.cargando;
      });
    return;
  }
  const previa = vistaActual;
  const aplicar = () => pintarVista(vista, desdeBoton);
  if (detalle.abierto) {
    const tipo = lado(previa, vista);
    if (!tipo) return void cambiarVista(aplicar, tipo);
    nombrarViajeros(true);
    return void cambiarVista((animado) => {
      aplicar();
      if (animado) nombrarViajeros(true);
    }, tipo)?.then(() => nombrarViajeros(false));
  }

  // Al abrir desde una miniatura (de la línea de tiempo o de una lista), crece hasta la lámina del detalle. Desde
  // otra sección, se recuerda qué tenía el foco para devolverlo al cerrar.
  focoPrevio = base !== 'linea' && $(`#${base}`).contains(document.activeElement) ? document.activeElement : null;
  const miniatura = origenDe(vista.ev) ?? (base === 'linea' && vista.ev && !filtros.abierto ? linea.miniatura(vista.ev) : null);
  origen = null;
  if (miniatura) miniatura.style.viewTransitionName = LAMINA;
  cambiarVista(async (animado) => {
    if (miniatura) miniatura.style.viewTransitionName = '';
    aplicar();
    const lamina = laminaDetalle();
    if (!animado || !miniatura || !lamina) return;
    // Se espera la imagen grande (precargada al presionar la tarjeta) a lo más 250 ms; si no llega, no crece.
    const lista = await Promise.race([lamina.decode().then(() => true, () => false), esperar(250).then(() => false)]);
    if (!lista || !laminaALaVista(lamina)) return;
    lamina.style.transition = 'none';
    lamina.classList.add('cargada');
    lamina.style.viewTransitionName = LAMINA;
  }, 'abrir')?.then(() => {
    const lamina = laminaDetalle();
    if (lamina) lamina.style.viewTransitionName = '';
  });
}

// Cierra la vista abierta y deja a la vista la sección `hacia` (por defecto, la que estaba debajo).
let focoPrevio = null;
function cerrarDetalle(hacia = base) {
  detenerLectura();
  const ev = vistaActual?.ev;
  const lamina = laminaDetalle();
  const vuelve = Boolean(hacia === 'linea' && base === 'linea' && ev && lamina?.classList.contains('cargada') && laminaALaVista(lamina));
  if (vuelve) lamina.style.viewTransitionName = LAMINA;
  let miniatura = null;
  const transicion = cambiarVista((animado) => {
    detalle.ocultar();
    vistaActual = null;
    nav = { antes: null, despues: null };
    document.body.dataset.vista = 'base';
    const misma = hacia === base;
    ponerBase(hacia);
    if (misma && focoPrevio?.isConnected) focoPrevio.focus({ preventScroll: true });
    else if (hacia !== 'mapa') enfocarBase();
    if (hacia === 'mapa') mostrarMapa({ enfocar: true }); // si lo elegido no cambió, el foco devuelto se queda
    focoPrevio = null;
    miniatura = animado && vuelve ? linea.miniatura(ev) : null;
    if (miniatura) miniatura.style.viewTransitionName = LAMINA;
  }, 'cerrar');
  const asentar = () => {
    if (recienVisto && base === 'linea' && !detalle.abierto) linea.asentarVisto(recienVisto);
    recienVisto = null;
  };
  if (!transicion) return asentar();
  transicion.then(() => {
    if (miniatura) miniatura.style.viewTransitionName = '';
    asentar();
  });
}

// Mientras se busca, la barra inferior se oculta: movería la línea de tiempo que está debajo, sin verla, y
// tapaba la barra de acciones del buscador (y el resultado con el foco) en el celular.
const controles = $('.controles');
function actualizarInert() {
  if (filtros.abierto) cancelarPedido();
  const tapado = detalle.abierto || filtros.abierto;
  seccionLinea.inert = tapado || base !== 'linea';
  seccionInicio.inert = tapado || base !== 'inicio';
  seccionMapa.inert = tapado || base !== 'mapa';
  elDetalle.inert = filtros.abierto;
  controles.hidden = filtros.abierto;
}

// Acciones del detalle: compartir un evento, copiar su cita, guardar una historia para usar sin conexión,
// escucharlo y el repaso al cierre de una historia.
elDetalle.addEventListener('click', (e) => {
  const b = e.target.closest('[data-accion]');
  if (b?.dataset.accion === 'compartir') compartir(porId.get(b.dataset.id));
  else if (b?.dataset.accion === 'copiar-cita') copiar(b.closest('.cita').querySelector('.cita-texto').textContent, 'Cita copiada.');
  else if (b?.dataset.accion === 'guardar-historia') guardarHistoria(b.dataset.historia, b);
  else if (b?.dataset.accion === 'escuchar') alternarLectura();
  else if (b?.dataset.accion === 'repaso') empezarRepaso();
});
// «Escuchar» (src/escuchar.js): el botón aparece solo si el sistema tiene una voz en español. Lee el título, la
// fecha, el texto del nivel elegido y, si se ven, «¿Sabías que…?» y «Lo que se discute»; se detiene al cambiar de
// vista o de nivel y con Escape.
const hayVozEspanola = () => 'speechSynthesis' in window && speechSynthesis.getVoices().some((v) => /^es(?:[-_]|$)/i.test(v.lang));
// Si las voces llegan con el evento ya pintado (`tarde`), el botón va con las acciones de la ficha y no sobre el
// texto: así nada se mueve.
function mostrarEscuchar(tarde = false) {
  const p = elDetalle.querySelector('.detalle-escuchar');
  if (!p) return;
  const hay = hayVozEspanola();
  if (tarde && hay && p.hidden && p.firstElementChild) elDetalle.querySelector('.ficha-acciones')?.append(p.firstElementChild);
  else p.hidden = !hay;
}
if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => mostrarEscuchar(true));
let leyendoAhora = false;
const leyendo = () => leyendoAhora;
function marcarLectura(activa) {
  leyendoAhora = activa;
  const b = elDetalle.querySelector('[data-accion="escuchar"]');
  if (b) b.querySelector('span').textContent = activa ? 'Detener la lectura' : 'Escuchar';
}
function detenerLectura() {
  if (!leyendoAhora) return;
  detenerVoz();
  marcarLectura(false);
}
function alternarLectura() {
  if (leyendo()) return detenerLectura();
  const ev = vistaActual?.ev;
  if (!ev) return;
  // Solo lo que se ve: en «Lo que se discute», el rótulo y la frase del nivel elegido.
  const seVe = (el) => getComputedStyle(el).display !== 'none';
  const parrafos = [...elDetalle.querySelectorAll('.detalle-cuerpo p')].map((p) => p.innerText);
  const recuadros = ['.sabias-que', '.se-discute']
    .map((s) => elDetalle.querySelector(s))
    .filter((caja) => caja && seVe(caja))
    .flatMap((caja) => [`${caja.querySelector('h3').innerText}.`, ...[...caja.querySelectorAll('p')].filter(seVe).map((p) => p.innerText)]);
  if (leerEnVoz([`${ev.titulo}.`, `${ev.fechaTexto}.`, ...parrafos, ...recuadros], { alTerminar: () => marcarLectura(false) })) marcarLectura(true);
}

// Repaso sin nota al cierre de una historia (src/repaso.js, a pedido): «Otra ronda» arma otra.
async function empezarRepaso() {
  const r = detalle.actual?.recorrido;
  const caja = elDetalle.querySelector('.repaso-preguntas');
  if (!r || !caja) return;
  try {
    const repaso = await import('./repaso.js');
    repaso.pintar(caja, repaso.preguntas(r.eventos, { eventos, lugares: datosMapa.lugares, regiones: datosMapa.regiones, nino: nivel === 'nino' }));
  } catch (error) {
    return sinModulo(error);
  }
  // «Empezar el repaso» se va; al final de cada ronda queda «Otra ronda».
  const inicioRepaso = elDetalle.querySelector('.repaso-empezar');
  if (inicioRepaso) inicioRepaso.hidden = true;
  caja.focus({ preventScroll: true });
  caja.scrollIntoView({ block: 'start', behavior: movimientoReducido() ? 'auto' : 'smooth' });
}

// Enlaces internos (#evento/…, #historias…): navegan sin recargar y sin llenar el historial.
document.addEventListener('click', (e) => {
  const enlace = e.target.closest('a[href^="#"]');
  if (!enlace || !esRuta(enlace.getAttribute('href'))) return;
  if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  ir(enlace.getAttribute('href'));
});

// ---- Barra inferior: Anterior / Al inicio (o Volver) / Siguiente. «Al inicio» lleva al comienzo de la línea
// de tiempo (la portada es la pestaña «Inicio»). En la portada, sin una vista abierta, la barra no se muestra. ----
const botonAnterior = $('#btn-anterior');
const botonSiguiente = $('#btn-siguiente');
const botonInicio = $('#btn-inicio');

function actualizarControles() {
  const enDetalle = detalle.abierto;
  botonAnterior.setAttribute('aria-disabled', String(enDetalle ? !nav.antes : !linea.puedeMover(-1)));
  botonSiguiente.setAttribute('aria-disabled', String(enDetalle ? !nav.despues : !linea.puedeMover(1)));
  botonInicio.innerHTML = enDetalle
    ? `${icono('volver')}<span class="nav-texto">Volver</span>`
    : `${icono('inicio')}<span class="nav-texto">Al inicio</span><span class="solo-lector"> de la línea de tiempo</span>`;
  // En las vistas sin recorrido (historias, personaje) Anterior y Siguiente no sirven: se ocultan.
  const ocultar = enDetalle && !nav.antes && !nav.despues;
  const conFoco = [botonAnterior, botonSiguiente].includes(document.activeElement);
  for (const b of [botonAnterior, botonSiguiente]) b.style.visibility = ocultar ? 'hidden' : '';
  if (ocultar && conFoco) $('#detalle-titulo')?.focus({ preventScroll: true });
}

function mover(dir) {
  if (!detalle.abierto) return linea.mover(dir);
  const url = dir > 0 ? nav.despues : nav.antes;
  if (url) ir(url, { desdeBoton: true });
}

// aria-disabled en vez de disabled: el botón conserva el foco al llegar al primer o último evento.
botonAnterior.addEventListener('click', () => botonAnterior.getAttribute('aria-disabled') !== 'true' && mover(-1));
botonSiguiente.addEventListener('click', () => botonSiguiente.getAttribute('aria-disabled') !== 'true' && mover(1));
botonInicio.addEventListener('click', () => (detalle.abierto ? volver() : linea.inicio()));

// ---- Filtros ----
const estadoFiltros = $('#estado-filtros');
function aplicarFiltros() {
  cancelarPedido(); // se siguió buscando: la vista que no llegaba ya no se abre
  const activo = filtros.activo();
  linea.filtrar(filtros.coincide, activo);
  const n = linea.visibles.length;
  estadoFiltros.hidden = !activo;
  estadoFiltros.firstElementChild.textContent = n
    ? `Filtro activo: ${n} de ${eventos.length} eventos.`
    : 'Ningún evento coincide con la búsqueda o los filtros.';
}
$('#btn-quitar').addEventListener('click', () => filtros.limpiar());

// ---- Teclado: flechas (anterior / siguiente), + y − (zoom), Escape (cerrar); en clase, Av Pág y Re Pág ----
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') {
    cancelarPedido();
    // Primero se detiene la lectura en voz alta y se cierra el aviso a la vista (puede tapar el foco).
    if (leyendo()) detenerLectura();
    else if (!aviso.hidden) aviso.hidden = true;
    else if (filtros.abierto) filtros.cerrar();
    else if (detalle.abierto && !e.target.closest('input')) volver(); // en un campo, Escape solo cancela lo escrito
    return;
  }
  if (filtros.abierto || e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  // Los controles remotos para presentaciones envían Av Pág y Re Pág: primero recorren el texto del
  // detalle y, al llegar al final (o al comienzo), pasan al evento siguiente (o al anterior).
  const pagina = 'clase' in raiz.dataset && (e.key === 'PageDown' || e.key === 'PageUp');
  if (pagina && detalle.abierto) {
    const abajo = e.key === 'PageDown';
    const queda = abajo ? elDetalle.scrollHeight - elDetalle.clientHeight - elDetalle.scrollTop : elDetalle.scrollTop;
    if (queda > 2) {
      e.preventDefault();
      elDetalle.scrollBy({ top: (abajo ? 0.8 : -0.8) * elDetalle.clientHeight, behavior: movimientoReducido() ? 'auto' : 'smooth' });
      return;
    }
  }
  // En la portada las flechas desplazan la página, como siempre.
  const enLinea = !detalle.abierto && base === 'linea';
  if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft' || pagina) && (detalle.abierto || enLinea)) {
    e.preventDefault();
    mover(e.key === 'ArrowRight' || e.key === 'PageDown' ? 1 : -1);
  } else if (enLinea && (e.key === '+' || e.key === '=')) {
    linea.zoom(1);
  } else if (enLinea && (e.key === '-' || e.key === '_')) {
    linea.zoom(-1);
  }
});

// «Saltar al contenido» lleva el foco a lo que está a la vista (sin cambiar la dirección).
$('.saltar').addEventListener('click', (e) => {
  e.preventDefault();
  if (detalle.abierto) $('#detalle-titulo')?.focus();
  else enfocarBase();
});

// Entrada animada de la línea de tiempo: solo la primera vez que se ve en la sesión.
function primeraVisita() {
  try {
    if (sessionStorage.getItem('historia-chile:entrada')) return false;
    sessionStorage.setItem('historia-chile:entrada', 'si');
    return true;
  } catch {
    return false;
  }
}

// Sin conexión se puede seguir viendo lo ya abierto (Service Worker): se avisa mientras dure.
const SIN_CONEXION = 'Sin conexión: puedes ver lo que ya abriste en este navegador; lo demás aparecerá al volver la conexión.';
addEventListener('offline', () => avisar(SIN_CONEXION, { duracion: 0, clave: 'conexion' }));
addEventListener('online', () => {
  retirarAviso('conexion');
  anunciar('Conexión recuperada.');
});

// Al imprimir un evento se abren sus plegables (fuentes, «¿Qué edad tenías?» queda oculto por el CSS) y
// después vuelven a como estaban.
let plegablesCerrados = [];
addEventListener('beforeprint', () => {
  plegablesCerrados = [...elDetalle.querySelectorAll('details:not([open])')];
  for (const d of plegablesCerrados) d.open = true;
});
addEventListener('afterprint', () => {
  for (const d of plegablesCerrados) d.open = false;
  plegablesCerrados = [];
});

history.scrollRestoration = 'manual';
document.body.dataset.vista = 'base';
ponerBase(base);
aplicarRuta({ inicial: true });
if (!detalle.abierto && base === 'linea' && primeraVisita()) linea.entrada();
animarCambios = true;
if (!navigator.onLine) avisar(SIN_CONEXION, { duracion: 0, clave: 'conexion' });
// La app arrancó: el rescate de index.html ya no aparece aunque después falle algo.
raiz.dataset.app = 'lista';

// Las voces se piden de antemano (Chrome las entrega recién después de la primera consulta): así «Escuchar»
// aparece junto con el evento y no después, sobre el texto.
if ('speechSynthesis' in window) (window.requestIdleCallback ?? setTimeout)(() => speechSynthesis.getVoices());

// Sin conexión: el Service Worker (plantilla en src/sw.js) solo existe en el sitio construido. Si una versión nueva
// toma el control con la pestaña abierta, lo que se pida a pedido puede ya no existir: se ofrece recargar.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const habiaVersion = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habiaVersion) avisar('Hay una versión nueva del sitio.', { duracion: 0, clave: 'version', accion: RECARGAR });
  });
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
