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

## Datos del mapa

- **Regiones:** Natural Earth 10m admin-1, v5.1.2, de dominio público, filtrado a `adm0_a3 = CHL`. Trae las 16 regiones actuales, Ñuble incluida.
  - **Proyección:** equirectangular con `x = (lon + 80,5) · cos 36,75° · 26` e `y = (−17,4 − lat) · 26`, en un viewBox de 302 × 1006.
  - **Simplificación:** Douglas-Peucker (ε 0,55; 0,15 para las islas). Se omiten los islotes de menos de 1,2 unidades² y queda en unos 48 KB.
  - **Rapa Nui:** va en un recuadro a 8× la escala.
  - **Salas y Gómez** queda fuera.
- **Lugares (`data/lugares.json`):** 34 ciudades y sitios, cada uno con nombre, región, coordenadas, id de Wikidata y `aproximado`.
  - Las coordenadas de las ciudades se toman de Wikidata (CC0).
  - Los sitios históricos se ubican junto a la localidad actual más cercana y se marcan como aproximados: Curalaba, Tucapel, Quilín, río Mataquito, Loncomilla, Chacabuco, llanos del Maipo, Chañarcillo, mina San José, Monte Verde, estrecho de Magallanes, Tierra del Fuego, canal Beagle, Chiloé, lago Llanquihue y valle del Aconcagua.
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
