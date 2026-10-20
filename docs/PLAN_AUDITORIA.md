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
