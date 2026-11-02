import { useCallback, useEffect, useRef, useState } from 'react';

import { useSesion } from '@/context/sesion';
import i18n from '@/lib/i18n';
import { api, type Autor, type Encuesta, type MensajeChat, type Reaccion, type Sala } from '@/lib/api';
import { marcarSalaLeida, refrescarNoLeidos } from '@/lib/no-leidos';
import { emitir, obtenerSocket } from '@/lib/socket';

// 'normas': falta aceptar las normas de los canales · 'clave': el canal propio pide contraseña
type Estado = 'sin-sesion' | 'conectando' | 'listo' | 'normas' | 'clave' | 'cerrado' | 'error';
type Respuesta = {
  ok?: boolean; error?: string; codigo?: string; historial?: MensajeChat[];
  fijado?: MensajeChat | null; puedeFijar?: boolean; puedeEncuesta?: boolean;
  leidoHasta?: string | null;
  modoLento?: number; esperaHasta?: string | null;
  miembro?: boolean; // si ya me uní a la sala (sale en "Mis canales")
};
type RespuestaEnvio = { ok?: boolean; error?: string; codigo?: string; mensaje?: MensajeChat; esperaHasta?: string | null; miembro?: boolean };

const ESTADO_POR_CODIGO: Record<string, Estado> = {
  NORMAS_PENDIENTES: 'normas',
  CLAVE_REQUERIDA: 'clave',
  CANAL_NO_ENCONTRADO: 'cerrado',
};

