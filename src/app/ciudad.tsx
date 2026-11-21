// Selector de ciudad, como un tablero de salidas: cada ciudad con su nombre grande, cuántos eventos
// tiene y una barra que muestra cuánto pasa ahí comparado con la ciudad con más agenda. La elegida
// va llena de açaí. Las que todavía no tienen eventos ("Muy pronto") van juntas en una línea por país.
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { BotonTexto, Icono, Texto } from '@/components/ui';
import { FuenteTitulo, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { cambiarCiudad, CIUDADES, useCiudad, type Ciudad } from '@/lib/ciudades';
import { nombrePais } from '@/lib/paises';

// La barra crece una sola vez al abrir (sin rebote): es lo único que se mueve en la pantalla.
function Barra({ proporcion, color, fondo, orden }: { proporcion: number; color: string; fondo: string; orden: number }) {
  const ancho = useSharedValue(0);
  useEffect(() => {
    ancho.value = withDelay(80 + orden * 60, withTiming(proporcion, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [ancho, proporcion, orden]);
  const estilo = useAnimatedStyle(() => ({ width: `${Math.max(ancho.value, 0.02) * 100}%` }));
  return (
    <View style={[styles.pista, { backgroundColor: fondo }]}>
      <Animated.View style={[styles.relleno, { backgroundColor: color }, estilo]} />
    </View>
  );
}

function FilaCiudad({ c, n, max, elegida, orden, onPress }: { c: Ciudad; n?: number; max: number; elegida: boolean; orden: number; onPress: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const texto = elegida ? t.onAccent : t.text;
  const secundario = elegida ? t.onAccent : t.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: elegida }}
      style={({ pressed }) => [styles.fila, { backgroundColor: elegida ? t.accent : t.card, borderColor: elegida ? t.accent : t.outline }, pressed && { opacity: 0.85 }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Texto style={[styles.nombre, { color: texto }]} numberOfLines={1}>{c.nombre}</Texto>
          {elegida ? <Icono nombre="checkmark" tamano={13} color={t.onAccent} peso="bold" /> : null}
        </View>
        {n !== undefined ? (
          <Barra proporcion={max ? n / max : 0} orden={orden} color={elegida ? t.onAccent : t.accent} fondo={elegida ? 'rgba(255,255,255,0.22)' : t.backgroundElement} />
        ) : null}
      </View>
      {n !== undefined ? (
        <View style={styles.cifra}>
          <Texto style={[styles.numero, { color: texto }]}>{n}</Texto>
          <Texto v="mini" style={{ color: secundario, opacity: elegida ? 0.8 : 1, fontWeight: '600' }}>{tr('ciudad.unidad', { count: n })}</Texto>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function SelectorCiudad() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const actual = useCiudad();
  // null = todavía cargando; si falla, se muestran todas las ciudades sin números.
  const [conteos, setConteos] = useState<Record<string, number> | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    api<{ ciudades: { id: string; eventos: number }[] }>('/events/ciudades')
      .then((r) => setConteos(Object.fromEntries(r.ciudades.map((c) => [c.id, c.eventos]))))
      .catch(() => setFallo(true));
  }, []);

  const elegir = (id: string) => {
    cambiarCiudad(id);
    router.back();
  };

  const max = Math.max(0, ...Object.values(conteos ?? {}));
  const conAgenda = (c: Ciudad) => fallo || (conteos?.[c.id] ?? 0) > 0;
  // Agrupadas por país, en el orden de la lista.
  const paises = [...new Set(CIUDADES.map((c) => c.pais))];
  let orden = 0;

  return (
    <View style={[styles.pantalla, { backgroundColor: t.grouped }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 26 }}>
        <View style={styles.cabecera}>
          <View style={{ flex: 1, gap: 4 }}>
            <Texto v="tituloGrande">{tr('ciudad.titulo')}</Texto>
            <Texto v="detalle" secundario>{tr('ciudad.texto')}</Texto>
          </View>
          <BotonTexto texto={tr('comun.listo')} onPress={() => router.back()} />
        </View>

        {!conteos && !fallo ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : paises.map((pais) => {
          const ciudades = CIUDADES.filter((c) => c.pais === pais);
          const activas = ciudades.filter(conAgenda);
          const pronto = ciudades.filter((c) => !conAgenda(c));
          return (
            <View key={pais} style={{ gap: 8 }}>
              <View style={[styles.pais, { borderBottomColor: t.separator }]}>
                <Bandera codigo={pais} alto={11} />
                <Texto v="grupo" secundario style={{ flex: 1 }}>{nombrePais(pais)}</Texto>
              </View>
              {activas.map((c) => (
                <FilaCiudad key={c.id} c={c} n={fallo ? undefined : conteos?.[c.id]} max={max} elegida={c.id === actual.id} orden={orden++} onPress={() => elegir(c.id)} />
              ))}
              {pronto.length ? (
                <View style={styles.pronto}>
                  <Texto v="mini" secundario style={{ fontWeight: '700', opacity: 0.75 }}>{tr('ciudad.pronto')}</Texto>
                  {pronto.map((c) => {
                    const elegida = c.id === actual.id;
                    return (
                      <Pressable key={c.id} onPress={() => elegir(c.id)} accessibilityRole="radio" accessibilityState={{ checked: elegida }} hitSlop={6}>
                        {({ pressed }) => (
                          <Texto style={[styles.prontoNombre, { color: elegida ? t.accentText : t.textSecondary, opacity: pressed ? 0.5 : elegida ? 1 : 0.7 }]}>{c.nombre}</Texto>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 8 },
  pais: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6, paddingHorizontal: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  nombre: { fontFamily: FuenteTitulo.cursiva, fontSize: 27, lineHeight: 29, paddingRight: 3, flexShrink: 1 },
  pista: { height: 3, borderRadius: 1, overflow: 'hidden' },
  relleno: { height: 3, borderRadius: 1 },
  cifra: { alignItems: 'flex-end', minWidth: 56 },
  numero: { fontFamily: FuenteTitulo.extra, fontSize: 34, lineHeight: 34, fontVariant: ['tabular-nums'] },
  pronto: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14, rowGap: 4, paddingHorizontal: 2, paddingTop: 2 },
  prontoNombre: { fontFamily: FuenteTitulo.negrita, fontSize: 17, lineHeight: 20 },
});
