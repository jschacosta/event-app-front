// Opiniones de fiestas que se repiten (compartidas por todas sus fechas):
// - "Lo que dicen": respuestas rápidas de quienes fueron (Sí / Más o menos / No), en barras.
// - Hilos: preguntas y relatos para explayarse, con votos como en Reddit.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, SlideInDown, SlideOutDown, useAnimatedStyle, useSharedValue, withDelay, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Image } from 'expo-image';

import { Bandera } from '@/components/bandera';
import { BotonPrincipal, BotonTexto, Icono, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor } from '@/lib/api';
import { claveDia, diaMes, diasHastaClave, haceTiempo } from '@/lib/fechas';
import { cancelarAvisoLocal } from '@/lib/notificaciones';
import { pedirSesion } from '@/lib/pedir-sesion';

export type Respuesta = 'si' | 'mas' | 'no';
type Conteo = { si: number; mas: number; no: number; total: number };
type ConteoFecha = Conteo & { id: string; inicio: string };
type Nivel = { pct: number; total: number; nivel: 'muy' | 'recomendada' | 'variada' | 'poco' } | null;
export type Resumen = Conteo & {
  pregunta: string;
  reciente: Conteo | null; // solo las últimas fechas (null si hay pocas respuestas)
  cambio: { antes: number; ahora: number } | null; // % de "sí" antes y en las últimas fechas
  historia: ConteoFecha[]; // de la fecha más vieja a la más nueva
};
export type DatosOpiniones = {
  personas: number; fueron: number; resumen: Resumen[];
  veredicto: { todas: Nivel; recientes: Nivel; historia: ConteoFecha[] };
  misFechas: Record<string, Record<string, Respuesta>>; // mis respuestas por fecha (id del evento)
  fechas: { id: string; inicio: string }[]; sugerida: string | null;
  preguntas: string[]; minimo: number; recientes: number;
};
export type HiloResumen = {
  id: string; titulo: string; texto: string; autor: Autor | null; fue: boolean; puntaje: number; respuestas: number; miVoto: number; creado: string;
};

const VISIBLES = 4;
const RESPUESTAS: Respuesta[] = ['si', 'mas', 'no'];

export { pedirSesion } from '@/lib/pedir-sesion';

// Se recarga cada vez que la pantalla vuelve a verse (por ejemplo, al volver de un hilo).
export function useOpiniones(eventoId: string, token: string | null, activo: boolean) {
  const [datos, setDatos] = useState<DatosOpiniones | null>(null);
  const [hilos, setHilos] = useState<HiloResumen[] | null>(null);
  const [orden, setOrden] = useState<'mejores' | 'nuevas'>('mejores');
  const cargar = useCallback(async () => {
    if (!activo) return;
    try {
      const [d, h] = await Promise.all([
        api<DatosOpiniones>(`/events/${eventoId}/opiniones`, { token }),
        api<{ hilos: HiloResumen[] }>(`/events/${eventoId}/hilos?orden=${orden}`, { token }),
      ]);
      setDatos(d);
      setHilos(h.hilos);
    } catch {
      setHilos((x) => x ?? []);
    }
  }, [eventoId, token, activo, orden]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));
  return { datos, hilos, setHilos, orden, setOrden, recargar: cargar };
}

// ---------- Lo que dicen ----------

function porcentaje(r: Resumen, k: Respuesta) {
  return r.total ? Math.round((r[k] / r.total) * 100) : 0;
}

// Barra de tres tramos (sí, más o menos, no) que crece al aparecer, una pregunta tras otra.
function Barra({ r, orden }: { r: Resumen; orden: number }) {
  const t = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(80 + orden * 70, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) })));
  }, [p, orden]);
  const crece = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={[styles.barra, { backgroundColor: t.backgroundElement }]}>
      <Animated.View style={[styles.barraLlena, crece]}>
        {r.si ? <View style={{ flex: r.si, backgroundColor: t.accent }} /> : null}
        {r.mas ? <View style={{ flex: r.mas, backgroundColor: t.accentSoftText, opacity: 0.45 }} /> : null}
        {r.no ? <View style={{ flex: r.no, backgroundColor: t.backgroundSelected }} /> : null}
      </Animated.View>
    </View>
  );
}

