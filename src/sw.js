// Service Worker básico: guarda el sitio para usarlo sin conexión y las imágenes ya vistas.
// Es una plantilla: al construir, el plugin de vite.config.js completa la versión y la lista de
// archivos del build y la escribe como dist/sw.js. En desarrollo no se registra.
const VERSION = '__VERSION__';
const ARCHIVOS = __ARCHIVOS__;
const SITIO = `sitio-${VERSION}`;
// ignoreVary: si el servidor responde «Vary: Origin», las peticiones crossorigin de la página no
// calzarían con las copias guardadas al instalar.
const DEL_SITIO = { cacheName: SITIO, ignoreVary: true };
const IMAGENES = 'imagenes';
// Las imágenes de Commons llegan como respuestas opacas y Chrome descuenta unos 7 MB de cuota por cada una:
// con muchas, el guardado falla en silencio o el navegador borra el sitio entero.
const MAX_IMAGENES = 60;
const ESPERA_RED = 4000; // ms: si la red no responde antes, se muestra la copia guardada

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(SITIO)
      .then((cache) => cache.addAll(ARCHIVOS.map((archivo) => new Request(archivo, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

// Al activar una versión nueva se borra la copia del sitio anterior (las imágenes se conservan).
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith('sitio-') && n !== SITIO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (request.mode === 'navigate') evento.respondWith(pagina(request));
  else if (url.origin === location.origin) evento.respondWith(archivo(request));
  else if (request.destination === 'image' && url.hostname.endsWith('wikimedia.org')) evento.respondWith(imagen(evento));
});

// Página: primero la red, para ver siempre la última versión; sin conexión o con una red muy lenta,
// la copia guardada (la navegación usa #evento/<id>, así que siempre es el mismo index.html). Una página para
// compartir (e/<id>.html) no se guarda: sin red, se responde con un salto a su evento (el index.html guardado
// no serviría ahí, porque sus rutas relativas apuntarían a e/assets/).
async function pagina(request) {
  const red = fetch(request);
  const plazo = new Promise((_, rechazar) => setTimeout(rechazar, ESPERA_RED));
  try {
    return await Promise.race([red, plazo]);
  } catch {
    const compartida = /\/e\/([a-z0-9-]+)\.html$/.exec(new URL(request.url).pathname);
    if (compartida) {
      const destino = `../#evento/${compartida[1]}`;
      return new Response(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${destino}"><script>location.replace(${JSON.stringify(destino)})</script>`, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    return (await caches.match('index.html', DEL_SITIO)) ?? red;
  }
}

// Archivos del sitio (JS, CSS, SVG): la copia guardada; sus nombres cambian con cada versión.
async function archivo(request) {
  return (await caches.match(request, DEL_SITIO)) ?? fetch(request);
}

// Imágenes de Wikimedia Commons: primero la red (igual que sin Service Worker) y se guarda una copia;
// sin conexión, la copia. Commons no admite CORS en sus redirecciones: las respuestas son opacas y no
// se puede saber si una guardada es un error, por eso la copia solo se usa cuando falta la red.
// La historia que se guardó para usar sin conexión (main.js) va aparte, en «historia-guardada», que no se
// recorta: una imagen de 500 px por paso, que sirve para cualquier ancho del mismo archivo (ignoreSearch). Con
// esas imágenes, si la red tarda más de ESPERA_IMAGEN, se usa la copia (la sala con mala señal).
const GUARDADA = { cacheName: 'historia-guardada', ignoreSearch: true };
const ESPERA_IMAGEN = 3000;
async function imagen(evento) {
  const cache = await caches.open(IMAGENES);
  const guardada = await caches.match(evento.request, GUARDADA);
  const red = fetch(evento.request).then((respuesta) => {
    if (respuesta.ok || respuesta.type === 'opaque') {
      evento.waitUntil(
        cache
          .put(evento.request, respuesta.clone())
          .then(() => recortar(cache))
          .catch(() => {}),
      );
    }
    return respuesta;
  });
  red.catch(() => {}); // si ganó la copia, la red puede fallar después sin que nadie la espere
  try {
    if (!guardada) return await red;
    return await Promise.race([red, new Promise((listo) => setTimeout(() => listo(guardada), ESPERA_IMAGEN))]);
  } catch {
    // Sin copia: la imagen falla y la página muestra el dibujo del período.
    return guardada ?? (await cache.match(evento.request)) ?? Response.error();
  }
}

// Conserva solo las MAX_IMAGENES guardadas (o vistas de nuevo) más recientemente.
async function recortar(cache) {
  const claves = await cache.keys();
  await Promise.all(claves.slice(0, -MAX_IMAGENES).map((clave) => cache.delete(clave)));
}
