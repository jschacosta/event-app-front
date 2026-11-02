import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banderas } from '@/components/bandera';
import { BotonPrincipal, Fila, FilaInterruptor, Grupo, Icono, Texto } from '@/components/ui';
import { TarjetaAqui, useYaAqui } from '@/components/ya-aqui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Evento } from '@/lib/api';
import { diaCorto, diasDesdeHoy, hora, precioTexto, tituloDia } from '@/lib/fechas';

type Estado = 'voy' | 'talvez' | 'previa';
// El texto de cada opción está en comun.json → evento.opcion.<id>
const OPCIONES: { id: Estado; icono: 'checkmark' | 'questionmark' | 'wineglass' }[] = [
  { id: 'voy', icono: 'checkmark' },
  { id: 'talvez', icono: 'questionmark' },
  { id: 'previa', icono: 'wineglass' },
];

function avisar(titulo: string, texto: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${titulo}\n${texto}`);
  else Alert.alert(titulo, texto);
}

function BotonFlotante({ icono, etiqueta, onPress }: { icono: 'chevron.left' | 'square.and.arrow.up'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={etiqueta} style={({ pressed }) => [styles.flotante, pressed && { opacity: 0.7 }]}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      <Icono nombre={icono} tamano={17} color="#FFFFFF" peso="semibold" />
    </Pressable>
  );
}

// Dónde se compran las entradas de los eventos recolectados.
const NOMBRE_FUENTE: Record<string, string> = { sympla: 'Sympla', eventbrite: 'Eventbrite' };

export default function EventoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const { t: tr } = useTranslation();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const aqui = useYaAqui(evento);

  const cargar = useCallback(async () => {
    try {
      const r = await api<{ evento: Evento }>(`/events/${id}`, { token });
      setEvento(r.evento);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('evento.errorCarga'));
    }
  }, [id, token, tr]);

  useEffect(() => { cargar(); }, [cargar]);

  const marcar = async (estado: Estado | null, solo = evento?.miAsistencia?.solo ?? false) => {
    if (!token) {
      avisar(tr('evento.iniciaSesion'), tr('evento.iniciaSesionTexto'));
      router.push('/perfil');
      return;
    }
    setGuardando(true);
    try {
      const r = await api<Pick<Evento, 'asistencia' | 'miAsistencia'>>(`/events/${id}/asistencia`, {
        metodo: 'POST', token, body: { estado, solo: estado ? solo : false },
      });
      setEvento((e) => (e ? { ...e, ...r } : e));
    } catch (e) {
      avisar(tr('evento.noSePudoGuardar'), e instanceof Error ? e.message : '');
    } finally {
      setGuardando(false);
    }
  };

  if (!evento) {
    return (
      <View style={[styles.centro, { backgroundColor: t.grouped }]}>
        {error ? <Texto secundario>{error}</Texto> : <ActivityIndicator />}
      </View>
    );
  }

  const a = evento.asistencia;
  const mio = evento.miAsistencia ?? null;
  const cuando = diasDesdeHoy(evento.inicio) <= 0 ? tr('fechas.hoy') : tituloDia(evento.inicio);
  const detalle = [`${cuando}, ${hora(evento.inicio)} – ${hora(evento.fin)}`, [evento.lugar, evento.barrio].filter(Boolean).join(', '), precioTexto(evento.precioDesde)]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <View style={[styles.foto, { backgroundColor: t.backgroundElement }]}>
          {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        </View>

        <View style={[styles.hoja, { backgroundColor: t.grouped }]}>
          <View style={{ gap: 4, paddingHorizontal: 4 }}>
            <Texto v="titulo">{evento.titulo}</Texto>
            <Texto v="detalle" secundario>{detalle}</Texto>
          </View>

          {/* Mientras ocurre (desde 1 hora antes): avisar que llegaste y ver quiénes ya están. */}
          {aqui.abierto && token ? (
            <TarjetaAqui aqui={aqui} onCambio={(r) => setEvento((e) => (e ? { ...e, ...r } : e))} />
          ) : null}

          <View style={styles.opciones}>
            {OPCIONES.map((o) => {
              const activo = mio?.estado === o.id;
              return (
                <Pressable
                  key={o.id}
                  disabled={guardando}
                  onPress={() => marcar(activo ? null : o.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  style={({ pressed }) => [styles.opcion, { backgroundColor: activo ? t.accent : t.card }, pressed && { opacity: 0.75 }]}>
                  <Icono nombre={o.icono} tamano={18} color={activo ? t.onAccent : t.accentText} peso="semibold" />
                  <Texto v="pie" style={{ fontWeight: activo ? '600' : '500', color: activo ? t.onAccent : t.text }}>{tr(`evento.opcion.${o.id}`)}</Texto>
                </Pressable>
              );
            })}
          </View>

          <Grupo pie={mio ? undefined : tr('evento.marcaSiVas')}>
            {mio ? <FilaInterruptor etiqueta={tr('evento.voySolo')} valor={mio.solo} onCambio={(v) => marcar(mio.estado, v)} /> : null}
            <Fila
              etiqueta={tr('evento.quienVa')}
              valor={a && a.van + a.talvez > 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Banderas codigos={a.paisesTop} alto={12} />
                  <Texto secundario>{a.van}</Texto>
                </View>
              ) : tr('evento.nadieTodavia')}
            />
            {a && a.solos > 0 ? <Fila etiqueta={tr('evento.vanSolos')} valor={String(a.solos)} /> : null}
            <Fila etiqueta={tr('evento.previas')} valor={a?.previa ? tr('evento.interesados', { count: a.previa }) : tr('evento.ningunaAun')} />
          </Grupo>

          {evento.otrasFechas?.length ? (
            // La misma fiesta en otros días: se puede saltar a cualquiera.
            <View style={{ gap: 8 }}>
              <Texto v="grupo" secundario style={{ paddingHorizontal: 16 }}>{tr('evento.otrasFechas').toUpperCase()}</Texto>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
                {evento.otrasFechas.map((f) => (
                  <Pressable
                    key={f.id}
                    onPress={() => router.replace({ pathname: '/evento/[id]', params: { id: f.id } })}
                    style={({ pressed }) => [styles.otraFecha, { backgroundColor: t.card }, pressed && { opacity: 0.6 }]}>
                    <Texto v="mini" secundario style={{ fontWeight: '600', textTransform: 'uppercase' }}>{diaCorto(f.inicio)}</Texto>
                    <Texto v="pie" style={{ fontWeight: '600' }}>{hora(f.inicio)}</Texto>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}

          {evento.descripcion ? (
            <Grupo titulo={tr('evento.sobre')}>
              <View style={{ padding: 16 }}><Texto>{evento.descripcion}</Texto></View>
            </Grupo>
          ) : null}

          {evento.linkEntradas ? (
            <Grupo>
              <Fila etiqueta={tr('evento.comprarEntradas')} valor={NOMBRE_FUENTE[evento.fuente ?? '']} onPress={() => WebBrowser.openBrowserAsync(evento.linkEntradas!)} />
            </Grupo>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.arriba, { top: insets.top + 8 }]}>
        <BotonFlotante icono="chevron.left" etiqueta={tr('comun.volver')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <BotonFlotante icono="square.and.arrow.up" etiqueta={tr('comun.compartir')} onPress={() => Share.share({ message: `${evento.titulo} · ${detalle}` })} />
      </View>

      <BlurView intensity={60} tint={t.background === '#000000' ? 'dark' : 'light'} style={[styles.barraInferior, { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: t.separator }]}>
        <BotonPrincipal
          texto={evento.chatAbierto ? tr('evento.entrarChat') : tr('evento.chatAbre', { dia: diaCorto(evento.chatAbreEn) })}
          deshabilitado={!evento.chatAbierto}
          onPress={() => router.push({ pathname: '/evento/[id]/chat', params: { id: evento.id } })}
        />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  foto: { height: 380, overflow: 'hidden' },
  hoja: { marginTop: -28, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 24, paddingHorizontal: 16, gap: 20 },
  opciones: { flexDirection: 'row', gap: 8 },
  opcion: { flex: 1, height: 64, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4 },
  arriba: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  flotante: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  barraInferior: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  otraFecha: { minWidth: 92, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, alignItems: 'center', gap: 2 },
});
