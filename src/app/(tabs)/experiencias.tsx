import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Texto } from '@/components/ui';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// El sitio de Rio Diferente tiene versión por idioma.
const sitio = (idioma: string) => `https://www.riodiferente.com/${idioma === 'en' || idioma === 'pt' ? idioma : 'es'}`;
const FOTOS = 'https://sosappfiles.s3.us-east-1.amazonaws.com/services/';

// Servicios de Rio Diferente ofrecidos dentro de la app (textos en comun.json → experiencias.*).
const EXPERIENCIAS = [
  { clave: 'traslado', foto: `${FOTOS}6ac4187898f6058c2014dd80/photos/qd3q9jHERzM2.webp` },
  { clave: 'tours', foto: `${FOTOS}69b612bb5a17bf65f51b886d/photos/cKl9HFxsZHCW.webp` },
  { clave: 'barco', foto: `${FOTOS}69b612bb5a17bf65f51b88cc/photos/-vatLYziiJIu.webp` },
] as const;

export default function ExperienciasScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr, i18n } = useTranslation();
  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + BottomTabInset + 24, paddingHorizontal: 20, gap: 16 }}>
        <View>
          <Texto v="tituloGrande">{tr('experiencias.titulo')}</Texto>
          <Texto v="detalle" secundario style={{ marginTop: 4 }}>{tr('experiencias.subtitulo')}</Texto>
        </View>
        {EXPERIENCIAS.map((e) => (
          <Pressable key={e.clave} onPress={() => WebBrowser.openBrowserAsync(sitio(i18n.language))} style={({ pressed }) => [styles.tarjeta, pressed && { opacity: 0.9 }]}>
            <Image source={{ uri: e.foto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']} style={styles.velo} />
            <View style={styles.texto}>
              <Texto v="seccion" style={{ color: '#fff' }}>{tr(`experiencias.${e.clave}.titulo`)}</Texto>
              <Texto v="detalle" style={{ color: '#fff', opacity: 0.9 }}>{tr(`experiencias.${e.clave}.detalle`)}</Texto>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  tarjeta: { height: 220, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end' },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  texto: { padding: 20, gap: 2 },
});
