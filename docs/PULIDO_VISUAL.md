# Pulido visual y de movimiento

Registro de las pasadas de la etapa actual (CLAUDE.md, «Dirección de arte», «Movimiento» y «Verificación visual»). Cada pasada cubre una vista y termina con `npm run capturas`, la revisión de las imágenes, `npm run build && npm run presupuesto` y un commit `visual: …`. Cada tres pasadas hay una auditoría: solo se miran las capturas y se listan las inconsistencias entre vistas, sin arreglar nada.

## Pasadas

1. **Fundamentos** (todas las vistas, porque los tokens viven en un solo lugar):
   - paleta de papel, tinta y ocre en `:root`, con el modo oscuro de la dirección de arte;
   - un ocre más luminoso (`--ocre-luz`) para texto chico sobre el océano, que con el ocre claro quedaba en 4,5:1;
   - colores de período más sobrios (`datos.js`, misma luz y 65 % del croma, sin tocar `data/`);
   - Source Serif 4 regular en el texto corrido, y Barlow Condensed en botones, chips y nivel de lectura;
   - escala fija de 18, 21, 26, 34 y 48 px, dos pesos por familia, sombras cálidas, unos 70 caracteres por línea y estados de 150 a 250 ms.
2. **Portada:**
   - la «Jura de la Independencia» (Cosme San Martín, de su evento) junto al título y la frase, con su pie en una banda;
   - las tres entradas a la vista sin bajar, de 375 × 667 a 1920 × 1080 (en el celular, como teselas);
   - «¿Primera vez?» y las cifras van después, y las cifras cuentan desde cero (600 ms, una vez);
   - salen la llegada animada y el fundido al asomar (eran adorno);
   - «Empieza aquí» es una sección abierta con un filete en ocre, no una caja.
3. **Ficha de evento:**
   - la obra a ancho completo arriba, entera, con su pie centrado en una banda, y el titular abajo con la bajada al lado;
   - los retratos siguen junto al titular;
   - en un paso de historia, la obra es más baja para que el título siga a la vista;
   - Ken Burns de 1 a 1,05 en 20 s, una vez: la única excepción declarada al tope de 400 ms (`npm run presupuesto`).

## Auditoría 1 (después de las pasadas 1 a 3)

Inconsistencias entre vistas vistas en las capturas, para las pasadas siguientes:

- **Mapa:**
  - la tierra y el achurado siguen en el verde azulado frío de antes, mientras la región elegida y los acentos son ocre;
  - la lista de regiones del panel son muchas cajas chicas, cuando el resto del sitio pasó a filetes;
  - con un período elegido, el chip anterior queda cortado bajo «Todos los períodos» («…uista y Colonia») sin un fundido que lo esconda.
- **Botón primario:** sobre papel es ocre con texto blanco; en el modo oscuro, ocre claro con texto oscuro; sobre el océano, ocre luminoso con texto oscuro. Son tres aspectos por razones de contraste, todos AA. Conviene unificar al menos el radio, el alto y el peso.
- **Cajas frente a filetes:**
  - siguen como cajas «Este mes en la historia», los niveles de «Elige cómo leer», la barra de una historia, el índice del glosario y las fichas de grupo y personaje;
  - la dirección de arte pide separar con filetes finos en ocre; las marcas del color del período (borde izquierdo) sí corresponden.
- **Lo que las capturas no muestran:** solo toman la primera pantalla. El cuerpo del evento (texto, ficha, «¿Qué pasó antes / después?»), la cartela completa de la línea y el pie de la portada hay que revisarlos en su pasada, desplazando la vista.
- **Línea de tiempo:** el portal del período y la banda inferior usan el color sobrio del período, y la cartela, el ocre. Falta el movimiento que pide CLAUDE.md: el eje se desplaza al cambiar de período y las láminas entran escalonadas.

## Pasadas (continuación)

