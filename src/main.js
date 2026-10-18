// Arranque de la app: preferencias, línea de tiempo, detalle, filtros y router por hash (#evento/<id>).
import './styles.css';
import { cargarDatos } from './datos.js';
import { crearDetalle } from './detalle.js';
import { crearFiltros } from './filtros.js';
import { crearLineaDeTiempo } from './timeline.js';
import { guardarPreferencia, leerPreferencia, urlPlaceholder } from './util.js';

const { periodos, temas, eventos } = cargarDatos();
const porId = new Map(eventos.map((ev) => [ev.id, ev]));
const $ = (selector) => document.querySelector(selector);
const TITULO = document.title;

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

// Tamaño de texto y nivel de lectura, recordados en este navegador.
const botonTexto = $('#btn-texto');
function ponerTextoGrande(grande) {
  if (grande) document.documentElement.dataset.texto = 'grande';
  else delete document.documentElement.dataset.texto;
  botonTexto.setAttribute('aria-pressed', String(grande));
}
ponerTextoGrande(leerPreferencia('texto') === 'grande');

const NIVELES = ['nino', 'general', 'detallado'];
let nivel = NIVELES.includes(leerPreferencia('nivel')) ? leerPreferencia('nivel') : 'general';
for (const radio of document.querySelectorAll('input[name="nivel"]')) radio.checked = radio.value === nivel;

const seccionLinea = $('#linea');
const elDetalle = $('#detalle');
const linea = crearLineaDeTiempo(seccionLinea, $('#minimapa'), {
  eventos,
  periodos,
  anunciar,
  alAbrir: (ev) => abrirEvento(ev.id),
  alCambiar: actualizarControles,
});
const detalle = crearDetalle(elDetalle, {
  periodos,
  temas,
  alVolver: volver,
  alBuscar: (nombre) => filtros.buscar(nombre),
});
const filtros = crearFiltros($('#panel-filtros'), {
  periodos,
  temas,
  eventos,
  boton: $('#btn-buscar'),
  alCambiar: aplicarFiltros,
  alElegir: (ev) => abrirEvento(ev.id),
  alAbrirOCerrar: actualizarInert,
});

botonTexto.addEventListener('click', () => {
  const grande = botonTexto.getAttribute('aria-pressed') !== 'true';
  ponerTextoGrande(grande);
  guardarPreferencia('texto', grande ? 'grande' : 'normal');
  linea.redistribuir();
});
$('.nivel').addEventListener('change', (e) => {
  nivel = e.target.value;
  guardarPreferencia('nivel', nivel);
  detalle.ponerNivel(nivel);
});

// ---- Router: #evento/<id> abre el detalle; cualquier otra dirección muestra la línea de tiempo ----
const idEnRuta = () => /^#evento\/([a-z0-9-]+)$/.exec(location.hash)?.[1] ?? null;

// Desde la línea de tiempo se agrega una entrada al historial; entre detalles se reemplaza, así
// «Volver» (y el botón Atrás del navegador) regresa siempre a la línea de tiempo.
function abrirEvento(id, { desdeBoton = false } = {}) {
  const url = `#evento/${id}`;
  if (location.hash !== url) {
    if (detalle.abierto) history.replaceState(history.state, '', url);
    else history.pushState({ app: true }, '', url);
  }
  aplicarRuta({ desdeBoton });
}

function aplicarRuta({ desdeBoton = false } = {}) {
  const id = idEnRuta();
  const ev = porId.get(id);
  if (ev) mostrarDetalle(ev, desdeBoton);
  else if (detalle.abierto) cerrarDetalle();
  if (id && !ev) anunciar('No encontramos ese evento.');
}
window.addEventListener('hashchange', () => aplicarRuta());

function volver() {
  if (history.state?.app) {
    history.back();
  } else {
    history.replaceState(null, '', location.pathname + location.search);
    aplicarRuta();
  }
}

// Antes y después según el filtro activo (si el evento lo cumple) o entre todos los eventos.
function mostrarDetalle(ev, desdeBoton) {
  const lista = linea.visibles.includes(ev) ? linea.visibles : eventos;
  const i = lista.indexOf(ev);
  filtros.cerrar({ devolverFoco: false });
  detalle.mostrar(ev, { antes: lista[i - 1] ?? null, despues: lista[i + 1] ?? null, nivel, enfocar: !desdeBoton });
  document.body.dataset.vista = 'detalle';
  document.title = `${ev.titulo} · ${TITULO}`;
  actualizarInert();
  linea.seleccionar(ev, { suave: false });
  if (desdeBoton) anunciar(`${ev.fechaTexto}: ${ev.titulo}`);
}

function cerrarDetalle() {
  detalle.ocultar();
  document.body.dataset.vista = 'linea';
  document.title = TITULO;
  actualizarInert();
  actualizarControles();
  linea.enfocarActual();
}

function actualizarInert() {
  seccionLinea.inert = detalle.abierto || filtros.abierto;
  elDetalle.inert = filtros.abierto;
}

// Enlaces internos (#evento/…) del detalle: navegan sin recargar y sin llenar el historial.
document.addEventListener('click', (e) => {
  const enlace = e.target.closest('a[href^="#evento/"]');
  if (!enlace || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  abrirEvento(enlace.getAttribute('href').slice('#evento/'.length));
});

// ---- Barra inferior: Anterior / Inicio (o Volver) / Siguiente ----
const botonAnterior = $('#btn-anterior');
const botonSiguiente = $('#btn-siguiente');
const botonInicio = $('#btn-inicio');

function actualizarControles() {
  const enDetalle = detalle.abierto;
  botonAnterior.setAttribute('aria-disabled', String(enDetalle ? !detalle.antes : !linea.puedeMover(-1)));
  botonSiguiente.setAttribute('aria-disabled', String(enDetalle ? !detalle.despues : !linea.puedeMover(1)));
  botonInicio.textContent = enDetalle ? 'Volver' : 'Inicio';
}

function mover(dir) {
  if (!detalle.abierto) return linea.mover(dir);
  const ev = dir > 0 ? detalle.despues : detalle.antes;
  if (ev) abrirEvento(ev.id, { desdeBoton: true });
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

// ---- Teclado: flechas (anterior / siguiente), + y − (zoom), Escape (cerrar) ----
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') {
    if (filtros.abierto) filtros.cerrar();
    else if (detalle.abierto) volver();
    return;
  }
  if (filtros.abierto || e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    mover(e.key === 'ArrowRight' ? 1 : -1);
  } else if (!detalle.abierto && (e.key === '+' || e.key === '=')) {
    linea.zoom(1);
  } else if (!detalle.abierto && (e.key === '-' || e.key === '_')) {
    linea.zoom(-1);
  }
});

history.scrollRestoration = 'manual';
document.body.dataset.vista = 'linea';
aplicarRuta();
actualizarControles();

// Sin conexión: el Service Worker (plantilla en src/sw.js) solo existe en el sitio construido.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
