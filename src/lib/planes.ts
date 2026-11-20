// "Mis planes": los eventos por venir que la persona marcó "voy", "tal vez" o "previa".
// Se descargan al abrir la app (no solo al entrar a Perfil) y quedan en el teléfono junto con las fichas
// completas de los próximos 7 días: en la fila de la disco, sin señal, todo abre igual.
import { useSyncExternalStore } from 'react';

import { api, type Evento } from '@/lib/api';
import { cuandoVuelvaLaConexion } from '@/lib/conexion';
import { borrarLista, escucharCambios, eventosDelTelefono, eventosGuardados, guardarEventos } from '@/lib/eventos-cache';
import { fijarRutas, pedir } from '@/lib/precarga';

const LISTA = 'todas'; // una sola lista, de todas las ciudades
const DIAS_CON_FICHA = 7;

let token: string | null = null;
let ultima = 0;
let enCurso: Promise<void> | null = null;
let instantanea: Evento[] | null = null;
const oyentes = new Set<() => void>();

function avisar() {
  const ahora = Date.now();
  const l = eventosGuardados(LISTA, 'planes');
  // Sin los que ya terminaron ni los que se desmarcaron (se quitan al volver a descargar).
  instantanea = l ? l.filter((e) => e.miAsistencia && new Date(e.fin).getTime() > ahora) : null;
  oyentes.forEach((f) => f());
}
escucharCambios(avisar);

export function usePlanes() {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => instantanea,
  );
}

// Fichas completas de los planes cercanos, de a una (no compiten con lo que se está mirando).
async function guardarFichas(eventos: Evento[]) {
  const limite = Date.now() + DIAS_CON_FICHA * 864e5;
  const cercanos = eventos.filter((e) => new Date(e.inicio).getTime() < limite);
  fijarRutas(cercanos.map((e) => `/events/${e.id}`));
  for (const e of cercanos) {
    await pedir(`/events/${e.id}`, token, 10 * 60_000).catch(() => {});
  }
}

// `forzar`: aunque se haya descargado hace poco (al marcar "voy" en un evento).
export function cargarPlanes(forzar = false) {
  if (!token) return Promise.resolve();
  if (enCurso) return enCurso;
  if (!forzar && Date.now() - ultima < 60_000) return Promise.resolve();
  const pedido = token;
  enCurso = api<{ eventos: Evento[] }>('/events/mios', { token: pedido })
    .then((r) => {
      if (pedido !== token) return;
      ultima = Date.now();
      guardarEventos(LISTA, r.eventos, 'planes');
      avisar();
      guardarFichas(r.eventos);
    })
    .catch(() => {})
    .finally(() => { enCurso = null; });
  return enCurso;
}

// La sesión la fija SesionProvider. Primero lo guardado en el teléfono, después lo nuevo.
export async function fijarSesionPlanes(nuevo: string | null) {
  if (nuevo === token) return;
  token = nuevo;
  ultima = 0;
  if (!nuevo) return;
  if (!eventosGuardados(LISTA, 'planes')) {
    const l = await eventosDelTelefono(LISTA, 'planes');
    if (l && !eventosGuardados(LISTA, 'planes')) guardarEventos(LISTA, l, 'planes', false);
  }
  avisar();
  cargarPlanes();
}

// Al cerrar sesión: los planes son de la cuenta.
export function olvidarPlanes() {
  token = null;
  ultima = 0;
  borrarLista(LISTA, 'planes');
  avisar();
}

cuandoVuelvaLaConexion(() => { cargarPlanes(true); });
