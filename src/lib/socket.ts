import { io, type Socket } from 'socket.io-client';

import { API_URL } from '@/config/api';
import i18n from '@/lib/i18n';

// Una sola conexión por sesión; se rehace si cambia el token.
let socket: Socket | null = null;
let tokenActual: string | null = null;

export function obtenerSocket(token: string) {
  if (socket && tokenActual === token) return socket;
  socket?.disconnect();
  tokenActual = token;
  socket = io(API_URL, { auth: (cb) => cb({ token, idioma: i18n.language }), transports: ['websocket'] });
  return socket;
}

export function cerrarSocket() {
  socket?.disconnect();
  socket = null;
  tokenActual = null;
}

// emit con respuesta del servidor, como promesa
export function emitir<T = { ok?: boolean; error?: string }>(s: Socket, evento: string, datos: unknown) {
  return new Promise<T>((resolve) => s.timeout(8000).emit(evento, datos, (err: Error | null, r: T) => {
    resolve(err ? ({ error: i18n.t('comun:errores.sinRespuesta', { defaultValue: 'El servidor no respondió' }) } as T) : r);
  }));
}
