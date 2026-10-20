// Panel de detalle, sobre la sección a la vista. Un evento se presenta como una página de revista: portada
// sobre el océano (título, fecha y la imagen completa, con su crédito y licencia), el texto según el nivel de
// lectura con el «¿Sabías que?» como cita, y una ficha lateral (mini-mapa, lugar, período, temas y personajes);
// al final, «¿Qué pasó antes / después?», el período y las fuentes. También muestra un paso de una historia
// guiada, un grupo de eventos, la lista de historias o la ficha de un personaje, con la misma portada.
import latitudes from './chile-latitudes.json';
import { edadEn, formatearAnio, haceCuanto, parseFecha } from './fechas.js';
import { paraRepaso } from './sensibles.js';
import {
  borrarPreferencia,
  creditoImagen,
  esc,
  externo,
  guardarPreferencia,
  icono,
  leerNacimiento,
  leerPreferencia,
  minutosDeLectura,
  movimientoReducido,
  nombreFuente,
  urlImagen,
} from './util.js';

// «Detallado» suma el detalle al resumen general: el detalle lo continúa, no lo repite.
const PARRAFOS = {
  nino: (ev) => [ev.resumenNino],
  general: (ev) => [ev.resumen],
  detallado: (ev) => [ev.resumen, ...ev.detalle.split(/\n\s*\n/)],
};
const ANIO_ACTUAL = new Date().getFullYear();
const Y = new Intl.ListFormat('es', { type: 'conjunction' }); // «A, B y C»

function listaFuentes(urls) {
  const nombres = urls.map(nombreFuente);
  const vistos = new Map();
  return nombres
    .map((nombre, i) => {
      const n = (vistos.get(nombre) ?? 0) + 1;
      vistos.set(nombre, n);
      const repetido = nombres.filter((x) => x === nombre).length > 1;
      return `<li>${externo(urls[i], `${esc(nombre)}${repetido ? ` (${n})` : ''}`)}</li>`;
    })
    .join('');
}

const miniatura = (ev, tamano) =>
  `<img src="${urlImagen(ev.imagen.archivo, 120)}" srcset="${[120, 250, 330, 500].map((a) => `${urlImagen(ev.imagen.archivo, a)} ${a}w`).join(', ')}"
    sizes="${tamano}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}">`;
const mosaico = (eventos) =>
  `<span class="ficha-img mosaico">${eventos
    .slice(0, 4)
    .map((ev) => `<img src="${urlImagen(ev.imagen.archivo, 120)}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}">`)
    .join('')}</span>`;

// Enlace a otro evento (o a otro paso de una historia), con miniatura. Sin evento: un aviso (`vacio`, en HTML).
function vecino(ev, lado, colorDe, { href = `#evento/${ev?.id}`, rotulo, vacio } = {}) {
  if (!ev) return `<p class="vecino vacio">${vacio ?? (lado === 'antes' ? 'Este es el primer evento.' : 'Este es el último evento.')}</p>`;
  const texto = rotulo ?? (lado === 'antes' ? '¿Qué pasó antes?' : '¿Qué pasó después?');
  // Un grupo (por ejemplo, los pueblos de c. 1500) se muestra con la imagen de su primer evento.
  if (ev.esGrupo) href = `#grupo/${ev.id}`;
  return `<a class="vecino ${lado}" href="${href}" style="--color:${colorDe(ev)}">
      <span class="vecino-img">${miniatura(ev.eventos?.[0] ?? ev, '(max-width: 40em) 90vw, 20rem')}</span>
      <span class="vecino-texto">
        <span class="vecino-rotulo">${lado === 'antes' ? `${icono('anterior')} ${texto}` : `${texto} ${icono('siguiente')}`}</span>
        <span class="vecino-fecha">${esc(ev.fechaTexto)}</span>
        <span class="vecino-titulo">${esc(ev.titulo)}</span>
      </span>
    </a>`;
}

// Ficha de un evento en una lista (grupo o personaje): miniatura, un dato (lugar o fecha), título y resumen.
const ficha = (ev, color, nivel, dato) => `
  <li><a class="ficha" href="#evento/${ev.id}" style="--color:${color}">
    <span class="ficha-img">${miniatura(ev, '6rem')}</span>
    <span class="ficha-texto"><span class="ficha-meta">${esc(dato)}</span><span class="ficha-titulo">${esc(ev.titulo)}</span>
      <span class="ficha-resumen">${esc(nivel === 'nino' ? ev.resumenNino : ev.resumen)}</span></span>
  </a></li>`;

/**
 * Dirección de un paso de una historia: 0 es su presentación y 'fin', su cierre. Una secuencia armada por un
 * docente (#secuencia/…) trae su propia forma de nombrar los pasos (`ruta`).
 */
export const rutaHistoria = (r, n) => r.ruta?.(n) ?? `#historia/${r.id}${n === 0 ? '' : `/${n}`}`;

// Barra de una historia guiada: nombre (lleva a su presentación), «Paso N de M», cuánto pasó desde el paso
// anterior y dónde ocurre este, y una fila de marcas (la actual, resaltada).
const barraHistoria = ({ recorrido, paso }, conector = '') => `
  <nav class="historia-barra" aria-label="Historia guiada">
    <p class="historia-nombre"><a href="${recorrido.origen?.href ?? '#historias'}">${esc(recorrido.origen?.texto ?? 'Historias guiadas')}</a> <span aria-hidden="true">›</span> <a href="${rutaHistoria(recorrido, 0)}">${esc(recorrido.titulo)}</a></p>
    <p class="historia-paso">Paso ${paso} de ${recorrido.eventos.length}</p>
    ${conector ? `<p class="historia-conector">${conector}</p>` : ''}
    <ol class="historia-pasos" aria-hidden="true">${recorrido.eventos
      .map((_, i) => `<li${i + 1 === paso ? ' class="actual"' : i + 1 < paso ? ' class="antes"' : ''}></li>`)
      .join('')}</ol>
  </nav>`;

