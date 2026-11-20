// Hoja de Bora con contenido propio (elegir barrio, recordatorio, cómo llegar). Es la misma hoja de los
// avisos (components/dialogo.tsx): sube desde abajo sin rebote, con el ícono en su círculo açaí y el título
// en la letra del logo. Debajo van las filas que necesite cada caso (FilaOpcion).
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconoBora, type NombreIconoBora } from '@/components/iconos-bora';
import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

export function HojaBora({ visible, onCerrar, icono, titulo, texto, children, alto }: {
  visible: boolean; onCerrar: () => void; icono?: NombreIconoBora; titulo: string; texto?: string; children: ReactNode;
  alto?: number | `${number}%`; // para listas largas (barrios): la hoja crece hasta aquí y la lista se desplaza
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible ? (
        <View style={styles.contenedor}>
          <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityRole="button" />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
            accessibilityViewIsModal
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 14) + 8, maxHeight: alto ?? '88%' }, alto ? { height: alto } : null]}>
            <View style={[styles.asa, { backgroundColor: t.outline }]} />
            <View style={styles.cabeza}>
              {icono ? (
                <View style={[styles.circulo, { backgroundColor: t.accentSoft }]}>
                  <IconoBora nombre={icono} tamano={24} color={t.accentSoftText} />
                </View>
              ) : null}
              <Texto v="titulo" accessibilityRole="header">{titulo}</Texto>
              {texto ? <Texto v="detalle" secundario>{texto}</Texto> : null}
            </View>
            <View style={{ marginTop: 14, flexShrink: 1 }}>{children}</View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

// Fila de una hoja: texto, detalle opcional y, a la derecha, la marca de elegida o una flecha.
export function FilaOpcion({ texto, detalle, elegida, flecha, onPress, ultima, izquierda, derecha }: {
  texto: string; detalle?: string; elegida?: boolean; flecha?: boolean; onPress: () => void; ultima?: boolean;
  izquierda?: ReactNode; derecha?: ReactNode;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={elegida === undefined ? 'button' : 'radio'}
      accessibilityState={elegida === undefined ? undefined : { checked: elegida }}
      style={({ pressed }) => [styles.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }, pressed && { opacity: 0.6 }]}>
      {izquierda}
      <View style={{ flex: 1, gap: 1 }}>
        <Texto v="cuerpoFuerte" style={elegida ? { color: t.accentText } : undefined}>{texto}</Texto>
        {detalle ? <Texto v="pie" secundario>{detalle}</Texto> : null}
      </View>
      {derecha}
      {elegida ? (
        <View style={[styles.marca, { backgroundColor: t.accent }]}>
          <Icono nombre="checkmark" tamano={11} color={t.onAccent} peso="bold" />
        </View>
      ) : elegida === false ? (
        <View style={[styles.marca, { borderWidth: 1.5, borderColor: t.outline }]} />
      ) : flecha ? (
        <Icono nombre="chevron.right" tamano={12} color={t.chevron} peso="bold" />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(18,10,23,0.5)' },
  hoja: { borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 20, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  asa: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 18 },
  cabeza: { gap: 8 },
  circulo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 10 },
  marca: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
