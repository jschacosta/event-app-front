// Piezas para las pantallas largas (Agenda, Canales, eventos de un día):
// - Al bajar, el buscador "se pega" arriba con un título chico, como la barra de iOS
//   cuando el título grande desaparece.
// - Botón flotante abajo a la derecha para volver arriba.
import { BlurView } from 'expo-blur';
import { useCallback, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type ScrollView } from 'react-native';
import Animated, {
  Easing, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, ZoomIn, ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { BarraBusqueda } from '@/components/filtros';
import { Icono, Texto } from '@/components/ui';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ALTO_TITULO = 44; // fila del título chico
const MOSTRAR_ARRIBA = 700; // desde cuántos píxeles bajados aparece el botón de volver arriba

export function useDesplazamiento() {
  const insets = useSafeAreaInsets();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const y = useSharedValue(0);
  const umbral = useSharedValue(Number.POSITIVE_INFINITY);
  const [compacto, setCompacto] = useState(false);
  const [arriba, setArriba] = useState(false);

  const onScroll = useAnimatedScrollHandler((e) => { y.set(e.contentOffset.y); });
  useAnimatedReaction(() => y.value > umbral.value, (v, antes) => { if (v !== antes) scheduleOnRN(setCompacto, v); });
  useAnimatedReaction(() => y.value > MOSTRAR_ARRIBA, (v, antes) => { if (v !== antes) scheduleOnRN(setArriba, v); });

  // Se llama en el onLayout del buscador de la pantalla: cuando ese buscador llega
  // debajo del título chico, aparece el encabezado compacto.
  const medirBuscador = useCallback((e: LayoutChangeEvent) => {
    umbral.set(e.nativeEvent.layout.y - insets.top - ALTO_TITULO);
  }, [umbral, insets.top]);

  const subir = useCallback(() => ref.current?.scrollTo({ y: 0, animated: true }), []);

  return { ref, onScroll, medirBuscador, compacto, arriba, subir };
}

// Encabezado translúcido que aparece arriba al bajar: título chico + buscador.
export function EncabezadoCompacto({ visible, titulo, izquierda, derecha, busqueda }: {
  visible: boolean;
  titulo: string;
  izquierda?: ReactNode;
  derecha?: ReactNode;
  busqueda?: { valor: string; onCambio: (v: string) => void; placeholder: string };
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withTiming(visible ? 1 : 0, { duration: visible ? 260 : 180, easing: Easing.out(Easing.cubic) }));
  }, [visible, p]);
  const estilo = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * -14 }] }));
  const estiloTitulo = useAnimatedStyle(() => ({ transform: [{ scale: 0.92 + p.value * 0.08 }] }));

  return (
    <Animated.View style={[styles.cabecera, { pointerEvents: visible ? 'auto' : 'none' }, estilo]}>
      <BlurView intensity={60} tint={t.background === '#000000' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bar }]} />
      <View style={[styles.contenido, { paddingTop: insets.top }]}>
        <View style={styles.filaTitulo}>
          <View style={styles.lado}>{izquierda}</View>
          <Animated.View style={[estiloTitulo, { flexShrink: 1 }]}>
            <Texto v="cuerpoFuerte" numberOfLines={1}>{titulo}</Texto>
          </Animated.View>
          <View style={[styles.lado, { alignItems: 'flex-end' }]}>{derecha}</View>
        </View>
        {busqueda ? (
          <View style={styles.busqueda}>
            <BarraBusqueda valor={busqueda.valor} onCambio={busqueda.onCambio} placeholder={busqueda.placeholder} />
          </View>
        ) : null}
      </View>
      <View style={[styles.linea, { backgroundColor: t.separator }]} />
    </Animated.View>
  );
}

// Botón redondo abajo a la derecha que lleva al principio de la lista.
export function BotonArriba({ visible, onPress, sinPestanas }: { visible: boolean; onPress: () => void; sinPestanas?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(15).stiffness(220)}
      exiting={ZoomOut.duration(150)}
      style={[styles.arriba, { bottom: insets.bottom + (sinPestanas ? 0 : BottomTabInset) + 16 }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={tr('comun.volverArriba')}
        hitSlop={6}
        style={({ pressed }) => [styles.arribaBoton, { backgroundColor: t.text }, pressed && { transform: [{ scale: 0.92 }], opacity: 0.85 }]}>
        <Icono nombre="arrow.up" tamano={20} color={t.background} peso="semibold" />
      </Pressable>
    </Animated.View>
  );
}

// Botón "‹" redondo para volver (pantallas sin barra de navegación).
export function BotonVolver({ onPress }: { onPress: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={tr('comun.volver')}
      hitSlop={8}
      style={({ pressed }) => [styles.volver, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
      <Icono nombre="chevron.left" tamano={17} color={t.text} peso="semibold" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cabecera: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, overflow: 'hidden' },
  contenido: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  filaTitulo: { height: ALTO_TITULO, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  lado: { flex: 1, minWidth: 44, alignItems: 'flex-start' },
  busqueda: { paddingHorizontal: 20, paddingBottom: 10 },
  linea: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  arriba: { position: 'absolute', right: 20, zIndex: 10 },
  arribaBoton: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  volver: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
