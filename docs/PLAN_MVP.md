# Plan MVP: pulido, movimiento y lo que faltaba

Pedido del dueño (2026-10-19): dejar la app «bonita», con más animación y a nivel de MVP profesional, haciendo todas las mejoras que salieron de la revisión. Revisaron cinco agentes (crítico, director de arte, animación, narrativa y guardián) en dos rondas, sobre 33 capturas. Este documento guarda lo que se decidió; cada fase se cierra con un commit `mvp N: …`.

## Reglas para todo lo nuevo (del guardián, aceptadas por todos)

- **Peso:** la carga inicial crece 8 KB gzip como máximo (JS y CSS) y ninguna vista pasa de 210 KB propios. Lo que se carga a pedido con `import()` (repaso, glosario, kit docente, «Acerca de»…) tiene su propio tope: 15 KB gzip por módulo, datos incluidos, y 60 KB en total. Se carga solo tras una acción y, si falla, ofrece «Recargar». Sin fuentes, librerías ni imágenes ráster nuevas en la app; SVG decorativos de 3 KB como máximo.
- **Métricas** (4G lenta, CPU 4×): LCP ≤ 2,5 s y ninguna vista empeora más de 100 ms; CLS ≤ 0,02; INP ≤ 200 ms; ≥ 50 fps al arrastrar la línea.
- **Movimiento:**
  - **Propiedades:** solo `opacity`, `translate` y `scale` (y `rotate` en íconos chicos). Nunca medidas, `filter`, sombras animadas ni canvas animado. `clip-path` solo en la silueta de la portada.
  - **Tokens de duración:** micro 120 ms, corta 180 ms, media 280 ms y larga 400 ms (el tope, escalón incluido); escalón de 30 ms con 6 pasos como máximo. Un cambio de vista dura 300 ms o menos, y `::view-transition` lleva `pointer-events: none`.
  - **Tokens de curva:** estándar, entrada, salida y asentar.
  - **Lo prohibido:** nada en bucle, automático ni ligado al desplazamiento. Lo que aparece bajo el pliegue usa IntersectionObserver una sola vez, y sin JS se ve igual.
  - **Movimiento reducido:** todo es instantáneo. En JS solo se usan `animar()`, `conTransicion()` y `conducta()`.
  - **Foco:** se mueve dentro del callback de la transición y nunca queda en algo inerte o invisible.
  - **Hover con movimiento:** solo dentro de `@media (hover: hover)`.
  - **El LCP** nunca parte con opacidad 0.
- **Pantalla y color:**
  - Ningún elemento fijo nuevo.
  - Tokens con AA medido en claro y oscuro, también en modo clase y con texto grande; los bordes de 1 px, con 3:1.
  - `@supports` para cada `color-mix()` con `var()`: Chrome 109 y Safari ≤ 16 lo anulan.
  - Respaldo en `forced-colors`.
- **Trato igual:**
  - **Movimiento:** la misma duración y curva para los 121 eventos. Sin rebotes, confeti ni celebración, porque no se celebra haber leído sobre violaciones a los derechos humanos.
  - **Regiones:** no se «colorean», «conquistan» ni «desbloquean»: nada de olas de color de norte a sur.
  - **Destino del punto que viaja:** sin estela, flechas ni trazo de «avance»; si el destino es una zona, todo Chile o el extranjero, solo fundido.
  - **El alfiler elegido:** una sola onda, en cobre y nunca roja.
  - **El progreso:** solo como dato («5 de 12»), sin «completado» ni porcentaje.

## Decisiones del dueño, tomadas por defecto (se pueden revertir)

- **Se mantienen** la estrella de la marca (la marca nueva «franja y escala» queda propuesta), la letra del sistema para leer (la serif queda propuesta) y las imágenes por `Special:FilePath` (la `thumburl` directa queda propuesta).
- **Vista previa al compartir:** la misma tarjeta de marca, sin foto, para los 121; con título completo y `resumenNino` entero.
- **«Escuchar»:** solo si hay una voz `es-*` y nunca arranca solo. Una persona debe revisar cómo pronuncia los nombres mapuche, rapanui, aymara, kawésqar y yagán (va a `REVISION_PENDIENTE.md`).
- **Retratos de personajes y rótulo de época de cada imagen:** quedan para después del MVP, porque cada uno exige verificación uno a uno. Hasta entonces, la ficha de personaje muestra el mosaico de sus eventos.
- **`npm run presupuesto`:** es una revisión aparte (peso, letra mínima, duraciones). `npm test` sigue siendo solo el esquema.