export function useChat(eventoId: string | undefined, sala: Sala = 'general') {
  const { token } = useSesion();
  const [estado, setEstado] = useState<Estado>(token ? 'conectando' : 'sin-sesion');
  const [error, setError] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [escribiendo, setEscribiendo] = useState<Autor | null>(null);
  // Mensaje fijado arriba del chat y qué puede hacer esta persona en la sala.
  const [fijado, setFijado] = useState<MensajeChat | null>(null);
  const [permisos, setPermisos] = useState({ fijar: false, encuesta: false });
  // Hasta dónde había leído antes de entrar (para la línea "Mensajes nuevos"). undefined = aún no se sabe.
  const [leidoHasta, setLeidoHasta] = useState<string | null | undefined>(undefined);
  // Modo lento: segundos entre mensajes (0 = apagado) y desde cuándo esta persona puede volver a escribir.
  const [modoLento, setModoLento] = useState(0);
  const [esperaHasta, setEsperaHasta] = useState<number | null>(null);
  const [miembro, setMiembro] = useState(false);
  const [intento, setIntento] = useState(0); // sube para volver a entrar (tras aceptar normas o la contraseña)
  const ultimoAviso = useRef(0);

  // Al cambiar de sala se limpia la pantalla.
  const [vista, setVista] = useState(`${eventoId}:${sala}`);
  if (vista !== `${eventoId}:${sala}`) {
    setVista(`${eventoId}:${sala}`);
    setMensajes([]);
    setEscribiendo(null);
    setFijado(null);
    setPermisos({ fijar: false, encuesta: false });
    setLeidoHasta(undefined);
    setModoLento(0);
    setEsperaHasta(null);
    setMiembro(false);
    setEstado(token ? 'conectando' : 'sin-sesion');
  }

  useEffect(() => {
    if (!token || !eventoId) return;
    const s = obtenerSocket(token);
    let timerEscribiendo: ReturnType<typeof setTimeout> | undefined;
    const esDeAqui = (d: { eventoId: string; sala?: string }) => d.eventoId === eventoId && (d.sala ?? 'general') === sala;

    const unirse = async () => {
      setEstado('conectando');
      const r = await emitir<Respuesta>(s, 'chat:unirse', { eventoId, sala });
      if (r.error) {
        setError(r.error);
        setEstado(ESTADO_POR_CODIGO[r.codigo ?? ''] ?? 'error');
        return;
      }
      setMensajes(r.historial ?? []);
      setFijado(r.fijado ?? null);
      // Solo la primera vez que entra: al reconectar no se mueve la línea.
      setLeidoHasta((antes) => (antes === undefined ? r.leidoHasta ?? null : antes));
      marcarSalaLeida(eventoId, sala);
      setPermisos({ fijar: Boolean(r.puedeFijar), encuesta: Boolean(r.puedeEncuesta) });
      setModoLento(r.modoLento ?? 0);
      setEsperaHasta(r.esperaHasta ? new Date(r.esperaHasta).getTime() : null);
      setMiembro(Boolean(r.miembro));
      setError(null);
      setEstado('listo');
    };

    const alMensaje = (m: MensajeChat) => {
      if (!esDeAqui(m)) return;
      setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setEscribiendo((e) => (e?.id === m.autor.id ? null : e));
    };
    const alReacciones = ({ mensajeId, reacciones }: { mensajeId: string; reacciones: Reaccion[] }) =>
      setMensajes((prev) => prev.map((m) => (m.id === mensajeId ? { ...m, reacciones } : m)));
    const alOculto = ({ mensajeId }: { mensajeId: string }) => {
      setMensajes((prev) => prev.filter((m) => m.id !== mensajeId));
      setFijado((f) => (f?.id === mensajeId ? null : f));
    };
    const alFijado = (d: { eventoId: string; sala?: string; mensaje: MensajeChat | null }) => {
      if (!esDeAqui(d)) return;
      setFijado(d.mensaje);
      setMensajes((prev) => prev.map((m) => ({ ...m, fijado: m.id === d.mensaje?.id })));
    };
    const alVotos = ({ mensajeId, encuesta }: { mensajeId: string; encuesta: Encuesta }) =>
      setMensajes((prev) => prev.map((m) => (m.id === mensajeId ? { ...m, encuesta } : m)));
    const alEscribiendo = (d: { eventoId: string; sala?: string; autor: Autor }) => {
      if (!esDeAqui(d)) return;
      setEscribiendo(d.autor);
      clearTimeout(timerEscribiendo);
      timerEscribiendo = setTimeout(() => setEscribiendo(null), 3000);
    };
    const alModoLento = (d: { eventoId: string; sala?: string; segundos: number }) => {
      if (!esDeAqui(d)) return;
      setModoLento(d.segundos);
      if (!d.segundos) setEsperaHasta(null);
    };
    const alCanalCerrado = ({ canalId }: { canalId: string }) => {
      if (canalId === sala) setEstado('cerrado');
    };
    const alErrorConexion = (e: Error) => {
      setError(e.message || i18n.t('chat.errorConexion'));
      setEstado('error');
    };

    s.on('connect', unirse); // también al reconectar
    s.on('chat:mensaje', alMensaje);
    s.on('chat:oculto', alOculto);
    s.on('chat:reacciones', alReacciones);
    s.on('chat:fijado', alFijado);
    s.on('chat:votos', alVotos);
    s.on('chat:escribiendo', alEscribiendo);
    s.on('chat:canalCerrado', alCanalCerrado);
    s.on('chat:modoLento', alModoLento);
    s.on('connect_error', alErrorConexion);
    if (s.connected) unirse();

    return () => {
      clearTimeout(timerEscribiendo);
      s.emit('chat:salir', { eventoId, sala });
      // El servidor la marca leída al salir; después se actualizan los contadores.
      setTimeout(refrescarNoLeidos, 400);
      s.off('connect', unirse);
      s.off('chat:mensaje', alMensaje);
      s.off('chat:oculto', alOculto);
      s.off('chat:reacciones', alReacciones);
      s.off('chat:fijado', alFijado);
      s.off('chat:votos', alVotos);
      s.off('chat:escribiendo', alEscribiendo);
      s.off('chat:canalCerrado', alCanalCerrado);
      s.off('chat:modoLento', alModoLento);
      s.off('connect_error', alErrorConexion);
    };
  }, [token, eventoId, sala, intento]);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  const enviar = useCallback(async (texto: string, respuestaA?: string) => {
    if (!token || !eventoId) return { error: i18n.t('chat.iniciaParaEscribir') };
    const r = await emitir<RespuestaEnvio>(
      obtenerSocket(token), 'chat:mensaje', { eventoId, sala, texto, ...(respuestaA ? { respuestaA } : {}) },
    );
    // Con modo lento el servidor dice cuándo se puede volver a escribir (al enviar o al rechazar).
    if (r.esperaHasta !== undefined) setEsperaHasta(r.esperaHasta ? new Date(r.esperaHasta).getTime() : null);
    if (r.miembro) setMiembro(true); // escribir es unirse
    if (r.mensaje) {
      const m = r.mensaje;
      setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    }
    return r;
  }, [token, eventoId, sala]);

  const avisarEscribiendo = useCallback(() => {
    if (!token || !eventoId || Date.now() - ultimoAviso.current < 2000) return;
    ultimoAviso.current = Date.now();
    obtenerSocket(token).emit('chat:escribiendo', { eventoId, sala });
  }, [token, eventoId, sala]);

  // Reacción con un emoji: se muestra al instante y se corrige con lo que responda el servidor.
  const reaccionar = useCallback(async (mensajeId: string, emoji: string, yo: string) => {
    if (!token) return;
    setMensajes((prev) => prev.map((m) => {
      if (m.id !== mensajeId) return m;
      const anterior = m.reacciones?.find((r) => r.usuarios.includes(yo))?.emoji;
      const sinMi = (m.reacciones ?? []).map((r) => ({ ...r, usuarios: r.usuarios.filter((u) => u !== yo) })).filter((r) => r.usuarios.length);
      if (anterior === emoji) return { ...m, reacciones: sinMi };
      const existe = sinMi.find((r) => r.emoji === emoji);
      return {
        ...m,
        reacciones: existe ? sinMi.map((r) => (r.emoji === emoji ? { ...r, usuarios: [...r.usuarios, yo] } : r)) : [...sinMi, { emoji, usuarios: [yo] }],
      };
    }));
    const r = await emitir<{ ok?: boolean; reacciones?: Reaccion[] }>(obtenerSocket(token), 'chat:reaccion', { mensajeId, emoji });
    if (r.reacciones) {
      const reacciones = r.reacciones;
      setMensajes((prev) => prev.map((m) => (m.id === mensajeId ? { ...m, reacciones } : m)));
    }
  }, [token]);

  const fijar = useCallback(async (mensajeId: string, valor: boolean) => {
    if (!token) return {};
    return emitir<{ ok?: boolean; error?: string }>(obtenerSocket(token), 'chat:fijar', { mensajeId, fijar: valor });
  }, [token]);

  // Eliminar un mensaje de otra persona (quien modera la sala). Llega "chat:oculto" a todos.
  const eliminar = useCallback(async (mensajeId: string) => {
    if (!token) return {};
    return emitir<{ ok?: boolean; error?: string }>(obtenerSocket(token), 'chat:ocultar', { mensajeId });
  }, [token]);

  const crearEncuesta = useCallback(async (pregunta: string, opciones: string[]) => {
    if (!token || !eventoId) return { error: i18n.t('chat.iniciaParaEscribir') };
    const r = await emitir<{ ok?: boolean; error?: string; mensaje?: MensajeChat }>(
      obtenerSocket(token), 'chat:encuesta', { eventoId, sala, pregunta, opciones },
    );
    if (r.mensaje) {
      const m = r.mensaje;
      setMensajes((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    }
    return r;
  }, [token, eventoId, sala]);

  // Votar: se marca al instante y se corrige con lo que responda el servidor.
  const votar = useCallback(async (mensajeId: string, opcion: number, yo: string) => {
    if (!token) return;
    setMensajes((prev) => prev.map((m) => {
      if (m.id !== mensajeId || !m.encuesta) return m;
      const yaEra = m.encuesta.opciones[opcion]?.votos.includes(yo);
      const opciones = m.encuesta.opciones.map((o, i) => {
        const sin = o.votos.filter((v) => v !== yo);
        return { ...o, votos: i === opcion && !yaEra ? [...sin, yo] : sin };
      });
      return { ...m, encuesta: { opciones } };
    }));
    const r = await emitir<{ ok?: boolean; encuesta?: Encuesta }>(obtenerSocket(token), 'chat:votar', { mensajeId, opcion });
    if (r.encuesta) {
      const encuesta = r.encuesta;
      setMensajes((prev) => prev.map((m) => (m.id === mensajeId ? { ...m, encuesta } : m)));
    }
  }, [token]);

  const cambiarModoLento = useCallback(async (segundos: number) => {
    if (!token || !eventoId) return { error: i18n.t('chat.iniciaParaEscribir') };
    const r = await emitir<{ ok?: boolean; error?: string; segundos?: number }>(obtenerSocket(token), 'chat:modoLento', { eventoId, sala, segundos });
    if (r.ok) setModoLento(segundos);
    return r;
  }, [token, eventoId, sala]);

  const reportarMensaje = useCallback(async (mensajeId: string, motivo = 'inapropiado') => {
    if (!token) return { error: i18n.t('chat.iniciaParaReportar') };
    return emitir(obtenerSocket(token), 'chat:reportar', { mensajeId, motivo });
  }, [token]);

  // Unirme sin escribir (para tener la sala en "Mis canales") y salir de ella.
  const unirme = useCallback(async () => {
    if (!token || !eventoId) return { error: i18n.t('chat.iniciaParaEscribir') };
    setMiembro(true);
    try {
      await api(`/me/canales/${eventoId}`, { metodo: 'POST', token, body: { sala } });
      return {};
    } catch (e) {
      setMiembro(false);
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [token, eventoId, sala]);
  const salir = useCallback(async () => {
    if (!token || !eventoId) return {};
    try {
      await api(`/me/canales/${eventoId}?sala=${encodeURIComponent(sala)}`, { metodo: 'DELETE', token });
      setMiembro(false);
      refrescarNoLeidos();
      return {};
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  }, [token, eventoId, sala]);

  return {
    estado: token ? estado : 'sin-sesion',
    miembro, unirme, salir, eliminar,
    error, mensajes, escribiendo, enviar, avisarEscribiendo, reportarMensaje, reaccionar, reintentar,
    leidoHasta, fijado, puedeFijar: permisos.fijar, puedeEncuesta: permisos.encuesta, fijar, crearEncuesta, votar,
    modoLento, esperaHasta, cambiarModoLento,
  };
}
