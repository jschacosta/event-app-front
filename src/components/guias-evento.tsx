// "Guías para esta noche": en la página de una fiesta, 2 o 3 guías de Bora que tienen que ver con ella
// (su barrio, su música o, si no hay, seguridad y transporte). Une la fiesta con los hilos globales,
// igual que la guía muestra sus fiestas. Va en el color de Bora porque es contenido propio.
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { GuiaDeEvento } from '@/lib/api';

export function GuiasDeEvento({ guias, ciudad }: { guias: GuiaDeEvento[]; ciudad: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={{ gap: 4 }}>
      <Texto v="seccion" style={{ fontSize: 18 }}>{tr('hilos.paraEstaNoche')}</Texto>
      <View style={[styles.lista, { borderTopColor: t.separator }]}>
        {guias.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => router.push({ pathname: '/[ciudad]/hilos/[slug]', params: { ciudad, slug: g.slug } })}
            accessibilityRole="link"
            style={({ pressed }) => [styles.fila, { borderBottomColor: t.separator }, pressed && { opacity: 0.6 }]}>
            <View style={[styles.marca, { backgroundColor: t.accent }]} />
            <View style={{ flex: 1, gap: 2 }}>
              <Texto v="mini" style={{ color: t.accentText, fontWeight: '800' }}>{tr(`hilos.temas.${g.tema}`)}</Texto>
              <Texto v="cuerpoFuerte" numberOfLines={2} style={{ lineHeight: 20 }}>{g.titulo}</Texto>
            </View>
            <Icono nombre="chevron.right" tamano={12} color={t.textSecondary} peso="bold" />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  marca: { width: 3, alignSelf: 'stretch', borderRadius: 1 },
});
