# Idea maestra: un atlas de Chile

Rediseño visual aprobado el 19-10-2026. Maquetas y prototipo del mapa: https://claude.ai/artifact/1FzinuCRyzSXgj5zBmV6pG

## La idea

Chile es una franja larga que se recorre en dos direcciones: de izquierda a derecha en el tiempo (la línea de tiempo) y de arriba abajo en el territorio (el mapa). Cada evento está en los dos lugares, y se pasa de uno al otro con un toque.

**Diagnóstico.**
- Las imágenes de época se ven como estampillas.
- El beige y gris es genérico: no recuerda al país.
- No hay forma de explorar por lugar.
- No hay portada.

## Sistema visual

- **Paleta:**

  | Token | Valor | Uso |
  |---|---|---|
  | Pacífico | `#0F2C36` | portada, mapa, cabeceras inmersivas |
  | Cobre | `#C97A3F` | acento; `#9C5526` como texto sobre claro y `#E8A874` sobre el océano |
  | Niebla | `#EEF2F0` | fondo de lectura |
  | Tierra | `#46666B` | tierra del mapa |
  | Roca | `#142220` | texto |

  - El rojo de la bandera, solo como acento.
  - Los 9 colores de período se mantienen.
  - Todo token se define en claro y en oscuro, con contraste AA medido.
- **Tipografía:**
  - Source Serif 4 para los títulos (ya está en la app).
  - Barlow Condensed 600 en mayúsculas espaciadas para fechas, lugares y rótulos del mapa: unos 15 KB, alojada en `src/fonts/` con su licencia OFL.
  - La letra del sistema para leer.
- **Motivos:**
  - Curvas de nivel de la cordillera, dibujadas en canvas y estáticas.
  - El eje del tiempo como escala gráfica de mapa, en tramos blancos y negros.
  - Latitudes (20° S, 30° S…) en el mapa.

## Fases (cada una se publica por separado)

| Fase | Contenido | Lista cuando |
|---|---|---|
| A · Identidad y portada | Tokens nuevos; Barlow Condensed; curvas de nivel; cabecera con pestañas Inicio · Línea de tiempo · Mapa · Historias; Inicio (`#inicio`) con tres puertas de imagen y un evento destacado | la portada carga en ≤ 2,5 s (celular, red lenta) y la línea de tiempo queda a un toque |
| B · Mapa de Chile | `data/lugares.json` y eventos → lugares (ver abajo); regiones SVG cargadas solo al abrir el mapa; rutas `#mapa`, `#mapa/<región>`, `#lugar/<id>`; filtro por período; lista de regiones de norte a sur; «Ver en el mapa» en cada evento | cada región y lugar se elige con dedo, mouse y teclado; los lugares aproximados figuran en `REVISION_PENDIENTE.md` |
| C · Línea de tiempo con láminas | imagen a sangre con el título encima (más alta en los hitos); portal de color al abrir cada período; eje como escala gráfica | ≥ 6 láminas a la vista en 1366×768; texto sobre imagen con AA |
| D · Detalle tipo revista | imagen de cabecera con título y crédito visible; ficha lateral con mini-mapa, lugar, período y personajes; «¿Sabías que…?» como cita | en celular, título e imagen caben en la primera pantalla |
| E · Pulido y verificación | revisión del crítico, del director de arte y del guardián; LCP, CLS y peso en claro, oscuro y modo clase | sin errores de consola, letra mínima de 18 px, sin hallazgos graves |

## Avance

- **A · Identidad y portada (hecha).**
  - La portada está en `index.html`, así se ve antes de que cargue la app. Las fotos de las puertas se precargan solo si la portada está a la vista; con un enlace directo a un evento no se descargan.
  - Medido en el sitio construido: LCP de 1,5 s en celular con red lenta y CPU 4× más lenta, y CLS de 0.
  - Mientras otra sección o un detalle tapan la línea de tiempo, esta no se dibuja ni pide imágenes (`content-visibility: hidden`). Eso dejó en 0 el CLS de un enlace directo a un evento en celular, que era de 0,38.
  - El botón «Inicio» de la barra inferior pasó a llamarse «Al inicio», para no confundirse con la pestaña de la portada.