// Cuánto pasó entre dos pasos seguidos, si ninguna de las dos fechas es aproximada. «Mientras tanto» si el nuevo
// empieza antes de que termine el anterior (comparando con la menos precisa de las dos fechas); si no, desde el
// final del anterior y solo entre fechas de igual precisión: «Ese mismo día», «Al día siguiente», «17 meses
// después», «Al año siguiente», «57 años después».
function tiempoEntre(a, b) {
  if (a.fechaAproximada || b.fechaAproximada) return '';
  const [x, y] = [parseFecha(a.fechaFin ?? a.fecha), parseFecha(b.fecha)];
  if (!x || !y) return '';
  const precision = (f) => (f.dia ? 3 : f.mes ? 2 : 1);
  const p = Math.min(precision(x), precision(y));
  const clave = (f) => f.anio * 10000 + (p > 1 ? f.mes * 100 : 0) + (p > 2 ? f.dia : 0);
  if (a.fechaFin && clave(y) < clave(x)) return 'Mientras tanto';
  if (precision(x) !== precision(y)) return '';
  if (p === 1) {
    const n = y.anio - x.anio;
    return n === 0 ? 'Ese mismo año' : n === 1 ? 'Al año siguiente' : `${n} años después`;
  }
  // Meses cumplidos (con día, el último cuenta si ya llegó su día del mes); desde los 24, en años.
  const meses = (y.anio - x.anio) * 12 + (y.mes - x.mes) - (p === 3 && y.dia < x.dia ? 1 : 0);
  if (meses >= 24) return `${Math.floor(meses / 12)} años después`;
  if (meses >= 1) return meses === 1 ? 'Un mes después' : `${meses} meses después`;
  if (p === 2) return 'Ese mismo mes';
  const dias = Math.round((Date.UTC(y.anio, y.mes - 1, y.dia) - Date.UTC(x.anio, x.mes - 1, x.dia)) / 864e5);
  return dias === 0 ? 'Ese mismo día' : dias === 1 ? 'Al día siguiente' : `${dias} días después`;
}

// Países con artículo, para «en el Perú» (los demás van sin él: «en España», «en Suecia»).
const PAISES = { Perú: 'el Perú', 'Reino Unido': 'el Reino Unido', 'Ciudad del Vaticano': 'la Ciudad del Vaticano', 'Varios países': 'varios países' };

const NIVEL_NOMBRE = { nino: 'Para niños', general: 'General', detallado: 'Detallado' };
// Año de inicio de un evento, con «c.» si es aproximado: «c. 1470», «1984».
const anioDe = (ev) => `${ev.fechaAproximada ? 'c. ' : ''}${formatearAnio(ev.anio)}`;

// Dirección para compartir y citar un evento: su página propia (e/<id>.html, la genera vite.config.js), que
// lleva su título y su resumen a la vista previa de WhatsApp, Classroom o un correo, y abre el evento.
export const urlCompartir = (ev) => new URL(`e/${ev.id}.html`, location.href.split('#')[0]).href;
const hoyTexto = () => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
// «¿Encontraste un error?»: abre un aviso en el repositorio (no pide ni muestra ningún correo).
const urlReporte = (ev) =>
  `https://github.com/Moises-Salgado/historia-de-chile-interactiva/issues/new?title=${encodeURIComponent(`Error en «${ev.titulo}»`)}&body=${encodeURIComponent(
    `Evento: ${ev.id}\n\nQué está mal:\n\nCuál es la fuente que lo corrige:\n`,
  )}`;

// Portada de cada vista, sobre el océano con curvas de nivel: ceja, título y, si hay, la imagen completa con
// su pie y crédito.
const portada = ({ ceja, titulo, debajo = '', figura = '', arriba = '' }) => `
  <header class="detalle-portada oceano${figura ? '' : ' sin-figura'}">
    <div class="detalle-portada-contenido">
      ${arriba}
      <div class="detalle-titular">
        <p class="ceja">${ceja}</p>
        <h2 id="detalle-titulo" tabindex="-1">${titulo}</h2>
        ${debajo}
      </div>
      ${figura}
    </div>
  </header>`;

/** Imagen del detalle: 500 px en pantallas angostas y 800 (que Commons sirve en 960) en las anchas. */
export const imagenDetalle = (archivo) => ({
  src: urlImagen(archivo, 800),
  srcset: `${urlImagen(archivo, 500)} 500w, ${urlImagen(archivo, 800)} 960w`,
  sizes: '(max-width: 60em) calc(100vw - 2rem), min(36rem, 46vw)',
});

// Mini-mapa: la silueta de Chile (index.html) con los lugares del evento, las franjas de sus zonas o todo el
// país si es de alcance nacional. Usa la proyección del mapa (scripts/generar-mapa.mjs).
const COS = Math.cos((36.75 * Math.PI) / 180);
const proyectar = (lat, lon) => [(lon + 80.5) * COS * 26, (-17.4 - lat) * 26];
const RAPA = [34, 300]; // recuadro de Rapa Nui en el mapa

