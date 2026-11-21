// Páginas para Google: corre después de `expo export -p web` (ver vercel.json).
// La web de Bora es una sola página que se arma con JavaScript; para que los buscadores encuentren
// cada guía, aquí se escribe un HTML por guía y por idioma (dist/<ciudad>/hilos/<slug>.html) con su
// título, descripción, enlaces a los otros idiomas, datos estructurados y el texto completo dentro de
// #root (la app lo reemplaza al cargar). También se escriben sitemap.xml y robots.txt.
// Si el servidor no responde, la publicación sigue igual: solo quedan las páginas de siempre.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const DIST = process.argv[2] ?? 'dist';
const SITIO = (process.env.SITIO_URL ?? 'https://boraspot.vercel.app').replace(/\/$/, '');
const API = (process.env.EXPO_PUBLIC_API_URL ?? 'https://bora-app.up.railway.app').replace(/\/$/, '');
const IDIOMAS = ['es', 'en', 'pt', 'fr', 'de'];
const NOMBRE_CIUDAD = { rio: 'Rio de Janeiro', santiago: 'Santiago', bogota: 'Bogotá', saopaulo: 'São Paulo' };

// Ícono de Bora en la pestaña (SVG nítido, con el .ico de respaldo) y al guardar la web en el iPhone.
// Los archivos vienen de public/marca/ (los mismos de bora-web).
const ICONOS = [
  '<link rel="icon" href="/marca/icono.svg" type="image/svg+xml" />',
  '<link rel="apple-touch-icon" href="/marca/icono-180.png" />',
  '<meta name="theme-color" content="#64209A" />',
].join('');
const original = readFileSync(join(DIST, 'index.html'), 'utf8');
const plantilla = original.includes('/marca/icono.svg') ? original : original.replace('<link rel="icon" href="/favicon.ico"/>', `<link rel="icon" href="/favicon.ico" sizes="48x48"/>${ICONOS}`);
writeFileSync(join(DIST, 'index.html'), plantilla);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const urlGuia = (ciudad, slug) => `${SITIO}/${ciudad}/hilos/${slug}`;

// El cuerpo de la guía (párrafos, viñetas "- " y subtítulos "## ") a HTML simple.
function cuerpoHtml(cuerpo) {
  return cuerpo.split(/\n\s*\n/).map((parte) => {
    const lineas = parte.split('\n').map((l) => l.trim()).filter(Boolean);
    let html = '';
    let lista = [];
    const cerrarLista = () => { if (lista.length) html += `<ul>${lista.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`; lista = []; };
    let parrafo = [];
    const cerrarParrafo = () => { if (parrafo.length) html += `<p>${esc(parrafo.join(' '))}</p>`; parrafo = []; };
    for (const l of lineas) {
      if (l.startsWith('## ')) { cerrarParrafo(); cerrarLista(); html += `<h2>${esc(l.slice(3))}</h2>`; }
      else if (l.startsWith('- ')) { cerrarParrafo(); lista.push(l.slice(2)); }
      else { cerrarLista(); parrafo.push(l); }
    }
    cerrarParrafo();
    cerrarLista();
    return html;
  }).join('\n');
}

// Cambia lo de la cabeza (título, descripción, idioma) y mete el contenido en #root.
function pagina({ idioma, titulo, descripcion, canonica, alternos = [], jsonLd, contenido }) {
  const cabeza = [
    `<title>${esc(titulo)}</title>`,
    `<meta name="description" content="${esc(descripcion)}" />`,
    `<link rel="canonical" href="${canonica}" />`,
    ...alternos.map(([l, u]) => `<link rel="alternate" hreflang="${l}" href="${u}" />`),
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="Bora" />`,
    `<meta property="og:title" content="${esc(titulo)}" />`,
    `<meta property="og:description" content="${esc(descripcion)}" />`,
    `<meta property="og:url" content="${canonica}" />`,
    `<meta property="og:image" content="${SITIO}/marca/icono-512.png" />`,
    `<meta name="twitter:card" content="summary" />`,
    jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ].join('\n    ');
  return plantilla
    .replace(/<html lang="[^"]*">/, `<html lang="${idioma}">`)
    .replace(/<title>[^<]*<\/title>/, cabeza)
    .replace('<div id="root"></div>', `<div id="root"><main style="max-width:720px;margin:0 auto;padding:24px 20px;font-family:system-ui,sans-serif;line-height:1.6">${contenido}</main></div>`);
}

function escribir(ruta, html) {
  const destino = join(DIST, ruta);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
}

let guias = [];
try {
  const r = await fetch(`${API}/api/guias/indice`, { signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  guias = (await r.json()).guias ?? [];
} catch (e) {
  console.warn(`[seo] No se pudieron leer las guías (${e.message}): se publican solo las páginas de siempre.`);
}

const urls = [{ loc: `${SITIO}/` }, { loc: `${SITIO}/hilos` }, { loc: `${SITIO}/mapa` }];
for (const g of guias) {
  const idiomas = IDIOMAS.filter((l) => g.textos?.[l]);
  const alternos = idiomas.map((l) => [l, urlGuia(g.ciudad, g.textos[l].slug)]);
  alternos.push(['x-default', urlGuia(g.ciudad, (g.textos.en ?? g.textos.es).slug)]);
  for (const l of idiomas) {
    const t = g.textos[l];
    const url = urlGuia(g.ciudad, t.slug);
    const ciudad = NOMBRE_CIUDAD[g.ciudad] ?? g.ciudad;
    escribir(`${g.ciudad}/hilos/${t.slug}.html`, pagina({
      idioma: l,
      titulo: `${t.titulo} · Bora ${ciudad}`,
      descripcion: t.resumen,
      canonica: url,
      alternos,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: t.titulo,
        description: t.resumen,
        inLanguage: l,
        datePublished: g.creada,
        dateModified: g.actualizada,
        author: { '@type': 'Organization', name: 'Bora', url: SITIO },
        publisher: { '@type': 'Organization', name: 'Bora', url: SITIO },
        mainEntityOfPage: url,
        about: { '@type': 'City', name: ciudad },
      },
      contenido: `<p><a href="/hilos">Bora · ${esc(ciudad)}</a></p><h1>${esc(t.titulo)}</h1><p><strong>${esc(t.resumen)}</strong></p>${cuerpoHtml(t.cuerpo)}`,
    }));
    urls.push({ loc: url, lastmod: g.actualizada, alternos });
  }
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}${(u.alternos ?? []).map(([l, h]) => `\n    <xhtml:link rel="alternate" hreflang="${l}" href="${h}" />`).join('')}
  </url>`).join('\n')}
</urlset>
`;
writeFileSync(join(DIST, 'sitemap.xml'), sitemap);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITIO}/sitemap.xml\n`);
console.log(`[seo] ${guias.length} guías → ${urls.length} direcciones en el sitemap`);
