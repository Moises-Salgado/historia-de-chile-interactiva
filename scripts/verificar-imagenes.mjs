// Verifica en Wikimedia Commons todas las imágenes de /data y reporta solo las que fallan:
// archivo inexistente, nombre que redirige, licencia distinta o no permitida, o miniatura que no carga.
// Uso: node scripts/verificar-imagenes.mjs [carpeta]   (por defecto ./data). Sale con código 1 si hay fallas.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIR = resolve(process.argv[2] ?? 'data');
const API = 'https://commons.wikimedia.org/w/api.php';
const MINIATURA = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const ANCHO = 800;
const HEADERS = { 'User-Agent': 'HistoriaDeChileInteractiva/0.1 (sitio educativo; verificador de imagenes)' };
const LOTE = 50; // máximo de títulos por consulta a la API
const SIMULTANEAS = 4;

const imagenes = readdirSync(DIR)
  .filter((n) => /^\d{2}-[a-z0-9-]+\.json$/.test(n))
  .flatMap((n) => JSON.parse(readFileSync(join(DIR, n), 'utf8')).map((ev) => ({ ...ev.imagen, donde: `${n} [${ev.id}]` })))
  .filter((img) => typeof img.archivo === 'string' && img.archivo.trim());

const fallas = [];
const falla = (img, msg) => fallas.push(`${img.donde} ${img.archivo}: ${msg}`);

// Reintenta ante límite de peticiones (429) o errores del servidor.
async function pedir(url) {
  for (let intento = 1; ; intento++) {
    const res = await fetch(url, { headers: HEADERS });
    if ((res.status !== 429 && res.status < 500) || intento === 3) return res;
    await res.body?.cancel();
    await new Promise((listo) => setTimeout(listo, 1500 * intento));
  }
}

// Clasifica una licencia en familia ('pd', 'cc0', 'by', 'by-sa' o null si no está permitida) y versión.
function licencia(texto = '') {
  const t = texto.toLowerCase();
  const version = /\b(\d\.\d)\b/.exec(t)?.[1] ?? null;
  if (t.includes('cc0')) return { familia: 'cc0', version: null };
  if (/\b(?:nc|nd)\b/.test(t)) return { familia: null, version };
  if (/cc[ -]by[ -]sa/.test(t)) return { familia: 'by-sa', version };
  if (/cc[ -]by/.test(t)) return { familia: 'by', version };
  if (/public domain|dominio público|^pd\b|no restrictions/.test(t)) return { familia: 'pd', version: null };
  return { familia: null, version };
}

async function consultar(lote) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    prop: 'imageinfo',
    iiprop: 'extmetadata',
    iiextmetadatafilter: 'LicenseShortName',
    titles: lote.map((img) => `File:${img.archivo}`).join('|'),
  });
  const res = await pedir(`${API}?${params}`);
  if (!res.ok) throw new Error(`la API respondió HTTP ${res.status}`);
  const { query = {} } = await res.json();
  const normalizado = new Map((query.normalized ?? []).map((r) => [r.from, r.to]));
  const redirigido = new Map((query.redirects ?? []).map((r) => [r.from, r.to]));
  const paginas = new Map((query.pages ?? []).map((p) => [p.title, p]));

  for (const img of lote) {
    const pedido = `File:${img.archivo}`;
    const titulo = normalizado.get(pedido) ?? pedido;
    const final = redirigido.get(titulo) ?? titulo;
    const info = paginas.get(final)?.imageinfo?.[0];
    if (!info) {
      falla(img, 'no existe en Commons');
      continue;
    }
    if (final !== titulo) falla(img, `el archivo se renombró a "${final.slice(5)}": actualizar "archivo" y "urlPagina"`);
    const enCommons = info.extmetadata?.LicenseShortName?.value ?? '';
    const c = licencia(enCommons);
    const d = licencia(img.licencia);
    if (!c.familia) {
      falla(img, `licencia no permitida o desconocida en Commons: "${enCommons || 'sin dato'}"`);
    } else if (c.familia !== d.familia || (c.version && d.version && c.version !== d.version)) {
      falla(img, `licencia en Commons "${enCommons}" distinta de la de los datos "${img.licencia}"`);
    }
    img.existe = true;
  }
}

async function revisarMiniatura(img) {
  try {
    const res = await pedir(`${MINIATURA}${encodeURIComponent(img.archivo.replace(/ /g, '_'))}?width=${ANCHO}`);
    const tipo = res.headers.get('content-type') ?? '';
    await res.body?.cancel();
    if (!res.ok || !tipo.startsWith('image/')) falla(img, `la miniatura no carga (HTTP ${res.status} ${tipo})`);
  } catch (e) {
    falla(img, `la miniatura no carga (${e.cause?.code ?? e.message})`);
  }
}

async function enParalelo(lista, n, tarea) {
  const cola = [...lista];
  await Promise.all(Array.from({ length: n }, async () => {
    while (cola.length) await tarea(cola.shift());
  }));
}

console.log(`Revisando ${imagenes.length} imágenes en Wikimedia Commons…`);
try {
  for (let i = 0; i < imagenes.length; i += LOTE) await consultar(imagenes.slice(i, i + LOTE));
} catch (e) {
  console.error(`No se pudo consultar Commons: ${e.cause?.code ?? e.message}`);
  process.exit(2);
}
await enParalelo(imagenes.filter((img) => img.existe), SIMULTANEAS, revisarMiniatura);

if (fallas.length) {
  console.log(`FALLAS (${fallas.length}):\n${fallas.map((f) => `  - ${f}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('OK: todas las imágenes existen, tienen licencia permitida y su miniatura carga.');
}
