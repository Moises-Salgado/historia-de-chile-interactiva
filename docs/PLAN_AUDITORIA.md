# Plan de arreglos de la auditoría externa

Pedido del dueño (2026-10-19): «empieza con los arreglos técnicos y los visuales, animaciones y todo», a partir de [`AUDITORIA_EXTERNA.md`](AUDITORIA_EXTERNA.md). Valen las reglas de peso, movimiento y trato igual de [`PLAN_MVP.md`](PLAN_MVP.md). Cada fase se cierra con un commit `auditoria N: …`. Publicar, solo con permiso.

## Fases

- **A1 · Celular y tablet.**
  - La portada (3.1) y la ficha del evento (3.2).
  - «Texto grande» y el modo clase en la cabecera (3.3, Q-19).
  - Las pantallas bajas (3.5) y la cartela en 320 px (Q-21).
  - Las filas que se desplazan de lado (Q-02) y los clics rápidos (Q-15).
- **A2 · Navegación.**
  - Atrás y «Volver» (3.4).
  - La pestaña marcada (3.9).
  - Las rutas inválidas y su aviso (Q-13, Q-14).
  - Los enlaces de período (Q-23).
- **A3 · Buscador y línea de tiempo.**
  - Los puntos 3.6 y 3.7.
  - Los nombres de las franjas (Q-22).
  - La fecha de Monte Verde (Q-18).
- **A4 · Mapa.** Los toques (3.8) y el tamaño, el filtro y los créditos (V-07).
- **A5 · Encabezado del evento e imágenes.**
  - V-02, V-19, V-18 y V-11.
  - Las láminas que no son de época (V-03), cada una verificada con `npm run verificar-imagenes`.
- **A6 · Movimiento.** V-09 y V-10.
- **A7 · Páginas de texto y portada.** V-06, V-10, V-17, V-22 y V-23.
- **A8 · Contenido puntual.**
  - El punto 3.10 y los textos de la sección 4 (Q-16, Q-24, Q-26, Q-27, Q-28).
  - El repaso en «Para niños».
- **A9 · Verificación.** La matriz de capturas con los casos nuevos, el presupuesto y los documentos.

Fuera de este plan quedan:
- **Lo que necesita redacción con fuentes y revisión humana** (sección 6 de la auditoría): aprendizaje activo, conectores causales, el nivel «Para niños» completo, «Lo que se discute» con posturas y los huecos de contenido.
- **Las decisiones del dueño** (sección 11).

## Avance

- **A1 (hecha).**
  - **Portada:** la grilla de la portada tiene una columna que no crece con su contenido, y el menú de regiones se achica. La animación de entrada aparece en cuanto asoma la sección.
  - **Ficha del evento:** se queda fija solo con dos columnas.
  - **Cabecera con «Texto grande» y en clase:**
    - hasta 75em, estrella y «Línea» en vez de la marca y «Línea de tiempo»;
    - en el celular, tres filas, sin ocultar nunca las secciones;
    - en el modo clase en un celular, sin «Pantalla completa».
  - **Pantallas bajas:** la página mide la pantalla, y la cabecera y la barra van en una fila. El alto mínimo del contenido es «20rem o el 45 % de la pantalla».
  - **Filas que se desplazan de lado:** llevan un degradado en el borde con más contenido (`marcarDesborde`). En pantallas anchas, los chips del buscador van en varias filas.
  - **Cartela en el celular:** el título se corta en «…» a las dos líneas.
  - **Clics rápidos:** `conTransicion` captura `ready`.
