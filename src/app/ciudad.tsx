// Selector de ciudad: tarjetas con el degradado de cada ciudad y cuántos eventos tiene.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { BotonTexto, Icono, Texto } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { cambiarCiudad, CIUDADES, useCiudad } from '@/lib/ciudades';
import { nombrePais } from '@/lib/paises';

export default function SelectorCiudad() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const actual = useCiudad();
  const [conteos, setConteos] = useState<Record<string, number>>({});

  useEffect(() => {
    api<{ ciudades: { id: string; eventos: number }[] }>('/events/ciudades')
      .then((r) => setConteos(Object.fromEntries(r.ciudades.map((c) => [c.id, c.eventos]))))
      .catch(() => {});
  }, []);

  const elegir = (id: string) => {
    cambiarCiudad(id);
    router.back();
  };

  // Agrupadas por país, en el orden de la lista.
  const paises = [...new Set(CIUDADES.map((c) => c.pais))];

  return (
    <View style={[styles.pantalla, { backgroundColor: t.grouped }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32, gap: 24 }}>
        <View style={styles.cabecera}>
          <View style={{ flex: 1, gap: 4 }}>
            <Texto v="titulo">{tr('ciudad.titulo')}</Texto>
            <Texto v="detalle" secundario>{tr('ciudad.texto')}</Texto>
          </View>
          <BotonTexto texto={tr('comun.listo')} onPress={() => router.back()} />
        </View>

        {paises.map((pais, ip) => (
          <View key={pais} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 }}>
              <Bandera codigo={pais} alto={12} />
              <Texto v="grupo" secundario>{nombrePais(pais)}</Texto>
            </View>
            {CIUDADES.filter((c) => c.pais === pais).map((c, i) => {
              const elegida = c.id === actual.id;
              const n = conteos[c.id];
              return (
                <Animated.View key={c.id} entering={FadeInDown.delay(40 * (ip * 3 + i)).duration(380).springify().damping(20)}>
                  <Pressable
                    onPress={() => elegir(c.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: elegida }}
                    style={({ pressed }) => [styles.tarjeta, pressed && { transform: [{ scale: 0.98 }] }]}>
                    <LinearGradient colors={c.colores} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto v="seccion" style={styles.blanco}>{c.nombre}</Texto>
                      <Texto v="pie" style={[styles.blanco, { opacity: 0.85 }]}>
                        {n === undefined ? ' ' : n === 0 ? tr('ciudad.pronto') : tr('ciudad.eventos', { count: n })}
                      </Texto>
                    </View>
                    {elegida ? (
                      <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.check}>
                        <Icono nombre="checkmark" tamano={13} color="#000000" peso="bold" />
                      </Animated.View>
                    ) : null}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  cabecera: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 8 },
  tarjeta: { height: 84, borderRadius: 18, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  blanco: { color: '#FFFFFF' },
  check: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
