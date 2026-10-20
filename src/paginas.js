// Páginas de texto que se cargan a pedido (import() en main.js): «Acerca de» (#acerca), «Para docentes»
// (#docentes, con «Arma tu secuencia») y el glosario (#glosario). Todo lo que dicen sale de los criterios del
// proyecto (CLAUDE.md), de las licencias del README, de lo que la app guarda de verdad en el navegador y de
// data/glosario.json (con los eventos donde aparece cada palabra: virtual:glosario, vite.config.js).
import glosario from 'virtual:glosario';
import { esc, externo, icono, minutosDeLectura, movimientoReducido, nombreFuente, normalizar, PALABRAS_POR_MINUTO } from './util.js';

const REPO = 'https://github.com/Moises-Salgado/historia-de-chile-interactiva';
const afuera = (url, texto) => `<a href="${url}" target="_blank" rel="noopener">${texto}<span class="solo-lector"> (se abre en otra pestaña)</span></a>`;
const MAX_SECUENCIA = 20;

function acerca({ eventos, periodos }) {
  return {
    ceja: 'Acerca de',
    titulo: 'Sobre este proyecto',
    intro: `Un atlas de la historia de Chile: ${eventos.length} eventos en ${periodos.length} períodos, en una línea de tiempo y un mapa, con textos para niños, para todo público y para quienes quieren profundizar. Sin publicidad, sin registro y sin seguimiento.`,
    html: `
      <section class="pagina-bloque" aria-labelledby="acerca-responsables">
        <h3 id="acerca-responsables">Quiénes lo hacen</h3>
        <p>Responsables del proyecto: Moises Salgado y Miguel Salgado.</p>
      </section>
      <section class="pagina-bloque" aria-labelledby="acerca-criterios">
        <h3 id="acerca-criterios">Cómo se escribe cada evento</h3>
        <ul>
          <li>Solo hechos verificables. Cada evento cita sus fuentes, de preferencia Memoria Chilena, la Biblioteca del Congreso Nacional, el Museo Histórico Nacional, el Archivo Nacional o publicaciones académicas. Wikipedia sirve solo como punto de partida para contrastar.</li>
          <li>Los textos, las historias guiadas y el glosario se redactaron con ayuda de inteligencia artificial a partir de las fuentes citadas, y se cotejaron con ellas: cada cifra, fecha y nombre debe estar en una fuente. Las frases de «¿Sabías que…?» y de «Lo que se discute» están copiadas tal cual del texto de cada evento.</li>
          <li>Cada fecha va con la precisión que se conoce; si es incierta, lleva «c.» (cerca de).</li>
          <li>En los temas sensibles (pueblos originarios y Ocupación de la Araucanía, Guerra del Pacífico, dictadura de 1973 a 1990, estallido social de 2019) el lenguaje es neutral, las cifras son las oficiales con su fuente (como los informes Rettig y Valech) y se indica que existen distintas interpretaciones.</li>
          <li>Lo que tiene menor certeza se lista a la vista de todos, para revisarlo: ${afuera(`${REPO}/blob/main/docs/REVISION_PENDIENTE.md`, 'revisión pendiente')}. Las fuentes de cada evento: ${afuera(`${REPO}/blob/main/docs/FUENTES.md`, 'fuentes por evento')}.</li>
        </ul>
      </section>
      <section class="pagina-bloque" aria-labelledby="acerca-licencias">
        <h3 id="acerca-licencias">Imágenes, mapa y letras</h3>
        <ul>
          <li>Las imágenes son de ${afuera('https://commons.wikimedia.org/', 'Wikimedia Commons')}, de dominio público o con licencias CC0, CC BY o CC BY-SA. Junto a cada una van su autor y su licencia. No hay imágenes hechas con inteligencia artificial.</li>
          <li>Las regiones del mapa vienen de ${afuera('https://www.naturalearthdata.com/', 'Natural Earth')} (dominio público) y las coordenadas de los lugares, de ${afuera('https://www.wikidata.org/', 'Wikidata')} (CC0). Los límites son los de las regiones actuales.</li>
          <li>Los títulos usan Source Serif 4 (Adobe) y los rótulos, Barlow Condensed (Jeremy Tribby), ambas con la licencia SIL Open Font License 1.1.</li>
          <li>El código del sitio está publicado en ${afuera(REPO, 'GitHub')}.</li>
        </ul>
      </section>
      <section class="pagina-bloque" aria-labelledby="acerca-datos">
        <h3 id="acerca-datos">Qué se guarda en este navegador</h3>
        <p>Nada sale de tu navegador: no hay cuentas ni estadísticas. Para recordar dónde ibas, se guardan los eventos que ya abriste, el último que abriste, el nivel de lectura, si elegiste texto grande o el modo para proyectar, si ya viste «Empieza aquí», la región que elegiste en «Tu región» y, solo si lo escribiste en «¿Qué edad tenías?», tu año de nacimiento. Las imágenes ya vistas y la historia que guardes para usar sin conexión quedan en el navegador.</p>
        <p><button type="button" class="boton" data-accion="borrar-datos">${icono('cerrar')}<span>Borrar mis datos</span></button></p>
      </section>
      <section class="pagina-bloque" aria-labelledby="acerca-error">
        <h3 id="acerca-error">¿Encontraste un error?</h3>
        <p>Cada evento tiene, junto a sus fuentes, un enlace para avisar de un error. También puedes ${afuera(`${REPO}/issues/new`, 'abrir un aviso en GitHub')} (se necesita una cuenta). Indica qué está mal y, si puedes, la fuente que lo corrige.</p>
      </section>
      <section class="pagina-bloque" aria-labelledby="acerca-citar">
        <h3 id="acerca-citar">Cómo citar el sitio</h3>
        <p class="cita-texto"><i>Historia de Chile Interactiva</i>. (s. f.). ${esc(new URL('./', location.href.split('#')[0]).href)}</p>
        <p>Cada evento tiene su propia cita, con la fecha de consulta, en «Cómo citar».</p>
      </section>`,
  };
}

