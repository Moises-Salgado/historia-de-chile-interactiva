> Informe original del revisor externo (qa), sin editar, del 19-10-2026. Lo verificado, lo descartado y el orden sugerido están en [`docs/AUDITORIA_EXTERNA.md`](../AUDITORIA_EXTERNA.md). Las capturas que cita quedaron en la carpeta temporal de la sesión y no se guardaron en el repositorio.

# Informe de QA externo — Historia de Chile Interactiva

- **Sitio probado:** https://moises-salgado.github.io/historia-de-chile-interactiva/ (versión publicada el 19-10-2026; caché del Service Worker `sitio-2db0c76be118`).
- **Entorno:** Edge (Chromium 155) sin ventana en Windows 11, manejado por CDP.
  - Tamaños: 1366×800 (por defecto), 1366×768, 1920×1080, 1280×720 (proyector), 820×1180 táctil, 390×844 táctil, 320×640 táctil y 844×390 táctil.
  - Modos: tema claro y oscuro, colores forzados, movimiento reducido, red «lenta» y «3G», CPU ×4.
- **Evidencia:** las capturas citadas (`qa-NN-*.png`) están en esta misma carpeta: (carpeta temporal de la sesión).
- **Especificación usada:** README («Qué incluye») y CLAUDE.md (rutas y accesibilidad). No leí los planes del equipo. El código lo miré solo para confirmar la causa de defectos ya reproducidos.

---

## 1. Veredicto

1. Es estable. En los flujos normales no hubo ninguna excepción, las 16 clases de ruta válidas cargan y recargan bien por enlace directo, y las 121 páginas `e/<id>.html` responden 200 y llevan al evento.
2. La navegación es lo más flojo. El botón **Atrás** sale de una historia guiada completa (y al segundo toque, del sitio). «Volver» desde una historia manda a la portada. Al volver de un evento sin lámina, la línea marca otro evento, a veces 15 años antes. Las rutas inválidas se tratan de tres maneras distintas.
3. En computador, con un mouse común, **6 de 9 períodos y 3 de 8 temas no se pueden elegir**: la fila de chips no tiene barra, flechas ni arrastre. Además, el buscador dice «25 resultados» mientras la línea de tiempo filtra «9 de 121».
4. En celular bajo (horizontal, o 320 px con «Texto grande») los botones Anterior/Volver/Siguiente quedan bajo el borde. Con teclado, las flechas dejan el foco en `<body>` y Av Pág/Espacio ya no desplazan el texto.
5. Las cifras de la portada cuadran (121 · 9 · 34 · 9). Pero el eje rotula décadas en las que no caen los puntos (desvíos de hasta 7 años), el evento de 2025 no se alcanza desde la línea, Monte Verde tiene dos fechas y la tipografía de los datos está mezclada.

| Dimensión | Nota (1-10) |
|---|---|
| Estabilidad | 8 |
| Navegación | 5 |
| Teclado y lector de pantalla | 7 |
| Celular | 6 |
| Rendimiento percibido | 7 |
| Búsqueda y filtros | 5 |
| Consistencia del contenido | 7 |

---

## 2. Plan de pruebas ejecutado

