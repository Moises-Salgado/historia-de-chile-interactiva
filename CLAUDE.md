# Historia de Chile Interactiva — guía del proyecto

Sitio estático: Vite (solo empaquetador) + HTML + CSS + JS con ES modules. Sin frameworks ni librerías de UI o de líneas de tiempo. Interfaz en español de Chile.
Estructura: `src/` (main.js con las secciones `#inicio` (o sin #), `#linea` y `#mapa` (con `#mapa/<región>`, `#mapa/zona/<id>`, `#mapa/chile`, `#mapa/fuera` y `#lugar/<id>`) y las rutas `#evento/<id>`, `#grupo/<id>`, `#historias`, `#historia/<id>` (presentación), `#historia/<id>/<paso>`, `#historia/<id>/fin` (cierre con repaso), `#secuencia/<ids>/<paso>`, `#personaje/<nombre>`, `#acerca`, `#docentes` y `#glosario`; inicio.js = portada y mapa.js = mapa, con su HTML en index.html; chile-regiones.json lo genera `scripts/generar-mapa.mjs`; curvas.js, timeline.js, detalle.js, filtros.js, datos.js, fechas.js, util.js, sensibles.js (temas sensibles y repaso), glosario-aparece.js, styles.css, sw.js = plantilla del Service Worker que completa `vite.config.js` al construir; a pedido: paginas.js, repaso.js, escuchar.js, mapa.css, vistas.css y el detalle, las fuentes, «Lo que se discute» y el glosario de cada evento, un archivo por período que arma `vite.config.js`) · `data/` (periodos.json, temas.json, `NN-*.json`; recorridos.json, grupos.json, sabias-que.json, se-discute.json, lugares.json y ubicaciones.json solo ordenan, citan o ubican eventos existentes; glosario.json explica palabras, con fuente o con una oración de un evento) · `public/placeholders/` · `scripts/` · `docs/` · `.github/workflows/pages.yml`.
Esquema de datos: `data/README.md`. Comandos: `npm run dev` · `npm run build` · `npm run preview` · `npm test` (valida datos) · `npm run verificar-imagenes` · `npm run docs` (regenera docs/FUENTES.md y las listas de REVISION_PENDIENTE) · `npm run presupuesto` (tras construir: peso, letra mínima y duraciones).
Estado: fases 0-5 completas; mejoras visuales por olas en `docs/PLAN_MEJORAS.md` (Olas 1 a 3 hechas; la 4 requiere verificación humana); rediseño «Atlas» por fases A-E en `docs/IDEA_MAESTRA.md` (todas hechas; fuentes en `src/fonts/`, licencias OFL en `public/fonts/`), con agentes en `.claude/agents/`; plan MVP (pulido, movimiento y funciones que faltaban) por fases M1-M9 en `docs/PLAN_MVP.md`, con sus reglas de peso y movimiento. Al cambiar datos: editar el JSON → `npm test` → `npm run verificar-imagenes` → `npm run docs`.

## Trabajo por fases (0-5) y tokens
- Plan ≤ 8 líneas al iniciar una fase; resumen ≤ 5 líneas al cerrarla; commit corto (`fase N: ...`); esperar "continúa".
- No narrar ni imprimir archivos completos; ediciones puntuales. No leer node_modules, dist ni .git, ni releer archivos sin cambios.
- Datos por bloques: un JSON por período (~10-15 eventos, ~90 en total), nunca todo en una respuesta.
- Un solo arranque de `npm run dev` por fase. Sin tests exhaustivos: solo el test de humo del esquema (`npm test`).
- Imágenes: verificar solo con el script (reporta únicamente las que fallan). Si una fase crece, sugerir `/compact`.

## Veracidad histórica
- Solo hechos verificables, con ≥ 1 fuente en `fuentes`: Memoria Chilena, BCN, Museo Histórico Nacional, Archivo Nacional o publicaciones académicas; Wikipedia ES solo como entrada a contrastar.
- Fecha con la precisión real (`AAAA`, `AAAA-MM` o `AAAA-MM-DD`; a.C. = año negativo). Si es incierta: `fechaAproximada: true` y "c." en `fechaTexto`.
- Nunca inventar citas, cifras ni nombres: ante la duda, omitir o marcar como aproximado. Mejor un texto corto que un dato falso.
- Temas sensibles (pueblos originarios y Ocupación de la Araucanía, Guerra del Pacífico, dictadura 1973-1990, estallido social 2019): lenguaje neutral, hechos y cifras oficiales nombrando su fuente (Informes Rettig y Valech); indicar que existen distintas interpretaciones.
- Tres niveles por evento: `resumenNino` (1-2 oraciones simples), `resumen` (3-4 oraciones), `detalle` (1-3 párrafos).
- Posteriores a 2023: solo con certeza plena; si no, `"pendienteVerificacion": true` (la app no los muestra).
- Al final: `docs/FUENTES.md` (fuentes por evento) y `docs/REVISION_PENDIENTE.md` (datos de menor certeza).

## Imágenes (solo Wikimedia Commons)
- Licencias: dominio público, CC0, CC BY o CC BY-SA. Preferir pinturas, grabados, fotos y mapas de época; nunca IA ni fotogramas de películas.
- Guardar `archivo` (nombre exacto), `autor`, `licencia`, `urlPagina` y `pieDeFoto`.
- Mostrar con `https://commons.wikimedia.org/wiki/Special:FilePath/<archivo>?width=800`, `loading="lazy"` y crédito + licencia siempre visibles.
- Solo tamaños estándar de miniatura (120, 250, 330, 500, 960…; `width=800` se sirve como 960): Wikimedia limita por IP los demás. Miniaturas de la línea de tiempo: `?width=120` o `250`.
- Si falla, usar el placeholder SVG del período (`public/placeholders/periodo-NN.svg`); nunca una imagen rota.

## Interfaz y accesibilidad
- Línea de tiempo horizontal: franjas de color por período, eventos como puntos con miniatura y minimapa para saltar de siglo. Zoom según `importancia` (zoom mínimo: solo 3).
- Arrastrar o deslizar, rueda = zoom, botones grandes "◀ Anterior / Siguiente ▶", flechas del teclado y "Al inicio" (la pestaña "Inicio" es la portada); usable en celular con una mano.
- Detalle: imagen grande con crédito, fecha, título, texto según nivel, personajes, "¿Qué pasó antes / después?" y "Volver"; la URL cambia a `#evento/<id>`.
- Nivel de lectura siempre visible (Para niños / General / Detallado), guardado en localStorage. Filtros por período y tema; buscador por título, personaje o año.
- Texto mín. 18 px, contraste AA, botón "Texto grande", modo oscuro automático, todo por teclado, `aria-label`, foco visible, `prefers-reduced-motion`.
- Service Worker básico (sin conexión para lo visitado). Diseño sobrio: colores de la bandera solo como acento.
