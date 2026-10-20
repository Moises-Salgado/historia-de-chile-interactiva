// Portada (#inicio). La bienvenida y las tres puertas están en index.html, para que se vean antes de que
// cargue la app; aquí se completan desde los datos: cifras, créditos de las imágenes, «Empieza aquí» (la
// primera vez), el «¿Sabías que…?» del día, «Tu recorrido» y los períodos (cada uno lleva a su tramo de la línea).
import { curvasDeNivel } from './curvas.js';
import { haceCuanto, parseFecha } from './fechas.js';
import { creditoImagen, esc, guardarPreferencia, icono, leerNacimiento, leerPreferencia, movimientoReducido, urlImagen, urlPlaceholder } from './util.js';

// El evento que muestra «Elige cómo leer» en sus tres niveles.
const MUESTRA = '1945-nobel-gabriela-mistral';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// La primera oración de un texto (no corta en «c. 1500» ni en «a.C.»).
const primeraOracion = (texto) => String(texto ?? '').split(/(?<=[.!?…»])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«])/u)[0];
const sesion = {
  leer: (clave) => {
    try {
      return sessionStorage.getItem(`historia-chile:${clave}`);
    } catch {
      return null;
    }
  },
  guardar: (clave, valor) => {
    try {
      if (valor === null) sessionStorage.removeItem(`historia-chile:${clave}`);
      else sessionStorage.setItem(`historia-chile:${clave}`, valor);
    } catch {
      // Sin almacenamiento: vale solo mientras la página esté abierta.
    }
  },
};

/**
 * alElegirPeriodo(id) se llama al elegir un período (en vez de seguir el enlace #linea) y alElegirNivel(nivel),
 * al elegir cómo leer en «Empieza aquí»; nivel() da el nivel de lectura actual. `mapa` trae regiones, lugares y
 * zonas («Tu región»).
 */