## Fases

### M1 · Base técnica (lo que hoy falla)
- **Foco tapado (WCAG 2.4.11):**
  - `scroll-padding` en el buscador, la hoja del mapa y la fila de chips.
  - Con el buscador abierto, la barra inferior queda inerte y oculta.
- **Errores visibles:**
  - Una ruta desconocida muestra un aviso y vuelve a su sección.
  - Si la app no arranca, un script de rescate en `index.html` ofrece «Recargar».
  - `public/404.html` propio, con la silueta.
- **Respaldo de `color-mix()`:** con `@supports`.
- **Aviso sin conexión:** «Sin conexión: ves lo que ya abriste». Además, `MAX_IMAGENES` baja a 60.
- **Impresión:** `@media print`, con el detalle como una lámina, sin barras, y con crédito y fuentes con URL.
- **Hover:** el levantar la lámina va dentro de `(hover: hover)`.
- **`npm run presupuesto`:** gzip de `dist`, letra de 1rem o más y duraciones dentro de los tokens.

### M2 · Sistema visual (D1, A10, C7)
- **Tokens:**
  - Escala tipográfica de 7 pasos, ninguno bajo 1rem.
  - Radios s/m/l/píldora, 3 sombras y los de movimiento.
- **Botones y estados:**
  - Botones sin subrayado, con borde de 1 px (3:1) y sombra.
  - Un solo primario por pantalla: «Siguiente» en cobre al leer.
  - Los mismos estados en botones, pestañas, nivel y chips: cobre = acción, invertido = elegido, filete cobre = estás aquí.
- **Íconos:** 18 en SVG propio en `svg.simbolos`, que reemplazan ◀ ▶ ✓ − +. Siempre junto a la palabra, nunca en su lugar. Con texto grande en el celular, el ícono va sobre la palabra.
- **Cabecera:**
  - Pestaña actual con un indicador que se desliza: niebla al 10 % y filete cobre de 3 px.
  - Nivel con píldora deslizante y rótulo visible «Leer:».
  - «A+» pasa a decir «Texto».
- **Transiciones de 120 ms** en fondo, borde y color de botones y chips.

### M3 · Línea de tiempo: la lámina manda (C1, D5, A1, A6, A9)
- **Sin la franja de ayuda:** los botones de zoom dicen «Menos» y «Más».
- **La cartela pasa a ser «Lo elegido»:**
  - Con un portal, número, nombre, fechas y descripción del período.
  - Con una lámina, fecha, título, resumen del nivel y «Leer ▶».
  - Cambia con Anterior y Siguiente.
- **El período se nombra en dos lugares:** el portal y la franja inferior, que baja a unos 32 px.
- **Láminas más grandes:** unas 11 × 17 rem en los hitos, con las alturas de las demás en proporción.
- **Huecos:** cada lámina se acerca a su punto; si sobra mucho espacio, «+N eventos · acercar».
- **Saltos largos** (más de dos pantallas): fundido y salto, sin recorrer la pista ni pedir sus imágenes. La cartela entra en la dirección del recorrido.
- **✓ de visto:** en SVG, más grande; se asienta al volver, sin rebote.
- **Minimapa:** más fino, conservando 44 px de área táctil. Títulos con `text-wrap: pretty` si la medición lo confirma.
- **Zoom con + y −:** FLIP de 280 ms, solo `translate`, en 20 láminas como máximo. Si no llega a 50 fps con la CPU 4× más lenta, queda instantáneo.

