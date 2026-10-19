// Portada (#inicio). La bienvenida y las tres puertas están en index.html, para que se vean antes de que
// cargue la app; aquí se completan desde los datos: cifras, créditos de las imágenes, el «¿Sabías que…?»
// del día y los períodos (cada uno lleva a su tramo de la línea de tiempo).
import { curvasDeNivel } from './curvas.js';
import { haceCuanto } from './fechas.js';
import { creditoImagen, esc, icono, movimientoReducido, urlImagen, urlPlaceholder } from './util.js';

/** alElegirPeriodo(id) se llama al elegir un período (en vez de seguir el enlace #linea). */
export function crearInicio(seccion, { eventos, periodos, recorridos, lugares = [], alElegirPeriodo }) {
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  seccion.querySelectorAll('.curvas').forEach(curvasDeNivel);

  // Cifras: index.html trae las de hoy; si cambian los datos, se corrigen aquí.
  const cifras = {
    eventos: String(eventos.length),
    periodos: String(periodos.length),
    historias: String(recorridos.length),
    lugares: String(lugares.length),
    antiguedad: haceCuanto(eventos[0]),
  };
  for (const el of seccion.querySelectorAll('[data-cifra]')) {
    const valor = cifras[el.dataset.cifra];
    if (valor && el.textContent !== valor) el.textContent = valor;
  }

  // Imágenes de las puertas: las manda el evento indicado (si cambia su imagen en los datos, cambia aquí).
  // Si una no carga, queda el dibujo del período; si tampoco, el fondo del océano.
  const creditos = [];
  for (const img of seccion.querySelectorAll('.puerta img[data-evento]')) {
    const ev = porId.get(img.dataset.evento);
    if (!ev) {
      img.remove();
      continue;
    }
    const url = urlImagen(ev.imagen.archivo, Number(img.dataset.ancho) || 500);
    if (img.getAttribute('src') !== url) img.src = url;
    const respaldo = () => {
      if (img.dataset.respaldo) return img.remove();
      img.dataset.respaldo = 'si';
      img.src = urlPlaceholder(ev.periodoId);
    };
    img.addEventListener('error', respaldo);
    if (img.complete && !img.naturalWidth) respaldo();
    creditos.push(`${esc(ev.titulo)}: ${creditoImagen(ev.imagen)}`);
  }

  // «¿Sabías que…?» del día: cambia a medianoche y es el mismo para todos ese día. Sale de los eventos con
  // frase en data/sabias-que.json, que excluye los temas sensibles (scripts/validar-datos.mjs).
  const candidatos = eventos.filter((ev) => ev.sabiasQue);
  const destacado = seccion.querySelector('.destacado');
  if (candidatos.length) {
    const hoy = new Date();
    const dia = Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 864e5);
    const ev = candidatos[dia % candidatos.length];
    const periodo = periodoDe.get(ev.periodoId);
    const { archivo } = ev.imagen;
    destacado.style.setProperty('--color', periodo.color);
    destacado.innerHTML = `
      <figure class="destacado-figura">
        <a class="destacado-marco" href="#evento/${ev.id}" tabindex="-1" aria-hidden="true"><img src="${urlImagen(archivo, 500)}"
          srcset="${urlImagen(archivo, 500)} 500w, ${urlImagen(archivo, 960)} 960w" sizes="(max-width: 40em) 100vw, 28rem" alt=""
          loading="lazy" decoding="async" data-periodo="${ev.periodoId}"></a>
        <figcaption class="credito">Imagen: ${creditoImagen(ev.imagen)}</figcaption>
      </figure>
      <div class="destacado-texto">
        <h2 class="ceja" id="destacado-ceja">¿Sabías que…?</h2>
        <h3 class="destacado-titulo"><a href="#evento/${ev.id}">${esc(ev.titulo)}</a></h3>
        <p class="destacado-fecha">${esc(ev.fechaTexto)} · ${esc(periodo.nombre)}</p>
        <p class="destacado-frase">${esc(ev.sabiasQue)}</p>
      </div>`;
    destacado.hidden = false;
  }

  const delPeriodo = (id) => eventos.filter((ev) => ev.periodoId === id);
  // Cada período lleva una escala con una marca por evento, en su año (sin fotos: así ningún período se ve
  // más lúgubre o más épico que otro en la portada).
  const hoy = new Date().getFullYear();
  const escala = (p, i) => {
    const fin = periodos[i + 1]?.inicio ?? hoy;
    const lista = delPeriodo(p.id);
    const inicio = Math.min(p.inicio, ...lista.map((ev) => ev.anio));
    return lista.map((ev) => `<i style="left:${(((ev.anio - inicio) / Math.max(1, fin - inicio)) * 100).toFixed(1)}%"></i>`).join('');
  };
  const lista = seccion.querySelector('.epocas-lista');
  lista.innerHTML = periodos
    .map(
      (p, i) => `
      <li><a class="epoca" href="#linea" data-periodo="${p.id}" style="--color:${p.color}">
        <span class="epoca-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <span class="epoca-nombre">${esc(p.nombre)}</span>
        <span class="epoca-fechas">${esc(p.fechasTexto)} · ${delPeriodo(p.id).length} eventos</span>
        <span class="epoca-escala" aria-hidden="true">${escala(p, i)}</span>
      </a></li>`,
    )
    .join('');
  lista.addEventListener('click', (e) => {
    const enlace = e.target.closest('.epoca');
    if (!enlace || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    alElegirPeriodo(enlace.dataset.periodo);
  });

  seccion.querySelector('.inicio-creditos').innerHTML = creditos.length ? `Imágenes de las puertas: ${creditos.join('; ')}.` : '';

  // «Tu recorrido»: cuántos eventos se han visto en este navegador y con cuál seguir (el siguiente sin ver
  // después del último abierto o, si no hay, el primero sin ver).
  // Se arma una vez y después solo cambian los textos y el enlace: así no se pierde el foco al volver.
  const seguir = seccion.querySelector('.seguir');
  seguir.innerHTML = `
    <h2 class="ceja" id="seguir-titulo">Tu recorrido</h2>
    <p class="seguir-cuenta"></p>
    <a class="boton primario seguir-enlace" href="#linea"><span class="seguir-texto"></span>${icono('siguiente')}</a>
    <ol class="seguir-barra">${periodos
      .map((p) => `<li style="--color:${p.color}" title="${esc(p.nombre)}"><span class="solo-lector">${esc(p.nombre)}: </span><span class="seguir-dato"></span><i aria-hidden="true"></i></li>`)
      .join('')}</ol>`;
  const cuenta = seguir.querySelector('.seguir-cuenta');
  const enlace = seguir.querySelector('.seguir-enlace');
  const tramos = [...seguir.querySelectorAll('.seguir-barra li')];
  // Una barra por período con lo visto en él, como dato («5 de 12»): sin «completado» ni porcentajes, porque
  // «completaste la dictadura» no corresponde.
  function mostrarAvance(vistos, ultimoId) {
    seguir.hidden = !vistos.size;
    if (!vistos.size) return;
    const i = eventos.findIndex((ev) => ev.id === ultimoId);
    const proximo = eventos.slice(i + 1).find((ev) => !vistos.has(ev.id)) ?? eventos.find((ev) => !vistos.has(ev.id));
    cuenta.innerHTML = `Llevas <strong>${vistos.size} de ${eventos.length}</strong> eventos vistos en este navegador.${proximo ? '' : ' ¡Ya los viste todos!'}`;
    enlace.hidden = !proximo;
    if (proximo) {
      enlace.href = `#evento/${proximo.id}`;
      enlace.querySelector('.seguir-texto').textContent = `Seguir con: ${proximo.titulo}`;
    }
    periodos.forEach((p, j) => {
      const del = delPeriodo(p.id);
      const n = del.filter((ev) => vistos.has(ev.id)).length;
      tramos[j].querySelector('.seguir-dato').textContent = `${n} de ${del.length}`;
      tramos[j].style.setProperty('--lleno', (n / del.length).toFixed(3));
    });
  }

  // Lo que está bajo el pliegue aparece al entrar en pantalla, una sola vez (sin JavaScript, o con movimiento
  // reducido, se ve quieto desde el comienzo).
  if (!movimientoReducido() && 'IntersectionObserver' in window) {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.remove('por-asomar');
          observador.unobserve(e.target);
        }
      },
      { threshold: 0.15 },
    );
    for (const el of seccion.querySelectorAll('.cifras, .inicio-cuerpo > section')) {
      if (el.getBoundingClientRect().top < innerHeight) continue;
      el.classList.add('por-asomar');
      observador.observe(el);
    }
  }

  return {
    mostrarAvance,
    /** Lleva el foco al título de la portada (al llegar a ella con una pestaña o con «Volver»). */
    enfocar: () => seccion.querySelector('#inicio-titulo').focus({ preventScroll: true }),
  };
}