5. **Línea de tiempo:** los saltos largos (un período, el minimapa, «Al inicio») ya no se funden: la pista llega deslizándose desde el lado del viaje, y los puntos y las franjas a la vista entran escalonados (30 ms, a lo más 10).
6. **Mapa:**
   - tierra de arena cálida (#7c7668) con la escala de cantidad en ocre;
   - al filtrar, las regiones se tiñen de norte a sur (15 ms entre una y otra);
   - el panel entra deslizándose desde el lado del mapa;
   - la lista de regiones va en filas con filete;
   - el chip «Todos los períodos» lleva un fundido a su derecha.
7. **Historias:** el conector se revela con un trazo que se dibuja (`stroke-dashoffset`, la excepción que pide la dirección de arte), y el paso siguiente entra desde abajo (al retroceder, desde arriba).

## Auditoría 2 (después de las pasadas 4 a 7)

- **Mapa:** el fundido del chip fijo (2,5rem) todavía deja leer el chip que pasa por debajo («…ista y Colonia»). Hace falta un tramo opaco antes del degradado.
- **Siguen como cajas:**
  - el índice del glosario (16 cuadros con borde);
  - «Este mes en la historia» y «Elige cómo leer», en la portada;
  - la barra de una historia.

  Con la dirección de arte, las listas y los índices llevan filetes o van sueltos; las cajas quedan para lo que se toca como un botón.
- **Resuelto desde la auditoría 1:** la tierra del mapa, la lista de regiones y el movimiento de la línea de tiempo.
- **Coherente entre vistas:**
  - las cejas en ocre (ocre luminoso sobre el océano);
  - los títulos en 34/48 px según el ancho;
  - la navegación en Barlow;
  - el texto en Source Serif.

## Pasadas (cierre)

9. **Páginas de texto:** el índice del glosario es como el de un diccionario (letras sueltas sobre un filete en ocre, de 44 px para tocarlas), y el resumen de las fichas de personaje y de grupo se limita a la medida de lectura.
10. **Arreglos de la auditoría 2:**
    - la barra de una historia, sin caja, sobre un filete en ocre;
    - el chip «Todos los períodos» lleva un tramo opaco antes de su fundido;
    - al elegir un período, su chip queda a la vista justo después del fundido.

**Verificación final:** contraste, letra mínima, objetivos táctiles y desborde, sin problemas en claro y oscuro, en 1440 × 900 y en 390 × 844, en la portada, la línea, un evento, un paso de historia, el glosario, el mapa, un personaje y la lista de historias. Sin errores de consola.

**Queda para una próxima ronda:** «Este mes en la historia» y «Elige cómo leer», en la portada, siguen como cajas. Allí cada fila se toca como un botón, así que se pueden quedar.

## Auditoría 3 (en vivo, sobre el sitio publicado, 2026-10-20)

**Cómo se hizo.** Manejé el sitio publicado como un visitante, con unas 60 capturas:
- primera visita sin caché, en 1440 × 900 y en un celular de 390 × 844 táctil;
- con la rueda, el arrastre, deslizando con el dedo, el buscador, el mapa, las historias y el modo oscuro;
- las transiciones, en cámara lenta.

**Veredicto.** Funciona y es riguroso, pero se ve como una aplicación educativa bien hecha, no como un atlas ni como una sala de museo:
- cada módulo habla su propio idioma visual: tarjetas, chips, botones de opción, cajas teñidas, píldoras y losas de color;
- los controles pesan más que el contenido;
- salvo en la línea de tiempo, las imágenes van como figuras chicas.

La mejor pantalla del sitio es la línea de tiempo en el tramo de la Independencia: cinco óleos de época seguidos, como una galería. Esa debería ser la identidad de todo.

**Errores a la vista:**
1. **Portada, escritorio:** «¿Primera vez? Empieza aquí» queda en x = 18, fuera de la columna (x = 72). La regla `.empieza-ir { margin: 1.25rem 0 0 }` pisa el `margin-inline: auto`.
2. **Línea, celular:** con un título de dos líneas (`#linea/05`), las láminas tapan el botón «Leer».
3. **Línea, escritorio:** el filete punteado del límite de período cruza el texto de la cartela.
4. **Eje:** años repetidos bajo los puntos («1938 1938», «1962 1962», «1971 1971»), que se leen como errores.
5. **«¿Sabías que…?» de la portada:** un retrato de 500 × 560 px sin decir quién es; el pie solo trae el autor y la licencia.
6. **Silueta de Chile:** verde azulado en las historias, en el mini-mapa y en los pueblos, y arena cálida en el mapa.

**Problemas de diseño, de más a menos grave:**
- **Portada sin gancho:**
  - un titular genérico y una obra encajonada a la derecha, con su pie de documento;
  - tres puertas sin familia: una pintura, una tesela casi vacía y un collage gris;
  - después, unas 3 pantallas en el escritorio y 6,5 en el celular de módulos distintos;
  - los períodos son nueve losas de color sin una imagen.
- **Controles por todas partes:**
  - la cabecera es una barra de herramientas (nivel, «Texto», «Proyectar», lupa), con un filete rojo de lado a lado;
  - en el celular, la cabecera ocupa 125 px en dos filas, y con las barras inferiores, cerca del 40 % de la pantalla.
- **Línea de tiempo:**
  - el 40 % de arriba de la pantalla queda vacío y la parte de abajo se amontona (eje, años, banda y 6 controles);
  - con el zoom por omisión, casi la mitad de las láminas son pilas grises de «+N eventos · Acercar»;
  - los portales de período son losas lisas.
- **Ficha de evento:**
  - con un retrato, la primera pantalla es título y una foto angosta, con 335 px de océano vacío entre ambos;
  - más abajo, cinco estilos de caja en una pantalla, y una ficha lateral que parece un formulario;
  - en el celular, la primera pantalla es solo la foto y el título queda bajo el pliegue.
- **Buscador:** 17 chips ocupan la pantalla y los resultados quedan abajo (con «terremoto» se ven 2,5 de 7).
- **Mapa:**
  - la vista mejor resuelta, pero Chile mide unos 110 px de ancho, con 390 px de mar vacío hasta el panel;
  - en el celular, la mitad de arriba es texto.
- **Historias:**
  - la presentación no tiene ni una imagen, y su silueta dice «2-4, 6-9»;
  - en la lista, el degradado tapa casi todas las imágenes.

**Lo que funciona y hay que conservar:**
- la pareja Source Serif y Barlow;
- la paleta de papel, tinta y ocre, y el modo oscuro;
- el lenguaje cartográfico del mapa (latitudes, escala, recuadro de Rapa Nui);
- la línea de tiempo cuando sus imágenes son de época;
- el encabezado del evento con una obra apaisada;
- las transiciones sin parpadeos;
- la barra Anterior / Volver / Siguiente.
