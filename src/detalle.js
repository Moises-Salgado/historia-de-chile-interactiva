// Panel de detalle, sobre la sección a la vista. Un evento se presenta como una página de revista: portada
// sobre el océano (título, fecha y la imagen completa, con su crédito y licencia), el texto según el nivel de
// lectura con el «¿Sabías que?» como cita, y una ficha lateral (mini-mapa, lugar, período, temas y personajes);
// al final, «¿Qué pasó antes / después?», el período y las fuentes. También muestra un paso de una historia
// guiada, un grupo de eventos, la lista de historias o la ficha de un personaje, con la misma portada.
import latitudes from './chile-latitudes.json';
import { edadEn, formatearAnio, haceCuanto } from './fechas.js';
import { borrarPreferencia, creditoImagen, esc, externo, guardarPreferencia, icono, leerPreferencia, movimientoReducido, nombreFuente, urlImagen } from './util.js';

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
  `<img src="${urlImagen(ev.imagen.archivo, 120)}" srcset="${urlImagen(ev.imagen.archivo, 120)} 120w, ${urlImagen(ev.imagen.archivo, 250)} 250w"
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
      <span class="vecino-img">${miniatura(ev.eventos?.[0] ?? ev, '4.5rem')}</span>
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

// Barra de una historia guiada: nombre, «Paso N de M» y una fila de marcas (la actual, resaltada).
const barraHistoria = ({ recorrido, paso }) => `
  <nav class="historia-barra" aria-label="Historia guiada">
    <p class="historia-nombre"><a href="#historias">Historias guiadas</a> <span aria-hidden="true">›</span> ${esc(recorrido.titulo)}</p>
    <p class="historia-paso">Paso ${paso} de ${recorrido.eventos.length}</p>
    <ol class="historia-pasos" aria-hidden="true">${recorrido.eventos
      .map((_, i) => `<li${i + 1 === paso ? ' class="actual"' : i + 1 < paso ? ' class="antes"' : ''}></li>`)
      .join('')}</ol>
  </nav>`;

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

// Año de nacimiento de quien lee (opcional, solo en este navegador) para mostrar su edad desde 1900.
const leerNacimiento = () => {
  const n = Number(leerPreferencia('nacimiento'));
  return Number.isInteger(n) && n >= 1900 && n <= ANIO_ACTUAL ? n : null;
};

/**
 * Crea el panel en `raiz` («Volver», «Anterior» y «Siguiente» están en la barra inferior).
 * personajeDe(nombre) devuelve { slug, eventos } si el personaje tiene ficha (aparece en más de un evento);
 * rutaEnMapa(evento), la dirección donde se ve en el mapa (o null); `mapa`, los lugares y zonas (mini-mapa);
 * visto(evento), si ya se abrió en este navegador (avance de las historias).
 */
export function crearDetalle(raiz, { periodos, temas, personajeDe, rutaEnMapa = () => null, mapa = { lugares: [], zonas: [] }, visto = () => false }) {
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  const temaDe = new Map(temas.map((t) => [t.id, t.nombre]));
  const lugarDe = new Map(mapa.lugares.map((l) => [l.id, l]));
  const zonaDe = new Map(mapa.zonas.map((z) => [z.id, z]));
  const colorDe = (ev) => periodoDe.get(ev.periodoId).color;
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
  });
  raiz.addEventListener('click', (e) => {
    if (!e.target.closest('[data-accion="olvidar"]')) return;
    borrarPreferencia('nacimiento');
    pintarEdad('Se olvidó tu año de nacimiento.');
    raiz.querySelector('#anio-nacimiento').focus();
  });

  /** Un evento; con `historia` ({ recorrido, paso }), como paso de una historia guiada. */
  function mostrar(ev, { antes, despues, nivel: nivelLectura, regla = '', enfocar = true, historia = null }) {
    iniciar(ev, nivelLectura);
    const p = periodoDe.get(ev.periodoId);
    const img = ev.imagen;
    const cuerpo = () => PARRAFOS[nivel](ev).map((x) => `<p>${esc(x)}</p>`).join('');
    const r = historia?.recorrido;
    const vecinos = historia
      ? `<nav class="vecinos" aria-label="Pasos de la historia">${vecino(antes, 'antes', colorDe, {
          href: `#historia/${r.id}/${historia.paso - 1}`,
          rotulo: 'Paso anterior',
          vacio: 'Este es el primer paso.',
        })}${vecino(despues, 'despues', colorDe, {
          href: `#historia/${r.id}/${historia.paso + 1}`,
          rotulo: 'Paso siguiente',
          vacio: `Este es el último paso de «${esc(r.titulo)}». <a class="boton chico vecino-salida" href="#historias">Elegir otra historia</a>`,
        })}</nav>`
      : `<nav class="vecinos" aria-label="Eventos anterior y siguiente">${vecino(antes, 'antes', colorDe)}${vecino(despues, 'despues', colorDe)}</nav>`;

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
          arriba: historia ? barraHistoria(historia) : '',
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
            <div class="detalle-cuerpo" data-nivel="${nivel}">${cuerpo()}</div>
            ${
              ev.sabiasQue
                ? `<aside class="sabias-que" aria-labelledby="sabias-que-titulo"><h3 id="sabias-que-titulo">¿Sabías que…?</h3><p>${esc(ev.sabiasQue)}</p></aside>`
                : ''
            }
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
            ${ruta ? `<a class="boton chico ver-en-mapa" href="${ruta}">Ver en el mapa</a>` : ''}
            ${regla}
            ${temasDe.length ? `<p class="etiquetas"><span class="solo-lector">Temas: </span>${temasDe.join('')}</p>` : ''}
            ${personajes(ev)}
          </aside>
          <div class="detalle-mas">
            ${ev.anio >= 1900 ? `<details class="plegable edad"><summary>¿Qué edad tenías?</summary>${formularioEdad()}</details>` : ''}
            ${vecinos}
            ${sobrePeriodo(p)}
            <details class="plegable">
              <summary>Fuentes (${ev.fuentes.length})</summary>
              <ul class="fuentes">${listaFuentes(ev.fuentes)}</ul>
            </details>
          </div>
        </div>
      </div>`,
      enfocar,
    );
    ajustarFicha();
    alCambiarNivel = () => {
      const contenedor = raiz.querySelector('.detalle-cuerpo');
      contenedor.dataset.nivel = nivel;
      contenedor.innerHTML = cuerpo();
      raiz.querySelector('.detalle-bajada').innerHTML = bajada();
    };
  }

  // La ficha acompaña al texto al desplazar solo si cabe entera en la pantalla (si no, se cortaría).
  function ajustarFicha() {
    const ficha = raiz.querySelector('.detalle-ficha');
    if (!ficha) return;
    ficha.classList.remove('fija');
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    ficha.classList.toggle('fija', ficha.offsetHeight + 2 * rem <= raiz.clientHeight);
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
              // Avance: cuántos pasos ya se vieron; la historia sigue en el primero que falta.
              const vistosAqui = r.eventos.filter(visto).length;
              const siguiente = r.eventos.findIndex((ev) => !visto(ev)) + 1 || 1;
              const accion = !vistosAqui ? 'Empezar' : vistosAqui === r.eventos.length ? 'Terminada · volver a recorrerla' : `${vistosAqui} de ${r.eventos.length} pasos vistos · seguir`;
              return `
            <li><a class="puerta historia-puerta" href="#historia/${r.id}/${siguiente}">
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
    mostrarGrupo,
    mostrarHistorias,
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