### M4 · Transiciones entre vistas (A2, A3, A4, A8)
- **Cambio de sección:** la vieja se funde en 120 ms y la nueva entra por su eje en 200 ms (la línea de lado, el mapa de norte a sur), 300 ms en total como máximo. Va con el indicador de la pestaña.
- **Anterior y Siguiente:** el punto del mini-mapa viaja de un lugar al otro y la marca de la regla corre, sin estela; si el destino es una zona, todo Chile o el extranjero, solo fundido. En las historias avanza el segmento de la barra.
- **La lámina crece desde cualquier miniatura:** buscador, mapa, fichas, vecinos y destacado. La miniatura ya descargada (`currentSrc`) sirve de previa mientras llega la imagen grande.
- **Listas:** escalonadas al abrir, no en cada tecla. El cambio de nivel, con fundido de 180 ms.

### M5 · Buscador, listas y mapa (C3, D6, D8, A5, G1)
- **Buscador:**
  - Usa todo el alto, con ~5 resultados a la vista.
  - Filtros como chips arriba, en vez de casillas marcadas.
  - Campo en píldora con lupa y botón para borrar.
  - `<mark>` que respeta tildes («Maipu» marca «Maipú»).
  - «Sin resultados» con sugerencias.
- **Tarjeta de lista única** para resultados, eventos del mapa, fichas, vecinos y regiones.
- **Mapa:**
  - Costa con `<use>`, escala gráfica norte-sur, flecha de norte y halo cobre en lo elegido.
  - Ruta «Chile › Región › Lugar».
  - El panel entra según la dirección y la hoja sube en el celular.
  - Una onda cobre en el alfiler elegido.
  - Al filtrar, fundido simultáneo.

### M6 · Portada y detalle (C8, D7, A7, D4, C4, C5)
- **Portada:**
  - La puerta de la línea vale 2fr. La del mapa lleva silueta y puntos.
  - Franja de cifras.
  - Períodos con imagen y numeral.
  - «Tu recorrido» con una barra de 9 tramos, que muestra datos y no logros.
  - La llegada, una vez por sesión: `data-llegada`, puesto por el script de `index.html`. Bajo el pliegue, IntersectionObserver.
  - Pie tipo colofón: Acerca de, Fuentes, Licencias, Código y Cómo citar.
- **Detalle:**
  - Paspartú según la orientación de la imagen, ficha con filete del color del período y vecinos con imagen 16:9.
  - «Sobre el período» como mini-portal.
  - «Compartir» y «Cómo citar».
- **«Para niños»:**
  - «Leyendo: Para niños», imagen primero y más grande, y letra mayor.
  - Ficha sin rótulos técnicos.
  - «Fuentes» se llama «¿Cómo lo sabemos?».
  - Sin mascotas ni paleta propia.
- **Modo clase:**
  - Cabecera de una fila y «Pantalla completa».
  - AvPág y RePág avanzan y retroceden.
  - Imagen más alta.
  - Sin datos personales: sin «¿Qué edad tenías?».

### M7 · Compartir, instalar, acerca de y docentes (G3, D2, C-MVP, N8)
- **Instalar:** `manifest.webmanifest` con íconos de 192, 512 y 512 *maskable*, y `apple-touch-icon` de 180, todos generados una vez con el navegador sin interfaz.
- **Vista previa al compartir:**
  - Tarjeta OG de marca de 1200 × 630.
  - Páginas `e/<id>.html` al construir: 2 KB o menos cada una, con título y `resumenNino`, fuera de la lista del Service Worker.
- **«Compartir»:** Web Share o «Copiar enlace».
- **`#acerca`:**
  - Quién lo hace y con qué criterios: fuentes, informes Rettig y Valech, distintas interpretaciones.
  - Licencias.
  - Qué se guarda en el navegador, con «Borrar mis datos».
  - «Reportar un error».
- **`#docentes`:** cómo proyectar y enlazar un paso, impresión y «Arma tu secuencia» (enlace con ids validados).
- **«Preparar esta historia sin conexión»:** el aviso explica que en iPhone se borra a los 7 días.

### M8 · Guía y aprendizaje (N1-N5, N7)
- **«Empieza aquí»** en la portada, sin modal, una sola vez y nunca con un enlace directo:
  - la historia «Lo esencial de Chile», con los hitos de 05 y 08 elegidos sin sesgo por omisión;
  - «Elige cómo leer»: un mismo evento en 3 tarjetas, con su propio grupo de controles;
  - «Este mes en la historia».
