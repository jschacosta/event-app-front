import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaAsistentes, type EstadoAsistencia } from '@/components/asistentes';
import { Banderas } from '@/components/bandera';
import { BotonPrincipal, Icono, Texto } from '@/components/ui';
import { EnInternet } from '@/components/en-internet';
import { HojaResponder, ListaHilos, LoQueDicen, pedirSesion, useOpiniones } from '@/components/opiniones';
import { Caras, useYaAqui } from '@/components/ya-aqui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, quiereAviso, type Evento } from '@/lib/api';
import { compartirEvento } from '@/lib/compartir-evento';
import { activarNotificaciones, cancelarRecordatorio, programarAvisoLocal, programarRecordatorio } from '@/lib/notificaciones';
import { diaCorto, diasDesdeHoy, hora, precioTexto, tituloDia } from '@/lib/fechas';
import { colorEtiquetaGenero, nombreGenero } from '@/lib/generos';

// Ficha de un evento, como un afiche: el título va sobre la foto. Debajo, los datos en dos columnas
// (cuándo / dónde), "¿Vas?" compacto y quién va. En fiestas que se repiten, además: "Lo que dicen"
// (respuestas rápidas de quienes fueron) y pestañas Hilos / Info, compartidas por todas sus fechas.
// Abajo, fijo: el chat de la previa y "Estoy aquí".
type Estado = 'voy' | 'talvez' | 'previa';
const OPCIONES: { id: Estado; icono: 'checkmark' | 'questionmark' | 'wineglass' }[] = [
  { id: 'voy', icono: 'checkmark' },
  { id: 'talvez', icono: 'questionmark' },
  { id: 'previa', icono: 'wineglass' },
];
type Pestana = 'hilos' | 'info';

function avisar(titulo: string, texto: string) {
  if (Platform.OS === 'web') globalThis.alert?.(`${titulo}\n${texto}`);
  else Alert.alert(titulo, texto);
}

function BotonFoto({ icono, etiqueta, onPress }: { icono: 'chevron.left' | 'square.and.arrow.up'; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={etiqueta} hitSlop={8} style={({ pressed }) => [styles.botonFoto, pressed && { opacity: 0.7 }]}>
      <Icono nombre={icono} tamano={17} color="#FFFFFF" peso="semibold" />
    </Pressable>
  );
}

// Columna de dato: rótulo chico, valor y una línea extra (o un enlace).
function Columna({ rotulo, valor, extra }: { rotulo: string; valor: string; extra?: ReactNode }) {
  return (
    <View style={{ flex: 1, gap: 1 }}>
      <Texto v="mini" secundario style={{ fontWeight: '600' }}>{rotulo}</Texto>
      <Texto v="cuerpoFuerte" style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={2}>{valor}</Texto>
      {extra}
    </View>
  );
}

const NOMBRE_FUENTE: Record<string, string> = { sympla: 'Sympla', eventbrite: 'Eventbrite' };

function cuantoFalta(inicio: string, fin: string, ahora: number, tr: (k: string, o?: Record<string, unknown>) => string) {
  const a = new Date(inicio).getTime();
  if (ahora >= new Date(fin).getTime()) return tr('evento.yaTermino');
  if (ahora >= a) return tr('evento.termina', { hora: hora(fin) });
  const min = Math.round((a - ahora) / 60000);
  if (min >= 24 * 60) return tr('evento.termina', { hora: hora(fin) });
  const tiempo = min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${min % 60} min` : ''}` : `${min} min`;
  return tr('evento.empiezaEn', { tiempo });
}

