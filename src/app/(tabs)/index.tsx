import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, type FlatList } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banderas } from '@/components/bandera';
import { HojaCalendario } from '@/components/calendario';
import { BotonArriba, EncabezadoCompacto, useDesplazamiento } from '@/components/desplazamiento';
import { ListaEventos } from '@/components/fila-evento';
import { BarraBusqueda, BotonCiudad, ChipGenero, FilaGeneros, IconoVacio, PantallaGeneros, TiraFechas } from '@/components/filtros';
import { BotonTexto, Icono, Texto } from '@/components/ui';
import { API_URL } from '@/config/api';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Evento } from '@/lib/api';
import { crearBuscador } from '@/lib/buscar-eventos';
import { guardarEventos } from '@/lib/eventos-cache';
import { agruparSeries } from '@/lib/series';
import { useCiudad } from '@/lib/ciudades';
import { claveDia, diasDesdeHoy, fechaLarga, hora, precioTexto, tituloDeClave, tituloDia } from '@/lib/fechas';
import { GENEROS, nombreGenero } from '@/lib/generos';

// Tarjetas por día en la fila horizontal; el resto se ve con "Ver todos".
const MAX_POR_DIA = 8;


function abrir(e: Evento) {
  router.push({ pathname: '/evento/[id]', params: { id: e.id } });
}

function TarjetaDestacada({ evento }: { evento: Evento }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const a = evento.asistencia;
  const lugar = evento.lugar ?? evento.barrio;
  return (
    <Pressable onPress={() => abrir(evento)} style={({ pressed }) => [styles.destacada, { backgroundColor: t.card }, pressed && { opacity: 0.9 }]}>
      {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
      <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']} style={styles.velo} />
      {evento.chatAbierto && (
        <BlurView intensity={40} tint="light" style={styles.etiquetaChat}>
          <View style={[styles.puntoVivo, { backgroundColor: t.live }]} />
          <Texto v="pie" style={styles.blanco}>{tr('agenda.chatAbierto')}</Texto>
        </BlurView>
      )}
      <View style={styles.textoDestacada}>
        <Texto v="detalle" style={[styles.blanco, { fontWeight: '600', opacity: 0.9 }]}>
          {[diasDesdeHoy(evento.inicio) > 0 ? tituloDia(evento.inicio) : null, hora(evento.inicio), lugar].filter(Boolean).join(' · ')}
        </Texto>
        <Texto v="titulo" style={styles.blanco} numberOfLines={2}>{evento.titulo}</Texto>
        {a && a.van > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <Texto v="detalle" style={[styles.blanco, { fontWeight: '600' }]}>{tr('agenda.van', { count: a.van })}</Texto>
            <Banderas codigos={a.paisesTop} alto={12} />
            {a.paises > a.paisesTop.length ? <Texto v="pie" style={styles.blanco}>+{a.paises - a.paisesTop.length}</Texto> : null}
          </View>
        ) : (
          <Texto v="detalle" style={[styles.blanco, { opacity: 0.85, marginTop: 4 }]}>{tr('agenda.seElPrimero')}</Texto>
        )}
      </View>
    </Pressable>
  );
}