function miniMapa(ev, lugarDe, zonaDe) {
  const puntos = [];
  const franjas = [];
  for (const u of ev.ubicaciones) {
    const l = lugarDe.get(u);
    if (l) puntos.push(l.id === 'rapa-nui' ? RAPA : proyectar(l.lat, l.lon));
    for (const c of zonaDe.get(u)?.regiones ?? []) franjas.push(latitudes[c]);
  }
  const nacional = ev.ubicaciones.includes('chile');
  if (!puntos.length && !franjas.length && !nacional) return '';
  const rapa = ev.ubicaciones.includes('rapa-nui') ? `<rect class="minimapa-recuadro" x="${RAPA[0] - 30}" y="${RAPA[1] - 26}" width="60" height="52" rx="6"/>` : '';
  // El primer lugar va como un punto HTML sobre el mapa (no dentro del SVG): al pasar con Anterior y Siguiente
  // viaja de un lugar al otro (View Transition, main.js). Los demás van como círculos.
  const [primero, ...resto] = puntos;
  const viajero = primero
    ? `<span class="minimapa-viajero" style="left:${(((primero[0] + 40) / 382) * 100).toFixed(1)}%;top:${(((primero[1] + 10) / 1026) * 100).toFixed(1)}%"></span>`
    : '';
  return `<div class="minimapa-caja"><svg class="minimapa-chile${nacional ? ' nacional' : ''}" viewBox="-40 -10 382 1026" aria-hidden="true" focusable="false">
    ${franjas.length ? `<clipPath id="minimapa-zona">${franjas.map(([a, b]) => `<rect x="-40" y="${a}" width="382" height="${b - a}"/>`).join('')}</clipPath>` : ''}
    <use href="#silueta-chile" width="302" height="1006" class="minimapa-tierra"/>
    ${franjas.length ? '<use href="#silueta-chile" width="302" height="1006" class="minimapa-zona" clip-path="url(#minimapa-zona)"/>' : ''}
    ${rapa}${resto.map(([x, y]) => `<circle class="minimapa-punto" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="22"/>`).join('')}
  </svg>${viajero}</div>`;
}

/**
 * Crea el panel en `raiz` («Volver», «Anterior» y «Siguiente» están en la barra inferior).
 * personajeDe(nombre) devuelve { slug, eventos } si el personaje tiene ficha (aparece en más de un evento);
 * rutaEnMapa(evento), la dirección donde se ve en el mapa (o null); `mapa`, los lugares y zonas (mini-mapa);
 * visto(evento), si ya se abrió en este navegador (avance de las historias); alCambiarNacimiento(año o null),
 * al guardar u olvidar el año de nacimiento («Tu vida» en la línea de tiempo).
 */