function docentes({ eventos, periodos, recorridos }) {
  const duracion = (r) =>
    `${minutosDeLectura(r.eventos, 'nino')} min para niños · ${minutosDeLectura(r.eventos, 'general')} min general · ${minutosDeLectura(r.eventos, 'detallado')} min detallado`;
  const porPeriodo = periodos.map((p) => ({ p, lista: eventos.filter((ev) => ev.periodoId === p.id) }));
  return {
    ceja: 'Para docentes',
    titulo: 'Usar el atlas en clase',
    intro: 'Cómo proyectarlo, enlazar un paso exacto, imprimir un evento y armar una secuencia propia para tu clase.',
    html: `
      <section class="pagina-bloque" aria-labelledby="docentes-proyectar">
        <h3 id="docentes-proyectar">Proyectar</h3>
        <ul>
          <li>«Proyectar en clase» agranda la letra, usa colores claros (se ven mejor en un proyector) y oculta lo personal, como «¿Qué edad tenías?».</li>
          <li>Con el modo activado aparece «Pantalla completa».</li>
          <li>Av Pág y Re Pág, o un control de presentaciones, recorren el texto y pasan al evento siguiente o al anterior.</li>
        </ul>
      </section>
      <section class="pagina-bloque" aria-labelledby="docentes-enlazar">
        <h3 id="docentes-enlazar">Enlazar e imprimir</h3>
        <ul>
          <li>Cada evento y cada paso de una historia tiene su propia dirección: copia la de la barra del navegador (por ejemplo, <code>#historia/independencia/3</code>).</li>
          <li>«Compartir», en la ficha de cada evento, crea un enlace que al pegarlo en un chat o en Classroom muestra el título y un resumen.</li>
          <li>Para imprimir un evento, ábrelo y usa Imprimir del navegador (Ctrl + P): sale como una lámina, con la imagen, su crédito, la cita y las fuentes.</li>
          <li>Sin buena conexión en la sala: en «Historias», «Guardar para usar sin conexión» deja una historia lista en el navegador.</li>
        </ul>
      </section>
      <section class="pagina-bloque" aria-labelledby="docentes-historias">
        <h3 id="docentes-historias">Las historias guiadas y su duración</h3>
        <p>Tiempo aproximado leyendo en voz alta (${PALABRAS_POR_MINUTO} palabras por minuto), según el nivel:</p>
        <ul class="pagina-lista">${recorridos
          .map((r) => `<li><a href="#historia/${r.id}">${esc(r.titulo)}</a> · ${r.eventos.length} pasos<br><span class="pagina-dato">${duracion(r)}</span></li>`)
          .join('')}</ul>
      </section>
      <section class="pagina-bloque secuencia" aria-labelledby="docentes-secuencia">
        <h3 id="docentes-secuencia">Arma tu secuencia</h3>
        <p>Elige entre 2 y ${MAX_SECUENCIA} eventos: el enlace los muestra en orden cronológico, paso a paso, como una historia guiada.</p>
        <div class="secuencia-periodos">${porPeriodo
          .map(
            ({ p, lista }) => `<details class="plegable"><summary>${esc(p.nombre)} (${lista.length})</summary><ul class="secuencia-eventos">${lista
              .map((ev) => `<li><label><input type="checkbox" value="${ev.id}"><span><span class="secuencia-fecha">${esc(ev.fechaTexto)}</span> ${esc(ev.titulo)}</span></label></li>`)
              .join('')}</ul></details>`,
          )
          .join('')}</div>
        <p class="secuencia-cuenta" role="status">Todavía no elegiste eventos.</p>
        <div class="secuencia-salida" hidden>
          <label class="rotulo" for="secuencia-enlace">Enlace de tu secuencia</label>
          <input id="secuencia-enlace" class="campo" type="text" readonly>
          <p class="secuencia-acciones">
            <button type="button" class="boton" data-accion="copiar-secuencia">${icono('copiar')}<span>Copiar el enlace</span></button>
            <a class="boton primario secuencia-ver" href="#">${icono('ruta')}<span>Ver la secuencia</span></a>
          </p>
        </div>
      </section>`,
  };
}

