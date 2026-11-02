// "Ya estoy aquí": avisar que llegaste al lugar y ver quiénes ya están (como Swarm o Partiful).
// Se puede marcar desde 1 hora antes del inicio hasta que termina el evento.
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn } from 'react-native-reanimated';

import { Icono, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor, type Evento } from '@/lib/api';
import { obtenerSocket } from '@/lib/socket';

type Datos = { personas: Autor[]; total: number; ids: string[] };
const VACIO: Datos = { personas: [], total: 0, ids: [] };
const MAX_CARAS = 40;

export function aquiAbierto(e: Pick<Evento, 'aquiAbreEn' | 'fin'>) {
  if (!e.aquiAbreEn) return false;
  const ahora = Date.now();
  return ahora >= new Date(e.aquiAbreEn).getTime() && ahora < new Date(e.fin).getTime();
}

// Quiénes están en el lugar. `enVivo`: escucha los avisos del chat (solo dentro del canal).
export function useYaAqui(evento: Evento | null, enVivo = false) {
  const { token, usuario } = useSesion();
  const id = evento?.id;
  const abierto = Boolean(evento && aquiAbierto(evento));
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(() => {
    if (!token || !id || !abierto) return Promise.resolve();
    return api<Datos>(`/events/${id}/aqui`, { token })
      .then(setDatos)
      .catch(() => {}); // sin conexión: se deja lo último que se supo
  }, [token, id, abierto]);
  useEffect(() => {
    if (!token || !id || !abierto) return;
    api<Datos>(`/events/${id}/aqui`, { token }).then(setDatos).catch(() => {});
  }, [token, id, abierto]);

  useEffect(() => {
    if (!enVivo || !token || !id || !abierto) return;
    const s = obtenerSocket(token);
    const alAqui = (d: { eventoId: string; aqui: boolean; total: number; persona: Autor }) => {
      if (d.eventoId !== id) return;
      setDatos((prev) => {
        const personas = prev.personas.filter((p) => p.id !== d.persona.id);
        const ids = prev.ids.filter((x) => x !== d.persona.id);
        return d.aqui
          ? { personas: [d.persona, ...personas].slice(0, MAX_CARAS), total: d.total, ids: [d.persona.id, ...ids] }
          : { personas, total: d.total, ids };
      });
    };
    s.on('chat:aqui', alAqui);
    return () => { s.off('chat:aqui', alAqui); };
  }, [enVivo, token, id, abierto]);

  const ids = useMemo(() => new Set(datos.ids), [datos.ids]);
  const mio = Boolean(usuario && ids.has(usuario.id));

  const marcar = async (aqui: boolean) => {
    if (!token || !id) return { error: null };
    setOcupado(true);
    try {
      const r = await api<Pick<Evento, 'asistencia' | 'miAsistencia'>>(`/events/${id}/aqui`, { metodo: 'POST', token, body: { aqui } });
      await cargar();
      return { r, error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : '' };
    } finally {
      setOcupado(false);
    }
  };

  return { abierto, personas: datos.personas, total: datos.total, ids, mio, ocupado, marcar };
}

