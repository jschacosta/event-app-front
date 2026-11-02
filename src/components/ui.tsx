// Componentes base con el estilo de iOS (diseño "Rio Eventos").
// Todos toman los colores del tema, así funcionan en modo claro y en modo noche.
import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Children, Fragment, isValidElement, useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';

import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

// ---------- Íconos: SF Symbols en iPhone, Ionicons en Android y web ----------
const EQUIVALENTES: Record<string, ComponentProps<typeof Ionicons>['name']> = {
  'chevron.right': 'chevron-forward',
  'chevron.left': 'chevron-back',
  'square.and.arrow.up': 'share-outline',
  'checkmark': 'checkmark',
  'questionmark': 'help',
  'wineglass': 'wine-outline',
  'plus': 'add',
  'arrow.up': 'arrow-up',
  'mappin': 'location-outline',
  'calendar': 'calendar-outline',
  'bubble.left': 'chatbubble-outline',
  'star': 'star-outline',
  'person': 'person-outline',
  'xmark': 'close',
  'camera': 'camera-outline',
  'magnifyingglass': 'search',
  'xmark.circle.fill': 'close-circle',
  'pencil': 'pencil',
  'globe': 'globe-outline',
  'circle.lefthalf.filled': 'contrast-outline',
  'rectangle.portrait.and.arrow.right': 'log-out-outline',
  'sparkles': 'sparkles-outline',
  'airplane': 'airplane-outline',
  'bubble.left.and.bubble.right': 'chatbubbles-outline',
  'person.2': 'people-outline',
  'line.3.horizontal.decrease': 'options-outline',
  'checkmark.circle.fill': 'checkmark-circle',
  'chevron.down': 'chevron-down',
  'location.fill': 'location',
  'lock.fill': 'lock-closed',
  'lock.open': 'lock-open-outline',
  'flag': 'flag-outline',
  'hand.raised': 'hand-left-outline',
  'briefcase': 'briefcase-outline',
  'eye': 'eye-outline',
  'checkmark.seal.fill': 'checkmark-circle',
  'ellipsis': 'ellipsis-horizontal',
  'link': 'link-outline',
  'trash': 'trash-outline',
  'shield.lefthalf.filled': 'shield-half-outline',
  'person.crop.circle.badge.exclamationmark': 'person-circle-outline',
  'speaker.slash': 'volume-mute-outline',
  'exclamationmark.triangle': 'warning-outline',
  'repeat': 'repeat',
  'square.grid.2x2': 'grid-outline',
  'hourglass': 'hourglass-outline',
  'arrowshape.turn.up.left': 'arrow-undo-outline',
  'doc.on.doc': 'copy-outline',
  'face.smiling': 'happy-outline',
  'keyboard': 'keypad-outline',
  'camera.viewfinder': 'scan-outline',
  'pin': 'pin-outline',
  'pin.fill': 'pin',
  'pin.slash': 'remove-circle-outline',
  'chart.bar': 'stats-chart-outline',
  'minus.circle': 'remove-circle-outline',
  'eye.slash': 'eye-off-outline',
  'bell.slash': 'notifications-off-outline',
  'arrow.uturn.backward': 'arrow-undo-outline',
  'timer': 'timer-outline',
};

export function Icono({ nombre, tamano = 20, color, peso = 'regular' }: {
  nombre: keyof typeof EQUIVALENTES; tamano?: number; color: string; peso?: 'regular' | 'semibold' | 'bold';
}) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={nombre as SFSymbol} size={tamano} tintColor={color} weight={peso} />;
  }
  return <Ionicons name={EQUIVALENTES[nombre]} size={tamano} color={color} />;
}

// ---------- Texto ----------
export const fuenteWeb = Platform.select({ web: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif' });

type Variante = 'tituloGrande' | 'titulo' | 'seccion' | 'cuerpo' | 'cuerpoFuerte' | 'detalle' | 'pie' | 'grupo' | 'mini';
const VARIANTES: Record<Variante, TextStyle> = {
  tituloGrande: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.4 },
  titulo: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.3 },
  seccion: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  cuerpo: { fontSize: 17, lineHeight: 22 },
  cuerpoFuerte: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  detalle: { fontSize: 15, lineHeight: 20 },
  pie: { fontSize: 13, lineHeight: 18 },
  grupo: { fontSize: 13, lineHeight: 18, textTransform: 'uppercase' },
  mini: { fontSize: 12, lineHeight: 16 },
};

export function Texto({ v = 'cuerpo', secundario, acento, style, ...rest }: ComponentProps<typeof Text> & {
  v?: Variante; secundario?: boolean; acento?: boolean;
}) {
  const t = useTheme();
  const color = acento ? t.accentText : secundario ? t.textSecondary : t.text;
  return <Text style={[{ color, fontFamily: fuenteWeb }, VARIANTES[v], style]} {...rest} />;
}

