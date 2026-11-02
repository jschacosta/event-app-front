// Mensajes nuevos en los canales donde ya entraste (como los no leídos de WhatsApp).
// Un solo estado para toda la app: la barra de pestañas, la lista de Canales y el chat.
// Se refresca al volver a la app, al salir de un chat y cada cierto tiempo.
import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { useSesion } from '@/context/sesion';
import { api } from '@/lib/api';

export type NoLeidosEvento = { total: number; salas: Record<string, number> };
type Estado = Record<string, NoLeidosEvento>;

const CADA_MS = 45_000;
const VACIO: Estado = {};

let estado: Estado = VACIO;
let tokenActual: string | null = null;
const oyentes = new Set<() => void>();

function fijar(nuevo: Estado) {
  estado = nuevo;
  oyentes.forEach((o) => o());
}

export async function refrescarNoLeidos() {
  const token = tokenActual;
  if (!token) return fijar(VACIO);
  try {
    const r = await api<{ eventos: Estado }>('/me/no-leidos', { token });
    if (token === tokenActual) fijar(r.eventos);
  } catch {
    // Sin conexión: se deja lo último que se supo.
  }
}

// Al entrar a una sala, esa sala queda leída al instante (sin esperar al servidor).
export function marcarSalaLeida(eventoId: string, sala: string) {
  const e = estado[eventoId];
  if (!e?.salas[sala]) return;
  const salas = { ...e.salas };
  const total = e.total - (salas[sala] ?? 0);
  delete salas[sala];
  const nuevo = { ...estado };
  if (total > 0) nuevo[eventoId] = { total, salas };
  else delete nuevo[eventoId];
  fijar(nuevo);
}

const suscribir = (o: () => void) => {
  oyentes.add(o);
  return () => oyentes.delete(o);
};
const leer = () => estado;

export function useNoLeidos() {
  return useSyncExternalStore(suscribir, leer, leer);
}

export const textoCuenta = (n: number) => (n > 99 ? '99+' : String(n));

// Va una sola vez, en la barra de pestañas: mantiene los no leídos al día mientras hay sesión.
export function useSincronizarNoLeidos() {
  const { token } = useSesion();
  useEffect(() => {
    tokenActual = token ?? null;
    refrescarNoLeidos();
    if (!token) return;
    const intervalo = setInterval(refrescarNoLeidos, CADA_MS);
    const app = AppState.addEventListener('change', (s) => { if (s === 'active') refrescarNoLeidos(); });
    return () => {
      clearInterval(intervalo);
      app.remove();
    };
  }, [token]);
  const total = Object.values(useNoLeidos()).reduce((n, e) => n + e.total, 0);
  return total;
}