- **Historias:**
  - Paso 0, con duración y pasos numerados sobre la silueta.
  - «3 años después · en Rancagua», solo entre fechas de igual precisión.
  - Cierre sobrio, con la tira de lo recorrido, el repaso y «Sigue con…».
- **Cuatro historias nuevas** con eventos existentes: «Aprender en Chile», «Libros y poesía», «De la plata al cobre» y «Fronteras y tratados».
- **Repaso sin nota** (`import()`):
  - Se genera con fechas, ubicaciones y personajes.
  - Sin arrastre obligatorio, con la respuesta en texto y sin puntaje.
  - Excluye la lista sensible y nunca pregunta «¿quién ganó?» ni cifras de víctimas.
- **Glosario** (`import()`):
  - Botón desplegable accesible y página `#glosario`.
  - Cada definición sale del propio texto o lleva fuente, con revisión humana pendiente.
- **«Escuchar»**, con las condiciones de arriba.
- **«Lo que se discute»:** solo oraciones copiadas textualmente del `detalle` y validadas.
- **Opcional, guardado solo en el navegador:**
  - «Tu vida» (banda en la línea y «Desde que naciste: N eventos»).
  - «Tu región».
  - Otro «¿Sabías que…?».

### M9 · Verificación
- **Capturas:** todas las vistas en claro, oscuro, clase y texto grande, a 320 px, 390 px, celular horizontal y escritorio.
- **Medición:** LCP, CLS y peso.
- **Revisión final** del crítico y del guardián.
- **Documentación:** IDEA_MAESTRA, README, `data/README` y REVISION_PENDIENTE.

## Avance

- **M1 · Base técnica (hecha).**
  - **Ruta rota:** se ve un aviso arriba del contenido y la dirección vuelve a la sección.
  - **Rescate:** si la app no arranca, `index.html` ofrece «Recargar». Se probó con un módulo inexistente; Vite quita el `onerror` del `<script>`, así que se comprueba en `DOMContentLoaded`.
  - **404 propio:** `public/404.html`.
  - **Sin conexión:** un aviso visible.
  - **Caché de imágenes:** hasta 60.
  - **Respaldo:** colores planos donde no hay `color-mix()`.
  - **Impresión:** una lámina en papel claro, aunque el sistema esté en oscuro, con los plegables abiertos y la dirección de cada fuente.
  - **Buscador:** oculta la barra inferior y gana todo el alto.
  - **Foco:** `scroll-padding` en el buscador, la hoja del mapa y los chips.
  - **Hover que mueve:** solo con puntero.
  - **`npm run presupuesto`:** base de 133,63 KB gzip, medida sobre lo publicado; el fundido de las curvas bajó de 600 a 400 ms.
- **M2 · Sistema visual (hecha).**
  - **Tokens:** radios, sombras, movimiento (120/180/280/400 ms y tres curvas, sin rebotes) y pasos de letra para lo nuevo. Los 24 tamaños existentes no se forzaron, para no reabrir la medición de las láminas.
  - **Botones:** borde de 1 px (≥ 3:1) y sombra leve, sin subrayado. Lo activado va invertido, ya no en cobre. Al leer, «Siguiente» es la única acción en cobre.
  - **22 íconos SVG propios** en lugar de ◀ ▶ − + y del triángulo de los plegables. Siempre van junto a la palabra.
  - **Marcadores de pestaña y de nivel:** niebla con filete de cobre. Son elementos que `main.js` ubica y la View Transition desliza; el texto del detalle cambia de nivel con un fundido.
  - **Rótulos:** «Leer» visible delante de los niveles y «A+» pasa a «Texto».
  - **Barra inferior:** en el celular, el ícono va sobre la palabra, también con texto grande.
  - **Cabecera:** cabe sin desbordes en 320, 360, 390, 1366 y 1920 px, con texto grande y en modo clase.
