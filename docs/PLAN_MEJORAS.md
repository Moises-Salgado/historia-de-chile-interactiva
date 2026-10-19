# Plan de mejoras visuales y de experiencia

Resultado de una mesa de cinco agentes (`.claude/agents/`): crítico de producto, director de arte, especialista en animación, narrativa y educación, y guardián de accesibilidad y rendimiento.

Cada agente revisó 12 capturas del sitio publicado y el código, propuso mejoras (ronda 1) y debatió las de los demás (ronda 2). Este documento recoge los acuerdos, las disputas que resolvió el moderador y un orden de implementación por olas.

## Diagnóstico compartido

- **La primera pantalla parece vacía.** En 1366×768 se ven 2 tarjetas y hay unos 380 px vacíos sobre ellas; en celular no se ve ningún evento.
  - Causa técnica: la bienvenida reserva 21,5 rem a lo ancho de la pista (`margenIzq`), la prehistoria tiene pocos eventos y las tarjetas prefieren los carriles bajos.
  - Con «Texto grande», en celular, la bienvenida se corta.
- **Todo pesa lo mismo.** Un hito y un evento complementario se ven iguales, y el cambio de período casi no se nota. La interfaz parece un formulario: system-ui sobre blanco y gris.
- **El detalle esconde lo mejor.** En celular el título queda bajo el pliegue, la imagen va entre barras grises, hay tres botones «Volver» y se pierde la referencia de dónde está uno en el tiempo.
- **El «+» confunde.** Promete «todos los eventos», pero al acercar quedan menos a la vista.
- **La búsqueda confunde.** «Prat» encuentra «Prats» y lleva a un niño a 1973 sin explicar por qué.
- **Lo que no se toca:**
  - los botones grandes con texto, las flechas y la URL `#evento/<id>`;
  - las imágenes de época con su crédito;
  - el selector de nivel siempre visible y «¿Qué pasó antes / después?».

## Reglas transversales (consenso)

1. **El mismo tratamiento para los 121 eventos.** Nada especial para guerras, 1973 ni el estallido: ni más épico ni más lúgubre.
   - Nada de temblor de pantalla, contadores animados (Rettig, Valech), zoom lento sobre fotos, fuego ni humo animados.
   - Nada de puntos, medallas, rachas, confeti ni «¡Completaste!».
2. **El movimiento reducido se blinda antes de animar nada.** El bloque CSS se extiende a los retardos y a `::view-transition-*`, y un helper en `util.js` no hace nada si `movimientoReducido()`.
3. **Qué se puede animar:**
   - Solo `opacity`, `translate` y `scale`, porque las tarjetas ya usan `transform` en línea.
   - Duraciones: microinteracciones de 120 a 200 ms; transiciones de 300 ms o menos; entrada a la portada de 400 ms o menos.
   - Nada en bucle; nada que bloquee los clics.
4. **Presupuesto de peso:**
   - JS nuevo: 4 KB o menos (gzip).
   - CSS nuevo: 6 KB o menos (gzip).
   - Fuentes: 90 KB o menos (el plan usa unos 30 KB).
   - Recursos SVG nuevos: 50 KB o menos.
   - Sin librerías y sin `backdrop-filter` sobre la línea.
5. **Métricas en celular de gama media:** LCP de 2,5 s o menos, CLS de 0,05 o menos, INP de 200 ms o menos y 60 fps al arrastrar.
6. **Colores:**
   - Todo color nuevo es un token en claro y en oscuro.
   - En oscuro, la tinta de cada período (`--color-tinta`) se aclara para llegar a 3:1 o más.
   - Hay respaldo para el modo de alto contraste (`forced-colors`).
7. **Mejora progresiva:** View Transitions, `@starting-style` y `interpolate-size` son extras. Sin ellos, la app funciona igual que hoy.

## Decisiones del moderador sobre las disputas