- **A2 (hecha).**
  - **Historial:** cada vista agrega su entrada, y Atrás retrocede de a un paso. «Volver» sale de una vez: de un evento, adonde empezó la cadena; de un paso, a la presentación de la historia; de lo demás, un paso atrás.
  - **Pestañas:** en las páginas y las fichas de personaje no queda ninguna marcada.
  - **Rutas:**
    - toda ruta inválida avisa y corrige la dirección;
    - las mayúsculas se aceptan («#Linea»);
    - el aviso se retira al navegar.
  - **Períodos:** cada uno tiene su dirección, `#linea/NN`.
- **A3 (hecha).**
  - **Buscador:**
    - sin apóstrofos («ohiggins»), con plurales («mapuches»), sinónimos («maremoto»), palabras vacías («del»), años de dos cifras («del 60») y números con punto de miles («12.500»);
    - busca también en la región y en el resumen, con un extracto;
    - ordena primero lo que coincide en el título;
    - la cuenta es la misma que la de la línea;
    - Escape cierra el panel sin borrar la búsqueda.
  - **Detalle con filtro:** «Anterior» y «Siguiente» dicen que recorren la búsqueda, y «Ver todos los eventos» quita el filtro.
  - **Línea de tiempo:**
    - la marca «+N eventos» también al final;
    - al volver de un evento sin lámina se acerca lo justo para mostrarlo;
    - el eje es una «Escala por eventos»: el año de cada evento en su punto, con leyenda y sin décadas interpoladas;
    - cartela de museo (fecha, título y «Leer»);
    - grupos como pila de láminas;
    - en el celular, láminas de 14rem y tramos vacíos más cortos;
    - Monte Verde con una sola fecha y franjas con nombre accesible.
  - **Teclado:** con las flechas el foco pasa al título nuevo, y Av Pág desplaza el texto del evento.
- **A4 (hecha).**
  - **Mapa en escritorio:** es un rollo de norte a sur, de al menos 62rem: en 1366 px, 339 × 1116 en vez de unos 187 × 616.
  - **Toques:** los lugares responden solo dentro de la región elegida, así el primer toque es para la región.
  - **Filtro:** clases fijas de cantidad, achurado donde no hay eventos y una leyenda con cuántos eventos hay en cuántas regiones.
  - **Recuadro:** la región elegida aparece ampliada en el panel, con sus lugares rotulados (sin animar el mapa).
  - **Créditos y rótulos:** los créditos van al pie; Copiapó y Juan Fernández ya no chocan con otros rótulos; en colores forzados, los rótulos van sin halo.
- **A5 (hecha).**
  - **Encabezado «Lámina en el muro»:**
    - la obra se ve entera y grande, sin marco dentro del marco, con su proporción;
    - el alto se mide contra el detalle (`cqh`);
    - en escritorio, en 1366 × 768, Iquique pasa de 413 × 278 a 650 × 437 y la Araucanía, de 181 × 278 a 284 × 437;
    - los retratos van en su propia columna;
    - en el celular, la obra va primero y a sangre;
    - ninguna se amplía más de 1,5 veces su original.
  - **Medidas de las imágenes:** las mide `npm run medir-imagenes` y quedan en `data/imagenes-medidas.json`, que valida `npm test`. Solo 12 originales miden menos de 500 px.
  - **«Ver más grande»:** con originales de 1280 px o más, la obra pasa a una columna en la misma página; el mismo botón o Escape la devuelven.
  - **Modo clase:** el encabezado del evento va claro.
  - **«Para niños»:**
    - sin los módulos escritos para adultos («¿Sabías que…?», glosario, «Sobre el período», cita, compartir);
    - «hace N años» como línea propia, «Escuchar» grande y «Dónde y cuándo».
  - **Imágenes reemplazadas:**
    - Maipú, por el mismo Rugendas sin marco ni reflejo;
    - la crisis de 1982, por una foto de época (olla común, La Victoria, 1984) en vez de un gráfico de 2024.
- **A6 (hecha).** Sigue la propuesta del agente de animación: un solo protagonista por acción y, lo demás, «a través del fondo», en 120 + 180 ms.
  - **Abrir y cerrar un evento:** sin doble exposición. La lámina parte con la miniatura ya cargada, así crece de verdad, y se cambia por la grande al terminar.
  - **Pestañas:** la marca se nombra solo si la pestaña cambia, y los rótulos quedan encima (sin píldora en blanco).
  - **Paso de historia:**
    - espera la imagen nueva hasta 150 ms y precarga la anterior y la siguiente;
    - el fondo del cambio es el de la banda oscura (sin franja clara);
    - la ficha no viaja, y lo que viaja tiene que verse entero.
  - **Clics rápidos:** un turno impide que una transición interrumpida borre los nombres de la siguiente, y un doble clic en la misma vista solo la enfoca.
  - **Cambio de sección:** la nueva entra cuando la vieja ya se fue.
  - **Llegada a la portada:** 400 ms con escalones de 30 ms, y no se repite al volver a la portada.
  - **Presupuesto:** la carga inicial pesa 116,33 KB (tope 141,63). El margen del mapa sube de 1 a 2 KB por el recuadro, la leyenda y las clases de la A4 (23,73 KB).
