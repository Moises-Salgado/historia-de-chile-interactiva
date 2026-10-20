# Auditoría externa de Historia de Chile Interactiva

**Fecha:** 19 de octubre de 2026 · **Versión revisada:** la publicada en https://moises-salgado.github.io/historia-de-chile-interactiva/ (commit `7e75a5a`).

## Cómo se hizo

Tres revisores externos, que no conocían los planes del equipo, usaron el sitio publicado con un navegador real: hicieron clics, toques y deslizamientos, usaron el teclado, revisaron lo que oiría un lector de pantalla y tomaron capturas. A cada uno se le pidió hacer de abogado del diablo, sin piedad pero con evidencia.

| Revisor | Foco | Capturas | Informe original |
|---|---|---|---|
| Visual | Lo atractivo y lo visual, con la mirada de un director de arte | 278 | [`auditoria/visual.md`](auditoria/visual.md) |
| Didáctico | Si se aprende, usando la página como Sofía (8 años), Matías (14), la profesora Carmen y don Luis (72) | 74 | [`auditoria/didactica.md`](auditoria/didactica.md) |
| QA | Romper el sitio: rutas, navegación, teclado, celular, buscador y datos | 180 | [`auditoria/qa.md`](auditoria/qa.md) |

Además:

- **Barrido automático:** los 121 eventos a 320 y a 1920 px, y otras 185 rutas (cada historia con todos sus pasos, regiones, zonas, lugares, personajes y páginas). En las 427 vistas no hubo:
  - errores de consola;
  - desborde horizontal de la página;
  - letra de menos de 18 px;
  - imágenes rotas;
  - textos que se queden en «Cargando…».
- **Verificación:** antes de incluir un hallazgo importante, lo reproduje en el sitio publicado o lo comprobé en los datos o en el código. Las marcas son:
  - ✔ confirmado;
  - ◐ confirmado con matices (se explica cuáles);
  - ✘ descartado (sección 8);
  - · reportado por un revisor y no reproducido aparte (son todos menores).

Los ID (V-01, D-01, Q-01…) son los de los informes originales, donde están los pasos y la evidencia completa.

---

## 1. Veredicto

- **Lo bueno es real.**
  - Es estable: cero excepciones en los flujos normales y 427 vistas limpias.
  - Es riguroso: cada evento tiene fuentes, los temas sensibles usan cifras oficiales con su fuente y las cifras de la portada cuadran (121 eventos, 9 períodos, 34 lugares y 9 historias).
  - Cumple lo básico de accesibilidad: letra de 18 px como mínimo, foco visible y movimiento reducido respetado.
  - La línea de tiempo en escritorio, con sus láminas y sus portales de período, tiene identidad propia.
- **En celular y tablet se rompe justo la entrada.**
  - La portada se corta, o queda en blanco, en cuanto alguien vuelve después de leer un evento.
  - En la tablet, la ficha del evento se queda pegada arriba y tapa el texto.
  - «Texto grande» esconde el menú.
  - Con el celular en horizontal, los botones para avanzar quedan fuera de la pantalla.
- **La navegación desorienta.** Atrás saca de una historia completa, «Volver» lleva a la portada y una búsqueda queda como un filtro invisible que hace creer que no hay más eventos.
- **Visualmente, la imagen de época no manda.**
  - Se ve como una estampilla dentro de un marco.
  - Muchas «láminas de época» son fotos actuales, una recreación de museo o un gráfico con datos de 2024.
  - Fuera de la línea de tiempo, casi todo es texto en tarjetas.
- **Didácticamente, es una enciclopedia bien hecha, no una herramienta para aprender.**
  - Se lee, pero nada pide pensar.
  - El nivel «Para niños» solo cambia un párrafo, y lo que lo rodea está escrito para adultos.
  - El repaso es de memoria.
  - «Lo que se discute» a veces no dice qué se discute.

En palabras del revisor visual, es «un muy buen trabajo escolar». Todavía no es un producto que compita por la atención de un niño o de un adolescente.

---

## 2. Notas de los revisores (1 a 10)

| Visual | Nota | Didáctico | Nota | QA | Nota |
|---|---|---|---|---|---|
| Primera impresión | 6 | Claridad para niños | 4 | Estabilidad | 8 |
| Identidad visual | 6 | Profundidad para adultos | 7 | Navegación | 5 |
| Tipografía | 6 | Narrativa | 3 | Teclado y lector de pantalla | 7 |
| Color | 6 | Enganche | 3 | Celular | 6 |
| Imágenes | 4 | Actividades y repaso | 2 | Rendimiento percibido | 7 |
| Composición | 5 | Utilidad para docentes | 4 | Búsqueda y filtros | 5 |
| Movimiento | 4 | Trato de temas sensibles | 6 | Consistencia del contenido | 7 |
| Consistencia | 5 | Accesibilidad para adultos mayores | 5 | | |
| Celular | 4 | | | | |
| Ganas de seguir explorando | 5 | | | | |

