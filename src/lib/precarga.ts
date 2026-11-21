// Respuestas del servidor guardadas en memoria, con precarga. Así lo hacen las apps grandes:
// - al apoyar el dedo sobre un evento (onPressIn) ya se piden su ficha, la vista previa del canal y las
//   opiniones, unos 100-150 ms antes de que la pantalla se abra;
// - la pantalla toma esas mismas peticiones (no las repite) y, si ya llegaron, se dibuja completa de entrada;
// - al volver a abrir un evento se muestra lo último que se vio y se actualiza por detrás.
// Las fichas de eventos quedan además en el teléfono: sin señal se abren igual (las de "Mis planes" siempre).
import { api, type Evento } from '@/lib/api';
import { guardarEnTelefono, leerDelTelefono } from '@/lib/disco';
import { CHAT_ACTIVO } from '@/lib/funciones';

type Guardada = { fecha: number; datos: unknown };
const respuestas = new Map<string, Guardada>();
const enCurso = new Map<string, Promise<unknown>>();
const MAX = 150;
const MAX_EN_TELEFONO = 80;
const ARCHIVO = 'respuestas';
// Rutas que no se sacan al hacer espacio (las fichas de los eventos a los que la persona va).
const fijas = new Set<string>();

// La sesión la fija SesionProvider: así las filas de las listas no tienen que leer el contexto para precargar.
let tokenActual: string | null = null;
export function fijarTokenPrecarga(token: string | null) {
  tokenActual = token;
}

// "Mi asistencia", "mi voto"… dependen de quién mira: la clave lleva una huella corta de la sesión
// (no el token), así lo guardado de otra cuenta nunca se muestra.
function huella(token: string) {
  let h = 5381;
  for (let i = 0; i < token.length; i++) h = ((h << 5) + h + token.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
const clave = (ruta: string, token: string | null) => `${token ? huella(token) : 'a'}|${ruta}`;
const rutaDe = (k: string) => k.slice(k.indexOf('|') + 1);

function guardar(k: string, datos: unknown, fecha = Date.now()) {
  respuestas.delete(k); // al final: la más reciente
  respuestas.set(k, { fecha, datos });
  if (respuestas.size > MAX) {
    for (const vieja of respuestas.keys()) {
      if (fijas.has(rutaDe(vieja))) continue;
      respuestas.delete(vieja);
      break;
    }
  }
  if (seGuarda(k)) guardarEnTelefono(ARCHIVO, aTelefono);
}

// Solo las fichas de eventos (con sus opiniones y vista del canal) y "Mis canales": lo que se abre en la fila de la disco.
const seGuarda = (k: string) => rutaDe(k).startsWith('/events/') || rutaDe(k) === '/me/canales';
function aTelefono() {
  const filas = [...respuestas].filter(([k]) => seGuarda(k));
  const fijadas = filas.filter(([k]) => fijas.has(rutaDe(k)));
  const resto = filas.filter(([k]) => !fijas.has(rutaDe(k))).slice(-MAX_EN_TELEFONO);
  return [...fijadas, ...resto];
}

// Al abrir la app: lo guardado la vez anterior (sin pisar lo que ya llegó del servidor).
const delTelefono = leerDelTelefono<[string, Guardada][]>(ARCHIVO).then((filas) => {
  for (const [k, g] of filas ?? []) {
    if (!respuestas.has(k)) respuestas.set(k, g);
  }
});
export const respuestasListas = () => delTelefono;

// Cambió la asistencia de un evento: se corrige también en las fichas guardadas.
export function corregirEventoGuardado(id: string, cambio: Partial<Evento>) {
  const ruta = `/events/${id}`;
  for (const [k, g] of respuestas) {
    if (rutaDe(k) !== ruta) continue;
    const d = g.datos as { evento?: Evento };
    if (d?.evento) {
      g.datos = { ...d, evento: { ...d.evento, ...cambio } };
      guardarEnTelefono(ARCHIVO, aTelefono);
    }
  }
}

// Las fichas de "Mis planes" quedan siempre en el teléfono.
export function fijarRutas(rutas: string[]) {
  fijas.clear();
  for (const r of rutas) fijas.add(r);
  guardarEnTelefono(ARCHIVO, aTelefono);
}

// Lo último que llegó para esta ruta (o null). Sirve para el primer dibujo de una pantalla.
export function guardado<T>(ruta: string, token: string | null = tokenActual): T | null {
  return (respuestas.get(clave(ruta, token))?.datos as T) ?? null;
}

// Cuándo llegó del servidor lo guardado para esta ruta (para "actualizado a las…").
export function fechaGuardado(ruta: string, token: string | null = tokenActual): number | null {
  return respuestas.get(clave(ruta, token))?.fecha ?? null;
}

// Pide la ruta salvo que haya una respuesta de menos de `maxEdad` ms; dos pedidos iguales a la vez comparten la petición.
export function pedir<T>(ruta: string, token: string | null = tokenActual, maxEdad = 20_000): Promise<T> {
  const k = clave(ruta, token);
  const ya = respuestas.get(k);
  if (ya && Date.now() - ya.fecha < maxEdad) return Promise.resolve(ya.datos as T);
  const pendiente = enCurso.get(k);
  if (pendiente) return pendiente as Promise<T>;
  const p = api<T>(ruta, { token })
    .then((datos) => {
      guardar(k, datos);
      return datos;
    })
    .finally(() => enCurso.delete(k));
  enCurso.set(k, p);
  return p;
}

// Lo que necesita el chat de un evento (al tocar un canal abierto en Canales).
export function precargarChat(eventoId: string) {
  const ignorar = () => {};
  pedir(`/events/${eventoId}`).catch(ignorar);
  if (tokenActual) pedir(`/canales/evento/${eventoId}`).catch(ignorar);
}

// Lo que necesita la ficha de un evento, pedido apenas se toca su fila.
export function precargarEvento(e: Pick<Evento, 'id' | 'chatAbierto' | 'serie'>) {
  const ignorar = () => {};
  pedir<{ evento: Evento }>(`/events/${e.id}`)
    .then(({ evento }) => {
      if (evento.recurrente) { // las opiniones solo existen en fiestas que se repiten
        pedir(`/events/${e.id}/opiniones`).catch(ignorar);
        pedir(`/events/${e.id}/hilos?orden=mejores`).catch(ignorar);
      }
    })
    .catch(ignorar);
  if (e.chatAbierto && CHAT_ACTIVO) pedir(`/events/${e.id}/canal`).catch(ignorar);
}

// Al cerrar sesión: se borra lo que era de la cuenta (queda lo que se ve sin sesión).
export function olvidarRespuestasDeSesion() {
  for (const k of [...respuestas.keys()]) if (!k.startsWith('a|')) respuestas.delete(k);
  fijas.clear();
  guardarEnTelefono(ARCHIVO, aTelefono);
}
