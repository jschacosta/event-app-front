import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components/ui';
import { BottomTabInset, FuenteTitulo } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CHAT_ACTIVO } from '@/lib/funciones';
import { textoCuenta, useSincronizarNoLeidos } from '@/lib/no-leidos';

// Barra de Bora: solo palabras, en la misma letra condensada del line-up de la agenda.
// La pestaña activa va en tinta con una barra morada arriba que crece al elegirla;
// los no leídos van como un número chico pegado a la palabra.
// Con chat (la app): Canales. Sin chat (la web): Hilos, las guías de la ciudad.
const PESTANAS = ([
  { name: 'index', href: '/', clave: 'tabs.agenda' },
  { name: 'chats', href: '/chats', clave: 'tabs.chats' },
  { name: 'hilos', href: '/hilos', clave: 'tabs.hilos' },
  { name: 'experiencias', href: '/experiencias', clave: 'tabs.experiencias' },
  { name: 'perfil', href: '/perfil', clave: 'tabs.perfil' },
] as const).filter((p) => (CHAT_ACTIVO ? p.name !== 'hilos' : p.name !== 'chats'));

// En React 19 la ref llega como prop normal, así que no hace falta forwardRef.
function Boton({ isFocused, texto, cuenta, onPress, ...props }: TabTriggerSlotProps & { texto: string; cuenta?: number }) {
  const t = useTheme();
  const p = useSharedValue(isFocused ? 1 : 0);
  useEffect(() => {
    p.set(withTiming(isFocused ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [isFocused, p]);
  const barra = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scaleX: 0.2 + p.value * 0.8 }] }));
  return (
    <Pressable
      {...(props as object)}
      onPress={(e) => {
        if (!isFocused && Platform.OS !== 'web') Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={styles.boton}>
      <View style={styles.palabra}>
        <Animated.View style={[styles.marca, { backgroundColor: t.accent }, barra]} />
        <Texto style={[styles.texto, { color: isFocused ? t.text : t.textSecondary }]}>{texto}</Texto>
        {cuenta ? <Texto style={[styles.cuenta, { color: t.accentText }]}>{textoCuenta(cuenta)}</Texto> : null}
      </View>
    </Pressable>
  );
}

export default function AppTabs() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const noLeidos = useSincronizarNoLeidos();
  const oscuro = t.background !== '#FFFFFF';
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList style={[styles.barra, { height: BottomTabInset + insets.bottom, paddingBottom: insets.bottom, borderTopColor: t.separator }]}>
        {Platform.OS === 'web' ? (
          // El vidrio se sale por los lados: Chrome dibuja mal los bordes del desenfoque.
          <View pointerEvents="none" style={[styles.vidrioWeb, { backgroundColor: t.bar }]} />
        ) : (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <BlurView intensity={50} tint={oscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bar }]} />
          </View>
        )}
        {PESTANAS.map((p) => (
          <TabTrigger key={p.name} name={p.name} href={p.href} asChild>
            <Boton texto={tr(p.clave)} cuenta={p.name === 'chats' ? noLeidos : undefined} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8,
  },
  vidrioWeb: {
    position: 'absolute', top: 0, left: -48, right: -48, bottom: -48,
    backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  } as object,
  boton: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  palabra: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 13 },
  marca: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  texto: { fontFamily: FuenteTitulo.negrita, fontSize: 19, lineHeight: 24, letterSpacing: 0.1 },
  cuenta: { fontFamily: FuenteTitulo.extra, fontSize: 12, lineHeight: 14, marginLeft: 2 },
});