---

## 3. Lo primero que hay que arreglar

Todo lo de esta sección está confirmado (✔). Son errores, no opiniones, y casi todos se arreglan sin tocar el contenido.

### 3.1 La portada se corta o queda en blanco en celular (D-08, V-01) ✔
- **Dónde:** `#inicio`, en celulares de 390 y 320 px, apenas la persona ya leyó un evento (es decir, cuando aparece «Tu recorrido»).
- **Qué pasa:**
  - La columna de la portada se ensancha a unos 610 px en una pantalla de 390. «Empieza aquí», «Este mes en la historia», «¿Sabías que…?» y los períodos se cortan a la derecha («Este mes en la historia: octu…»).
  - En 320 × 640, y en 390 con «Texto grande», la sección «Empieza aquí» nunca aparece: deja un espacio en blanco de unos 2.000 px.
- **Causa:**
  - `.inicio-cuerpo` (`src/styles.css:1174`) es una grilla sin columnas definidas, y el menú «Elige una región» de «Tu recorrido» la ensancha al largo de su opción más larga.
  - La animación de entrada (`por-asomar`, `src/inicio.js:373-388`) espera a que se vea el 15 % de la sección. Con la sección ensanchada y tan alta, en una pantalla chica ese 15 % nunca se alcanza.
- **Arreglo:** `grid-template-columns: minmax(0, 1fr)` en `.inicio-cuerpo`, y no animar las secciones más altas que la pantalla (o usar umbral 0).

### 3.2 En la tablet, la ficha del evento tapa el texto (amplía D-12) ✔
- **Dónde:** `#evento/*` y los pasos de las historias, en tablets en vertical (de unos 600 a 1000 px de ancho, como 768 × 1024 u 820 × 1180).
- **Qué pasa:**
  - La página está en una columna, pero la «Ficha del evento» se queda fija arriba al desplazarse. Ocupa entre el 46 y el 59 % de la pantalla y tapa el texto y «¿Qué pasó antes / después?».
  - Tapa también el campo de «¿Qué edad tenías?», que no se puede tocar porque el toque lo recibe la ficha. Para don Luis era la función más emotiva.
- **Causa:** `ajustarFicha()` (`src/detalle.js:469-476`) solo comprueba si la ficha cabe en el alto de la pantalla, no si la página está a dos columnas; `.detalle-ficha.fija` usa `position: sticky` (`src/styles.css:2992`).
- **Arreglo:** fijar la ficha solo en el diseño a dos columnas.

### 3.3 «Texto grande» esconde el menú (D-09, Q-19) ✔
- **Tablet (820 px) con «Texto grande»:** «Mapa» e «Historias» quedan fuera de la barra de pestañas. La barra se desplaza de lado, pero no tiene barra visible ni ninguna pista (`.pestanas { scrollbar-width: none }`, `src/styles.css:510-518`).
- **Celular con «Texto grande», en un evento:** las pestañas desaparecen por completo.
- **Modo «Proyectar en clase» abierto en un celular:** «General» y «Detallado» quedan tapados por los íconos de la cabecera, y en la tablet «Historias» queda fuera de la barra.
- **Arreglo:** pasar las pestañas a una segunda fila o a un menú «Secciones» siempre visible; nunca ocultarlas.

### 3.4 Atrás y «Volver» sacan de las historias (Q-01, Q-07) ✔
- **Pasos:** Historias → «Los grandes terremotos» → Empezar → Siguiente → Siguiente (paso 3) → **Atrás**.
- **Qué pasa:**
  - Atrás vuelve a la línea de tiempo y se salta los pasos, la presentación y la lista. Un segundo Atrás sale del sitio.
  - «Volver» desde un paso lleva a la portada. Si se entró a la historia por un enlace, lleva a la línea de tiempo.
  - Entre eventos, con Anterior y Siguiente, pasa lo mismo.
- **Causa:** `ir()` (`src/main.js`) reemplaza la entrada del historial entre vistas. Fue una decisión de diseño, pero en Android el gesto Atrás es la forma normal de retroceder, y un niño que retrocede un paso pierde la historia.
- **Arreglo:**
  - Agregar entradas al historial, al menos para lista → presentación → pasos.
  - Que «Volver» desde una historia lleve a su presentación.