export function crearInicio(seccion, { eventos, periodos, recorridos, mapa = { regiones: [], lugares: [], zonas: [] }, nivel = () => 'general', alElegirNivel, alElegirPeriodo }) {
  const { lugares } = mapa;
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const periodoDe = new Map(periodos.map((p) => [p.id, p]));
  seccion.querySelectorAll('.curvas').forEach(curvasDeNivel);
  // La llegada (index.html, [data-llegada]) dura 400 ms: después se quita, para que no se repita cada vez que
  // la portada vuelve a mostrarse en la misma visita.
  if ('llegada' in document.documentElement.dataset) setTimeout(() => delete document.documentElement.dataset.llegada, 700);

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

  // «¿Sabías que…?» del día: cambia a medianoche y es el mismo para todos ese día; «Otro dato» pasa al siguiente.
  // Sale de los eventos con frase en data/sabias-que.json, que excluye los temas sensibles (scripts/validar-datos.mjs).
  const candidatos = eventos.filter((ev) => ev.sabiasQue);
  const destacado = seccion.querySelector('.destacado');
  if (candidatos.length) {
    const hoy = new Date();
    let i = Math.floor(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) / 864e5) % candidatos.length;
    destacado.innerHTML = `
      <figure class="destacado-figura">
        <a class="destacado-marco" tabindex="-1" aria-hidden="true"><img alt="" loading="lazy" decoding="async" sizes="(max-width: 40em) 100vw, 28rem"></a>
        <figcaption class="credito"></figcaption>
      </figure>
      <div class="destacado-texto">
        <h2 class="ceja" id="destacado-ceja">¿Sabías que…?</h2>
        <div class="destacado-dato">
          <h3 class="destacado-titulo"><a></a></h3>
          <p class="destacado-fecha"></p>
          <p class="destacado-frase"></p>
        </div>
        <p class="destacado-acciones"><button type="button" class="boton chico destacado-otro">${icono('siguiente')}<span>Otro dato</span></button></p>
      </div>`;
    const img = destacado.querySelector('img');
    // Se cambian los textos y la imagen, no el HTML: el foco se queda en «Otro dato».
    const mostrarDato = () => {
      const ev = candidatos[i];
      const periodo = periodoDe.get(ev.periodoId);
      const { archivo } = ev.imagen;
      destacado.style.setProperty('--color', periodo.color);
      for (const a of destacado.querySelectorAll('.destacado-marco, .destacado-titulo a')) a.href = `#evento/${ev.id}`;
      img.classList.remove('cargada');
      delete img.dataset.respaldo;
      img.dataset.periodo = ev.periodoId;
      img.srcset = `${urlImagen(archivo, 500)} 500w, ${urlImagen(archivo, 960)} 960w`;
      img.src = urlImagen(archivo, 500);
      destacado.querySelector('.credito').innerHTML = `Imagen: ${creditoImagen(ev.imagen)}`;
      destacado.querySelector('.destacado-titulo a').textContent = ev.titulo;
      destacado.querySelector('.destacado-fecha').textContent = `${ev.fechaTexto} · ${periodo.nombre}`;
      destacado.querySelector('.destacado-frase').textContent = ev.sabiasQue;
    };
    mostrarDato();
    // Desde ahora, cada dato nuevo se anuncia (el primero no: es parte de la página).
    destacado.querySelector('.destacado-dato').setAttribute('aria-live', 'polite');
    destacado.querySelector('.destacado-otro').hidden = candidatos.length < 2;
    destacado.querySelector('.destacado-otro').addEventListener('click', () => {
      i = (i + 1) % candidatos.length;
      mostrarDato();
    });
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
      <li><a class="epoca" href="#linea/${p.id}" data-periodo="${p.id}" style="--color:${p.color}">
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

  // ---- «Empieza aquí»: para quien llega a la portada sin haber abierto nada (nunca con un enlace directo). Se
  // ve durante esa visita, aunque se vaya y se vuelva, y no vuelve a aparecer; «Ocultar» lo quita ya. ----
  const empieza = seccion.querySelector('.empieza');
  const llegoALaPortada = /^#?(?:inicio)?$/.test(location.hash);
  if (sesion.leer('empieza') === 'si' || (llegoALaPortada && !leerPreferencia('vistos') && !leerPreferencia('empieza'))) {
    sesion.guardar('empieza', 'si');
    guardarPreferencia('empieza', 'visto');
    pintarEmpieza();
  } else {
    delete document.documentElement.dataset.primera;
  }
  // «¿Primera vez? Empieza aquí», en la bienvenida (index.html la muestra antes de pintar con data-primera): baja
  // hasta el bloque, que en la primera pantalla no se ve.
  seccion.querySelector('.empieza-ir button')?.addEventListener('click', () => {
    if (empieza.hidden) return;
    empieza.scrollIntoView({ block: 'start', behavior: movimientoReducido() ? 'auto' : 'smooth' });
    empieza.querySelector('#empieza-titulo').focus({ preventScroll: true });
  });

  function pintarEmpieza() {
    const esencial = recorridos.find((r) => r.id === 'esencial');
    const muestra = porId.get(MUESTRA);
    // Este mes en la historia: los eventos de fecha conocida (no aproximada) en el mes de hoy, todos con el mismo
    // trato y en orden de calendario (los que solo tienen mes, al final). Si son más de 6, se ven los 6 más
    // cercanos a hoy (primero los que vienen) sin separar los de un mismo día; el resto, en un desplegable.
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const delMes = eventos
      .filter((ev) => !ev.fechaAproximada && parseFecha(ev.fecha)?.mes === mes)
      .map((ev) => ({ ev, dia: parseFecha(ev.fecha).dia }))
      .sort((a, b) => (a.dia ?? 32) - (b.dia ?? 32) || a.ev.t - b.ev.t);
    let aLaVista = delMes;
    if (delMes.length > 6) {
      const conDia = delMes.filter((x) => x.dia);
      const cercanos = [...conDia.filter((x) => x.dia >= hoy.getDate()), ...conDia.filter((x) => x.dia < hoy.getDate()).reverse()];
      const elegidos = [];
      for (const x of cercanos) {
        if (elegidos.length >= 6 && x.dia !== elegidos.at(-1).dia) break;
        elegidos.push(x);
      }
      aLaVista = delMes.filter((x) => elegidos.includes(x));
    }
    const resto = delMes.filter((x) => !aLaVista.includes(x));
    // «5 de octubre de 1988 · Plebiscito de 1988… · hace 37 años». Un proceso que termina en otro mes, «Comenzó el
    // 16 de octubre de 1998» y sin «hace» (si termina en el mismo mes, como Rancagua, va como cualquier otro). El
    // aniversario de hoy lleva «Un día como hoy». Todos con el filete de su período, sin imagen.
    const itemDelMes = ({ ev, dia }) => {
      const f = parseFecha(ev.fecha);
      const fin = ev.fechaFin ? parseFecha(ev.fechaFin) : null;
      const proceso = fin && (fin.anio !== f.anio || fin.mes !== f.mes);
      const cuando = proceso ? `Comenzó ${f.dia ? `el ${f.dia} de ` : 'en '}${MESES[f.mes - 1]} de ${f.anio}` : ev.fechaTexto;
      const hace = proceso ? null : haceCuanto(ev);
      return `<li><a href="#evento/${ev.id}" style="--color:${periodoDe.get(ev.periodoId).color}">
        <span class="empieza-mes-fecha">${dia === hoy.getDate() ? '<span class="empieza-hoy">Un día como hoy</span> ' : ''}${esc(cuando.charAt(0).toUpperCase() + cuando.slice(1))}</span>
        <span class="empieza-mes-titulo">${esc(ev.titulo)}</span>
        ${hace ? `<span class="empieza-mes-hace">${hace}</span>` : ''}
      </a></li>`;
    };
    // «Elige cómo leer»: la primera oración de cada nivel y cuántas palabras tiene en total (sin pedir el detalle:
    // sus palabras y párrafos vienen con los datos), para que se vea la diferencia de largo.
    const palabras = (texto) => String(texto ?? '').split(/\s+/).filter(Boolean).length;
    const NIVELES = muestra
      ? [
          ['nino', 'Para niños', primeraOracion(muestra.resumenNino), palabras(muestra.resumenNino)],
          ['general', 'General', primeraOracion(muestra.resumen), palabras(muestra.resumen)],
          [
            'detallado',
            'Detallado',
            `Todo lo de «General» y ${muestra.parrafosDetalle} ${muestra.parrafosDetalle === 1 ? 'párrafo' : 'párrafos'} más.`,
            palabras(muestra.resumen) + muestra.palabrasDetalle,
          ],
        ]
      : [];
    empieza.innerHTML = `
      <p class="ceja">Primera vez aquí</p>
      <h2 id="empieza-titulo" tabindex="-1">Empieza aquí</h2>
      <div class="empieza-grilla">
        ${
          esencial
            ? `<a class="empieza-esencial" href="#historia/esencial">
            <span class="mosaico empieza-mosaico" aria-hidden="true">${esencial.eventos
              .slice(0, 4)
              .map((ev) => `<img src="${urlImagen(ev.imagen.archivo, 250)}" alt="" loading="lazy" decoding="async" data-periodo="${ev.periodoId}">`)
              .join('')}</span>
            <span class="empieza-esencial-texto">
              <span class="ceja">Historia guiada · ${esencial.eventos.length} pasos</span>
              <span class="empieza-esencial-titulo">${esc(esencial.titulo)}</span>
              <span class="empieza-esencial-bajada">${esc(esencial.descripcion)}</span>
              <span class="boton primario"><span>Empezar</span>${icono('siguiente')}</span>
            </span>
          </a>`
            : ''
        }
        ${
          muestra
            ? `<fieldset class="empieza-nivel">
            <legend>Elige cómo leer</legend>
            <p class="empieza-ayuda">El mismo evento, «${esc(muestra.titulo)}», en los tres niveles. Se puede cambiar cuando quieras, arriba, en «Leer».</p>
            <div class="empieza-niveles">${NIVELES.map(
              ([valor, nombre, texto, n]) => `<label class="empieza-opcion">
                <span class="empieza-opcion-fila"><input type="radio" name="empieza-nivel" value="${valor}"${valor === nivel() ? ' checked' : ''}> <span class="empieza-opcion-nombre">${nombre}</span> <span class="empieza-opcion-largo">· ${n} palabras</span></span>
                <span class="empieza-opcion-texto">${esc(texto)}</span>
              </label>`,
            ).join('')}</div>
          </fieldset>`
            : ''
        }
        ${
          delMes.length
            ? `<section class="empieza-mes" aria-labelledby="empieza-mes-titulo">
            <h3 id="empieza-mes-titulo">Este mes en la historia: ${MESES[mes - 1]}</h3>
            <ul>${aLaVista.map(itemDelMes).join('')}</ul>
            ${
              resto.length
                ? `<details class="plegable empieza-mes-mas"><summary>Ver los otros ${resto.length} de ${MESES[mes - 1]}</summary><ul>${resto.map(itemDelMes).join('')}</ul></details>`
                : ''
            }
          </section>`
            : ''
        }
      </div>
      <p class="empieza-pie"><button type="button" class="boton chico empieza-ocultar">${icono('cerrar')}<span>Ocultar</span></button></p>`;
    empieza.hidden = false;
    empieza.addEventListener('change', (e) => {
      if (e.target.name === 'empieza-nivel') alElegirNivel?.(e.target.value);
    });
    // Al ocultarlo, el foco pasa al título de la sección que queda en su lugar (y la pantalla lo acompaña).
    empieza.querySelector('.empieza-ocultar').addEventListener('click', () => {
      empieza.hidden = true;
      sesion.guardar('empieza', null);
      delete document.documentElement.dataset.primera;
      const siguiente = ['.seguir', '.destacado', '.epocas'].map((s) => seccion.querySelector(s)).find((s) => s && !s.hidden);
      const titulo = siguiente?.querySelector('h2');
      if (!titulo) return;
      titulo.tabIndex = -1;
      titulo.focus();
    });
  }

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
      .join('')}</ol>
    <p class="seguir-vida" hidden></p>
    <div class="seguir-region">
      <label class="rotulo" for="tu-region">Tu región</label>
      <select id="tu-region" class="campo">
        <option value="">Elige una región</option>${mapa.regiones.map((r) => `<option value="${r.codigo}">${esc(r.nombre)}</option>`).join('')}
      </select>
      <p class="seguir-region-dato" aria-live="polite"></p>
    </div>`;
  const cuenta = seguir.querySelector('.seguir-cuenta');
  const enlace = seguir.querySelector('.seguir-enlace');
  const tramos = [...seguir.querySelectorAll('.seguir-barra li')];

  // «Tu región» (guardada solo en este navegador): cuántos eventos tienen un lugar o una zona en ella.
  const regionDeLugar = new Map(lugares.map((l) => [l.id, l.region]));
  const regionesDeZona = new Map(mapa.zonas.map((z) => [z.id, z.regiones]));
  const selector = seguir.querySelector('#tu-region');
  const datoRegion = seguir.querySelector('.seguir-region-dato');
  function mostrarRegion() {
    const codigo = selector.value;
    const region = mapa.regiones.find((r) => r.codigo === codigo);
    if (!region) {
      datoRegion.textContent = '';
      return;
    }
    const n = eventos.filter((ev) => ev.ubicaciones.some((u) => regionDeLugar.get(u) === codigo || regionesDeZona.get(u)?.includes(codigo))).length;
    datoRegion.innerHTML = n
      ? `${n} ${n === 1 ? 'evento tiene' : 'eventos tienen'} un lugar en la ${esc(region.nombre)}. <a href="#mapa/${codigo.toLowerCase()}">Verlos en el mapa</a>`
      : `Todavía ningún evento tiene un lugar en la ${esc(region.nombre)}.`;
  }
  selector.value = mapa.regiones.some((r) => r.codigo === leerPreferencia('region')) ? leerPreferencia('region') : '';
  mostrarRegion();
  selector.addEventListener('change', () => {
    guardarPreferencia('region', selector.value);
    mostrarRegion();
  });
  // Una barra por período con lo visto en él, como dato («5 de 12»): sin «completado» ni porcentajes, porque
  // «completaste la dictadura» no corresponde.
  function mostrarAvance(vistos, ultimoId) {
    seguir.hidden = !vistos.size;
    if (!vistos.size) return;
    const i = eventos.findIndex((ev) => ev.id === ultimoId);
    const proximo = eventos.slice(i + 1).find((ev) => !vistos.has(ev.id)) ?? eventos.find((ev) => !vistos.has(ev.id));
    cuenta.innerHTML = `Llevas <strong>${vistos.size} de ${eventos.length}</strong> eventos vistos en este navegador.${proximo ? '' : ` Ya viste los ${eventos.length}.`}`;
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
    // «Desde que naciste»: con el año guardado en «¿Qué edad tenías?» (solo en este navegador).
    const nacimiento = leerNacimiento();
    const vida = seguir.querySelector('.seguir-vida');
    vida.hidden = !nacimiento;
    if (nacimiento) {
      const n = eventos.filter((ev) => ev.anio >= nacimiento).length;
      vida.textContent = `Desde que naciste, en ${nacimiento}, ${n === 1 ? 'hay 1 evento' : `hay ${n} eventos`} en esta línea de tiempo.`;
    }
  }

  // Lo que está bajo el pliegue aparece al entrar en pantalla, una sola vez (sin JavaScript, o con movimiento
  // reducido, se ve quieto desde el comienzo). Basta con que asome su borde superior: con un porcentaje de la
  // sección, una sección más alta que varias pantallas (celular chico, texto grande) nunca llegaba a aparecer.
  if (!movimientoReducido() && 'IntersectionObserver' in window) {
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          e.target.classList.remove('por-asomar');
          observador.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    for (const el of seccion.querySelectorAll('.cifras, .inicio-cuerpo > section')) {
      if (el.getBoundingClientRect().top < innerHeight) continue;
      el.classList.add('por-asomar');
      observador.observe(el);
    }
  }

  return {
    mostrarAvance,
    /** Marca en «Empieza aquí» el nivel elegido arriba. */
    ponerNivel: (valor) => {
      const opcion = empieza.querySelector(`input[name="empieza-nivel"][value="${valor}"]`);
      if (opcion) opcion.checked = true;
    },
    /** Lleva el foco al título de la portada (al llegar a ella con una pestaña o con «Volver»). */
    enfocar: () => seccion.querySelector('#inicio-titulo').focus({ preventScroll: true }),
  };
}
