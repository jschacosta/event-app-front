// Deslizar un mensaje hacia la derecha para responderlo, como en WhatsApp.
// Al pasar el umbral vibra un poco y aparece la flecha; al soltar, se responde.
// Funciona en la app y en la web (con el dedo o arrastrando con el mouse).
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Icono } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

const UMBRAL = 56;
const MAXIMO = 84;

const vibrar = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); };

export function DeslizarParaResponder({ children, onResponder }: { children: ReactNode; onResponder: () => void }) {
  const t = useTheme();
  const x = useSharedValue(0);
  const pasoUmbral = useSharedValue(false);

  const gesto = usePanGesture({
    // Solo hacia la derecha y casi horizontal; si el dedo va en vertical, manda el scroll de la lista.
    activeOffsetX: [-1000, 14],
    failOffsetY: [-12, 12],
    onUpdate: (e) => {
      'worklet';
      const d = Math.max(0, e.translationX);
      // Después del máximo cuesta más arrastrar (resistencia).
      x.value = d < MAXIMO ? d : MAXIMO + (d - MAXIMO) * 0.2;
      if (!pasoUmbral.value && d >= UMBRAL) {
        pasoUmbral.value = true;
        scheduleOnRN(vibrar);
      } else if (pasoUmbral.value && d < UMBRAL) {
        pasoUmbral.value = false;
      }
    },
    onDeactivate: () => {
      'worklet';
      if (pasoUmbral.value) scheduleOnRN(onResponder);
    },
    onFinalize: () => {
      'worklet';
      pasoUmbral.value = false;
      x.value = withSpring(0, { damping: 18, stiffness: 220 });
    },
  });

  const mover = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const flecha = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, [12, UMBRAL], [0, 1], 'clamp'),
    transform: [{ scale: interpolate(x.value, [12, UMBRAL, MAXIMO], [0.5, 1, 1.1], 'clamp') }],
  }));

  return (
    // touchAction: en el navegador del celular el dedo sigue haciendo scroll vertical sobre los mensajes.
    <GestureDetector gesture={gesto} touchAction="pan-y">
      <View>
        <Animated.View pointerEvents="none" style={[styles.flecha, { backgroundColor: t.backgroundElement }, flecha]}>
          <Icono nombre="arrowshape.turn.up.left" tamano={15} color={t.text} />
        </Animated.View>
        <Animated.View style={mover}>{children}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  flecha: {
    position: 'absolute', left: 4, top: '50%', marginTop: -15, width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
  },
});
