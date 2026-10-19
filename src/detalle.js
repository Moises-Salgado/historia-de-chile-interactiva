// Panel de detalle, sobre la línea de tiempo. Muestra un evento (imagen con crédito y licencia, texto según
// el nivel de lectura, «¿Sabías que?», personajes, «¿Qué pasó antes / después?», período y fuentes), un paso
// de una historia guiada, un grupo de eventos, la lista de historias o la ficha de un personaje.
import { edadEn, formatearAnio, haceCuanto } from './fechas.js';
import { borrarPreferencia, esc, guardarPreferencia, leerPreferencia, nombreFuente, urlImagen, urlLicencia } from './util.js';

// «Detallado» suma el detalle al resumen general: el detalle lo continúa, no lo repite.
const PARRAFOS = {
  nino: (ev) => [ev.resumenNino],
  general: (ev) => [ev.resumen],
  detallado: (ev) => [ev.resumen, ...ev.detalle.split(/\n\s*\n/)],
};
const OTRA_PESTANA = '<span class="solo-lector"> (se abre en otra pestaña)</span>';
const externo = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener">${texto}${OTRA_PESTANA}</a>`;
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
        <span class="vecino-rotulo">${lado === 'antes' ? `<span aria-hidden="true">◀</span> ${texto}` : `${texto} <span aria-hidden="true">▶</span>`}</span>
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

// Año de nacimiento de quien lee (opcional, solo en este navegador) para mostrar su edad desde 1900.
const leerNacimiento = () => {
  const n = Number(leerPreferencia('nacimiento'));
  return Number.isInteger(n) && n >= 1900 && n <= ANIO_ACTUAL ? n : null;
};

/**
 * Crea el panel en `raiz` («Volver», «Anterior» y «Siguiente» están en la barra inferior).
 * personajeDe(nombre) devuelve { slug, eventos } si el personaje tiene ficha (aparece en más de un evento).
 */