| Tema | Posturas | Decisión |
|---|---|---|
| Cielo sobre la línea | Cartela del período (director), portada de capítulo (narrativa), más eventos a la vista (crítico) | Una sola **cartela adaptable** en el espacio que sobra sobre los carriles, nunca a costa de un carril. Muestra «Período N de 9», nombre y fechas, y la descripción en 2 líneas si cabe. Debajo de 4 rem se oculta. |
| Bienvenida | «Tres puertas» a pantalla completa (narrativa) contra ver un evento de inmediato (crítico, guardián) | **Fuera de la pista y nunca a pantalla completa:** una frase y un botón «Empezar». «Elegir una historia» se agrega cuando existan las historias. «Buscar» no se duplica, porque ya está en la cabecera. |
| Tinte de época | Tinte global animado (animación) contra lavado por franja (director) | **Lavado estático por franja**, con la misma intensidad en los 9 períodos. Su autor retiró el tinte global. |
| Fuentes | 2 familias y 150 KB (director, al inicio); Atkinson para el cuerpo (narrativa, guardián); solo una serif en títulos (crítico, animación) | **Source Serif 4 SemiBold solo en títulos**, cartela y marca (unos 25-30 KB, `font-display: optional`). El cuerpo y la interfaz siguen en system-ui. Sin cursiva en los pies de foto. Atkinson queda como prueba posible para el cuerpo del detalle si se mide que no corta títulos. |
| Zoom animado | View Transitions por tarjeta contra FLIP o un fundido (posturas que se cruzaron en el debate) | **Ola 1:** corregir el comportamiento del «+» y hacer que las tarjetas nuevas entren con un fundido (`@starting-style`). **Ola 2:** View Transitions solo con +/− y filtros, con las salvaguardas del guardián. Si no da 50 fps o más con la CPU frenada a 4×, el zoom queda instantáneo. |
| Capitular | Director a favor; narrativa en contra (tono de cuento, inapropiado en temas sensibles) | **Se descarta.** |
| Números romanos | Director a favor; narrativa en contra (un niño de 8 años no los lee con soltura) | **«Período 3 de 9»** en texto. |
| Cordillera decorativa | Director; crítico («no resuelve nada») | Fuera de las olas 1 y 2. Opcional después, muy tenue y estática. |

## Ola 1 · Base y primera impresión (sin contenido nuevo)

**Estado: hecha (18-10-2026).** Se verificó con capturas en Edge:

| Criterio | Antes | Después |
|---|---|---|
| Eventos a la vista en 1366×768 | 2 | 6 |
| Eventos a la vista en 1920×1080 | — | 19 |
| Evento a la vista en celular, con y sin «Texto grande» | 0 | 1 |
| Botones cortados en la cabecera o la barra inferior | — | ninguno |
| Detalle en celular | título bajo la imagen | título a 255 px, imagen en la primera pantalla |
| Botones «Volver» | 3 | 1 |
| Primer resultado al buscar «Prat» | Golpe de Estado | Combate Naval de Iquique (Arturo Prat); Carlos Prats queda como coincidencia parcial con su motivo |
| Letra mínima | 18 px | 18 px |
| Errores de consola | — | ninguno |
| Peso agregado (gzip) | — | CSS +1 KB, JS +1,2 KB |

Quedan pendientes:
- Al inicio, en la prehistoria (pocos eventos en miles de años), el «+» separa los eventos y caben menos en pantalla. En los períodos densos, el primer «+» suma eventos sin perder ninguno de vista.
- Lighthouse no se corrió; LCP y CLS se midieron en la Ola 2, con el protocolo de DevTools.

1. **Blindar el movimiento reducido** con un solo helper, `conTransicion`/`animar`, en `util.js`. Esfuerzo S.
2. **Portada:**
   - Sacar la bienvenida de la pista y dejar `margenIzq` en unos 1,25 rem.
   - Cielo adaptable en `distribuir()` con la cartela del período.
   - Lavado de color por franja.
   - Cabecera compacta con «Texto grande».
   - Esfuerzo M.
3. **Detalle:**
   - Fecha, título y etiquetas antes de la imagen en el DOM.
   - Imagen sin carga diferida, con `fetchpriority="high"` y alto reservado (sin barras grises ni saltos al cargar).
   - Un solo «Volver» en celular.
   - Vecinos con miniatura.
   - «Sobre el período» visible.
   - Una regla del tiempo con los 9 colores y un punto donde está el evento.
   - Esfuerzo M.
4. **Sistema visual:**
   - Paleta «papel y tinta» (`--texto-suave` 7,1:1, `--borde-fuerte` 4,3:1, verificados).
   - Tarjetas tipo cédula: los hitos (importancia 3) con imagen a sangre y fecha en una pastilla del color del período, sin cambiar el tamaño de la tarjeta.
   - `--color-tinta` para el modo oscuro, `forced-colors` y áreas táctiles de 24 px en los puntos.
   - Esfuerzo S-M.