// Glosario: cada palabra con su definición breve, su fuente (si no sale del propio texto) y los eventos donde
// aparece, agrupadas por su inicial (sin tilde) con un índice de letras arriba. Las definiciones esperan revisión
// humana (docs/REVISION_PENDIENTE.md): lo dice el pie de la página.
function glosarioPagina({ eventos }) {
  const porId = new Map(eventos.map((ev) => [ev.id, ev]));
  const lista = [...glosario].sort((a, b) => a.termino.localeCompare(b.termino, 'es'));
  const MAX = 6;
  const letras = new Map();
  for (const g of lista) {
    const l = normalizar(g.termino).charAt(0).toUpperCase();
    letras.set(l, [...(letras.get(l) ?? []), g]);
  }
  const entrada = (g) => {
    const donde = g.eventos.map((id) => porId.get(id)).filter(Boolean);
    const enlaces = donde.slice(0, MAX).map((ev) => `<a href="#evento/${ev.id}">${esc(ev.titulo)}</a>`);
    return `<div class="glosario-entrada" id="glosario-${g.id}">
      <dt>${esc(g.termino)}</dt>
      <dd>${esc(g.definicion)}${g.fuente ? ` <span class="glosario-fuente">${externo(g.fuente, `Fuente: ${esc(nombreFuente(g.fuente))}`)}</span>` : ''}
        ${donde.length ? `<p class="glosario-eventos">Aparece en: ${enlaces.join(' · ')}${donde.length > MAX ? ` y ${donde.length - MAX} más` : ''}.</p>` : ''}</dd>
    </div>`;
  };
  return {
    ceja: 'Glosario',
    titulo: 'Palabras para entender',
    intro: `${lista.length} palabras que aparecen en los textos, con una explicación breve y los eventos donde se usan.`,
    html: `<nav class="glosario-indice" aria-label="Letras del glosario">${[...letras.keys()]
      .map((l) => `<a href="#glosario" data-ir="letra-${l}">${l}</a>`)
      .join('')}</nav>
      <div class="glosario-pagina">${[...letras]
        .map(
          ([l, grupo]) => `<section aria-labelledby="letra-${l}">
            <h3 class="glosario-letra" id="letra-${l}" tabindex="-1">${l}</h3>
            <dl>${grupo.map(entrada).join('')}</dl>
          </section>`,
        )
        .join('')}</div>
      <p class="glosario-nota">Las explicaciones están en revisión: si ves un error, <a href="#acerca">avísanos</a>.</p>`,
  };
}

export const pagina = (id, datos) => ({ acerca, docentes, glosario: glosarioPagina })[id]?.(datos) ?? null;

