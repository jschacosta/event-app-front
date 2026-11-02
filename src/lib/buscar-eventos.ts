// Buscador de eventos con Fuse.js, la misma librería que usa Rio Diferente.
// Tolera errores de tipeo ("sanba", "ipanma") y no le importan las tildes.
// Igual que en Rio Diferente, una coincidencia literal en el nombre, lugar o barrio
// siempre va antes que las aproximadas.
import Fuse from 'fuse.js';

import type { Evento } from '@/lib/api';
import { nombresGenero } from '@/lib/generos';

const normalizar = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

type Indexado = Evento & { _generos: string };

export function crearBuscador(eventos: Evento[]) {
  const datos: Indexado[] = eventos.map((e) => ({ ...e, _generos: e.generos.map(nombresGenero).join(' ') }));
  const fuse = new Fuse(datos, {
    keys: [
      { name: 'titulo', weight: 2 },
      { name: 'lugar', weight: 1.5 },
      { name: 'barrio', weight: 1.5 },
      { name: '_generos', weight: 1.2 },
      { name: 'descripcion', weight: 0.5 },
    ],
    threshold: 0.3,
    ignoreLocation: true,
    ignoreDiacritics: true,
    minMatchCharLength: 2,
  });

  return (consulta: string): Evento[] => {
    const q = normalizar(consulta);
    if (q.length < 2) return [];
    const exactos = datos.filter((e) =>
      [e.titulo, e.lugar, e.barrio, e._generos].some((campo) => normalizar(campo).includes(q)),
    );
    const vistos = new Set(exactos.map((e) => e.id));
    const aproximados = fuse.search(consulta).map((r) => r.item).filter((e) => !vistos.has(e.id));
    return [...exactos, ...aproximados];
  };
}