// Fila de fotos superpuestas (las más recientes primero).
export function Caras({ personas, tam = 28, max = 5, borde }: { personas: Autor[]; tam?: number; max?: number; borde: string }) {
  const t = useTheme();
  if (!personas.length) return null;
  return (
    <View style={{ flexDirection: 'row' }}>
      {personas.slice(0, max).map((p, i) => (
        <Animated.View
          key={p.id}
          entering={ZoomIn.springify().damping(15)}
          layout={LinearTransition.duration(200)}
          style={[
            styles.cara,
            { width: tam, height: tam, borderRadius: tam / 2, borderColor: borde, backgroundColor: t.backgroundSelected, zIndex: max - i },
            i > 0 && { marginLeft: -tam * 0.32 },
          ]}>
          {p.foto
            ? <Image source={{ uri: p.foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : <Text style={{ color: t.text, fontSize: tam * 0.42, fontWeight: '600' }}>{p.nombreVisible.charAt(0)}</Text>}
        </Animated.View>
      ))}
    </View>
  );
}

// En el detalle del evento: el botón grande y quiénes ya están.
export function TarjetaAqui({ aqui, onCambio }: {
  aqui: ReturnType<typeof useYaAqui>;
  onCambio?: (r: Pick<Evento, 'asistencia' | 'miAsistencia'>) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  const alternar = async () => {
    setError(null);
    const { r, error: e } = await aqui.marcar(!aqui.mio);
    if (e) setError(e);
    else if (r) onCambio?.(r);
  };

  return (
    <Animated.View entering={FadeIn.duration(200)} style={[styles.tarjeta, { backgroundColor: t.card }]}>
      <Pressable
        onPress={alternar}
        disabled={aqui.ocupado}
        accessibilityRole="button"
        accessibilityState={{ selected: aqui.mio }}
        style={({ pressed }) => [
          styles.boton,
          aqui.mio ? { backgroundColor: t.background } : { backgroundColor: t.accent },
          pressed && { opacity: 0.75 },
        ]}>
        {aqui.ocupado ? <ActivityIndicator color={aqui.mio ? t.text : t.onAccent} /> : (
          <>
            <Icono nombre={aqui.mio ? 'checkmark.circle.fill' : 'location.fill'} tamano={18} color={aqui.mio ? t.text : t.onAccent} peso="semibold" />
            <Texto v="cuerpoFuerte" style={{ color: aqui.mio ? t.text : t.onAccent }}>{tr(aqui.mio ? 'aqui.estas' : 'aqui.boton')}</Texto>
          </>
        )}
      </Pressable>
      <View style={styles.filaCaras}>
        <Caras personas={aqui.personas} borde={t.card} />
        <Texto v="pie" secundario style={{ flex: 1 }}>
          {aqui.total ? tr('aqui.yaEstan', { count: aqui.total }) : tr('aqui.nadie')}
        </Texto>
      </View>
      {aqui.mio ? <Texto v="mini" secundario style={{ textAlign: 'center' }}>{tr('aqui.quitar')}</Texto> : null}
      {error ? <Texto v="pie" style={{ color: t.danger }}>{error}</Texto> : null}
    </Animated.View>
  );
}

// En el chat: un botón chico en el encabezado (para dejar más espacio a los mensajes).
// Lleno cuando ya marqué que llegué; con un globo que dice cuántas personas están en el lugar.
// Al tocarlo, el chat abre una hoja con las caras y el botón para marcar o quitar.
export function BotonAqui({ aqui, onPress }: { aqui: ReturnType<typeof useYaAqui>; onPress: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={aqui.ocupado}
      accessibilityRole="button"
      accessibilityLabel={aqui.mio ? tr('aqui.estas') : tr('aqui.boton')}
      accessibilityHint={aqui.total ? tr('aqui.yaEstan', { count: aqui.total }) : undefined}
      accessibilityState={{ selected: aqui.mio }}
      hitSlop={4}
      style={({ pressed }) => [styles.botonAqui, pressed && { opacity: 0.6 }]}>
      <Animated.View
        key={aqui.mio ? 'mio' : 'no'}
        entering={ZoomIn.springify().damping(14)}
        style={[styles.circuloAqui, aqui.mio ? { backgroundColor: t.accent } : { backgroundColor: t.backgroundElement }]}>
        <Icono nombre="location.fill" tamano={15} color={aqui.mio ? t.onAccent : t.text} />
      </Animated.View>
      {aqui.total > 0 ? (
        <View style={[styles.globoAqui, { backgroundColor: t.text, borderColor: t.background }]}>
          <Text style={[styles.globoTexto, { color: t.background }]}>{aqui.total > 99 ? '99+' : aqui.total}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// Contenido de la hoja que abre el botón: caras y cuántos ya llegaron.
export function CabezaAqui({ aqui }: { aqui: ReturnType<typeof useYaAqui> }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={[styles.cabezaAqui, { backgroundColor: t.card }]}>
      {aqui.personas.length ? <Caras personas={aqui.personas} tam={30} max={6} borde={t.card} /> : <Icono nombre="location.fill" tamano={22} color={t.text} />}
      <Texto v="pie" secundario style={{ textAlign: 'center' }}>
        {aqui.total ? tr('aqui.yaEstan', { count: aqui.total }) : tr('aqui.nadie')}
      </Texto>
    </View>
  );
}

const styles = StyleSheet.create({
  cara: { borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 16, padding: 12, gap: 12 },
  boton: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  filaCaras: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, minHeight: 28 },
  botonAqui: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  circuloAqui: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  globoAqui: {
    position: 'absolute', top: 2, right: -2, minWidth: 18, height: 18, borderRadius: 9, borderWidth: 2,
    paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center',
  },
  globoTexto: { fontSize: 10, fontWeight: '700' },
  cabezaAqui: { borderRadius: 14, padding: 14, gap: 8, alignItems: 'center', marginBottom: 8 },
});