- **M3 · Línea de tiempo (hecha).**
  - **Láminas** de 11 × 13/15/17 rem: 198 × 306 px en los hitos a 1366 × 768 (antes 171 × 261).
  - **Espacio liberado:** sin fila de ayuda («Menos» y «Más» llevan su palabra) y con la franja inferior de 1,75 rem.
  - **«Lo elegido»:** con el evento elegido a la vista, muestra su fecha, título, resumen del nivel y «Leer». Si no, el período del centro.
  - **Huecos:** se marcan con «+N eventos · Acercar» cuando ahí hay eventos que solo tienen punto (15 en el zoom inicial).
  - **Saltos largos** (más de dos pantallas): fundido y salto, sin recorrer la pista.
  - **✓ de visto:** en SVG, más grande; se asienta al volver del detalle (fundido, sin rebote).
  - **Minimapa:** marcas de 1 px.
  - **Títulos:** con el ancho nuevo ocupan 279 líneas (antes 330), con 3 cortes y ninguno truncado en ningún modo; `balance` y `pretty` dan lo mismo.
  - **Zoom con + y −:** FLIP de 280 ms. Con la CPU 4× más lenta, la animación pasa de 60 cps de media; los cuadros largos (`distribuir()` y la decodificación de imágenes nuevas) también ocurren sin animación.
  - **Pruebas:** el script de capturas emula movimiento reducido salvo que se pida lo contrario; las pruebas de animación deben pedirlo.
- **M4 · Transiciones entre vistas (hecha).**
  - **Cambio de sección:** la sección vieja se funde (120 ms) y la nueva entra por su eje en 200 ms (la línea de lado, el mapa de norte a sur). La barra inferior sube o baja, y la marca de la pestaña se desliza.
  - **Anterior y Siguiente:** el punto del mini-mapa (ahora un elemento HTML) viaja de un lugar al otro en 400 ms, sin estela; si el evento nuevo es de una zona, se funde. La marca de la regla corre y, en las historias, avanza el paso. La ficha y la barra de la historia quedan quietas.
  - **Nombres de transición:** las marcas de pestaña y de nivel tienen nombre solo en las transiciones donde se mueven, y nunca hay más de 4 nombres puestos al vuelo.
  - **La lámina crece desde cualquier miniatura:** resultados de búsqueda, eventos del mapa y destacado de la portada, no solo la línea. Al presionar se pide la imagen grande con el mismo `srcset` que el detalle.
  - **Listas escalonadas:** historias, fichas, regiones y eventos del mapa; 30 ms entre elementos, 6 escalones como máximo.
  - **Verificado** con las animaciones de la página (`getAnimations`) a los 60 ms: corren con los nombres esperados y, al terminar, no queda ningún nombre ni `data-transicion`.
- **M5 · Buscador, listas y mapa (hecha).**
  - **Buscador:**
    - Campo en píldora, con lupa y botón para borrar.
    - Filtros como chips en una fila por grupo: ninguno activado = todos. Antes eran 17 casillas marcadas bajo los resultados.
    - Resultados compactos (título en serif) con `<mark>` que no distingue tildes: «maipu» marca «Maipú».
    - «Sin resultados» propone búsquedas que sí encuentran algo.
  - **Tarjetas de lista** (resultados, fichas, vecinos, eventos y regiones del mapa): el mismo borde de 1 px, la barra de color del período, el título en serif y el hover solo con puntero. El resumen de las fichas va completo, sin `line-clamp`.
  - **Mapa:**
    - La ruta «Chile › Tarapacá › Iquique» reemplaza al botón «◀ Región de…», que se partía en dos líneas.
    - Costa con halo sobre el océano, el norte y una escala de 500 km norte-sur (exacta en esta proyección).
    - Halo de cobre bajo el contorno de lo elegido.
    - El panel entra desde la derecha si se va más adentro y desde la izquierda al volver; en el celular, la hoja sube.
    - Una sola onda de cobre en el alfiler elegido.
  - **Peso:** las reglas que solo usa el mapa pasaron a `src/mapa.css`, que se carga con su módulo (1,9 KB gzip), y la carga inicial bajó 0,8 KB.
