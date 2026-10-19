// Mapa de Chile (#mapa): las 16 regiones actuales y los lugares con eventos, sobre el océano. Tocar una región,
// un lugar o una zona muestra lo que pasó ahí (#mapa/<región>, #lugar/<id>, #mapa/zona/<id>, #mapa/chile y
// #mapa/fuera); el filtro por período cambia el mapa entero. Este módulo y las formas de las regiones
// (chile-regiones.json, de Natural Earth) se cargan solo al abrir el mapa (main.js).
// Con el teclado: Tab llega a la región elegida, las flechas recorren las regiones de norte a sur y Enter
// elige; los lugares de cada región están también como botones en el panel.
import geo from './chile-regiones.json';
import { curvasDeNivel } from './curvas.js';
import { esc, icono, movimientoReducido, urlImagen } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const MARGEN = { izq: 4, der: 4, arriba: 8, abajo: 8 };
// Rótulos fijos para orientarse: al oeste (sobre el mar) salvo Santiago, que va al este. Las latitudes van al
// este, en el borde del mapa (el lado argentino no se dibuja).
const ROTULOS = [['arica'], ['iquique'], ['antofagasta'], ['copiapo'], ['valparaiso', 'Valparaíso'], ['santiago', 'Santiago', 'este'], ['concepcion'], ['valdivia'], ['monte-verde'], ['chiloe', 'Chiloé', 'este'], ['estrecho', 'Estrecho']];
const plural = (n, una, varias) => `${n} ${n === 1 ? una : varias}`;

/**
 * Crea el mapa en `seccion`. alElegir(ruta) navega (por ejemplo, a «#mapa/rm»); anunciar(texto) avisa a los
 * lectores de pantalla. Devuelve { mostrar(seleccion, { enfocar }), titulo(seleccion), enfocar() }.
 */
