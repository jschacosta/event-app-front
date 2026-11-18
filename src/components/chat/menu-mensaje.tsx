// Menú de un mensaje como en Telegram: al mantenerlo apretado, el fondo se oscurece y desenfoca,
// el mensaje se levanta en su lugar (una copia exacta encima), la fila de reacciones sale desde el
// mensaje, emoji por emoji, y la lista de acciones se despliega desde su borde. Al cerrar, todo vuelve.
import { BlurView } from 'expo-blur';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import type { OpcionHoja } from '@/components/hoja-acciones';
import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

export type Ancla = { x: number; y: number; ancho: number; alto: number };

const ALTO_REACCIONES = 50;
const ALTO_OPCION = 42;
const ESPACIO = 8;
const ANCHO_MENU = 230;

export function MenuMensaje({ ancla, mia, vista, reacciones, panel, opciones, onCerrar }: {
  ancla: Ancla | null; // null = cerrado
  mia: boolean; // los propios se alinean a la derecha
  vista: ReactNode; // copia del mensaje
  reacciones?: ReactNode;
  panel?: ReactNode; // panel con todos los emojis: reemplaza a las acciones
  opciones: OpcionHoja[];
  onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height: altoPantalla, width: anchoPantalla } = useWindowDimensions();
  const p = useSharedValue(0);
  const [cerrando, setCerrando] = useState(false);
  const [vistaAbierta, setVistaAbierta] = useState<Ancla | null>(null);
  if (ancla !== vistaAbierta) {
    setVistaAbierta(ancla);
    setCerrando(false);
  }

  useEffect(() => {
    if (ancla) p.set(withSpring(1, { damping: 18, stiffness: 260, mass: 0.8 }));
  }, [ancla, p]);

  const cerrar = (despues?: () => void) => {
    if (cerrando) return;
    setCerrando(true);
    const fin = () => { onCerrar(); despues?.(); };
    p.set(withTiming(0, { duration: 160, easing: Easing.in(Easing.cubic) }, (listo) => { if (listo) scheduleOnRN(fin); }));
  };

  // Dónde va todo: arriba las reacciones, el mensaje, abajo las acciones. Si no cabe, se corre
  // hacia arriba o hacia abajo (el mensaje se mueve a su nuevo lugar con la animación).
  const altoMenu = panel ? 260 : opciones.length * ALTO_OPCION + 8;
  const altoMensaje = ancla ? Math.min(ancla.alto, altoPantalla * 0.45) : 0;
  const total = ALTO_REACCIONES + ESPACIO + altoMensaje + ESPACIO + altoMenu;
  const minimo = insets.top + 8;
  const maximo = altoPantalla - insets.bottom - 8 - total;
  const arriba = ancla ? Math.max(minimo, Math.min(ancla.y - ALTO_REACCIONES - ESPACIO, maximo)) : 0;
  const yMensaje = arriba + ALTO_REACCIONES + ESPACIO;
  const corrimiento = ancla ? ancla.y - yMensaje : 0;
  const lado = mia ? { right: 12 } : { left: ancla ? Math.max(12, Math.min(ancla.x + 36, anchoPantalla - ANCHO_MENU - 12)) : 12 };

  const velo = useAnimatedStyle(() => ({ opacity: p.value }));
  const mensaje = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - p.value) * corrimiento }, { scale: 0.97 + p.value * 0.03 }],
  }));
  const fila = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    transform: [{ translateY: (1 - p.value) * 18 }, { scale: 0.6 + p.value * 0.4 }],
  }));
  const menu = useAnimatedStyle(() => ({
    opacity: Math.min(1, p.value * 1.4),
    transform: [{ translateY: (1 - p.value) * -14 }, { scale: 0.55 + p.value * 0.45 }],
  }));

  const oscuro = t.background !== '#FFFFFF';
  return (
    <Modal visible={Boolean(ancla)} transparent animationType="none" onRequestClose={() => cerrar()} statusBarTranslucent>
      {ancla ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, velo]}>
            {Platform.OS === 'web'
              ? <View style={[StyleSheet.absoluteFill, styles.desenfoqueWeb]} />
              : <BlurView intensity={28} tint={oscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />}
            <Pressable
              style={[StyleSheet.absoluteFill, { backgroundColor: oscuro ? 'rgba(0,0,0,0.45)' : 'rgba(26,16,35,0.28)' }]}
              onPress={() => cerrar()}
              accessibilityLabel={tr('comun.cancelar')}
            />
          </Animated.View>

          {reacciones ? (
            <Animated.View
              style={[styles.reacciones, { top: arriba }, mia ? { right: 12, transformOrigin: 'right bottom' } : { left: 12, transformOrigin: 'left bottom' }, fila]}>
              {reacciones}
            </Animated.View>
          ) : null}

          <Animated.View pointerEvents="none" style={[styles.mensaje, { top: yMensaje, left: ancla.x, width: ancla.ancho, maxHeight: altoMensaje }, mensaje]}>
            {vista}
          </Animated.View>

          <Animated.View
            style={[
              styles.menu,
              { top: yMensaje + altoMensaje + ESPACIO, backgroundColor: t.card, width: panel ? undefined : ANCHO_MENU },
              panel ? { left: 12, right: 12 } : lado,
              { transformOrigin: mia ? 'right top' : 'left top' },
              menu,
            ]}>
            {panel ?? (
              <ScrollView bounces={false} style={{ maxHeight: altoMenu }}>
                {opciones.map((o, i) => (
                  <Animated.View key={o.texto} entering={FadeIn.delay(40 + i * 18).duration(140)}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => cerrar(o.onPress)}
                      style={({ pressed }) => [
                        styles.opcion,
                        i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator },
                        pressed && { backgroundColor: t.backgroundSelected },
                      ]}>
                      <Texto style={{ flex: 1, fontSize: 15, color: o.destructiva ? t.danger : t.text }} numberOfLines={1}>{o.texto}</Texto>
                      {o.icono ? <Icono nombre={o.icono} tamano={17} color={o.destructiva ? t.danger : t.text} /> : null}
                    </Pressable>
                  </Animated.View>
                ))}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  desenfoqueWeb: { backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' } as object,
  reacciones: { position: 'absolute', height: ALTO_REACCIONES, justifyContent: 'center' },
  mensaje: { position: 'absolute', overflow: 'hidden' },
  menu: {
    position: 'absolute', borderRadius: 10, overflow: 'hidden', paddingVertical: 4,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10,
  },
  opcion: { height: ALTO_OPCION, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 },
});