### 3.5 En pantallas bajas, los botones para avanzar quedan fuera (V-05, Q-06) ✔
- **Celular en horizontal (844 × 390):**
  - «Anterior / Volver / Siguiente» quedan bajo el borde (de y = 497 a 551 en una pantalla de 390 px de alto).
  - La cabecera ocupa 127 px, un tercio de la pantalla, y la imagen del evento se ve del tamaño de una estampilla.
- **Celular de 320 px con «Texto grande»:** pasa lo mismo.
- **Arreglo:**
  - Que la barra quede siempre dentro del alto visible (`100dvh`).
  - Cabecera compacta cuando la pantalla mide menos de unos 500 px de alto.

### 3.6 El buscador confunde (D-10, D-11, Q-03, Q-04, Q-05) ✔
- **La búsqueda queda como filtro invisible.** Después de buscar «terremoto 1960» y abrir el resultado, el evento dice «Este es el primer evento.» y «Este es el último evento.», y desaparecen «Anterior» y «Siguiente».
- **El conteo no coincide.** El panel dice «25 resultados» para «pueblo», pero la línea de tiempo filtra «9 de 121».
- **Escape deja el filtro.** Vacía el campo, pero la línea sigue con «Filtro activo: 2 de 121 eventos».
- **Búsquedas sin resultados:**
  - «mapuches», «terremoto del 60», «terremotos» y «presidente»;
  - «maremoto», aunque la palabra está en el texto del terremoto de 1960;
  - «ohiggins» (con el apóstrofo, «O'Higgins», da 9 resultados) y «selknam»;
  - «Ñuble», que es una región del mapa;
  - «12.500», la fecha que muestra la tarjeta de Monte Verde.
- **Causa** (`src/filtros.js`):
  - solo busca en el título, los personajes, el lugar, el año, el período y el tema;
  - corta las palabras en el apóstrofo y no tolera plurales;
  - Escape en un campo `type="search"` no dispara `input`;
  - el conteo suma coincidencias parciales que la línea no usa.
- **Arreglo:**
  - Que el panel y la línea usen la misma lista.
  - Limpiar también el filtro con Escape.
  - Normalizar los apóstrofos, aceptar singular y plural, y buscar en las regiones y en el texto del nivel elegido.
  - Mostrar «Mostrando: «…» · Ver todos» también dentro del evento.

### 3.7 Línea de tiempo: el foco, la selección y el eje (Q-08, Q-09, Q-10, Q-12) ✔
- **El foco se pierde con las flechas.** En un evento, la flecha derecha pasa al siguiente, pero el foco cae en la página (`body`) y Av Pág deja de desplazar el texto.
- **No se llega a 2025.**
  - Fin y «Siguiente» terminan en el plebiscito de 2023.
  - La elección de 2025 es un punto sin tarjeta, sin la marca «+1 evento» y sin foco de teclado.
  - Causa: `dibujarHuecos()` (`src/timeline.js`) no marca lo que queda después de la última lámina.
- **Al volver, queda marcado otro evento.** Al volver de 2025 a la línea, queda marcado y con el foco el terremoto de 2010. Pasa con cualquier evento sin lámina en el zoom actual.
- **El eje sugiere una proporción que no existe.**
  - El rótulo «1870» está en x = 427 y «1880» en x = 887, pero el evento de 1877 cae en x = 477, que se lee como 1871.
  - La Ocupación de Lima (1881) queda más lejos de «1880» que 1870 de 1880.
  - La escala va por ranuras (cada evento tiene su lugar), pero los rótulos de década hacen creer que es proporcional. En una herramienta escolar, la cronología visual engaña.
- **Arreglo:**
  - Enfocar el título nuevo al navegar.
  - Marcar el evento del que se viene.
  - Poner «+N eventos» también al final.
  - Elegir entre una escala proporcional o rótulos que no sugieran proporción (decisión de diseño, sección 11).

### 3.8 En el mapa, los puntos le roban el toque a las regiones (V-08, Q-11, D-13) ✔
- **Qué pasa:**
  - Tocar el centro del Biobío abre «Negrete»; la Región Metropolitana abre «Llanos del Maipo»; el Maule, «Loncomilla», y Ñuble, «Chillán».
  - En escritorio, cinco regiones miden menos de 24 px de alto.
- **Arreglo:**
  - Que el primer toque elija la región y los lugares respondan solo dentro de la región elegida.
  - Un área táctil mínima.

### 3.9 La pestaña marcada no es la de la página (V-14, D-20) ✔
- **Qué pasa:**
  - En `#glosario`, `#acerca` y `#docentes` queda marcada «Inicio», con `aria-current="page"`.
  - En la ficha de un personaje queda marcada «Línea de tiempo».
  - El lector de pantalla anuncia «página actual» en la pestaña equivocada.
- **Arreglo:** en las páginas secundarias, no marcar ninguna pestaña.

### 3.10 Correcciones puntuales de contenido ✔
- **Errata del glosario** (V-21). En «Cabildo abierto»: «En el del 18 de septiembre de 1810…».
- **Conectores de las historias** (D-03, Q-20):
  - El paso de Maipú dice «Un mes después», pero el texto del paso anterior dice «el triunfo de Maipú, dos meses después» (del 12 de febrero al 5 de abril de 1818 hay 52 días). La función `tiempoEntre()` (`src/detalle.js:101`) cuenta solo los meses cumplidos.
  - Dice «12 meses después» donde se espera «Un año después».
  - El paso 9 de «Lo esencial» (Voto femenino) no tiene conector.
- **Tratado de 1881 en el nivel «Para niños»** (D-19). «La frontera seguiría las cumbres más altas de la cordillera de los Andes.» omite «que dividen las aguas». El nivel General sí lo dice, y el Detallado explica que esa era justamente la diferencia entre Chile y Argentina: la versión infantil quedó con la lectura de una de las partes.
- **Ficha de Augusto Pinochet** (D-16):
  - Figura como personaje en 5 eventos: el golpe, la Constitución de 1980, el plebiscito de 1988, la asunción de Aylwin y la detención en Londres.
  - No figura en «Violaciones a los derechos humanos», cuyo texto lo nombra, ni en la crisis de 1982, las protestas de 1983 ni las reformas de 2005.
  - Una ficha incompleta del jefe de la dictadura puede leerse como un sesgo.
- **Repaso en el nivel «Para niños»** (D-02). Pregunta qué persona aparece en el «Primer Congreso Nacional», y la respuesta, José Miguel Carrera, no está en el texto para niños de ese evento.
- **Porcentajes** (Q-25):
  - 57 llevan espacio antes del signo («54,7 %») y 51 no («50,1%»).
  - Con un espacio normal, el signo se separa del número al final de una línea: «43 / % del Sí».
- **Monte Verde, con dos fechas** (Q-18, D-18, V-12):
  - La tarjeta dice «c. 12.500 a.C.»; la cartela, el detalle y el nombre que oye el lector de pantalla, «c. 14.500 años atrás».
  - Además, la portada afirma «hace unos 14.500 años», cuando el propio evento explica que esa antigüedad se discute (D-21).

---

## 4. Funcionamiento: el resto de los defectos

- **Q-13 · Rutas inválidas sin aviso** ✔.
  - `#historia/esencial/abc`, `#Linea` y `#mapa/xx` dejan la línea o el mapa en silencio, con la dirección inválida en la barra.
  - En cambio, `#evento/no-existe` o `#personaje/nadie` sí avisan «No encontramos esa página».
- **Q-14 · El aviso queda encima del evento siguiente** ✔. «No encontramos esa página… Estás en la línea de tiempo» se queda unos 5 s sobre el evento al que se navega después.
- **Q-15 · Errores con clics rápidos** ✔. Cinco clics seguidos en «Siguiente» dejan 4 excepciones `AbortError: Transition was skipped` sin capturar (la promesa de `startViewTransition` no tiene `catch`).
- **Q-16 · «Borrar mis datos» no confirma** ✔. Borra de verdad, pero no muestra ni anuncia que lo hizo. Además, «Toca de nuevo para borrar» le habla de tocar a quien usa mouse.
- **Q-02 · Filtros que no se ven** ◐. En el buscador y en el mapa, 6 de los 9 períodos y 3 de los 8 temas quedan fuera de la fila, sin flechas ni un degradado que avise. En Windows se ve una barra delgada; en macOS, donde las barras solo aparecen al desplazar, no se ve nada. Ver la sección 8.
- **Q-22 · Nombres pegados para el lector de pantalla** ✔. Los botones de período se anuncian «INDEPENDENCIA1810-1823» y «PUEBLOS ORIGINARIOSHASTA 1535»: sin espacio y en mayúsculas.
- **Q-23 · Tarjetas de período sin enlace propio** ✔. Las tarjetas de período de la portada apuntan todas a `#linea`; el salto al período se hace con JavaScript. Abiertas en otra pestaña, o con el enlace copiado, siempre llevan a «Pueblos originarios».
- **Q-24, D-20 · Avisar un error exige cuenta de GitHub** ✔. Para eso hay que tener cuenta en GitHub, y la página del evento no lo advierte («Acerca de» sí).
- **Q-17 · Primera visita con red lenta** ·. En una primera visita con red lenta, un enlace directo a un evento muestra primero la línea de tiempo con «Cargando…». Mientras llega el JavaScript, el selector de nivel aparece sin «General».
- **Q-21 · Títulos cortados en 320 px** ·. En 320 px, la cartela de la línea corta los títulos largos a media frase, sin puntos suspensivos.
- **Q-26 · Formato de «Cómo citar»** ·. Imita el formato APA, pero la cursiva va en el nombre del sitio y no en el título, y dice «Consultado» en vez de «Recuperado».
- **Q-27, D-22 · «Este mes en la historia»** ✔. Al primer elemento le falta «hace N años».
- **Q-28 · Peso de la primera carga en el README** ◐. El README dice «unos 110 KB»: es lo que mide `npm run presupuesto` (solo el JavaScript y el CSS). Con el HTML (9 KB), las dos fuentes (43 KB) y el manifiesto son unos 166 KB. Conviene aclarar «sin contar el HTML ni las fuentes».

---

## 5. Lo visual y lo atractivo

- **V-02 · La imagen de época se ve como una estampilla** ✔.
  - En 1366 × 768, las imágenes verticales de la Araucanía y del Primer Congreso miden 181 × 278 px y ocupan entre el 26 y el 27 % de su marco.
  - En 29 de los 121 eventos, el archivo original de Commons mide menos de 500 px de ancho. En 1920 px, «Reforma agraria» se ve de 150 px dentro de un marco enorme.
  - El README promete «una página de revista». Los referentes (Google Arts & Culture y los especiales del NYT o de The Guardian) abren con la imagen a sangre.
  - **Qué hacer:** encabezado con la imagen a sangre, ajustada al ancho y con un punto de enfoque por imagen; un visor para ampliarla, y reemplazar los originales chicos cuando haya algo mejor.
- **V-03 · Muchas «láminas de época» no son de época** ✔. Los propios pies de foto lo dicen:
  - Monte Verde: foto de 2012, con vacas.
  - Chinchorro: recreación de museo con un maniquí.
  - Tawantinsuyu: foto de 2013.
  - Pueblo atacameño: foto de 2007.
  - Expulsión de los jesuitas: foto de 2009.
  - Primer Congreso: el edificio actual.
  - Fuerte Bulnes: foto de 2011.
  - Toma del Morro: foto de 2012.
  - Tratado de Ancón: mapa actual.
  - Crisis del Beagle: mapa de 2023.
  - **Crisis de 1982: un gráfico del PIB de 1961 a 2024, un anacronismo evidente.**

  El revisor también incluyó el plebiscito de 1988, pero su imagen es una papeleta de ese plebiscito: un objeto de la época, así que no se cuenta aquí.

  Las dos primeras láminas de la línea son justamente las vacas y el maniquí. CLAUDE.md pide «preferir pinturas, grabados, fotos y mapas de época».
- **Elección de 2025 (V-03).** El revisor visual vio el retrato de José Antonio Kast como «afiche de campaña». No es un problema de neutralidad: todas las elecciones del sitio se ilustran con el retrato de quien ganó (Alessandri, Aguirre Cerda, Aylwin y Bachelet). Queda como observación estética.
- **V-06 · Fuera de la línea, todo es texto en tarjetas.**
  - Los personajes no tienen retrato y «Pueblos que vivían aquí» no tiene mapa.
  - El glosario son 28 entradas de texto.
  - El cierre de una historia es una grilla de miniaturas, y el repaso, botones grises sin ninguna recompensa.
  - En 1366 px, «Para docentes» y «Acerca de» dejan media pantalla vacía.
- **V-11, D-04 · «Para niños» usa el mismo diseño adulto** ✔. Solo cambia el párrafo principal. La ficha, los rótulos en versalitas, el «¿Sabías que…?», el glosario y las fuentes son los mismos que ve un adulto.
- **V-09 · Transiciones con defectos visibles** ✔ (fotogramas revisados).
  - Al abrir un evento, la pestaña activa queda un instante como una píldora blanca sin texto.
  - Al pasar de paso, el marco de la imagen aparece vacío, asoma una franja clara a la izquierda y la ficha se dibuja sobre la barra inferior.
  - La «imagen de una tarjeta que crece hasta el detalle» que promete el README no se percibe.
- **V-07 · Mapa chico** ◐.
  - Chile es una franja de unos 230 px a la izquierda, y al elegir una región no hay acercamiento.
  - El filtro por período sí cambia el color de las regiones, pero el cambio es sutil.
  - «Fuera de Chile» no tiene mapa, y los créditos de Natural Earth y Wikidata van en el encabezado.
  - Los rótulos se apiñan.
- **V-04 · En celular, la línea de tiempo deja poco espacio a las láminas** ·.
  - La cabecera, la cartela y los controles se comen cerca del 63 % de la pantalla.
  - Un deslizamiento puede dejar la pantalla vacía en «miles de años».
  - En 320 px, la lámina tapa el título de la cartela.
- **V-12 · La cartela pesa más que las láminas** ◐. Encima de las láminas se imprimen 5 o 6 líneas de resumen. La doble fecha de Monte Verde se confirmó (sección 3.10).
- **V-13 · Los grupos «+N eventos · Acercar» parecen huecos rotos** ◐. Es una opinión de diseño; la parte de los botones de zoom se descartó (sección 8).
- **V-10 · La portada no tiene un «momento wow»** ·.
  - Es un titular sobre azul con una silueta gris y tres tarjetas.
  - Los moáis de la tarjeta aparecen cortados por arriba, y la llamada del héroe es un botón de contorno.
  - En 1920 px, la fila de cifras no está alineada con el héroe.
- **V-16 · Tipografía.** El texto de lectura usa la fuente del sistema (`system-ui`), así que cambia según el aparato, y hay exceso de versalitas condensadas. Es una observación de diseño: las dos fuentes propias se usan solo en títulos, fechas y rótulos.
- **V-17 · Tablet** ✔. Las tres puertas de la portada quedan en 2 + 1 con un hueco, y el portal del período sale cortado.
- **V-18 · El modo clase no aclara el título** ✔. El bloque del título sigue azul petróleo oscuro, aunque «Para docentes» dice que el modo «usa colores claros (se ven mejor en un proyector)».
- **V-19 · Reproducciones descuidadas** ✔.
  - La batalla de Maipú de Rugendas está fotografiada con su marco dorado y el reflejo del flash.
  - Un retrato aparece recortado sin la cabeza en la tarjeta de «¿Qué pasó antes?» (·).
  - El mosaico de las historias está oscurecido casi a negro (·).
- **V-22 · Períodos de la portada desalineados** ·. En la grilla de períodos, los títulos de dos líneas desalinean las reglas.
- **V-23 · Colores forzados** ·. Los rótulos del mapa quedan con un halo sucio.

---

## 6. Lo didáctico

- **D-01 · No hay aprendizaje activo** (crítica).
  - Ningún evento hace una pregunta ni propone una tarea, una comparación o la lectura de la imagen como fuente.
  - La única actividad del sitio es el repaso del final de las historias.
  - «Para docentes» no trae objetivos, actividades, guías ni preguntas.
- **D-02 · El repaso mide memoria trivial** (crítica, ✔ en lo verificable).
  - Hay cuatro moldes de pregunta: qué pasó primero, en qué siglo, quién aparece y dónde ocurrió.
  - Las opciones falsas son absurdas: Michelle Bachelet como personaje de la Independencia, «Canal Beagle» como lugar de la Primera Junta. La respuesta sale por descarte.
  - Las preguntas se repiten: «¿Dónde ocurrió la Primera Junta?» salió en las 3 rondas.
  - En el nivel «Para niños» pide siglos en números romanos.
  - La retroalimentación no explica nada.
  - En 16 preguntas de «Lo esencial» solo aparecieron 7 de los 14 pasos, y ningún tema sensible. Excluirlos es una regla actual del sitio (ver la sección 11).
- **D-03 · No hay hilo narrativo.**
  - «Antes» y «después» se eligen solo por fecha: antes de la Guerra del Pacífico aparece el Decreto Amunátegui, y antes del golpe, el Nobel de Neruda.
  - Los conectores de las historias dan tiempo y lugar, nunca causas.
  - El cierre de una historia lista los pasos, sin una síntesis de lo aprendido.
- **D-05 · Textos «Para niños» difíciles.**
  - «Patriotas» y «realistas» aparecen sin explicar, y no están en el glosario; «Estado» y «socialista», tampoco.
  - El 20 % de las oraciones pasa de 20 palabras.
  - El texto de la elección de Allende tiene 45 palabras y gasta la mitad en el trámite del Congreso.
  - Hay ejemplos citados tal cual en `auditoria/didactica.md`, sección 4.
- **D-06 · «Lo que se discute» a veces no dice qué se discute.**
  - En 10 de los 31 casos solo dice que «existen distintas interpretaciones», sin decir cuáles: el golpe, la UP, las reformas económicas y el estallido, entre otros. En el golpe, además, repite la oración que se acaba de leer.
  - El texto General del golpe no da ninguna causa: están solo en el Detallado.
  - Ya estaba en `REVISION_PENDIENTE.md` como pendiente de redacción humana.
  - Contrasta con Curalaba, Quilín, la Constitución de 1833 o la Guerra del Pacífico, donde sí se nombran las posturas.
- **D-07 · Huecos de contenido.**
  - De 1970 a 1973 solo hay la elección, el cobre y el Nobel de Neruda: nada sobre el gobierno de la UP ni sobre la crisis previa al golpe.
  - Los pueblos originarios desaparecen después de 1888.
  - No hay ningún evento sobre la sociedad colonial.
- **D-14 · El «¿Sabías que…?» es árido.** Son oraciones copiadas del Detallado, con leyes, cifras exactas y porcentajes. «Otro dato» avanza en orden cronológico, no al azar.
- **D-15 · Desastres sin la gente.**
  - El terremoto de 1960 se cuenta como un boletín sismológico, sin cómo lo vivieron las personas ni la reconstrucción.
  - El Detallado repite mucho de lo que ya dijo el General: en cinco eventos, el 40 % o más.
- **D-16 · Personajes sin la persona.** Las fichas son listas de eventos, sin retrato ni una biografía breve. Lo de la ficha de Pinochet está en la sección 3.10.
- **D-17 · «Para docentes» está escondido.**
  - Solo se llega desde el pie de la portada.
  - La secuencia no admite título, notas ni un orden propio.
  - No hay orientaciones para tratar los temas sensibles en el aula.
- **D-18 · Nociones de tiempo para niños.** En el nivel «Para niños» no se explican «a.C.» ni «c.», y se mezclan «hace X años» y «a.C.».
- **Lo que vivieron las cuatro personas** (diarios completos en `auditoria/didactica.md`):
  - **Sofía** abandona a los 12 minutos.
  - **Matías** termina el resumen de la Guerra del Pacífico, pero no entiende el porqué de 1973.
  - **Carmen** ahorra el tiempo de buscar, pero tiene que diseñar el resto de la clase.
  - **Don Luis** no encuentra el mapa, no puede usar «¿Qué edad tenías?» y no se reconoce en el texto del terremoto que vivió.

---

## 7. Lo que sí funciona (para no romperlo)

- **Estabilidad.**
  - Ninguna excepción en los flujos normales.
  - Todas las rutas válidas cargan y se recargan por enlace directo, y las 121 páginas `e/<id>.html` responden.
  - La página 404 propia funciona.
- **Rigor.**
  - Hay fuentes en cada evento.
  - Los temas sensibles traen cifras oficiales atribuidas: Rettig, Valech, el INDH, el ACNUDH y la Corte Internacional de Justicia.
  - En Curalaba, Quilín, la Constitución de 1833, la Guerra del Pacífico y Rapa Nui se nombran las posturas.
- **Accesibilidad básica.**
  - Letra mínima de 18 px en todas las vistas, y de unos 22 px en el modo clase y con «Texto grande».
  - Foco visible de 3 px y «Saltar al contenido».
  - El fondo queda inerte con un panel abierto, y hay una región viva que anuncia el cambio de vista.
  - Con movimiento reducido no queda ninguna animación.
- **La línea de tiempo en escritorio.** El muro de láminas, los portales de período, el eje con «miles de años» y el minimapa. Es la pieza con más identidad y la más cercana a Google Arts & Culture.
- **Color.** El sistema de color es coherente en claro, en oscuro y con colores forzados.
- **Detalles que funcionan:**
  - «Escuchar» lee con voz de Chile.
  - «Proyectar en clase» con Av Pág.
  - «Cómo citar» con la fecha de consulta.
  - Las duraciones por nivel en «Para docentes».
- **Buenas ideas de contenido:**
  - «Elige cómo leer» con el mismo evento en tres niveles.
  - «Este mes en la historia».
  - «¿Qué edad tenías?» y «Tu región».
  - Algunas frases infantiles muy logradas: «Por eso cada 18 de septiembre celebramos las Fiestas Patrias» y las mujeres yaganes que buceaban en el agua helada.
- **Datos personales.** Se guarda solo lo que declara «Acerca de», y «Borrar mis datos» borra de verdad.
- **Rendimiento.** CLS 0 en la portada; con 3G y CPU × 4, la portada pinta a los 2,8 s.

---

## 8. Lo que se descartó o se corrigió en la verificación

- **V-13 ✘ · Botones de zoom.** Sí se desactivan en los límites: llevan `aria-disabled="true"` y se ven atenuados. El revisor solo miró el atributo `disabled`.
- **V-20 ✘ · Personaje inexistente.** Sí muestra el aviso «No encontramos esa página», tanto al llegar por enlace como navegando dentro del sitio.
- **V-07 ◐ · Filtro del mapa.** Sí cambia el mapa: con «Independencia», las 16 regiones pasan de 9 tonos a 5, y solo quedan de color las que tienen eventos de ese período. El cambio es tan sutil que el revisor no lo vio.
- **Q-02 ◐ · Filtros con mouse.** El navegador de la auditoría ocultaba las barras de desplazamiento (opción `--hide-scrollbars`). En Windows, la fila de filtros muestra una barra delgada, así que no es imposible elegirlos con mouse. Lo que queda es real: no hay pista visible de que faltan 6 períodos, y en macOS no se ve ninguna barra.
- **D-21 ◐ · Monte Verde.** El debate sobre su antigüedad ya está en el evento, con fuentes, y en `REVISION_PENDIENTE.md`. Lo observable es que la portada lo afirma sin matiz.
- **Imagen de 2025.** Sigue el mismo criterio que las demás elecciones (sección 5).

---

## 9. Lo que no se pudo comprobar

- **Funciones que el entorno no permite probar:**
  - el audio de «Escuchar» (estaba silenciado; sí se comprobó qué lee y con qué voz);
  - el portapapeles real, la hoja de compartir del sistema, «Instalar» y la pantalla completa real;
  - el uso sin conexión (ya se había comprobado aparte en M9).
- **Personas y aparatos reales:**
  - lectores de pantalla reales (NVDA, VoiceOver);
  - Safari, iOS y los gestos de Atrás de los celulares;
  - pantallas de alta densidad;
  - la comprensión real de niños y adultos mayores: los juicios de lectura vienen de leer los textos y de métricas, no de pruebas con personas.
- **Cifras puntuales** que el revisor didáctico no contrastó con su fuente: 128.153 cesantes en 1932, el parte oficial de Santa María y la audiencia del rescate de 2010.

---

## 10. Orden sugerido

1. **Arreglos técnicos** (secciones 3.1 a 3.9 y 4).
   - No tocan el contenido y se pueden verificar con la matriz de capturas.
   - Hay que sumar a la matriz los casos que esta auditoría encontró: portada con «Tu recorrido» a 320 px, tablet en vertical, celular en horizontal, «Texto grande» en tablet, y Atrás dentro de una historia.
2. **Correcciones puntuales de contenido** (sección 3.10).
3. **Imágenes.**
   - Reemplazar las láminas que no son de época, empezando por las primeras de la línea (Monte Verde y Chinchorro) y por la crisis de 1982.
   - Encabezado de evento con la imagen grande.
   - Revisar los 29 originales de menos de 500 px.
4. **Trabajo editorial con revisión humana.**
   - Un nivel «Para niños» completo, con su entorno.
   - «Lo que se discute» con posturas atribuidas a su fuente, y causas en el nivel General del golpe.
   - Conectores causales en las historias y preguntas de repaso escritas a mano.
   - Es contenido histórico: no se debe generar sin cotejarlo con las fuentes.
5. **Lo más grande.** Mapa con límites históricos aproximados, un kit docente por historia, y personajes con retrato y biografía breve.

---

## 11. Decisiones que le tocan al dueño del proyecto

- **Temas sensibles en el repaso.** Hoy se excluyen a propósito (`src/sensibles.js`). El revisor didáctico propone incluirlos con preguntas de hechos que el texto ya responde, como «¿Qué se votó en el plebiscito de 1988?».
- **Atrás entre vistas.** Hoy el historial se reemplaza a propósito para no llenarlo. Las pruebas muestran que así se pierde el lugar en las historias.
- **El eje de la línea de tiempo.** Hoy es por ranuras, con rótulos de década. Las opciones son una escala proporcional o rótulos que no sugieran proporción.
- **Firma del sitio y contacto** (pendiente desde antes). «Acerca de» no nombra a un responsable ni a un revisor, y para avisar de un error se necesita una cuenta de GitHub. Para un docente que elige recursos, eso pesa.
- **Revisión humana.**
  - Las 28 definiciones del glosario (hoy dicen «en revisión»).
  - Las 11 oraciones formulaicas de «Lo que se discute».
  - Probar el nivel «Para niños» con niños reales.
