// Canales: un canal por evento. Abre 3 días antes y desaparece cuando el evento termina.
// Dos vistas: "Mis canales" (las salas donde ya entré, como la lista de chats de WhatsApp,
// para volver rápido y ver lo no leído) y "Explorar" (tarjetas con la foto del evento, filtro por fecha y buscador).
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banderas } from '@/components/bandera';
import { BotonArriba, EncabezadoCompacto, useDesplazamiento } from '@/components/desplazamiento';
import { BarraBusqueda, BotonCiudad, IconoVacio, TiraFechas } from '@/components/filtros';
import { HojaAcciones, type OpcionHoja } from '@/components/hoja-acciones';
import { FilaMiCanal, HojaElegirEvento, type MiCanal } from '@/components/mis-canales';
import { BotonTexto, Icono, Segmentado, Texto } from '@/components/ui';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Evento } from '@/lib/api';
import { crearBuscador } from '@/lib/buscar-eventos';
import { useCiudad } from '@/lib/ciudades';
import { claveDia, diaCorto, diasDesdeHoy, hora } from '@/lib/fechas';
import { refrescarNoLeidos, textoCuenta, useNoLeidos } from '@/lib/no-leidos';

const DIAS_ABREN_PRONTO = 7;
// Solo las primeras tarjetas entran animadas; con cientos de canales, el retraso escalonado
// hacía que las de más abajo tardaran segundos en aparecer.
const ANIMADAS = 6;

// Punto "en vivo" que late suavemente.
function PuntoVivo() {
  const t = useTheme();
  const aura = useSharedValue(0);
  useEffect(() => {
    aura.set(withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 0 })), -1));
  }, [aura]);
  const estiloAura = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - aura.value), transform: [{ scale: 1 + aura.value * 1.6 }] }));
  return (
    <View style={styles.puntoCaja}>
      <Animated.View style={[styles.punto, { backgroundColor: t.live }, estiloAura]} />
      <View style={[styles.punto, { backgroundColor: t.live }]} />
    </View>
  );
}

