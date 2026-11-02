// Fiestas que se repiten (todas las noches, todos los viernes…): en la agenda se muestran
// una sola vez, en su próxima fecha, con cuántas fechas tiene. La lista llega ordenada por fecha.
import type { Evento } from '@/lib/api';

export type Grupo = { evento: Evento; repeticiones: number };

export function agruparSeries(lista: Evento[]): Grupo[] {
  const grupos: Grupo[] = [];
  const porSerie = new Map<string, Grupo>();
  for (const evento of lista) {
    const g = evento.serie ? porSerie.get(evento.serie) : undefined;
    if (g) {
      g.repeticiones++;
      continue;
    }
    const nuevo = { evento, repeticiones: 1 };
    grupos.push(nuevo);
    if (evento.serie) porSerie.set(evento.serie, nuevo);
  }
  return grupos;
}