- **B · Mapa de Chile (hecha).**
  - `data/lugares.json` tiene 34 lugares (coordenadas de Wikidata, comprobadas contra los polígonos de cada región) y 10 zonas. `data/ubicaciones.json` ubica los 121 eventos: 35 de alcance nacional y 11 total o parcialmente fuera de Chile.
  - Solo 9 lugares quedaron como aproximados (sitios de batallas y parlamentos, el valle del Aconcagua y el estrecho), porque los demás tienen su propio ítem en Wikidata. Se listan en `docs/REVISION_PENDIENTE.md`.
  - Las zonas siguen el texto de cada evento: la presencia inca llega hasta el Maule, el terremoto de 1960 suma Aysén y el 27F abarca Chile central y Juan Fernández.
  - Chacabuco queda en la Región Metropolitana: Wikidata ubica la batalla en Santiago, aunque su punto cae junto al límite con Valparaíso.
  - El mapa (código y formas, 22 KB comprimidos) se carga al abrirlo. Su título y su espacio están en `index.html`: LCP de 1,0 s en celular lento y CLS de 0,002.
  - Con el teclado, las flechas recorren las regiones de norte a sur. Los lugares de cada región están también como botones en el panel, el equivalente accesible de los alfileres chicos.
- **C · Línea de tiempo con láminas (hecha).**
  - Cada evento es una lámina de 9,5 rem de ancho. El alto depende de la importancia (11, 12,5 y 14,5 rem). La fecha va en una pastilla del color del período y el título en serif, sobre un degradado que parte en 0,78 de opacidad: el texto blanco tiene al menos 8,9:1 aunque la imagen sea blanca.
  - Las imágenes se piden en 250, 330 o 500 px según la pantalla.
  - Un portal de color abre cada período: número, nombre, fechas y curvas de nivel, en un SVG de fondo sin peticiones. Tocarlo lleva al primer evento del período.
  - El eje es una escala gráfica de tramos alternados, como adorno: los años se leen en las etiquetas.
  - Con poca altura, láminas y portales bajan hasta un 60 % para que quepa la cartela, pero no se angostan (ver E).
  - Medido:
    - **Láminas a la vista:** 5 o 6 en 1366×768 en las zonas densas, porque los hitos se ubican primero y dejan huecos; 10 en 1920×1080, con dos carriles. No alcanza del todo el «≥ 6» del plan; se prefirieron láminas grandes antes que más chicas.
    - **Rendimiento:** 54 cuadros por segundo al desplazar con la CPU 4× más lenta. LCP de 2,5 s y CLS de 0,01 al abrir `#linea` en frío en un celular lento.
- **D · Detalle tipo revista (hecha).**
  - **Portada sobre el océano:** el titular (período, título, fecha, «hace…» y lugar) y la imagen completa, sin recortar, con su pie y crédito debajo. El fondo lleva curvas de nivel y un tinte del 14 % del color del período; la imagen difuminada que tenía al principio se quitó en E.
  - **Grupos, historias y personajes** usan la misma portada, con curvas de nivel en vez de imagen.
  - **Ficha lateral** (fija al desplazar): un mini-mapa con la silueta de Chile y los lugares del evento, las franjas de sus zonas o todo el país en cobre, más el lugar, el período, «Ver en el mapa», la regla del tiempo, los temas y los personajes. Para las zonas basta un resumen de latitudes por región, de 0,3 KB (`src/chile-latitudes.json`, que también escribe `generar-mapa.mjs`).
  - **El «¿Sabías que…?»** va como cita con filete de cobre.
  - **Medido:** en celular (390×844), el título y la imagen caben en la primera pantalla; también en escritorio y en los pasos de historia.
- **E · Pulido y verificación (hecha).**
  - **Mediciones** en el sitio construido, primera visita en celular con red 4G lenta y CPU 4× más lenta:

    | Vista | LCP | CLS | Peso propio |
    |---|---|---|---|
    | Portada | 1,5 s (la primera conexión a Wikimedia puede llevarlo a 2,7 s) | 0 | 179 KB |
    | Línea de tiempo | 2,3 a 2,5 s | 0,01 | 178 KB |
    | Mapa | 1,0 s | 0,002 | 200 KB |
    | Evento por enlace directo | 3,4 a 3,7 s (antes del rediseño, 4,4 s) | 0 | 179 KB |

    - En modo oscuro las cifras son similares.
    - En modo clase, en escritorio, todo carga en menos de 0,6 s.
    - El peso propio es HTML, CSS, JS y fuentes, ya comprimidos; las imágenes de Commons van aparte.
  - **Mejoras en la carga del detalle:** la imagen principal tiene `srcset` (500 o 960 px) y, con un enlace directo, se precarga antes de armar la línea de tiempo.
  - **Revisión del crítico, del director de arte y del guardián** sobre capturas de 19 pantallas. Lo principal que cambió:
    - **Mapa:** en escritorio queda fijo y del alto de la pantalla. En celular, lo elegido aparece en una hoja abajo y el mapa se desplaza solo si esa hoja lo tapa. La tierra y los límites superan 3:1 de contraste. Si el mapa no carga, un aviso ofrece recargar. Las regiones usan `aria-current` y el globo con el nombre se cierra con Escape.
    - **Línea de tiempo:** hay 9 títulos cortos (`data/titulos-cortos.json`) para los títulos que no cabían. Con poca altura, las láminas bajan sin angostarse y su título baja con ellas sin pasar de 1 rem. Antes se truncaban 20 títulos en modo clase a 1366×768, 10 con texto grande y 40 con texto grande en celular; ahora, ninguno. Solo se parten con guion las palabras de 13 letras o más. La descripción del período va completa o no va, y la cartela corta se oculta si no cabe entera.
    - **Detalle:** sin fondo difuminado, para que ningún evento se vea más lúgubre o más épico por su foto. La imagen va con paspartú, la columna de lectura mide 36 rem y la ficha queda fija solo cuando cabe entera.
    - **Para volver:** la portada muestra «Tu recorrido» (cuántos eventos se han visto y con cuál seguir). Cada historia guiada muestra su avance, las láminas vistas llevan ✓ y los eventos desde 1900 ofrecen «¿Qué edad tenías?» junto a la fecha.
    - **Cabecera:** va en una fila desde 84 em. Con texto grande en el celular ocupa tres filas, y dos al leer un evento.
    - **Historias:** el degradado va con el texto, así la ceja cobre tiene contraste AA sea cual sea el alto de la tarjeta.
  - **Revisión final de las 19 pantallas** (claro, oscuro, modo clase, texto grande, celular y escritorio): letra mínima de 18 px (22 px con texto grande y 22,4 en modo clase), sin desborde horizontal y sin errores de consola.