export function crearDetalle(
  raiz,
  { periodos, temas, personajeDe, rutaEnMapa = () => null, mapa = { lugares: [], zonas: [] }, visto = () => false, alCambiarNacimiento = () => {} },
) {
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  const temaDe = new Map(temas.map((t) => [t.id, t.nombre]));
  const lugarDe = new Map(mapa.lugares.map((l) => [l.id, l]));
  const zonaDe = new Map(mapa.zonas.map((z) => [z.id, z]));
  const colorDe = (ev) => periodoDe.get(ev.periodoId).color;
  // Dónde ocurre un evento, como en una frase: «en Santiago», «en el estrecho de Magallanes» (el campo «en» de
  // lugares.json), «en todo el país», «en el Perú»; con dos ubicaciones, «en Santiago y en Talca» (o «en Chile y
  // en España»); con tres o más, «en varios lugares».
  const enUbicacion = (u, conChile) => {
    if (u === 'chile') return conChile ? 'en Chile' : 'en todo el país';
    if (u.startsWith('fuera:')) {
      const pais = u.slice('fuera:'.length);
      return `en ${PAISES[pais] ?? pais}`;
    }
    const x = lugarDe.get(u) ?? zonaDe.get(u);
    return x ? (x.en ?? `en ${x.nombre}`) : '';
  };
  const dondeOcurre = (ev) => {
    const us = ev.ubicaciones;
    if (us.length > 2) return 'en varios lugares';
    const conChile = us.includes('chile') && us.some((u) => u.startsWith('fuera:'));
    return us
      .map((u) => enUbicacion(u, conChile))
      .filter(Boolean)
      .join(' y ');
  };
  let actual = null;
  let nivel = 'general';
  let alCambiarNivel = null;

  function iniciar(objeto, nivelLectura) {
    actual = objeto;
    nivel = nivelLectura ?? nivel;
    alCambiarNivel = null;
    raiz.dataset.nivel = nivel;
  }

  function pintar(html, enfocar) {
    raiz.innerHTML = html;
    raiz.hidden = false;
    raiz.scrollTop = 0;
    if (enfocar) raiz.querySelector('h2').focus({ preventScroll: true });
  }

  const sobrePeriodo = (p) => `
    <section class="sobre-periodo" aria-labelledby="sobre-periodo-titulo">
      <h3 id="sobre-periodo-titulo">Sobre el período: ${esc(p.nombre)} <span class="sobre-periodo-fechas">(${esc(p.fechasTexto)})</span></h3>
      <p>${esc(p.descripcion)}</p>
    </section>`;

  // Los personajes que aparecen en otros eventos tienen ficha (botón); los demás van en una frase.
  function personajes(ev) {
    if (!ev.personajes.length) return '';
    const conFicha = ev.personajes.map((nombre) => ({ nombre, ficha: personajeDe(nombre) })).filter((x) => x.ficha);
    const otros = ev.personajes.filter((nombre) => !personajeDe(nombre));
    return `<section class="personajes" aria-labelledby="personajes-titulo">
      <h3 id="personajes-titulo">Personajes</h3>
      ${
        conFicha.length
          ? `<p class="ayuda">Toca un nombre para ver su ficha, con los otros eventos donde aparece.</p>
            <ul>${conFicha
              .map(({ nombre, ficha: f }) => `<li><a class="boton chico" href="#personaje/${f.slug}">${esc(nombre)}<span class="personaje-cuenta"> · ${f.eventos.length} eventos</span></a></li>`)
              .join('')}</ul>`
          : ''
      }
      ${otros.length ? `<p class="personajes-otros">${conFicha.length ? 'También aparecen' : 'Aparecen'}: ${esc(Y.format(otros))}.</p>` : ''}
    </section>`;
  }

  // «hace 147 años» y, si se guardó el año de nacimiento, la edad de quien lee.
  const tiempo = (ev) => {
    const hace = /años atrás/.test(ev.fechaTexto) ? null : haceCuanto(ev); // «c. 14.500 años atrás» ya lo dice
    const partes = [hace, edadEn(ev, leerNacimiento())].filter(Boolean);
    return partes.length ? `(${partes.join(' · ')})` : '';
  };

  const formularioEdad = () => {
    const n = leerNacimiento();
    return `<form class="edad-form">
        <label class="rotulo" for="anio-nacimiento">Año en que naciste</label>
        <div class="edad-fila">
          <input id="anio-nacimiento" class="campo" type="number" inputmode="numeric" min="1900" max="${ANIO_ACTUAL}" value="${n ?? ''}" required>
          <button type="submit" class="boton">Guardar</button>
          <button type="button" class="boton" data-accion="olvidar"${n ? '' : ' hidden'}>Olvidar</button>
        </div>
        <p class="ayuda">Se guarda solo en este navegador. Con él, cada evento desde 1900 muestra qué edad tenías.</p>
        <p class="edad-estado" role="status"></p>
      </form>`;
  };

  // Actualiza el encabezado y el formulario sin rehacerlo: el foco se queda donde estaba y el aviso
  // («Guardado…») se lee en la región de estado, que ya existía.
  function pintarEdad(mensaje) {
    const n = leerNacimiento();
    raiz.querySelector('.detalle-hace').textContent = tiempo(actual);
    raiz.querySelector('#anio-nacimiento').value = n ?? '';
    raiz.querySelector('[data-accion="olvidar"]').hidden = !n;
    raiz.querySelector('.edad-estado').textContent = mensaje;
    const abrir = raiz.querySelector('.edad-abrir');
    if (abrir) abrir.hidden = Boolean(n);
  }

  // «¿Qué edad tenías?» junto a la fecha abre el formulario (al final del detalle) y lleva el foco al campo.
  raiz.addEventListener('click', (e) => {
    if (!e.target.closest('.edad-abrir')) return;
    const plegable = raiz.querySelector('.edad');
    if (!plegable) return;
    // El campo se puede enfocar recién cuando el plegable terminó de abrirse.
    const enfocarCampo = () => raiz.querySelector('#anio-nacimiento').focus({ preventScroll: true });
    if (plegable.open) enfocarCampo();
    else plegable.addEventListener('toggle', enfocarCampo, { once: true });
    plegable.open = true;
    plegable.scrollIntoView({ block: 'center', behavior: movimientoReducido() ? 'auto' : 'smooth' });
  });

  raiz.addEventListener('submit', (e) => {
    const campo = e.target.querySelector('#anio-nacimiento');
    if (!campo) return;
    e.preventDefault();
    guardarPreferencia('nacimiento', campo.value);
    const edad = edadEn(actual, leerNacimiento());
    pintarEdad(`Guardado.${edad ? ` En este evento: ${edad}.` : ''}`);
    alCambiarNacimiento(leerNacimiento());
  });
  raiz.addEventListener('click', (e) => {
    if (!e.target.closest('[data-accion="olvidar"]')) return;
    borrarPreferencia('nacimiento');
    pintarEdad('Se olvidó tu año de nacimiento.');
    alCambiarNacimiento(null);
    raiz.querySelector('#anio-nacimiento').focus();
  });

  /** Un evento; con `historia` ({ recorrido, paso }), como paso de una historia guiada. */
  // `filtro` ({ n }): «Anterior» y «Siguiente» recorren solo los eventos de una búsqueda o de un filtro, y se dice.
  function mostrar(ev, { antes, despues, nivel: nivelLectura, regla = '', enfocar = true, historia = null, filtro = null }) {
    iniciar(ev, nivelLectura);
    const p = periodoDe.get(ev.periodoId);
    const img = ev.imagen;
    const cuerpo = () => PARRAFOS[nivel](ev).map((x) => `<p>${esc(x)}</p>`).join('');
    const r = historia?.recorrido;
    const vecinos = historia
      ? `<nav class="vecinos" aria-label="Pasos de la historia">${vecino(antes, 'antes', colorDe, {
          href: rutaHistoria(r, historia.paso - 1),
          rotulo: 'Paso anterior',
          vacio: `Este es el primer paso. <a class="boton chico vecino-salida" href="${rutaHistoria(r, 0)}">Ver la presentación</a>`,
        })}${vecino(despues, 'despues', colorDe, {
          href: rutaHistoria(r, historia.paso + 1),
          rotulo: 'Paso siguiente',
          vacio: `Este es el último paso de «${esc(r.titulo)}». <a class="boton chico vecino-salida" href="${rutaHistoria(r, 'fin')}">Terminar la historia</a>`,
        })}</nav>`
      : filtro
        ? `<nav class="vecinos" aria-label="Eventos anterior y siguiente de la búsqueda">${vecino(antes, 'antes', colorDe, {
            vacio: `Es el primero de ${filtro.n === 1 ? 'tu búsqueda' : `los ${filtro.n} eventos de tu búsqueda o filtro`}.`,
          })}${vecino(despues, 'despues', colorDe, {
            vacio: `Es el último de ${filtro.n === 1 ? 'tu búsqueda' : `los ${filtro.n} eventos de tu búsqueda o filtro`}.`,
          })}</nav>
          <p class="vecinos-filtro">«Anterior» y «Siguiente» recorren solo ${filtro.n === 1 ? 'el evento' : `los ${filtro.n} eventos`} de tu búsqueda o filtro. <button type="button" class="boton chico" data-accion="quitar-filtro">Ver todos los eventos</button></p>`
        : `<nav class="vecinos" aria-label="Eventos anterior y siguiente">${vecino(antes, 'antes', colorDe)}${vecino(despues, 'despues', colorDe)}</nav>`;
    // En una historia: cuánto pasó desde el paso anterior y dónde ocurre este (si es otro lugar que el anterior).
    const lugar = historia ? dondeOcurre(ev) : '';
    const partes = historia ? [antes && tiempoEntre(antes, ev), lugar !== (antes ? dondeOcurre(antes) : '') && lugar].filter(Boolean).join(' · ') : '';
    const conector = esc(partes.charAt(0).toUpperCase() + partes.slice(1));

    // Orden de lectura: título, fecha y lugar; luego la imagen (a la derecha en pantallas anchas), el texto,
    // la ficha (al lado del texto en pantallas anchas) y el resto.
    const grande = imagenDetalle(img.archivo);
    const url = grande.src;
    const ruta = rutaEnMapa(ev);
    const temasDe = ev.temas.filter((t) => temaDe.get(t) !== p.nombre).map((t) => `<span class="etiqueta">${esc(temaDe.get(t))}</span>`);
    // Bajada (en pantallas anchas): la versión breve del evento, salvo que ya sea el texto que se lee.
    const bajada = () => (nivel === 'nino' ? '' : esc(ev.resumenNino));
    raiz.style.setProperty('--color', p.color);
    pintar(
      `
      <div class="detalle-revista">
        ${portada({
          arriba: historia ? barraHistoria(historia, conector) : '',
          ceja: esc(p.nombre),
          titulo: esc(ev.titulo),
          debajo: `<p class="detalle-fecha"><time${ev.fecha.startsWith('-') ? '' : ` datetime="${ev.fecha}"`}>${esc(ev.fechaTexto)}</time> <span class="detalle-hace">${tiempo(ev)}</span>${
            ev.anio >= 1900 ? ` <button type="button" class="enlace edad-abrir"${leerNacimiento() ? ' hidden' : ''}>¿Qué edad tenías?</button>` : ''
          }</p>
            <p class="detalle-lugar">${esc(ev.lugar)}</p>
            <p class="detalle-bajada">${bajada()}</p>`,
          // El pie describe la imagen: el texto alternativo queda vacío para no leerlo dos veces.
          figura: `<figure class="detalle-figura">
            <div class="detalle-marco"><img src="${url}" srcset="${grande.srcset}" sizes="${grande.sizes}" alt=""
              fetchpriority="high" decoding="async" data-periodo="${ev.periodoId}"></div>
            <figcaption><span class="pie">${esc(img.pieDeFoto)}</span> <span class="credito">Imagen: ${creditoImagen(img)}</span></figcaption>
          </figure>`,
        })}
        <div class="detalle-columnas">
          <div class="detalle-texto">
            <p class="detalle-leyendo para-nino">Leyendo: <b>Para niños</b></p>
            <p class="detalle-escuchar" hidden><button type="button" class="boton chico" data-accion="escuchar">${icono('sonido')}<span>Escuchar</span></button></p>
            <div class="detalle-cuerpo" data-nivel="${nivel}">${cuerpo()}</div>
            ${
              ev.sabiasQue
                ? `<aside class="sabias-que" aria-labelledby="sabias-que-titulo"><h3 id="sabias-que-titulo">¿Sabías que…?</h3><p>${esc(ev.sabiasQue)}</p></aside>`
                : ''
            }
            ${
              // En «Para niños», una frase igual para todos: la del detalle, fuera de su párrafo, se entiende mal.
              ev.seDiscute
                ? `<aside class="se-discute" aria-labelledby="se-discute-titulo"><h3 id="se-discute-titulo"><span class="para-nino">No todos lo ven igual</span><span class="no-nino">Lo que se discute</span></h3>
                  <p class="para-nino">Quienes estudian la historia no están de acuerdo en todo sobre este hecho. En «General» puedes leer en qué.</p><p class="no-nino">${esc(ev.seDiscute)}</p></aside>`
                : ''
            }
            ${ev.glosario?.length ? '<details class="plegable glosario-evento"></details>' : ''}
          </div>
          <aside class="detalle-ficha" aria-labelledby="ficha-titulo">
            <h3 id="ficha-titulo" class="ceja">Ficha del evento</h3>
            <div class="ficha-lugar">
              ${miniMapa(ev, lugarDe, zonaDe)}
              <dl class="ficha-datos">
                <div><dt>Lugar</dt><dd>${esc(ev.lugar)}</dd></div>
                <div><dt>Período</dt><dd class="ficha-periodo">${esc(p.nombre)} <span class="ficha-fechas">${esc(p.fechasTexto)}</span></dd></div>
              </dl>
            </div>
            <div class="ficha-acciones">
              ${ruta ? `<a class="boton chico ver-en-mapa" href="${ruta}">${icono('alfiler')}<span>Ver en el mapa</span></a>` : ''}
              <button type="button" class="boton chico" data-accion="compartir" data-id="${ev.id}">${icono('compartir')}<span>Compartir</span></button>
            </div>
            ${regla}
            ${temasDe.length ? `<p class="etiquetas"><span class="solo-lector">Temas: </span>${temasDe.join('')}</p>` : ''}
            ${personajes(ev)}
          </aside>
          <div class="detalle-mas">
            ${ev.anio >= 1900 ? `<details class="plegable edad"><summary>¿Qué edad tenías?</summary>${formularioEdad()}</details>` : ''}
            ${vecinos}
            ${sobrePeriodo(p)}
            <details class="plegable">
              <summary><span class="para-nino">¿Cómo lo sabemos?</span><span class="no-nino">Fuentes</span> (${ev.fuentes.length})</summary>
              <ul class="fuentes">${listaFuentes(ev.fuentes)}</ul>
              <p class="reportar">${externo(urlReporte(ev), '¿Encontraste un error? Avísanos (en GitHub)')}</p>
            </details>
            <details class="plegable cita">
              <summary>Cómo citar</summary>
              <p class="cita-texto"><i>Historia de Chile Interactiva</i>. (s. f.). ${esc(ev.titulo)}. Consultado el ${hoyTexto()}, de ${esc(urlCompartir(ev))}</p>
              <p>Para un trabajo, cita también las fuentes originales (arriba).</p>
              <button type="button" class="boton chico" data-accion="copiar-cita">${icono('copiar')}<span>Copiar la cita</span></button>
            </details>
          </div>
        </div>
      </div>`,
      enfocar,
    );
    ajustarFicha();
    // «Palabras para entender»: las del glosario que están a la vista en el nivel elegido.
    const pintarPalabras = () => {
      const caja = raiz.querySelector('.glosario-evento');
      if (!caja) return;
      const lista = ev.glosario.filter((g) => !g.niveles || g.niveles.includes(nivel));
      caja.hidden = !lista.length;
      caja.innerHTML = `<summary>Palabras para entender (${lista.length})</summary>
        <dl class="glosario-lista">${lista
          .map(
            (g) =>
              `<div><dt>${esc(g.termino)}</dt><dd>${esc(g.definicion)}${g.fuente ? ` <span class="glosario-fuente">${externo(g.fuente, `Fuente: ${esc(nombreFuente(g.fuente))}`)}</span>` : ''}</dd></div>`,
          )
          .join('')}</dl>
        <p><a href="#glosario">Ver el glosario completo</a></p>`;
    };
    pintarPalabras();
    alCambiarNivel = () => {
      const contenedor = raiz.querySelector('.detalle-cuerpo');
      contenedor.dataset.nivel = nivel;
      contenedor.innerHTML = cuerpo();
      raiz.querySelector('.detalle-bajada').innerHTML = bajada();
      pintarPalabras();
    };
  }

  // La ficha acompaña al texto al desplazar solo si va en su propia columna, al lado del texto, y cabe entera
  // en la pantalla. En una sola columna (tablet en vertical) quedaría pegada arriba, tapando lo que se lee.
  function ajustarFicha() {
    const ficha = raiz.querySelector('.detalle-ficha');
    if (!ficha) return;
    ficha.classList.remove('fija');
    const columnas = getComputedStyle(ficha.parentElement).gridTemplateColumns.split(' ').length;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    ficha.classList.toggle('fija', columnas > 1 && ficha.offsetHeight + 2 * rem <= raiz.clientHeight);
  }
  addEventListener('resize', ajustarFicha);

  /** Un grupo de eventos de la misma fecha (por ejemplo, los pueblos que vivían aquí hacia 1500). */
  function mostrarGrupo(grupo, { antes, despues, nivel: nivelLectura, regla = '', enfocar = true }) {
    iniciar(grupo, nivelLectura);
    const p = periodoDe.get(grupo.periodoId);
    const lista = () => grupo.eventos.map((ev) => ficha(ev, colorDe(ev), nivel, ev.lugar)).join('');
    raiz.style.setProperty('--color', p.color);
    pintar(
      `
      <div class="detalle-revista">
        ${portada({
          ceja: `${esc(p.nombre)} · ${esc(grupo.fechaTexto)}`,
          titulo: esc(grupo.titulo),
          debajo: `<p class="vista-intro">${esc(grupo.descripcion)}</p>${regla}`,
        })}
        <div class="detalle-contenido vista-lista">
          <div class="detalle-texto">
            <ol class="fichas escalonar">${lista()}</ol>
            <nav class="vecinos" aria-label="Eventos anterior y siguiente">${vecino(antes, 'antes', colorDe)}${vecino(despues, 'despues', colorDe)}</nav>
            ${sobrePeriodo(p)}
          </div>
        </div>
      </div>`,
      enfocar,
    );
    alCambiarNivel = () => {
      raiz.querySelector('.fichas').innerHTML = lista();
    };
  }

  // Página de texto («Acerca de», «Para docentes»: src/paginas.js) con la misma portada, sin imagen.
  function mostrarPagina({ ceja, titulo, intro = '', html }, { enfocar = true } = {}) {
    iniciar({ pagina: true });
    raiz.style.removeProperty('--color');
    pintar(
      `
      <div class="detalle-revista">
      ${portada({ ceja, titulo, debajo: intro ? `<p class="vista-intro">${intro}</p>` : '' })}
      <div class="detalle-contenido vista-lista pagina">${html}</div>
      </div>`,
      enfocar,
    );
  }

  /** La lista de historias guiadas. */
  function mostrarHistorias(recorridos, { enfocar = true } = {}) {
    iniciar({ historias: true });
    raiz.style.removeProperty('--color');
    pintar(
      `
      <div class="detalle-revista">
      ${portada({
        ceja: 'Historias guiadas',
        titulo: 'Elige una historia',
        debajo: '<p class="vista-intro">Cada historia recorre, paso a paso y en orden, algunos eventos de la línea de tiempo sobre un mismo tema.</p>',
      })}
      <div class="detalle-contenido vista-lista">
        <div class="detalle-texto">
          <ul class="historias-lista escalonar">${recorridos
            .map((r) => {
              // La puerta lleva siempre a la presentación, que ofrece empezar o seguir. Cuántos de sus eventos ya se
              // abrieron (en cualquier parte) va como dato personal: no se proyecta en clase.
              const vistosAqui = r.eventos.filter(visto).length;
              const accion = `${vistosAqui ? `<span class="personal">${vistosAqui} de ${r.eventos.length} pasos vistos · </span>` : ''}Ver la historia`;
              return `
            <li><a class="puerta historia-puerta" href="${rutaHistoria(r, 0)}">
              <span class="mosaico puerta-mosaico" aria-hidden="true">${r.eventos
                .slice(0, 4)
                .map((ev) => `<img src="${urlImagen(ev.imagen.archivo, 250)}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}">`)
                .join('')}</span>
              <span class="puerta-texto">
                <span class="ceja">${r.eventos.length} pasos · ${formatearAnio(r.eventos[0].anio)}-${formatearAnio(r.eventos.at(-1).anio)}</span>
                <span class="puerta-titulo">${esc(r.titulo)}</span>
                <span class="puerta-bajada">${esc(r.descripcion)}</span>
                <span class="historia-avance">${accion} ${icono('siguiente')}</span>
              </span>
            </a></li>`;
            })
            .join('')}</ul>
        </div>
      </div>
      </div>`,
      enfocar,
    );
  }

  // Silueta con los pasos de una historia: un punto por lugar (los cercanos se juntan) con sus números. Cuenta la
  // primera ubicación de cada paso: si es una zona, todo Chile o fuera, no lleva punto (la lista lo nombra igual).
  function siluetaDePasos(eventos) {
    const puntos = [];
    eventos.forEach((ev, i) => {
      const l = lugarDe.get(ev.ubicaciones[0]);
      if (!l) return;
      const [x, y] = l.id === 'rapa-nui' ? RAPA : proyectar(l.lat, l.lon);
      const cerca = puntos.find((p) => Math.hypot(p.x - x, p.y - y) < 40);
      if (cerca) cerca.pasos.push(i + 1);
      else puntos.push({ x, y, pasos: [i + 1], rapa: l.id === 'rapa-nui' });
    });
    if (!puntos.length) return '';
    // «2-4, 7»: los números seguidos se juntan.
    const tramos = (pasos) => {
      const t = [];
      for (const n of pasos) {
        if (t.length && t.at(-1)[1] === n - 1) t.at(-1)[1] = n;
        else t.push([n, n]);
      }
      return t.map(([a, b]) => (a === b ? a : `${a}-${b}`)).join(', ');
    };
    return `<svg class="recorrido-mapa" viewBox="-40 -10 560 1026" aria-hidden="true" focusable="false">
      <use href="#silueta-chile" width="302" height="1006" class="recorrido-tierra"/>
      ${puntos.some((p) => p.rapa) ? `<rect class="minimapa-recuadro" x="${RAPA[0] - 30}" y="${RAPA[1] - 26}" width="60" height="52" rx="6"/>` : ''}
      ${puntos
        .map(
          (p) =>
            `<circle class="recorrido-punto" cx="${p.x.toFixed(0)}" cy="${p.y.toFixed(0)}" r="14"/><text class="recorrido-numero" x="${(p.x + 28).toFixed(0)}" y="${(p.y + 16).toFixed(0)}">${tramos(p.pasos)}</text>`,
        )
        .join('')}
    </svg>`;
  }

  /** Presentación de una historia (paso 0): de qué trata, cuánto toma según el nivel y sus pasos. */
  function mostrarInicioHistoria(r, { nivel: nivelLectura, enfocar = true }) {
    iniciar({ recorrido: r, inicio: true }, nivelLectura);
    const vistosAqui = r.eventos.filter(visto).length;
    const siguiente = r.eventos.findIndex((ev) => !visto(ev)) + 1;
    const duracion = () => `unos ${minutosDeLectura(r.eventos, nivel)} min en «${NIVEL_NOMBRE[nivel]}»`;
    const ir = (n, texto, clase = 'boton') => `<a class="${clase}" href="${rutaHistoria(r, n)}"><span>${texto}</span>${icono('siguiente')}</a>`;
    // Seguir donde se quedó es personal: al proyectar en clase, solo «Empezar» (también si lo primero que falta
    // es el paso 1).
    const acciones = !vistosAqui || siguiente === 1
      ? ir(1, 'Empezar', 'boton primario')
      : `<span class="personal">${
          vistosAqui < r.eventos.length
            ? `${ir(siguiente, `Seguir en el paso ${siguiente}`, 'boton primario')} ${ir(1, 'Empezar desde el principio')}`
            : ir(1, 'Recorrerla de nuevo', 'boton primario')
        }</span>${ir(1, 'Empezar', 'boton primario solo-clase')}`;
    const guardada = leerPreferencia('guardada') === r.id;
    raiz.style.removeProperty('--color');
    pintar(
      `
      <div class="detalle-revista">
      ${portada({
        ceja: `Historia guiada · ${r.eventos.length} pasos · ${anioDe(r.eventos[0])} a ${anioDe(r.eventos.at(-1))}`,
        titulo: esc(r.titulo),
        debajo: `<p class="vista-intro">${esc(r.descripcion)}</p>
          <p class="recorrido-duracion">Leída en voz alta: <span class="recorrido-minutos">${duracion()}</span></p>`,
      })}
      <div class="detalle-contenido vista-lista">
        <p class="recorrido-acciones">${acciones}</p>
        <div class="recorrido">
          <ol class="recorrido-pasos escalonar">${r.eventos
            .map(
              (ev, i) => `<li><a href="${rutaHistoria(r, i + 1)}" style="--color:${colorDe(ev)}">
                <span class="recorrido-num" aria-hidden="true">${i + 1}</span>
                <span class="recorrido-texto"><span class="recorrido-fecha">${esc(ev.fechaTexto)}</span> <span class="recorrido-titulo">${esc(ev.titulo)}</span></span>
                ${visto(ev) ? `<span class="personal">${icono('visto')}<span class="solo-lector"> (ya lo viste)</span></span>` : ''}
              </a></li>`,
            )
            .join('')}</ol>
          ${siluetaDePasos(r.eventos)}
        </div>
        ${
          r.ruta
            ? ''
            : `<p class="recorrido-guardar"><button type="button" class="boton chico" data-accion="guardar-historia" data-historia="${r.id}">${icono('guardar')}<span>Guardar para usar sin conexión</span></button>
          <span class="recorrido-guardada" role="status">${guardada ? 'Guardada en este navegador para usarla sin conexión.' : ''}</span></p>`
        }
      </div>
      </div>`,
      enfocar,
    );
    alCambiarNivel = () => {
      raiz.querySelector('.recorrido-minutos').textContent = duracion();
    };
  }

  /**
   * Cierre de una historia: la tira de sus pasos, el repaso (si tiene eventos que no son de temas sensibles) y
   * otras historias para seguir (primero las empezadas, después las nuevas).
   */
  function mostrarFinHistoria(r, { enfocar = true, otras = [] }) {
    iniciar({ recorrido: r, fin: true });
    const avance = (x) => {
      const n = x.eventos.filter(visto).length;
      return n === x.eventos.length ? 2 : n ? 0 : 1;
    };
    const siguientes = [...otras].sort((a, b) => avance(a) - avance(b)).slice(0, 3);
    const preguntables = r.eventos.filter(paraRepaso);
    raiz.style.removeProperty('--color');
    pintar(
      `
      <div class="detalle-revista">
      ${portada({
        ceja: `<a href="${r.origen?.href ?? '#historias'}">${esc(r.origen?.texto ?? 'Historias guiadas')}</a> · Fin`,
        titulo: esc(r.titulo),
        debajo: `<p class="vista-intro">Estos fueron sus ${r.eventos.length} pasos, de ${anioDe(r.eventos[0])} a ${anioDe(r.eventos.at(-1))}.</p>`,
      })}
      <div class="detalle-contenido vista-lista">
        <ol class="recorrido-tira escalonar">${r.eventos
          .map(
            (ev, i) => `<li><a href="${rutaHistoria(r, i + 1)}" style="--color:${colorDe(ev)}">
              <span class="tira-img">${miniatura(ev, '10rem')}</span>
              <span class="tira-texto"><span class="tira-paso">Paso ${i + 1} · ${esc(formatearAnio(ev.anio))}</span><span class="tira-titulo">${esc(ev.titulo)}</span></span>
            </a></li>`,
          )
          .join('')}</ol>
        ${
          preguntables.length >= 3
            ? `<section class="repaso" aria-labelledby="repaso-titulo">
              <h3 id="repaso-titulo">Repaso sin nota</h3>
              <p>Unas preguntas para recordar lo que viste, con botones. No hay puntaje: al responder, aparece la respuesta.</p>
              <p class="repaso-empezar"><button type="button" class="boton" data-accion="repaso">${icono('ruta')}<span>Empezar el repaso</span></button></p>
              <div class="repaso-preguntas" role="group" aria-label="Preguntas del repaso" tabindex="-1"></div>
            </section>`
            : ''
        }
        ${
          siguientes.length
            ? `<section class="sigue" aria-labelledby="sigue-titulo">
              <h3 id="sigue-titulo">Sigue con…</h3>
              <ul class="sigue-lista">${siguientes
                .map((x) => {
                  const n = x.eventos.filter(visto).length;
                  return `<li><a class="ficha" href="${rutaHistoria(x, 0)}" style="--color:var(--cobre-vivo)">
                    ${mosaico(x.eventos)}
                    <span class="ficha-texto"><span class="ficha-meta">${x.eventos.length} pasos${n ? ` · ${n} vistos` : ''}</span><span class="ficha-titulo">${esc(x.titulo)}</span>
                      <span class="ficha-resumen">${esc(x.descripcion)}</span></span>
                  </a></li>`;
                })
                .join('')}</ul>
            </section>`
            : ''
        }
        <p class="recorrido-acciones"><a class="boton" href="${rutaHistoria(r, 0)}">${icono('ruta')}<span>Ver la presentación</span></a>
          <a class="boton" href="${r.salida?.href ?? '#historias'}">${icono('volver')}<span>${esc(r.salida?.texto ?? 'Elegir otra historia')}</span></a></p>
      </div>
      </div>`,
      enfocar,
    );
  }

  /** Ficha de un personaje: los eventos donde aparece (sin retrato ni biografía). */
  function mostrarPersonaje(persona, { nivel: nivelLectura, regla = '', enfocar = true }) {
    iniciar(persona, nivelLectura);
    const primero = persona.eventos[0].anio;
    const ultimo = persona.eventos.at(-1).anio;
    const rango = primero === ultimo ? `en ${formatearAnio(primero)}` : `entre ${formatearAnio(primero)} y ${formatearAnio(ultimo)}`;
    const lista = () => persona.eventos.map((ev) => ficha(ev, colorDe(ev), nivel, ev.fechaTexto)).join('');
    raiz.style.removeProperty('--color');
    pintar(
      `
      <div class="detalle-revista">
        ${portada({
          ceja: 'Personaje',
          titulo: esc(persona.nombre),
          debajo: `<p class="vista-intro">Aparece en ${persona.eventos.length} eventos de esta línea de tiempo, ${rango}.</p>${regla}`,
        })}
        <div class="detalle-contenido vista-lista">
          <div class="detalle-texto">
            <ol class="fichas escalonar">${lista()}</ol>
            <p class="ayuda">Esta ficha reúne los eventos donde se nombra a ${esc(persona.nombre)}; no es una biografía.</p>
          </div>
        </div>
      </div>`,
      enfocar,
    );
    alCambiarNivel = () => {
      raiz.querySelector('.fichas').innerHTML = lista();
    };
  }

  function ponerNivel(nuevo) {
    nivel = nuevo;
    raiz.dataset.nivel = nivel;
    if (actual) alCambiarNivel?.();
  }

  function ocultar() {
    raiz.hidden = true;
    raiz.replaceChildren();
    actual = null;
    alCambiarNivel = null;
  }

  return {
    mostrar,
    mostrarFinHistoria,
    mostrarGrupo,
    mostrarHistorias,
    mostrarInicioHistoria,
    mostrarPagina,
    mostrarPersonaje,
    ocultar,
    ponerNivel,
    get abierto() {
      return !raiz.hidden;
    },
    get actual() {
      return actual;
    },
  };
}