export function crearDetalle(raiz, { periodos, temas, personajeDe }) {
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  const temaDe = new Map(temas.map((t) => [t.id, t.nombre]));
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
  }

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
    const licencia = urlLicencia(img.licencia) ? externo(urlLicencia(img.licencia), esc(img.licencia)) : esc(img.licencia);
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

    // Orden de lectura: fecha y título primero (en celular, antes que la imagen); en pantallas anchas
    // la imagen va a la izquierda con la grilla.
    raiz.style.setProperty('--color', p.color);
    pintar(
      `
      <div class="detalle-contenido${historia ? ' con-historia' : ''}">
        ${historia ? barraHistoria(historia) : ''}
        <header class="detalle-encabezado">
          <p class="detalle-fecha"><time${ev.fecha.startsWith('-') ? '' : ` datetime="${ev.fecha}"`}>${esc(ev.fechaTexto)}</time> <span class="detalle-hace">${tiempo(ev)}</span> · ${esc(ev.lugar)}</p>
          <h2 id="detalle-titulo" tabindex="-1">${esc(ev.titulo)}</h2>
          <p class="etiquetas"><span class="etiqueta periodo">${esc(p.nombre)}</span>${ev.temas
            .filter((t) => temaDe.get(t) !== p.nombre)
            .map((t) => `<span class="etiqueta">${esc(temaDe.get(t))}</span>`)
            .join('')}</p>
          ${regla}
        </header>
        <figure class="detalle-figura">
          <div class="detalle-marco">
            <img src="${urlImagen(img.archivo, 800)}" alt="${esc(img.pieDeFoto)}" fetchpriority="high" decoding="async" data-periodo="${ev.periodoId}">
          </div>
          <figcaption>
            <span class="pie">${esc(img.pieDeFoto)}</span>
            <span class="credito">Imagen: ${esc(img.autor)} · ${licencia} · ${externo(img.urlPagina, 'Wikimedia Commons')}</span>
          </figcaption>
        </figure>
        <div class="detalle-texto">
          <div class="detalle-cuerpo" data-nivel="${nivel}">${cuerpo()}</div>
          ${
            ev.sabiasQue
              ? `<aside class="sabias-que" aria-labelledby="sabias-que-titulo"><h3 id="sabias-que-titulo">¿Sabías que…?</h3><p>${esc(ev.sabiasQue)}</p></aside>`
              : ''
          }
          ${personajes(ev)}
          ${vecinos}
          ${sobrePeriodo(p)}
          ${ev.anio >= 1900 ? `<details class="plegable edad"><summary>¿Qué edad tenías?</summary>${formularioEdad()}</details>` : ''}
          <details class="plegable">
            <summary>Fuentes (${ev.fuentes.length})</summary>
            <ul class="fuentes">${listaFuentes(ev.fuentes)}</ul>
          </details>
        </div>
      </div>`,
      enfocar,
    );
    alCambiarNivel = () => {
      const contenedor = raiz.querySelector('.detalle-cuerpo');
      contenedor.dataset.nivel = nivel;
      contenedor.innerHTML = cuerpo();
    };
  }

  /** Un grupo de eventos de la misma fecha (por ejemplo, los pueblos que vivían aquí hacia 1500). */
  function mostrarGrupo(grupo, { antes, despues, nivel: nivelLectura, regla = '', enfocar = true }) {
    iniciar(grupo, nivelLectura);
    const p = periodoDe.get(grupo.periodoId);
    const lista = () => grupo.eventos.map((ev) => ficha(ev, colorDe(ev), nivel, ev.lugar)).join('');
    raiz.style.setProperty('--color', p.color);
    pintar(
      `
      <div class="detalle-contenido vista-lista">
        <header class="detalle-encabezado">
          <p class="detalle-fecha">${esc(grupo.fechaTexto)}</p>
          <h2 id="detalle-titulo" tabindex="-1">${esc(grupo.titulo)}</h2>
          <p class="etiquetas"><span class="etiqueta periodo">${esc(p.nombre)}</span></p>
          ${regla}
          <p class="vista-intro">${esc(grupo.descripcion)}</p>
        </header>
        <div class="detalle-texto">
          <ol class="fichas">${lista()}</ol>
          <nav class="vecinos" aria-label="Eventos anterior y siguiente">${vecino(antes, 'antes', colorDe)}${vecino(despues, 'despues', colorDe)}</nav>
          ${sobrePeriodo(p)}
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
      <div class="detalle-contenido vista-lista">
        <header class="detalle-encabezado">
          <p class="detalle-fecha">Historias guiadas</p>
          <h2 id="detalle-titulo" tabindex="-1">Elige una historia</h2>
          <p class="vista-intro">Cada historia recorre, paso a paso y en orden, algunos eventos de la línea de tiempo sobre un mismo tema.</p>
        </header>
        <div class="detalle-texto">
          <ul class="fichas">${recorridos
            .map(
              (r) => `
            <li><a class="ficha" href="#historia/${r.id}/1" style="--color:${colorDe(r.eventos[0])}">
              ${mosaico(r.eventos)}
              <span class="ficha-texto">
                <span class="ficha-meta">${r.eventos.length} pasos · de ${formatearAnio(r.eventos[0].anio)} a ${formatearAnio(r.eventos.at(-1).anio)}</span>
                <span class="ficha-titulo">${esc(r.titulo)}</span>
                <span class="ficha-resumen">${esc(r.descripcion)}</span>
                <span class="ficha-accion">Empezar <span aria-hidden="true">▶</span></span>
              </span>
            </a></li>`,
            )
            .join('')}</ul>
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
      <div class="detalle-contenido vista-lista">
        <header class="detalle-encabezado">
          <p class="detalle-fecha">Personaje</p>
          <h2 id="detalle-titulo" tabindex="-1">${esc(persona.nombre)}</h2>
          <p class="vista-intro">Aparece en ${persona.eventos.length} eventos de esta línea de tiempo, ${rango}.</p>
          ${regla}
        </header>
        <div class="detalle-texto">
          <ol class="fichas">${lista()}</ol>
          <p class="ayuda">Esta ficha reúne los eventos donde se nombra a ${esc(persona.nombre)}; no es una biografía.</p>
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
