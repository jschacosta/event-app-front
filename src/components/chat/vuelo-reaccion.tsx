// Animación al reaccionar (como en WhatsApp y Telegram): el emoji elegido sale desde donde se tocó,
// crece mientras sube en un arco, baja achicándose hasta la pastilla de reacciones del mensaje y,
// al aterrizar, suelta un destello de puntos. La reacción se aplica justo en el aterrizaje, así la
// pastilla aparece en el mismo instante. Sin rebotes: todo con desaceleración.
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@/hooks/use-theme';

export type Punto = { x: number; y: number };
export type Vuelo = { n: number; emoji: string; desde: Punto; hasta: Punto; alAterrizar: () => void };

const DURACION = 560;
const DESTELLO = 380;
const PUNTOS = 8;
const TAMANO = 30;

function Chispa({ q, i, color }: { q: SharedValue<number>; i: number; color: string }) {
  const angulo = (i / PUNTOS) * Math.PI * 2 + Math.PI / PUNTOS;
  const lejos = i % 2 ? 20 : 26;
  const estilo = useAnimatedStyle(() => {
    const r = interpolate(q.value, [0, 1], [6, lejos]);
    return {
      opacity: interpolate(q.value, [0, 0.15, 1], [0, 1, 0]),
      transform: [{ translateX: Math.cos(angulo) * r }, { translateY: Math.sin(angulo) * r }, { scale: interpolate(q.value, [0, 1], [1, 0.4]) }],
    };
  });
  return <Animated.View style={[styles.chispa, { backgroundColor: color, width: i % 2 ? 4 : 6, height: i % 2 ? 4 : 6 }, estilo]} />;
}

function UnVuelo({ vuelo, origen, onFin }: { vuelo: Vuelo; origen: Punto; onFin: (n: number) => void }) {
  const t = useTheme();
  const p = useSharedValue(0);
  const q = useSharedValue(0);
  const desde = { x: vuelo.desde.x - origen.x, y: vuelo.desde.y - origen.y };
  const hasta = { x: vuelo.hasta.x - origen.x, y: vuelo.hasta.y - origen.y };
  // El arco sube más cuando el viaje es largo (desde la fila de reacciones del menú).
  const alto = Math.min(90, 30 + Math.abs(hasta.y - desde.y) * 0.35);

  useEffect(() => {
    const aterrizar = () => vuelo.alAterrizar();
    const terminar = () => onFin(vuelo.n);
    p.set(withTiming(1, { duration: DURACION, easing: Easing.bezier(0.3, 0.6, 0.25, 1) }, (listo) => {
      if (listo) scheduleOnRN(aterrizar);
    }));
    q.set(withDelay(DURACION - 40, withTiming(1, { duration: DESTELLO, easing: Easing.out(Easing.quad) }, (listo) => {
      if (listo) scheduleOnRN(terminar);
    })));
  }, [p, q, vuelo, onFin]);

  const estiloEmoji = useAnimatedStyle(() => {
    const x = interpolate(p.value, [0, 1], [desde.x, hasta.x]);
    const y = interpolate(p.value, [0, 1], [desde.y, hasta.y]) - Math.sin(Math.PI * p.value) * alto;
    return {
      opacity: interpolate(p.value, [0, 0.06, 0.92, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: x - TAMANO / 2 },
        { translateY: y - TAMANO / 2 },
        { scale: interpolate(p.value, [0, 0.32, 1], [0.9, 1.9, 0.5]) },
        { rotate: `${interpolate(p.value, [0, 0.32, 1], [0, -10, 0])}deg` },
      ],
    };
  });
  const estiloDestello = useAnimatedStyle(() => ({ transform: [{ translateX: hasta.x }, { translateY: hasta.y }] }));
  const anillo = useAnimatedStyle(() => ({
    opacity: interpolate(q.value, [0, 0.2, 1], [0, 0.55, 0]),
    transform: [{ scale: interpolate(q.value, [0, 1], [0.3, 1.4]) }],
  }));

  return (
    <>
      <Animated.View style={[styles.destello, estiloDestello]}>
        <Animated.View style={[styles.anillo, { borderColor: t.accent }, anillo]} />
        {Array.from({ length: PUNTOS }, (_, i) => <Chispa key={i} q={q} i={i} color={i % 2 ? t.accentSoftText : t.accent} />)}
      </Animated.View>
      <Animated.View style={[styles.emoji, estiloEmoji]}>
        <Text style={styles.emojiTexto} allowFontScaling={false}>{vuelo.emoji}</Text>
      </Animated.View>
    </>
  );
}

// Capa a pantalla completa (no recibe toques). onFin debe ser estable (useCallback): si cambia, el vuelo se reinicia.
// Las coordenadas llegan en la ventana; la capa mide
// dónde está ella misma para restarlo.
export function CapaVuelos({ vuelos, onFin }: { vuelos: Vuelo[]; onFin: (n: number) => void }) {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [origen, setOrigen] = useState<Punto>({ x: 0, y: 0 });
  return (
    <View
      ref={ref}
      pointerEvents="none"
      // En Android lo que tiene sombra (elevation) se dibuja encima aunque vaya antes: la capa va al frente.
      style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 1000 }]}
      onLayout={() => ref.current?.measureInWindow((x, y) => setOrigen({ x, y }))}>
      {vuelos.map((v) => <UnVuelo key={v.n} vuelo={v} origen={origen} onFin={onFin} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: { position: 'absolute', left: 0, top: 0, width: TAMANO, height: TAMANO, alignItems: 'center', justifyContent: 'center' },
  emojiTexto: { fontSize: 24, lineHeight: 30, textAlign: 'center' },
  destello: { position: 'absolute', left: 0, top: 0, width: 0, height: 0, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  chispa: { position: 'absolute', borderRadius: 3 },
  anillo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 2 },
});
