// Línea de tiempo horizontal: tarjetas con miniatura en carriles, eje con años, franjas de color por
// período y minimapa. La escala no es proporcional al tiempo: cada evento ocupa una «ranura» y los años
// sin eventos se comprimen (logaritmo del intervalo), así caben los milenios de la prehistoria junto a
// los años densos de la Independencia. El zoom cambia el ancho de la ranura y la importancia mínima que
// se muestra (zoom mínimo: solo hitos); las tarjetas que no caben quedan como puntos sobre el eje.
import { anioDecimal, fechaCorta, formatearAnio } from './fechas.js';
import { animar, esc, movimientoReducido, urlImagen } from './util.js';

// Medidas en rem (crecen con «Texto grande»); las de la tarjeta deben coincidir con styles.css.
const MEDIDA = { tarjetaAncho: 17, tarjetaAlto: 6, hueco: 0.75, tallo: 1.5, margen: 1.25, arriba: 0.5, eje: 1.25, anios: 1.75, franjas: 2.25 };
// Cartela según el alto del cielo (rem): completa (período, nombre, descripción) o corta (nombre y fechas).
const CARTELA = { completa: 7, corta: 2.75 };
// Zoom = fracción del ancho que necesitan todas las tarjetas para no encimarse.
// Con `max` ya todos los eventos tienen tarjeta: acercar más solo los separaría.
const ZOOM = { min: 0.25, max: 1.64, inicial: 0.6, paso: 1.4, hitos: 0.45, todos: 0.8 };
const MAX_CARRILES = 5;
const CURVA = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
// Tramos sin eventos de al menos estos años se marcan en el eje: la escala ahí está comprimida.
const SALTO_ANIOS = 1000;
const VISTA = {
  3: 'Solo los grandes hitos · usa + para ver más eventos',
  2: 'Eventos principales · usa + para ver todos',
  1: 'Todos los eventos · desliza para recorrerlos o usa − para ver solo los principales',
};

const limitar = (n, min, max) => Math.min(max, Math.max(min, n));
const conducta = () => (movimientoReducido() ? 'auto' : 'smooth');

// Escala en ranuras (u). Hay un ancla por fecha de inicio de evento y de período (y una para hoy); los
// n eventos de un ancla ocupan n ranuras seguidas (los de un grupo comparten una sola) y el tramo hasta
// la siguiente ancla mide 1,2·log10(1 + años / 5) ranuras.
function crearEscala(eventos, periodos, grupoDe) {
  const hoy = anioDecimal(new Date());
  const ocupa = (ev) => grupoDe.get(ev) ?? ev;
  const ocupantes = new Map();
  for (const ev of eventos) ocupantes.set(ev.t, (ocupantes.get(ev.t) ?? new Set()).add(ocupa(ev)));
  const cuantos = new Map([...ocupantes].map(([t, lista]) => [t, lista.size]));
  // La línea parte en el primer evento (no en el inicio del primer período): así se ve desde el comienzo.
  const primero = Math.min(...cuantos.keys());
  const tiempos = [...new Set([...cuantos.keys(), ...periodos.map((p) => p.inicio), hoy])].filter((t) => t >= primero).sort((a, b) => a - b);
  const anclas = [];
  let u = 0;
  tiempos.forEach((t, i) => {
    const n = cuantos.get(t) ?? 0;
    anclas.push({ t, u, n });
    u += n;
    if (i < tiempos.length - 1) u += 1.2 * Math.log10(1 + (tiempos[i + 1] - t) / 5);
  });

  // Ranura de un instante: el inicio de su ancla o un punto del tramo de tiempo entre dos anclas.
  function uDe(t) {
    let lo = 0;
    let hi = anclas.length - 1;
    if (t <= anclas[lo].t) return anclas[lo].u;
    if (t >= anclas[hi].t) return anclas[hi].u;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (anclas[m].t <= t) lo = m;
      else hi = m;
    }
    const a = anclas[lo];
    const b = anclas[hi];
    if (t === a.t) return a.u;
    const desde = a.u + a.n;
    return desde + ((t - a.t) / (b.t - a.t)) * (b.u - desde);
  }

  const orden = new Map();
  const ranura = new Map();
  for (const ev of eventos) {
    const o = ocupa(ev);
    if (!ranura.has(o)) {
      const j = orden.get(ev.t) ?? 0;
      orden.set(ev.t, j + 1);
      ranura.set(o, uDe(ev.t) + j);
    }
    ev.u = ranura.get(o);
    ev.uFin = ev.tFin === null ? null : uDe(ev.tFin);
  }
  return { anclas, uDe, hoy, total: u };
}

// Franjas por período, en ranuras. El límite entre dos períodos va entre el último evento del anterior y el
// primero del siguiente (no en el año de cambio), así cada evento cae en la franja de su período.
function calcularFranjas(periodos, eventos, escala) {
  const orden = [...periodos].sort((a, b) => a.inicio - b.inicio);
  const limites = orden.slice(1).map((p, i) => {
    const previos = eventos.filter((ev) => ev.periodoId === orden[i].id).map((ev) => ev.u);
    const propios = eventos.filter((ev) => ev.periodoId === p.id && ev.t >= p.inicio).map((ev) => ev.u);
    const fin = Math.max(...previos);
    const inicio = Math.min(...propios);
    return previos.length && propios.length && fin < inicio ? (fin + inicio) / 2 : escala.uDe(p.inicio);
  });
  return orden.map((periodo, i) => ({ periodo, desde: i ? limites[i - 1] : -Infinity, hasta: limites[i] ?? Infinity }));
}

// Años candidatos a etiqueta en el eje, con prioridad según lo «redondo» que es el año. Los de paso fino
// (cada 1, 5, 10 o 50 años) guardan `du`, lo que mide su paso en ranuras: solo se muestran donde la escala
// alcanza para esa precisión (así no aparece «1471» en un tramo comprimido).
function aniosCandidatos(escala) {
  const PASOS = [1000, 500, 100, 50, 10, 5];
  const anios = [];
  // Prehistoria: solo miles redondos a.C.; desde 1400 (los primeros eventos d.C.), cada año.
  for (let a = Math.ceil(escala.anclas[0].t / 1000) * 1000; a < 0; a += 1000) anios.push(a);
  for (let a = 1400; a <= Math.floor(escala.hoy); a++) anios.push(a);
  return anios
    .map((a) => {
      const r = PASOS.findIndex((m) => a % m === 0);
      const prioridad = r < 0 ? 0 : 6 - r;
      const du = prioridad <= 3 ? escala.uDe(a + (PASOS[r] ?? 1)) - escala.uDe(a) : Infinity;
      return { u: escala.uDe(a), du, texto: formatearAnio(a), prioridad };
    })
    .concat({ u: escala.total, du: Infinity, texto: 'Hoy', prioridad: 9 })
    .concat(saltos(escala).map((u) => ({ u, du: Infinity, texto: 'miles de años', prioridad: 10, clase: 'salto' })))
    .sort((a, b) => b.prioridad - a.prioridad);
}