const TarjetaCanal = memo(function TarjetaCanal({ evento: e, indice }: { evento: Evento; indice: number }) {
  const { t: tr } = useTranslation();
  const nuevos = useNoLeidos()[e.id]?.total ?? 0;
  const abierto = e.chatAbierto;
  const a = e.asistencia;
  const abrir = () => abierto
    ? router.push({ pathname: '/evento/[id]/chat', params: { id: e.id } })
    : router.push({ pathname: '/evento/[id]', params: { id: e.id } });

  return (
    <Animated.View entering={indice < ANIMADAS ? FadeInDown.delay(50 * indice).duration(380).springify().damping(20) : undefined}>
      <Pressable onPress={abrir} style={({ pressed }) => [styles.tarjeta, !abierto && styles.tarjetaPronto, pressed && { transform: [{ scale: 0.98 }] }]}>
        {e.imagen ? <Image source={{ uri: e.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        <LinearGradient
          colors={abierto ? ['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.85)'] : ['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.35, 1]}
          style={StyleSheet.absoluteFill}
        />

        <BlurView intensity={40} tint="dark" style={styles.estado}>
          {abierto ? <PuntoVivo /> : <Icono nombre="calendar" tamano={12} color="#FFFFFF" />}
          <Texto v="pie" style={[styles.blanco, { fontWeight: '600' }]}>
            {abierto ? tr('canales.enVivo') : tr('canales.abre', { dia: diaCorto(e.chatAbreEn), hora: hora(e.chatAbreEn) })}
          </Texto>
        </BlurView>

        <View style={styles.pie}>
          <View style={{ flex: 1, gap: 6 }}>
            <Texto v="seccion" style={styles.blanco} numberOfLines={2}>{e.titulo}</Texto>
            <View style={styles.datos}>
              <Texto v="pie" style={[styles.blanco, { opacity: 0.85 }]}>
                {[`${diaCorto(e.inicio)} ${hora(e.inicio)}`, e.lugar ?? e.barrio].filter(Boolean).join(' · ')}
              </Texto>
            </View>
            {/* Quiénes ya llegaron al lugar ("Ya estoy aquí"): se actualiza al volver a esta pestaña. */}
            {abierto && (e.miAsistencia?.aqui || a?.aqui) ? (
              <View style={styles.datos}>
                <View style={[styles.aqui, e.miAsistencia?.aqui && styles.aquiMio]}>
                  <Icono nombre="location.fill" tamano={10} color={e.miAsistencia?.aqui ? '#000000' : '#FFFFFF'} />
                  <Texto v="pie" style={{ fontWeight: '700', color: e.miAsistencia?.aqui ? '#000000' : '#FFFFFF' }}>
                    {e.miAsistencia?.aqui ? tr('aqui.estas') : tr('aqui.enLugar', { count: a?.aqui ?? 0 })}
                  </Texto>
                </View>
                {e.miAsistencia?.aqui && (a?.aqui ?? 0) > 1 ? (
                  <Texto v="pie" style={[styles.blanco, { opacity: 0.85 }]}>{tr('aqui.enLugar', { count: a?.aqui ?? 0 })}</Texto>
                ) : null}
              </View>
            ) : null}
            {a && a.van > 0 ? (
              <View style={styles.datos}>
                <Banderas codigos={a.paisesTop} alto={11} max={5} />
                <Texto v="pie" style={[styles.blanco, { fontWeight: '600' }]}>{tr('agenda.van', { count: a.van })}</Texto>
              </View>
            ) : null}
          </View>
          {abierto && nuevos > 0 ? (
            <Animated.View
              entering={ZoomIn.springify().damping(14)}
              style={styles.nuevos}
              accessibilityLabel={tr('chat.nuevos', { count: nuevos })}>
              <Texto v="pie" style={styles.nuevosTexto}>{textoCuenta(nuevos)}</Texto>
            </Animated.View>
          ) : abierto ? (
            <BlurView intensity={40} tint="light" style={styles.flecha}>
              <Icono nombre="chevron.right" tamano={15} color="#FFFFFF" peso="semibold" />
            </BlurView>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

// La lista es plana (títulos de sección + tarjetas o filas) para poder virtualizarla.
type Fila =
  | { tipo: 'seccion'; clave: string; titulo: string; ayuda?: string }
  | { tipo: 'canal'; clave: string; evento: Evento; indice: number }
  | { tipo: 'mio'; clave: string; canal: MiCanal; ultima: boolean };
type Vista = 'mis' | 'explorar';

export default function CanalesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token, usuario } = useSesion();
  const { t: tr } = useTranslation();
  const ciudad = useCiudad();
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [consulta, setConsulta] = useState('');
  const [dia, setDia] = useState<string | null>(null);
  const [misCanalesApi, setMisCanales] = useState<MiCanal[] | null>(null);
  const misCanales = useMemo(() => (token ? misCanalesApi : []), [token, misCanalesApi]); // sin sesión no hay
  // Parte en "Mis canales" si ya estoy en alguno; si no, en "Explorar". Después la elige la persona.
  const [vista, setVista] = useState<Vista | null>(null);
  const vistaActual: Vista = vista ?? (misCanales?.length ? 'mis' : 'explorar');
  const [opciones, setOpciones] = useState<MiCanal | null>(null);
  const [eligiendoEvento, setEligiendoEvento] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { onScroll, medirBuscador, compacto, arriba } = useDesplazamiento();
  // Lista virtualizada: solo se dibujan las tarjetas cerca de la pantalla (puede haber cientos).
  const lista = useRef<FlatList<Fila>>(null);
  const subir = useCallback(() => lista.current?.scrollToOffset({ offset: 0, animated: true }), []);

  // Al cambiar de ciudad se limpia la pantalla y los filtros.
  const [ciudadVista, setCiudadVista] = useState(ciudad.id);
  if (ciudadVista !== ciudad.id) {
    setCiudadVista(ciudad.id);
    setEventos(null);
    setConsulta('');
    setDia(null);
  }

  // Canales abiertos y los que abren en los próximos días.
  useFocusEffect(useCallback(() => {
    // Solo los eventos con canal (abierto o que abre pronto): mucho menos que la agenda completa.
    api<{ eventos: Evento[] }>(`/events?ciudad=${ciudad.id}&canalesEnDias=${DIAS_ABREN_PRONTO + 1}`, { token })
      .then((r) => setEventos(r.eventos.filter((e) => e.chatAbierto || diasDesdeHoy(e.chatAbreEn) <= DIAS_ABREN_PRONTO)))
      .catch(() => setEventos([]));
    refrescarNoLeidos();
  }, [token, ciudad.id]));

  // Mis canales: al volver a la pestaña y cada vez que cambian los no leídos (para el último mensaje).
  const noLeidos = useNoLeidos();
  const totalNuevos = useMemo(() => Object.values(noLeidos).reduce((n, e) => n + e.total, 0), [noLeidos]);
  const cargarMisCanales = useCallback(() => {
    if (!token) return;
    api<{ canales: MiCanal[] }>('/me/canales', { token }).then((r) => setMisCanales(r.canales)).catch(() => setMisCanales((m) => m ?? []));
  }, [token]);
  useFocusEffect(cargarMisCanales);
  useEffect(() => { if (totalNuevos) cargarMisCanales(); }, [totalNuevos, cargarMisCanales]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2400);
    return () => clearTimeout(id);
  }, [aviso]);

  const abrirMiCanal = useCallback((c: MiCanal) => {
    router.push({ pathname: '/evento/[id]/chat', params: { id: c.eventoId, sala: c.sala } });
  }, []);

  const salir = async (c: MiCanal) => {
    // Se quita al instante; si falla, vuelve.
    setMisCanales((m) => m?.filter((x) => x.clave !== c.clave) ?? m);
    try {
      if (c.canal) await api(`/canales/${c.sala}/salir`, { metodo: 'POST', token });
      else await api(`/me/canales/${c.eventoId}?sala=${encodeURIComponent(c.sala)}`, { metodo: 'DELETE', token });
      refrescarNoLeidos();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
      cargarMisCanales();
    }
  };

  const opcionesDe = (c: MiCanal): OpcionHoja[] => [
    { texto: tr('canales.abrir'), icono: 'bubble.left.and.bubble.right', onPress: () => abrirMiCanal(c) },
    { texto: tr('canales.verEvento'), icono: 'calendar', onPress: () => router.push({ pathname: '/evento/[id]', params: { id: c.eventoId } }) },
    ...(c.canal?.esMio ? [] : [{ texto: tr('canales.salir'), icono: 'rectangle.portrait.and.arrow.right', destructiva: true, onPress: () => salir(c) }]),
  ];
  const mensajeOpciones = (c: MiCanal) => c.canal?.esMio
    ? tr('canales.creadorNoSale')
    : c.canal?.privado ? tr('canales.salirClave') : tr('canales.salirAyuda');

  // Crear un canal desde aquí: primero se elige el evento (solo los que tienen el chat abierto).
  const puedeCrear = Boolean(usuario?.puedeCrearCanales);
  const conChatAbierto = useMemo(() => (eventos ?? []).filter((e) => e.chatAbierto), [eventos]);
  const crearEn = (e: Evento) => {
    setEligiendoEvento(false);
    setTimeout(() => router.push({ pathname: '/evento/[id]/nuevo-canal', params: { id: e.id } }), Platform.OS === 'ios' ? 450 : 50);
  };

  const buscar = useMemo(() => crearBuscador(eventos ?? []), [eventos]);
  const buscando = consulta.trim().length >= 2;
  const diaDe = (e: Evento) => (diasDesdeHoy(e.inicio) < 0 ? claveDia(new Date().toISOString()) : claveDia(e.inicio));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const diasConEventos = useMemo(() => new Set((eventos ?? []).map(diaDe)), [eventos, ciudad.zona]);

  const { abiertos, pronto } = useMemo(() => {
    let lista = buscando ? buscar(consulta) : [...(eventos ?? [])];
    if (dia) lista = lista.filter((e) => diaDe(e) === dia);
    // Primero los que tienen mensajes nuevos; después los de eventos donde marqué que voy.
    const abiertos = lista.filter((e) => e.chatAbierto)
      .sort((a, b) => Number(Boolean(noLeidos[b.id])) - Number(Boolean(noLeidos[a.id]))
        || Number(Boolean(b.miAsistencia)) - Number(Boolean(a.miAsistencia)));
    return { abiertos, pronto: lista.filter((e) => !e.chatAbierto) };
  }, [buscando, buscar, consulta, eventos, dia, noLeidos]);

  const vacio = abiertos.length === 0 && pronto.length === 0;

  // Mis canales filtrados por el buscador (nombre del canal o del evento).
  const misFiltrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    const lista = misCanales ?? [];
    return q.length >= 2 ? lista.filter((c) => `${c.canal?.nombre ?? ''} ${c.evento.titulo}`.toLowerCase().includes(q)) : lista;
  }, [misCanales, consulta]);

  const filas = useMemo<Fila[]>(() => {
    const r: Fila[] = [];
    if (vistaActual === 'mis') {
      misFiltrados.forEach((c, i) => r.push({ tipo: 'mio', clave: c.clave, canal: c, ultima: i === misFiltrados.length - 1 }));
      return r;
    }
    if (abiertos.length) {
      r.push({ tipo: 'seccion', clave: 's-abiertos', titulo: tr('canales.abiertos') });
      abiertos.forEach((e, i) => r.push({ tipo: 'canal', clave: e.id, evento: e, indice: i }));
    }
    if (pronto.length) {
      r.push({ tipo: 'seccion', clave: 's-pronto', titulo: tr('canales.pronto'), ayuda: tr('canales.prontoAyuda') });
      pronto.forEach((e, i) => r.push({ tipo: 'canal', clave: e.id, evento: e, indice: abiertos.length + i }));
    }
    return r;
  }, [abiertos, pronto, tr, vistaActual, misFiltrados]);

  const nuevosEnMis = (misCanales ?? []).some((c) => (noLeidos[c.eventoId]?.salas[c.sala] ?? 0) > 0);

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <EncabezadoCompacto
        visible={compacto}
        titulo={tr('canales.titulo')}
        busqueda={{ valor: consulta, onCambio: setConsulta, placeholder: tr('canales.buscar') }}
      />
      <Animated.FlatList
        ref={lista}
        data={filas}
        keyExtractor={(f) => f.clave}
        renderItem={({ item: f, index }) => f.tipo === 'mio' ? (
          <FilaMiCanal
            c={f.canal}
            nuevos={noLeidos[f.canal.eventoId]?.salas[f.canal.sala] ?? 0}
            ultima={f.ultima}
            onAbrir={abrirMiCanal}
            onOpciones={setOpciones}
          />
        ) : f.tipo === 'seccion' ? (
          <View style={{ gap: 2, paddingHorizontal: 20, marginTop: index === 0 ? 22 : 16, marginBottom: 12 }}>
            <Texto v="seccion">{f.titulo}</Texto>
            {f.ayuda ? <Texto v="pie" secundario>{f.ayuda}</Texto> : null}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <TarjetaCanal evento={f.evento} indice={f.indice} />
          </View>
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + BottomTabInset + 24 }}
        ListHeaderComponent={
          <>
            <View style={{ paddingHorizontal: 20, gap: 10 }}>
              <View style={styles.filaCiudad}>
                <BotonCiudad />
                {puedeCrear ? (
                  <Pressable
                    onPress={() => setEligiendoEvento(true)}
                    accessibilityRole="button"
                    accessibilityLabel={tr('canales.crear')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.botonCrear, { backgroundColor: t.text }, pressed && { opacity: 0.7 }]}>
                    <Icono nombre="plus" tamano={14} color={t.background} peso="bold" />
                    <Texto v="pie" style={{ color: t.background, fontWeight: '700' }}>{tr('canales.crearCorto')}</Texto>
                  </Pressable>
                ) : null}
              </View>
              <View style={{ gap: 2 }}>
                <Texto v="tituloGrande">{tr('canales.titulo')}</Texto>
                {vistaActual === 'explorar' ? <Texto v="detalle" secundario>{tr('canales.explicacion')}</Texto> : null}
              </View>
              <Segmentado<Vista>
                opciones={[
                  { id: 'mis', texto: misCanales?.length ? `${tr('canales.misCanales')} · ${misCanales.length}` : tr('canales.misCanales') },
                  { id: 'explorar', texto: tr('canales.explorar') },
                ]}
                valor={vistaActual}
                onCambio={(v) => { setVista(v); setDia(null); }}
                marcas={{ mis: vistaActual !== 'mis' && nuevosEnMis }}
              />
            </View>
            <View style={{ paddingHorizontal: 20, marginTop: 10 }} onLayout={medirBuscador}>
              <BarraBusqueda valor={consulta} onCambio={setConsulta} placeholder={tr(vistaActual === 'mis' ? 'canales.buscarMios' : 'canales.buscar')} />
            </View>
            {vistaActual === 'explorar' ? (
              <View style={{ marginTop: 14 }}>
                <TiraFechas valor={dia} onCambio={setDia} diasConEventos={diasConEventos} dias={10} />
              </View>
            ) : <View style={{ height: 8 }} />}
          </>
        }
        ListFooterComponent={vistaActual === 'mis' && misFiltrados.length ? (
          <Texto v="pie" secundario style={styles.pieMios}>{tr('canales.mantenerParaSalir')}</Texto>
        ) : undefined}
        ListEmptyComponent={vistaActual === 'mis' ? (misCanales === null ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
          <View style={styles.vacio}>
            <IconoVacio nombre={consulta.trim() ? 'magnifyingglass' : 'bubble.left.and.bubble.right'} />
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>
              {consulta.trim() ? tr('agenda.sinResultados', { q: consulta.trim() }) : tr('canales.misVacio')}
            </Texto>
            {!consulta.trim() && <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('canales.misVacioAyuda')}</Texto>}
            {!consulta.trim() && <BotonTexto texto={tr('canales.explorar')} onPress={() => setVista('explorar')} />}
          </View>
        )) : eventos === null ? <ActivityIndicator style={{ marginTop: 40 }} /> : vacio ? (
          <View style={styles.vacio}>
            <IconoVacio nombre={buscando ? 'magnifyingglass' : 'bubble.left.and.bubble.right'} />
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>
              {buscando ? tr('agenda.sinResultados', { q: consulta.trim() }) : tr('canales.vacio', { ciudad: ciudad.nombre })}
            </Texto>
            {!buscando && <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('canales.vacioAyuda')}</Texto>}
            {dia ? <BotonTexto texto={tr('agenda.verTodasFechas')} onPress={() => setDia(null)} /> : null}
          </View>
        ) : undefined}
      />
      <BotonArriba visible={arriba} onPress={subir} />
      {aviso ? (
        <Animated.View entering={FadeInDown.duration(200)} style={[styles.aviso, { backgroundColor: t.text, bottom: insets.bottom + BottomTabInset + 16 }]}>
          <Texto v="pie" style={{ color: t.background, fontWeight: '600', textAlign: 'center' }}>{aviso}</Texto>
        </Animated.View>
      ) : null}
      <HojaAcciones
        visible={Boolean(opciones)}
        titulo={opciones ? opciones.canal?.nombre ?? opciones.evento.titulo : undefined}
        mensaje={opciones ? mensajeOpciones(opciones) : undefined}
        opciones={opciones ? opcionesDe(opciones) : []}
        onCerrar={() => setOpciones(null)}
      />
      <HojaElegirEvento
        visible={eligiendoEvento}
        eventos={conChatAbierto}
        ciudad={ciudad.nombre}
        onElegir={crearEn}
        onCerrar={() => setEligiendoEvento(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  blanco: { color: '#FFFFFF' },
  tarjeta: { height: 190, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end' },
  tarjetaPronto: { height: 150 },
  estado: {
    position: 'absolute', top: 12, left: 12, height: 28, paddingHorizontal: 11, borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  puntoCaja: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  punto: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  pie: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16 },
  datos: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aqui: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)' },
  aquiMio: { backgroundColor: '#FFFFFF' },
  // Mensajes nuevos: globo blanco con el número, como en WhatsApp.
  nuevos: { minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  nuevosTexto: { color: '#000000', fontWeight: '700' },
  flecha: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  filaCiudad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botonCrear: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  pieMios: { textAlign: 'center', marginTop: 16, paddingHorizontal: 32 },
  aviso: { position: 'absolute', left: 24, right: 24, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
  vacio: { marginTop: 48, alignItems: 'center', gap: 10, paddingHorizontal: 32 },
});
