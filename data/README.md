# Datos de la línea de tiempo

JSON en UTF-8. `src/datos.js` los incluye en el sitio y `npm test` (`scripts/validar-datos.mjs`) comprueba este esquema. JSON no admite comentarios: usa los campos descritos aquí.

| Archivo | Contenido |
|---|---|
| `periodos.json` | Lista de los 9 períodos (franjas de color de la línea de tiempo). |
| `temas.json` | Vocabulario cerrado de temas (filtros). Solo se pueden usar estos ids. |
| `NN-nombre.json` | Lista de eventos del período `NN` (~10-15 por archivo), ordenados por fecha. |

## Período

| Campo | Tipo | Regla |
|---|---|---|
| `id` | texto | `"01"` a `"09"`; igual al prefijo de su archivo de eventos. |
| `nombre` | texto | Nombre visible, ej. `"Independencia"`. |
| `inicio`, `fin` | número | Años del período (negativo = a.C.). `"fin": null` = hasta hoy. |
| `fechasTexto` | texto | Rango legible, ej. `"1810-1823"`. |
| `color` | texto | Color de la franja en hex `#rrggbb`. |
| `descripcion` | texto | 1-2 oraciones sobre el período. |

## Tema

`{ "id": "guerra", "nombre": "Guerra" }`. Ids: `guerra`, `politica`, `cultura`, `ciencia`, `desastres`, `pueblos-originarios`, `economia`, `derechos`.

## Evento

```json
{
  "id": "1879-combate-naval-iquique",
  "titulo": "Combate Naval de Iquique",
  "fecha": "1879-05-21",
  "fechaAproximada": false,
  "fechaTexto": "21 de mayo de 1879",
  "periodoId": "05",
  "temas": ["guerra"],
  "importancia": 3,
  "lugar": "Iquique",
  "resumenNino": "…",
  "resumen": "…",
  "detalle": "Primer párrafo…\n\nSegundo párrafo…",
  "personajes": ["Arturo Prat", "Miguel Grau"],
  "imagen": {
    "archivo": "Nombre_exacto_en_Commons.jpg",
    "autor": "Thomas Somerscales",
    "licencia": "Dominio público",
    "urlPagina": "https://commons.wikimedia.org/wiki/File:Nombre_exacto_en_Commons.jpg",
    "pieDeFoto": "…"
  },
  "fuentes": ["https://www.memoriachilena.gob.cl/…"]
}
```

| Campo | Oblig. | Regla |
|---|---|---|
| `id` | sí | Único en todo el proyecto; minúsculas sin tildes, números y guiones. Formato `<año>-<nombre-corto>`; a.C.: `ac<año>-<nombre-corto>`. |
| `titulo` | sí | Corto (≤ 80 caracteres). |
| `fecha` | sí | `AAAA`, `AAAA-MM` o `AAAA-MM-DD`: solo la precisión que se conoce. a.C. = año negativo y solo año (`"-5000"`). |
| `fechaFin` | no | Mismo formato; fin de un proceso (ej. una guerra). Posterior a `fecha`. |
| `fechaAproximada` | sí | `true` si la fecha es incierta: entonces `fechaTexto` lleva "c.". Siempre `true` en fechas a.C. |
| `fechaTexto` | sí | Como se lee: `"21 de mayo de 1879"`, `"c. 1470"`, `"1879-1884"`. |
| `periodoId` | sí | Id de `periodos.json`, igual al prefijo del archivo. |
| `temas` | sí | Uno o más ids de `temas.json`. |
| `importancia` | sí | `3` hito (siempre visible), `2` importante, `1` complementario (solo con zoom cercano). |
| `lugar` | sí | Lugar principal (`"Iquique"`, `"Chile"`). |
| `resumenNino` | sí | 1-2 oraciones, vocabulario simple, sin fechas complejas. |
| `resumen` | sí | 3-4 oraciones para público general. |
| `detalle` | sí | 1-3 párrafos separados por una línea en blanco (`\n\n`). |
| `personajes` | sí | Lista de nombres; puede ir vacía. Quien aparece en 2 o más eventos tiene ficha (`#personaje/<nombre>`), que reúne los eventos donde se lo nombra: debe figurar en cada evento cuyo texto lo nombra con su nombre completo (`npm test` avisa si falta). |
| `imagen` | sí | Ver la tabla siguiente. |
| `fuentes` | sí | 1 o más URL `https`. Preferir Memoria Chilena, BCN, Museo Histórico Nacional, Archivo Nacional o académicas; Wikipedia ES solo como apoyo. |
| `pendienteVerificacion` | no | `true` = el evento no se muestra en la app (reemplaza al comentario `// pendiente de verificación`). |

