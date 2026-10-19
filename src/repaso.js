// Repaso sin nota (se carga a pedido, al cierre de una historia): cinco preguntas armadas con los datos de sus
// eventos —qué pasó primero, en qué siglo, dónde y quién aparece—, con botones (nada que arrastrar) y la
// respuesta siempre en texto, sin puntaje, rachas ni tiempo. Nunca pregunta quién ganó, ni cifras, ni causas de
// muerte, ni por eventos de temas sensibles (paraRepaso, src/sensibles.js), y como máximo una pregunta por ronda
// es sobre una guerra.
import { esSensible, paraRepaso } from './sensibles.js';
import { esc, icono, normalizar } from './util.js';

const azar = (lista) => {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
};
// «julio de 1738» (no «Julio de 1738») dentro de una oración.
const fecha = (ev) => ev.fechaTexto.charAt(0).toLowerCase() + ev.fechaTexto.slice(1);
const conAnio = (titulo) => /\b\d{4}\b/.test(titulo);
// La respuesta no puede estar en la pregunta: como en titulos-cortos.json, ninguna palabra de 4 letras o más
// (comparando sus 6 primeras) puede estar en las dos.
const raices = (texto) => new Set(normalizar(texto).split(/[^a-z0-9]+/).filter((p) => p.length >= 4).map((p) => p.slice(0, 6)));
const delata = (titulo, respuesta) => {
  const t = raices(titulo);
  return [...raices(respuesta)].some((r) => t.has(r));
};
const slug = (nombre) =>
  normalizar(nombre)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const ROMANOS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const siglo = (anio) => Math.ceil(anio / 100);

// Qué pasó primero: dos eventos de fecha conocida, de años distintos, que no se cruzan (un proceso con otro) y
// cuyos títulos no traen los dos el año; en «Para niños», de períodos distintos.
function orden(eventos, { nino, usados }) {
  const libres = eventos.filter((ev) => !ev.fechaAproximada && !usados.has(ev));
  const solapan = (a, b) => (a.tFin ?? a.t) >= b.t && (b.tFin ?? b.t) >= a.t;
  for (const [a, b] of azar(libres.flatMap((x, i) => libres.slice(i + 1).map((y) => [x, y])))) {
    if (a.anio === b.anio || solapan(a, b) || (conAnio(a.titulo) && conAnio(b.titulo)) || (nino && a.periodoId === b.periodoId)) continue;
    const [primero, despues] = a.t < b.t ? [a, b] : [b, a];
    usados.add(a).add(b);
    return {
      eventos: [a, b],
      texto: '¿Qué pasó primero?',
      opciones: azar([primero, despues]).map((ev) => ({ texto: ev.titulo, correcta: ev === primero })),
      respuesta: `Primero fue «${esc(primero.titulo)}», ${esc(fecha(primero))}, y después «${esc(despues.titulo)}», ${esc(fecha(despues))}.`,
      enlaces: [primero, despues].map((ev) => [`#evento/${ev.id}`, ev.titulo]),
    };
  }
  return null;
}

// En qué siglo: un evento de fecha conocida, después de Cristo, que no pasa de un siglo a otro y cuyo título no
// trae el año. Las opciones son su siglo y los vecinos.
function enQueSiglo(eventos, { usados }) {
  for (const ev of azar(eventos.filter((x) => !x.fechaAproximada && x.anio > 0 && siglo(x.anio) === siglo(x.anioFin) && !conAnio(x.titulo) && !usados.has(x)))) {
    const s = siglo(ev.anio);
    if (s < 2 || s > 21) continue;
    const opciones = s === 21 ? [19, 20, 21] : [s - 1, s, s + 1];
    usados.add(ev);
    return {
      eventos: [ev],
      texto: `¿En qué siglo ocurrió «${ev.titulo}»?`,
      opciones: opciones.map((n) => ({ texto: `Siglo ${ROMANOS[n]}`, correcta: n === s })),
      respuesta: `En el siglo ${ROMANOS[s]}, que va de ${(s - 1) * 100 + 1} a ${s * 100}: «${esc(ev.titulo)}», ${esc(fecha(ev))}.`,
      enlaces: [[`#evento/${ev.id}`, ev.titulo]],
    };
  }
  return null;
}

// Dónde ocurrió: un evento con una sola ubicación, que es un lugar del mapa (si además tuviera una zona o todo
// Chile, un lugar de ahí podría ser parte de lo mismo), y dos lugares de otras regiones, a más de unos 300 km.
function donde(eventos, { lugares, regiones, usados }) {
  const lugarDe = new Map(lugares.map((l) => [l.id, l]));
  const regionDe = new Map(regiones.map((r) => [r.codigo, r]));
  const nombre = (l) => l.corto ?? l.nombre;
  const lejos = (a, b) => a.region !== b.region && Math.hypot(a.lat - b.lat, a.lon - b.lon) > 3;
  for (const ev of azar(eventos.filter((x) => !usados.has(x)))) {
    const l = ev.ubicaciones.length === 1 ? lugarDe.get(ev.ubicaciones[0]) : null;
    if (!l || delata(ev.titulo, nombre(l))) continue;
    const otros = azar(lugares.filter((x) => lejos(x, l) && !delata(ev.titulo, nombre(x)))).slice(0, 2);
    if (otros.length < 2) continue;
    usados.add(ev);
    const en = l.en ?? `en ${nombre(l)}`;
    return {
      eventos: [ev],
      texto: `¿Dónde ocurrió «${ev.titulo}»?`,
      opciones: azar([l, ...otros]).map((x) => ({ texto: nombre(x), correcta: x === l })),
      respuesta: `${esc(en.charAt(0).toUpperCase() + en.slice(1))}${l.aproximado ? '' : `, en la actual ${esc(regionDe.get(l.region)?.nombre ?? '')}`}.`,
      enlaces: [
        [`#evento/${ev.id}`, ev.titulo],
        [`#lugar/${l.id}`, 'Ver en el mapa'],
      ],
    };
  }
  return null;
}

