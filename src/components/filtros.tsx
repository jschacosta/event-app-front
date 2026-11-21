// Piezas compartidas por la Agenda y los Chats: ciudad, buscador y tipos de música.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withTiming, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fuenteWeb, Icono, Texto } from '@/components/ui';
import { IconoBora } from '@/components/iconos-bora';
import { useTheme } from '@/hooks/use-theme';
import { useCiudad } from '@/lib/ciudades';
import { fechaDeClave, proximosDias } from '@/lib/fechas';
import { coloresGenero, iconoGenero, nombreGenero } from '@/lib/generos';

// ---------- Ciudad: botón que abre el selector ----------
// `grande`: la ciudad es el título de la pantalla ("Rio ⌄"), como el selector de lugar de las apps de salidas.
export function BotonCiudad({ grande }: { grande?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const ciudad = useCiudad();
  if (grande) {
    return (
      <Pressable
        onPress={() => router.push('/ciudad')}
        accessibilityRole="button"
        accessibilityLabel={tr('ciudad.cambiar')}
        hitSlop={8}
        style={({ pressed }) => [styles.ciudadGrande, pressed && { opacity: 0.6 }]}>
        <Texto v="tituloGrande" numberOfLines={1} style={{ flexShrink: 1 }}>{ciudad.nombre}</Texto>
        <View style={{ marginTop: 6 }}><Icono nombre="chevron.down" tamano={18} color={t.textSecondary} peso="bold" /></View>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={() => router.push('/ciudad')}
      accessibilityRole="button"
      accessibilityLabel={tr('ciudad.cambiar')}
      hitSlop={8}
      style={({ pressed }) => [styles.ciudad, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
      <Icono nombre="location.fill" tamano={12} color={t.text} />
      <Texto v="pie" style={{ fontWeight: '600' }}>{ciudad.nombre}</Texto>
      <Icono nombre="chevron.down" tamano={11} color={t.textSecondary} peso="semibold" />
    </Pressable>
  );
}

// ---------- Buscador ----------
export function BarraBusqueda({ valor, onCambio, placeholder, autoFocus, onFocus, onBlur }: {
  valor: string; onCambio: (v: string) => void; placeholder: string;
  autoFocus?: boolean; onFocus?: () => void; onBlur?: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={[styles.busqueda, { backgroundColor: t.backgroundElement }]}>
      <IconoBora nombre="buscar" tamano={18} color={t.textSecondary} />
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.busquedaTexto, { color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
      {valor ? (
        <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(120)}>
          <Pressable onPress={() => onCambio('')} hitSlop={10} accessibilityLabel={tr('agenda.borrarBusqueda')}>
            <View style={[styles.borrar, { backgroundColor: t.textSecondary }]}>
              <IconoBora nombre="cerrar" tamano={12} color={t.backgroundElement} grosor={3} />
            </View>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------- Fechas: píldoras "Todo · Hoy · Mañana · Vie 20…" ----------
// Una sola fila de texto (antes eran 14 cuadros con número grande que competían con los géneros).
// Los días sin eventos no se muestran; el ícono de calendario permite elegir cualquier fecha.
export function Pildora({ texto, elegida, onPress, icono }: { texto?: string; elegida: boolean; onPress: () => void; icono?: 'calendar' }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: elegida }}
      accessibilityLabel={texto}
      style={({ pressed }) => [
        styles.pildora,
        { backgroundColor: elegida ? t.accent : t.backgroundElement },
        icono && !texto && styles.pildoraIcono,
        pressed && { opacity: 0.7 },
      ]}>
      {icono ? <Icono nombre={icono} tamano={15} color={elegida ? t.onAccent : t.text} /> : null}
      {texto ? <Texto v="detalle" style={{ fontWeight: '600', fontSize: 14, color: elegida ? t.onAccent : t.text }}>{texto}</Texto> : null}
    </Pressable>
  );
}

// `valor`: null = todas las fechas, o la clave del día ("2026-11-03").
export function TiraFechas({ valor, onCambio, diasConEventos, dias = 14, onCalendario }: {
  valor: string | null; onCambio: (clave: string | null) => void; diasConEventos: Set<string>; dias?: number;
  onCalendario?: () => void;
}) {
  const { t: tr, i18n } = useTranslation();
  const ciudad = useCiudad();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lista = useMemo(() => proximosDias(dias), [dias, i18n.language, ciudad.zona]);
  const fueraDeLaTira = valor !== null && !lista.some((d) => d.clave === valor);
  const elegidaAparte = fueraDeLaTira ? fechaDeClave(valor) : null;
  const nombre = (k: number, d: { semana: string; numero: number }) =>
    k === 0 ? tr('fechas.hoy') : k === 1 ? tr('fechas.manana') : `${d.semana.charAt(0).toUpperCase()}${d.semana.slice(1).toLowerCase()} ${d.numero}`;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filaDias}>
      <Pildora texto={tr('fechas.todo')} elegida={valor === null} onPress={() => onCambio(null)} />
      {lista.map((d, k) => (diasConEventos.has(d.clave) || valor === d.clave ? (
        <Pildora key={d.clave} texto={nombre(k, d)} elegida={valor === d.clave} onPress={() => onCambio(valor === d.clave ? null : d.clave)} />
      ) : null))}
      {onCalendario ? (
        <Pildora
          icono="calendar"
          texto={elegidaAparte ? `${elegidaAparte.numero} ${elegidaAparte.mes}` : undefined}
          elegida={fueraDeLaTira}
          onPress={onCalendario}
        />
      ) : null}
    </ScrollView>
  );
}

// ---------- Ícono grande de los estados vacíos (sin resultados, sin eventos…) ----------
export function IconoVacio({ nombre }: { nombre: 'magnifyingglass' | 'calendar' | 'bubble.left.and.bubble.right' }) {
  const t = useTheme();
  return (
    <View style={[styles.vacio, { backgroundColor: t.backgroundElement }]}>
      <Icono nombre={nombre} tamano={28} color={t.textSecondary} />
    </View>
  );
}

// ---------- Tipos de música: tarjetas de color, como las categorías de Apple Music ----------
function TarjetaGenero({ id, elegido, hayOtroElegido, onPress }: { id: string; elegido: boolean; hayOtroElegido: boolean; onPress: () => void }) {
  const opacidad = useSharedValue(1);
  const escala = useSharedValue(1);
  useEffect(() => {
    opacidad.set(withTiming(hayOtroElegido ? 0.35 : 1, { duration: 220 }));
    escala.set(withTiming(elegido ? 1.04 : hayOtroElegido ? 0.96 : 1, { duration: 200 }));
  }, [elegido, hayOtroElegido, opacidad, escala]);
  const animado = useAnimatedStyle(() => ({ opacity: opacidad.get(), transform: [{ scale: escala.get() }] }));
  const colores = coloresGenero(id);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: elegido }} accessibilityLabel={nombreGenero(id)}>
      <Animated.View style={[styles.tarjeta, animado]}>
        <LinearGradient colors={colores as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Texto v="detalle" style={styles.tarjetaTexto} numberOfLines={1}>{nombreGenero(id)}</Texto>
        <View style={styles.tarjetaIcono}>
          <MaterialCommunityIcons name={iconoGenero(id)} size={36} color="rgba(255,255,255,0.9)" />
        </View>
        {elegido && (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.tarjetaQuitar}>
            <Icono nombre="xmark" tamano={10} color="#000000" peso="bold" />
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// Tocar un tipo lo elige; tocarlo de nuevo quita el filtro.
export function FilaGeneros({ generos, elegido, onCambio }: { generos: string[]; elegido: string | null; onCambio: (g: string | null) => void }) {
  if (generos.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fila}>
      {generos.map((g) => (
        <TarjetaGenero
          key={g}
          id={g}
          elegido={elegido === g}
          hayOtroElegido={elegido !== null && elegido !== g}
          onPress={() => onCambio(elegido === g ? null : g)}
        />
      ))}
    </ScrollView>
  );
}

// ---------- Chip de la categoría elegida (con su color) ----------
// Va junto al título de la Agenda. Al tocarlo se abre la pantalla completa de categorías.
export function ChipGenero({ elegido, onPress, chico }: { elegido: string | null; onPress: () => void; chico?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const color = elegido ? '#FFFFFF' : t.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tr('agenda.cambiarCategoria')}: ${elegido ? nombreGenero(elegido) : tr('agenda.todasCategorias')}`}
      hitSlop={6}
      style={({ pressed }) => [pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}>
      <Animated.View
        key={elegido ?? 'todas'}
        entering={FadeIn.duration(180)}
        style={[styles.chip, chico && styles.chipChico, !elegido && { backgroundColor: t.backgroundElement }]}>
        {elegido ? (
          <LinearGradient colors={coloresGenero(elegido) as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        {elegido ? (
          <MaterialCommunityIcons name={iconoGenero(elegido)} size={chico ? 13 : 15} color={color} />
        ) : (
          <Icono nombre="square.grid.2x2" tamano={chico ? 12 : 14} color={color} />
        )}
        {/* En el encabezado compacto solo va el color y el ícono, para no tapar el título. */}
        {chico ? null : (
          <Texto v="pie" numberOfLines={1} style={{ color, fontWeight: '700', flexShrink: 1 }}>
            {elegido ? nombreGenero(elegido) : tr('agenda.todasCategorias')}
          </Texto>
        )}
        <Icono nombre="chevron.down" tamano={chico ? 9 : 11} color={color} peso="bold" />
      </Animated.View>
    </Pressable>
  );
}

// ---------- Pantalla completa para cambiar la categoría ----------
function CeldaGenero({ id, cuenta, elegido, indice, onPress }: { id: string | null; cuenta: number; elegido: boolean; indice: number; onPress: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const texto = id ? '#FFFFFF' : t.text;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(indice, 12) * 25).duration(260)} style={styles.celdaGenero}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected: elegido }}
        accessibilityLabel={id ? nombreGenero(id) : tr('agenda.todasCategorias')}
        style={({ pressed }) => [styles.tarjetaGrande, !id && { backgroundColor: t.backgroundElement }, pressed && { transform: [{ scale: 0.97 }], opacity: 0.85 }]}>
        {id ? (
          <LinearGradient colors={coloresGenero(id) as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        ) : null}
        <Texto v="cuerpoFuerte" numberOfLines={1} style={{ color: texto, fontWeight: '700' }}>
          {id ? nombreGenero(id) : tr('agenda.todasCategorias')}
        </Texto>
        <Texto v="pie" style={{ color: texto, opacity: 0.85 }}>{tr('dia.eventos', { count: cuenta })}</Texto>
        <View style={styles.tarjetaGrandeIcono}>
          {id ? (
            <MaterialCommunityIcons name={iconoGenero(id)} size={62} color="rgba(255,255,255,0.9)" />
          ) : (
            <Icono nombre="square.grid.2x2" tamano={52} color={t.textSecondary} />
          )}
        </View>
        {elegido ? (
          <View style={[styles.marca, { backgroundColor: id ? '#FFFFFF' : t.text }]}>
            <Icono nombre="checkmark" tamano={13} color={id ? '#000000' : t.background} peso="bold" />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

type PropsGeneros = {
  generos: string[];
  cuentas: Record<string, number>;
  total: number;
  elegido: string | null;
  onElegir: (g: string | null) => void;
  onCerrar: () => void;
};

// Un Modal nativo es otra ventana: necesita su propio SafeAreaProvider para medir el notch y la
// barra de inicio; si no, el encabezado (y la ✕) queda debajo de la barra de estado.
export function PantallaGeneros({ visible, ...props }: PropsGeneros & { visible: boolean }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onCerrar} statusBarTranslucent>
      <SafeAreaProvider>
        <ContenidoGeneros {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

function ContenidoGeneros({ generos, cuentas, total, elegido, onElegir, onCerrar }: PropsGeneros) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const elegir = (g: string | null) => { onElegir(g); onCerrar(); };
  return (
    <View style={[styles.pantallaGeneros, { backgroundColor: t.background, paddingTop: Math.max(insets.top, 20) + 12 }]}>
      <View style={styles.cabezaGeneros}>
        <Texto v="tituloGrande">{tr('agenda.categorias')}</Texto>
        <Pressable
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel={tr('comun.cerrar')}
          hitSlop={10}
          style={({ pressed }) => [styles.cerrar, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
          <Icono nombre="xmark" tamano={15} color={t.text} peso="bold" />
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.grillaGeneros, { paddingBottom: insets.bottom + 32 }]}>
        <CeldaGenero id={null} cuenta={total} elegido={elegido === null} indice={0} onPress={() => elegir(null)} />
        {generos.map((g, i) => (
          <CeldaGenero key={g} id={g} cuenta={cuentas[g] ?? 0} elegido={elegido === g} indice={i + 1} onPress={() => elegir(g)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  borrar: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  vacio: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  filaDias: { paddingHorizontal: 20, gap: 8, paddingVertical: 2 },
  pildora: { height: 30, paddingHorizontal: 11, borderRadius: 4, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pildoraIcono: { width: 32, paddingHorizontal: 0, justifyContent: 'center' },
  ciudadGrande: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  ciudad: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 11, borderRadius: 14, alignSelf: 'flex-start' },
  busqueda: { height: 36, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  busquedaTexto: { flex: 1, fontSize: 16, height: 36, padding: 0 },
  fila: { paddingHorizontal: 20, paddingVertical: 2, gap: 8 },
  tarjeta: { width: 108, height: 60, borderRadius: 6, overflow: 'hidden', padding: 9 },
  tarjetaTexto: { color: '#FFFFFF', fontFamily: 'BarlowCondensed_800ExtraBold', fontSize: 19, lineHeight: 21 },
  tarjetaIcono: { position: 'absolute', right: -6, bottom: -8, transform: [{ rotate: '-18deg' }] },
  tarjetaQuitar: {
    position: 'absolute', right: 6, top: 6, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, borderRadius: 4,
    overflow: 'hidden', maxWidth: 190,
  },
  chipChico: { height: 28, paddingHorizontal: 9, gap: 4, borderRadius: 14 },
  pantallaGeneros: { flex: 1, width: '100%' },
  cabezaGeneros: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  cerrar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grillaGeneros: {
    flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 4,
    width: '100%', maxWidth: 720, alignSelf: 'center',
  },
  celdaGenero: { width: '50%', padding: 6 },
  tarjetaGrande: { height: 100, borderRadius: 8, overflow: 'hidden', padding: 14, gap: 2 },
  tarjetaGrandeIcono: { position: 'absolute', right: -8, bottom: -12, transform: [{ rotate: '-18deg' }] },
  marca: { position: 'absolute', right: 10, top: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