### Imagen (Wikimedia Commons)

| Campo | Regla |
|---|---|
| `archivo` | Nombre exacto en Commons, sin `File:`, con extensión. |
| `autor` | Como figura en Commons (`"Desconocido"` si así aparece). |
| `licencia` | `Dominio público`, `CC0 1.0`, `CC BY <versión>` o `CC BY-SA <versión>` (ej. `CC BY-SA 4.0`). Otras no se aceptan. |
| `urlPagina` | `https://commons.wikimedia.org/wiki/File:<archivo>`. |
| `pieDeFoto` | Qué muestra la imagen (y su fecha, si se conoce). |

La app la carga desde `https://commons.wikimedia.org/wiki/Special:FilePath/<archivo>?width=800`, muestra siempre autor, licencia y enlace a Commons, y si falla usa `public/placeholders/periodo-NN.svg`.

**Medidas de las imágenes (`imagenes-medidas.json`, opcional).** `{ "<archivo>": [ancho, alto] }`, en píxeles del original en Commons. Las escribe `npm run medir-imagenes` (la API de Commons, de a 50); no se editan a mano. Con ellas, el encabezado de cada evento reserva el espacio exacto de la obra (sin saltos al cargar), no la amplía más de 1,5 veces su original, decide si va como retrato y ofrece «Ver más grande» desde 1280 px. Sin la medida, la obra usa una proporción de 3:2. `npm test` avisa si a una imagen en uso le falta su medida o si sobra alguna: tras cambiar o agregar una imagen, ejecutar `npm run medir-imagenes`.

## Historias guiadas, grupos, «¿Sabías que?», «Lo que se discute», glosario y títulos cortos (opcionales)

No agregan hechos nuevos: solo ordenan o citan los eventos que ya existen. La excepción es el glosario, que explica palabras y por eso lleva su propia fuente.

| Archivo | Contenido | Reglas |
|---|---|---|
| `recorridos.json` | Historias guiadas: `{ "id", "titulo", "descripcion", "eventos": [ids] }`. `#historia/<id>` es su presentación (duración y pasos sobre la silueta), `#historia/<id>/<paso>` cada paso y `#historia/<id>/fin` el cierre (lo recorrido, el repaso y otras historias). La de id `esencial` es la que propone «Empieza aquí» en la portada. | Al menos 3 pasos, en orden cronológico, con eventos que existen y se muestran. La descripción no puede afirmar nada que no digan esos eventos. |
| `grupos.json` | Eventos de una misma fecha que la línea de tiempo muestra en una sola tarjeta (`#grupo/<id>`): `{ "id", "titulo", "miembros" (plural, ej. "pueblos"), "descripcion", "eventos": [ids] }`. Si sus eventos tienen ubicación, la portada del grupo los muestra en un mapa: una llave por zona (con las latitudes de sus regiones actuales completas) o un punto por lugar, con el título sin «Pueblo». | Al menos 2 eventos, todos con la misma `fecha`; un evento no puede estar en dos grupos. El orden de `eventos` es el de la lista (ej. de norte a sur). |
| `sabias-que.json` | `{ "<id del evento>": "<oración>" }`: una oración del `detalle` que se muestra como «¿Sabías que…?» en los niveles Para niños y General. | La oración debe estar copiada textualmente del `detalle` y entenderse sola (sin «él», «ese año» ni «horas más tarde»). No se usa en temas sensibles, porque una ficha de curiosidades no corresponde ahí: guerras de la Conquista y de la Araucanía, guerras del período 05 (incluida la del Pacífico), todo el período 08 (dictadura), matanzas y estallido social. `npm test` lo comprueba. |
| `se-discute.json` | `{ "<id del evento>": "<oración>" }`: una oración del `detalle` que dice que hay distintas interpretaciones o debate; se muestra como «Lo que se discute» en Para niños y General (en Detallado ya está en el texto). | Copiada textualmente del `detalle`. `npm test` lo comprueba. |
| `glosario.json` | Lista de `{ "id", "termino", "formas"? (otras maneras de escribirla, como el plural), "definicion", "fuente"? (URL), "deTexto"? ({ "evento", "frase" }), "eventos"? }`. Cada evento muestra en «Palabras para entender» las que aparecen en sus textos, y `#glosario` las reúne todas, con sus eventos. | Cada palabra lleva una fuente (https) o sale de una oración copiada de los textos de un evento (`deTexto`), y debe aparecer en algún evento. Si en otros textos tiene otro sentido, `eventos` limita dónde vale. Todas esperan revisión humana: `npm run docs` las lista en `docs/REVISION_PENDIENTE.md`. |
| `preguntas.json` | `{ "<id del evento>": [{ "pregunta", "correcta", "otras": [dos], "frase"?, "fraseNino"? }] }`: preguntas de repaso escritas a mano para los temas sensibles y los pueblos originarios, que las preguntas automáticas no tocan. `frase` sale del `resumen` (se usa en General y Detallado) o del `detalle` (solo Detallado); `fraseNino`, del `resumenNino` (Para niños). Esa oración es la respuesta que se muestra. Viaja con el repaso, no en la carga inicial. | Cada frase copiada textualmente. Las opciones van sin cifras, y las palabras de la respuesta correcta (comparando sus 5 primeras letras) deben estar en la pregunta o en sus frases. Nada sobre cifras, muertes ni quién ganó. Todas esperan revisión humana: `npm run docs` las lista en `docs/REVISION_PENDIENTE.md`. `npm test` lo comprueba. |
| `titulos-cortos.json` | `{ "<id del evento>": "<título corto>" }`: lo que muestra la lámina de la línea de tiempo cuando el título completo no cabe en sus líneas. El detalle, el buscador y el nombre accesible de la lámina usan siempre el completo. | Hasta 42 caracteres y más corto que el título. Sin datos nuevos: cada palabra de 4 letras o más (comparando sus 6 primeras) debe estar en el título o en el `resumen`. `npm test` lo comprueba. |

