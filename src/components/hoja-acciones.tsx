// Hoja de acciones como la de iOS: sube desde abajo, opciones agrupadas y "Cancelar" aparte.
// Funciona igual en iPhone, Android y web (Alert con botones no funciona en web).
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

export type OpcionHoja = { texto: string; icono?: string; destructiva?: boolean; onPress: () => void };

// `encabezado`: contenido libre arriba de las opciones (por ejemplo, la fila de reacciones del chat).
export function HojaAcciones({ visible, titulo, mensaje, opciones, onCerrar, encabezado }: {
  visible: boolean; titulo?: string; mensaje?: string; opciones: OpcionHoja[]; onCerrar: () => void; encabezado?: ReactNode;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible && (
        <View style={styles.contenedor}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(240)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.hoja, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            {encabezado}
            <View style={[styles.grupo, { backgroundColor: t.card }]}>
              {titulo || mensaje ? (
                <View style={[styles.cabecera, { borderBottomColor: t.separator }]}>
                  {titulo ? <Texto v="pie" secundario style={{ fontWeight: '600', textAlign: 'center' }}>{titulo}</Texto> : null}
                  {mensaje ? <Texto v="pie" secundario style={{ textAlign: 'center' }}>{mensaje}</Texto> : null}
                </View>
              ) : null}
              {opciones.map((o, i) => (
                <Pressable
                  key={o.texto}
                  accessibilityRole="button"
                  onPress={() => { onCerrar(); o.onPress(); }}
                  style={({ pressed }) => [
                    styles.opcion,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator },
                    pressed && { backgroundColor: t.backgroundSelected },
                  ]}>
                  {o.icono ? <Icono nombre={o.icono} tamano={19} color={o.destructiva ? t.danger : t.text} /> : null}
                  <Texto style={{ color: o.destructiva ? t.danger : t.text, fontSize: 18 }}>{o.texto}</Texto>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={onCerrar}
              style={({ pressed }) => [styles.grupo, styles.opcion, { backgroundColor: t.card }, pressed && { opacity: 0.7 }]}>
              <Texto style={{ fontSize: 18, fontWeight: '600' }}>{tr('comun.cancelar')}</Texto>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: { paddingHorizontal: 10, gap: 8, width: '100%', maxWidth: 500, alignSelf: 'center' },
  grupo: { borderRadius: 14, overflow: 'hidden' },
  cabecera: { paddingVertical: 12, paddingHorizontal: 16, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  opcion: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
});
