# Historia de Chile Interactiva

La historia de Chile, desde el poblamiento hasta hoy, en una línea de tiempo interactiva, con imágenes históricas de Wikimedia Commons. Cada evento se puede leer en tres niveles: **Para niños**, **General** y **Detallado**, para lectores desde los 8 años hasta adultos mayores.

Responsables: Moises Salgado y Miguel Salgado.

## Qué incluye

- Más de 120 eventos en 9 períodos, con fecha, lugar, personajes, imagen con su crédito y las fuentes consultadas.
- Una portada con tres entradas (la línea de tiempo, el mapa y las historias guiadas), un «¿Sabías que…?» distinto cada día (y otro con «Otro dato») y los nueve períodos, para entrar directo a uno.
  - La primera vez, «Empieza aquí» propone la historia «Lo esencial de Chile», muestra un mismo evento en los tres niveles para elegir cómo leer y lista lo que pasó este mes en la historia.
  - «Tu recorrido» muestra lo visto por período (como dato, sin puntajes) y, si se guardan en el navegador, cuántos eventos hay desde que naciste y en tu región.
- Un mapa de Chile con las 16 regiones y 34 lugares: al tocar una región, una ciudad o un sitio se ven sus eventos, y un filtro por período cambia el mapa entero. Los eventos de alcance nacional y los ocurridos fuera de Chile tienen su propia lista, y cada evento tiene un enlace «Ver en el mapa».
- Línea de tiempo horizontal hecha de láminas (la imagen de época a sangre, con la fecha y el título encima; más altas en los grandes hitos), con un portal de color al comienzo de cada período, el eje dibujado como escala gráfica de mapa, minimapa y zoom según la importancia de cada evento: el zoom mínimo muestra solo los grandes hitos.
- Búsqueda por título, personaje o año, y filtros por período y tema.
- Nueve historias guiadas paso a paso: «Lo esencial de Chile», la Independencia, los grandes terremotos, las constituciones, las mujeres en la vida pública, la educación, los libros y la poesía, la minería y las fronteras.
  - Cada una tiene una presentación, con su duración y los pasos sobre la silueta de Chile.
  - Entre pasos se indica cuánto tiempo pasó y dónde ocurre: «57 años después · en Curalaba».
  - Al final hay un cierre con lo recorrido y un repaso sin nota. Los temas sensibles entran con preguntas de hechos escritas a mano, que el texto de cada evento responde, sin cifras ni muertes.
- Fichas de los personajes que aparecen en varios eventos y los pueblos originarios reunidos de norte a sur.
- Cada evento se presenta como una página de revista: el título y la imagen completa sobre el océano, el texto con el «¿Sabías que…?» como cita y una ficha con un mini-mapa de Chile, el lugar, el período, los temas y los personajes.
- En cada evento:
  - cuánto tiempo pasó («hace 147 años») y, si quien lee guarda su año de nacimiento (solo en su navegador), qué edad tenía; en la línea de tiempo aparece la banda «Tu vida»;
  - un «¿Sabías que…?» tomado del texto detallado y, en los temas con distintas interpretaciones, «Lo que se discute», con una oración del mismo texto;
  - «Palabras para entender» (del glosario, que también tiene su página) y «Escuchar», que lo lee en voz alta si el sistema tiene una voz en español;
  - «Compartir» (con una vista previa de título y resumen), «Cómo citar» y un enlace para avisar de un error.
- Modo «Proyectar en clase» para pantallas anchas: letra grande, colores claros, pantalla completa y Av Pág / Re Pág para avanzar con un control de presentaciones. «Para docentes» explica cómo usarlo, da la duración de cada historia por nivel y permite armar una secuencia propia de eventos con su enlace.
- «Acerca de» explica los criterios, las licencias y qué se guarda en el navegador, con un botón para borrarlo. No hay publicidad, registro ni seguimiento.
- Se puede instalar como aplicación en el celular o en el computador.
- Accesible: se maneja con teclado, mouse o pantalla táctil y funciona con lector de pantalla. El texto mide al menos 18 px, hay un botón «Texto grande», el modo oscuro es automático y se respeta la preferencia de reducir el movimiento.
- Funciona sin conexión para lo ya visitado (Service Worker), y cada historia se puede guardar entera para usarla sin conexión.
- Liviano: la primera carga pesa unos 120 KB comprimidos de JavaScript y CSS (lo que mide `npm run presupuesto`), o unos 170 KB contando el HTML y las dos tipografías; el texto detallado y las fuentes de cada período se piden al abrir un evento.
- Transiciones suaves donde el navegador las admite: la imagen de una tarjeta crece hasta el detalle, «Anterior / Siguiente» pasan la página, y los eventos ya leídos llevan una marca discreta. Si se pide reducir el movimiento, no hay animaciones.

## Uso local

