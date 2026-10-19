// Panel «Buscar y filtrar»: búsqueda por título, personaje, lugar o año (sin importar tildes) y filtros
// por período y tema. La línea de tiempo muestra solo los eventos que cumplen todo.
// La búsqueda va por niveles: primero las palabras completas («Prat» → Arturo Prat) y aparte las que solo
// empiezan igual («Prat» → Carlos Prats), con el motivo a la vista. Si hay coincidencias completas, las
// parciales no filtran la línea de tiempo.
// Los filtros son chips arriba de los resultados: sin ninguno activado se ven todos; activar uno deja solo
// ese período (o tema), y activar más los suma.
import { esc, icono, normalizar, urlImagen } from './util.js';

const MAX_RESULTADOS = 30;
// Búsquedas de ejemplo para cuando no hay resultados (se ofrecen solo las que encuentran algo).
const SUGERENCIAS = ['Prat', '1879', 'terremoto', 'Mistral', 'Constitución', 'mapuche', 'cobre', 'Bachelet'];

const palabras = (texto) => normalizar(texto).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

// Marca con <mark> las palabras del texto que empiezan con algún término (sin importar tildes: «Maipu» marca
// «Maipú»). Cada letra del texto se normaliza por separado para saber qué letras originales marcar.
function resaltar(texto, terminos) {
  if (!terminos.length) return esc(texto);
  const letras = [...texto];
  let normal = '';
  const de = [];
  letras.forEach((c, i) => {
    for (const n of normalizar(c)) {
      normal += n;
      de.push(i);
    }
  });
  const marcada = letras.map(() => false);
  // Una letra sola («o» de «O'Higgins») marcaría el comienzo de demasiadas palabras: no se resalta.
  for (const t of terminos.filter((x) => x.length > 1)) {
    for (let i = normal.indexOf(t); i >= 0; i = normal.indexOf(t, i + 1)) {
      const inicioDePalabra = i === 0 || !/[\p{L}\p{N}]/u.test(normal[i - 1]);
      if (inicioDePalabra) for (let k = i; k < i + t.length; k++) marcada[de[k]] = true;
    }
  }
  let html = '';
  letras.forEach((c, i) => {
    if (marcada[i] && !marcada[i - 1]) html += '<mark>';
    html += esc(c);
    if (marcada[i] && !marcada[i + 1]) html += '</mark>';
  });
  return html;
}

/**
 * Crea el panel en `panel`; `boton` lo abre y lo cierra. alCambiar() avisa que cambió el filtro,
 * alElegir(evento) abre un resultado, alAbrirOCerrar() avisa que el panel se mostró u ocultó y alVerLinea()
 * lleva a la línea de tiempo («Ver en la línea de tiempo»).
 */
