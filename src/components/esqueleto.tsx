// Formas grises que laten mientras carga: muestran cómo va a quedar la pantalla en vez de una ruedita.
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/hooks/use-theme';

function Pulso({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const quieto = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (!quieto) v.set(withRepeat(withTiming(1, { duration: 850 }), -1, true));
  }, [v, quieto]);
  const estilo = useAnimatedStyle(() => ({ opacity: 1 - v.value * 0.45 }));
  return <Animated.View style={estilo} accessibilityLabel={t('comun.cargando')} accessibilityRole="progressbar">{children}</Animated.View>;
}

function Bloque({ ancho, alto, radio = 4, style }: { ancho: DimensionValue; alto: number; radio?: number; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[{ width: ancho, height: alto, borderRadius: radio, backgroundColor: t.backgroundElement }, style]} />;
}

// Agenda: el número del día a la izquierda y filas con miniatura, nombre, hora y etiqueta.
const ANCHOS: DimensionValue[] = ['78%', '62%', '86%', '55%', '70%'];
export function EsqueletoAgenda() {
  return (
    <Pulso>
      <View style={{ gap: 4, marginTop: 22 }}>
        {[3, 2].map((filas, d) => (
          <View key={d} style={styles.dia}>
            <View style={{ width: 50, gap: 6, paddingTop: 6 }}>
              <Bloque ancho={34} alto={30} />
              <Bloque ancho={28} alto={10} />
            </View>
            <View style={{ flex: 1 }}>
              {Array.from({ length: filas }, (_, i) => (
                <View key={i} style={styles.fila}>
                  <Bloque ancho={56} alto={56} radio={6} />
                  <View style={{ flex: 1, gap: 7, paddingTop: 2 }}>
                    <Bloque ancho={ANCHOS[(d * 3 + i) % ANCHOS.length]} alto={14} />
                    <Bloque ancho="45%" alto={11} />
                    <Bloque ancho={52} alto={15} radio={3} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </Pulso>
  );
}

// Canales: fila con la foto redonda, nombre y cuándo abre.
export function EsqueletoCanales({ filas = 6 }: { filas?: number }) {
  return (
    <Pulso>
      <View style={{ marginTop: 20, gap: 4 }}>
        <Bloque ancho={120} alto={16} style={{ marginLeft: 20, marginBottom: 8 }} />
        {Array.from({ length: filas }, (_, i) => (
          <View key={i} style={styles.canal}>
            <Bloque ancho={62} alto={62} radio={31} />
            <View style={{ flex: 1, gap: 8 }}>
              <Bloque ancho={ANCHOS[i % ANCHOS.length]} alto={15} />
              <Bloque ancho="50%" alto={12} />
            </View>
          </View>
        ))}
      </View>
    </Pulso>
  );
}

const styles = StyleSheet.create({
  dia: { flexDirection: 'row', paddingLeft: 16, marginTop: 14 },
  fila: { flexDirection: 'row', gap: 10, paddingVertical: 9, paddingLeft: 6, paddingRight: 16 },
  canal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 11 },
});
