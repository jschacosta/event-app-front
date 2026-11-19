import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, type FlatList } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banderas } from '@/components/bandera';
import { HojaCalendario } from '@/components/calendario';
import { BotonArriba, EncabezadoCompacto, useDesplazamiento } from '@/components/desplazamiento';
import { BarraBusqueda, BotonCiudad, FilaGeneros, IconoVacio, TiraFechas } from '@/components/filtros';
import { AvisoComoEstuvo } from '@/components/opiniones';
import { BotonTexto, Icono, Texto } from '@/components/ui';
import { API_URL } from '@/config/api';
import { BottomTabInset, FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Evento } from '@/lib/api';
import { crearBuscador } from '@/lib/buscar-eventos';
import { guardarEventos } from '@/lib/eventos-cache';
import { agruparSeries } from '@/lib/series';
import { useCiudad } from '@/lib/ciudades';
import { claveDia, diaCorto, diasDesdeHoy, diasHastaClave, encabezadoDia, fechaDeClave, hora, precioTexto } from '@/lib/fechas';
import { colorEtiquetaGenero, GENEROS, nombreGenero } from '@/lib/generos';

// Agenda de Bora, armada como un line-up: el número del día va grande en su propia columna,
// con una línea que une los eventos de ese día, y cada fila dice qué, a qué hora, dónde, cuánto y quién va.
// Arriba: ciudad, tus tarjetas de géneros, las fechas y una tira con TODO lo que está en vivo ahora.
const POR_DIA = 6;

function abrir(e: Evento) {
  router.push({ pathname: '/evento/[id]', params: { id: e.id } });
}

// Tarjeta de la tira "Ahora": todos los eventos en curso, uno al lado del otro.
const TarjetaAhora = memo(function TarjetaAhora({ evento }: { evento: Evento }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const a = evento.asistencia;
  return (
    <Pressable onPress={() => abrir(evento)} style={({ pressed }) => [styles.ahora, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.8 }]}>
      <View style={[styles.fotoAhora, { backgroundColor: t.backgroundSelected }]}>
        {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={[styles.vivo, { backgroundColor: t.sun }]}>
          <Texto v="mini" style={{ color: t.onSun, fontWeight: '800' }}>{tr('agenda.enVivo')}</Texto>
          <Texto v="mini" style={{ color: t.onSun, fontWeight: '600' }}>{tr('agenda.hastaCorto', { hora: hora(evento.fin) })}</Texto>
        </View>
        <Texto v="detalle" numberOfLines={2} style={{ fontWeight: '700', lineHeight: 17 }}>{evento.titulo}</Texto>
        <Texto v="pie" secundario numberOfLines={1}>
          {a && a.van > 0 ? tr('agenda.van', { count: a.van }) : evento.barrio ?? evento.lugar ?? ''}
        </Texto>
      </View>
    </Pressable>
  );
});

