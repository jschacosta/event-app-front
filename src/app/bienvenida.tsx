import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, cancelAnimation, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ESCENAS, FOTOS_INTRO } from '@/components/intro/escenas';
import { fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { cambiarIdioma, IDIOMAS_APP } from '@/lib/i18n';

const DURACION = 5000; // ms por escena
const FONDOS = [FOTOS_INTRO.samba, FOTOS_INTRO.grupo, FOTOS_INTRO.lapa, FOTOS_INTRO.noche, FOTOS_INTRO.techno];

function Progreso({ total, actual, avance }: { total: number; actual: number; avance: ReturnType<typeof useSharedValue<number>> }) {
  const estilo = useAnimatedStyle(() => ({ width: `${avance.value * 100}%` }));
  return (
    <View style={s.progreso}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={s.segmento}>
          {i < actual && <View style={[s.relleno, { width: '100%' }]} />}
          {i === actual && <Animated.View style={[s.relleno, estilo]} />}
        </View>
      ))}
    </View>
  );
}

export default function BienvenidaScreen() {
  const { t, i18n } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { marcarIntroVista } = useSesion();
  const [i, setI] = useState(0);
  const avance = useSharedValue(0);
  const zoom = useSharedValue(1);
  const Escena = ESCENAS[i];

  // Barra de progreso y avance automático
  useEffect(() => {
    avance.value = 0;
    avance.value = withTiming(1, { duration: DURACION, easing: Easing.linear });
    const timer = setTimeout(() => setI((n) => (n + 1) % ESCENAS.length), DURACION);
    return () => {
      clearTimeout(timer);
      cancelAnimation(avance);
    };
  }, [i, avance]);

  // Acercamiento lento de la foto de fondo (efecto "Ken Burns")
  useEffect(() => {
    zoom.value = 1;
    zoom.value = withRepeat(withTiming(1.12, { duration: DURACION + 1000, easing: Easing.out(Easing.quad) }), 1);
  }, [i, zoom]);
  const estiloFondo = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));

  const ir = async (ruta: '/auth' | '/auth/entrar' | '/') => {
    await marcarIntroVista();
    router.replace(ruta);
  };

  return (
    <View style={s.pantalla}>
      <StatusBar style="light" />
      <Animated.View key={`fondo-${i}`} entering={FadeIn.duration(700)} style={[StyleSheet.absoluteFill, estiloFondo]}>
        <Image source={{ uri: FONDOS[i] }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={18} />
      </Animated.View>
      <LinearGradient colors={['rgba(0,0,0,0.55)', 'rgba(0,0,0,0.7)', '#000']} locations={[0, 0.45, 0.8]} style={StyleSheet.absoluteFill} />

      <View style={[s.arriba, { paddingTop: insets.top + 8 }]}>
        <Progreso total={ESCENAS.length} actual={i} avance={avance} />
        <View style={s.barra}>
          <Text style={[s.marca, { fontFamily: fuenteWeb }]}>bora</Text>
          <View style={s.idiomas}>
            {IDIOMAS_APP.map((l) => (
              <Pressable key={l.codigo} onPress={() => cambiarIdioma(l.codigo)} hitSlop={6} accessibilityLabel={l.nombre}>
                <Text style={[s.idioma, { fontFamily: fuenteWeb }, i18n.language === l.codigo && s.idiomaActivo]}>{l.codigo.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Toque a la izquierda: atrás; a la derecha: adelante */}
      <View style={s.escena}>
        <Escena key={`escena-${i}`} />
        <Pressable style={[s.zona, { left: 0 }]} onPress={() => setI((n) => Math.max(0, n - 1))} accessibilityLabel="‹" />
        <Pressable style={[s.zona, { right: 0 }]} onPress={() => setI((n) => (n + 1) % ESCENAS.length)} accessibilityLabel="›" />
      </View>

      <View style={[s.abajo, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View key={`texto-${i}`} entering={FadeInDown.duration(500)} style={{ gap: 8 }}>
          <Text style={[s.titulo, { fontFamily: fuenteWeb }]}>{t(`intro.s${i + 1}.titulo`)}</Text>
          <Text style={[s.texto, { fontFamily: fuenteWeb }]}>{t(`intro.s${i + 1}.texto`)}</Text>
        </Animated.View>
        <View style={{ gap: 12, marginTop: 24 }}>
          <Pressable onPress={() => ir('/auth')} style={({ pressed }) => [s.botonPrincipal, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Text style={[s.textoBotonPrincipal, { fontFamily: fuenteWeb }]}>{t('intro.crearCuenta')}</Text>
          </Pressable>
          <Pressable onPress={() => ir('/auth/entrar')} style={({ pressed }) => [s.botonSecundario, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Text style={[s.textoBotonSecundario, { fontFamily: fuenteWeb }]}>{t('intro.yaTengoCuenta')}</Text>
          </Pressable>
          <Pressable onPress={() => ir('/')} hitSlop={8} accessibilityRole="button">
            <Text style={[s.explorar, { fontFamily: fuenteWeb }]}>{t('intro.explorar')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  arriba: { paddingHorizontal: 16, gap: 14 },
  progreso: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden' },
  relleno: { height: 3, backgroundColor: '#fff' },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marca: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  idiomas: { flexDirection: 'row', gap: 14 },
  idioma: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  idiomaActivo: { color: '#fff' },
  escena: { flex: 1, marginVertical: 12 },
  zona: { position: 'absolute', top: 0, bottom: 0, width: '35%' },
  abajo: { paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  titulo: { color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5 },
  texto: { color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 23 },
  botonPrincipal: { height: 52, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  textoBotonPrincipal: { color: '#000', fontSize: 17, fontWeight: '600' },
  botonSecundario: { height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  textoBotonSecundario: { color: '#fff', fontSize: 17, fontWeight: '600' },
  explorar: { color: 'rgba(255,255,255,0.7)', fontSize: 15, textAlign: 'center', paddingVertical: 4 },
});
