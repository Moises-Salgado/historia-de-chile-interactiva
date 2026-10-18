import { defineConfig } from 'vite';

// Base relativa: el build funciona igual en GitHub Pages (subcarpeta /<repo>/), Netlify o Vercel,
// porque la navegación usa rutas con hash (#evento/<id>).
export default defineConfig({
  base: './',
});