// Ranuras donde la escala salta muchos años sin eventos (centro del tramo entre dos anclas).
const saltos = (escala) =>
  escala.anclas
    .slice(0, -1)
    .map((a, i) => [a, escala.anclas[i + 1]])
    .filter(([a, b]) => b.t - a.t >= SALTO_ANIOS)
    .map(([a, b]) => (a.u + a.n + b.u) / 2);

const mitadEtiqueta = (texto, rem) => (texto.length * 0.3 + 0.5) * rem;

// De mayor a menor prioridad, elige las etiquetas que caben sin encimarse (ancho estimado por caracteres).
function elegirEtiquetas(candidatos, aPx, rem, [minX, maxX] = [-Infinity, Infinity]) {
  const puestas = [];
  for (const c of candidatos) {
    const x = aPx(c.u);
    const mitad = mitadEtiqueta(c.texto, rem);
    if (x - mitad < minX || x + mitad > maxX) continue;
    let lo = 0;
    let hi = puestas.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (puestas[m].x < x) lo = m + 1;
      else hi = m;
    }
    const izq = puestas[lo - 1];
    const der = puestas[lo];
    if ((izq && x - izq.x < izq.mitad + mitad) || (der && der.x - x < der.mitad + mitad)) continue;
    puestas.splice(lo, 0, { x, mitad, texto: c.texto, clase: c.clase });
  }
  return puestas;
}

// Carriles de tarjetas: intervalos [inicio, fin] ordenados y sin traslape.
function libreDesde(carril, x, ancho, hueco) {
  for (const [a, b] of carril) {
    if (b + hueco <= x) continue;
    if (a >= x + ancho + hueco) break;
    x = b + hueco;
  }
  return x;
}

function libreHasta(carril, x, ancho, hueco) {
  for (let i = carril.length - 1; i >= 0; i--) {
    const [a, b] = carril[i];
    if (a >= x + ancho + hueco) continue;
    if (b + hueco <= x) break;
    x = a - hueco - ancho;
  }
  return x;
}

const tarjeta = (ev, color) => {
  const { archivo } = ev.imagen;
  return `
    <li class="evento imp-${ev.importancia}" data-id="${ev.id}" style="--color:${color}" hidden>
      <button type="button" class="tarjeta" tabindex="-1" aria-label="${esc(`${ev.fechaTexto}: ${ev.titulo}`)}">
        <span class="tarjeta-img"><img src="${urlImagen(archivo, 120)}" srcset="${urlImagen(archivo, 120)} 120w, ${urlImagen(archivo, 250)} 250w"
          sizes="6rem" alt="" loading="lazy" decoding="async" draggable="false" data-periodo="${ev.periodoId}"></span>
        <span class="tarjeta-texto"><span class="tarjeta-fecha">${esc(fechaCorta(ev))}</span><span class="tarjeta-titulo">${esc(ev.titulo)}</span></span>
      </button>
    </li>`;
};

// Tarjeta de un grupo: mosaico con las primeras cuatro imágenes y la cantidad de eventos que reúne.
const tarjetaGrupo = (grupo, color) => `
    <li class="evento grupo" data-id="${grupo.clave}" style="--color:${color}" hidden>
      <button type="button" class="tarjeta" tabindex="-1">
        <span class="tarjeta-img mosaico">${grupo.eventos
          .slice(0, 4)
          .map((ev) => `<img src="${urlImagen(ev.imagen.archivo, 120)}" alt="" loading="lazy" decoding="async" draggable="false" data-periodo="${ev.periodoId}">`)
          .join('')}</span>
        <span class="tarjeta-texto"><span class="tarjeta-fecha">${esc(fechaCorta(grupo.eventos[0]))}</span><span class="tarjeta-titulo">${esc(grupo.titulo)}</span><span class="tarjeta-cuenta"></span></span>
      </button>
    </li>`;

/**
 * Crea la línea de tiempo dentro de `seccion` y el minimapa (con los botones de zoom) en `contenedorMinimapa`.
 * Llama a alAbrir(evento o grupo) al elegir una tarjeta y a alCambiar() cuando cambia la selección, el zoom o el filtro.
 */