export default function EventoScreen() {
  const { id, responder } = useLocalSearchParams<{ id: string; responder?: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token, usuario } = useSesion();
  const { t: tr } = useTranslation();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [asistentes, setAsistentes] = useState<EstadoAsistencia | null>(null);
  const [pestana, setPestana] = useState<Pestana>('hilos');
  const [respondiendo, setRespondiendo] = useState(false);
  const aqui = useYaAqui(evento);
  const opiniones = useOpiniones(id, token, Boolean(evento?.recurrente));
  // Desde el aviso "¿Cómo estuvo?" de la agenda: se abren las preguntas de esa fecha apenas cargan.
  const [avisoAbierto, setAvisoAbierto] = useState(false);
  if (responder && token && opiniones.datos && !avisoAbierto) {
    setAvisoAbierto(true);
    setRespondiendo(true);
  }
  const [ahora] = useState(() => Date.now());

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
      pedirSesion(tr, 'voy', `/evento/${id}`);
      return;
    }
    setGuardando(true);
    try {
      const r = await api<Pick<Evento, 'asistencia' | 'miAsistencia'>>(`/events/${id}/asistencia`, {
        metodo: 'POST', token, body: { estado, solo: estado ? solo : false },
      });
      setEvento((e) => (e ? { ...e, ...r } : e));
      if (estado === 'voy') activarNotificaciones(token, { preguntar: true });
      if (evento && estado === 'voy' && quiereAviso(usuario, 'recordatorio')) programarRecordatorio(evento);
      else cancelarRecordatorio(id);
    } catch (e) {
      avisar(tr('evento.noSePudoGuardar'), e instanceof Error ? e.message : '');
    } finally {
      setGuardando(false);
    }
  };

  const alternarAqui = async () => {
    const { r, error: e } = await aqui.marcar(!aqui.mio);
    if (e) avisar(tr('evento.noSePudoGuardar'), e);
    else if (r) {
      setEvento((ev) => (ev ? { ...ev, ...r } : ev));
      if (!aqui.mio && evento?.recurrente) {
        // Al llegar: push si se puede; si no, el aviso queda programado en el teléfono.
        if (quiereAviso(usuario, 'opinion')) activarNotificaciones(token, { preguntar: true }).then((push) => { if (!push) programarAvisoLocal(evento); });
      }
    }
  };

  if (!evento) {
    return (
      <View style={[styles.centro, { backgroundColor: t.background }]}>
        {error ? <Texto secundario>{error}</Texto> : <ActivityIndicator />}
      </View>
    );
  }

  const a = evento.asistencia;
  const mio = evento.miAsistencia ?? null;
  const cuando = diasDesdeHoy(evento.inicio) <= 0 ? tr('fechas.hoy') : tituloDia(evento.inicio);
  const enCurso = ahora >= new Date(evento.inicio).getTime() && ahora < new Date(evento.fin).getTime();
  const precio = precioTexto(evento.precioDesde);
  const lugar = evento.lugar ?? evento.barrio ?? '';
  const hayGente = Boolean(a && a.van + a.talvez + a.previa > 0);
  const repite = Boolean(evento.recurrente);
  const abrirMapa = () => {
    const q = encodeURIComponent([evento.lugar, evento.barrio, evento.ciudad].filter(Boolean).join(', '));
    Linking.openURL(Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`).catch(() => {});
  };
  const resumen = hayGente
    ? [a!.van ? tr('agenda.van', { count: a!.van }) : null, a!.talvez ? tr('evento.nTalvez', { count: a!.talvez }) : null, a!.previa ? tr('evento.nPrevia', { count: a!.previa }) : null].filter(Boolean).join(', ')
    : tr('evento.nadieTodavia');

  return (
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
        {/* Afiche: foto con el título encima. */}
        <View style={[styles.afiche, { backgroundColor: t.backgroundElement, paddingTop: insets.top + 56 }]}>
          {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
          <LinearGradient colors={['rgba(18,10,23,0.35)', 'rgba(18,10,23,0)', 'rgba(18,10,23,0.92)']} locations={[0, 0.3, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.aficheTexto}>
            <View style={styles.etiquetas}>
              {enCurso ? (
                <View style={[styles.etiqueta, { backgroundColor: t.sun }]}>
                  <Texto v="mini" style={{ color: t.onSun, fontWeight: '800' }}>{tr('agenda.enVivo')}</Texto>
                </View>
              ) : null}
              {evento.generos.slice(0, 2).map((g) => (
                <View key={g} style={[styles.etiqueta, { backgroundColor: colorEtiquetaGenero(g) }]}>
                  <Texto v="mini" style={{ color: '#FFFFFF', fontWeight: '700' }}>{nombreGenero(g)}</Texto>
                </View>
              ))}
            </View>
            <Texto style={styles.titulo} numberOfLines={3}>{evento.titulo}</Texto>
            {repite ? (
              <View style={styles.repite}>
                <Icono nombre="repeat" tamano={12} color="#FFFFFF" peso="bold" />
                <Texto v="pie" style={{ color: '#FFFFFF', fontWeight: '700' }}>{tr('evento.seRepite', { count: evento.fechasSerie ?? 2 })}</Texto>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.contenido}>
          {/* Datos en dos columnas. */}
          <View style={[styles.datos, { borderBottomColor: t.separator }]}>
            <Columna
              rotulo={cuando}
              valor={`${hora(evento.inicio)} – ${hora(evento.fin)}`}
              extra={<Texto v="pie" style={{ color: enCurso ? t.live : t.textSecondary, fontWeight: enCurso ? '700' : '400' }}>{cuantoFalta(evento.inicio, evento.fin, ahora, tr)}</Texto>}
            />
            <View style={[styles.divisor, { backgroundColor: t.separator }]} />
            <Columna
              rotulo={evento.barrio && evento.lugar ? evento.barrio : tr('evento.mapa')}
              valor={lugar}
              extra={(
                <Pressable onPress={abrirMapa} hitSlop={8} accessibilityRole="link">
                  {({ pressed }) => <Texto v="pie" style={{ color: t.accentText, fontWeight: '700', opacity: pressed ? 0.5 : 1 }}>{tr('evento.verMapa')}</Texto>}
                </Pressable>
              )}
            />
          </View>
          <View style={[styles.precio, { borderBottomColor: t.separator }]}>
            <Texto v="detalle" style={{ fontWeight: '700' }}>{precio ?? tr('evento.entradasNo')}</Texto>
            {evento.linkEntradas ? (
              <Pressable onPress={() => WebBrowser.openBrowserAsync(evento.linkEntradas!)} hitSlop={8} style={styles.enlace}>
                <Texto v="detalle" style={{ color: t.accentText, fontWeight: '700' }}>
                  {`${tr('evento.comprarEntradas')}${NOMBRE_FUENTE[evento.fuente ?? ''] ? ` (${NOMBRE_FUENTE[evento.fuente ?? '']})` : ''}`}
                </Texto>
                <Icono nombre="chevron.right" tamano={11} color={t.accentText} peso="bold" />
              </Pressable>
            ) : null}
          </View>

          {/* ¿Vas? */}
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
                  style={({ pressed }) => [styles.opcion, activo ? { backgroundColor: t.text } : { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.75 }]}>
                  <Icono nombre={o.icono} tamano={13} color={activo ? t.background : t.textSecondary} peso="bold" />
                  <Texto v="detalle" style={{ fontWeight: '700', color: activo ? t.background : t.text }}>{tr(`evento.opcion.${o.id}`)}</Texto>
                </Pressable>
              );
            })}
          </View>
          {mio ? (
            <Pressable onPress={() => marcar(mio.estado, !mio.solo)} accessibilityRole="checkbox" accessibilityState={{ checked: mio.solo }} style={styles.casilla}>
              <View style={[styles.cajita, mio.solo ? { backgroundColor: t.accent, borderColor: t.accent } : { borderColor: t.chevron }]}>
                {mio.solo ? <Icono nombre="checkmark" tamano={11} color={t.onAccent} peso="bold" /> : null}
              </View>
              <Texto v="pie" secundario>{tr('evento.voySoloGrupo')}</Texto>
            </Pressable>
          ) : null}

          {/* Quién va. */}
          <Pressable
            onPress={token && hayGente ? () => setAsistentes(a!.van ? 'voy' : a!.talvez ? 'talvez' : 'previa') : undefined}
            disabled={!token || !hayGente}
            style={({ pressed }) => [styles.quienVa, pressed && { opacity: 0.6 }]}>
            {aqui.abierto && aqui.personas.length ? (
              <Caras personas={aqui.personas} tam={26} max={5} borde={t.background} />
            ) : a?.paisesTop.length ? (
              <Banderas codigos={a.paisesTop} alto={13} max={5} />
            ) : null}
            <View style={{ flex: 1 }}>
              <Texto v="detalle" style={{ fontWeight: '600' }} numberOfLines={1}>{resumen}</Texto>
              {aqui.abierto && aqui.total ? (
                <Texto v="pie" style={{ color: t.accentText, fontWeight: '700' }}>{tr('evento.aquiAhora', { count: aqui.total })}</Texto>
              ) : a && a.solos > 0 ? (
                <Texto v="pie" secundario>{`${tr('evento.vanSolos')}: ${a.solos}`}</Texto>
              ) : null}
            </View>
            {token && hayGente ? <Icono nombre="chevron.right" tamano={12} color={t.chevron} peso="bold" /> : null}
          </Pressable>

          {repite ? (
            <>
              <LoQueDicen datos={opiniones.datos} onResponder={() => (token ? setRespondiendo(true) : pedirSesion(tr, 'opinar', `/evento/${id}`))} />
              {/* Lo de Google va aparte y debajo de lo de Bora (en eventos de una fecha, en la info). */}
              {evento.lugarGoogle ? <View style={{ paddingTop: 22, paddingBottom: 10 }}><EnInternet lugar={evento.lugarGoogle} /></View> : null}
              <View style={[styles.pestanas, { borderBottomColor: t.separator }]}>
                {(['hilos', 'info'] as Pestana[]).map((p) => (
                  <Pressable key={p} onPress={() => setPestana(p)} accessibilityRole="tab" accessibilityState={{ selected: pestana === p }}
                    style={[styles.pestana, pestana === p && { borderBottomColor: t.accent }]}>
                    <Texto style={[styles.textoPestana, { color: pestana === p ? t.text : t.textSecondary }]}>
                      {p === 'info' ? tr('evento.info') : opiniones.hilos?.length ? `${tr('opiniones.hilos')} ${opiniones.hilos.length}` : tr('opiniones.hilos')}
                    </Texto>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {repite && pestana === 'hilos' ? (
            <Animated.View entering={FadeIn.duration(160)}>
              <ListaHilos
                eventoId={evento.id}
                token={token}
                hilos={opiniones.hilos}
                setHilos={opiniones.setHilos}
                orden={opiniones.orden}
                setOrden={opiniones.setOrden}
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeIn.duration(160)} style={{ gap: 18, paddingTop: 14 }}>
              {evento.descripcion ? <Texto v="detalle" style={{ fontSize: 15, lineHeight: 22 }}>{evento.descripcion}</Texto> : null}
              {evento.otrasFechas?.length ? (
                <View style={{ gap: 8 }}>
                  <Texto v="seccion" style={{ fontSize: 18 }}>{tr('evento.otrasFechas')}</Texto>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
                    {evento.otrasFechas.map((f) => (
                      <Pressable
                        key={f.id}
                        onPress={() => router.replace({ pathname: '/evento/[id]', params: { id: f.id } })}
                        style={({ pressed }) => [styles.otraFecha, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
                        <Texto v="mini" secundario style={{ fontWeight: '700' }}>{diaCorto(f.inicio)}</Texto>
                        <Texto style={styles.horaFecha}>{hora(f.inicio)}</Texto>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}
              {!repite && evento.lugarGoogle ? <EnInternet lugar={evento.lugarGoogle} /> : null}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.arriba, { top: insets.top + 8 }]}>
        <BotonFoto icono="chevron.left" etiqueta={tr('comun.volver')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <BotonFoto icono="square.and.arrow.up" etiqueta={tr('comun.compartir')} onPress={() => compartirEvento(evento.id, `${evento.titulo} · ${cuando} ${hora(evento.inicio)} · ${lugar}`)} />
      </View>

      <View style={[styles.barraInferior, { paddingBottom: Math.max(insets.bottom, 10), backgroundColor: t.background, borderTopColor: t.separator }]}>
        <View style={{ flex: 1 }}>
          <BotonPrincipal
            texto={evento.chatAbierto ? tr('evento.entrarChat') : tr('evento.chatAbre', { dia: diaCorto(evento.chatAbreEn) })}
            deshabilitado={!evento.chatAbierto}
            onPress={() => router.push({ pathname: '/evento/[id]/chat', params: { id: evento.id } })}
          />
        </View>
        {aqui.abierto && token ? (
          <Pressable
            onPress={alternarAqui}
            disabled={aqui.ocupado}
            accessibilityRole="button"
            accessibilityLabel={tr(aqui.mio ? 'evento.quitarAqui' : 'evento.marcarAqui')}
            accessibilityState={{ selected: aqui.mio }}
            style={({ pressed }) => [styles.botonAqui, aqui.mio ? { backgroundColor: t.sun } : { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.7 }]}>
            {aqui.ocupado ? <ActivityIndicator color={t.text} /> : (
              <Icono nombre={aqui.mio ? 'checkmark.circle.fill' : 'location.fill'} tamano={20} color={aqui.mio ? t.onSun : t.text} />
            )}
          </Pressable>
        ) : null}
      </View>
      <HojaResponder
        visible={respondiendo}
        datos={opiniones.datos}
        eventoId={evento.id}
        token={token}
        fechaInicial={responder}
        onCerrar={() => setRespondiendo(false)}
        onListo={opiniones.recargar}
      />
      <HojaAsistentes visible={Boolean(asistentes)} eventoId={evento.id} inicial={asistentes ?? 'voy'} onCerrar={() => setAsistentes(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  afiche: { minHeight: 300, justifyContent: 'flex-end', overflow: 'hidden' },
  aficheTexto: { padding: 16, paddingBottom: 14, gap: 8 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  etiqueta: { height: 19, paddingHorizontal: 6, borderRadius: 3, justifyContent: 'center' },
  titulo: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 38, lineHeight: 38, paddingRight: 3 },
  contenido: { paddingHorizontal: 16, width: '100%', alignSelf: 'center' },
  datos: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  divisor: { width: StyleSheet.hairlineWidth },
  precio: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  opciones: { flexDirection: 'row', gap: 6, marginTop: 14 },
  opcion: { flex: 1, height: 38, borderRadius: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  casilla: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  cajita: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  quienVa: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  pestanas: { flexDirection: 'row', gap: 22, borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 14 },
  pestana: { paddingBottom: 8, borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -StyleSheet.hairlineWidth },
  textoPestana: { fontFamily: FuenteTitulo.negrita, fontSize: 19, lineHeight: 22 },
  repite: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  otraFecha: { minWidth: 76, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  horaFecha: { fontFamily: FuenteTitulo.cursiva, fontSize: 20, lineHeight: 22, paddingRight: 1 },
  arriba: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  botonFoto: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(18,10,23,0.5)', alignItems: 'center', justifyContent: 'center' },
  barraInferior: {
    position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  botonAqui: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
