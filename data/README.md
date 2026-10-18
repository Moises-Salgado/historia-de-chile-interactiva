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
| `personajes` | sí | Lista de nombres; puede ir vacía. |
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

## Validación

- `npm test`: **errores** (bloquean: campos faltantes, ids repetidos, fechas inválidas, temas o licencias no permitidos, sin fuentes) y **avisos** (revisar: largo de los textos, fechas fuera del período, solo Wikipedia como fuente).
- `npm run verificar-imagenes`: consulta Commons y lista solo las imágenes que no existen, cambiaron de nombre, tienen otra licencia o no cargan.
