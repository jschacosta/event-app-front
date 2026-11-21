// Emojis del chat: la fila de reacciones rápidas (como WhatsApp) y un panel para elegir más.
// El panel sirve sobre todo en la web y para reaccionar con cualquier emoji; en el celular
// el teclado también trae los suyos.
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';

import { Icono } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

export const REACCIONES_RAPIDAS = ['❤️', '😂', '🔥', '👍', '😮', '🙏'];

export const GRUPOS: { icono: string; emojis: string[] }[] = [
  { icono: '😀', emojis: ['😀', '😂', '🤣', '😊', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😜', '🤪', '😏', '😅', '😇', '🙃', '😉', '🤔', '🤗', '🫶', '😴', '🥹', '😭', '😱', '😮', '😳', '🙄', '😬', '🤯', '🥵', '🤤', '😈'] },
  { icono: '👍', emojis: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👋', '✌️', '🤙', '🤘', '👌', '💪', '🫡', '👀', '💃', '🕺', '🙋', '🤷', '🤦', '👯'] },
  { icono: '🎉', emojis: ['🎉', '🥂', '🍻', '🍺', '🍹', '🍸', '🍷', '🥃', '🍾', '🎶', '🎵', '🎧', '🎤', '🥁', '🎸', '🪩', '🔥', '✨', '⚡', '💥'] },
  { icono: '🏖️', emojis: ['🏖️', '🌴', '☀️', '🌊', '🏄', '⛰️', '🌅', '🌃', '🗺️', '✈️', '🚕', '🚌', '🚇', '🛵', '📍', '🏨', '🍕', '🌮', '🍔', '🥟', '🍦', '☕'] },
  { icono: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💯', '✅', '❌', '⭐', '🌈', '🏳️‍🌈', '🇧🇷', '🇨🇱', '🇦🇷', '🇨🇴', '🇺🇸', '🇪🇸', '🇩🇪', '🇫🇷', '🇬🇧'] },
];

// "Pop" al aparecer: crece desde cero, se pasa un poco y vuelve (como los emojis de Telegram).
// Con valores animados propios para que funcione igual en el celular y en la web.
export function Pop({ retraso = 0, children }: { retraso?: number; children: ReactNode }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.set(withDelay(retraso, withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) })));
  }, [p, retraso]);
  const estilo = useAnimatedStyle(() => ({ opacity: Math.min(1, p.value * 2), transform: [{ scale: 0.5 + p.value * 0.5 }] }));
  return <Animated.View style={estilo}>{children}</Animated.View>;
}

// Salto corto cuando cambia un número o se vuelve a tocar (por ejemplo, la cuenta de una reacción).
export function useSalto(clave: unknown) {
  const s = useSharedValue(1);
  useEffect(() => {
    s.set(withSequence(withTiming(1.22, { duration: 110, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })));
  }, [clave, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
}

// Fila de reacciones rápidas + "+" para abrir el panel completo.
type Desde = { x: number; y: number };
// La posición del toque (en la ventana) es desde donde sale el vuelo de la reacción.
const desdeToque = (ev: GestureResponderEvent): Desde => ({ x: ev.nativeEvent.pageX, y: ev.nativeEvent.pageY });

export function FilaReacciones({ elegida, onElegir, onMas }: { elegida?: string; onElegir: (e: string, desde?: Desde) => void; onMas: () => void }) {
  const t = useTheme();
  return (
    <View style={[styles.fila, { backgroundColor: t.card }]}>
      {REACCIONES_RAPIDAS.map((e, i) => (
        <Pop key={e} retraso={60 + 35 * i}>
          <Pressable
            onPress={(ev) => onElegir(e, desdeToque(ev))}
            accessibilityRole="button"
            accessibilityLabel={e}
            style={({ pressed }) => [styles.rapida, elegida === e && { backgroundColor: t.backgroundSelected }, pressed && { transform: [{ scale: 1.25 }] }]}>
            <Text style={styles.emojiGrande}>{e}</Text>
          </Pressable>
        </Pop>
      ))}
      <Pop retraso={60 + 35 * REACCIONES_RAPIDAS.length}>
        <Pressable onPress={onMas} accessibilityRole="button" style={({ pressed }) => [styles.rapida, styles.mas, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
          <Icono nombre="plus" tamano={18} color={t.text} peso="semibold" />
        </Pressable>
      </Pop>
    </View>
  );
}

// Panel de emojis por grupos.
export function PanelEmojis({ onElegir, alto = 260 }: { onElegir: (e: string, desde?: Desde) => void; alto?: number }) {
  const t = useTheme();
  const [grupo, setGrupo] = useState(0);
  return (
    <Animated.View entering={FadeIn.duration(160)} style={[styles.panel, { height: alto, backgroundColor: t.card }]}>
      <View style={[styles.pestanas, { borderBottomColor: t.separator }]}>
        {GRUPOS.map((g, i) => (
          <Pressable
            key={g.icono}
            onPress={() => setGrupo(i)}
            accessibilityRole="tab"
            accessibilityState={{ selected: grupo === i }}
            style={[styles.pestana, grupo === i && { backgroundColor: t.backgroundSelected }]}>
            <Text style={styles.emojiPestana}>{g.icono}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.grilla} keyboardShouldPersistTaps="always">
        {GRUPOS[grupo].emojis.map((e) => (
          <Pressable key={e} onPress={(ev) => onElegir(e, desdeToque(ev))} style={({ pressed }) => [styles.celda, pressed && { backgroundColor: t.backgroundSelected }]}>
            <Text style={styles.emoji}>{e}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 30,
    paddingHorizontal: 8, paddingVertical: 6, alignSelf: 'center',
  },
  rapida: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  mas: { width: 36, height: 36, borderRadius: 18, marginLeft: 4 },
  emojiGrande: { fontSize: 28 },
  panel: { borderRadius: 16, overflow: 'hidden' },
  pestanas: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  pestana: { width: 40, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emojiPestana: { fontSize: 20 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', padding: 6 },
  celda: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  emoji: { fontSize: 26 },
});