// ---------- Listas agrupadas ----------
export function Grupo({ titulo, pie, children, style }: { titulo?: string; pie?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const hijos = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ gap: 6 }, style]}>
      {titulo ? <Texto v="grupo" secundario style={{ paddingHorizontal: 16 }}>{titulo}</Texto> : null}
      <View style={{ backgroundColor: t.card, borderRadius: 12, overflow: 'hidden' }}>
        {hijos.map((hijo, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.separator, marginLeft: 16 }} />}
            {hijo}
          </Fragment>
        ))}
      </View>
      {pie ? <Texto v="pie" secundario style={{ paddingHorizontal: 16 }}>{pie}</Texto> : null}
    </View>
  );
}

export function Fila({ etiqueta, valor, onPress, derecha, chevron = Boolean(onPress) }: {
  etiqueta: string; valor?: ReactNode; onPress?: () => void; derecha?: ReactNode; chevron?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundSelected }]}>
      <Texto style={{ flexShrink: 0 }}>{etiqueta}</Texto>
      <View style={styles.filaDerecha}>
        {typeof valor === 'string' || typeof valor === 'number' ? <Texto secundario numberOfLines={1}>{valor}</Texto> : valor}
        {derecha}
        {chevron && <Icono nombre="chevron.right" tamano={14} color={t.chevron} peso="semibold" />}
      </View>
    </Pressable>
  );
}

export function FilaInterruptor({ etiqueta, valor, onCambio }: { etiqueta: string; valor: boolean; onCambio: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <View style={styles.fila}>
      <Texto style={{ flex: 1 }}>{etiqueta}</Texto>
      <Switch
        value={valor}
        onValueChange={onCambio}
        trackColor={{ true: t.switchOn, false: t.segmentTrack }}
        thumbColor="#FFFFFF"
        {...(Platform.OS === 'web' ? ({ activeThumbColor: '#FFFFFF' } as object) : {})}
      />
    </View>
  );
}

// ---------- Botones ----------
export function BotonPrincipal({ texto, onPress, ocupado, deshabilitado, secundario }: {
  texto: string; onPress: () => void; ocupado?: boolean; deshabilitado?: boolean; secundario?: boolean;
}) {
  const t = useTheme();
  const inactivo = deshabilitado || ocupado;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.boton,
        { backgroundColor: secundario ? t.card : t.accent },
        (pressed || deshabilitado) && { opacity: deshabilitado ? 0.4 : 0.75 },
      ]}>
      {ocupado ? <ActivityIndicator color={secundario ? t.text : t.onAccent} /> : (
        <Texto v="cuerpoFuerte" style={{ color: secundario ? t.accentText : t.onAccent }}>{texto}</Texto>
      )}
    </Pressable>
  );
}

export function BotonTexto({ texto, onPress }: { texto: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button">
      {({ pressed }) => <Texto acento style={{ opacity: pressed ? 0.5 : 1 }}>{texto}</Texto>}
    </Pressable>
  );
}

// ---------- Selector segmentado (Hoy / Mañana / Semana) ----------
// Como el de iOS: la pastilla blanca se desliza con un resorte hasta la opción elegida.
// `marcas`: segmentos con un punto al lado (por ejemplo, salas con mensajes nuevos).
export function Segmentado<T extends string>({ opciones, valor, onCambio, marcas }: {
  opciones: { id: T; texto: string }[]; valor: T; onCambio: (id: T) => void; marcas?: Partial<Record<T, boolean>>;
}) {
  const t = useTheme();
  const [ancho, setAncho] = useState(0);
  const indice = Math.max(0, opciones.findIndex((o) => o.id === valor));
  const anchoSegmento = ancho > 0 ? (ancho - 4) / opciones.length : 0;
  const x = useSharedValue(indice);
  useEffect(() => {
    x.set(withSpring(indice, { damping: 22, stiffness: 260, mass: 0.7 }));
  }, [indice, x]);
  const estiloPastilla = useAnimatedStyle(() => ({
    width: anchoSegmento,
    transform: [{ translateX: x.value * anchoSegmento }],
  }));
  return (
    <View
      onLayout={(e) => setAncho(e.nativeEvent.layout.width)}
      style={[styles.segmentado, { backgroundColor: t.segmentTrack }]}>
      {ancho > 0 && <Animated.View style={[styles.pastilla, { backgroundColor: t.segmentThumb }, estiloPastilla]} />}
      {opciones.map((o) => {
        const activo = o.id === valor;
        return (
          <Pressable
            key={o.id}
            onPress={() => onCambio(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            style={styles.segmento}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Texto v="pie" style={{ fontWeight: activo ? '600' : '500' }}>{o.texto}</Texto>
              {marcas?.[o.id] ? <View style={[styles.marca, { backgroundColor: t.danger }]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------- Píldoras (intereses, géneros) ----------
export function Pildora({ texto, activa, onPress }: { texto: string; activa?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityState={{ selected: activa }}
      style={[styles.pildora, { backgroundColor: activa ? t.accent : t.backgroundElement }]}>
      <Texto v="detalle" style={activa ? { color: t.onAccent, fontWeight: '500' } : undefined}>{texto}</Texto>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fila: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  filaDerecha: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  boton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  segmentado: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  marca: { width: 7, height: 7, borderRadius: 4 },
  segmento: { flex: 1, height: 30, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  pastilla: {
    position: 'absolute', top: 2, left: 2, height: 30, borderRadius: 7,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  pildora: { height: 34, paddingHorizontal: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