## Mapa: lugares y ubicaciones

El mapa (`#mapa`) ubica cada evento según su campo `lugar`, sin agregar información. Las formas de las 16 regiones salen de Natural Earth (dominio público) con `node scripts/generar-mapa.mjs <geojson>`, que escribe `src/chile-regiones.json` y la silueta de la portada; los límites son los de las regiones actuales.

| Archivo | Contenido | Reglas |
|---|---|---|
| `lugares.json` | `regiones` (las 16, de norte a sur: `codigo`, `nombre`, `corto`); `lugares` (`id`, `nombre`, `region`, `lat`, `lon`, `wikidata` y, si el punto representa un sitio o una zona, `aproximado: true` y una `nota` que lo explica); `zonas` (`id`, `nombre`, `regiones`): áreas sin alfiler que cuentan en sus regiones. Lugares y zonas pueden llevar `en`, la frase con su artículo para los conectores de las historias («en el estrecho de Magallanes», «junto al río Mataquito»; sin `en`, «en {nombre}»), y un lugar, `corto`, el nombre para el repaso («Valparaíso»). | Coordenadas tomadas del ítem de Wikidata indicado (CC0). Los lugares aproximados se listan en `docs/REVISION_PENDIENTE.md` (`npm run docs`). |
| `ubicaciones.json` | `{ "<id del evento>": ["<lugar o zona>", …] }`; también `"chile"` (alcance nacional) y `"fuera:<País>"` (ocurrido en todo o en parte en otro país). | Cada evento visible tiene al menos una ubicación, y cada una existe. Una zona se usa cuando el `lugar` nombra un área (ej. «Del río Choapa a Chiloé»); sus regiones salen del texto del evento. |

## Validación

- `npm test`: **errores** (bloquean: campos faltantes, ids repetidos, fechas inválidas, temas o licencias no permitidos, sin fuentes) y **avisos** (revisar: largo de los textos, fechas fuera del período, solo Wikipedia como fuente).
- `npm run verificar-imagenes`: consulta la API de Commons y lista solo las imágenes que no existen, cambiaron de nombre, tienen otra licencia o cuya miniatura Commons no genera. Con `-- --descargar` también descarga cada miniatura (lento: Wikimedia limita las descargas por IP).
