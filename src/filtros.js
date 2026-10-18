// Panel «Buscar y filtrar»: búsqueda por título, personaje, lugar o año (sin importar tildes) y filtros
// por período y tema. La línea de tiempo muestra solo los eventos que cumplen todo.
// La búsqueda va por niveles: primero las palabras completas («Prat» → Arturo Prat) y aparte las que solo
// empiezan igual («Prat» → Carlos Prats), con el motivo a la vista. Si hay coincidencias completas, las
// parciales no filtran la línea de tiempo.
import { esc, normalizar, urlImagen } from './util.js';

const MAX_RESULTADOS = 30;

const palabras = (texto) => normalizar(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Crea el panel en `panel`; `boton` lo abre y lo cierra. alCambiar() avisa que cambió el filtro,
 * alElegir(evento) abre un resultado y alAbrirOCerrar() avisa que el panel se mostró u ocultó.
 */
export function crearFiltros(panel, { periodos, temas, eventos, boton, alCambiar, alElegir, alAbrirOCerrar }) {
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  const nombreTema = new Map(temas.map((t) => [t.id, t.nombre]));
  // Campos donde se busca, en orden de preferencia para explicar una coincidencia (el título no se explica).
  const camposDe = new Map(
    eventos.map((ev) => [
      ev,
      [
        { tipo: '', texto: ev.titulo },
        ...ev.personajes.map((texto) => ({ tipo: 'Personaje', texto })),
        { tipo: 'Lugar', texto: ev.lugar },
        { tipo: '', texto: ev.fechaTexto },
        { tipo: 'Período', texto: periodoDe.get(ev.periodoId).nombre },
        ...ev.temas.map((t) => ({ tipo: 'Tema', texto: nombreTema.get(t) })),
      ].map((campo) => ({ ...campo, palabras: palabras(campo.texto) })),
    ]),
  );
  const elegidos = { periodo: new Set(periodoDe.keys()), tema: new Set(nombreTema.keys()) };
  let terminos = [];
  let personaje = null; // nombre exacto (normalizado) al llegar desde el botón de un personaje
  let encontrados = []; // [{ ev, parcial, motivo }] según la búsqueda actual
  let aceptados = null; // eventos que la búsqueda deja en la línea de tiempo (null = sin búsqueda)

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
      <label class="rotulo" for="buscar">Buscar por título, personaje, lugar o año</label>
      <input id="buscar" class="campo" type="search" autocomplete="off" spellcheck="false" placeholder="Ej.: Prat, 1879, terremoto">
      <p class="resultados-cuenta" role="status"></p>
      <div class="resultados"></div>
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

  const pasaFiltros = (ev) => elegidos.periodo.has(ev.periodoId) && ev.temas.some((t) => elegidos.tema.has(t));

  // Mejor coincidencia de un término en un evento: completa (0), parcial (1) o ninguna (null).
  // Un año (3 o 4 cifras) también encuentra los procesos que lo abarcan: «1900» → auge del salitre.
  function comparar(ev, termino) {
    const anio = /^\d{3,4}$/.test(termino) ? Number(termino) : null;
    if (anio !== null && ev.anio <= anio && anio <= ev.anioFin) return { nivel: 0, campo: null };
    let parcial = null;
    for (const c of camposDe.get(ev)) {
      if (c.palabras.includes(termino)) return { nivel: 0, campo: c };
      if (!parcial && c.palabras.some((p) => p.startsWith(termino))) parcial = { nivel: 1, campo: c };
    }
    return parcial;
  }

  function buscarEventos() {
    if (personaje) {
      return eventos.filter((ev) => pasaFiltros(ev) && ev.personajes.some((n) => normalizar(n) === personaje)).map((ev) => ({ ev, parcial: false, motivo: null }));
    }
    const lista = [];
    for (const ev of eventos) {
      if (!pasaFiltros(ev)) continue;
      const coincidencias = terminos.map((t) => comparar(ev, t));
      if (coincidencias.some((c) => !c)) continue;
      const parcial = coincidencias.some((c) => c.nivel === 1);
      // Se explica la coincidencia que no está en el título (la parcial, si hay).
      const explicar = (c) => c.campo?.tipo;
      const motivo = (coincidencias.find((c) => c.nivel === 1 && explicar(c)) ?? coincidencias.find(explicar))?.campo ?? null;
      lista.push({ ev, parcial, motivo });
    }
    return lista;
  }

  const coincide = (ev) => pasaFiltros(ev) && (!aceptados || aceptados.has(ev));
  const hayBusqueda = () => terminos.length > 0 || personaje !== null;
  const activo = () => hayBusqueda() || elegidos.periodo.size < periodos.length || elegidos.tema.size < temas.length;

  const resultado = ({ ev, motivo }) => {
    const p = periodoDe.get(ev.periodoId);
    return `<li><button type="button" class="resultado" data-id="${ev.id}" style="--color:${p.color}">
      <img class="resultado-img" src="${urlImagen(ev.imagen.archivo, 120)}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}">
      <span class="resultado-texto">
        <span class="resultado-meta"><span class="resultado-periodo">${esc(p.nombre)}</span> · ${esc(ev.fechaTexto)}</span>
        <span class="resultado-titulo">${esc(ev.titulo)}</span>
        ${motivo ? `<span class="resultado-motivo">Coincide con ${esc(motivo.tipo.toLowerCase())}: ${esc(motivo.texto)}</span>` : ''}
      </span></button></li>`;
  };

  const grupo = (titulo, lista) =>
    lista.length ? `${titulo ? `<h3 class="resultados-grupo">${titulo}</h3>` : ''}<ol class="resultados-lista">${lista.map(resultado).join('')}</ol>` : '';

  function actualizar() {
    encontrados = hayBusqueda() ? buscarEventos() : [];
    const completos = encontrados.filter((r) => !r.parcial);
    const parciales = encontrados.filter((r) => r.parcial);
    aceptados = hayBusqueda() ? new Set((completos.length ? completos : parciales).map((r) => r.ev)) : null;
    alCambiar();
    if (!hayBusqueda()) {
      cuenta.textContent = '';
      resultados.replaceChildren();
      return;
    }
    const n = encontrados.length;
    cuenta.textContent = !n
      ? 'Sin resultados. Prueba con otra palabra o con un año.'
      : `${n} ${n === 1 ? 'resultado' : 'resultados'}${n > MAX_RESULTADOS ? ` (se muestran los primeros ${MAX_RESULTADOS})` : ''}.`;
    const mostrados = completos.slice(0, MAX_RESULTADOS);
    const masParciales = parciales.slice(0, MAX_RESULTADOS - mostrados.length);
    resultados.innerHTML =
      grupo(completos.length && masParciales.length ? 'Coincidencias exactas' : '', mostrados) +
      grupo(completos.length ? 'También empiezan así' : '', masParciales);
  }

  let espera;
  campo.addEventListener('input', () => {
    clearTimeout(espera);
    espera = setTimeout(() => {
      personaje = null;
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
    personaje = null;
    campo.value = '';
    for (const casilla of panel.querySelectorAll('input[type="checkbox"]')) {
      casilla.checked = true;
      elegidos[casilla.name].add(casilla.value);
    }
    actualizar();
  }

  /** Muestra los eventos donde aparece un personaje (por su nombre exacto, no por parecido). */
  function buscarPersonaje(nombre) {
    clearTimeout(espera);
    campo.value = nombre;
    terminos = palabras(nombre);
    personaje = normalizar(nombre);
    actualizar();
    abrir();
  }

  return {
    coincide,
    activo,
    cerrar,
    limpiar,
    buscarPersonaje,
    get abierto() {
      return !panel.hidden;
    },
  };
}