export function crearLineaDeTiempo(seccion, contenedorMinimapa, { eventos, periodos, grupos = [], alAbrir, alCambiar, anunciar }) {
  // Grupos (data/grupos.json): eventos de una misma fecha que se muestran en una sola tarjeta, como
  // «Pueblos que vivían aquí», en una sola ranura y con un solo punto. Si un filtro deja solo uno, ese
  // evento vuelve a tener su tarjeta propia.
  const grupoDe = new Map(grupos.flatMap((grupo) => grupo.eventos.map((ev) => [ev, grupo])));
  const escala = crearEscala(eventos, periodos, grupoDe);
  const franjas = calcularFranjas(periodos, eventos, escala);
  const candidatosAnio = aniosCandidatos(escala);
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const colorDe = new Map(periodos.map((p) => [p.id, p.color]));
  const enRanura = (u) => `${(limitar(u / escala.total, 0, 1) * 100).toFixed(3)}%`;

  for (const grupo of grupos) {
    Object.assign(grupo, { esGrupo: true, clave: `grupo:${grupo.id}`, uFin: null, pos: null, periodoId: grupo.eventos[0].periodoId, fechaTexto: grupo.eventos[0].fechaTexto });
    porId.set(grupo.clave, grupo);
  }
  const clave = (item) => item.clave ?? item.id;
  const listaTarjetas = () => {
    const puestos = new Set();
    return eventos
      .map((ev) => {
        const grupo = grupoDe.get(ev);
        const antes = grupo && !puestos.has(grupo) ? tarjetaGrupo(grupo, colorDe.get(grupo.periodoId)) : '';
        if (grupo) puestos.add(grupo);
        return antes + tarjeta(ev, colorDe.get(ev.periodoId));
      })
      .join('');
  };

  // El «cielo» es el espacio libre sobre los carriles: muestra la cartela del período que está al centro
  // (y, al comienzo, el botón para empezar a leer). Queda fijo mientras la línea se desplaza.
  seccion.insertAdjacentHTML(
    'beforeend',
    `<div class="cielo" hidden>
      <div class="cartela">
        <div class="cartela-info">
          <p class="cartela-orden"></p>
          <p class="cartela-fila"><span class="cartela-nombre"></span> <span class="cartela-fechas"></span></p>
          <p class="cartela-desc"></p>
        </div>
        <div class="cartela-acciones" hidden>
          <button type="button" class="boton primario cartela-empezar">Empezar a leer <span aria-hidden="true">▶</span></button>
          <a class="boton" href="#historias">Elegir una historia</a>
        </div>
      </div>
    </div>
    <div class="ventana">
      <div class="pista">
        <svg class="conectores" aria-hidden="true"><path /></svg>
        <div class="franjas">${franjas
          .map(
            ({ periodo: p }) => `<div class="franja" style="--color:${p.color}"><button type="button" class="franja-nombre" data-periodo="${p.id}"
              tabindex="-1">${esc(p.nombre)}<span class="franja-fechas">${esc(p.fechasTexto)}</span></button></div>`,
          )
          .join('')}</div>
        <div class="anios" aria-hidden="true"></div>
        <div class="eje" aria-hidden="true"><div class="eje-linea"></div><span class="tramo" hidden></span>${saltos(escala)
          .map((u) => `<span class="salto-marca" data-u="${u}"></span>`)
          .join('')}${eventos
          .map((ev) => `<span class="punto imp-${ev.importancia}" data-id="${ev.id}" style="--color:${colorDe.get(ev.periodoId)}" title="${esc(ev.titulo)}" hidden></span>`)
          .join('')}</div>
        <ol class="eventos" aria-label="Eventos en orden cronológico">${listaTarjetas()}</ol>
      </div>
    </div>`,
  );
  contenedorMinimapa.innerHTML = `
    <button type="button" class="boton zoom" data-zoom="-1" aria-label="Alejar: ver menos eventos" title="Alejar (−)"><span aria-hidden="true">−</span></button>
    <div class="minimapa" role="slider" tabindex="0" aria-label="Minimapa: posición en la historia" aria-valuemin="0" aria-valuemax="100">
      <div class="minimapa-barra">${franjas
        .map((fr) => {
          const desde = Number.isFinite(fr.desde) ? fr.desde : 0;
          const hasta = Number.isFinite(fr.hasta) ? fr.hasta : escala.total;
          return `<span class="minimapa-periodo" style="left:${enRanura(desde)};width:${enRanura(hasta - desde)};--color:${fr.periodo.color}" title="${esc(fr.periodo.nombre)}"></span>`;
        })
        .join('')}${eventos.map((ev) => `<span class="minimapa-marca" data-id="${ev.id}" style="left:${enRanura(ev.u)}"></span>`).join('')}</div>
      <div class="minimapa-marco"></div>
      <div class="minimapa-anios" aria-hidden="true"></div>
    </div>
    <button type="button" class="boton zoom" data-zoom="1" aria-label="Acercar: ver más eventos" title="Acercar (+)"><span aria-hidden="true">+</span></button>`;

  const cielo = seccion.querySelector('.cielo');
  const cartela = cielo.querySelector('.cartela');
  const acciones = cielo.querySelector('.cartela-acciones');
  const empezar = acciones.querySelector('.cartela-empezar');
  const ventana = seccion.querySelector('.ventana');
  const pista = ventana.querySelector('.pista');
  const elSaltos = [...pista.querySelectorAll('.salto-marca')];
  const svg = pista.querySelector('.conectores');
  const camino = svg.querySelector('path');
  const capaAnios = pista.querySelector('.anios');
  const tramo = pista.querySelector('.tramo');
  const lista = pista.querySelector('.eventos');
  const estadoVista = seccion.querySelector('.estado-vista');
  const elFranjas = [...pista.querySelectorAll('.franja')];
  const elTarjeta = new Map([...lista.children].map((li) => [li.dataset.id, li]));
  const elPunto = new Map([...pista.querySelectorAll('.punto')].map((el) => [el.dataset.id, el]));
  const minimapa = contenedorMinimapa.querySelector('.minimapa');
  const barra = minimapa.querySelector('.minimapa-barra');
  const marco = minimapa.querySelector('.minimapa-marco');
  const aniosMinimapa = minimapa.querySelector('.minimapa-anios');
  const elMarca = new Map([...barra.querySelectorAll('.minimapa-marca')].map((el) => [el.dataset.id, el]));
  const [botonAlejar, botonAcercar] = contenedorMinimapa.querySelectorAll('[data-zoom]');

  let f = ZOOM.inicial;
  let visibles = eventos;
  let enFiltro = new Set(eventos);
  let items = eventos; // lo que puede tener tarjeta: los eventos visibles, con cada grupo en lugar de sus eventos
  let filtroActivo = false;
  let actual = null;
  let enfocable = null;
  const g = { rem: 18, w: 0, h: 0, hueco: 0, tallo: 0, z: 1, carriles: 1, margenIzq: 0, ejeY: 0, ancho: 0, minImp: 2 };
  const X = (u) => g.margenIzq + u * g.z;
  const uEn = (x) => (x - g.margenIzq) / g.z;
  const botonDe = (item) => elTarjeta.get(clave(item)).querySelector('.tarjeta');
  const puntoDe = (item) => elPunto.get(item.esGrupo ? item.punto.id : item.id);

  // Un grupo reemplaza a sus eventos si el filtro deja dos o más; en el eje queda solo el punto del primero.
  let puntosOcultos = new Set();
  function armarItems() {
    const quedan = new Map();
    puntosOcultos = new Set();
    for (const grupo of grupos) {
      const lista = grupo.eventos.filter((ev) => enFiltro.has(ev));
      for (const ev of grupo.eventos) elPunto.get(ev.id).title = ev.titulo;
      if (lista.length < 2) continue;
      for (const ev of lista.slice(1)) puntosOcultos.add(ev);
      elPunto.get(lista[0].id).title = grupo.titulo;
      quedan.set(grupo, lista);
      Object.assign(grupo, { u: lista[0].u, punto: lista[0], importancia: Math.max(...lista.map((ev) => ev.importancia)) });
      const li = elTarjeta.get(grupo.clave);
      li.className = `evento grupo imp-${grupo.importancia}${li.classList.contains('actual') ? ' actual' : ''}`;
      li.querySelector('.tarjeta-cuenta').textContent = `${lista.length} ${grupo.miembros}`;
      botonDe(grupo).setAttribute('aria-label', `${grupo.fechaTexto}: ${grupo.titulo} (${lista.length} ${grupo.miembros})`);
    }
    items = visibles.flatMap((ev) => {
      const grupo = grupoDe.get(ev);
      if (!quedan.has(grupo)) return [ev];
      return quedan.get(grupo)[0] === ev ? [grupo] : [];
    });
  }
  armarItems();

  // ---- Distribución: tamaños, carriles, tarjetas, eje, años, franjas y minimapa ----
  function distribuir() {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 18;
    const alto = ventana.clientHeight;
    Object.assign(g, {
      rem,
      // En pantallas angostas con texto grande, la tarjeta no puede ser más ancha que la vista.
      w: Math.min(MEDIDA.tarjetaAncho * rem, ventana.clientWidth - 2 * MEDIDA.margen * rem),
      h: MEDIDA.tarjetaAlto * rem,
      hueco: MEDIDA.hueco * rem,
      tallo: MEDIDA.tallo * rem,
      margenIzq: 2 * MEDIDA.margen * rem,
    });
    const yFranjas = alto - MEDIDA.franjas * rem;
    const yAnios = yFranjas - MEDIDA.anios * rem;
    g.ejeY = yAnios - (MEDIDA.eje * rem) / 2;
    const base = yAnios - MEDIDA.eje * rem - g.hueco; // borde inferior del carril más bajo
    const fila = g.h + g.hueco;
    g.carriles = limitar(Math.floor((base - MEDIDA.arriba * rem + g.hueco) / fila), 1, MAX_CARRILES);
    // Si el cielo no alcanza para la cartela y sobran carriles, se cede uno (en pantallas angostas,
    // donde solo cabe una tarjeta a lo ancho, también con tres carriles).
    const minimo = ventana.clientWidth < 2 * g.w ? 3 : 4;
    if (g.carriles >= minimo && base - g.carriles * fila + g.hueco < CARTELA.completa * rem) g.carriles--;
    g.z = (f * (g.w + g.hueco)) / g.carriles;
    ubicarCielo(base - g.carriles * fila + g.hueco, rem);
    g.minImp = filtroActivo ? 1 : f < ZOOM.hitos ? 3 : f < ZOOM.todos ? 2 : 1;
    const yCarril = (c) => base - g.h - c * (g.h + g.hueco);

    colocarTarjetas(yCarril);
    const finTarjetas = items.reduce((max, ev) => (ev.pos ? Math.max(max, ev.pos.x + g.w) : max), 0);
    g.ancho = Math.ceil(Math.max(X(escala.total) + g.w, finTarjetas) + MEDIDA.margen * rem);
    pista.style.width = `${g.ancho}px`;
    pista.style.setProperty('--tarjeta-ancho', `${g.w}px`);
    pista.style.setProperty('--y-eje', `${g.ejeY}px`);
    pista.style.setProperty('--y-anios', `${yAnios}px`);
    pista.style.setProperty('--y-franjas', `${yFranjas}px`);

    dibujarEventos();
    dibujarConectores(alto);
    for (const el of elSaltos) el.style.transform = `translateX(${X(Number(el.dataset.u)).toFixed(1)}px)`;
    const aptos = candidatosAnio.filter((c) => c.du * g.z >= 2 * mitadEtiqueta(c.texto, rem));
    capaAnios.innerHTML = elegirEtiquetas(aptos, X, rem)
      .map(({ x, texto, clase }) => `<span class="anio${clase ? ` ${clase}` : ''}" style="transform:translateX(${x.toFixed(1)}px)">${texto}</span>`)
      .join('');
    franjas.forEach((fr, i) => {
      const izq = Number.isFinite(fr.desde) ? X(fr.desde) : 0;
      const der = Number.isFinite(fr.hasta) ? X(fr.hasta) : g.ancho;
      Object.assign(elFranjas[i].style, { left: `${izq}px`, width: `${Math.max(0, der - izq)}px` });
    });
    mostrarTramo();
    actualizarTabindex();
    actualizarMinimapa();
    estadoVista.textContent = VISTA[g.minImp];
    estadoVista.hidden = filtroActivo;
    botonAlejar.setAttribute('aria-disabled', String(f <= ZOOM.min));
    botonAcercar.setAttribute('aria-disabled', String(f >= ZOOM.max));
  }

  // Coloca primero los hitos y luego el resto; cada tarjeta va en el carril donde menos se aleja de su
  // fecha (poco hacia la izquierda, algo más hacia la derecha), con preferencia por los carriles bajos.
  // Con un filtro activo quedan pocos eventos y hay espacio: pueden correrse más. Si no cabe, queda el punto.
  function colocarTarjetas(yCarril) {
    const { w, hueco, tallo } = g;
    const carriles = Array.from({ length: g.carriles }, () => [[0, MEDIDA.margen * g.rem - hueco]]);
    const maxDer = (filtroActivo ? 2.5 : 0.8) * (w + hueco);
    const maxIzq = 0.3 * (w + hueco);
    for (const item of [...eventos, ...grupos]) item.pos = null;
    const candidatos = items.filter((ev) => ev.importancia >= g.minImp).sort((a, b) => b.importancia - a.importancia || a.u - b.u);
    for (const ev of candidatos) {
      const deseado = X(ev.u) - tallo;
      let mejor = null;
      carriles.forEach((carril, c) => {
        for (const x of [libreDesde(carril, deseado, w, hueco), libreHasta(carril, deseado, w, hueco)]) {
          const d = x - deseado;
          if (d > maxDer || d < -maxIzq) continue;
          const costo = (d < 0 ? -2 * d : d) + c * 0.15 * (w + hueco);
          if (!mejor || costo < mejor.costo) mejor = { c, x, costo };
        }
      });
      if (!mejor) continue;
      const carril = carriles[mejor.c];
      const i = carril.findIndex(([a]) => a > mejor.x);
      carril.splice(i < 0 ? carril.length : i, 0, [mejor.x, mejor.x + w]);
      ev.pos = { x: mejor.x, y: yCarril(mejor.c) };
    }
  }

  function dibujarEventos() {
    for (const ev of eventos) {
      const li = elTarjeta.get(ev.id);
      const punto = elPunto.get(ev.id);
      li.hidden = !ev.pos;
      if (ev.pos) li.style.transform = `translate(${ev.pos.x.toFixed(1)}px, ${ev.pos.y.toFixed(1)}px)`;
      punto.hidden = !enFiltro.has(ev) || puntosOcultos.has(ev);
      punto.style.transform = `translateX(${X(ev.u).toFixed(1)}px)`;
      punto.classList.toggle('sin-tarjeta', !ev.pos);
      elMarca.get(ev.id).hidden = !enFiltro.has(ev);
    }
    for (const grupo of grupos) {
      const li = elTarjeta.get(grupo.clave);
      li.hidden = !grupo.pos;
      if (grupo.pos) li.style.transform = `translate(${grupo.pos.x.toFixed(1)}px, ${grupo.pos.y.toFixed(1)}px)`;
    }
  }

  // Línea de cada tarjeta a su punto: baja vertical y, si la tarjeta se corrió, termina en diagonal.
  function dibujarConectores(alto) {
    const { h, tallo, ejeY, rem } = g;
    let d = '';
    for (const ev of items) {
      if (!ev.pos) continue;
      const sx = ev.pos.x + tallo;
      const px = X(ev.u);
      const sy = (ev.pos.y + h).toFixed(1);
      d += Math.abs(sx - px) < 1
        ? `M${px.toFixed(1)} ${sy}V${ejeY.toFixed(1)}`
        : `M${sx.toFixed(1)} ${sy}V${(ejeY - 0.75 * rem).toFixed(1)}L${px.toFixed(1)} ${ejeY.toFixed(1)}`;
    }
    svg.setAttribute('width', g.ancho);
    svg.setAttribute('height', alto);
    camino.setAttribute('d', d);
  }

  // Barra sobre el eje con la duración del evento actual, si es un proceso (fechaFin).
  function mostrarTramo() {
    tramo.hidden = !(actual && actual.uFin !== null && enFiltro.has(actual));
    if (tramo.hidden) return;
    const a = X(actual.u);
    Object.assign(tramo.style, { left: `${a}px`, width: `${Math.max(X(actual.uFin) - a, 0)}px` });
    tramo.style.setProperty('--color', colorDe.get(actual.periodoId));
  }

  // ---- Cielo: cartela del período al centro de la vista ----
  function ubicarCielo(alto, rem) {
    const modo = alto >= CARTELA.completa * rem ? 'completa' : alto >= CARTELA.corta * rem ? 'corta' : '';
    cielo.hidden = !modo;
    cielo.dataset.modo = modo;
    Object.assign(cielo.style, { top: `${ventana.offsetTop}px`, height: `${alto}px` });
  }

  let periodoCartela = null;
  function mostrarCartela(periodo) {
    // Al comienzo de la línea (sin filtro): empezar por el primer evento o elegir una historia guiada.
    acciones.hidden = filtroActivo || ventana.scrollLeft > ventana.clientWidth / 3;
    if (periodo === periodoCartela) return;
    periodoCartela = periodo;
    const n = franjas.findIndex((fr) => fr.periodo === periodo) + 1;
    cartela.style.setProperty('--color', periodo.color);
    cartela.querySelector('.cartela-orden').textContent = `Período ${n} de ${franjas.length} · ${periodo.fechasTexto}`;
    cartela.querySelector('.cartela-nombre').textContent = periodo.nombre;
    cartela.querySelector('.cartela-fechas').textContent = periodo.fechasTexto;
    cartela.querySelector('.cartela-desc').textContent = periodo.descripcion;
  }

  // ---- Minimapa ----
  function actualizarMinimapa() {
    const a = limitar(uEn(ventana.scrollLeft) / escala.total, 0, 1);
    const b = limitar(uEn(ventana.scrollLeft + ventana.clientWidth) / escala.total, 0, 1);
    marco.style.left = `${a * 100}%`;
    marco.style.width = `${(b - a) * 100}%`;
    const centro = ((a + b) / 2) * escala.total;
    const { periodo } = franjas.find((fr) => centro < fr.hasta) ?? franjas.at(-1);
    minimapa.setAttribute('aria-valuenow', String(Math.round(((a + b) / 2) * 100)));
    minimapa.setAttribute('aria-valuetext', `${periodo.nombre}, ${periodo.fechasTexto}`);
    mostrarCartela(periodo);
  }

  // Barra con los períodos y la posición de un evento, un grupo o varios eventos (para el detalle).
  function regla(marcas) {
    const segmentos = franjas
      .map((fr) => {
        const desde = Number.isFinite(fr.desde) ? fr.desde : 0;
        const hasta = Number.isFinite(fr.hasta) ? fr.hasta : escala.total;
        return `<span class="regla-periodo" style="left:${enRanura(desde)};width:${enRanura(hasta - desde)};--color:${fr.periodo.color}"></span>`;
      })
      .join('');
    return `<div class="regla" aria-hidden="true"><span class="regla-extremo">${formatearAnio(Math.floor(escala.anclas[0].t / 1000) * 1000)}</span>
      <span class="regla-barra">${segmentos}${tramoDe([].concat(marcas))}</span><span class="regla-extremo">Hoy</span></div>`;
  }

  // Una marca para un evento; para varios (la ficha de un personaje), un tramo de la primera a la última.
  function tramoDe(lista) {
    const desde = Math.min(...lista.map((ev) => ev.u));
    const hasta = Math.max(...lista.map((ev) => ev.u));
    if (lista.length === 1 || hasta === desde) return `<span class="regla-marca" style="left:${enRanura(desde)}"></span>`;
    return `<span class="regla-tramo" style="left:${enRanura(desde)};width:${enRanura(hasta - desde)}"></span>`;
  }

  function etiquetarMinimapa() {
    const ancho = barra.clientWidth;
    const candidatos = [[2000, 4], [1900, 4], [1800, 4], [1500, 4], [1700, 3], [1600, 3], [1850, 2], [1950, 2], [-12000, 2], [-8000, 1], [-4000, 1]]
      .map(([a, prioridad]) => ({ u: escala.uDe(a), texto: formatearAnio(a), prioridad }))
      .sort((a, b) => b.prioridad - a.prioridad);
    aniosMinimapa.innerHTML = elegirEtiquetas(candidatos, (u) => (u / escala.total) * ancho, g.rem, [0, ancho])
      .map(({ x, texto }) => `<span class="minimapa-anio" style="left:${((x / ancho) * 100).toFixed(2)}%">${texto}</span>`)
      .join('');
  }

  // ---- Selección y navegación ----
  const enVista = (ev) => Boolean(ev?.pos) && ev.pos.x + g.w > ventana.scrollLeft && ev.pos.x < ventana.scrollLeft + ventana.clientWidth;

  function centrarEn(ev, suave = true) {
    const x = ev.pos ? ev.pos.x + g.w / 2 : X(ev.u);
    ventana.scrollTo({ left: x - ventana.clientWidth / 2, behavior: suave ? conducta() : 'auto' });
  }

  // Solo una tarjeta entra en el orden de Tab (la actual o la primera a la vista); las flechas recorren el resto.
  function actualizarTabindex() {
    const izq = ventana.scrollLeft;
    const objetivo = actual?.pos ? actual : (items.find((ev) => ev.pos && ev.pos.x + g.w > izq) ?? items.find((ev) => ev.pos));
    const boton = objetivo ? botonDe(objetivo) : null;
    if (enfocable && enfocable !== boton) enfocable.tabIndex = -1;
    enfocable = boton;
    if (boton) boton.tabIndex = 0;
  }

  // Elegir un evento que está dentro de un grupo elige la tarjeta del grupo.
  function seleccionar(ev, { enfocar = false, centrar = true, suave = true, anunciarlo = false } = {}) {
    const grupo = grupoDe.get(ev);
    if (grupo && items.includes(grupo)) ev = grupo;
    if (actual) {
      elTarjeta.get(clave(actual)).classList.remove('actual');
      puntoDe(actual).classList.remove('actual');
    }
    actual = ev;
    if (ev) {
      elTarjeta.get(clave(ev)).classList.add('actual');
      puntoDe(ev).classList.add('actual');
      if (centrar) centrarEn(ev, suave);
      if (anunciarlo) anunciar(`${ev.fechaTexto}: ${ev.titulo}`);
    }
    mostrarTramo();
    actualizarTabindex();
    if (ev && enfocar && ev.pos) enfocable.focus({ preventScroll: true });
    alCambiar();
  }

  // Evento con tarjeta antes (-1) o después (1) del dado; sin evento dado, el primero o el último a la vista.
  function vecinoConTarjeta(dir, desde = actual) {
    const i = desde ? items.indexOf(desde) : -1;
    if (i >= 0) return (dir > 0 ? items.slice(i + 1).find((ev) => ev.pos) : items.slice(0, i).findLast((ev) => ev.pos)) ?? null;
    const izq = ventana.scrollLeft;
    const der = izq + ventana.clientWidth;
    return (dir > 0 ? items.find((ev) => ev.pos && ev.pos.x >= izq) : items.findLast((ev) => ev.pos && ev.pos.x + g.w <= der)) ?? null;
  }

  // Si el foco está en una tarjeta, pasa a la nueva (Enter abre siempre la que está elegida).
  function mover(dir) {
    const ev = vecinoConTarjeta(dir);
    if (ev) seleccionar(ev, { anunciarlo: true, enfocar: lista.contains(document.activeElement) });
    else anunciar(dir > 0 ? 'Llegaste al último evento.' : 'Este es el primer evento.');
  }

  function inicio() {
    seleccionar(null);
    ventana.scrollTo({ left: 0, behavior: conducta() });
    anunciar('Inicio de la línea de tiempo.');
  }

  // Con `enfocar` (al llegar desde la portada), queda elegida y con el foco la primera tarjeta del período.
  function irAPeriodo(id, { suave = true, enfocar = false } = {}) {
    const fr = franjas.find((x) => x.periodo.id === id);
    seleccionar(null);
    ventana.scrollTo({ left: (Number.isFinite(fr.desde) ? X(fr.desde) : g.margenIzq) - g.rem, behavior: suave ? conducta() : 'auto' });
    anunciar(`Período: ${fr.periodo.nombre}, ${fr.periodo.fechasTexto}.`);
    const primera = enfocar ? items.find((ev) => ev.pos && ev.periodoId === id) : null;
    if (primera) seleccionar(primera, { centrar: false, enfocar: true });
  }

  // ---- Zoom (alrededor de un punto de la ventana, para no perder lo que se mira) ----
  function zoomEn(nuevo, ancla = ventana.clientWidth / 2) {
    nuevo = limitar(nuevo, ZOOM.min, ZOOM.max);
    if (Math.abs(nuevo - f) < 1e-6) return;
    const u = uEn(ventana.scrollLeft + ancla);
    const antes = g.minImp;
    f = nuevo;
    distribuir();
    ventana.scrollLeft = X(u) - ancla;
    if (g.minImp !== antes) anunciar(VISTA[g.minImp]);
    alCambiar();
  }

  // El zoom se apoya en el evento actual o, si no hay, en la zona de la vista con más eventos (no en un
  // tramo vacío): así al acercar aparecen ahí los eventos nuevos en vez de quedar la pantalla vacía.
  function anclaDeZoom() {
    const izq = ventana.scrollLeft;
    const ancho = ventana.clientWidth;
    const enVista = (x) => x >= 0 && x <= ancho;
    if (actual && enVista(X(actual.u) - izq)) return X(actual.u) - izq;
    const xs = visibles.map((ev) => X(ev.u) - izq).filter(enVista);
    let mejor = null;
    for (const x of xs) {
      const puntaje = xs.filter((y) => Math.abs(y - x) <= ancho / 4).length - Math.abs(x - ancho / 2) / ancho;
      if (!mejor || puntaje > mejor.puntaje) mejor = { x, puntaje };
    }
    return mejor?.x ?? ancho / 2;
  }

  // El zoom no se anima: con View Transitions no llegaba a 50 fps con la CPU frenada 4× (docs/PLAN_MEJORAS.md).
  // Las tarjetas que aparecen entran con un fundido (styles.css).
  const zoom = (dir) => zoomEn(f * ZOOM.paso ** dir, anclaDeZoom());

  // Entrada de la portada: el eje se dibuja de izquierda a derecha, los puntos aparecen a su paso y las
  // tarjetas a la vista suben. Dura menos de 400 ms y no bloquea nada (la línea se puede usar de inmediato).
  function entrada() {
    if (movimientoReducido()) return;
    const izq = ventana.scrollLeft;
    const ancho = ventana.clientWidth;
    const fraccion = (x) => limitar(x / g.ancho, 0, 1);
    seccion.classList.add('entrando');
    const animaciones = [
      animar(pista.querySelector('.eje-linea'), [{ scale: `${fraccion(izq)} 1` }, { scale: `${fraccion(izq + ancho)} 1`, offset: 0.999 }, { scale: '1 1' }], {
        duration: 350,
        easing: CURVA,
      }),
      animar(capaAnios, [{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay: 100, fill: 'backwards' }),
      animar(cielo, [{ opacity: 0, translate: '0 -0.5rem' }, { opacity: 1, translate: '0 0' }], { duration: 300, easing: CURVA, fill: 'backwards' }),
    ];
    for (const ev of visibles) {
      const x = X(ev.u) - izq;
      const punto = elPunto.get(ev.id);
      if (x < 0 || x > ancho || punto.hidden) continue;
      animaciones.push(animar(punto, [{ opacity: 0 }, { opacity: 1 }], { duration: 100, delay: (x / ancho) * 280, fill: 'backwards' }));
    }
    items
      .filter(enVista)
      .sort((a, b) => a.pos.x - b.pos.x)
      .forEach((ev, i) => {
        const cuadros = [{ opacity: 0, translate: '0 1rem' }, { opacity: 1, translate: '0 0' }];
        animaciones.push(animar(elTarjeta.get(clave(ev)), cuadros, { duration: 300, delay: Math.min(i, 6) * 15, easing: CURVA, fill: 'backwards' }));
      });
    Promise.all(animaciones.map((a) => a?.finished)).finally(() => seccion.classList.remove('entrando'));
  }

  // La imagen grande del detalle se pide al presionar una tarjeta (o con Enter), un instante antes del clic.
  const precargadas = new Set();
  function precargar(ev) {
    if (!ev?.imagen || precargadas.has(ev.id)) return;
    precargadas.add(ev.id);
    new Image().src = urlImagen(ev.imagen.archivo, 800);
  }

  let zoomPendiente = null;
  function pedirZoom(factor, ancla) {
    if (!zoomPendiente) {
      requestAnimationFrame(() => {
        const { nuevo, ancla: a } = zoomPendiente;
        zoomPendiente = null;
        zoomEn(nuevo, a);
      });
    }
    zoomPendiente = { nuevo: (zoomPendiente?.nuevo ?? f) * factor, ancla };
  }

  // ---- Eventos del usuario ----
  const eventoDe = (el) => porId.get(el.closest('[data-id]')?.dataset.id);

  lista.addEventListener('click', (e) => {
    const ev = eventoDe(e.target);
    if (!ev) return;
    seleccionar(ev, { centrar: false });
    alAbrir(ev);
  });
  pista.querySelector('.eje').addEventListener('click', (e) => {
    const ev = eventoDe(e.target);
    if (!ev) return;
    const grupo = grupoDe.get(ev);
    seleccionar(ev, { centrar: false });
    alAbrir(grupo && items.includes(grupo) ? grupo : ev);
  });
  pista.querySelector('.franjas').addEventListener('click', (e) => {
    const boton = e.target.closest('.franja-nombre');
    if (boton) irAPeriodo(boton.dataset.periodo);
  });
  empezar.addEventListener('click', () => {
    const ev = items.find((x) => x.pos);
    if (!ev) return;
    seleccionar(ev, { centrar: false });
    alAbrir(ev);
  });

  lista.addEventListener('keydown', (e) => {
    const ev = eventoDe(e.target);
    if (!ev || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'Enter' || e.key === ' ') precargar(ev);
    const accion = {
      ArrowRight: () => vecinoConTarjeta(1, ev),
      ArrowLeft: () => vecinoConTarjeta(-1, ev),
      Home: () => items.find((x) => x.pos),
      End: () => items.findLast((x) => x.pos),
    }[e.key];
    if (!accion) return;
    e.preventDefault();
    const destino = accion();
    if (destino) seleccionar(destino, { enfocar: true });
  });

  // Al enfocar una tarjeta con el teclado, se centra; con el puntero no (no debe pelear con el arrastre).
  let punteroAbajo = false;
  lista.addEventListener('focusin', (e) => {
    const ev = eventoDe(e.target);
    if (ev && ev !== actual) seleccionar(ev, { centrar: !punteroAbajo });
  });

  // Arrastrar con el mouse (en pantallas táctiles el desplazamiento es el nativo del navegador).
  let arrastre = null;
  let evitarClic = false;
  ventana.addEventListener('pointerdown', (e) => {
    punteroAbajo = true;
    // Con el dedo, presionar suele ser el comienzo de un deslizamiento: ahí no se precarga.
    if (e.pointerType !== 'touch') precargar(eventoDe(e.target));
    if (e.pointerType === 'mouse' && e.button === 0) arrastre = { x: e.clientX, inicio: ventana.scrollLeft, id: e.pointerId, movido: false };
  });
  ventana.addEventListener('pointermove', (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const dx = e.clientX - arrastre.x;
    if (!arrastre.movido && Math.abs(dx) < 6) return;
    if (!arrastre.movido) {
      arrastre.movido = true;
      ventana.setPointerCapture(e.pointerId);
      ventana.classList.add('arrastrando');
    }
    ventana.scrollLeft = arrastre.inicio - dx;
  });
  const soltar = () => {
    setTimeout(() => {
      punteroAbajo = false;
    });
    if (!arrastre) return;
    if (arrastre.movido) {
      evitarClic = true;
      setTimeout(() => {
        evitarClic = false;
      });
    }
    ventana.classList.remove('arrastrando');
    arrastre = null;
  };
  ventana.addEventListener('pointerup', soltar);
  ventana.addEventListener('pointercancel', soltar);
  ventana.addEventListener(
    'click',
    (e) => {
      if (!evitarClic) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  // Rueda = zoom; el desplazamiento horizontal del trackpad (o Mayús + rueda) mueve la línea.
  ventana.addEventListener(
    'wheel',
    (e) => {
      if (e.shiftKey || (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY))) return;
      e.preventDefault();
      const delta = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
      pedirZoom(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015)), e.clientX - ventana.getBoundingClientRect().left);
    },
    { passive: false },
  );

  // Pellizco con dos dedos = zoom.
  let pellizco = null;
  const distancia = ([a, b]) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  ventana.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) pellizco = { d: distancia(e.touches), f };
    },
    { passive: true },
  );
  ventana.addEventListener(
    'touchmove',
    (e) => {
      if (!pellizco || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const [a, b] = e.touches;
      const ancla = (a.clientX + b.clientX) / 2 - ventana.getBoundingClientRect().left;
      pedirZoom((pellizco.f * distancia(e.touches)) / pellizco.d / (zoomPendiente?.nuevo ?? f), ancla);
    },
    { passive: false },
  );
  ventana.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pellizco = null;
  });

  let marcoPendiente = false;
  ventana.addEventListener(
    'scroll',
    () => {
      if (marcoPendiente) return;
      marcoPendiente = true;
      requestAnimationFrame(() => {
        marcoPendiente = false;
        actualizarMinimapa();
        actualizarTabindex();
      });
    },
    { passive: true },
  );

  contenedorMinimapa.addEventListener('click', (e) => {
    const boton = e.target.closest('[data-zoom]');
    if (boton && boton.getAttribute('aria-disabled') !== 'true') zoom(Number(boton.dataset.zoom));
  });

  // Minimapa: tocar o arrastrar lleva a ese punto; con el teclado, flechas (media pantalla),
  // Re Pág / Av Pág (período anterior o siguiente) e Inicio / Fin.
  const irAlPuntero = (e) => {
    const r = barra.getBoundingClientRect();
    ventana.scrollLeft = X(limitar((e.clientX - r.left) / r.width, 0, 1) * escala.total) - ventana.clientWidth / 2;
  };
  minimapa.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    minimapa.setPointerCapture(e.pointerId);
    irAlPuntero(e);
  });
  minimapa.addEventListener('pointermove', (e) => {
    if (minimapa.hasPointerCapture(e.pointerId)) irAlPuntero(e);
  });
  minimapa.addEventListener('keydown', (e) => {
    const centro = uEn(ventana.scrollLeft + ventana.clientWidth / 2);
    const i = franjas.findIndex((fr) => centro < fr.hasta);
    const acciones = {
      ArrowRight: () => ventana.scrollBy({ left: ventana.clientWidth / 2, behavior: conducta() }),
      ArrowLeft: () => ventana.scrollBy({ left: -ventana.clientWidth / 2, behavior: conducta() }),
      PageDown: () => irAPeriodo(franjas[Math.min(i + 1, franjas.length - 1)].periodo.id),
      PageUp: () => irAPeriodo(franjas[Math.max(i - 1, 0)].periodo.id),
      Home: () => ventana.scrollTo({ left: 0, behavior: conducta() }),
      End: () => ventana.scrollTo({ left: g.ancho, behavior: conducta() }),
    };
    if (!acciones[e.key]) return;
    e.preventDefault();
    acciones[e.key]();
  });

  // Al cambiar el tamaño de la ventana se recalculan los carriles, manteniendo el centro (o el comienzo).
  function redistribuir() {
    const alComienzo = ventana.scrollLeft < 1;
    const centro = uEn(ventana.scrollLeft + ventana.clientWidth / 2);
    distribuir();
    ventana.scrollLeft = alComienzo ? 0 : X(centro) - ventana.clientWidth / 2;
    etiquetarMinimapa();
  }
  let tamano = '';
  const observador = new ResizeObserver(() => {
    const nuevo = `${ventana.clientWidth}x${ventana.clientHeight}x${barra.clientWidth}`;
    if (nuevo === tamano) return;
    tamano = nuevo;
    redistribuir();
  });
  // La ventana también: la fila de avisos de arriba puede cambiar de alto (al cargar las fuentes o con
  // texto grande) sin que cambie la sección, y el cielo se ubica según la ventana.
  observador.observe(seccion);
  observador.observe(ventana);
  observador.observe(contenedorMinimapa);

  distribuir();
  etiquetarMinimapa();

  return {
    mover,
    inicio,
    irAPeriodo,
    zoom,
    seleccionar,
    redistribuir,
    regla,
    entrada,
    /** Imagen de la tarjeta de un evento si está a la vista (para la transición al detalle); si no, null. */
    miniatura: (ev) => (enVista(ev) ? elTarjeta.get(clave(ev)).querySelector('.tarjeta-img img') : null),
    /** Marca como ya vistos los eventos dados: un punto discreto en la tarjeta y «(ya visto)» en su nombre. */
    marcarVistos(ids) {
      for (const id of ids) {
        const ev = porId.get(id);
        const li = elTarjeta.get(id);
        if (!ev || li.classList.contains('visto')) continue;
        li.classList.add('visto');
        botonDe(ev).setAttribute('aria-label', `${ev.fechaTexto}: ${ev.titulo} (ya visto)`);
      }
    },
    /** Aplica un filtro; si ninguna tarjeta queda a la vista, lleva a la primera que coincide. */
    filtrar(coincide, activo) {
      const centro = uEn(ventana.scrollLeft + ventana.clientWidth / 2);
      visibles = eventos.filter(coincide);
      enFiltro = new Set(visibles);
      filtroActivo = activo;
      armarItems();
      if (actual && !items.includes(actual)) seleccionar(null, { centrar: false });
      distribuir();
      ventana.scrollLeft = X(centro) - ventana.clientWidth / 2;
      const izq = ventana.scrollLeft;
      const der = izq + ventana.clientWidth;
      if (!items.some((ev) => ev.pos && ev.pos.x < der && ev.pos.x + g.w > izq)) {
        const primera = items.find((ev) => ev.pos);
        if (primera) centrarEn(primera, false);
      }
      alCambiar();
    },
    /** Devuelve el foco a la tarjeta actual (o a la primera a la vista) y la centra. */
    enfocarActual() {
      if (actual) centrarEn(actual, false);
      actualizarTabindex();
      enfocable?.focus({ preventScroll: true });
    },
    puedeMover: (dir) => (actual ? Boolean(vecinoConTarjeta(dir)) : items.some((ev) => ev.pos)),
    get visibles() {
      return visibles;
    },
  };
}