// Historial por fecha (como el gráfico de reseñas de Steam): una columna por fecha con el % de "sí".
// Al tocar una columna se ve esa fecha.
function Historia({ fechas, alto = 30 }: { fechas: ConteoFecha[]; alto?: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [elegida, setElegida] = useState<string | null>(null);
  const vista = fechas.find((f) => f.id === elegida);
  return (
    <View style={{ gap: 4 }}>
      <View style={[styles.columnas, { height: alto }]}>
        {fechas.map((f, i) => (
          <Pressable key={f.id} onPress={() => setElegida(elegida === f.id ? null : f.id)} hitSlop={4} accessibilityLabel={diaMes(f.inicio)} style={styles.columnaToque}>
            <Columna pct={f.total ? f.si / f.total : 0} vacia={!f.total} alto={alto} orden={i} activa={elegida === f.id} color={t.accent} fondo={t.backgroundSelected} />
          </Pressable>
        ))}
      </View>
      <Texto v="mini" secundario style={{ fontWeight: '600' }} numberOfLines={1}>
        {vista
          ? (vista.total ? tr('opiniones.enFecha', { fecha: diaMes(vista.inicio), pct: Math.round((vista.si / vista.total) * 100), count: vista.total }) : tr('opiniones.sinDatosFecha', { fecha: diaMes(vista.inicio) }))
          : tr('opiniones.porFecha')}
      </Texto>
    </View>
  );
}

function Columna({ pct, vacia, alto, orden, activa, color, fondo }: { pct: number; vacia: boolean; alto: number; orden: number; activa: boolean; color: string; fondo: string }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(100 + orden * 45, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
  }, [p, orden]);
  const crece = useAnimatedStyle(() => ({ height: Math.max(3, p.value * pct * alto) }));
  return (
    <View style={[styles.columna, { height: alto }]}>
      {vacia ? <View style={[styles.columnaVacia, { backgroundColor: fondo }]} /> : (
        <Animated.View style={[styles.columnaLlena, { backgroundColor: color, opacity: activa ? 1 : 0.8 }, activa && styles.columnaActiva, crece]} />
      )}
    </View>
  );
}