5. **Búsqueda por niveles:**
   - Primero las coincidencias de palabra completa.
   - Después, «coincidencias parciales» con la palabra que coincidió (por ejemplo, «Personaje: Carlos Prats»).
   - Sin coincidencias en medio de una palabra.
   - El botón de un personaje filtra por su nombre exacto.
   - Resultados con miniatura y período.
   - Esfuerzo S-M.
6. **Zoom y eje:**
   - El «+» nunca muestra menos eventos y el aviso dice la verdad.
   - Las tarjetas nuevas entran con un fundido.
   - El eje marca el salto de escala («aquí pasan miles de años»).
   - Esfuerzo S-M.

**Criterios de aceptación:**
- En 1366×768 se ven 5 o más eventos con imagen sin desplazar, con 15 % o menos de espacio muerto.
- En celular se ve el primer evento con y sin «Texto grande», y ningún control queda cortado.
- En el detalle en celular, título, fecha e imagen caben en la primera pantalla.
- Los hitos se distinguen a 2 m en un proyector.
- «Prat» muestra primero a Arturo Prat.
- Para comprobarlo: repetir las 12 capturas, revisar con Lighthouse en celular y correr `npm test`.

## Ola 2 · Lucimiento y movimiento

**Estado: hecha (18-10-2026), salvo el zoom animado.** Se verificó con capturas en Edge, con y sin movimiento reducido:

| Criterio | Resultado |
|---|---|
| Transición de la tarjeta al detalle y de vuelta (también con Atrás) | la lámina crece y se encoge en 280 ms; espera la imagen 250 ms como máximo y, si no llega, solo hay fundido |
| «Pasar la página» (Anterior / Siguiente y «¿Qué pasó antes / después?») | la página sale en 120 ms y la nueva entra en 200 ms por el lado del recorrido, sin textos encimados |
| Movimiento reducido | ninguna View Transition ni animación |
| Zoom con View Transitions, CPU frenada 4× | **23 a 58 fps** (unos 41 de promedio), con cuadros de hasta 65 ms. No llega a 50 fps: **el zoom queda instantáneo**, como se acordó, y las tarjetas nuevas conservan su fundido |
| LCP en celular, CPU 4× y «4G lenta», con caché vacía | portada 2,2 s; segunda visita 1,0 s; escritorio 2,2 s; detalle abierto por enlace directo 4,4 s, por el peso de la imagen de Commons (960 px) |
| CLS | 0 en la portada y 0,003 en el detalle |
| Letra mínima | 18 px (22 px con «Texto grande») |
| Peso agregado (gzip) | CSS +0,9 KB, JS +1,4 KB y la fuente, 21,5 KB (precargada; `font-display: optional`) |
| Errores de consola | ninguno |

Quedan pendientes:
- La imagen grande del detalle abierto por enlace directo pesa demasiado para una red lenta. Commons no ofrece un formato más liviano para cada imagen. Se agregó `preconnect` a los dos servidores de imágenes.
- Las 12 capturas originales de la mesa no se repitieron una por una; se revisaron las equivalentes de cada criterio.

- Source Serif 4 SemiBold para los títulos.
- **Transición de la tarjeta al detalle (View Transitions):**
  - La miniatura crece hasta la lámina. Dura 300 ms o menos y espera a que la imagen esté lista (`decode()`), con un tope de 250 ms.
  - Funciona también con el botón Atrás.
  - La imagen de 800 se precarga solo en `pointerdown` o con Enter.
- **«Pasar la página»** con dirección (Siguiente entra por la derecha), también para «¿Qué pasó antes / después?».
- Fundido de 250 ms al cargar las imágenes, sobre el tono del período.
- Al seleccionar un evento, su anillo se asienta y el punto emite una sola onda.
- Entrada a la portada: el eje se dibuja y las tarjetas visibles suben. Dura 400 ms o menos y solo ocurre en la primera visita de la sesión.
- **Microinteracciones:**
  - `:active` en los botones;
  - entrada del panel de búsqueda y de sus resultados;
  - desplegables con apertura suave.
- Zoom con View Transitions, solo si pasa la medición.
- «Hace X años» («hace unos…» si la fecha es aproximada).
- Marca discreta de «ya visto»: punto relleno más texto para el lector de pantalla, sin contadores.

## Ola 3 · Narrativa con los datos actuales

**Estado: hecha (18-10-2026).** Se verificó con capturas en Edge (escritorio, 1280 y 1200 px, celular, modo oscuro y modo clase):