export function crearMapa(seccion, { eventos, periodos, mapa, alElegir, anunciar }) {
  const regionPorCodigo = new Map(mapa.regiones.map((r) => [r.codigo, r]));
  const lugarPorId = new Map(mapa.lugares.map((l) => [l.id, l]));
  const zonaPorId = new Map(mapa.zonas.map((z) => [z.id, z]));
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  const { LON_MIN, LAT_MAX, K, S } = geo.proyeccion;
  const xy = (l) => (l.id === 'rapa-nui' ? [geo.rapa.x, geo.rapa.y] : [(l.lon - LON_MIN) * K * S, (LAT_MAX - l.lat) * S]);

  // Regiones de cada evento: las de sus lugares y zonas (los de alcance nacional o fuera de Chile no colorean).
  const regionesDe = new Map(
    eventos.map((ev) => [ev, new Set(ev.ubicaciones.flatMap((u) => (lugarPorId.has(u) ? [lugarPorId.get(u).region] : (zonaPorId.get(u)?.regiones ?? []))))]),
  );
  let periodo = null;
  let seleccion = { tipo: 'todo' };
  const enEpoca = () => eventos.filter((ev) => !periodo || ev.periodoId === periodo);
  const de = {
    region: (codigo) => enEpoca().filter((ev) => regionesDe.get(ev).has(codigo)),
    lugar: (id) => enEpoca().filter((ev) => ev.ubicaciones.includes(id)),
    zona: (id) => enEpoca().filter((ev) => ev.ubicaciones.includes(id)),
    chile: () => enEpoca().filter((ev) => ev.ubicaciones.includes('chile')),
    fuera: () => enEpoca().filter((ev) => ev.ubicaciones.some((u) => u.startsWith('fuera:'))),
  };

  // El título, la introducción y el espacio del mapa están en index.html (se ven antes de que cargue esto).
  const contenido = seccion.querySelector('.mapa-contenido');
  const figura = seccion.querySelector('.atlas-mapa');
  const lienzo = figura.querySelector('.mapa-lienzo');
  const globo = figura.querySelector('.globo');
  const panel = seccion.querySelector('.atlas-panel');
  const filtro = seccion.querySelector('.mapa-filtro');
  curvasDeNivel(seccion.querySelector('.curvas'));
  filtro.innerHTML = `<button type="button" class="chip" aria-pressed="true" data-periodo="">Todos los períodos</button>${periodos
    .map((p) => `<button type="button" class="chip" aria-pressed="false" data-periodo="${p.id}" style="--color:${p.color}"><i aria-hidden="true"></i>${esc(p.nombre)}</button>`)
    .join('')}`;

  // ---- El mapa en SVG: latitudes, recuadro de Rapa Nui, regiones, lugares y rótulos ----
  const ancho = geo.ancho + MARGEN.izq + MARGEN.der;
  const alto = geo.alto + MARGEN.arriba + MARGEN.abajo;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `${-MARGEN.izq} ${-MARGEN.arriba} ${ancho} ${alto}`);
  svg.setAttribute('class', 'mapa-svg');
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-labelledby', 'mapa-titulo');
  // Las rayas de latitud van bajo las regiones y sus números encima, con halo: donde Chile es más ancho
  // (20°, 25° y 55° S) la tierra llega al borde y los taparía.
  let rayas = '';
  let latitudes = '';
  for (let lat = -20; lat >= -55; lat -= 5) {
    const y = ((LAT_MAX - lat) * S).toFixed(1);
    rayas += `<line x1="0" x2="${geo.ancho}" y1="${y}" y2="${y}"/>`;
    latitudes += `<text x="${geo.ancho}" y="${y}" dy="-0.35em" text-anchor="end">${-lat}° S</text>`;
  }
  const { x: rx, y: ry } = geo.rapa;
  const capas = `<g class="graticula" aria-hidden="true">${rayas}</g><g class="recuadro" aria-hidden="true"><rect x="${rx - 28}" y="${ry - 22}" width="56" height="44" rx="3"/><text x="${rx - 28}" y="${ry - 22}" dy="-0.4em">Rapa Nui · otra escala</text></g>`;
  svg.innerHTML = `${capas}<g class="regiones">${geo.regiones
    .map((r) => `<path class="region" data-codigo="${r.codigo}" d="${r.d}${r.rapa}" tabindex="-1" role="button"/>`)
    .join('')}</g><g class="contornos" aria-hidden="true"></g><path class="contorno-foco" aria-hidden="true"/><g class="graticula" aria-hidden="true">${latitudes}</g><g class="alfileres" aria-hidden="true">${mapa.lugares
    .map((l) => {
      const [x, y] = xy(l);
      return `<g class="alfiler" data-lugar="${l.id}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle class="area" r="9"/><circle class="punto" r="3"/></g>`;
    })
    .join('')}</g><g class="rotulos" aria-hidden="true">${ROTULOS.map(([id, texto, lado]) => {
    const l = lugarPorId.get(id);
    if (!l) return '';
    const [x, y] = xy(l);
    const este = lado === 'este';
    return `<text x="${(x + (este ? 9 : -9)).toFixed(1)}" y="${y.toFixed(1)}" dy="0.35em" text-anchor="${este ? 'start' : 'end'}">${esc(texto ?? l.nombre)}</text>`;
  }).join('')}</g>`;
  lienzo.replaceChildren(svg);
  const elRegion = new Map([...svg.querySelectorAll('.region')].map((el) => [el.dataset.codigo, el]));
  const elLugar = new Map([...svg.querySelectorAll('.alfiler')].map((el) => [el.dataset.lugar, el]));
  const geoRegion = new Map(geo.regiones.map((r) => [r.codigo, r]));
  // Contornos encima de todas las regiones (si no, las vecinas tapan la mitad del borde): lo elegido y el foco.
  const contornos = svg.querySelector('.contornos');
  const contornoFoco = svg.querySelector('.contorno-foco');
  const caminoDe = (codigo) => `${geoRegion.get(codigo).d}${geoRegion.get(codigo).rapa}`;

  // Los rótulos miden 18 px en pantalla sea cual sea el tamaño del mapa (y crecen con «Texto grande»).
  const ajustarLetra = () => {
    const w = svg.getBoundingClientRect().width;
    if (!w) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    svg.style.setProperty('--letra', `${((rem * ancho) / w).toFixed(2)}px`);
  };
  new ResizeObserver(ajustarLetra).observe(svg);

  // ---- Pintar: color de cada región según cuántos eventos tiene, tamaño de los alfileres y lo elegido ----
  const nombreRegion = (codigo) => regionPorCodigo.get(codigo)?.nombre ?? codigo;
  function pintarMapa() {
    const cuenta = new Map(mapa.regiones.map((r) => [r.codigo, de.region(r.codigo).length]));
    const max = Math.max(1, ...cuenta.values());
    const zona = seleccion.tipo === 'zona' ? new Set(zonaPorId.get(seleccion.id).regiones) : null;
    const regionElegida = seleccion.tipo === 'region' ? seleccion.id : seleccion.tipo === 'lugar' ? lugarPorId.get(seleccion.id).region : null;
    const elegidas = [];
    for (const [codigo, el] of elRegion) {
      const n = cuenta.get(codigo);
      const elegida = codigo === regionElegida || Boolean(zona?.has(codigo));
      el.style.setProperty('--peso', `${Math.round((n / max) * 70)}%`);
      el.setAttribute('aria-label', `${nombreRegion(codigo)}: ${plural(n, 'evento', 'eventos')}`);
      el.dataset.globo = `${regionPorCodigo.get(codigo)?.corto ?? codigo}: ${plural(n, 'evento', 'eventos')}`;
      el.classList.toggle('elegida', elegida);
      // Las regiones llevan a otra vista (no se activan y desactivan): la elegida se marca como actual.
      if (elegida) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
      if (elegida) elegidas.push(codigo);
    }
    contornos.innerHTML = elegidas.map((c) => `<path d="${caminoDe(c)}"/>`).join('');
    // Los lugares se tocan con el dedo o el mouse; con el teclado y el lector, desde la lista del panel.
    for (const [id, el] of elLugar) {
      const n = de.lugar(id).length;
      const l = lugarPorId.get(id);
      el.style.display = n ? '' : 'none';
      el.querySelector('.punto').setAttribute('r', (2.6 + Math.sqrt(n) * 1.7).toFixed(1));
      el.dataset.globo = `${l.nombre}: ${plural(n, 'evento', 'eventos')}${l.aproximado ? ' (ubicación aproximada)' : ''}`;
      el.classList.toggle('elegido', seleccion.tipo === 'lugar' && seleccion.id === id);
    }
    const foco = regionElegida ?? zona?.values().next().value ?? 'AP';
    for (const [codigo, el] of elRegion) el.tabIndex = codigo === foco ? 0 : -1;
  }

  // ---- Panel: lo elegido y sus eventos (con miniatura, fecha y el lugar que dice cada evento) ----
  const listaEventos = (lista, vacio = 'No hay eventos de este período aquí.') =>
    lista.length
      ? `<ol class="mapa-eventos escalonar">${lista
          .map(
            (ev) => `<li><a class="mapa-evento" href="#evento/${ev.id}" style="--color:${periodoDe.get(ev.periodoId).color}">
              <span class="mapa-evento-img"><img src="${urlImagen(ev.imagen.archivo, 120)}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}"></span>
              <span class="mapa-evento-texto"><span class="mapa-evento-fecha">${esc(ev.fechaTexto)}</span><span class="mapa-evento-titulo">${esc(ev.titulo)}</span>
              <span class="mapa-evento-lugar">${esc(ev.lugar)}</span></span></a></li>`,
          )
          .join('')}</ol>`
      : `<p class="mapa-vacio">${vacio}</p>`;
  const epoca = () => (periodo ? ` · ${esc(periodoDe.get(periodo).nombre)}` : '');
  const volver = (ruta, texto) => `<a class="boton chico mapa-volver" href="${ruta}">${icono('anterior')}<span>${esc(texto)}</span></a>`;
  const encabezado = (ceja, titulo) => `<p class="ceja">${ceja}${epoca()}</p><h3 id="mapa-panel-titulo" tabindex="-1">${titulo}</h3>`;
  const rutaRegion = (codigo) => `#mapa/${codigo.toLowerCase()}`;

  function pintarPanel() {
    const { tipo, id } = seleccion;
    let html;
    if (tipo === 'todo') {
      html = `${encabezado('Todo el mapa', plural(enEpoca().length, 'evento', 'eventos'))}
        <p class="mapa-resumen">Elige una región o un lugar en el mapa, o en esta lista, de norte a sur.</p>
        <div class="mapa-accesos"><a class="boton chico" href="#mapa/chile">Todo Chile (${de.chile().length})</a><a class="boton chico" href="#mapa/fuera">Fuera de Chile (${de.fuera().length})</a></div>
        <ol class="mapa-regiones escalonar">${mapa.regiones
          .map((r) => `<li><a class="mapa-region" href="${rutaRegion(r.codigo)}"><span>${esc(r.corto)}</span><b>${de.region(r.codigo).length}</b></a></li>`)
          .join('')}</ol>`;
    } else if (tipo === 'region') {
      const lista = de.region(id);
      const lugares = mapa.lugares.filter((l) => l.region === id && de.lugar(l.id).length);
      html = `${volver('#mapa', 'Todas las regiones')}${encabezado('Región', esc(nombreRegion(id)))}
        <p class="mapa-resumen">${plural(lista.length, 'evento', 'eventos')}${lugares.length ? `; ${plural(lugares.length, 'lugar marcado', 'lugares marcados')}:` : '.'}</p>
        ${lugares.length ? `<ul class="mapa-lugares">${lugares.map((l) => `<li><a class="boton chico" href="#lugar/${l.id}">${esc(l.nombre)} <b>${de.lugar(l.id).length}</b></a></li>`).join('')}</ul>` : ''}
        ${listaEventos(lista)}`;
    } else if (tipo === 'lugar') {
      const l = lugarPorId.get(id);
      html = `${volver(rutaRegion(l.region), nombreRegion(l.region))}${encabezado('Lugar', esc(l.nombre))}
        <p class="mapa-resumen">${plural(de.lugar(id).length, 'evento', 'eventos')}.${l.aproximado ? ` <span class="mapa-aprox">Ubicación aproximada: ${esc(l.nota)}.</span>` : ''}</p>
        ${listaEventos(de.lugar(id))}`;
    } else if (tipo === 'zona') {
      const z = zonaPorId.get(id);
      html = `${volver('#mapa', 'Todas las regiones')}${encabezado('Zona', esc(z.nombre))}
        <p class="mapa-resumen">Abarca ${z.regiones.length === 1 ? 'la región' : 'las regiones'} de ${esc(new Intl.ListFormat('es').format(z.regiones.map((c) => regionPorCodigo.get(c).corto)))}.</p>
        ${listaEventos(de.zona(id))}`;
    } else {
      const nacional = tipo === 'chile';
      html = `${volver('#mapa', 'Todas las regiones')}${encabezado(nacional ? 'Alcance nacional' : 'Fuera del territorio', nacional ? 'Todo Chile' : 'Fuera de Chile')}
        <p class="mapa-resumen">${nacional ? 'Leyes, elecciones y procesos que alcanzaron a todo el país.' : 'Hechos de la historia de Chile ocurridos, en todo o en parte, en otros países.'}</p>
        ${listaEventos(nacional ? de.chile() : de.fuera())}`;
    }
    panel.innerHTML = html;
    contenido.dataset.seleccion = tipo;
  }

  const titulo = ({ tipo, id }) =>
    ({
      todo: 'Mapa',
      region: nombreRegion(id),
      lugar: lugarPorId.get(id)?.nombre,
      zona: zonaPorId.get(id)?.nombre,
      chile: 'Todo Chile',
      fuera: 'Fuera de Chile',
    })[tipo];

  // Desde fuera del mapa, el foco va a su título (o al de lo elegido); desde dentro (por ejemplo, con
  // «◀ Todas las regiones»), al título del panel, que está a la vista.
  const enfocarSeleccion = (desdeDentro = false) =>
    (seleccion.tipo === 'todo' && !desdeDentro ? seccion.querySelector('#mapa-titulo') : panel.querySelector('#mapa-panel-titulo'))?.focus({ preventScroll: true });

  // En el celular (una columna, styles.css), lo elegido aparece en una hoja fija abajo. Si en el mapa queda
  // tapado por ella o fuera de la pantalla (al llegar por un enlace), el mapa se desplaza lo justo; si se ve,
  // no se mueve.
  const desplazable = seccion.querySelector('.mapa-desplazable');
  const unaColumna = matchMedia('(max-width: 52em)');
  function dejarALaVista() {
    const ctm = svg.getScreenCTM();
    if (!unaColumna.matches || !ctm || !desplazable.clientHeight) return;
    let centro;
    if (seleccion.tipo === 'lugar') centro = xy(lugarPorId.get(seleccion.id));
    else if (seleccion.tipo === 'region' || seleccion.tipo === 'zona') {
      const centros = (seleccion.tipo === 'region' ? [seleccion.id] : zonaPorId.get(seleccion.id).regiones).map((c) => geoRegion.get(c).centro);
      centro = [0, 1].map((k) => centros.reduce((suma, c) => suma + c[k], 0) / centros.length);
    } else return;
    const { y } = new DOMPoint(...centro).matrixTransform(ctm);
    const arriba = desplazable.getBoundingClientRect().top;
    const abajo = panel.getBoundingClientRect().top;
    const margen = 48;
    if (y > arriba + margen && y < abajo - margen) return;
    desplazable.scrollBy({ top: y - (arriba + (abajo - arriba) * 0.45), behavior: movimientoReducido() ? 'auto' : 'smooth' });
  }

  /**
   * Muestra lo elegido ({ tipo: 'todo' | 'region' | 'lugar' | 'zona' | 'chile' | 'fuera', id }). Si no cambió, no
   * se vuelve a pintar (así conserva el foco y el desplazamiento al cerrar un evento).
   */
  let pintado = false;
  function mostrar(nueva, { enfocar = false } = {}) {
    const dentro = seccion.contains(document.activeElement);
    const cambio = !pintado || nueva.tipo !== seleccion.tipo || nueva.id !== seleccion.id;
    if (cambio) {
      seleccion = nueva;
      pintarMapa();
      pintarPanel();
      panel.scrollTop = 0;
      pintado = true;
      dejarALaVista();
    }
    if (enfocar && (cambio || !dentro)) enfocarSeleccion(dentro);
  }

  // ---- Interacción: tocar, teclado y globo con el nombre ----
  function elegirEn(el) {
    if (el.dataset.lugar) alElegir(`#lugar/${el.dataset.lugar}`);
    else if (el.dataset.codigo) alElegir(rutaRegion(el.dataset.codigo));
  }
  svg.addEventListener('click', (e) => {
    const el = e.target.closest('.alfiler, .region');
    if (el) elegirEn(el);
  });
  svg.addEventListener('keydown', (e) => {
    const el = e.target.closest('.region, .alfiler');
    if (!el) return;
    if (e.key === 'Escape') {
      globo.hidden = true;
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      elegirEn(el);
      return;
    }
    const orden = [...elRegion.values()];
    const i = orden.indexOf(el);
    const destino = { ArrowDown: orden[i + 1], ArrowRight: orden[i + 1], ArrowUp: orden[i - 1], ArrowLeft: orden[i - 1], Home: orden[0], End: orden.at(-1) }[e.key];
    if (!destino) return;
    e.preventDefault();
    el.tabIndex = -1;
    destino.tabIndex = 0;
    destino.focus();
  });

  // Globo con el nombre corto y la cantidad: sobre el centro de la región (no de su caja, que en Valparaíso
  // incluye el recuadro de Rapa Nui) o sobre el lugar. Escape lo cierra; los lectores ya oyen el nombre.
  const punto = svg.createSVGPoint();
  function mostrarGlobo(el) {
    const texto = el?.dataset.globo;
    if (!texto) return void (globo.hidden = true);
    const base = figura.getBoundingClientRect();
    let x;
    let y;
    if (el.dataset.codigo) {
      [punto.x, punto.y] = geoRegion.get(el.dataset.codigo).centro;
      ({ x, y } = punto.matrixTransform(svg.getScreenCTM()));
    } else {
      const caja = el.querySelector('.punto').getBoundingClientRect();
      [x, y] = [caja.left + caja.width / 2, caja.top];
    }
    globo.textContent = texto;
    globo.hidden = false;
    // Sin salirse del mapa por los lados.
    const mitad = globo.offsetWidth / 2;
    globo.style.left = `${Math.min(Math.max(x - base.left, mitad), Math.max(mitad, base.width - mitad))}px`;
    globo.style.top = `${y - base.top}px`;
  }
  svg.addEventListener('pointerover', (e) => mostrarGlobo(e.target.closest('.alfiler, .region')));
  svg.addEventListener('pointerleave', () => (globo.hidden = true));
  svg.addEventListener('focusin', (e) => {
    const el = e.target.closest('.region');
    mostrarGlobo(el);
    if (el) contornoFoco.setAttribute('d', caminoDe(el.dataset.codigo));
  });
  svg.addEventListener('focusout', () => {
    globo.hidden = true;
    contornoFoco.removeAttribute('d');
  });

  filtro.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    periodo = b.dataset.periodo || null;
    for (const x of filtro.querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
    pintarMapa();
    pintarPanel();
    const n = seleccion.tipo === 'todo' ? enEpoca().length : panel.querySelectorAll('.mapa-evento').length;
    anunciar(`${periodo ? periodoDe.get(periodo).nombre : 'Todos los períodos'}: ${plural(n, 'evento', 'eventos')}.`);
  });

  return {
    mostrar,
    titulo,
    /** Lleva el foco al título de lo elegido (o al del mapa). */
    enfocar: () => enfocarSeleccion(),
  };
}