export function crearFiltros(panel, { periodos, temas, eventos, boton, alCambiar, alElegir, alAbrirOCerrar, alVerLinea }) {
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
  // Lo activado en cada grupo de chips; vacío = todos.
  const elegidos = { periodo: new Set(), tema: new Set() };
  let terminos = [];
  let encontrados = []; // [{ ev, parcial, motivo }] según la búsqueda actual
  let aceptados = null; // eventos que la búsqueda deja en la línea de tiempo (null = sin búsqueda)

  const chip = (grupo, { id, nombre, color }) =>
    `<button type="button" class="chip" data-grupo="${grupo}" data-id="${id}" aria-pressed="false">${color ? `<i style="--color:${color}" aria-hidden="true"></i>` : ''}${esc(nombre)}</button>`;

  panel.innerHTML = `
    <div class="panel-contenido">
      <div class="panel-cabecera">
        <h2 id="panel-titulo">Buscar y filtrar</h2>
        <button type="button" class="boton" data-accion="cerrar">${icono('cerrar')}<span>Cerrar</span></button>
      </div>
      <label class="rotulo" for="buscar">Buscar por título, personaje, lugar o año</label>
      <div class="campo-caja">
        ${icono('buscar')}
        <input id="buscar" class="campo" type="search" autocomplete="off" spellcheck="false" placeholder="Ej.: Prat, 1879, terremoto">
        <button type="button" class="campo-borrar" data-accion="borrar" aria-label="Borrar la búsqueda" hidden>${icono('cerrar')}</button>
      </div>
      <div class="filtros-chips">
        <div class="chips-grupo" role="group" aria-labelledby="chips-periodo"><span id="chips-periodo" class="chips-titulo">Períodos</span>${periodos.map((p) => chip('periodo', p)).join('')}</div>
        <div class="chips-grupo" role="group" aria-labelledby="chips-tema"><span id="chips-tema" class="chips-titulo">Temas</span>${temas.map((t) => chip('tema', t)).join('')}</div>
      </div>
      <p class="resultados-cuenta" role="status"></p>
      <div class="resultados"></div>
      <p class="panel-historias">¿Prefieres un recorrido paso a paso? <a href="#historias">Elegir una historia guiada</a></p>
      <div class="panel-acciones">
        <button type="button" class="boton" data-accion="limpiar">Quitar filtros</button>
        <button type="button" class="boton primario" data-accion="cerrar">Ver en la línea de tiempo</button>
      </div>
    </div>`;
  const campo = panel.querySelector('#buscar');
  const borrar = panel.querySelector('.campo-borrar');
  const cuenta = panel.querySelector('.resultados-cuenta');
  const resultados = panel.querySelector('.resultados');

  const pasaFiltros = (ev) =>
    (!elegidos.periodo.size || elegidos.periodo.has(ev.periodoId)) && (!elegidos.tema.size || ev.temas.some((t) => elegidos.tema.has(t)));

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

  function buscarEventos(conTerminos = terminos) {
    const lista = [];
    for (const ev of eventos) {
      if (!pasaFiltros(ev)) continue;
      const coincidencias = conTerminos.map((t) => comparar(ev, t));
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
  const hayBusqueda = () => terminos.length > 0;
  const activo = () => hayBusqueda() || elegidos.periodo.size > 0 || elegidos.tema.size > 0;

  const resultado = ({ ev, motivo }) => {
    const p = periodoDe.get(ev.periodoId);
    return `<li><button type="button" class="resultado" data-id="${ev.id}" style="--color:${p.color}">
      <span class="resultado-img"><img src="${urlImagen(ev.imagen.archivo, 120)}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}"></span>
      <span class="resultado-texto">
        <span class="resultado-meta"><span class="resultado-periodo">${esc(p.nombre)}</span> · ${esc(ev.fechaTexto)}</span>
        <span class="resultado-titulo">${resaltar(ev.titulo, terminos)}</span>
        ${motivo ? `<span class="resultado-motivo">Coincide con ${esc(motivo.tipo.toLowerCase())}: ${resaltar(motivo.texto, terminos)}</span>` : ''}
      </span></button></li>`;
  };

  const grupo = (titulo, lista) =>
    lista.length ? `${titulo ? `<h3 class="resultados-grupo">${titulo}</h3>` : ''}<ol class="resultados-lista">${lista.map(resultado).join('')}</ol>` : '';

  // Sin resultados: se proponen búsquedas que sí encuentran algo (con los filtros activos).
  function sinResultados() {
    const ofrecidas = SUGERENCIAS.filter((s) => buscarEventos(palabras(s)).length).slice(0, 5);
    if (!ofrecidas.length) return '';
    return `<div class="resultados-vacio"><p>Prueba con:</p><ul>${ofrecidas
      .map((s) => `<li><button type="button" class="chip" data-sugerencia="${esc(s)}">${esc(s)}</button></li>`)
      .join('')}</ul></div>`;
  }

  function actualizar() {
    encontrados = hayBusqueda() ? buscarEventos() : [];
    const completos = encontrados.filter((r) => !r.parcial);
    const parciales = encontrados.filter((r) => r.parcial);
    aceptados = hayBusqueda() ? new Set((completos.length ? completos : parciales).map((r) => r.ev)) : null;
    alCambiar();
    borrar.hidden = !campo.value;
    if (!hayBusqueda()) {
      cuenta.textContent = '';
      resultados.replaceChildren();
      return;
    }
    const n = encontrados.length;
    cuenta.textContent = !n
      ? `Sin resultados para «${campo.value.trim()}».`
      : `${n} ${n === 1 ? 'resultado' : 'resultados'}${n > MAX_RESULTADOS ? ` (se muestran los primeros ${MAX_RESULTADOS})` : ''}.`;
    if (!n) {
      resultados.innerHTML = sinResultados();
      return;
    }
    const mostrados = completos.slice(0, MAX_RESULTADOS);
    const masParciales = parciales.slice(0, MAX_RESULTADOS - mostrados.length);
    resultados.innerHTML =
      grupo(completos.length && masParciales.length ? 'Coincidencias exactas' : '', mostrados) +
      grupo(completos.length ? 'También empiezan así' : '', masParciales);
  }

  let espera;
  campo.addEventListener('input', () => {
    clearTimeout(espera);
    borrar.hidden = !campo.value;
    espera = setTimeout(() => {
      terminos = palabras(campo.value);
      actualizar();
    }, 200);
  });

  function buscar(texto) {
    clearTimeout(espera);
    campo.value = texto;
    terminos = palabras(texto);
    actualizar();
  }

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.accion === 'cerrar') {
      cerrar({ devolverFoco: false });
      alVerLinea();
    } else if (b.dataset.accion === 'limpiar') limpiar();
    else if (b.dataset.accion === 'borrar') {
      buscar('');
      campo.focus();
    } else if (b.dataset.sugerencia) {
      buscar(b.dataset.sugerencia);
      campo.focus();
    } else if (b.dataset.grupo) {
      const activado = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(activado));
      elegidos[b.dataset.grupo][activado ? 'add' : 'delete'](b.dataset.id);
      actualizar();
    }
    // El panel se cierra al abrir el evento (main.js, dentro de la transición): así su miniatura crece hasta la
    // lámina del detalle.
    else if (b.dataset.id) alElegir(porId.get(b.dataset.id));
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
    for (const c of panel.querySelectorAll('.chips-grupo .chip')) c.setAttribute('aria-pressed', 'false');
    elegidos.periodo.clear();
    elegidos.tema.clear();
    actualizar();
  }

  return {
    coincide,
    activo,
    cerrar,
    limpiar,
    get abierto() {
      return !panel.hidden;
    },
  };
}
