// Última lista de eventos de cada pantalla (agenda y canales), en memoria y en el teléfono.
// Así, al abrir la app o volver a una pestaña, los eventos se ven al instante y se actualizan por detrás,
// en vez de mostrar una pantalla vacía mientras llegan del servidor.
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import type { Evento } from '@/lib/api';

type Tipo = 'agenda' | 'canales';
// Una lista de más de 2 días ya no sirve ni para mostrar mientras carga.
const MAX_EDAD = 2 * 864e5;

const enMemoria = new Map<string, Evento[]>();
// La agenda pesa ~1 MB: se escribe al teléfono como mucho una vez por minuto (no en cada cambio de pestaña).
const ultimaEscritura = new Map<string, number>();
const clave = (tipo: Tipo, ciudad: string) => `${tipo}-${ciudad}`;
const archivo = (tipo: Tipo, ciudad: string) => new File(Paths.cache, `eventos-${clave(tipo, ciudad)}.json`);

export function guardarEventos(ciudad: string, eventos: Evento[], tipo: Tipo = 'agenda') {
  enMemoria.set(clave(tipo, ciudad), eventos);
  if (Platform.OS === 'web') return;
  const k = clave(tipo, ciudad);
  if (Date.now() - (ultimaEscritura.get(k) ?? 0) < 60_000) return;
  ultimaEscritura.set(k, Date.now());
  archivo(tipo, ciudad).write(JSON.stringify({ fecha: Date.now(), eventos })).catch(() => {});
}

// Lo que haya en memoria (instantáneo): lo usa "Ver todos" de un día y el primer dibujo de cada pestaña.
export function eventosGuardados(ciudad: string, tipo: Tipo = 'agenda') {
  return enMemoria.get(clave(tipo, ciudad)) ?? null;
}

// Lo que quedó guardado en el teléfono la última vez (al abrir la app). Sin los que ya terminaron.
export async function eventosDelTelefono(ciudad: string, tipo: Tipo = 'agenda'): Promise<Evento[] | null> {
  if (Platform.OS === 'web') return null;
  try {
    const f = archivo(tipo, ciudad);
    if (!f.exists) return null;
    const { fecha, eventos } = JSON.parse(await f.text()) as { fecha: number; eventos: Evento[] };
    if (Date.now() - fecha > MAX_EDAD) return null;
    const ahora = Date.now();
    return eventos.filter((e) => new Date(e.fin).getTime() > ahora);
  } catch {
    return null;
  }
}