| Criterio | Resultado |
|---|---|
| Historias guiadas | 4 historias y 28 pasos: Independencia (9), Grandes terremotos (6), Constituciones (8) y Mujeres en la vida pública (5). «Paso N de M» se anuncia al lector de pantalla y el último paso solo ofrece elegir otra historia |
| Pueblos originarios | una tarjeta, «Pueblos que vivían aquí (9 pueblos)», con un mosaico, una sola ranura y un solo punto en el eje; abre la lista de norte a sur. Si un filtro deja uno solo («mapuche»), vuelve su tarjeta propia |
| Eventos a la vista en 1366×768 | 9 tarjetas (antes 6) |
| Ficha de personaje | 40 personajes que aparecen en 2 o más eventos; sin retrato ni biografía |
| «¿Sabías que…?» | 77 frases copiadas del detalle. `npm test` comprueba que estén textuales y que no haya ninguna en temas sensibles: guerras de la Conquista, de la Araucanía y del período 05 (incluida la del Pacífico), la dictadura, matanzas y el estallido |
| «¿Qué edad tenías?» | se guarda solo en el navegador, con «Olvidar»; desde 1900 |
| Modo «Proyectar en clase» | letra al 140 %, colores claros y cabecera en una fila; Av Pág y Re Pág avanzan |
| Cabecera | una fila desde 1200 px |
| Peso agregado (gzip) | JS +9,6 KB (unos 4 KB son las frases de «¿Sabías que?»), CSS +0,7 KB |
| Errores de consola | ninguno |

Revisión final del crítico y del guardián de accesibilidad: 15 hallazgos, todos corregidos y comprobados en Edge.
- **Contenido:** se quitaron frases sensibles o que no se entendían fuera de contexto.
- **Recorrido:**
  - el último paso ofrece «Elegir otra historia» y «Siguiente» lleva a la lista;
  - «Volver» desde la ficha de un personaje regresa al evento;
  - Anterior y Siguiente del detalle cuentan el grupo de pueblos como uno solo.
- **Presentación:**
  - los personajes sin ficha van en una frase y ya no parecen botones;
  - los resúmenes de las listas se cortan en 3 líneas;
  - la regla de un personaje muestra un tramo;
  - Av Pág y Re Pág recorren primero el texto del detalle.
- **Accesibilidad:**
  - el formulario de edad ya no pierde el foco y su aviso se lee;
  - Escape dentro del campo no cierra la vista;
  - el foco sigue a la selección en la línea;
  - el modo clase siempre se puede desactivar.

Lo planificado:
- **Historias guiadas** en `data/recorridos.json`, validadas por `npm test`:
  - Tienen ruta propia, «Paso 3 de 7» con aviso `aria-live` y ninguna celebración al final.
  - Primeras tres: Independencia, Terremotos y Constituciones. Todos sus eventos ya existen en los datos.
- Portada con la puerta «Elegir una historia».
- Los pueblos originarios dejan de verse apilados en «c. 1500»: se agrupan como «pueblos que vivían aquí», ordenados de norte a sur.
- Ficha de personaje, sin retrato.
- «¿Sabías que?» con una cita textual del `detalle`.
- Modo «Proyectar en clase».
- «¿En qué año naciste?» opcional: «Tenías X años», guardado solo en el navegador y con un botón «Olvidar».

## Ola 4 · Contenido nuevo (requiere verificación)

**Estado: no se implementó.** Todo lo de esta ola es contenido nuevo que una persona debe revisar antes de publicarlo:
- las coordenadas y el mapa (proyección y ubicación de cada lugar);
- la identidad de cada retrato;
- las preguntas «Para pensar», que requieren revisión docente.

Hacerlo sin esa revisión iría contra las reglas de veracidad de `CLAUDE.md`.

- Coordenadas aproximadas y un mapa «¿Dónde pasó?». El mapa es decorativo y el lugar sigue escrito en texto.
- Mapa de los pueblos originarios de norte a sur, con una lista accesible equivalente.
- Retratos de personajes desde Commons, revisados con `npm run verificar-imagenes`.
- Preguntas «Para pensar», con revisión docente.
- Todo pasa por el flujo del proyecto: fuentes, `npm test` y `npm run docs`.

## Descartado

- Tinte global animado (lo retiró su autor).
- Capitular.
- Fondos de foto borrosos.
- Indicador deslizante en el selector de nivel (requiere medir en JS y aporta poco).
- Números romanos.
- Parallax.
- Bienvenida a pantalla completa.
- Cursiva en los pies de foto.
- Cualquier gamificación.
