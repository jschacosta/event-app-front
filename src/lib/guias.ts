// Guías de Bora: hilos de la ciudad escritos por la cuenta oficial, en 5 idiomas (ver back: guiasRoutes.js).
import type { HiloResumen } from '@/components/opiniones';
import { api } from '@/lib/api';

export type TemaGuia = 'seguridad' | 'transporte' | 'entradas' | 'ropa' | 'plata' | 'samba' | 'funk' | 'barrios' | 'fiestas';
export const IDIOMAS_GUIA = ['es', 'en', 'pt', 'fr', 'de'] as const;
export type IdiomaGuia = (typeof IDIOMAS_GUIA)[number];

export type GuiaResumen = {
  id: string; clave: string; tema: TemaGuia; titulo: string; slug: string; resumen: string;
  puntaje: number; respuestas: number; miVoto: number; actualizada: string;
};

export type EventoGuia = { id: string; titulo: string; imagen: string | null; inicio: string; fin: string; lugar: string | null; barrio: string | null; generos: string[] };

export type Guia = {
  guia: {
    id: string; clave: string; tema: TemaGuia; barrio: string | null; generos: string[];
    titulo: string; resumen: string; cuerpo: string; fuentes: { titulo: string; url: string }[];
    creada: string; actualizada: string;
  };
  idioma: IdiomaGuia;
  alternos: Partial<Record<IdiomaGuia, string>>;
  hilo: HiloResumen;
  eventos: EventoGuia[];
};

export const idiomaGuia = (idioma: string): IdiomaGuia => ((IDIOMAS_GUIA as readonly string[]).includes(idioma) ? idioma as IdiomaGuia : 'en');

export function cargarGuias(ciudad: string, idioma: string, token: string | null) {
  return api<{ guias: GuiaResumen[]; temas: TemaGuia[] }>(`/guias?ciudad=${ciudad}&idioma=${idiomaGuia(idioma)}`, { token });
}

export function cargarGuia(ciudad: string, slug: string, token: string | null) {
  return api<Guia>(`/guias/${ciudad}/${encodeURIComponent(slug)}`, { token });
}

// El cuerpo viene como texto simple: párrafos separados por una línea en blanco,
// viñetas que empiezan con "- " y subtítulos con "## ".
export type Bloque = { tipo: 'titulo'; texto: string } | { tipo: 'parrafo'; texto: string } | { tipo: 'lista'; items: string[] };
export function bloquesDe(cuerpo: string): Bloque[] {
  const bloques: Bloque[] = [];
  for (const parte of cuerpo.split(/\n\s*\n/)) {
    const lineas = parte.split('\n').map((l) => l.trim()).filter(Boolean);
    let parrafo: string[] = [];
    let lista: string[] = [];
    const cerrar = () => {
      if (parrafo.length) bloques.push({ tipo: 'parrafo', texto: parrafo.join(' ') });
      if (lista.length) bloques.push({ tipo: 'lista', items: lista });
      parrafo = [];
      lista = [];
    };
    for (const l of lineas) {
      if (l.startsWith('## ')) { cerrar(); bloques.push({ tipo: 'titulo', texto: l.slice(3) }); }
      else if (l.startsWith('- ')) { if (parrafo.length) { bloques.push({ tipo: 'parrafo', texto: parrafo.join(' ') }); parrafo = []; } lista.push(l.slice(2)); }
      else { if (lista.length) { bloques.push({ tipo: 'lista', items: lista }); lista = []; } parrafo.push(l); }
    }
    cerrar();
  }
  return bloques;
}
