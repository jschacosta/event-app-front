// Tópicos de una sala (como los temas de un grupo de Telegram), con su último mensaje y no leídos.
// Mientras la lista está a la vista, el socket "mira" la sala: cada mensaje nuevo sube su tópico
// y suma al contador sin volver a pedir la lista. La última lista de cada sala queda en memoria,
// así al volver se ve al instante.
import { useCallback, useEffect, useRef, useState } from 'react';

import { useSesion } from '@/context/sesion';
import { api, type MensajeChat, type TopicoResumen } from '@/lib/api';
import { emitir, obtenerSocket } from '@/lib/socket';

type Datos = { topicos: TopicoResumen[]; puedeCrear: boolean; modera: boolean; miembro: boolean };
const memoria = new Map<string, Datos>();

// Si ya se sabe que la sala tiene tópicos (para abrir directo la lista o el chat).
export const tieneTopicos = (eventoId: string, sala: string) => {
  const d = memoria.get(`${eventoId}:${sala}`);
  return d ? d.topicos.length > 1 : undefined;
};

const ordenar = (lista: TopicoResumen[]) => {
  const [general, ...resto] = lista;
  return [general, ...resto.sort((a, b) => new Date(b.actividad ?? 0).getTime() - new Date(a.actividad ?? 0).getTime())];
};

export function useTopicos(eventoId: string | undefined, sala: string, mirando: boolean) {
  const { token, usuario } = useSesion();
  const clave = `${eventoId}:${sala}`;
  const [datos, setDatos] = useState<Datos | null>(() => memoria.get(clave) ?? null);
  const [error, setError] = useState<{ mensaje: string; codigo?: string } | null>(null);
  const [vista, setVista] = useState(clave);
  if (vista !== clave) {
    setVista(clave);
    setDatos(memoria.get(clave) ?? null);
    setError(null);
  }
  const vivo = useRef(clave);
  useEffect(() => { vivo.current = clave; }, [clave]);

  const cargar = useCallback(async () => {
    if (!token || !eventoId) return;
    try {
      // Si no responde en 6 segundos se sigue sin la lista (el chat abre igual), para no quedar cargando.
      const r = await Promise.race([
        api<Datos>(`/topicos/${eventoId}?sala=${encodeURIComponent(sala)}`, { token }),
        new Promise<never>((_, rechazar) => setTimeout(() => rechazar(new Error('timeout')), 6000)),
      ]);
      memoria.set(`${eventoId}:${sala}`, r);
      if (vivo.current === `${eventoId}:${sala}`) {
        setDatos(r);
        setError(null);
      }
    } catch (e) {
      const err = e as Error & { codigo?: string };
      if (vivo.current === `${eventoId}:${sala}`) setError({ mensaje: err.message, codigo: err.codigo });
    }
  }, [token, eventoId, sala]);

  useEffect(() => {
    const t = setTimeout(cargar, 0);
    return () => clearTimeout(t);
  }, [cargar]);

  // En vivo, solo mientras se mira la lista.
  useEffect(() => {
    if (!mirando || !token || !eventoId) return;
    const s = obtenerSocket(token);
    const mirar = () => { emitir(s, 'chat:mirar', { eventoId, sala }); cargar(); };
    const alMensaje = (m: MensajeChat) => {
      if (m.eventoId !== eventoId || (m.sala ?? 'general') !== sala) return;
      setDatos((d) => {
        if (!d) return d;
        const id = m.topico ?? 'general';
        if (!d.topicos.some((x) => x.id === id)) { cargar(); return d; }
        const mio = m.autor.id === usuario?.id;
        const topicos = ordenar(d.topicos.map((x) => (x.id !== id ? x : {
          ...x,
          actividad: m.fecha,
          noLeidos: !mio && d.miembro && !m.sistema ? x.noLeidos + 1 : x.noLeidos,
          ultimo: {
            texto: m.texto, sticker: Boolean(m.sticker), gif: Boolean(m.gif), sistema: m.sistema ?? null, encuesta: Boolean(m.encuesta),
            autor: m.autor.nombreVisible, mio, fecha: m.fecha,
          },
        })));
        const nuevo = { ...d, topicos };
        memoria.set(`${eventoId}:${sala}`, nuevo);
        return nuevo;
      });
    };
    const alCambio = (d: { eventoId: string; sala: string }) => {
      if (d.eventoId === eventoId && d.sala === sala) cargar();
    };
    s.on('connect', mirar);
    s.on('chat:mensaje', alMensaje);
    s.on('chat:topicos', alCambio);
    if (s.connected) mirar();
    return () => {
      s.off('connect', mirar);
      s.off('chat:mensaje', alMensaje);
      s.off('chat:topicos', alCambio);
    };
  }, [mirando, token, eventoId, sala, usuario?.id, cargar]);

  // Al abrir un tópico su contador vuelve a cero (el servidor lo marca leído al entrar).
  const marcarLeido = useCallback((topicoId: string) => {
    setDatos((d) => {
      if (!d) return d;
      const nuevo = { ...d, topicos: d.topicos.map((x) => (x.id === topicoId ? { ...x, noLeidos: 0 } : x)) };
      memoria.set(`${eventoId}:${sala}`, nuevo);
      return nuevo;
    });
  }, [eventoId, sala]);

  return {
    topicos: datos?.topicos ?? null,
    puedeCrear: Boolean(datos?.puedeCrear),
    modera: Boolean(datos?.modera),
    miembro: Boolean(datos?.miembro),
    error,
    recargar: cargar,
    marcarLeido,
  };
}
