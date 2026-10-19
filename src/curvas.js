// Curvas de nivel de fondo, el motivo de la cordillera: un dibujo fijo en canvas, igual en cada visita
// (semilla fija), que se rehace solo si cambia el tamaño. No se anima; aparece con un fundido (styles.css).
const pendientes = new Set();
let cuadro = 0;
const observador = typeof ResizeObserver === 'function' ? new ResizeObserver((entradas) => entradas.forEach((e) => programar(e.target))) : null;

function programar(canvas) {
  pendientes.add(canvas);
  cuadro ||= requestAnimationFrame(() => {
    cuadro = 0;
    for (const c of pendientes) dibujar(c);
    pendientes.clear();
  });
}

function dibujar(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return; // oculto: se dibuja cuando aparezca
  const escala = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * escala);
  canvas.height = Math.round(height * escala);
  const ctx = canvas.getContext('2d');
  ctx.scale(escala, escala);
  let semilla = 7;
  const azar = () => (semilla = (semilla * 16807) % 2147483647) / 2147483647;
  const ondas = Array.from({ length: 4 }, () => ({ f: 0.004 + azar() * 0.012, a: 6 + azar() * 16, p: azar() * 6.28 }));
  const n = Math.max(8, Math.round(height / 22));
  const tenue = canvas.dataset.curvas === 'tenue'; // detrás de otro dibujo (la puerta del mapa)
  for (let i = 0; i <= n; i++) {
    const y0 = (i / n) * height;
    ctx.beginPath();
    for (let x = 0; x <= width + 6; x += 6) {
      const y = y0 + ondas.reduce((s, o, k) => s + Math.sin(x * o.f + o.p + i * 0.35 * (k + 1)) * o.a * (0.5 + 0.5 * Math.sin(i * 0.4 + k)), 0);
      if (x) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    // Cada cinco curvas, una «maestra» en cobre, como en las cartas topográficas.
    const maestra = i % 5 === 0;
    ctx.strokeStyle = maestra ? `rgb(232 168 116 / ${tenue ? 0.18 : 0.3})` : `rgb(237 243 241 / ${tenue ? 0.06 : 0.1})`;
    ctx.lineWidth = maestra ? 1.2 : 0.8;
    ctx.stroke();
  }
  canvas.classList.add('lista');
}

/** Dibuja curvas de nivel en `canvas` (que el CSS estira sobre su contenedor) y las rehace al cambiar de tamaño.
 * Con data-curvas="tenue" se dibujan más suaves. */
export function curvasDeNivel(canvas) {
  if (!canvas?.getContext) return;
  observador?.observe(canvas);
  programar(canvas);
}
