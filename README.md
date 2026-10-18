# Historia de Chile Interactiva

Línea de tiempo interactiva de la historia de Chile, desde el poblamiento hasta hoy, con imágenes históricas de Wikimedia Commons. Cada evento se puede leer en tres niveles: **Para niños**, **General** y **Detallado**, para lectores desde los 8 años hasta adultos mayores.

## Qué incluye

- Más de 120 eventos en 9 períodos, con fecha, lugar, personajes, imagen con su crédito y las fuentes consultadas.
- Línea de tiempo horizontal con franjas de color por período, minimapa y zoom según la importancia de cada evento: el zoom mínimo muestra solo los grandes hitos.
- Búsqueda por título, personaje o año, y filtros por período y tema.
- Accesible: se maneja con teclado, mouse o pantalla táctil y funciona con lector de pantalla. El texto mide al menos 18 px, hay un botón «Texto grande», el modo oscuro es automático y se respeta la preferencia de reducir el movimiento.
- Funciona sin conexión para lo ya visitado (Service Worker).
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

## Estructura

```text
data/       períodos, temas y un JSON de eventos por período (esquema en data/README.md)
src/        main.js (rutas #evento/<id>), timeline.js, detalle.js, filtros.js, datos.js,
            fechas.js, util.js, styles.css, sw.js (plantilla del Service Worker) y fonts/
public/     favicon, dibujos de respaldo por período (placeholders/) y licencia de la fuente (fonts/)
scripts/    validación de datos, verificación de imágenes y generación de docs/
docs/       FUENTES.md y REVISION_PENDIENTE.md
```

No usa frameworks: es HTML, CSS y JavaScript con módulos ES, y Vite solo empaqueta.

## Publicar en GitHub Pages

`vite.config.js` usa `base: './'` (rutas relativas). Así el mismo build funciona en `https://<usuario>.github.io/<repositorio>/`, en un dominio propio o en cualquier subcarpeta, sin cambiar nada. Como la navegación usa `#evento/<id>`, tampoco hace falta un `404.html`.

1. Sube el proyecto a un repositorio de GitHub, en la rama `main`.
2. En el repositorio, entra a **Settings → Pages → Build and deployment** y elige **Source: GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/pages.yml`, que valida los datos, construye y publica. La dirección del sitio aparece en **Settings → Pages** y en cada ejecución de la pestaña **Actions**.

Sin GitHub Actions, ejecuta `npm run build` y sube el contenido de `dist/` a cualquier hosting estático. Si cambias `base` por una ruta absoluta (por ejemplo `/<repositorio>/`), tiene que coincidir exactamente con la carpeta donde se publica.

## Contenido, fuentes e imágenes

- Los textos se redactaron con ayuda de IA a partir de las fuentes citadas y se cotejaron con ellas. Las fuentes principales son Memoria Chilena, la Biblioteca del Congreso Nacional, el Museo Histórico Nacional, el Archivo Nacional y publicaciones académicas. Los temas sensibles usan lenguaje neutral y cifras oficiales, siempre con su fuente.
- [`docs/FUENTES.md`](docs/FUENTES.md) reúne las fuentes y la imagen de cada evento.
- [`docs/REVISION_PENDIENTE.md`](docs/REVISION_PENDIENTE.md) lista los datos de menor certeza o con fuentes que no coinciden. Conviene revisarlo antes de usar el sitio en clases.
- Las imágenes son de [Wikimedia Commons](https://commons.wikimedia.org/), con licencias de dominio público, CC0, CC BY o CC BY-SA. El autor y la licencia se muestran junto a cada imagen. Se cargan desde Commons y no se copian al repositorio; si una no carga, se muestra un dibujo del período.
- Los títulos usan Source Serif 4 SemiBold, de Adobe, con la licencia SIL Open Font License 1.1 (texto en [`public/fonts/OFL-Source-Serif-4.txt`](public/fonts/OFL-Source-Serif-4.txt)). Se incluye solo el subconjunto latino que distribuye Google Fonts, sin modificar.
- Para agregar o corregir eventos, edita `data/NN-*.json` según `data/README.md` y luego ejecuta `npm test`, `npm run verificar-imagenes` y `npm run docs`.
