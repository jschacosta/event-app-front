// La hoja de los avisos y preguntas de Bora (ver lib/dialogo.ts): sube desde abajo, con el ícono de la
// acción, el título en la letra del logo y los botones a lo ancho (el principal en açaí). Igual en
// Android, iPhone y web. Sin rebote: entra con una curva suave.
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconoBora } from '@/components/iconos-bora';
import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { cerrarDialogo, useDialogo, type BotonDialogo } from '@/lib/dialogo';

export function DialogoGlobal() {
  const d = useDialogo();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  // Tocar fuera o el botón atrás de Android equivale al botón que no hace nada (Cancelar / Ahora no).
  const cancelar = () => {
    const neutro = d?.botones.find((b) => !b.onPress);
    cerrarDialogo();
    neutro?.onPress?.();
  };
  const tocar = (b: BotonDialogo) => {
    cerrarDialogo();
    b.onPress?.();
  };
  return (
    <Modal visible={Boolean(d)} transparent animationType="none" onRequestClose={cancelar} statusBarTranslucent>
      {d ? (
        <View style={styles.contenedor}>
          <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={cancelar} accessibilityRole="button" />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
            accessibilityViewIsModal
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 14) + 8 }]}>
            <View style={[styles.asa, { backgroundColor: t.outline }]} />
            <View style={styles.cabeza}>
              {d.icono ? (
                <View style={[styles.circulo, { backgroundColor: t.accentSoft }]}>
                  <IconoBora nombre={d.icono} tamano={24} color={t.accentSoftText} />
                </View>
              ) : null}
              <Texto v="titulo" accessibilityRole="header">{d.titulo}</Texto>
              {d.texto ? <Texto v="detalle" secundario>{d.texto}</Texto> : null}
            </View>
            <View style={styles.botones}>
              {d.botones.map((b) => {
                const principal = b.tipo === 'principal';
                const destructivo = b.tipo === 'destructivo';
                return (
                  <Pressable
                    key={b.texto}
                    onPress={() => tocar(b)}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.boton,
                      { backgroundColor: principal ? t.accent : destructivo ? t.backgroundElement : 'transparent' },
                      pressed && { opacity: 0.75 },
                    ]}>
                    <Texto v="cuerpoFuerte" style={{ color: principal ? t.onAccent : destructivo ? t.danger : t.text, fontWeight: principal || destructivo ? '700' : '600' }}>
                      {b.texto}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(18,10,23,0.5)' },
  hoja: { borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingHorizontal: 20, paddingTop: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  asa: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 18 },
  cabeza: { gap: 8 },
  circulo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  botones: { gap: 8, marginTop: 22 },
  boton: { height: 48, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
});
