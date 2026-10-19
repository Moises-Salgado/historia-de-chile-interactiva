// Arranque de la app: preferencias, secciones (portada, línea de tiempo y mapa), detalle, filtros y rutas por
// hash: #inicio, #linea, #mapa (y #mapa/<región>, #mapa/zona/<id>, #mapa/chile, #mapa/fuera, #lugar/<id>),
// #evento/<id>, #grupo/<id>, #historias, #historia/<id>/<paso> y #personaje/<nombre>.
import './styles.css';
import { cargarDatos } from './datos.js';
import { crearDetalle, imagenDetalle } from './detalle.js';
import { crearFiltros } from './filtros.js';
import { crearInicio } from './inicio.js';
import { crearLineaDeTiempo } from './timeline.js';
import { conTransicion, guardarPreferencia, icono, leerPreferencia, movimientoReducido, normalizar, urlPlaceholder } from './util.js';

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
// `duracion` ms (0: hasta cerrarlo); `clave` permite retirar uno en particular (el de sin conexión).
const aviso = $('#aviso');
let avisoTiempo;
function avisar(texto, { duracion = 7000, clave = '' } = {}) {
  anunciar(texto);
  aviso.querySelector('.aviso-texto').textContent = texto;
  aviso.dataset.clave = clave;
  aviso.hidden = false;
  clearTimeout(avisoTiempo);
  if (duracion) avisoTiempo = setTimeout(() => (aviso.hidden = true), duracion);
}
function retirarAviso(clave) {
  if (aviso.dataset.clave === clave) aviso.hidden = true;
}
aviso.querySelector('button').addEventListener('click', () => (aviso.hidden = true));

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
});
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
  lugares: datosMapa.lugares,
  alElegirPeriodo: (id) => {
    periodoPedido = id;
    ir('#linea');
  },
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
$('.nivel').addEventListener('change', (e) => {
  nivel = e.target.value;
  guardarPreferencia('nivel', nivel);
  cambiarVista(() => {
    marcarNivel();
    detalle.ponerNivel(nivel);
    linea.ponerNivel();
  }, 'nivel');
});

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

function baseDeRuta(hash) {
  if (hash === '' || hash === '#' || hash === '#inicio') return 'inicio';
  if (hash === '#linea') return 'linea';
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
  return { tipo: 'todo' };
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
function ubicarMarca() {
  const actual = pestanas.find((p) => p.hasAttribute('aria-current'));
  marcaPestana.hidden = !actual;
  if (!actual) return;
  marcaPestana.style.setProperty('--x', `${actual.offsetLeft}px`);
  marcaPestana.style.setProperty('--ancho', `${actual.offsetWidth}px`);
}
new ResizeObserver(ubicarMarca).observe($('.pestanas'));
function actualizarPestanas() {
  const actual = ['historias', 'historia'].includes(vistaActual?.tipo) ? 'historias' : base;
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
  m = /^#historia\/([a-z0-9-]+)\/(\d+)$/.exec(hash);
  if (m) {
    const recorrido = recorridoPorId.get(m[1]);
    const paso = Number(m[2]);
    if (!recorrido || paso < 1 || paso > recorrido.eventos.length) return { tipo: 'desconocida' };
    return { tipo: 'historia', recorrido, paso, ev: recorrido.eventos[paso - 1] };
  }
  m = /^#personaje\/([a-z0-9-]+)$/.exec(hash);
  if (m) return personajes.has(m[1]) ? { tipo: 'personaje', persona: personajes.get(m[1]) } : { tipo: 'desconocida' };
  return null;
}
const esRuta = (hash) => /^#(?:evento|grupo|historia|personaje|mapa|lugar)\/|^#(?:historias|inicio|linea|mapa)$/.test(hash);

// Desde una sección se agrega una entrada al historial; entre vistas se reemplaza, así «Volver» (y el botón
// Atrás del navegador) regresa a la sección. La ficha de un personaje sí se agrega: «Volver» desde ella
// regresa al evento donde se eligió el nombre. Elegir lo que ya está a la vista solo lo enfoca.
function ir(url, { desdeBoton = false } = {}) {
  const misma = location.hash === url || (baseDeRuta(url) === 'inicio' && baseDeRuta(location.hash) === 'inicio');
  if (!misma) {
    if (detalle.abierto && !url.startsWith('#personaje/')) history.replaceState(history.state, '', url);
    else history.pushState({ app: true }, '', url);
  }
  aplicarRuta({ desdeBoton });
}

function aplicarRuta({ desdeBoton = false, inicial = false } = {}) {
  const vista = vistaDeRuta();
  const destino = baseDeRuta(location.hash);
  if (vista && vista.tipo !== 'desconocida') mostrarVista(vista, desdeBoton);
  else if (detalle.abierto) cerrarDetalle(destino ?? base);
  else if (destino) cambiarBase(destino, { enfocar: !inicial });
  // Un enlace roto (un evento que no existe, una historia sin ese paso): se dice a la vista y la dirección
  // vuelve a la sección que se está mostrando.
  if (vista?.tipo === 'desconocida') {
    history.replaceState(null, '', BASES[base].hash);
    avisar(`No encontramos esa página: puede que el enlace esté incompleto o sea antiguo. Estás en ${NOMBRE_BASE[base]}.`);
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

// Sin historial propio (se llegó por un enlace directo), «Volver» lleva a la sección que está debajo.
function volver() {
  if (history.state?.app) {
    history.back();
  } else {
    history.replaceState(null, '', BASES[base].hash);
    aplicarRuta();
  }
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
    // Después del último paso, «Siguiente» lleva a elegir otra historia.
    nav = { antes: antes && `#historia/${r.id}/${paso - 1}`, despues: despues ? `#historia/${r.id}/${paso + 1}` : '#historias' };
    titulo = `${ev.titulo} · ${r.titulo}`;
    anunciar(`${r.titulo}, paso ${paso} de ${r.eventos.length}${desdeBoton ? `: ${ev.fechaTexto}, ${ev.titulo}` : ''}`);
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
  } else {
    const { persona } = vista;
    detalle.mostrarPersonaje(persona, { nivel, regla: linea.regla(persona.eventos), enfocar });
    nav = { antes: null, despues: null };
    titulo = persona.nombre;
  }
  vistaActual = vista;
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
  const previa = vistaActual;
  const aplicar = () => pintarVista(vista, desdeBoton);
  if (detalle.abierto) {
    const [a, b] = [posicion(previa), posicion(vista)];
    const tipo = a === null || b === null || a === b ? '' : b > a ? 'siguiente' : 'anterior';
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
  const tapado = detalle.abierto || filtros.abierto;
  seccionLinea.inert = tapado || base !== 'linea';
  seccionInicio.inert = tapado || base !== 'inicio';
  seccionMapa.inert = tapado || base !== 'mapa';
  elDetalle.inert = filtros.abierto;
  controles.hidden = filtros.abierto;
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
    if (filtros.abierto) filtros.cerrar();
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

// Sin conexión: el Service Worker (plantilla en src/sw.js) solo existe en el sitio construido.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
