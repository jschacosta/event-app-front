// Última lista de eventos de cada pantalla (agenda y canales), en memoria y en el teléfono.
// Así, al abrir la app o volver a una pestaña, los eventos se ven al instante y se actualizan por detrás,
// en vez de mostrar una pantalla vacía mientras llegan del servidor.
import type { Evento } from '@/lib/api';
import { borrarDelTelefono, guardarEnTelefono, leerDelTelefono, nombreSeguro } from '@/lib/disco';
import { corregirEventoGuardado } from '@/lib/precarga';

type Tipo = 'agenda' | 'canales' | 'planes';
// Sin señal sirve hasta una lista de hace una semana (sin los eventos que ya terminaron).
const MAX_EDAD = 7 * 864e5;

const enMemoria = new Map<string, Evento[]>();
const descargadas = new Map<string, number>(); // cuándo llegó del servidor cada lista guardada
const clave = (tipo: Tipo, ciudad: string) => `${tipo}-${ciudad}`;
const nombreArchivo = (k: string) => `eventos-${nombreSeguro(k)}`;

function aTelefono(k: string) {
  guardarEnTelefono(nombreArchivo(k), () => ({ fecha: descargadas.get(k) ?? Date.now(), eventos: enMemoria.get(k) ?? [] }));
}

// `delServidor` en false: la lista no es nueva (viene del teléfono), no cambia la hora de "actualizado a las…".
export function guardarEventos(ciudad: string, eventos: Evento[], tipo: Tipo = 'agenda', delServidor = true) {
  const k = clave(tipo, ciudad);
  enMemoria.set(k, eventos);
  if (delServidor) descargadas.set(k, Date.now());
  aTelefono(k);
}

// Lo que haya en memoria (instantáneo): lo usa "Ver todos" de un día y el primer dibujo de cada pestaña.
export function eventosGuardados(ciudad: string, tipo: Tipo = 'agenda') {
  return enMemoria.get(clave(tipo, ciudad)) ?? null;
}

// Lo que quedó guardado en el teléfono la última vez (al abrir la app). Sin los que ya terminaron.
export async function eventosDelTelefono(ciudad: string, tipo: Tipo = 'agenda'): Promise<Evento[] | null> {
  const k = clave(tipo, ciudad);
  const d = await leerDelTelefono<{ fecha: number; eventos: Evento[] }>(nombreArchivo(k));
  if (!d || Date.now() - d.fecha > MAX_EDAD) return null;
  if (!descargadas.has(k)) descargadas.set(k, d.fecha);
  const ahora = Date.now();
  return d.eventos.filter((e) => new Date(e.fin).getTime() > ahora);
}

// Una lista que ya no corresponde (los planes al cerrar sesión).
export function borrarLista(ciudad: string, tipo: Tipo) {
  const k = clave(tipo, ciudad);
  enMemoria.delete(k);
  descargadas.delete(k);
  borrarDelTelefono(nombreArchivo(k));
}

// Cuándo llegó del servidor la lista que se está mostrando (para "Sin conexión · actualizado a las…").
export function horaDeLista(ciudad: string, tipo: Tipo = 'agenda') {
  return descargadas.get(clave(tipo, ciudad)) ?? null;
}

// ── Un evento suelto (como Instagram al abrir una publicación) ──
// La pantalla del evento se dibuja al instante con lo que ya trae la lista y completa el resto
// (otras fechas, nota del lugar, Google) por detrás. Lo ya abierto queda guardado para volver sin esperar.
const detalles = new Map<string, Evento>();
const oyentes = new Set<() => void>();

export function eventoConocido(id: string): Evento | null {
  const visto = detalles.get(id);
  if (visto) return visto;
  for (const lista of enMemoria.values()) {
    const e = lista.find((x) => x.id === id);
    if (e) return e;
  }
  return null;
}

export function guardarDetalle(e: Evento) {
  detalles.set(e.id, e);
  actualizarEnListas(e.id, { asistencia: e.asistencia, miAsistencia: e.miAsistencia });
}

// Cambió quién va (o mi asistencia): se corrige en las listas guardadas y se avisa a las pantallas,
// así al volver al inicio el número es el correcto sin descargar la agenda de nuevo.
export function actualizarEnListas(id: string, cambio: Pick<Evento, 'asistencia' | 'miAsistencia'>) {
  let cambiado = false;
  for (const [k, lista] of enMemoria) {
    const i = lista.findIndex((x) => x.id === id);
    if (i < 0) continue;
    const antes = lista[i];
    if (JSON.stringify([antes.asistencia, antes.miAsistencia ?? null]) === JSON.stringify([cambio.asistencia, cambio.miAsistencia ?? null])) continue;
    const nueva = lista.slice();
    nueva[i] = { ...antes, ...cambio };
    enMemoria.set(k, nueva);
    aTelefono(k);
    cambiado = true;
  }
  const d = detalles.get(id);
  if (d) detalles.set(id, { ...d, ...cambio });
  corregirEventoGuardado(id, cambio);
  if (cambiado) oyentes.forEach((f) => f());
}

export function escucharCambios(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

// Cuándo se descargó cada lista por última vez: al volver a una pestaña no se descarga de nuevo
// si tiene menos de un minuto (los cambios propios ya llegan por actualizarEnListas).
// Si cambió la sesión (entrar o salir) se descarga igual: "mi asistencia" depende de quién mira.
const ultimaDescarga = new Map<string, { fecha: number; token: string | null }>();
export function listaReciente(ciudad: string, tipo: Tipo, token: string | null, ms = 60_000) {
  const u = ultimaDescarga.get(clave(tipo, ciudad));
  return Boolean(u && u.token === token && Date.now() - u.fecha < ms);
}
export function marcarDescarga(ciudad: string, tipo: Tipo, token: string | null) {
  ultimaDescarga.set(clave(tipo, ciudad), { fecha: Date.now(), token });
}
