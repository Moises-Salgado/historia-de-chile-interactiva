// Panel «Buscar y filtrar»: búsqueda por título, personaje o año (sin importar tildes) y filtros por
// período y tema. La línea de tiempo muestra solo los eventos que cumplen todo.
import { esc, normalizar } from './util.js';

const MAX_RESULTADOS = 30;

const palabras = (texto) =>
  normalizar(texto)
    .replace(/[^\p{L}\p{N}'.\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * Crea el panel en `panel`; `boton` lo abre y lo cierra. alCambiar() avisa que cambió el filtro,
 * alElegir(evento) abre un resultado y alAbrirOCerrar() avisa que el panel se mostró u ocultó.
 */
export function crearFiltros(panel, { periodos, temas, eventos, boton, alCambiar, alElegir, alAbrirOCerrar }) {
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const nombrePeriodo = new Map(periodos.map((p) => [p.id, p.nombre]));
  const nombreTema = new Map(temas.map((t) => [t.id, t.nombre]));
  const textoDe = new Map(
    eventos.map((ev) => [
      ev,
      normalizar([ev.titulo, ev.fechaTexto, ev.lugar, ...ev.personajes, nombrePeriodo.get(ev.periodoId), ...ev.temas.map((t) => nombreTema.get(t))].join(' · ')),
    ]),
  );
  const elegidos = { periodo: new Set(nombrePeriodo.keys()), tema: new Set(nombreTema.keys()) };
  let terminos = [];

  const opcion = (grupo, { id, nombre, color, fechasTexto }) => `
    <label class="opcion">
      <input type="checkbox" name="${grupo}" value="${id}" checked>
      ${color ? `<span class="muestra" style="--color:${color}" aria-hidden="true"></span>` : ''}
      <span>${esc(nombre)}${fechasTexto ? ` <span class="opcion-fechas">${esc(fechasTexto)}</span>` : ''}</span>
    </label>`;

  panel.innerHTML = `
    <div class="panel-contenido">
      <div class="panel-cabecera">
        <h2 id="panel-titulo">Buscar y filtrar</h2>
        <button type="button" class="boton" data-accion="cerrar">Cerrar</button>
      </div>
      <label class="rotulo" for="buscar">Buscar por título, personaje o año</label>
      <input id="buscar" class="campo" type="search" autocomplete="off" spellcheck="false" placeholder="Ej.: Prat, 1879, terremoto">
      <p class="resultados-cuenta" role="status"></p>
      <ol class="resultados"></ol>
      <fieldset class="opciones"><legend>Períodos</legend>${periodos.map((p) => opcion('periodo', p)).join('')}</fieldset>
      <fieldset class="opciones"><legend>Temas</legend>${temas.map((t) => opcion('tema', t)).join('')}</fieldset>
      <div class="panel-acciones">
        <button type="button" class="boton" data-accion="limpiar">Quitar filtros</button>
        <button type="button" class="boton primario" data-accion="cerrar">Ver en la línea de tiempo</button>
      </div>
    </div>`;
  const campo = panel.querySelector('#buscar');
  const cuenta = panel.querySelector('.resultados-cuenta');
  const resultados = panel.querySelector('.resultados');

  // Un año (3 o 4 cifras) también encuentra los procesos que lo abarcan: «1900» → auge del salitre.
  function coincide(ev) {
    if (!elegidos.periodo.has(ev.periodoId) || !ev.temas.some((t) => elegidos.tema.has(t))) return false;
    const texto = textoDe.get(ev);
    return terminos.every((t) => texto.includes(t) || (/^\d{3,4}$/.test(t) && ev.anio <= Number(t) && Number(t) <= ev.anioFin));
  }

  const activo = () => terminos.length > 0 || elegidos.periodo.size < periodos.length || elegidos.tema.size < temas.length;

  function actualizar() {
    alCambiar();
    if (!terminos.length) {
      cuenta.textContent = '';
      resultados.replaceChildren();
      return;
    }
    const encontrados = eventos.filter(coincide);
    const n = encontrados.length;
    cuenta.textContent = !n
      ? 'Sin resultados. Prueba con otra palabra o con un año.'
      : `${n} ${n === 1 ? 'resultado' : 'resultados'}${n > MAX_RESULTADOS ? ` (se muestran los primeros ${MAX_RESULTADOS})` : ''}.`;
    resultados.innerHTML = encontrados
      .slice(0, MAX_RESULTADOS)
      .map(
        (ev) => `<li><button type="button" class="resultado" data-id="${ev.id}">
          <span class="resultado-fecha">${esc(ev.fechaTexto)}</span><span class="resultado-titulo">${esc(ev.titulo)}</span></button></li>`,
      )
      .join('');
  }

  let espera;
  campo.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      terminos = palabras(campo.value);
      actualizar();
    }, 200);
  });
  panel.addEventListener('change', (e) => {
    const casilla = e.target;
    if (casilla.type !== 'checkbox') return;
    elegidos[casilla.name][casilla.checked ? 'add' : 'delete'](casilla.value);
    actualizar();
  });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b?.dataset.accion === 'cerrar') cerrar();
    else if (b?.dataset.accion === 'limpiar') limpiar();
    else if (b?.dataset.id) {
      cerrar({ devolverFoco: false });
      alElegir(porId.get(b.dataset.id));
    }
  });
  boton.addEventListener('click', () => (panel.hidden ? abrir() : cerrar()));

  function abrir() {
    panel.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    alAbrirOCerrar();
    campo.focus();
  }

  function cerrar({ devolverFoco = true } = {}) {
    if (panel.hidden) return;
    panel.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
    alAbrirOCerrar();
    if (devolverFoco) boton.focus();
  }

  function limpiar() {
    clearTimeout(espera);
    terminos = [];
    campo.value = '';
    for (const casilla of panel.querySelectorAll('input[type="checkbox"]')) {
      casilla.checked = true;
      elegidos[casilla.name].add(casilla.value);
    }
    actualizar();
  }

  /** Busca un texto (por ejemplo, un personaje) y muestra los resultados en el panel. */
  function buscar(texto) {
    clearTimeout(espera);
    campo.value = texto;
    terminos = palabras(texto);
    actualizar();
    abrir();
  }

  return {
    coincide,
    activo,
    cerrar,
    limpiar,
    buscar,
    get abierto() {
      return !panel.hidden;
    },
  };
}
