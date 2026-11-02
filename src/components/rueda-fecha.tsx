// Rueda de fecha como la del iPhone: día, mes y año en columnas que giran.
// No deja elegir una fecha posterior a `maximo` (para la edad mínima de 18 años).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate, runOnJS, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { localeIntl } from '@/lib/i18n';

const ALTO = 40;
const VISIBLES = 5;

function Opcion({ texto, indice, y }: { texto: string; indice: number; y: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => {
    const d = Math.abs(y.value / ALTO - indice);
    return {
      opacity: interpolate(d, [0, 1, 2.5], [1, 0.45, 0.15], 'clamp'),
      transform: [
        { perspective: 400 },
        { rotateX: `${interpolate(y.value / ALTO - indice, [-2.5, 0, 2.5], [55, 0, -55], 'clamp')}deg` },
        { scale: interpolate(d, [0, 2], [1, 0.9], 'clamp') },
      ],
    };
  });
  return (
    <Animated.View style={[styles.opcion, estilo]}>
      <Texto style={{ fontSize: 21, fontVariant: ['tabular-nums'] }}>{texto}</Texto>
    </Animated.View>
  );
}

function Columna({ opciones, indice, onCambio, ancho }: { opciones: string[]; indice: number; onCambio: (i: number) => void; ancho: number }) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const y = useSharedValue(indice * ALTO);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moviendo = useRef(false);
  // Valores actuales para el temporizador (evita usar los de un render anterior).
  const ultimo = useRef({ indice, onCambio, total: opciones.length });
  useLayoutEffect(() => {
    ultimo.current = { indice, onCambio, total: opciones.length };
  });
  const mover = (yDestino: number, animado: boolean) =>
    (ref.current as unknown as { scrollTo: (o: object) => void } | null)?.scrollTo({ y: yDestino, animated: animado });

  // Posición inicial.
  useEffect(() => {
    const id = setTimeout(() => mover(indice * ALTO, false), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si el valor cambia desde afuera (por ejemplo, al ajustar a la edad mínima), la rueda se mueve sola.
  useEffect(() => {
    if (moviendo.current) return;
    if (Math.round(y.value / ALTO) !== indice) mover(indice * ALTO, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice]);

  // Cuando la rueda se detiene: se encaja en la opción más cercana y se avisa.
  const detenida = (posicion: number) => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      moviendo.current = false;
      const { indice: actual, onCambio: avisar, total } = ultimo.current;
      const i = Math.max(0, Math.min(total - 1, Math.round(posicion / ALTO)));
      if (Math.abs(posicion - i * ALTO) > 0.5) mover(i * ALTO, true);
      if (i !== actual) avisar(i);
    }, Platform.OS === 'web' ? 140 : 60);
  };
  const marcarMovimiento = () => { moviendo.current = true; };

  const alDesplazar = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.set(e.contentOffset.y);
      runOnJS(marcarMovimiento)();
      runOnJS(detenida)(e.contentOffset.y);
    },
  });

  return (
    <Animated.ScrollView
      ref={ref}
      style={{ width: ancho, height: ALTO * VISIBLES }}
      contentContainerStyle={{ paddingVertical: ALTO * 2 }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ALTO}
      decelerationRate="fast"
      onScroll={alDesplazar}
      scrollEventThrottle={16}
      >
      {opciones.map((o, i) => <Opcion key={`${o}-${i}`} texto={o} indice={i} y={y} />)}
    </Animated.ScrollView>
  );
}

const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
const aIso = (a: number, m: number, d: number) => `${a}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export function RuedaFecha({ valor, onCambio, minimo, maximo }: {
  valor: string; // "1998-04-10"
  onCambio: (iso: string) => void;
  minimo: Date;
  maximo: Date;
}) {
  const t = useTheme();
  const { i18n } = useTranslation();
  const [anio, mes, dia] = valor.split('-').map(Number);

  const meses = useMemo(
    () => Array.from({ length: 12 }, (_, m) => {
      const n = new Intl.DateTimeFormat(localeIntl(), { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2000, m, 1)));
      return n.charAt(0).toUpperCase() + n.slice(1);
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [i18n.language],
  );
  const anios = useMemo(() => {
    const lista: number[] = [];
    for (let a = minimo.getFullYear(); a <= maximo.getFullYear(); a++) lista.push(a);
    return lista;
  }, [minimo, maximo]);
  const dias = Array.from({ length: diasDelMes(anio, mes - 1) }, (_, i) => String(i + 1));

  // Arma la fecha, corrige días que no existen (31 de febrero) y respeta el máximo.
  const fijar = (a: number, m: number, d: number) => {
    const dMax = diasDelMes(a, m);
    let iso = aIso(a, m, Math.min(d, dMax));
    const max = aIso(maximo.getFullYear(), maximo.getMonth(), maximo.getDate());
    if (iso > max) iso = max;
    onCambio(iso);
  };

  return (
    <View style={[styles.caja, { backgroundColor: t.card }]}>
      <View pointerEvents="none" style={[styles.banda, { backgroundColor: t.backgroundElement }]} />
      <View style={styles.columnas}>
        <Columna ancho={56} opciones={dias} indice={dia - 1} onCambio={(i) => fijar(anio, mes - 1, i + 1)} />
        <Columna ancho={150} opciones={meses} indice={mes - 1} onCambio={(i) => fijar(anio, i, dia)} />
        <Columna ancho={76} opciones={anios.map(String)} indice={Math.max(0, anios.indexOf(anio))} onCambio={(i) => fijar(anios[i], mes - 1, dia)} />
      </View>
      {/* Las opciones se desvanecen arriba y abajo */}
      <LinearGradient pointerEvents="none" colors={[t.card, `${t.card}00`]} style={[styles.velo, { top: 0 }]} />
      <LinearGradient pointerEvents="none" colors={[`${t.card}00`, t.card]} style={[styles.velo, { bottom: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  caja: { borderRadius: 16, overflow: 'hidden', height: ALTO * VISIBLES, justifyContent: 'center', alignItems: 'center' },
  banda: { position: 'absolute', left: 10, right: 10, height: ALTO, borderRadius: 10 },
  columnas: { flexDirection: 'row', gap: 6 },
  opcion: { height: ALTO, alignItems: 'center', justifyContent: 'center' },
  velo: { position: 'absolute', left: 0, right: 0, height: ALTO * 1.6 },
});
