// Piezas compartidas por la Agenda y los Chats: ciudad, buscador y tipos de música.
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring, withTiming, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { fuenteWeb, Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useCiudad } from '@/lib/ciudades';
import { fechaDeClave, proximosDias } from '@/lib/fechas';
import { coloresGenero, iconoGenero, nombreGenero } from '@/lib/generos';

// ---------- Ciudad: botón que abre el selector ----------
export function BotonCiudad() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const ciudad = useCiudad();
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
export function BarraBusqueda({ valor, onCambio, placeholder }: { valor: string; onCambio: (v: string) => void; placeholder: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={[styles.busqueda, { backgroundColor: t.backgroundElement }]}>
      <Icono nombre="magnifyingglass" tamano={16} color={t.textSecondary} />
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        returnKeyType="search"
        autoCorrect={false}
        style={[styles.busquedaTexto, { color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
      />
      {valor ? (
        <Animated.View entering={ZoomIn.duration(150)} exiting={ZoomOut.duration(120)}>
          <Pressable onPress={() => onCambio('')} hitSlop={10} accessibilityLabel={tr('agenda.borrarBusqueda')}>
            <Icono nombre="xmark.circle.fill" tamano={17} color={t.textSecondary} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

// ---------- Fechas: tira de días, como el calendario semanal de iOS ----------
function Dia({ arriba, numero, abajo, elegido, conEventos, onPress, icono = 'calendar' }: {
  arriba: string; numero: string | null; abajo?: string; elegido: boolean; conEventos: boolean; onPress: () => void;
  icono?: 'calendar' | 'square.grid.2x2';
}) {
  const t = useTheme();
  const escala = useSharedValue(1);
  useEffect(() => {
    escala.set(withSpring(elegido ? 1 : 0.94, { damping: 16, stiffness: 300 }));
  }, [elegido, escala]);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  const color = elegido ? t.background : t.text;
  return (
    <Pressable onPress={onPress} disabled={!conEventos && !elegido} accessibilityRole="button" accessibilityState={{ selected: elegido, disabled: !conEventos }}>
      <Animated.View style={[styles.dia, { backgroundColor: elegido ? t.text : t.backgroundElement, opacity: conEventos || elegido ? 1 : 0.4 }, animado]}>
        <Texto v="mini" style={{ color: elegido ? t.background : t.textSecondary, fontWeight: '600', textTransform: 'uppercase' }}>{arriba}</Texto>
        {numero === null ? (
          <Icono nombre={icono} tamano={20} color={color} />
        ) : (
          <Texto v="seccion" style={{ color, lineHeight: 26 }}>{numero}</Texto>
        )}
        <Texto v="mini" style={{ color: elegido ? t.background : t.textSecondary, opacity: abajo ? 1 : 0 }}>{abajo ?? '·'}</Texto>
      </Animated.View>
    </Pressable>
  );
}

// `valor`: null = todas las fechas, o la clave del día ("2026-11-03"). Los días sin eventos se ven apagados.
// Con `onCalendario`, la segunda casilla abre un calendario para elegir cualquier fecha; si la fecha
// elegida no está en la tira, esa casilla la muestra.
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
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filaDias}>
      <Dia arriba={tr('fechas.todas')} numero={null} icono="square.grid.2x2" elegido={valor === null} conEventos onPress={() => onCambio(null)} />
      {onCalendario ? (
        <Dia
          arriba={elegidaAparte ? elegidaAparte.semana : tr('fechas.elegir')}
          numero={elegidaAparte ? String(elegidaAparte.numero) : null}
          abajo={elegidaAparte?.mes}
          elegido={fueraDeLaTira}
          conEventos
          onPress={onCalendario}
        />
      ) : null}
      {lista.map((d, k) => (
        <Dia
          key={d.clave}
          arriba={k === 0 ? tr('fechas.hoy') : d.semana}
          numero={String(d.numero)}
          abajo={k === 0 || d.numero === 1 ? d.mes : undefined}
          elegido={valor === d.clave}
          conEventos={diasConEventos.has(d.clave)}
          onPress={() => onCambio(valor === d.clave ? null : d.clave)}
        />
      ))}
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
    escala.set(withSpring(elegido ? 1.04 : hayOtroElegido ? 0.96 : 1, { damping: 14, stiffness: 260 }));
  }, [elegido, hayOtroElegido, opacidad, escala]);
  const animado = useAnimatedStyle(() => ({ opacity: opacidad.value, transform: [{ scale: escala.value }] }));
  const colores = coloresGenero(id);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: elegido }} accessibilityLabel={nombreGenero(id)}>
      <Animated.View style={[styles.tarjeta, animado]}>
        <LinearGradient colors={colores as [string, string, ...string[]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Texto v="detalle" style={styles.tarjetaTexto} numberOfLines={1}>{nombreGenero(id)}</Texto>
        <View style={styles.tarjetaIcono}>
          <MaterialCommunityIcons name={iconoGenero(id)} size={40} color="rgba(255,255,255,0.92)" />
        </View>
        {elegido && (
          <Animated.View entering={ZoomIn.springify().damping(14)} exiting={ZoomOut.duration(120)} style={styles.tarjetaQuitar}>
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
        entering={ZoomIn.springify().damping(16)}
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
  vacio: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  filaDias: { paddingHorizontal: 20, gap: 8, paddingVertical: 2 },
  dia: { width: 54, height: 72, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 1 },
  ciudad: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 28, paddingHorizontal: 11, borderRadius: 14, alignSelf: 'flex-start' },
  busqueda: { height: 38, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 },
  busquedaTexto: { flex: 1, fontSize: 17, height: 38, padding: 0 },
  fila: { paddingHorizontal: 20, paddingVertical: 4, gap: 10 },
  tarjeta: { width: 116, height: 68, borderRadius: 14, overflow: 'hidden', padding: 10 },
  tarjetaTexto: { color: '#FFFFFF', fontWeight: '700' },
  tarjetaIcono: { position: 'absolute', right: -6, bottom: -8, transform: [{ rotate: '-18deg' }] },
  tarjetaQuitar: {
    position: 'absolute', right: 6, top: 6, width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16,
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
  tarjetaGrande: { height: 110, borderRadius: 18, overflow: 'hidden', padding: 14, gap: 2 },
  tarjetaGrandeIcono: { position: 'absolute', right: -8, bottom: -12, transform: [{ rotate: '-18deg' }] },
  marca: { position: 'absolute', right: 10, top: 10, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