| Área | Casos | Resultado |
|---|---|---|
| Humo de rutas | `#inicio`, sin hash, `#linea`, `#mapa`, `#mapa/<región>` (16), `#mapa/zona/<id>`, `#mapa/chile`, `#mapa/fuera`, `#lugar/<id>`, `#evento/<id>`, `#grupo/pueblos-1500`, `#historias`, `#historia/<id>`, `/<paso>`, `/fin`, `#secuencia/<ids>/<paso>` y `/fin`, `#personaje/<nombre>`, `#acerca`, `#docentes`, `#glosario`, `e/<id>.html` (las 121 con HEAD) y la 404 | Todas cargan, sin errores de consola. La 404 propia funciona, también en rutas profundas y en `e/no-existe.html`. |
| Rutas rotas o raras | ~45 variantes, cada una en visita nueva: ids inexistentes, pasos 99/15/0/-1/abc/1.5/01, `fin/x`, hashes vacíos, mayúsculas, tildes, caracteres codificados, `<script>`, `%%%`, secuencias con duplicados, con más de 20, desordenadas o de un solo evento | Sin caídas ni XSS. Manejo inconsistente (Q-13, Q-14). |
| Navegación | Atrás/Adelante en: evento, evento → Siguiente, historia paso a paso, mapa → lugar → evento, buscador → resultado. Recarga en 16 rutas. «Volver» y Escape en 10 vistas. | El flujo del mapa es correcto. Historias y eventos encadenados no (Q-01, Q-07, Q-10). La recarga funciona en todas. |
| Solo teclado | Tab en portada, línea, evento, mapa y buscador. Flechas, Av/Re Pág, Inicio/Fin, +/−, Enter y Escape. Foco al cerrar paneles. «Saltar al contenido». | Foco visible siempre, sin trampas, vuelve a la tarjeta o al botón al cerrar. Pérdida de foco con las flechas (Q-08). |
| Lector de pantalla | Árbol accesible de cabecera, línea, mapa, buscador y glosario. Región viva `#avisos`. Encabezados. `inert` del fondo. | Nombres y roles correctos en general. Grupos de chips etiquetados. Fondo `inert` con el detalle o el panel abiertos. Detalles en Q-18 y Q-22. |
| Táctil | 320×640, 390×844, 844×390 y 820×1180: tocar pestañas, tarjetas y regiones, deslizar la línea, giro de pantalla, tamaño de objetivos | Deslizar y girar funcionan. Objetivos ≥ 24 px, salvo regiones del mapa en escritorio. Problemas en pantallas bajas (Q-06) y regiones tapadas (Q-11). |
| Línea de tiempo | Rueda (acercar y alejar hasta los topes), Más/Menos, +/−, arrastre con mouse, minimapa (clic en 1500 y 1900), «Al inicio», Anterior/Siguiente, fin de la línea, zoom mínimo, cambio de tamaño | Todo responde. Eje engañoso (Q-12) y 2025 inalcanzable (Q-09). |
| Mapa | Clic y toque en regiones y lugares, lista de regiones, Todo Chile, Fuera de Chile, zonas, filtro por período, región + cambio de período, flechas entre regiones | Funciona. Regiones tapadas por alfileres (Q-11) y chips ocultos (Q-02). |
| Buscador y filtros | ~90 consultas (tildes, mayúsculas, años, a.C., personajes, apóstrofos, plurales, regiones, vacío, espacios, `%`, `<b>`, `\`, `*`, 9.000 caracteres, sin resultados). Combinaciones período + tema. Quitar filtros, ✕ y Escape. Persistencia al cambiar de vista y al recargar. | Tildes, mayúsculas y años funcionan. Fallas en Q-03, Q-04 y Q-05. El filtro se mantiene entre vistas y se pierde al recargar. |
| Preferencias | Nivel (cabecera, «Empieza aquí», flechas), Texto grande, Proyectar en clase + Pantalla completa, tema oscuro, colores forzados, movimiento reducido. Recarga y `almacen`. | Se aplican y se recuerdan. Problemas en pantallas angostas (Q-06, Q-19). Con movimiento reducido no queda ninguna animación de más de 20 ms. |
| Historias | Presentación de las 9; los 14 pasos de «Lo esencial» con sus conectores; cierre; repaso (bien, mal y 11 rondas de «Otra ronda»); «Guardar para usar sin conexión»; secuencia docente (armar, límite de 20, ver, recorrer, cierre) | Funcionan. El repaso no tuvo preguntas de temas sensibles en 11 rondas. El guardado muestra «Guardando… 1 de 6» y termina. Conectores incompletos (Q-20). |
| Funciones del evento | Cambiar nivel; Anterior/Siguiente; imagen y crédito; Ver en el mapa (5 eventos); Compartir; Cómo citar + Copiar; Avisar de un error; Escuchar (iniciar, detener, al navegar, al cambiar de nivel); Palabras para entender; Fuentes (enlaces con curl); ¿Qué edad tenías? | Todo responde. La lectura se detiene al navegar. Formato de cita dudoso (Q-26) y aviso de error que exige cuenta (Q-24). |
| Datos personales | Año de nacimiento (1899, 2027, vacío, 1985) y «Olvidar»; región en «Tu recorrido»; banda «Tu vida»; `almacen`; «Borrar mis datos» | La validación es correcta y se guarda solo lo prometido. El borrado limpia localStorage, sessionStorage y las cachés de imágenes e historia, pero no lo confirma (Q-16). |
| Rendimiento percibido | Primera visita real con red lenta y con 3G + CPU ×4 en 390×844 (portada y enlace directo a un evento); FCP, LCP y CLS; cambio de vista durante la carga; dobles clics | Portada con 3G y CPU ×4: FCP 2,8 s, LCP 4,6 s, CLS 0, JS listo a los ~9 s. Evento directo con 3G: se ve antes la línea de tiempo (Q-17). Cambiar de vista mientras carga funciona. |
| Consola y red | `errores` después de cada flujo | Limpia, salvo `AbortError` con clics muy rápidos (Q-15) y los 404 esperados. |
| Contenido | Cifras de la portada contra los datos; fechas; enlaces externos (Commons, GitHub, Memoria Chilena, MHN, Wikipedia, Natural Earth, Wikidata); textos en inglés; comillas; «%»; rangos de fecha | Cifras correctas; nada en inglés ni `undefined`; todos los enlaces responden 200. Detalles en Q-18, Q-25, Q-27 y Q-28. |

---

## 3. Defectos (de más grave a menos grave)

No encontré defectos de gravedad **Crítica**: ninguna función principal queda bloqueada para todos.

### Q-01 · Alta — El botón Atrás del navegador sale de la historia completa (y el segundo Atrás sale del sitio)

- **Dónde:** `#historias` → `#historia/<id>` → pasos. También `#evento/<id>` con Anterior/Siguiente. Todos los tamaños.
- **Pasos:**
  1. Abrir `…/#linea` (visita nueva).
  2. Clic en la pestaña «Historias» (`#historias`).
  3. Clic en «Los grandes terremotos» (`#historia/terremotos`).
  4. Clic en «Empezar» (`/1`) y en «Siguiente» dos veces (`#historia/terremotos/3`).
  5. Botón Atrás del navegador; luego Atrás otra vez.
- **Esperado:** el primer Atrás vuelve al paso 2, o al menos a la presentación de la historia o a la lista «Historias».
- **Obtenido:**
  - El primer Atrás salta a `#linea`: se salta los pasos 2 y 1, la presentación y la lista «Historias».
  - El segundo Atrás sale del sitio (`about:blank` en la prueba). «Adelante» devuelve al paso 3.
  - Con eventos pasa lo mismo: `#evento/1817-batalla-de-chacabuco` → Siguiente → Siguiente → Atrás lleva a `#linea`, no al evento anterior.
  - Buscador → resultado → Atrás vuelve a `#linea` con el panel cerrado (el filtro sigue activo).
- **Evidencia:** captura `qa-104-atras-desde-paso3.png` y la salida del recorrido:

  ```text
  3. clic Empezar => /#historia/terremotos/1
  5. Siguiente    => /#historia/terremotos/3
  6. ATRÁS        => /#linea
  7. ATRÁS        => about:blank
  9. ADELANTE     => /#historia/terremotos/3
  ```

- **Frecuencia:** siempre.
- **Causa confirmada:** en `src/main.js`, la función `ir()` (líneas 525-535) usa `history.replaceState` entre vistas («entre vistas se reemplaza»). Solo agrega una entrada al salir de una sección. Es una decisión de diseño, pero en Android el gesto Atrás es la forma normal de retroceder, y un niño que retrocede un paso pierde la historia.

### Q-02 · Alta — Con un mouse común no se pueden elegir 6 de los 9 períodos ni 3 de los 8 temas

- **Dónde:** panel «Buscar y filtrar» y filtro de períodos del mapa (`#mapa`). Medido en 1366×768, 1920×1080, 1280×720 y 820×1180.
- **Pasos:**
  1. En `#linea`, clic en «Buscar».
  2. Intentar llegar al chip «Dictadura militar» o al tema «Derechos» con el mouse: rueda vertical sobre la fila, arrastrar la fila y clic en el chip cortado «Organización de la República».
- **Esperado:** todos los chips se pueden alcanzar con el mouse (barra visible, flechas, varias filas o arrastre).
- **Obtenido:**
  - La fila no muestra barra de desplazamiento (`offsetHeight = clientHeight`), ni flechas, ni un degradado que avise que hay más.
  - Arrastrar con el mouse no la mueve (`scrollLeft` sigue en 0).
  - La rueda vertical desplaza la página, no la fila.
  - El clic en el chip cortado lo activa, pero la fila no se corre.
  - Ocultos en el buscador:
    - Períodos: Organización de la República, Expansión y Guerra del Pacífico, Parlamentarismo y cuestión social, Siglo XX, Dictadura militar, Retorno a la democracia.
    - Temas: Pueblos originarios, Economía, Derechos.
  - Ocultos en el mapa: 6 de 10 chips (7 de 10 en tablet).
  - Solo se llega con Tab, o con una rueda horizontal o un panel táctil.
- **Evidencia:** `qa-45-buscador-abierto.png`, `qa-111-mapa-chips-cortados.png`, `qa-126-chip-parcial-clic.png`. Salida:

  ```text
  chips-periodo: sw=2544 cw=864 scrollbar=0px ocultos=Organización de la República, …, Retorno a la democracia y siglo XXI
  chips-tema: … ocultos=Pueblos originarios, Economía, Derechos
  tras arrastrar: 0
  ```

- **Frecuencia:** siempre, en todos los tamaños de computador probados.

### Q-03 · Media — El buscador anuncia una cantidad de resultados y la línea de tiempo filtra otra

- **Dónde:** panel «Buscar y filtrar» y aviso «Filtro activo» de `#linea`, en 1366×800.
- **Pasos:** abrir «Buscar», escribir `pueblo` (o `ley`, o `a`) y pulsar «Ver en la línea de tiempo».
- **Esperado:** la misma cantidad en el panel y en la línea de tiempo.
- **Obtenido:** el usuario ve en la lista eventos que después no aparecen en la línea.

  | Búsqueda | Panel | Línea de tiempo |
  |---|---|---|
  | `pueblo` | 25 resultados | Filtro activo: 9 de 121 eventos |
  | `ley` | 3 resultados | 2 de 121 |
  | `a` | 95 resultados | 23 de 121 |

- **Evidencia:** `qa-106-filtro-a-23-vs-95.png`. Salida: `"pueblo" => panel: 25 resultados. | línea: Filtro activo: 9 de 121 eventos.`
- **Frecuencia:** siempre que haya a la vez coincidencias exactas y parciales.
- **Causa confirmada:** en `src/filtros.js`, `actualizar()` (línea 169). La lista cuenta las coincidencias exactas más las parciales, pero a la línea pasan solo las exactas cuando hay alguna.

### Q-04 · Media — Escape en el buscador borra el texto pero deja el filtro y la lista de resultados

- **Dónde:** panel «Buscar y filtrar», en 1366×800.
- **Pasos:**
  1. Abrir «Buscar» y escribir `mistral`.
  2. Pulsar Escape (el panel se cierra).
  3. Volver a abrir «Buscar».
- **Esperado:** o se conserva la búsqueda (texto y filtro), o se borra todo.
- **Obtenido:**
  - El campo queda vacío, pero el panel sigue mostrando «2 resultados» con «Mistral» resaltado.
  - La línea sigue con «Filtro activo: 2 de 121 eventos».
  - Al escribir algo nuevo, los dos estados se mezclan.
- **Evidencia:** `qa-105-buscador-reabierto-incoherente.png` y `qa-50-escape-filtro-queda.png`. Salida: `2 Escape: input=«» | panel: 2 resultados. | línea: Filtro activo: 2 de 121 eventos.`
- **Frecuencia:** siempre.
- **Causa probable:** el campo es `type="search"`. El navegador lo vacía al pulsar Escape sin disparar `input`, así que `filtros.js` no se entera.

### Q-05 · Media — Búsquedas habituales no encuentran nada

- **Dónde:** buscador, en cualquier tamaño.
- **Pasos:** buscar cada término de la tabla.
- **Esperado:** encontrar lo obvio, como pasa con «concepcion» sin tilde, que sí funciona.
- **Obtenido:**

  | Búsqueda | Resultado | Lo esperable |
  |---|---|---|
  | `ohiggins`, `Ohiggins` | Sin resultados | 9 eventos (con `O'Higgins` sí aparecen) |
  | `terremotos` | Sin resultados | 6 terremotos (`terremoto` sí funciona) |
  | `selknam` | Sin resultados | Pueblo selk'nam |
  | `Ñuble`, `nuble` | Sin resultados | La región existe en el mapa, con 6 eventos |
  | `12.500`, `12500`, `12.500 a.C.` | Sin resultados | Monte Verde, cuya tarjeta dice «c. 12.500 a.C.» |
  | `presidente` | Sin resultados | La palabra está en muchos resúmenes |
  | `%`, `\`, `*` | Ni siquiera el mensaje «Sin resultados» | Al menos ese mensaje |

- **Evidencia:** salida de la batería de búsquedas (sección 2).
- **Frecuencia:** siempre.
- **Causa probable:**
  - `palabras()` en `filtros.js` corta en el apóstrofo («o» + «higgins»).
  - No tolera plurales.
  - Solo busca en título, personajes, lugar, fecha, período y tema.

### Q-06 · Media — En pantallas bajas los botones de navegación quedan fuera de la pantalla

- **Dónde:** `#linea` y `#evento/<id>` en celular horizontal 844×390 (texto normal), y en 320×640 con «Texto grande».
- **Pasos:**
  1. Con `tamano celular-horizontal`, abrir `…/#linea` o `#evento/1960-terremoto-valdivia`.
  2. Otra variante: con `tamano celular-chico`, activar «Texto grande» y abrir `#linea`.
- **Esperado:** «Anterior / Volver / Siguiente» siempre a la vista. El proyecto pide que sea usable en celular con una mano.
- **Obtenido:**
  - **844×390, `#evento`:** la barra de controles queda en y = 390-463 y la ventana mide 390 px, así que está completamente fuera. La cabecera queda a medio esconder (y = −97) y toda la página se desplaza.
  - **844×390, `#linea`:** los botones quedan en y = 555-609.
  - **320×640 con Texto grande:**
    - En `#linea`, Anterior/Siguiente quedan en y = 701-770, fuera de la pantalla.
    - En `#evento`, quedan cortados por abajo (y = 603-671).
  - **Con Texto grande en horizontal,** las pestañas «Mapa» e «Historias» se cortan.
- **Evidencia:** `qa-62-movil-horizontal-evento.png`, `qa-63-movil-horizontal-linea-carga.png`, `qa-107-320-texto-grande-linea.png`, `qa-108-320-texto-grande-evento.png` y `qa-109-horizontal-texto-grande-linea.png`. Salida: `844x390 linea texto grande: vh=390 … btn-anterior:y=678-744`.
- **Frecuencia:** siempre.

### Q-07 · Media — «Volver» desde una historia lleva a la portada o a la línea de tiempo, no a la historia

- **Dónde:** `#historia/<id>/<paso>`, en 1366×800.
- **Pasos:**
  1. Portada → pestaña «Historias» → «Libros, periódicos y poesía» → «Empezar» → «Siguiente» (paso 2).
  2. Clic en «Volver».
- **Esperado:** volver a la presentación de la historia o a la lista «Historias». Durante todo el recorrido la pestaña activa es «Historias».
- **Obtenido:**
  - Va a la portada (URL sin hash).
  - Si se entró a la historia por enlace directo, «Volver» lleva a `#linea`.
  - Se pierden la presentación, la lista y la posición: hay que buscar la historia de nuevo.
- **Evidencia:** `qa-103-volver-desde-paso-historia.png`. Salida: `Volver desde paso =>  | foco=H2 «La historia de Chile, en el ti»` · `#historia/mineria/4 (directo) + Volver => #linea`.
- **Frecuencia:** siempre.
- **Causa:** la misma de Q-01. `volver()` hace `history.back()`, y la historia había reemplazado todas sus entradas.

### Q-08 · Media — Al navegar con las flechas el foco cae en `<body>` y el texto ya no se desplaza con el teclado

- **Dónde:** `#evento/<id>` e `#historia/<id>/<paso>`, fuera del modo clase, en 1366×800.
- **Pasos:**
  1. En la línea, poner el foco en la tarjeta «Batalla de Chacabuco» y pulsar Enter. El foco queda en el título del evento.
  2. Pulsar la flecha derecha (pasa a «Proclamación de la Independencia»).
  3. Pulsar Av Pág, flecha abajo o Espacio.
- **Esperado:** el foco pasa al título del nuevo evento y Av Pág desplaza el texto, como al abrir el primero.
- **Obtenido:**
  - El foco queda en `BODY`, Av Pág no desplaza nada (`scrollTop` sigue en 0) y el siguiente Tab empieza desde la cabecera.
  - En las historias pasa lo mismo: `#historia/letras/2` → flecha derecha deja `foco=BODY`, y 7 pulsaciones de Av Pág no hacen nada.
  - Tras un clic en «Siguiente» el foco queda en el botón, y Av Pág tampoco desplaza el texto: el panel `#detalle` solo se desplaza con el teclado si el foco está dentro.
- **Evidencia:** salida, reproducida dos veces:

  ```text
  Enter:      #evento/1817-batalla-de-chacabuco foco=H2#detalle-titulo
  ArrowRight: #evento/1818-proclamacion-de-la-independencia foco=BODY#
  PageDown:   scrollTop=0
  historia tras clic Siguiente: foco=BUTTON#btn-siguiente · PageDown: scrollTop=0
  ```

- **Frecuencia:** siempre.
- **Causa probable:** al cambiar de evento se reemplaza el título que tenía el foco, y no se enfoca el nuevo.

### Q-09 · Media — El evento más reciente (2025) no se alcanza desde la línea de tiempo en el zoom inicial

- **Dónde:** `#linea`, zoom por defecto («Eventos principales»), en 1366×800.
- **Pasos:** en la línea, pulsar Fin, o «Siguiente» hasta el final.
- **Esperado:** llegar al último evento, «Elección presidencial de 2025», o ver la marca «+1 evento · Acercar» que aparece en los demás huecos.
- **Obtenido:**
  - Fin y «Siguiente» se detienen en «Plebiscito constitucional de 2023», y «Siguiente» queda desactivado.
  - El evento de 2025 es solo un punto de 20 px, sin tarjeta y sin la marca «+1 evento».
  - Ese punto no se puede enfocar con el teclado; solo responde al clic.
- **Evidencia:** `qa-120-linea-final.png`. Salida: `fin: … siguiente=true foco=2023Plebiscito constitucional de 2023`.
- **Frecuencia:** siempre en ese zoom.
- **Causa confirmada:** en `src/timeline.js`, `dibujarHuecos()` (líneas 515-527) solo recorre los huecos entre dos láminas. Lo que queda después de la última lámina (o antes de la primera) nunca recibe la marca.

### Q-10 · Media — Al volver de un evento sin lámina, la línea de tiempo marca y enfoca otro evento, a veces muy anterior

- **Dónde:** `#evento/<id>` → «Volver» → `#linea`, zoom inicial, en 1366×800.
- **Pasos:**
  1. Abrir `…/#linea`.
  2. Poner el foco en la lámina «Plebiscito constitucional de 2023» y pulsar Enter.
  3. «Siguiente» (abre «Elección presidencial de 2025»).
  4. «Volver».
- **Esperado:** la línea muestra 2025 (o al menos 2023, desde donde se salió), con su punto marcado.
- **Obtenido:**
  - Quedan marcados y con el foco «Terremoto y tsunami del 27 de febrero (2010)», con su resumen en la cartela. 2023 y 2025 quedan fuera de la vista.
  - Pasa con cualquier evento que no tenga lámina en ese zoom:

    | Evento abierto | Evento que queda marcado |
    |---|---|
    | Aylwin asume la presidencia (1990) | Crisis económica de 1982 |
    | Tratado de Paz y Amistad (1984) | Reformas económicas (1975-1981) |
    | Ataque de Michimalonco (1541) | Pueblos que vivían aquí (c. 1500) |
    | Terremoto de Valparaíso (1906) | Tratado de Ancón (1883) |

- **Evidencia:** `qa-134-volver-desde-2025.png` y `qa-78b-volver-2025-selecciona-2010.png`. Salida: `Volver: #linea | seleccionado=2010-terremoto-27f | foco=«2010Terremoto y tsunami del 27 de febrer»`.
- **Frecuencia:** siempre que el evento no tenga lámina en el zoom actual.

### Q-11 · Media — Mapa: al tocar el centro de una región pequeña se abre un lugar en vez de la región

- **Dónde:** `#mapa`, en 1366×800 y en 390×844 táctil.
- **Pasos:** clic o toque en el centro visible de la Región Metropolitana, del Biobío, del Maule o de Ñuble.
- **Esperado:** se abre la región (la Metropolitana tiene 33 eventos).
- **Obtenido:**
  - El alfiler de un lugar tapa el centro, y se abre ese lugar:

    | Región tocada | Se abre |
    |---|---|
    | Metropolitana | «Llanos del Maipo» (1 evento) |
    | Biobío | «Negrete» |
    | Maule | «Loncomilla» |
    | Ñuble | «Chillán» |

  - En escritorio, 5 regiones miden menos de 24 px de alto: Arica 20×29, Metropolitana 27×23, O'Higgins 29×20, Ñuble 26×21 y Los Ríos 30×23.
  - Los 34 alfileres no tienen nombre accesible ni se pueden enfocar. Hay una alternativa: la lista de regiones y, dentro de cada región, enlaces a sus lugares.
- **Evidencia:** `qa-06-mapa-biobio.png` y `qa-60-movil-tocar-metropolitana.png`. Salida: `Región Metropolitana de Santiago 44x38 @(252,289) centro->circle.punto maipu`.
- **Frecuencia:** siempre.

### Q-12 · Media — El eje rotula décadas, pero los puntos no caen en su año

- **Dónde:** `#linea`, en todos los niveles de zoom.
- **Pasos:** entrar al período 5 desde la portada y comparar la posición de cada punto con las marcas «1860 · 1870 · 1880».
- **Esperado:** en un eje rotulado por años, un evento de 1879 aparece justo antes de «1880».
- **Obtenido:**
  - En `qa-04-clic-periodo-05.png`, «1870» está en x = 427 y «1880» en x = 886:
    - «Guerra del Pacífico (1879)» cae en x = 624, que el eje lee como 1874.
    - «Combate Naval de Iquique (1879)» cae en x = 753, que el eje lee como 1877.
  - En `qa-42-eje-1880.png`, entre «1880» y «1890» los puntos de 1881, 1883 y 1884 se leen como 1883, 1886 y 1887.
  - Entre 1880 y 1881 hay más distancia que entre 1884 y 1888.
  - Medí 52 eventos entre 1700 y 1910: desvíos de hasta 7 años (`1767-expulsion-de-los-jesuitas -> eje dice 1760.0`, `1877-decreto-amunategui -> eje dice 1871.1`).
- **Frecuencia:** siempre.
- **Causa confirmada:** la escala va por «ranuras» (`crearEscala` en `src/timeline.js`): cada evento ocupa una ranura y el tiempo entre fechas se comprime con un logaritmo, pero las etiquetas de década se dibujan como si el eje fuera lineal. En una herramienta escolar, la cronología visual engaña; además, el README promete una «escala gráfica de mapa», que se entiende como proporcional.

### Q-13 · Baja — Las rutas inválidas se manejan de tres maneras distintas

- **Dónde:** cualquier tamaño, siempre en visita nueva.
- **Pasos:** abrir cada URL de la tabla.
- **Esperado:** el mismo comportamiento para toda ruta inexistente: aviso «No encontramos esa página» y URL corregida.
- **Obtenido:**

  | Comportamiento | Rutas |
  |---|---|
  | Aviso y URL corregida a `#linea` (lo correcto) | `#evento/noexiste`, `#grupo/noexiste`, `#historia/noexiste`, `#historia/esencial/99`, `#historia/esencial/15`, `#personaje/arturo-prat`, `#secuencia/noexiste/1` y una secuencia de un solo evento |
  | Línea de tiempo en silencio, sin aviso y con la URL inválida en la barra | `#evento/`, `#evento/<id en mayúsculas>`, `#evento/<id>/`, `#historia/esencial/abc`, `#historia/esencial/-1`, `#historia/esencial/1.5`, `#historia/ESENCIAL`, `#personaje/JOSE-MIGUEL-CARRERA`, `#personaje/José Miguel Carrera`, `#acerca/x`, `#glosario/x`, `#INICIO`, `#Linea`, `#l%C3%ADnea`, `#mapa%2Fbi`, `#%%%` |
  | Mapa sin región ni aviso | `#lugar/noexiste`, `#mapa/xx`, `#mapa/BI`, `#mapa/zona/noexiste` |

  Además, `#historia/esencial/0` y `/01` se aceptan (muestran la presentación y el paso 1). Un niño, o un docente que copió mal un enlace, termina en la línea de tiempo sin saber por qué.
- **Evidencia:** `qa-29-ruta-paso-99.png` (con aviso) y `qa-30-ruta-paso-abc-sin-aviso.png` (sin aviso); salida de la batería de rutas.
- **Frecuencia:** siempre.

### Q-14 · Baja — El aviso «No encontramos esa página… Estás en la línea de tiempo» sigue visible después de navegar a una página válida

- **Dónde:** cualquier vista, en 1366×800.
- **Pasos:** ir a `#evento/noexiste` y enseguida abrir `#evento/1810-primera-junta-de-gobierno`.
- **Esperado:** el aviso desaparece al cambiar de vista.
- **Obtenido:** el aviso queda unos 5 s sobre el evento, diciendo «Estás en la línea de tiempo», y tapa parte de la imagen.
- **Evidencia:** `qa-100-aviso-persistente.png`.
- **Frecuencia:** siempre.

### Q-15 · Baja — Excepciones sin capturar con clics rápidos

- **Dónde:** `#historia/<id>/<paso>` y `#linea`, en 1366×800.
- **Pasos:** pulsar «Siguiente» o «Anterior» varias veces muy rápido, o hacer doble clic en una tarjeta.
- **Esperado:** sin errores en la consola.
- **Obtenido:**
  - Aparece `AbortError: Transition was skipped. New ViewTransition started`: 4 veces con 5 clics seguidos y 1 vez con un doble clic en una tarjeta.
  - Además, 3 clics en el mismo instante avanzan un solo paso. Con 120 ms de separación avanzan 3, lo que es aceptable.
- **Evidencia:** salida de `errores`.
- **Frecuencia:** a veces (con clics más rápidos que la transición).
- **Causa probable:** la promesa de `document.startViewTransition()` que se interrumpe no tiene `catch`.

### Q-16 · Baja — «Borrar mis datos» no confirma que borró

- **Dónde:** `#acerca`, en 1366×800.
- **Pasos:** clic en «Borrar mis datos» y después en «Toca de nuevo para borrar».
- **Esperado:** un mensaje como «Listo: se borraron tus datos», visible y anunciado al lector de pantalla.
- **Obtenido:**
  - La página vuelve arriba sin ningún mensaje, y la región viva queda vacía.
  - El borrado sí ocurre: localStorage y sessionStorage quedan vacíos y se eliminan las cachés `imagenes` e `historia-guardada`.
  - El texto «Toca de nuevo» le habla al usuario de mouse como si tocara la pantalla.
- **Evidencia:** `qa-79-borrar-datos.png` (primer clic) y `qa-110-tras-borrar-1.png` (resultado, sin confirmación). Salida: `avisos=«» | aviso visible=false`.
- **Frecuencia:** siempre.

### Q-17 · Baja — En la primera visita con red lenta, un enlace directo a un evento muestra primero la línea de tiempo equivocada

- **Dónde:** 390×844 táctil, red «3G», primera visita (caché vacía).
- **Pasos:** abrir `…/?v=3g#evento/1879-combate-naval-de-iquique` con la caché vacía y tomar capturas cada 600 ms.
- **Esperado:** un estado de carga y después el evento.
- **Obtenido:**
  - Unos 2-3 s con la página vacía (solo la cabecera y los botones).
  - Luego unos 2 s mostrando «Pueblos originarios / Monte Verde» con un aviso «Cargando…».
  - Después aparece el evento.
  - Mientras no llega el JavaScript (unos 8-9 s con 3G y CPU ×4), el selector de nivel aparece sin la opción «General» (queda un hueco en blanco) y ninguna pestaña está marcada.
  - LCP de 10,7 s (la imagen viene de Commons).
- **Evidencia:**
  - `qa-88-3g-carga-evento-3.png`: página vacía.
  - `qa-88-3g-carga-evento-5.png`: vacía y sin «General».
  - `qa-88-3g-carga-evento-7.png`: línea de tiempo con «Cargando…».
  - `qa-88-3g-carga-evento-10.png`: el evento.
  - `qa-121-3g-portada-4.png`: portada sin «General».
- **Frecuencia:** siempre con red lenta en una primera visita.

### Q-18 · Baja — Monte Verde muestra dos fechas, y el nombre accesible de su tarjeta no coincide con lo que se ve

- **Dónde:** la tarjeta de `#linea`, comparada con la cartela, el detalle, el mapa y el lector de pantalla.
- **Pasos:** comparar la tarjeta de Monte Verde con su detalle (`#evento/ac12500-monte-verde`).
- **Esperado:** una sola forma de escribir la fecha, y un nombre accesible que contenga el texto visible (WCAG 2.5.3).
- **Obtenido:**
  - La tarjeta muestra «c. 12.500 a.C.».
  - Su nombre accesible, el detalle y el mapa dicen «c. 14.500 años atrás».
  - Quien use control por voz y diga «12.500» no la activa.
  - Buscar «12.500» no la encuentra (Q-05).
- **Evidencia:** `qa-101-monte-verde-fechas.png` y `qa-41-linea-tras-siguiente.png`. Salida: `tarjeta: c. 12.500 a.C. / Monte Verde… || aria: c. 14.500 años atrás: Monte Verde…`.
- **Frecuencia:** siempre.

### Q-19 · Baja — «Proyectar en clase» rompe la cabecera en pantallas angostas

- **Dónde:** con el modo clase activado, en una ventana de 390×844 (celular) o de 820×1180 (tablet).
- **Pasos:** activar «Proyectar en clase» en el computador (queda guardado) y abrir el sitio en una ventana angosta o en una tablet.
- **Esperado:** el selector de nivel (que CLAUDE.md pide «siempre visible») y las cuatro pestañas a la vista, o que el modo clase se desactive en pantallas chicas.
- **Obtenido:**
  - En 390 px solo se ve «Niños»; «General» y «Detallado» quedan tapados por los botones de proyectar y de pantalla completa.
  - En 820 px la pestaña «Historias» queda fuera de la barra, que se desplaza sin indicarlo.
- **Evidencia:** `qa-67-modo-clase-en-celular.png` y `qa-68-modo-clase-tablet.png`. Salida: `nino … visibleEnCentro=true | general … visibleEnCentro=false | detallado … visibleEnCentro=false` · `Historias … visible=false`.
- **Frecuencia:** siempre.

### Q-20 · Baja — Faltan conectores entre algunos pasos de una historia

- **Dónde:** `#historia/esencial`.
- **Pasos:** recorrer los 14 pasos y leer la línea que aparece bajo «Paso N de 14».
- **Esperado:** cuánto tiempo pasó y dónde ocurre, como promete el README («57 años después · en Curalaba»).
- **Obtenido:**
  - El paso 9 («Voto femenino») no tiene conector.
  - El paso 6 dice solo «En la Araucanía», aunque entre 1833 y 1861 pasaron unos 28 años.
  - El paso 8 dice solo «En todo el país».
- **Evidencia:** `qa-21-historia-paso9-sin-conector.png`. Salida: `9 :: (no hay p.historia-conector)`.
- **Frecuencia:** siempre.
- **Causa probable:** se omite el tiempo cuando una fecha es aproximada o solo tiene año, y el lugar cuando se repite.

### Q-21 · Baja — En 320 px la cartela de la línea de tiempo corta los títulos largos a media frase

- **Dónde:** `#linea`, en 320×640.
- **Pasos:** elegir «Fuerte Bulnes: Chile toma posesión del Estrecho de Magallanes» o «Monte Verde, uno de los sitios más antiguos de América».
- **Esperado:** el título completo, o cortado con «…».
- **Obtenido:** se lee «Fuerte Bulnes: Chile toma posesión del». La segunda línea queda cortada por las láminas, sin puntos suspensivos.
- **Evidencia:** `qa-118-320-cartela-titulo-largo.png` y `qa-54-movil320-linea.png`.
- **Frecuencia:** siempre con títulos largos.

### Q-22 · Baja — Los nombres accesibles de las franjas de período salen pegados y en mayúsculas

- **Dónde:** botones `.franja-nombre` de `#linea`.
- **Obtenido:** el lector recibe «INDEPENDENCIA1810-1823» o «PUEBLOS ORIGINARIOSHASTA 1535»:
  - no hay espacio entre el nombre y las fechas (son dos nodos de texto sin separador);
  - se aplica la transformación a mayúsculas.
- **Evidencia:** salida de `accesible "#linea"`.
- **Frecuencia:** siempre.

### Q-23 · Baja — Las tarjetas de período de la portada apuntan a `#linea` genérico

- **Dónde:** sección «Los períodos de la historia» de la portada.
- **Pasos:** abrir «05 Expansión y Guerra del Pacífico» en otra pestaña (clic con la rueda) o copiar su enlace.
- **Esperado:** llegar al período 5.
- **Obtenido:** las 9 tarjetas tienen `href="#linea"` y el salto al período se hace con JavaScript al hacer clic. Por eso la pestaña nueva o el enlace copiado abren la línea en «Pueblos originarios».
- **Evidencia:** salida `2:epoca data={"periodo":"01"} …`, con `href="#linea"` en todas.
- **Frecuencia:** siempre.

### Q-24 · Baja — «Avísanos (en GitHub)» exige una cuenta de GitHub, y el evento no lo advierte

- **Dónde:** sección «Fuentes» de cada evento.
- **Pasos:** abrir «Fuentes» en un evento y seguir «¿Encontraste un error? Avísanos (en GitHub)».
- **Esperado:** un canal al alcance del público del sitio (de 8 años a adultos mayores), o al menos el aviso de que se necesita una cuenta.
- **Obtenido:**
  - El enlace lleva a `github.com/…/issues/new?title=Error en «…»&body=Evento: <id>…`, con el formulario bien prellenado.
  - Sin sesión iniciada, GitHub responde 302 a `/login`.
  - En «Acerca de» sí dice «(se necesita una cuenta)»; en el evento, no.
- **Evidencia:** `curl` devolvió `302 -> https://github.com/login?return_to=…issues%2Fnew…`. Ver también `qa-13-evento-fuentes-citar.png`.
- **Frecuencia:** siempre.

### Q-25 · Cosmética — La tipografía de los datos está mezclada

- **Porcentajes:** con o sin espacio según el período: «50,1%», «36%» y «98%» (eventos de 1920 a 1970) frente a «54,7 %» y «55,76 %» (de 1980 a 2023).
  - Como el espacio es normal y no de no separación, el signo se separa del número al final de una línea. En `qa-74-que-edad-tenias.png` se lee «frente al 43» y, en la línea siguiente, «% del Sí».
- **Rangos de fecha,** con tres estilos:
  - sin espacios: «1861-1883», «enero-agosto de 1891»;
  - con guion y espacios: «21 de julio de 1927 - 26 de julio de 1931», «30 de mayo - 17 de junio de 1962», «16 de octubre de 1998 - 2 de marzo de 2000»;
  - con «a»: «julio a diciembre de 1851».
- **Mes al comienzo de la fecha:** con mayúscula en «Abril de 1557», «Enero de 1641» y «Julio de 1738»; con minúscula en «enero de 1826», «mayo de 1832» y «septiembre de 1910».
- **«a.C.» en mayúsculas:** el rótulo de la lista de historias convierte «5000 a.C.» en «5000 A.C.».
- **Créditos de imagen** con guion como separador: «Anónimo - Universidad de Chile», «Desconocido - Diario La Nación».

### Q-26 · Cosmética — «Cómo citar» no sigue bien el formato que imita (APA)

- **Obtenido:** «*Historia de Chile Interactiva*. (s. f.). Primera Junta Nacional de Gobierno. Consultado el 19 de octubre de 2026, de https://…/e/1810-primera-junta-de-gobierno.html».
  - La cursiva va en el autor, no en el título de la página.
  - APA 7 en español usa «Recuperado el … de».
  - La cita del sitio en «Acerca de» («Historia de Chile Interactiva. (s. f.). https://…») no tiene título ni fecha de consulta.
  - El enlace de la cita sí funciona: `e/<id>.html` responde 200 y lleva al evento.
- **Evidencia:** `qa-13-evento-fuentes-citar.png`.

### Q-27 · Cosmética — «Este mes en la historia»: al primer evento le falta cuánto hace

- **Obtenido:** «Comenzó el 16 de octubre de 1998 · Detención de Pinochet en Londres» no lleva «hace N años»; los otros cinco sí.
  - Los cálculos de «hace» que revisé son exactos. Por ejemplo, «hace 142 años» para el 20-10-1883, visto el 19-10-2026.
- **Evidencia:** `qa-96-empieza-aqui.png`.

### Q-28 · Cosmética — El README subestima el peso de la primera carga

- **Esperado (según el README):** «la primera carga pesa unos 110 KB comprimidos».
- **Medido** (portada con caché vacía): unos **166 KB** del propio sitio, sin contar las miniaturas de Commons:

  | Recurso | Peso |
  |---|---|
  | HTML | 9 KB |
  | JS | 93 KB |
  | CSS | 16 KB |
  | Fuentes (2) | 43 KB |
  | Manifiesto e íconos | 5 KB |

---

## 4. Las 5 correcciones más urgentes

1. **Atrás y Volver en historias y eventos (Q-01, Q-07).** Agregar entradas al historial al menos entre la lista, la presentación y los pasos de una historia, para que Atrás retroceda un paso. Además, que «Volver» desde una historia lleve a su presentación o a «Historias», no a la portada.
2. **Chips de filtro alcanzables con mouse (Q-02).** En pantallas de computador, que los chips pasen a varias filas, o agregar flechas o una barra visible. Hoy un docente con mouse no puede filtrar por «Dictadura militar» ni por «Derechos».
3. **Un buscador coherente (Q-03, Q-04, Q-05).**
   - Que el conteo del panel y el filtro de la línea usen la misma lista.
   - Que Escape (o el evento `search`) limpie también el filtro.
   - Que se normalicen los apóstrofos («ohiggins», «selknam»), se toleren los plurales y se busquen las regiones.
4. **Controles siempre a la vista en pantallas bajas (Q-06).** Que la barra Anterior/Volver/Siguiente quede dentro del alto visible (`100dvh`), y que la cabecera se compacte en horizontal y con «Texto grande».
5. **Foco y selección coherentes en la línea de tiempo (Q-08, Q-09, Q-10).**
   - Enfocar el título nuevo al navegar con las flechas.
   - Al volver, marcar el evento del que se viene (o su punto), no el de la lámina más cercana.
   - Poner la marca «+N eventos» también después de la última lámina.

Justo después vendría el eje (Q-12): las etiquetas de década no deberían sugerir una escala proporcional que no existe.

---

## 5. Lo que sí funciona

- **Estabilidad:**
  - Ninguna excepción en los flujos normales.
  - Las 16 clases de ruta cargan y se recargan bien por enlace directo.
  - Las 121 páginas `e/<id>.html` responden 200 y llevan al evento.
  - La página 404 propia funciona.
- **Cifras:** los números de la portada coinciden con los datos: 121 eventos (13+14+13+13+13+12+15+12+16), 9 períodos, 34 lugares, 9 historias y 28 palabras en el glosario.
- **Teclado:**
  - El foco se ve siempre (contorno de 3 px) y «Saltar al contenido» funciona.
  - El foco vuelve a la tarjeta al cerrar un evento (con Volver o Escape) y al botón Buscar al cerrar el panel.
  - En la línea funcionan las flechas, Inicio/Fin y +/−; el nivel se cambia con las flechas.
  - Con el panel abierto, el fondo queda `inert`.
- **Lector de pantalla:**
  - La región viva anuncia «Libros, periódicos y poesía, paso 2 de 6» y «fecha: título» al cambiar de evento.
  - El foco va al título (H2) de cada vista.
  - Hay textos alternativos y ningún control sin nombre.
  - Los grupos de chips están etiquetados («Períodos», «Temas»).
- **Preferencias:**
  - Nivel, «Texto grande» y modo clase se recuerdan al recargar.
  - El modo clase oculta «¿Qué edad tenías?»; Av Pág y Re Pág recorren el texto y pasan al siguiente evento o paso; «Pantalla completa» funciona.
  - El tema oscuro y los colores forzados se leen bien.
  - Con movimiento reducido no queda ninguna animación de más de 20 ms.
  - La letra mínima medida en todas las vistas es 18 px, y no hay desborde horizontal en ningún tamaño.
- **Mapa:**
  - Funcionan la lista de regiones, «Todo Chile», «Fuera de Chile», las zonas, los lugares y el filtro por período.
  - Una región sin eventos en el período elegido lo dice («No hay eventos de este período aquí»).
  - Atrás y Volver funcionan en todo el flujo mapa → región → lugar → evento, y el foco vuelve al elemento de la lista.
- **Historias:**
  - La presentación muestra la duración y los pasos sobre la silueta.
  - El cierre funciona y el repaso explica la respuesta, correcta o no. «Otra ronda» funciona, y en 11 rondas no hubo preguntas sobre temas sensibles.
  - «Guardar para usar sin conexión» muestra el progreso y termina.
  - La secuencia docente valida bien entre 2 y 20 eventos y los ordena por fecha.
- **Evento:**
  - Los tres niveles funcionan, igual que Anterior/Siguiente y el crédito con licencia enlazada.
  - «Ver en el mapa» lleva al lugar o a la lista correctos.
  - «Compartir» copia el enlace y avisa; «Copiar la cita» también.
  - «Escuchar» se detiene con un segundo clic, al navegar y al cambiar de nivel.
  - «Palabras para entender» se carga a pedido, y las fuentes tienen enlaces vivos.
- **Datos personales:**
  - El año de nacimiento se valida (de 1900 a 2026) y se puede olvidar; la región se guarda.
  - Solo se guarda lo que declara «Acerca de».
  - «Borrar mis datos» borra de verdad, incluidas las cachés de imágenes y de la historia guardada.
- **Rendimiento:**
  - CLS de 0 en la portada.
  - Cambiar de vista durante una carga lenta no deja estados mezclados.
  - Una búsqueda de 9.000 caracteres no bloquea la página.
  - Al girar el celular, el evento elegido sigue a la vista.
- **Búsqueda:**
  - Las tildes y las mayúsculas dan igual («concepcion» = «CONCEPCIÓN»).
  - Un año encuentra los procesos que lo abarcan («1900»).
  - Se pueden combinar términos («1879 prat»).
  - Sin resultados, sugiere otras búsquedas.
  - No interpreta HTML.

---

## 6. Lo que no pude comprobar

- **Audio de «Escuchar»:** el audio estaba silenciado. Solo comprobé el estado del botón y `speechSynthesis.speaking`.
- **Portapapeles real** («Copiar la cita», «Compartir», «Copiar el enlace»): el navegador negó la lectura (`NotAllowedError`). Solo vi los avisos «Cita copiada» y «Enlace copiado».
- **Hoja de Compartir del sistema e «Instalar»:** solo verifiqué que el manifiesto (`standalone`, íconos de 192 y 512, `lang` `es-CL`) y el Service Worker están activos.
- **Vista previa al pegar un enlace en WhatsApp o Classroom:** solo revisé las etiquetas `og:` de `e/<id>.html` y que `og.png` responde 200.
- **Modo sin conexión y uso de la historia guardada sin red:** no se pueden emular aquí. Solo comprobé que el guardado termina y crea la caché `historia-guardada`.
- **Lectores de pantalla reales** (NVDA, VoiceOver): usé el árbol de accesibilidad de Chromium. No probé la pronunciación ni el orden de lectura reales.
- **Gestos de Atrás de Android e iOS, y Safari** (incluido su borrado a los 7 días): solo probé con Edge (Chromium).
- **Mayúsculas + rueda para desplazar las filas de chips (Q-02):** la herramienta no envía la rueda con modificadores.
- **Imágenes que fallan** (dibujo de respaldo del período): no pude provocar un fallo de Commons.
- **Incidente del entorno, no atribuible al sitio:** a mitad de la sesión, una pestaña de Commons que abrí sin querer y un diálogo interno de sincronización de Edge dejaron la pestaña del sitio sin responder a CDP, sin consumo de CPU. Al cerrarlos volvió a responder.
