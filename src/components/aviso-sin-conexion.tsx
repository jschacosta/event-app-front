// Barra discreta "Sin conexión · actualizado a las 14:32": aparece solo mientras no hay señal y se va sola
// cuando vuelve (la pantalla se actualiza por detrás). Nada de botones de "reintentar".
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { IconoBora } from '@/components/iconos-bora';
import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useSinConexion } from '@/lib/conexion';
import { horaDispositivo } from '@/lib/fechas';

export function AvisoSinConexion({ desde, style }: { desde?: number | null; style?: object }) {
  const sinSenal = useSinConexion();
  const t = useTheme();
  const { t: tr } = useTranslation();
  if (!sinSenal) return null;
  const texto = desde ? tr('conexion.aviso', { hora: horaDispositivo(new Date(desde).toISOString()) }) : tr('conexion.avisoSinHora');
  return (
    <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(180)} accessibilityLiveRegion="polite"
      style={[styles.barra, { backgroundColor: t.backgroundElement }, style]}>
      <IconoBora nombre="sinSenal" tamano={15} color={t.textSecondary} />
      <Texto v="pie" secundario style={{ flex: 1, fontWeight: '600' }} numberOfLines={1}>{texto}</Texto>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, height: 32, borderRadius: 6 },
});

// Lista vacía sin señal: no se dice "no hay canales" (no se sabe), sino que aparecerán al volver la señal.
export function VacioSinConexion() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <>
      <View style={[estilosVacio.circulo, { backgroundColor: t.backgroundElement }]}>
        <IconoBora nombre="sinSenal" tamano={28} color={t.textSecondary} />
      </View>
      <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('conexion.sinSenal')}</Texto>
      <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('conexion.vacioAyuda')}</Texto>
    </>
  );
}

const estilosVacio = StyleSheet.create({
  circulo: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
});