// Quién aparece: una de sus personas y dos de otra época (todos sus eventos a más de 80 años de este: alguien
// de la misma época podría haber estado aunque los datos no lo nombren). Nunca alguien que aparece en un tema
// sensible, ni la persona que nombra el título.
function quien(eventos, { todos, vetados, usados }) {
  const anios = new Map();
  for (const x of todos) for (const n of x.personajes) anios.set(n, [...(anios.get(n) ?? []), x.anio]);
  for (const ev of azar(eventos.filter((x) => x.personajes.length && !usados.has(x)))) {
    const suyos = new Set(ev.personajes.map(normalizar));
    const correcto = azar(ev.personajes).find((n) => !vetados.has(n) && !delata(ev.titulo, n));
    const otraEpoca = (n) => !vetados.has(n) && !suyos.has(normalizar(n)) && !delata(ev.titulo, n) && anios.get(n).every((a) => Math.abs(a - ev.anio) > 80);
    const otros = azar([...anios.keys()].filter(otraEpoca)).slice(0, 2);
    if (!correcto || otros.length < 2) continue;
    usados.add(ev);
    const conFicha = (anios.get(correcto)?.length ?? 0) > 1;
    return {
      eventos: [ev],
      texto: `¿Cuál de estas personas aparece en «${ev.titulo}»?`,
      opciones: azar([correcto, ...otros]).map((n) => ({ texto: n, correcta: n === correcto })),
      respuesta: `${esc(correcto)} aparece en «${esc(ev.titulo)}», ${esc(fecha(ev))}.`,
      enlaces: [[`#evento/${ev.id}`, ev.titulo], ...(conFicha ? [[`#personaje/${slug(correcto)}`, `Ver la ficha de ${correcto}`]] : [])],
    };
  }
  return null;
}

/** Eventos de una historia que pueden entrar al repaso (si son menos de 3, no se ofrece). */
export const aptos = (historia) => historia.filter(paraRepaso);

/**
 * Arma una ronda de hasta cinco preguntas con los eventos de una historia; para las opciones usa todos los
 * eventos, los lugares y las regiones. `nino`: nivel «Para niños».
 */
export function preguntas(historia, { eventos, lugares, regiones, nino = false }) {
  const elegibles = aptos(historia);
  const ctx = {
    nino,
    lugares,
    regiones,
    // Todos los eventos (para saber en qué años aparece cada persona); las personas de temas sensibles, nunca.
    todos: eventos,
    vetados: new Set([...eventos.filter(esSensible).flatMap((ev) => ev.personajes), 'René Schneider']),
    usados: new Set(),
  };
  const ronda = [];
  let guerras = 0;
  for (const armar of azar([orden, orden, enQueSiglo, donde, quien])) {
    // Como máximo una pregunta sobre una guerra: si ya hay una, se arma sin esos eventos.
    const lista = guerras ? elegibles.filter((ev) => !ev.temas.includes('guerra')) : elegibles;
    const p = armar(lista, ctx);
    if (!p) continue;
    if (p.eventos.some((ev) => ev.temas.includes('guerra'))) guerras++;
    ronda.push(p);
  }
  return ronda;
}

/** Pinta la ronda en `contenedor`; cada pregunta se responde una vez y muestra su respuesta. */
export function pintar(contenedor, ronda) {
  const total = ronda.length;
  contenedor.innerHTML = `${ronda
    .map(
      (p, i) => `<fieldset class="pregunta">
        <legend><span class="pregunta-num">Pregunta ${i + 1} de ${total}</span> ${esc(p.texto)}</legend>
        <div class="pregunta-opciones">${p.opciones
          .map((o, j) => `<button type="button" class="boton opcion" data-pregunta="${i}" data-opcion="${j}">${esc(o.texto)}</button>`)
          .join('')}</div>
        <p class="pregunta-respuesta" role="status"></p>
      </fieldset>`,
    )
    .join('')}
    <p class="repaso-fin"><button type="button" class="boton" data-accion="repaso"><span>Otra ronda</span></button></p>`;
  contenedor.onclick = (e) => {
    const b = e.target.closest('.opcion');
    if (!b || b.getAttribute('aria-disabled') === 'true') return;
    const p = ronda[b.dataset.pregunta];
    const elegida = p.opciones[b.dataset.opcion];
    const caja = b.closest('.pregunta');
    for (const otra of caja.querySelectorAll('.opcion')) {
      otra.setAttribute('aria-disabled', 'true');
      if (p.opciones[otra.dataset.opcion].correcta) {
        otra.classList.add('correcta');
        otra.insertAdjacentHTML('afterbegin', icono('visto'));
      }
    }
    b.classList.add('elegida');
    caja.querySelector('.pregunta-respuesta').innerHTML = `<b>${elegida.correcta ? 'Así es.' : 'La respuesta es otra.'}</b> ${p.respuesta}
      <span class="pregunta-enlaces">Ver: ${p.enlaces.map(([href, texto]) => `<a href="${href}">${esc(texto)}</a>`).join(' · ')}</span>`;
  };
}
