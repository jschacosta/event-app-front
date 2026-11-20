// Recordatorio de cada evento marcado: cuándo avisar ("antes" = 2 h antes, el día antes, las dos o nunca).
// La elección queda en el teléfono. El interruptor general está en Ajustes → Notificaciones
// (avisos.recordatorio de la cuenta): apagado, no se programa ninguno.
// Los recordatorios se vuelven a programar cada vez que se descargan "Mis planes" (lib/planes.ts): así
// siguen ahí después de reinstalar, en otro teléfono o si se marcó "Voy" desde otro lado.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { Evento } from '@/lib/api';
import { guardarEnTelefono, leerDelTelefono } from '@/lib/disco';
import { cancelarRecordatorio, cancelarRecordatorios, eventosConRecordatorio, programarRecordatorio, type ModoRecordatorio } from '@/lib/notificaciones';

export type { ModoRecordatorio };
const ARCHIVO = 'recordatorios';
const POR_DEFECTO: ModoRecordatorio = 'antes';

let modos: Record<string, ModoRecordatorio> = {};
let activos = true; // el interruptor de Ajustes
let ultimaLista: Evento[] | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

const listo = Platform.OS === 'web' ? Promise.resolve() : leerDelTelefono<Record<string, ModoRecordatorio>>(ARCHIVO).then((m) => {
  if (m) modos = { ...m, ...modos };
  avisar();
});

export const modoDe = (id: string): ModoRecordatorio => modos[id] ?? POR_DEFECTO;

export function useModoRecordatorio(id: string) {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => modoDe(id),
  );
}

export function useRecordatoriosActivos() {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => activos,
  );
}

// Lo fija SesionProvider con la preferencia de la cuenta.
export function fijarRecordatoriosActivos(valor: boolean) {
  if (valor === activos) return;
  activos = valor;
  avisar();
  if (!valor) cancelarRecordatorios();
  else if (ultimaLista) sincronizarRecordatorios(ultimaLista);
}

const marcado = (e: Evento) => Boolean(e.miAsistencia);

// Al marcar o desmarcar en la ficha. `preguntar`: pide permiso de notificaciones si hace falta.
export function recordatorioAlMarcar(evento: Evento, estado: string | null) {
  if (!estado || !activos) {
    cancelarRecordatorio(evento.id);
    return;
  }
  programarRecordatorio(evento, modoDe(evento.id), { preguntar: true });
}

export async function cambiarModo(evento: Evento, modo: ModoRecordatorio) {
  modos = { ...modos, [evento.id]: modo };
  avisar();
  guardarEnTelefono(ARCHIVO, () => modos);
  if (activos) await programarRecordatorio(evento, modo, { preguntar: true });
}

// Con la lista completa de planes: programa los que faltan y cancela los de eventos desmarcados.
export async function sincronizarRecordatorios(planes: Evento[]) {
  ultimaLista = planes;
  if (!activos || Platform.OS === 'web') return;
  await listo;
  const ids = new Set(planes.filter(marcado).map((e) => e.id));
  for (const id of await eventosConRecordatorio()) if (!ids.has(id)) cancelarRecordatorio(id);
  for (const e of planes) {
    if (marcado(e)) await programarRecordatorio(e, modoDe(e.id), { preguntar: false });
  }
  // Las elecciones de eventos que ya no están se olvidan (el archivo no crece para siempre).
  const quedan = Object.fromEntries(Object.entries(modos).filter(([id]) => ids.has(id)));
  if (Object.keys(quedan).length !== Object.keys(modos).length) {
    modos = quedan;
    guardarEnTelefono(ARCHIVO, () => modos);
  }
}
