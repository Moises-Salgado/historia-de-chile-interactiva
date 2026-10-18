// Panel de detalle de un evento: imagen con crédito y licencia, texto según el nivel de lectura,
// personajes, «¿Qué pasó antes / después?», período y fuentes.
import { esc, nombreFuente, urlImagen, urlLicencia } from './util.js';

// «Detallado» suma el detalle al resumen general: el detalle lo continúa, no lo repite.
const PARRAFOS = {
  nino: (ev) => [ev.resumenNino],
  general: (ev) => [ev.resumen],
  detallado: (ev) => [ev.resumen, ...ev.detalle.split(/\n\s*\n/)],
};
const OTRA_PESTANA = '<span class="solo-lector"> (se abre en otra pestaña)</span>';
const externo = (url, texto) => `<a href="${esc(url)}" target="_blank" rel="noopener">${texto}${OTRA_PESTANA}</a>`;

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

const vecino = (ev, lado) =>
  ev
    ? `<a class="vecino ${lado}" href="#evento/${ev.id}">
        <span class="vecino-rotulo">${lado === 'antes' ? '<span aria-hidden="true">◀</span> ¿Qué pasó antes?' : '¿Qué pasó después? <span aria-hidden="true">▶</span>'}</span>
        <span class="vecino-fecha">${esc(ev.fechaTexto)}</span>
        <span class="vecino-titulo">${esc(ev.titulo)}</span>
      </a>`
    : `<p class="vecino vacio">${lado === 'antes' ? 'Este es el primer evento.' : 'Este es el último evento.'}</p>`;

/** Crea el panel en `raiz`. alVolver() cierra el detalle; alBuscar(nombre) busca otros eventos de un personaje. */
export function crearDetalle(raiz, { periodos, temas, alVolver, alBuscar }) {
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  const temaDe = new Map(temas.map((t) => [t.id, t.nombre]));
  let actual = null;
  let vecinos = { antes: null, despues: null };
  let nivel = 'general';

  raiz.addEventListener('click', (e) => {
    const boton = e.target.closest('button[data-accion]');
    if (boton?.dataset.accion === 'volver') alVolver();
    else if (boton?.dataset.accion === 'buscar') alBuscar(boton.dataset.nombre);
  });

  const cuerpo = () => PARRAFOS[nivel](actual).map((p) => `<p>${esc(p)}</p>`).join('');

  function mostrar(ev, { antes, despues, nivel: nivelLectura, enfocar = true }) {
    actual = ev;
    vecinos = { antes, despues };
    nivel = nivelLectura;
    const p = periodoDe.get(ev.periodoId);
    const img = ev.imagen;
    const licencia = urlLicencia(img.licencia) ? externo(urlLicencia(img.licencia), esc(img.licencia)) : esc(img.licencia);
    const volver = '<button type="button" class="boton" data-accion="volver"><span aria-hidden="true">◀</span> Volver a la línea de tiempo</button>';

    raiz.style.setProperty('--color', p.color);
    raiz.innerHTML = `
      <div class="detalle-barra">${volver}</div>
      <div class="detalle-contenido">
        <figure class="detalle-figura">
          <div class="detalle-marco">
            <img src="${urlImagen(img.archivo, 800)}" alt="${esc(img.pieDeFoto)}" loading="lazy" decoding="async" data-periodo="${ev.periodoId}">
          </div>
          <figcaption>
            <span class="pie">${esc(img.pieDeFoto)}</span>
            <span class="credito">Imagen: ${esc(img.autor)} · ${licencia} · ${externo(img.urlPagina, 'Wikimedia Commons')}</span>
          </figcaption>
        </figure>
        <div class="detalle-texto">
          <p class="detalle-fecha"><time${ev.fecha.startsWith('-') ? '' : ` datetime="${ev.fecha}"`}>${esc(ev.fechaTexto)}</time> · ${esc(ev.lugar)}</p>
          <h2 id="detalle-titulo" tabindex="-1">${esc(ev.titulo)}</h2>
          <p class="etiquetas"><span class="etiqueta periodo">${esc(p.nombre)}</span>${ev.temas
            .map((t) => `<span class="etiqueta">${esc(temaDe.get(t))}</span>`)
            .join('')}</p>
          <div class="detalle-cuerpo" data-nivel="${nivel}">${cuerpo()}</div>
          ${
            ev.personajes.length
              ? `<section class="personajes" aria-labelledby="personajes-titulo">
                  <h3 id="personajes-titulo">Personajes</h3>
                  <p class="ayuda">Toca un nombre para ver otros eventos donde aparece.</p>
                  <ul>${ev.personajes
                    .map((n) => `<li><button type="button" class="boton chico" data-accion="buscar" data-nombre="${esc(n)}">${esc(n)}</button></li>`)
                    .join('')}</ul>
                </section>`
              : ''
          }
          <nav class="vecinos" aria-label="Eventos anterior y siguiente">${vecino(antes, 'antes')}${vecino(despues, 'despues')}</nav>
          <details class="plegable">
            <summary>Sobre el período: ${esc(p.nombre)} (${esc(p.fechasTexto)})</summary>
            <p>${esc(p.descripcion)}</p>
          </details>
          <details class="plegable">
            <summary>Fuentes (${ev.fuentes.length})</summary>
            <ul class="fuentes">${listaFuentes(ev.fuentes)}</ul>
          </details>
          <p class="detalle-pie">${volver}</p>
        </div>
      </div>`;
    raiz.hidden = false;
    raiz.scrollTop = 0;
    if (enfocar) raiz.querySelector('h2').focus({ preventScroll: true });
  }

  function ponerNivel(nuevo) {
    nivel = nuevo;
    const contenedor = raiz.querySelector('.detalle-cuerpo');
    if (!actual || !contenedor) return;
    contenedor.dataset.nivel = nivel;
    contenedor.innerHTML = cuerpo();
  }

  function ocultar() {
    raiz.hidden = true;
    raiz.replaceChildren();
    actual = null;
    vecinos = { antes: null, despues: null };
  }

  return {
    mostrar,
    ocultar,
    ponerNivel,
    get abierto() {
      return !raiz.hidden;
    },
    get antes() {
      return vecinos.antes;
    },
    get despues() {
      return vecinos.despues;
    },
  };
}