- **Después del atlas: el plan MVP.** Pulido, movimiento y funciones que faltaban, en [PLAN_MVP.md](PLAN_MVP.md) (fases M1 a M9):
  - instalar y compartir;
  - «Acerca de» y «Para docentes»;
  - nueve historias con presentación, cierre y repaso;
  - glosario, «Lo que se discute» y «Escuchar»;
  - textos a pedido.

  Sus mediciones finales están en el «Avance» de M9.

## Datos del mapa

- **Regiones:** Natural Earth 10m admin-1, v5.1.2, de dominio público, filtrado a `adm0_a3 = CHL`. Trae las 16 regiones actuales, Ñuble incluida.
  - **Proyección:** equirectangular con `x = (lon + 80,5) · cos 36,75° · 26` e `y = (−17,4 − lat) · 26`, en un viewBox de 302 × 1006.
  - **Simplificación:** Douglas-Peucker (ε 0,55; 0,15 para las islas). Se omiten los islotes de menos de 1,2 unidades² y queda en unos 48 KB.
  - **Rapa Nui:** va en un recuadro a 8× la escala.
  - **Salas y Gómez** queda fuera.
- **Lugares (`data/lugares.json`):** 34 ciudades y sitios, cada uno con nombre, región, coordenadas, id de Wikidata y `aproximado`.
  - Las coordenadas de las ciudades se toman de Wikidata (CC0).
  - Un sitio histórico sin coordenadas propias se ubica en el sitio que da Wikidata o en la localidad actual más cercana, y se marca como aproximado, con una nota que lo explica. Son 9; ver «Avance».
  - **Zonas sin alfiler**, que cuentan en sus regiones: altiplano, norte y centro (Tawantinsuyu), Norte Chico, del Choapa a Chiloé (mapuche), archipiélagos de los Chonos, Patagonia occidental, Araucanía, Tarapacá y Antofagasta (salitre) y zona centro-sur (terremotos de 1960 y 2010).
- **Eventos → lugares:** cada evento tiene una o más ubicaciones.
  - Puede ser un lugar o una zona.
  - `chile` marca los 35 eventos de alcance nacional.
  - `fuera:<país>` marca los 11 ocurridos total o parcialmente en otros países: España, Perú, Argentina, Suecia, el Vaticano, el Reino Unido y, en el caso del exilio, varios países.
  - `npm test` valida que cada id exista y que todo evento tenga al menos una ubicación.
- **Veracidad:**
  - Solo se ubica lo que dice el campo `lugar` de cada evento.
  - Lo aproximado se rotula así en la app y se lista en `docs/REVISION_PENDIENTE.md` para revisión humana.
  - Los límites son los de las regiones actuales; el mapa lo indica.

## Lo que no cambia

- Las fuentes, los tres niveles de lectura y la neutralidad en los temas sensibles.
- Ningún evento recibe un trato más épico o más lúgubre que otro, tampoco en el mapa.
- Crédito y licencia en cada imagen.
- Letra mínima de 18 px, contraste AA, modo oscuro, «Texto grande», modo clase, todo por teclado y respeto por el movimiento reducido.
- Sin frameworks ni librerías de mapas.
