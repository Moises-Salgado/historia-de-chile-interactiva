# Historia de Chile Interactiva — guía del proyecto

Sitio estático: Vite (solo empaquetador) + HTML + CSS + JS con ES modules. Sin frameworks ni librerías de UI o de líneas de tiempo. Interfaz en español de Chile.
Estructura: `src/` (main.js con las secciones `#inicio` (o sin #), `#linea` (y `#linea/<NN>`, que salta a un período) y `#mapa` (con `#mapa/<región>`, `#mapa/zona/<id>`, `#mapa/chile`, `#mapa/fuera` y `#lugar/<id>`) y las rutas `#evento/<id>`, `#grupo/<id>`, `#historias`, `#historia/<id>` (presentación), `#historia/<id>/<paso>`, `#historia/<id>/fin` (cierre con repaso), `#secuencia/<ids>/<paso>`, `#personaje/<nombre>`, `#acerca`, `#docentes` y `#glosario`; inicio.js = portada y mapa.js = mapa, con su HTML en index.html; chile-regiones.json lo genera `scripts/generar-mapa.mjs`; curvas.js, timeline.js, detalle.js, filtros.js, datos.js, fechas.js, util.js, sensibles.js (temas sensibles y repaso), glosario-aparece.js, escuchar.js, styles.css, vistas.css, sw.js = plantilla del Service Worker que completa `vite.config.js` al construir; a pedido: paginas.js, repaso.js, mapa.css y el detalle, las fuentes, «Lo que se discute» y el glosario de cada evento, un archivo por período que arma `vite.config.js`) · `data/` (periodos.json, temas.json, `NN-*.json`; recorridos.json, grupos.json, sabias-que.json, se-discute.json, lugares.json y ubicaciones.json solo ordenan, citan o ubican eventos existentes; preguntas.json trae las preguntas de repaso escritas a mano (temas sensibles), cada una respondida por una oración copiada del evento; glosario.json explica palabras, con fuente o con una oración de un evento; imagenes-medidas.json guarda ancho y alto de cada imagen y lo escribe `npm run medir-imagenes`) · `public/placeholders/` · `scripts/` · `docs/` · `.github/workflows/pages.yml`.
Esquema de datos: `data/README.md`. Comandos: `npm run dev` · `npm run build` · `npm run preview` · `npm test` (valida datos) · `npm run verificar-imagenes` · `npm run medir-imagenes` (medidas de las imágenes en Commons) · `npm run docs` (regenera docs/FUENTES.md y las listas de REVISION_PENDIENTE) · `npm run presupuesto` (tras construir: peso, letra mínima y duraciones).
Estado: contenido, funciones y accesibilidad terminados (fases 0-5, olas 1-3, rediseño «Atlas» A-E, MVP M1-M9 y auditoría A1-A9; los planes quedan en `docs/` como historial, no como trabajo pendiente). Lo editorial pendiente está en `docs/REVISION_PENDIENTE.md` y lo decide el dueño. **Etapa actual: pulido visual y de movimiento, por pasadas (ver «Dirección de arte»).** Al cambiar datos: editar el JSON → `npm test` → `npm run verificar-imagenes` (y `npm run medir-imagenes` si cambió una imagen) → `npm run docs`.

## Forma de trabajo y tokens
- Cada pasada visual cubre UNA vista (portada, línea de tiempo, ficha de evento, mapa, historias, páginas de texto). Al iniciar: plan ≤ 8 líneas con 2-3 opciones en texto; esperar elección antes de implementar. Al cerrar: resumen ≤ 5 líneas, commit corto (`visual: ...`), esperar "continúa".
- No narrar ni imprimir archivos completos; ediciones puntuales. No leer node_modules, dist ni .git, ni releer archivos sin cambios. Si una pasada crece, sugerir `/compact`.
- Una pasada visual NO toca `data/`, textos, fuentes, `docs/FUENTES.md` ni `docs/REVISION_PENDIENTE.md`. Si el diseño pide un cambio de contenido, anotarlo en el resumen y no hacerlo.
- Un solo arranque de `npm run dev` por pasada. Tests: `npm test` solo si se tocó `data/`; `npm run build && npm run presupuesto` al cerrar toda pasada visual.

## Dirección de arte
Identidad: atlas histórico o publicación de museo. Serio, cálido y legible; no una startup ni un sitio infantil. Lo que engancha son las imágenes de época grandes, la jerarquía clara y una primera pantalla que invite a recorrer, no los colores llamativos.
- Paleta (tokens CSS en `:root`, un solo lugar): base `--tinta-profunda #0f2c36`; papel `--papel #f4efe6` (fondo claro); texto `--tinta #1b1b1b`; acento cálido `--ocre #7a5612` (texto) y `--ocre-claro #b8862b` (solo líneas, rótulos grandes y fondos); rojo `#d52b1e` y azul `#0039a6` de la bandera únicamente como acentos pequeños (marcas, subrayados). Modo oscuro: fondo `#0b1f27`, texto `#ece6da`, mismos acentos. Nada de gradientes saturados ni sombras moradas; sombras suaves y cálidas si hacen falta. Cada franja de período conserva su color, pero desaturado para que no compita con las imágenes.
- Tipografía: Source Serif 4 para texto corrido y títulos largos; Barlow Condensed para fechas, cifras, rótulos y navegación. Escala tipográfica fija (p. ej. 18 / 21 / 26 / 34 / 48 px) y nunca más de dos pesos por familia.
- Imágenes: protagonistas. Encabezado de evento a ancho completo con crédito y licencia legibles sobre una banda, no sobre la imagen. Nunca recortar una obra de modo que pierda su sentido; usar `object-position` por imagen si hace falta. Mientras carga: color promedio o placeholder del período, nunca un salto de layout (reservar alto con las medidas de `imagenes-medidas.json`).
- Portada: una imagen de época grande, el título, una frase y las tres entradas (línea, mapa, historias) visibles sin hacer scroll en escritorio y en celular. Las cifras (121 eventos, 9 períodos…) van después, no antes.
- Espacio y ritmo: márgenes generosos, máximo ~70 caracteres por línea en texto corrido, separación entre secciones con filetes finos en ocre, no con bloques de color.
- «Para niños»: misma paleta e identidad; cambia el texto, el tamaño y, a lo sumo, una ilustración o ícono más amable por período. No convertirlo en un sitio de colores primarios.

## Movimiento
Regla: cada animación explica el tiempo o el territorio; ninguna es adorno. Si al quitarla no se pierde información ni orientación, no va.
- Duraciones: 150-250 ms para estados (hover, foco, abrir menú), 250-400 ms para transiciones de vista. Nada más largo, salvo un Ken Burns lento en encabezados de evento (escala 1,00 → 1,05 en ~20 s, una sola vez). Curvas `ease-out` al entrar, `ease-in` al salir.
- Transiciones entre rutas con View Transitions API (`document.startViewTransition`) cuando exista; fallback: fundido de 200 ms. La imagen del evento viaja desde su miniatura en la línea hasta el encabezado de la ficha (`view-transition-name` por evento).
- Línea de tiempo: al cambiar de período o siglo, el eje se desplaza (no desaparece y reaparece); las franjas y puntos entran con un escalonamiento corto (≤ 40 ms entre elementos, ≤ 10 elementos escalonados).
- Mapa: al filtrar por período las regiones se tiñen de norte a sur con escalonamiento; al elegir una región, el panel de eventos se desliza desde el lado del mapa.
- Historias guiadas: el conector («Unos 40 años después») se revela con un trazo que se dibuja (`stroke-dashoffset`) y el paso siguiente entra desde abajo.
- Cifras de la portada: cuentan desde cero al entrar en pantalla (`IntersectionObserver`), 600 ms, una sola vez.
- Siempre: `@media (prefers-reduced-motion: reduce)` desactiva todo lo anterior salvo los cambios de opacidad. Nada que parpadee ni se mueva en bucle. Animar solo `transform` y `opacity`; nunca `width`, `height`, `top` o `left`. Respetar los límites de `npm run presupuesto`.

## Verificación visual
- Claude no ve el navegador: la primera pasada crea `scripts/capturas.mjs` (Playwright) y `npm run capturas`, que guarda en `capturas/` (ignorado en git) la portada, la línea de tiempo, una ficha de evento (`#evento/1818-batalla-de-maipu`), el mapa con un período filtrado, un paso de historia y el glosario, en 390×844 (celular) y 1440×900 (escritorio), en claro y oscuro, con y sin «Texto grande».
- Toda pasada visual termina con `npm run capturas` y la revisión de las imágenes: textos cortados, contraste, superposiciones, saltos de layout, crédito ilegible. Lo que se vea mal se arregla antes de cerrar la pasada.
- Cada tres pasadas, una de auditoría: solo mirar capturas y listar inconsistencias entre vistas (tamaños, colores, espaciados que no siguen los tokens), sin arreglar nada en esa sesión.

## Veracidad histórica
- Solo hechos verificables, con ≥ 1 fuente en `fuentes`: Memoria Chilena, BCN, Museo Histórico Nacional, Archivo Nacional o publicaciones académicas; Wikipedia ES solo como entrada a contrastar.
- Fecha con la precisión real (`AAAA`, `AAAA-MM` o `AAAA-MM-DD`; a.C. = año negativo). Si es incierta: `fechaAproximada: true` y "c." en `fechaTexto`.
- Nunca inventar citas, cifras ni nombres: ante la duda, omitir o marcar como aproximado. Mejor un texto corto que un dato falso.
- Temas sensibles (pueblos originarios y Ocupación de la Araucanía, Guerra del Pacífico, dictadura 1973-1990, estallido social 2019): lenguaje neutral, hechos y cifras oficiales nombrando su fuente (Informes Rettig y Valech); indicar que existen distintas interpretaciones. No llevan «Lo que se discute» los hechos que el Estado y la justicia reconocen como violaciones a los derechos humanos.
- Tres niveles por evento: `resumenNino` (1-2 oraciones simples), `resumen` (3-4 oraciones), `detalle` (1-3 párrafos).
- Posteriores a 2023: solo con certeza plena; si no, `"pendienteVerificacion": true` (la app no los muestra).
- `docs/FUENTES.md` (fuentes por evento) y `docs/REVISION_PENDIENTE.md` (datos de menor certeza) se mantienen al día con `npm run docs`.

## Imágenes (solo Wikimedia Commons)
- Licencias: dominio público, CC0, CC BY o CC BY-SA. Preferir pinturas, grabados, fotos y mapas de época; nunca IA ni fotogramas de películas. Obras de Fray Pedro Subercaseaux: no antes de 2027.
- Guardar `archivo` (nombre exacto), `autor`, `licencia`, `urlPagina` y `pieDeFoto`.
- Mostrar con `https://commons.wikimedia.org/wiki/Special:FilePath/<archivo>?width=800`, `loading="lazy"` y crédito + licencia siempre visibles.
- Solo tamaños estándar de miniatura (120, 250, 330, 500, 960…; `width=800` se sirve como 960): Wikimedia limita por IP los demás. Miniaturas de la línea de tiempo: `?width=120` o `250`.
- Si falla, usar el placeholder SVG del período (`public/placeholders/periodo-NN.svg`); nunca una imagen rota.

## Interfaz y accesibilidad
- Línea de tiempo horizontal: franjas de color por período, eventos como puntos con miniatura y minimapa para saltar de siglo. Zoom según `importancia` (zoom mínimo: solo 3).
- Arrastrar o deslizar, rueda = zoom, botones grandes "◀ Anterior / Siguiente ▶", flechas del teclado y "Al inicio" (la pestaña "Inicio" es la portada); usable en celular con una mano.
- Detalle: imagen grande con crédito, fecha, título, texto según nivel, personajes, "¿Qué pasó antes / después?" y "Volver"; la URL cambia a `#evento/<id>`.
- Nivel de lectura siempre visible (Para niños / General / Detallado), guardado en localStorage. Filtros por período y tema; buscador por título, personaje o año.
- Texto mín. 18 px, contraste AA, botón "Texto grande", modo oscuro automático, todo por teclado, `aria-label`, foco visible, `prefers-reduced-motion`. Ningún cambio visual puede bajar lo que ya cumple esta sección; «Proyectar en clase» y «Escuchar» siguen funcionando.
- Service Worker básico (sin conexión para lo visitado).