// Fila del line-up: foto | nombre; hora y lugar; precio; género y quién va. Sin rayas entre filas:
// las separa el aire. En el buscador (conDia) la fecha va delante de la hora.
const FilaLineup = memo(function FilaLineup({ evento, repeticiones, conDia }: { evento: Evento; repeticiones: number; conDia?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const a = evento.asistencia;
  const genero = evento.generos[0];
  const precio = precioTexto(evento.precioDesde);
  return (
    <Pressable onPress={() => abrir(evento)} style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundElement }]}>
      <View style={[styles.miniatura, { backgroundColor: t.backgroundElement }]}>
        {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto v="cuerpoFuerte" numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>{evento.titulo}</Texto>
        <View style={styles.linea}>
          <Texto style={[styles.hora, { color: t.accentText }]}>
            {conDia ? `${diaCorto(evento.inicio)} ${hora(evento.inicio)}` : hora(evento.inicio)}
          </Texto>
          <Texto v="pie" secundario numberOfLines={1} style={{ flexShrink: 1 }}>{evento.lugar ?? evento.barrio ?? ''}</Texto>
          {precio ? <Texto v="pie" style={{ fontWeight: '600', marginLeft: 'auto' }}>{precio}</Texto> : null}
        </View>
        <View style={[styles.linea, { marginTop: 3 }]}>
          {genero ? (
            <View style={[styles.genero, { backgroundColor: colorEtiquetaGenero(genero) }]}>
              <Texto v="mini" style={{ color: '#FFFFFF', fontWeight: '700' }}>{nombreGenero(genero)}</Texto>
            </View>
          ) : null}
          {repeticiones > 1 ? <Texto v="mini" secundario style={{ fontWeight: '600' }}>{tr('agenda.fechas', { count: repeticiones })}</Texto> : null}
          {a && a.van > 0 ? (
            <View style={styles.linea}>
              <Banderas codigos={a.paisesTop} alto={9} max={3} gap={2} />
              <Texto v="mini" style={{ fontWeight: '700' }}>{tr('agenda.van', { count: a.van })}</Texto>
            </View>
          ) : null}
          {evento.chatAbierto ? (
            <Texto v="mini" style={{ fontWeight: '700', color: t.accentText }}>{tr('agenda.canalAbierto')}</Texto>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

// Qué vale la pena: lo que dice el servidor (fiesta fija, lugar bien evaluado en Google, -almuerzos y
// cursos) más la gente de Bora que va, que pesa más que todo lo demás.
function puntaje({ evento: e, repeticiones }: { evento: Evento; repeticiones: number }) {
  const a = e.asistencia;
  const gente = a ? a.van * 3 + a.talvez + a.previa + (a.aqui ?? 0) * 5 : 0;
  return (e.destaque ?? 0) + Math.min(gente * 4, 60) + (repeticiones > 1 ? 5 : 0);
}

// Los POR_DIA que más valen la pena, mostrados por hora como un line-up. "Ver todo" muestra el día entero.
function elegirVisibles<G extends { evento: Evento; repeticiones: number }>(grupos: G[]) {
  if (grupos.length <= POR_DIA) return grupos;
  const elegidos = new Set(
    grupos.map((g, i) => ({ g, i, p: puntaje(g) }))
      .sort((x, y) => y.p - x.p || x.i - y.i)
      .slice(0, POR_DIA)
      .map((x) => x.g),
  );
  return grupos.filter((g) => elegidos.has(g));
}

type Seccion = { clave: string; titulo: string; total: number; grupos: { evento: Evento; repeticiones: number }[] };

// Un día del line-up: el número del día grande en la columna izquierda y una línea fina que baja
// junto a sus eventos (como el recorrido de una noche). Los días se separan con espacio, no con rayas.
const Dia = memo(function Dia({ seccion, onVerTodos }: { seccion: Seccion; onVerTodos: (clave: string) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const visibles = useMemo(() => elegirVisibles(seccion.grupos), [seccion.grupos]);
  const { numero, semana } = fechaDeClave(seccion.clave);
  const relativo = diasHastaClave(seccion.clave);
  return (
    <View style={styles.dia} accessible={false}>
      <View style={styles.columnaDia} accessibilityLabel={seccion.titulo}>
        <Texto style={[styles.numeroDia, { color: t.text }]}>{numero}</Texto>
        <Texto v="mini" style={{ fontWeight: '700', color: relativo <= 1 ? t.accentText : t.textSecondary }}>
          {/* Columna angosta: "Aujourd’hui" no cabe, se usa la forma corta */}
          {relativo === 0 ? tr('fechas.hoyCorto') : relativo === 1 ? tr('fechas.manana') : semana}
        </Texto>
        {seccion.grupos.length > 1 ? <View style={[styles.riel, { backgroundColor: t.outline }]} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        {visibles.map((g) => <FilaLineup key={g.evento.id} evento={g.evento} repeticiones={g.repeticiones} />)}
        {seccion.total > visibles.length ? (
          <Pressable onPress={() => onVerTodos(seccion.clave)} accessibilityRole="button" style={({ pressed }) => [styles.verMas, pressed && { opacity: 0.6 }]}>
            <Texto v="detalle" style={{ fontWeight: '700', color: t.accentText }}>{tr('agenda.verTodosCuenta', { count: seccion.total })}</Texto>
            <Icono nombre="chevron.right" tamano={11} color={t.accentText} peso="bold" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

export default function AgendaScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const { t: tr, i18n } = useTranslation();
  const ciudad = useCiudad();
  const [dia, setDia] = useState<string | null>(null); // null = todas las fechas
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [ahora, setAhora] = useState(() => Date.now()); // se renueva en cada carga
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [buscador, setBuscador] = useState(false);
  const [genero, setGenero] = useState<string | null>(null);
  const [calendario, setCalendario] = useState(false);
  const { onScroll, medirBuscador, compacto, arriba } = useDesplazamiento();
  const lista = useRef<FlatList<Seccion>>(null);
  const subir = useCallback(() => lista.current?.scrollToOffset({ offset: 0, animated: true }), []);

  const cargar = useCallback(async () => {
    try {
      const { eventos } = await api<{ eventos: Evento[] }>(`/events?ciudad=${ciudad.id}`, { token });
      setEventos(eventos);
      setAhora(Date.now());
      guardarEventos(ciudad.id, eventos);
      setError(null);
    } catch {
      setError(tr('comun.sinConexion', { url: API_URL }));
    }
  }, [token, tr, ciudad.id]);

  // Al cambiar de ciudad se limpia la pantalla y los filtros.
  const [ciudadVista, setCiudadVista] = useState(ciudad.id);
  if (ciudadVista !== ciudad.id) {
    setCiudadVista(ciudad.id);
    setEventos(null);
    setGenero(null);
    setConsulta('');
    setDia(null);
  }

  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const generosDisponibles = useMemo(
    () => GENEROS.filter((g) => (eventos ?? []).some((e) => e.generos.includes(g))),
    [eventos],
  );
  const buscar = useMemo(() => crearBuscador(eventos ?? []), [eventos]);
  const buscando = consulta.trim().length >= 2;
  const resultados = useMemo(() => {
    if (!buscando) return [];
    const r = buscar(consulta);
    return agruparSeries(genero ? r.filter((e) => e.generos.includes(genero)) : r);
  }, [buscando, buscar, consulta, genero]);

  const { enVivo, secciones } = useMemo(() => {
    const hoy = claveDia(new Date(ahora).toISOString());
    const deGenero = (eventos ?? []).filter((e) => !genero || e.generos.includes(genero));
    const vivo = (e: Evento) => new Date(e.inicio).getTime() <= ahora && ahora < new Date(e.fin).getTime();
    // En vivo también va primero lo que vale la pena (si no, gana el almuerzo que empezó a mediodía).
    const enVivo = dia && dia !== hoy ? [] : deGenero.filter(vivo)
      .map((evento, i) => ({ evento, i, p: puntaje({ evento, repeticiones: 1 }) }))
      .sort((a, b) => b.p - a.p || a.i - b.i)
      .map((x) => x.evento);
    // El line-up muestra lo que todavía no empezó (lo que está en vivo ya se ve arriba).
    const proximos = deGenero.filter((e) => !vivo(e) && (!dia || claveDia(e.inicio) === dia));
    const grupos = dia ? proximos.map((evento) => ({ evento, repeticiones: 1 })) : agruparSeries(proximos);
    const porDia = new Map<string, { evento: Evento; repeticiones: number }[]>();
    const totalDia = new Map<string, number>();
    for (const e of proximos) totalDia.set(claveDia(e.inicio), (totalDia.get(claveDia(e.inicio)) ?? 0) + 1);
    for (const g of grupos) {
      const clave = claveDia(g.evento.inicio);
      porDia.set(clave, [...(porDia.get(clave) ?? []), g]);
    }
    const secciones: Seccion[] = [...porDia.entries()].map(([clave, gs]) => ({
      clave, titulo: encabezadoDia(clave), grupos: gs, total: Math.max(gs.length, totalDia.get(clave) ?? 0),
    }));
    return { enVivo, secciones };
    // i18n.language y ciudad.zona: los títulos de los días cambian con el idioma y la zona horaria
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, dia, genero, ahora, i18n.language, ciudad.zona]);

  const diasConEventos = useMemo(() => {
    const hoy = claveDia(new Date(ahora).toISOString());
    return new Set((eventos ?? [])
      .filter((e) => !genero || e.generos.includes(genero))
      .map((e) => (diasDesdeHoy(e.inicio) < 0 ? hoy : claveDia(e.inicio))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, genero, ahora, ciudad.zona]);

  const mostrarSecciones = !error && Boolean(eventos?.length) && !buscando;
  const verDia = useCallback((clave: string) => router.push({ pathname: '/dia/[clave]', params: genero ? { clave, genero } : { clave } }), [genero]);
  const cerrarBuscador = () => { setBuscador(false); setConsulta(''); };
  const nada = mostrarSecciones && enVivo.length === 0 && secciones.length === 0;

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <EncabezadoCompacto
        visible={compacto}
        titulo={ciudad.nombre}
        busqueda={{ valor: consulta, onCambio: setConsulta, placeholder: tr('agenda.buscar') }}
      />
      <Animated.FlatList
        ref={lista}
        data={mostrarSecciones ? secciones : []}
        keyExtractor={(sec) => sec.clave}
        renderItem={({ item: sec }) => <Dia seccion={sec} onVerTodos={verDia} />}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 24 }}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={<RefreshControl refreshing={refrescando} onRefresh={refrescar} />}
        ListHeaderComponent={<View style={{ paddingTop: insets.top + 10 }}>
          <View style={styles.encabezado}>
            <BotonCiudad grande />
            <Pressable
              onPress={() => (buscador ? cerrarBuscador() : setBuscador(true))}
              accessibilityRole="button"
              accessibilityLabel={tr(buscador ? 'agenda.cerrarBuscador' : 'agenda.abrirBuscador')}
              style={({ pressed }) => [styles.botonBuscar, { backgroundColor: buscador ? t.text : t.backgroundElement }, pressed && { opacity: 0.7 }]}>
              <Icono nombre={buscador ? 'xmark' : 'magnifyingglass'} tamano={16} color={buscador ? t.background : t.text} peso="semibold" />
            </Pressable>
          </View>

          {buscador ? null : <AvisoComoEstuvo token={token} />}

          {buscador ? (
            <Animated.View entering={FadeInDown.duration(160)} style={styles.margen}>
              <BarraBusqueda valor={consulta} onCambio={setConsulta} placeholder={tr('agenda.buscar')} autoFocus />
            </Animated.View>
          ) : null}

          <View style={{ marginTop: 12 }}>
            <FilaGeneros generos={generosDisponibles} elegido={genero} onCambio={setGenero} />
          </View>
          {!buscando && (
            <View style={{ marginTop: 10 }} onLayout={medirBuscador}>
              <TiraFechas valor={dia} onCambio={setDia} diasConEventos={diasConEventos} onCalendario={() => setCalendario(true)} />
            </View>
          )}

          {error ? (
            <View style={styles.vacio}>
              <Texto secundario style={{ textAlign: 'center' }}>{error}</Texto>
              <BotonTexto texto={tr('comun.reintentar')} onPress={cargar} />
            </View>
          ) : eventos === null ? (
            <ActivityIndicator style={styles.vacio} />
          ) : buscando ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={styles.margen}>
              <Texto v="pie" secundario style={styles.cuenta}>{tr('agenda.resultados', { count: resultados.length })}</Texto>
              {resultados.length === 0 ? (
                <View style={styles.vacio}>
                  <IconoVacio nombre="magnifyingglass" />
                  <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('agenda.sinResultados', { q: consulta.trim() })}</Texto>
                  <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('agenda.sinResultadosAyuda')}</Texto>
                </View>
              ) : (
                <View style={{ marginHorizontal: -16 }}>
                  {resultados.map((g) => (
                    <FilaLineup key={g.evento.id} evento={g.evento} repeticiones={g.repeticiones} conDia />
                  ))}
                </View>
              )}
            </Animated.View>
          ) : eventos.length === 0 ? (
            <View style={styles.vacio}>
              <IconoVacio nombre="calendar" />
              <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('agenda.ciudadVacia', { ciudad: ciudad.nombre })}</Texto>
              <BotonTexto texto={tr('ciudad.cambiar')} onPress={() => router.push('/ciudad')} />
            </View>
          ) : nada ? (
            <View style={styles.vacio}>
              <Texto secundario style={{ textAlign: 'center' }}>
                {genero ? tr('agenda.sinEventosGenero', { genero: nombreGenero(genero) }) : tr('agenda.sinEventos')}
              </Texto>
              {dia ? <BotonTexto texto={tr('agenda.verTodasFechas')} onPress={() => setDia(null)} />
                : genero ? <BotonTexto texto={tr('agenda.verTodosTipos')} onPress={() => setGenero(null)} /> : null}
            </View>
          ) : enVivo.length ? (
            <View style={{ marginTop: 20 }}>
              <View style={styles.cabezaAhora}>
                <Texto v="seccion">{tr('agenda.ahora')}</Texto>
                <View style={[styles.puntoVivo, { backgroundColor: t.sun }]} />
                <Texto v="pie" style={{ fontWeight: '700' }}>{tr('agenda.enVivoN', { count: enVivo.length })}</Texto>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tiraAhora}>
                {enVivo.map((e) => <TarjetaAhora key={e.id} evento={e} />)}
              </ScrollView>
            </View>
          ) : null}
        </View>}
      />
      <BotonArriba visible={arriba} onPress={subir} />
      <HojaCalendario
        visible={calendario}
        valor={dia}
        diasConEventos={diasConEventos}
        onElegir={(clave) => { setDia(clave); setConsulta(''); }}
        onCerrar={() => setCalendario(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%' },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16 },
  botonBuscar: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  margen: { paddingHorizontal: 16, marginTop: 10 },
  cabezaAhora: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, marginBottom: 8 },
  puntoVivo: { width: 7, height: 7, borderRadius: 4, marginLeft: 4 },
  tiraAhora: { paddingHorizontal: 16, gap: 8 },
  ahora: { width: 252, flexDirection: 'row', gap: 10, padding: 8, borderRadius: 8 },
  fotoAhora: { width: 72, height: 72, borderRadius: 6, overflow: 'hidden' },
  vivo: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, height: 18, paddingHorizontal: 5, borderRadius: 3 },
  dia: { flexDirection: 'row', marginTop: 18, paddingLeft: 16 },
  columnaDia: { width: 50, alignItems: 'flex-start', paddingTop: 6 },
  numeroDia: { fontFamily: FuenteTitulo.cursiva, fontSize: 36, lineHeight: 36, paddingRight: 2 },
  riel: { width: 2, flex: 1, marginTop: 8, marginLeft: 2, marginBottom: 4, borderRadius: 1 },
  fila: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 9, paddingLeft: 6, paddingRight: 16, borderRadius: 6 },
  hora: { fontFamily: FuenteTitulo.cursiva, fontSize: 17, lineHeight: 19, paddingRight: 1 },
  miniatura: { width: 56, height: 56, borderRadius: 6, overflow: 'hidden' },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  genero: { height: 17, paddingHorizontal: 5, borderRadius: 3, justifyContent: 'center' },
  verMas: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 6, paddingVertical: 10 },
  vacio: { marginTop: 48, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  cuenta: { marginBottom: 8, paddingHorizontal: 4, fontWeight: '600' },
});