Requiere [Node.js](https://nodejs.org/) 22.12 o superior (se recomienda la versión LTS).

```bash
npm install
npm run dev
```

El sitio queda en `http://localhost:5173`.

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática. |
| `npm run build` | Construye el sitio estático en `dist/`, incluido el Service Worker `dist/sw.js`. |
| `npm run preview` | Sirve `dist/` para probarlo tal como quedará publicado, incluido el modo sin conexión. |
| `npm test` | Valida los datos contra el esquema. |
| `npm run verificar-imagenes` | Revisa en Commons que cada imagen exista, tenga una licencia permitida y genere su miniatura. |
| `npm run docs` | Regenera `docs/FUENTES.md` y las listas automáticas de `docs/REVISION_PENDIENTE.md`. |
| `npm run presupuesto` | Después de construir: revisa el peso de la carga inicial y de lo que se carga a pedido, la letra mínima y las duraciones de las animaciones (`docs/PLAN_MVP.md`). |

## Estructura

```text
data/       períodos, temas, un JSON de eventos por período, historias guiadas, grupos,
            «¿Sabías que?», «Lo que se discute», glosario, lugares del mapa y ubicación de cada evento
            (esquema en data/README.md)
src/        main.js (secciones y rutas: #inicio, #linea, #mapa, #evento/<id>, #historia/<id>…),
            inicio.js (portada), mapa.js y chile-regiones.json (mapa, se cargan al abrirlo),
            curvas.js (curvas de nivel), timeline.js, detalle.js, filtros.js, datos.js, fechas.js,
            util.js, sensibles.js, escuchar.js, styles.css y vistas.css; a pedido: paginas.js (acerca de,
            docentes y glosario), repaso.js y mapa.css; sw.js (plantilla del Service Worker) y fonts/
public/     favicon, íconos y manifiesto para instalar, tarjeta para compartir (og.png), 404.html,
            dibujos de respaldo por período (placeholders/) y licencias de las fuentes (fonts/)
scripts/    validación de datos, verificación de imágenes, presupuesto, generación de docs/ y del mapa
docs/       FUENTES.md, REVISION_PENDIENTE.md y los planes de trabajo (IDEA_MAESTRA.md, PLAN_MVP.md)
```

No usa frameworks: es HTML, CSS y JavaScript con módulos ES, y Vite solo empaqueta.

## Publicar en GitHub Pages

`vite.config.js` usa `base: './'` (rutas relativas). Así el mismo build funciona en `https://<usuario>.github.io/<repositorio>/`, en un dominio propio o en cualquier subcarpeta, sin cambiar nada. La navegación usa `#evento/<id>`; `public/404.html` atiende las direcciones que no existen. Las páginas `e/<id>.html` (una por evento, para compartir) llevan la dirección pública del sitio, que está en `SITIO`, en `vite.config.js`: si se publica en otra dirección, hay que cambiarla ahí.

1. Sube el proyecto a un repositorio de GitHub, en la rama `main`.
2. En el repositorio, entra a **Settings → Pages → Build and deployment** y elige **Source: GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/pages.yml`, que valida los datos, construye y publica. La dirección del sitio aparece en **Settings → Pages** y en cada ejecución de la pestaña **Actions**.

Sin GitHub Actions, ejecuta `npm run build` y sube el contenido de `dist/` a cualquier hosting estático. Si cambias `base` por una ruta absoluta (por ejemplo `/<repositorio>/`), tiene que coincidir exactamente con la carpeta donde se publica.

## Contenido, fuentes e imágenes

- Los textos se redactaron con ayuda de IA a partir de las fuentes citadas y se cotejaron con ellas. Las fuentes principales son Memoria Chilena, la Biblioteca del Congreso Nacional, el Museo Histórico Nacional, el Archivo Nacional y publicaciones académicas. Los temas sensibles usan lenguaje neutral y cifras oficiales, siempre con su fuente.
- [`docs/FUENTES.md`](docs/FUENTES.md) reúne las fuentes y la imagen de cada evento.
- [`docs/REVISION_PENDIENTE.md`](docs/REVISION_PENDIENTE.md) lista los datos de menor certeza o con fuentes que no coinciden. Conviene revisarlo antes de usar el sitio en clases.
- Las imágenes son de [Wikimedia Commons](https://commons.wikimedia.org/), con licencias de dominio público, CC0, CC BY o CC BY-SA. El autor y la licencia se muestran junto a cada imagen. Se cargan desde Commons y no se copian al repositorio; si una no carga, se muestra un dibujo del período.
- Los títulos usan Source Serif 4 SemiBold, de Adobe, y las fechas y rótulos, Barlow Condensed SemiBold, de Jeremy Tribby; ambas tienen la licencia SIL Open Font License 1.1 (textos en [`public/fonts/`](public/fonts/)). Se incluye solo el subconjunto latino que distribuye Google Fonts, sin modificar.
- Las regiones del mapa y la silueta de la portada vienen de [Natural Earth](https://www.naturalearthdata.com/) (dominio público), simplificadas con `scripts/generar-mapa.mjs`; los límites son los de las regiones actuales. Las coordenadas de los lugares vienen de [Wikidata](https://www.wikidata.org/) (CC0); los que representan un sitio o una zona están marcados como aproximados y listados en `docs/REVISION_PENDIENTE.md`.
- Para agregar o corregir eventos, edita `data/NN-*.json` según `data/README.md` y luego ejecuta `npm test`, `npm run verificar-imagenes` y `npm run docs`.