// Veredicto general como en Steam: "Muy recomendada" según cuántos volverían, y aparte las últimas fechas.
function Veredicto({ v, recientes }: { v: DatosOpiniones['veredicto']; recientes: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  if (!v.todas) return null;
  const color = (n: NonNullable<Nivel>['nivel']) => (n === 'muy' || n === 'recomendada' ? t.accentText : n === 'poco' ? t.danger : t.text);
  return (
    <View style={styles.veredicto}>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto style={[styles.nivel, { color: color(v.todas.nivel) }]}>{tr(`opiniones.nivel.${v.todas.nivel}`)}</Texto>
        <Texto v="pie" secundario>{tr('opiniones.volveria', { pct: v.todas.pct, count: v.todas.total })}</Texto>
        {v.recientes ? (
          <View style={styles.recientes}>
            <Texto v="pie" secundario>{tr('opiniones.ultimasFechas', { count: recientes })}</Texto>
            <Texto v="pie" style={{ fontWeight: '700', color: color(v.recientes.nivel) }}>
              {`${tr(`opiniones.nivel.${v.recientes.nivel}`)} ${v.recientes.pct}%`}
            </Texto>
          </View>
        ) : null}
      </View>
      <View style={{ width: 128 }}>
        <Historia fechas={v.historia} alto={34} />
      </View>
    </View>
  );
}

// Detalle de una pregunta al tocarla: cuántas personas respondieron y cómo se reparten,
// con una barra por respuesta que crece desde cero.
function TramoDetalle({ r, k, orden }: { r: Resumen; k: Respuesta; orden: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(60 + orden * 60, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
  }, [p, orden]);
  const pct = porcentaje(r, k);
  const crece = useAnimatedStyle(() => ({ width: `${p.value * pct}%` }));
  const color = k === 'si' ? t.accent : k === 'mas' ? t.accentSoftText : t.textSecondary;
  return (
    <View style={styles.tramo}>
      <Texto v="pie" style={{ width: 86, fontWeight: '600' }} numberOfLines={1}>{tr(`opiniones.respuesta.${k}`)}</Texto>
      <View style={[styles.tramoBarra, { backgroundColor: t.backgroundElement }]}>
        <Animated.View style={[styles.tramoLleno, { backgroundColor: color, opacity: k === 'mas' ? 0.6 : 1 }, crece]} />
      </View>
      <Texto style={[styles.tramoCifra, { color: t.text }]}>{`${pct}%`}</Texto>
      <Texto v="pie" secundario style={{ width: 28, textAlign: 'right' }}>{r[k]}</Texto>
    </View>
  );
}

export function LoQueDicen({ datos, onResponder }: { datos: DatosOpiniones | null; onResponder: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [todas, setTodas] = useState(false);
  const [abierta, setAbierta] = useState<string | null>(null);
  if (!datos) return <View style={{ height: 120 }} />;
  const lista = todas ? datos.resumen : datos.resumen.slice(0, VISIBLES);
  return (
    <Animated.View layout={LinearTransition.duration(220)} style={styles.loQueDicen}>
      <View style={styles.cabeza}>
        <Texto v="seccion">{tr('opiniones.loQueDicen')}</Texto>
        {datos.personas ? (
          <Texto v="pie" secundario>{tr('opiniones.personas', { count: datos.personas, fueron: datos.fueron })}</Texto>
        ) : null}
      </View>
      <Veredicto v={datos.veredicto} recientes={datos.recientes} />
      {lista.length === 0 ? (
        <Texto v="detalle" secundario>{tr('opiniones.pocasRespuestas', { n: datos.minimo })}</Texto>
      ) : lista.map((r, i) => {
        const gana = RESPUESTAS.reduce((a, b) => (r[b] > r[a] ? b : a));
        const abiertaEsta = abierta === r.pregunta;
        return (
          <Animated.View key={r.pregunta} layout={LinearTransition.duration(220)}>
            <Pressable
              onPress={() => setAbierta(abiertaEsta ? null : r.pregunta)}
              accessibilityRole="button"
              accessibilityState={{ expanded: abiertaEsta }}
              accessibilityHint={tr('opiniones.verDetalle')}
              style={({ pressed }) => [styles.pregunta, abiertaEsta && { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.7 }]}>
              <Texto v="detalle" style={{ flex: 1, lineHeight: 18, fontWeight: abiertaEsta ? '600' : '400' }}>{tr(`opiniones.preguntas.${r.pregunta}`)}</Texto>
              <Barra r={r} orden={i} />
              <Texto style={[styles.gana, { color: gana === 'si' ? t.accentText : t.text }]} numberOfLines={1}>
                {`${tr(`opiniones.corta.${gana}`)} ${porcentaje(r, gana)}%`}
              </Texto>
            </Pressable>
            {r.cambio ? (
              <View style={styles.cambio}>
                <Icono nombre={r.cambio.ahora > r.cambio.antes ? 'arrow.up' : 'arrow.down'} tamano={11} color={t.accentText} peso="bold" />
                <Texto v="mini" style={{ fontWeight: '700', color: t.accentText }}>
                  {tr('opiniones.cambio', { ahora: r.cambio.ahora, antes: r.cambio.antes })}
                </Texto>
              </View>
            ) : null}
            {abiertaEsta ? (
              <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={[styles.detalle, { borderLeftColor: t.accent }]}>
                <Texto v="pie" secundario style={{ fontWeight: '600', marginBottom: 2 }}>{tr('opiniones.respondieron', { count: r.total })}</Texto>
                {RESPUESTAS.map((k, j) => <TramoDetalle key={k} r={r} k={k} orden={j} />)}
                {r.historia.length > 1 ? <View style={{ marginTop: 6, width: 180 }}><Historia fechas={r.historia} /></View> : null}
              </Animated.View>
            ) : null}
          </Animated.View>
        );
      })}
      <View style={styles.acciones}>
        {datos.resumen.length > VISIBLES ? (
          <BotonTexto texto={todas ? tr('opiniones.verMenos') : tr('opiniones.verTodas', { count: datos.resumen.length })} onPress={() => setTodas(!todas)} />
        ) : <View />}
        <Pressable onPress={onResponder} accessibilityRole="button" style={({ pressed }) => [styles.responder, { backgroundColor: t.accentSoft }, pressed && { opacity: 0.7 }]}>
          <Icono nombre={Object.keys(datos.misFechas).length ? 'pencil' : 'checkmark'} tamano={13} color={t.accentSoftText} peso="bold" />
          <Texto v="pie" style={{ fontWeight: '700', color: t.accentSoftText }}>{tr(Object.keys(datos.misFechas).length ? 'opiniones.responderOtra' : 'opiniones.fuiResponder')}</Texto>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// Hoja para responder las preguntas: un toque por pregunta; tocar la misma respuesta la quita.
export function HojaResponder({ visible, datos, eventoId, token, fechaInicial, onCerrar, onListo }: {
  visible: boolean; datos: DatosOpiniones | null; eventoId: string; token: string | null; fechaInicial?: string | null; onCerrar: () => void; onListo: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [elegidas, setElegidas] = useState<Record<string, Respuesta | null>>({});
  const [fecha, setFecha] = useState<string | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const elegirFecha = (id: string | null) => {
    setFecha(id);
    setElegidas((id && datos?.misFechas[id]) || {});
  };
  if (visible !== abierta) {
    setAbierta(visible);
    if (visible) elegirFecha((fechaInicial && datos?.fechas.some((f) => f.id === fechaInicial) ? fechaInicial : null) ?? datos?.sugerida ?? null);
  }
  const guardar = async () => {
    setGuardando(true);
    try {
      await api(`/events/${eventoId}/opiniones`, { metodo: 'PUT', token, body: { fecha, respuestas: elegidas } });
      if (fecha) cancelarAvisoLocal(fecha);
      onListo();
      onCerrar();
    } catch (e) {
      const texto = e instanceof Error ? e.message : '';
      if (Platform.OS === 'web') globalThis.alert?.(texto);
      else Alert.alert(tr('evento.noSePudoGuardar'), texto);
    } finally {
      setGuardando(false);
    }
  };
  const contestadas = Object.values(elegidas).filter(Boolean).length;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible ? (
        <View style={styles.contenedorHoja}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(240)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={styles.cabezaHoja}>
              <BotonTexto texto={tr('comun.cancelar')} onPress={onCerrar} />
              <Texto v="cuerpoFuerte">{tr('opiniones.comoEstuvo')}</Texto>
              <View style={{ width: 70 }} />
            </View>
            <Texto v="pie" secundario style={{ marginBottom: 8 }}>{tr('opiniones.ayudaResponder')}</Texto>
            <Texto v="detalle" style={{ fontWeight: '600', marginBottom: 6 }}>{tr('opiniones.queFecha')}</Texto>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} style={{ flexGrow: 0, flexShrink: 0, minHeight: 32, marginBottom: 14 }}>
              {(datos?.fechas ?? []).map((f) => {
                const activa = fecha === f.id;
                const respondida = Boolean(datos?.misFechas[f.id]);
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => elegirFecha(f.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activa }}
                    style={({ pressed }) => [styles.fecha, { backgroundColor: activa ? t.text : t.backgroundElement }, pressed && { opacity: 0.75 }]}>
                    <Texto v="pie" style={{ fontWeight: '700', color: activa ? t.background : t.text }}>{diaMes(f.inicio)}</Texto>
                    {respondida ? <Icono nombre="checkmark" tamano={10} color={activa ? t.background : t.accentText} peso="bold" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 14 }}>
              {(datos?.preguntas ?? []).map((p) => (
                <View key={p} style={{ gap: 6 }}>
                  <Texto v="detalle" style={{ fontWeight: '600' }}>{tr(`opiniones.preguntas.${p}`)}</Texto>
                  <View style={styles.tres}>
                    {RESPUESTAS.map((r) => {
                      const activa = elegidas[p] === r;
                      return (
                        <Pressable
                          key={r}
                          onPress={() => setElegidas((e) => ({ ...e, [p]: activa ? null : r }))}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: activa }}
                          style={({ pressed }) => [styles.opcionHoja, { backgroundColor: activa ? t.accent : t.backgroundElement }, pressed && { opacity: 0.75 }]}>
                          <Texto v="pie" style={{ fontWeight: '700', color: activa ? t.onAccent : t.text }}>{tr(`opiniones.respuesta.${r}`)}</Texto>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <BotonPrincipal texto={tr('opiniones.guardar', { count: contestadas })} onPress={guardar} ocupado={guardando} deshabilitado={!contestadas || !fecha} />
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

// ---------- Votos ----------

export function Votos({ puntaje, miVoto, onVotar, horizontal }: { puntaje: number; miVoto: number; onVotar: (v: number) => void; horizontal?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const salto = useSharedValue(1);
  const estilo = useAnimatedStyle(() => ({ transform: [{ scale: salto.value }] }));
  const votar = (v: number) => {
    salto.set(withTiming(1.25, { duration: 90 }, () => { salto.set(withTiming(1, { duration: 140 })); }));
    onVotar(miVoto === v ? 0 : v);
  };
  const color = miVoto === 1 ? t.accentText : miVoto === -1 ? t.textSecondary : t.text;
  return (
    <View style={[horizontal ? styles.votosFila : styles.votosColumna]}>
      <Pressable onPress={() => votar(1)} hitSlop={6} accessibilityLabel={tr('opiniones.votarArriba')} accessibilityState={{ selected: miVoto === 1 }}>
        <Icono nombre="arrow.up" tamano={horizontal ? 15 : 17} color={miVoto === 1 ? t.accentText : t.textSecondary} peso="bold" />
      </Pressable>
      <Animated.Text style={[styles.puntaje, { color }, estilo]}>{puntaje}</Animated.Text>
      <Pressable onPress={() => votar(-1)} hitSlop={6} accessibilityLabel={tr('opiniones.votarAbajo')} accessibilityState={{ selected: miVoto === -1 }}>
        <Icono nombre="arrow.down" tamano={horizontal ? 15 : 17} color={miVoto === -1 ? t.text : t.textSecondary} peso="bold" />
      </Pressable>
    </View>
  );
}

// Aplica el voto en pantalla al tiro y después lo confirma con el servidor.
export async function votarEn(ruta: string, token: string | null, valor: number) {
  return api<{ puntaje: number; miVoto: number }>(ruta, { metodo: 'POST', token, body: { valor } });
}

export function nuevoPuntaje(puntaje: number, antes: number, despues: number) {
  return puntaje - antes + despues;
}

// ---------- Hilos ----------

// Quién escribió: bandera, nombre, sello "fue" (marcó Estoy aquí en alguna fecha) y hace cuánto.
export function Autoria({ autor, fue, creado }: { autor: Autor | null; fue: boolean; creado: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={styles.autoria}>
      {autor?.pais ? <Bandera codigo={autor.pais} alto={10} /> : null}
      <Texto v="pie" style={{ fontWeight: '600' }} numberOfLines={1}>{autor?.eliminada ? tr('cuentaEliminada') : autor?.nombreVisible ?? tr('opiniones.anonimo')}</Texto>
      {fue ? (
        <View style={[styles.fue, { backgroundColor: t.sun }]}>
          <Texto v="mini" style={{ color: t.onSun, fontWeight: '800' }}>{tr('opiniones.fue')}</Texto>
        </View>
      ) : null}
      <Texto v="pie" secundario>{haceTiempo(creado)}</Texto>
    </View>
  );
}

function FilaHilo({ hilo, eventoId, onVotar }: { hilo: HiloResumen; eventoId: string; onVotar: (v: number) => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/evento/[id]/hilo/[hiloId]', params: { id: eventoId, hiloId: hilo.id } })}
      style={({ pressed }) => [styles.filaHilo, pressed && { backgroundColor: t.backgroundElement }]}>
      <Votos puntaje={hilo.puntaje} miVoto={hilo.miVoto} onVotar={onVotar} />
      <View style={{ flex: 1, gap: 3 }}>
        <Texto v="cuerpoFuerte" style={{ fontSize: 15, lineHeight: 19 }} numberOfLines={2}>{hilo.titulo}</Texto>
        {hilo.texto ? <Texto v="pie" secundario numberOfLines={2}>{hilo.texto}</Texto> : null}
        <View style={styles.pieHilo}>
          <Autoria autor={hilo.autor} fue={hilo.fue} creado={hilo.creado} />
          <View style={styles.cuentaRespuestas}>
            <Icono nombre="bubble.left" tamano={12} color={t.textSecondary} />
            <Texto v="pie" secundario style={{ fontWeight: '600' }}>{hilo.respuestas}</Texto>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export function ListaHilos({ eventoId, token, hilos, setHilos, orden, setOrden }: {
  eventoId: string; token: string | null;
  hilos: HiloResumen[] | null; setHilos: (f: (h: HiloResumen[] | null) => HiloResumen[] | null) => void;
  orden: 'mejores' | 'nuevas'; setOrden: (o: 'mejores' | 'nuevas') => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const votar = async (h: HiloResumen, valor: number) => {
    if (!token) return pedirSesion(tr, 'opinar', `/evento/${eventoId}`);
    setHilos((lista) => lista?.map((x) => (x.id === h.id ? { ...x, miVoto: valor, puntaje: nuevoPuntaje(x.puntaje, x.miVoto, valor) } : x)) ?? null);
    try {
      const r = await votarEn(`/hilos/${h.id}/voto`, token, valor);
      setHilos((lista) => lista?.map((x) => (x.id === h.id ? { ...x, ...r } : x)) ?? null);
    } catch {
      setHilos((lista) => lista?.map((x) => (x.id === h.id ? h : x)) ?? null);
    }
  };
  const escribir = () => {
    if (!token) return pedirSesion(tr, 'opinar', `/evento/${eventoId}`);
    router.push({ pathname: '/evento/[id]/hilo/nuevo', params: { id: eventoId } });
  };
  return (
    <View style={{ paddingTop: 10 }}>
      <View style={styles.cabezaHilos}>
        <View style={styles.orden}>
          {(['mejores', 'nuevas'] as const).map((o) => (
            <Pressable key={o} onPress={() => setOrden(o)} accessibilityRole="tab" accessibilityState={{ selected: orden === o }} hitSlop={6}>
              <Texto v="pie" style={{ fontWeight: '700', color: orden === o ? t.text : t.textSecondary }}>{tr(`opiniones.orden.${o}`)}</Texto>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={escribir} accessibilityRole="button" style={({ pressed }) => [styles.escribir, { backgroundColor: t.text }, pressed && { opacity: 0.75 }]}>
          <Icono nombre="pencil" tamano={12} color={t.background} peso="bold" />
          <Texto v="pie" style={{ fontWeight: '700', color: t.background }}>{tr('opiniones.escribir')}</Texto>
        </Pressable>
      </View>
      {hilos === null ? <View style={{ height: 80 }} /> : hilos.length === 0 ? (
        <View style={styles.vacio}>
          <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('opiniones.sinHilos')}</Texto>
          <Texto v="pie" secundario style={{ textAlign: 'center' }}>{tr('opiniones.sinHilosAyuda')}</Texto>
        </View>
      ) : hilos.map((h) => <FilaHilo key={h.id} hilo={h} eventoId={eventoId} onVotar={(v) => votar(h, v)} />)}
    </View>
  );
}

// ---------- Aviso "¿Cómo estuvo?" en la agenda ----------
// Después de ir (o decir que iba) a una fecha de una fiesta que se repite, durante unos días aparece
// arriba de la agenda. "Responder" abre el evento con las preguntas de esa fecha ya elegida.
type Pendiente = { eventoId: string; titulo: string; inicio: string; imagen: string | null; lugar: string | null; fue: boolean };

function cuandoFue(inicio: string, tr: (k: string, o?: Record<string, unknown>) => string) {
  const d = diasHastaClave(claveDia(inicio));
  if (d === 0) return tr('opiniones.aviso.hoy');
  if (d === -1) return tr('opiniones.aviso.anoche');
  return tr('opiniones.aviso.elDia', { fecha: diaMes(inicio) });
}

export function AvisoComoEstuvo({ token }: { token: string | null }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  useFocusEffect(useCallback(() => {
    if (!token) { setPendiente(null); return; }
    api<{ pendiente: Pendiente | null }>('/me/opinion-pendiente', { token })
      .then((r) => setPendiente(r.pendiente))
      .catch(() => setPendiente(null));
  }, [token]));
  if (!pendiente) return null;
  const p = pendiente;
  const descartar = () => {
    setPendiente(null);
    api(`/me/opinion-pendiente/${p.eventoId}/descartar`, { metodo: 'POST', token }).catch(() => {});
  };
  const responder = () => router.push({ pathname: '/evento/[id]', params: { id: p.eventoId, responder: p.eventoId } });
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(150)} style={[styles.aviso, { backgroundColor: t.accentSoft }]}>
      <Pressable onPress={responder} accessibilityRole="button" style={styles.avisoCuerpo}>
        {p.imagen ? <Image source={{ uri: p.imagen }} style={styles.avisoFoto} contentFit="cover" /> : null}
        <View style={{ flex: 1, gap: 2 }}>
          <Texto style={[styles.avisoTitulo, { color: t.accentSoftText }]}>{tr('opiniones.comoEstuvo')}</Texto>
          <Texto v="detalle" style={{ color: t.text }}>
            {tr(p.fue ? 'opiniones.aviso.fuiste' : 'opiniones.aviso.ibas', { titulo: p.titulo, cuando: cuandoFue(p.inicio, tr) })}
          </Texto>
          <View style={styles.avisoAcciones}>
            <View style={[styles.avisoBoton, { backgroundColor: t.accent }]}>
              <Texto v="pie" style={{ color: t.onAccent, fontWeight: '700' }}>{tr('opiniones.aviso.responder')}</Texto>
            </View>
            <Pressable onPress={descartar} hitSlop={8} accessibilityRole="button">
              {({ pressed }) => <Texto v="pie" secundario style={{ fontWeight: '600', opacity: pressed ? 0.5 : 1 }}>{tr('opiniones.aviso.noPreguntar')}</Texto>}
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  aviso: { marginHorizontal: 16, marginBottom: 12, borderRadius: 6, overflow: 'hidden' },
  avisoCuerpo: { flexDirection: 'row', gap: 12, padding: 12 },
  avisoFoto: { width: 56, height: 72, borderRadius: 4 },
  avisoTitulo: { fontFamily: FuenteTitulo.cursiva, fontSize: 22, lineHeight: 24, paddingRight: 2 },
  avisoAcciones: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 8 },
  avisoBoton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 4 },
  loQueDicen: { gap: 4, paddingTop: 16, paddingBottom: 6 },
  cabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 2 },
  pregunta: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 30, paddingVertical: 4, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 6 },
  detalle: { gap: 6, marginLeft: 2, marginTop: 4, marginBottom: 6, paddingLeft: 10, borderLeftWidth: 2 },
  tramo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  veredicto: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingVertical: 8, marginBottom: 4 },
  nivel: { fontFamily: FuenteTitulo.cursiva, fontSize: 28, lineHeight: 30, paddingRight: 3 },
  recientes: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  columnas: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  columnaToque: { flex: 1 },
  columna: { justifyContent: 'flex-end' },
  columnaLlena: { borderRadius: 2 },
  columnaActiva: { borderWidth: 1.5, borderColor: '#FFFFFF' },
  columnaVacia: { height: 3, borderRadius: 2 },
  cambio: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -2, marginBottom: 2 },
  fecha: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 11, borderRadius: 6 },
  tramoBarra: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  tramoLleno: { height: '100%', borderRadius: 4 },
  tramoCifra: { width: 40, textAlign: 'right', fontFamily: FuenteTitulo.negrita, fontSize: 15, lineHeight: 18 },
  barra: { width: 64, height: 6, borderRadius: 3, overflow: 'hidden' },
  barraLlena: { height: '100%', flexDirection: 'row' },
  gana: { width: 74, textAlign: 'right', fontFamily: FuenteTitulo.negrita, fontSize: 15, lineHeight: 18 },
  acciones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  responder: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 6 },
  contenedorHoja: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.4)' },
  hoja: { maxHeight: '88%', borderTopLeftRadius: 14, borderTopRightRadius: 14, paddingHorizontal: 16, paddingTop: 10, width: '100%', maxWidth: 560, alignSelf: 'center' },
  cabezaHoja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 44 },
  tres: { flexDirection: 'row', gap: 6 },
  opcionHoja: { flex: 1, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  votosColumna: { width: 34, alignItems: 'center', gap: 2, paddingTop: 1 },
  votosFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  puntaje: { fontFamily: FuenteTitulo.extra, fontSize: 16, lineHeight: 18, minWidth: 14, textAlign: 'center' },
  autoria: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  fue: { height: 15, paddingHorizontal: 4, borderRadius: 3, justifyContent: 'center' },
  filaHilo: { flexDirection: 'row', gap: 8, paddingVertical: 12, paddingRight: 4, marginHorizontal: -8, paddingLeft: 4, borderRadius: 6 },
  pieHilo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 3 },
  cuentaRespuestas: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cabezaHilos: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  orden: { flexDirection: 'row', gap: 16 },
  escribir: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 11, borderRadius: 6 },
  vacio: { alignItems: 'center', gap: 6, paddingVertical: 24, paddingHorizontal: 16 },
});