// La secuencia que se está armando se recuerda en la sesión: al volver de «Ver la secuencia», sigue marcada.
const SECUENCIA = 'historia-chile:secuencia';
const sesion = (valor) => {
  try {
    if (valor === undefined) return sessionStorage.getItem(SECUENCIA) ?? '';
    sessionStorage.setItem(SECUENCIA, valor);
  } catch {
    return '';
  }
};

/** Activa los controles de la página ya pintada en `contenedor`; copiar(texto, aviso) y avisar(texto) vienen de main.js. */
export function activar(contenedor, { eventos, copiar, avisar }) {
  const orden = new Map(eventos.map((ev, i) => [ev.id, i]));
  const cuenta = contenedor.querySelector('.secuencia-cuenta');
  const salida = contenedor.querySelector('.secuencia-salida');
  let elegidos = [];

  function actualizarSecuencia() {
    elegidos = [...contenedor.querySelectorAll('.secuencia-eventos input:checked')].map((c) => c.value).sort((a, b) => orden.get(a) - orden.get(b));
    sesion(elegidos.join(','));
    const n = elegidos.length;
    cuenta.textContent = !n
      ? 'Todavía no elegiste eventos.'
      : n === 1
        ? 'Elegiste 1 evento: elige al menos uno más.'
        : n > MAX_SECUENCIA
          ? `Elegiste ${n}: el máximo es ${MAX_SECUENCIA}.`
          : `Elegiste ${n} eventos.`;
    salida.hidden = n < 2 || n > MAX_SECUENCIA;
    if (salida.hidden) return;
    const ruta = `#secuencia/${elegidos.join(',')}`;
    contenedor.querySelector('#secuencia-enlace').value = new URL(ruta, location.href.split('#')[0]).href;
    contenedor.querySelector('.secuencia-ver').setAttribute('href', ruta);
  }

  if (cuenta) {
    const previa = sesion().split(',');
    for (const c of contenedor.querySelectorAll('.secuencia-eventos input')) {
      if (!previa.includes(c.value)) continue;
      c.checked = true;
      c.closest('details').open = true;
    }
    actualizarSecuencia();
  }
  contenedor.addEventListener('change', (e) => {
    if (e.target.matches('.secuencia-eventos input')) actualizarSecuencia();
  });
  contenedor.addEventListener('click', (e) => {
    // Índice del glosario: baja a la letra y le pasa el foco, sin cambiar la dirección (sigue en #glosario).
    const letra = e.target.closest('[data-ir]');
    if (letra) {
      e.preventDefault();
      const destino = contenedor.querySelector(`#${letra.dataset.ir}`);
      destino?.focus({ preventScroll: true });
      destino?.scrollIntoView({ block: 'start', behavior: movimientoReducido() ? 'auto' : 'smooth' });
      return;
    }
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.accion === 'copiar-secuencia') copiar(contenedor.querySelector('#secuencia-enlace').value, 'Enlace de la secuencia copiado.');
    else if (b.dataset.accion === 'borrar-datos') borrarDatos(b, avisar);
  });
}

// «Borrar mis datos»: se presiona dos veces (sin ventanas de confirmación); si no se confirma en 8 s, el botón
// vuelve a como estaba. Borra las preferencias, lo visto y las imágenes guardadas para usar sin conexión, y
// recarga; al volver, main.js avisa que se borraron (lee y retira la marca BORRADO).
const BORRADO = 'historia-chile:borrado';
async function borrarDatos(boton, avisar) {
  const rotulo = boton.querySelector('span');
  if (!boton.dataset.confirmar) {
    boton.dataset.confirmar = 'si';
    rotulo.textContent = 'Sí, borrar mis datos';
    avisar('¿Seguro? Presiona otra vez el botón para borrar tus datos de este navegador.');
    setTimeout(() => {
      delete boton.dataset.confirmar;
      rotulo.textContent = 'Borrar mis datos';
    }, 8000);
    return;
  }
  try {
    for (const almacen of [localStorage, sessionStorage]) {
      for (const clave of Object.keys(almacen)) if (clave.startsWith('historia-chile:')) almacen.removeItem(clave);
    }
    if ('caches' in window) await Promise.all(['imagenes', 'historia-guardada'].map((n) => caches.delete(n)));
    sessionStorage.setItem(BORRADO, 'si');
  } catch {}
  location.reload();
}