function TarjetaChica({ evento, repeticiones = 1 }: { evento: Evento; repeticiones?: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const precio = precioTexto(evento.precioDesde);
  return (
    <Pressable onPress={() => abrir(evento)} style={({ pressed }) => [styles.chica, pressed && { opacity: 0.7 }]}>
      <View style={[styles.fotoChica, { backgroundColor: t.backgroundElement }]}>
        {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : null}
        {repeticiones > 1 ? (
          // Fiesta que se repite: se muestra una vez, con cuántas fechas tiene.
          <View style={styles.repite}>
            <Icono nombre="repeat" tamano={11} color="#FFFFFF" peso="semibold" />
            <Texto v="mini" style={{ color: '#FFFFFF', fontWeight: '600' }}>{tr('agenda.fechas', { count: repeticiones })}</Texto>
          </View>
        ) : null}
      </View>
      <View>
        <Texto v="detalle" style={{ fontWeight: '600' }} numberOfLines={1}>{evento.titulo}</Texto>
        <Texto v="pie" secundario numberOfLines={1}>
          {[hora(evento.inicio), evento.barrio, precio].filter(Boolean).join(' · ')}
        </Texto>
      </View>
    </Pressable>
  );
}

type Seccion = { clave: string; titulo: string; total: number; grupos: { evento: Evento; repeticiones: number }[] };

// Un día de la agenda: título y fila horizontal de tarjetas.
const FilaDia = memo(function FilaDia({ seccion, onVerTodos }: { seccion: Seccion; onVerTodos: (clave: string) => void }) {
  return (
    <View style={{ marginTop: 28 }}>
      <TituloDia titulo={seccion.titulo} total={seccion.total} onVerTodos={() => onVerTodos(seccion.clave)} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {seccion.grupos.slice(0, MAX_POR_DIA).map((g) => <TarjetaChica key={g.evento.id} evento={g.evento} repeticiones={g.repeticiones} />)}
      </ScrollView>
    </View>
  );
});

// Chats abiertos ahora: círculos con la foto del evento, directo al chat (une la Agenda con los Chats).
function ChatsAbiertos({ eventos }: { eventos: Evento[] }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  if (eventos.length === 0) return null;
  return (
    <View style={{ marginTop: 28 }}>
      <View style={styles.tituloFila}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.puntoVivo, { backgroundColor: t.live }]} />
          <Texto v="seccion">{tr('agenda.chatsAhora')}</Texto>
        </View>
        <BotonTexto texto={tr('agenda.verTodos')} onPress={() => router.navigate('/chats')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
        {eventos.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => router.push({ pathname: '/evento/[id]/chat', params: { id: e.id } })}
            style={({ pressed }) => [styles.burbuja, pressed && { opacity: 0.7 }]}>
            <View style={[styles.aro, { borderColor: t.text }]}>
              <View style={[styles.circulo, { backgroundColor: t.backgroundElement }]}>
                {e.imagen ? <Image source={{ uri: e.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
              </View>
            </View>
            <Texto v="mini" numberOfLines={2} style={{ textAlign: 'center', fontWeight: '500' }}>{e.titulo}</Texto>
            {e.asistencia?.van ? <Texto v="mini" secundario>{tr('agenda.van', { count: e.asistencia.van })}</Texto> : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// Título de un día con "Ver todos ›" a la derecha: abre la lista vertical de ese día.
function TituloDia({ titulo, total, onVerTodos }: { titulo: string; total: number; onVerTodos: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={styles.tituloFila}>
      <Texto v="seccion" style={{ flexShrink: 1 }} numberOfLines={1}>{titulo}</Texto>
      <Pressable onPress={onVerTodos} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${tr('agenda.verTodos')} · ${titulo}`}>
        {({ pressed }) => (
          <View style={[styles.verTodos, pressed && { opacity: 0.5 }]}>
            <Texto v="detalle" acento style={{ fontWeight: '500' }}>
              {total > MAX_POR_DIA ? tr('agenda.verTodosCuenta', { count: total }) : tr('agenda.verTodos')}
            </Texto>
            <Icono nombre="chevron.right" tamano={13} color={t.accentText} peso="semibold" />
          </View>
        )}
      </Pressable>
    </View>
  );
}

export default function AgendaScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token, usuario } = useSesion();
  const { t: tr, i18n } = useTranslation();
  const ciudad = useCiudad();
  const [dia, setDia] = useState<string | null>(null); // null = todas las fechas
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [genero, setGenero] = useState<string | null>(null);
  const [calendario, setCalendario] = useState(false);
  const [categorias, setCategorias] = useState(false);
  const { onScroll, medirBuscador, compacto, arriba } = useDesplazamiento();
  // La agenda es una lista virtualizada: solo se dibujan los días que están cerca de la pantalla
  // (antes se montaban todos a la vez, cientos de tarjetas con foto, y en Android el scroll se trababa).
  const lista = useRef<FlatList<Seccion>>(null);
  const subir = useCallback(() => lista.current?.scrollToOffset({ offset: 0, animated: true }), []);

  const cargar = useCallback(async () => {
    try {
      const { eventos } = await api<{ eventos: Evento[] }>(`/events?ciudad=${ciudad.id}`, { token });
      setEventos(eventos);
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

  // Recarga al volver a la pestaña (por ejemplo, después de marcar "Voy").
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  // Solo se muestran como filtro los tipos que tienen eventos próximos.
  const generosDisponibles = useMemo(
    () => GENEROS.filter((g) => (eventos ?? []).some((e) => e.generos.includes(g))),
    [eventos],
  );
  // Cuántos eventos tiene cada tipo (para la pantalla de categorías).
  const cuentasGenero = useMemo(() => {
    const c: Record<string, number> = {};
    for (const e of eventos ?? []) for (const g of e.generos) c[g] = (c[g] ?? 0) + 1;
    return c;
  }, [eventos]);
  const chatsAbiertos = useMemo(
    () => (eventos ?? []).filter((e) => e.chatAbierto && (!genero || e.generos.includes(genero))),
    [eventos, genero],
  );
  const buscar = useMemo(() => crearBuscador(eventos ?? []), [eventos]);
  const buscando = consulta.trim().length >= 2;
  const resultados = useMemo(() => {
    if (!buscando) return [];
    const r = buscar(consulta);
    return agruparSeries(genero ? r.filter((e) => e.generos.includes(genero)) : r);
    // i18n.language: los nombres de los géneros cambian con el idioma
  }, [buscando, buscar, consulta, genero, i18n.language]);

  const { destacado, secciones } = useMemo(() => {
    const lista = (eventos ?? []).filter((e) => {
      if (genero && !e.generos.includes(genero)) return false;
      // Un evento que ya empezó cuenta como de hoy.
      return !dia || claveDia(diasDesdeHoy(e.inicio) < 0 ? new Date().toISOString() : e.inicio) === dia;
    });
    // Sin un día elegido, las fiestas que se repiten aparecen una sola vez (en su próxima fecha).
    const grupos = dia ? lista.map((evento) => ({ evento, repeticiones: 1 })) : agruparSeries(lista);
    const destacado = grupos[0]?.evento ?? null;
    const hoy = claveDia(new Date().toISOString());
    // Cuántos eventos tiene cada día en total (para "Ver todos (32)").
    const totalDia = new Map<string, number>();
    for (const e of lista) {
      const clave = diasDesdeHoy(e.inicio) < 0 ? hoy : claveDia(e.inicio);
      totalDia.set(clave, (totalDia.get(clave) ?? 0) + 1);
    }
    const porDia = new Map<string, { titulo: string; grupos: { evento: Evento; repeticiones: number }[] }>();
    for (const g of grupos.slice(1)) {
      const d = diasDesdeHoy(g.evento.inicio);
      const clave = d <= 0 ? hoy : claveDia(g.evento.inicio);
      const seccion = porDia.get(clave) ?? { titulo: d <= 0 ? tr('agenda.masTarde') : tituloDia(g.evento.inicio), grupos: [] };
      seccion.grupos.push(g);
      porDia.set(clave, seccion);
    }
    const secciones = [...porDia.entries()].map(([clave, s]) => ({ clave, ...s, total: totalDia.get(clave) ?? s.grupos.length }));
    return { destacado, secciones };
    // i18n.language y ciudad.zona: los títulos de los días cambian con el idioma y la zona horaria
  }, [eventos, dia, genero, tr, i18n.language, ciudad.zona]);

  // Días que tienen algún evento (del tipo elegido), para encender esos días en la tira.
  const diasConEventos = useMemo(() => {
    const hoy = claveDia(new Date().toISOString());
    return new Set((eventos ?? [])
      .filter((e) => !genero || e.generos.includes(genero))
      .map((e) => (diasDesdeHoy(e.inicio) < 0 ? hoy : claveDia(e.inicio))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, genero, ciudad.zona]);

  const tituloAgenda = !dia
    ? tr('agenda.titulo.proximos')
    : dia === claveDia(new Date().toISOString())
      ? tr('agenda.titulo.hoy')
      : tituloDeClave(dia);

  const mostrarSecciones = !error && Boolean(eventos?.length) && !buscando;
  const verDia = useCallback((clave: string) => router.push({ pathname: '/dia/[clave]', params: genero ? { clave, genero } : { clave } }), [genero]);

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <EncabezadoCompacto
        visible={compacto}
        titulo={buscando ? tr('agenda.titulo.buscar') : tituloAgenda}
        derecha={generosDisponibles.length > 1 ? <ChipGenero elegido={genero} onPress={() => setCategorias(true)} chico /> : null}
        busqueda={{ valor: consulta, onCambio: setConsulta, placeholder: tr('agenda.buscar') }}
      />
      <Animated.FlatList
        ref={lista}
        data={mostrarSecciones ? secciones : []}
        keyExtractor={(sec) => sec.clave}
        renderItem={({ item: sec }) => <FilaDia seccion={sec} onVerTodos={verDia} />}
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
        ListHeaderComponent={<View style={{ paddingTop: insets.top + 12 }}>
        <View style={styles.encabezado}>
          <BotonCiudad />
          <Pressable onPress={() => router.navigate('/perfil')} accessibilityLabel={tr('agenda.tuPerfil')} style={[styles.avatar, { backgroundColor: t.backgroundElement }]}>
            {usuario?.foto ? <Image source={{ uri: usuario.foto }} style={StyleSheet.absoluteFill} /> : (
              <Icono nombre="person" tamano={17} color={t.textSecondary} />
            )}
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
          <View style={styles.filaTitulo}>
            <Texto v="tituloGrande">{buscando ? tr('agenda.titulo.buscar') : tituloAgenda}</Texto>
            {generosDisponibles.length > 1 ? <ChipGenero elegido={genero} onPress={() => setCategorias(true)} /> : null}
          </View>
          <Texto v="detalle" secundario>{fechaLarga(new Date().toISOString()).replace(/^./, (c) => c.toUpperCase())}</Texto>
        </View>

        <View style={styles.margen} onLayout={medirBuscador}>
          <BarraBusqueda valor={consulta} onCambio={setConsulta} placeholder={tr('agenda.buscar')} />
        </View>

        <View style={{ marginTop: 14 }}>
          <FilaGeneros generos={generosDisponibles} elegido={genero} onCambio={setGenero} />
        </View>

        {!buscando && (
          <View style={{ marginTop: 16 }}>
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
              <ListaEventos grupos={resultados} />
            )}
          </Animated.View>
        ) : eventos.length === 0 ? (
          <View style={styles.vacio}>
            <IconoVacio nombre="calendar" />
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('agenda.ciudadVacia', { ciudad: ciudad.nombre })}</Texto>
            <BotonTexto texto={tr('ciudad.cambiar')} onPress={() => router.push('/ciudad')} />
          </View>
        ) : (
          <>
            {destacado ? (
              <View style={styles.margen}>
                <TarjetaDestacada evento={destacado} />
              </View>
            ) : (
              <View style={styles.vacio}>
                <Texto secundario style={{ textAlign: 'center' }}>
                  {genero ? tr('agenda.sinEventosGenero', { genero: nombreGenero(genero) }) : tr('agenda.sinEventos')}
                </Texto>
                {dia ? (
                  <BotonTexto texto={tr('agenda.verTodasFechas')} onPress={() => setDia(null)} />
                ) : genero ? (
                  <BotonTexto texto={tr('agenda.verTodosTipos')} onPress={() => setGenero(null)} />
                ) : null}
              </View>
            )}
            <ChatsAbiertos eventos={chatsAbiertos} />
          </>
        )}
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
      <PantallaGeneros
        visible={categorias}
        generos={generosDisponibles}
        cuentas={cuentasGenero}
        total={eventos?.length ?? 0}
        elegido={genero}
        onElegir={setGenero}
        onCerrar={() => setCategorias(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  filaTitulo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 12, rowGap: 6 },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  avatar: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  margen: { paddingHorizontal: 20, marginTop: 16 },
  destacada: { height: 400, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%' },
  etiquetaChat: {
    position: 'absolute', top: 14, left: 14, height: 28, paddingHorizontal: 12, borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  puntoVivo: { width: 7, height: 7, borderRadius: 4 },
  textoDestacada: { padding: 20, gap: 4 },
  blanco: { color: '#FFFFFF' },
  tituloFila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  verTodos: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  fila: { paddingHorizontal: 20, gap: 14 },
  chica: { width: 168, gap: 8 },
  fotoChica: { width: 168, height: 168, borderRadius: 18, overflow: 'hidden' },
  repite: {
    position: 'absolute', left: 8, bottom: 8, height: 22, paddingHorizontal: 8, borderRadius: 11,
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  burbuja: { width: 80, alignItems: 'center', gap: 4 },
  aro: { width: 76, height: 76, borderRadius: 38, borderWidth: 2.5, padding: 3 },
  circulo: { flex: 1, borderRadius: 34, overflow: 'hidden' },
  vacio: { marginTop: 48, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  cuenta: { marginBottom: 8, paddingHorizontal: 4, fontWeight: '600', textTransform: 'uppercase' },
});
