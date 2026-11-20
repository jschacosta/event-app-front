// Últimos mensajes de cada sala vista: al volver a entrar se ven al instante mientras llega lo nuevo
// (como Instagram o WhatsApp). Quedan también en el teléfono: sin señal el chat se puede leer.
// Solo las últimas salas y los últimos mensajes de cada una, para no llenar la memoria.
import type { MensajeChat } from '@/lib/api';
import { borrarDelTelefono, guardarEnTelefono, leerDelTelefono } from '@/lib/disco';

const historiales = new Map<string, MensajeChat[]>();
const MAX_SALAS = 20;
const MAX_MENSAJES = 60;
const ARCHIVO = 'chat-historial';

leerDelTelefono<[string, MensajeChat[]][]>(ARCHIVO).then((filas) => {
  for (const [k, m] of filas ?? []) if (!historiales.has(k)) historiales.set(k, m);
});

export const historialDe = (clave: string) => historiales.get(clave);

export function guardarHistorial(clave: string, mensajes: MensajeChat[]) {
  historiales.delete(clave);
  historiales.set(clave, mensajes.filter((m) => !m.pendiente).slice(-MAX_MENSAJES));
  if (historiales.size > MAX_SALAS) historiales.delete(historiales.keys().next().value as string);
  guardarEnTelefono(ARCHIVO, () => [...historiales]);
}

// Al cerrar sesión: los mensajes son de la cuenta, no del teléfono.
export function olvidarHistoriales() {
  historiales.clear();
  borrarDelTelefono(ARCHIVO);
}
