// Arranque de la app y router por hash (#evento/<id>). La interfaz completa llega en la fase 4.
import './styles.css';
import { cargarDatos } from './datos.js';

const { periodos, eventos } = cargarDatos();

document.querySelector('#app').innerHTML = `
  <main class="contenedor">
    <h1>Historia de Chile Interactiva</h1>
    <p>En construcción: ${eventos.length} eventos en ${periodos.length} períodos.</p>
  </main>`;
