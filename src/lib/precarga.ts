// Respuestas del servidor guardadas en memoria, con precarga. Así lo hacen las apps grandes:
// - al apoyar el dedo sobre un evento (onPressIn) ya se piden su ficha, la vista previa del canal y las
//   opiniones, unos 100-150 ms antes de que la pantalla se abra;
// - la pantalla toma esas mismas peticiones (no las repite) y, si ya llegaron, se dibuja completa de entrada;
// - al volver a abrir un evento se muestra lo último que se vio y se actualiza por detrás.
import { api, type Evento } from '@/lib/api';

type Guardada = { fecha: number; datos: unknown };
const respuestas = new Map<string, Guardada>();
const enCurso = new Map<string, Promise<unknown>>();
const MAX = 150;

// La sesión la fija SesionProvider: así las filas de las listas no tienen que leer el contexto para precargar.
let tokenActual: string | null = null;
export function fijarTokenPrecarga(token: string | null) {
  if (token !== tokenActual) respuestas.clear(); // "mi asistencia", "mi voto"… dependen de quién mira
  tokenActual = token;
}

const clave = (ruta: string, token: string | null) => `${token ? 'u' : 'a'}|${ruta}`;

// Lo último que llegó para esta ruta (o null). Sirve para el primer dibujo de una pantalla.
export function guardado<T>(ruta: string, token: string | null = tokenActual): T | null {
  return (respuestas.get(clave(ruta, token))?.datos as T) ?? null;
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
      if (respuestas.size >= MAX) respuestas.delete(respuestas.keys().next().value!);
      respuestas.set(k, { fecha: Date.now(), datos });
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
  if (e.chatAbierto) pedir(`/events/${e.id}/canal`).catch(ignorar);
}
