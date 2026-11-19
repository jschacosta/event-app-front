// "Lo que hay que saber": 3 o 4 datos prácticos del lugar escritos por Bora (a qué hora llegar, cómo
// volver, si hay que llevar efectivo). Es contenido propio, por eso lleva el color de Bora, a diferencia
// de "Reseñas del lugar" (Google), que va en tinta y gris.
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { NotaBora } from '@/lib/api';
import { mesAnioDeClave } from '@/lib/fechas';

export function LoQueHayQueSaber({ nota }: { nota: NotaBora }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const revisada = mesAnioDeClave(nota.revisadaEn);

  return (
    <View style={styles.bloque}>
      <View style={{ gap: 2 }}>
        <Texto v="seccion" style={{ fontSize: 18 }}>{tr('notaBora.titulo')}</Texto>
        <Texto v="pie" secundario>{tr('notaBora.firma', { fecha: revisada })}</Texto>
      </View>
      <View style={{ gap: 10 }}>
        {nota.puntos.map((p) => (
          <View key={p} style={styles.punto}>
            <View style={[styles.marca, { backgroundColor: t.accent }]} />
            <Texto v="detalle" style={styles.texto}>{p}</Texto>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: 12 },
  punto: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  marca: { width: 6, height: 6, marginTop: 7, transform: [{ rotate: '45deg' }] },
  texto: { flex: 1, lineHeight: 20 },
});