- **M6 · Portada y detalle (hecha).**
  - **Portada:**
    - La puerta de la línea de tiempo pesa el doble.
    - Franja de cifras sacadas de los datos: eventos, períodos, lugares e historias.
    - Cada período lleva una escala con una marca por evento en su año. No lleva fotos, para que ningún período se vea distinto.
    - «Tu recorrido» suma una barra por período: el dato «3 de 13» va para lectores de pantalla y en el globo del puntero, sin «completado» ni porcentajes.
  - **Llegada, la primera vez en la sesión** (`data-llegada`, puesto antes de pintar):
    - Chile se descubre de norte a sur (`clip-path`, solo aquí).
    - Las puertas suben, sin fundido.
    - Las ciudades y latitudes de la puerta del mapa se encienden de norte a sur.
    - Lo que está bajo el pliegue aparece una vez, con IntersectionObserver.
  - **Detalle:**
    - Ficha con filete del color del período.
    - «¿Qué pasó antes/después?» con la imagen 16:9 arriba; la miniatura ahora ofrece 330 y 500 px.
    - «Sobre el período» como un portal.
  - **«Para niños»:** «Leyendo: Para niños», letra de 1,375 rem con interlineado 1,7, la imagen primero en el celular, la ficha sin temas y «¿Cómo lo sabemos?» en vez de «Fuentes».
  - **Modo clase:**
    - Cabecera de una fila desde 75em: de 157 a 87 px a 1366 × 768, con lo que «Lo elegido» vuelve a caber.
    - «Pantalla completa».
    - Imagen más alta.
    - Sin «¿Qué edad tenías?» ni «Tu recorrido».
  - **Pendiente:** el paspartú según la orientación de la imagen queda para cuando la proporción esté en los datos, porque calcularla al cargar movería la página (CLS).
- **M7 · Compartir, instalar, acerca de y docentes (hecha).**
  - **Instalar:** `manifest.webmanifest` con íconos de 192, 512 y 512 *maskable*, `apple-touch-icon` de 180 y atajos a la línea, el mapa y las historias.
  - **Compartir:**
    - «Compartir» en la ficha de cada evento: el menú del sistema en el celular o, si no hay, copia el enlace.
    - El enlace es `e/<id>.html`: 121 páginas de alrededor de 1 KB, con el título, el `resumenNino` entero y la tarjeta de marca (`og.png`, 1200 × 630). Quien la abre pasa al evento. No se guardan para usar sin conexión.
  - **Citar y avisar de un error:** «Cómo citar», con la fecha de consulta y «Copiar»; junto a las fuentes, un enlace abre un aviso en GitHub con el evento ya escrito.
  - **`#acerca`:** criterios, temas sensibles, licencias, qué se guarda en el navegador (con «Borrar mis datos», en dos toques), cómo avisar de un error y cómo citar el sitio.
  - **`#docentes`:**
    - Proyectar, enlazar e imprimir.
    - Duración de cada historia por nivel, a 130 palabras por minuto.
    - «Arma tu secuencia»: de 2 a 20 eventos en `#secuencia/<ids>`, que se recorre como una historia.
    - Las dos páginas se abren sobre la portada, que las enlaza en su pie (tipo colofón).
  - **Guardar una historia sin conexión:** desde «Historias», pide sus imágenes de a una. El aviso final explica que en iPhone Safari las borra a los 7 días sin uso.
  - **Peso:**
    - El detalle y las fuentes de cada evento salieron de la carga inicial: un archivo por período, de 5 a 8 KB, que se pide al abrir un evento (o antes, al presionar su lámina o su enlace). El Service Worker los guarda con el resto. La carga inicial bajó de 140,9 a 99,3 KB gzip, por debajo de los 133,6 de antes del plan.
    - El CSS de las listas, del paso de historia y de las páginas pasó a `src/vistas.css` (1,2 KB, a pedido). Para comprobar que el orden no cambia nada, se pusieron sus reglas al principio y al final de la cascada en 24 vistas y modos: solo varía el alto mínimo de las puertas de historias, cuya regla ya ganaba antes.
    - `npm run presupuesto` revisa también `mapa.css` y `vistas.css`, y cuenta los textos aparte.
