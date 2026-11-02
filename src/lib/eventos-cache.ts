// Última lista de eventos cargada por la Agenda, para que "Ver todos" de un día abra al instante
// sin volver a pedir los ~1.500 eventos de la ciudad al servidor.
import type { Evento } from '@/lib/api';

let ultima: { ciudad: string; eventos: Evento[] } | null = null;

export function guardarEventos(ciudad: string, eventos: Evento[]) {
  ultima = { ciudad, eventos };
}

export function eventosGuardados(ciudad: string) {
  return ultima?.ciudad === ciudad ? ultima.eventos : null;
}
