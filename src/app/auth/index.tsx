import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonAuth, BotonVolver, Enlace, MensajeError, TextoAuth } from '@/components/formulario';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { esCancelacion } from '@/lib/login';
import { appleDisponible, googleDisponible } from '@/lib/login';

function avisar(texto: string) {
  if (Platform.OS === 'web') globalThis.alert?.(texto);
  else Alert.alert('Bora', texto);
}

// Elegir cómo entrar: Apple, Google o correo.
export default function MetodoScreen() {
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { entrarConApple, entrarConGoogle, entrarDev } = useSesion();
  const [hayApple, setHayApple] = useState(false);
  const [ocupado, setOcupado] = useState<'apple' | 'google' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alias, setAlias] = useState('');
  const zoom = useSharedValue(1);

  useEffect(() => { appleDisponible().then(setHayApple); }, []);
  useEffect(() => {
    zoom.value = withRepeat(withTiming(1.1, { duration: 14000, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [zoom]);
  const estiloFoto = useAnimatedStyle(() => ({ transform: [{ scale: zoom.value }] }));

  const conCarga = (cual: 'apple' | 'google', fn: () => Promise<void>) => async () => {
    setError(null);
    setOcupado(cual);
    try { await fn(); } catch (e) { if (!esCancelacion(e)) setError(e instanceof Error ? e.message : String(e)); } finally { setOcupado(null); }
  };

  const apple = hayApple ? conCarga('apple', entrarConApple) : () => avisar(t('metodo.appleNoDisponible'));
  const google = googleDisponible ? conCarga('google', entrarConGoogle) : () => avisar(t('metodo.googleNoDisponible'));

  return (
    <View style={s.pantalla}>
      <StatusBar style="light" />
      <Animated.View style={[StyleSheet.absoluteFill, estiloFoto]}>
        <Image source={{ uri: FOTOS_INTRO.samba }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      </Animated.View>
      <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.92)', '#000']} locations={[0, 0.35, 0.62, 0.8]} style={StyleSheet.absoluteFill} />

      <View style={[s.contenido, { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View entering={FadeIn.duration(700)} style={{ gap: 6 }}>
          <TextoAuth style={s.logo}>bora</TextoAuth>
          <TextoAuth style={s.lema}>{t('metodo.lema')}</TextoAuth>
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ gap: 12 }}>
          <BotonAuth variante="apple" texto={t('metodo.apple')} onPress={apple} ocupado={ocupado === 'apple'} />
          <BotonAuth variante="google" texto={t('metodo.google')} onPress={google} ocupado={ocupado === 'google'} />
          <BotonAuth variante="correo" texto={t('metodo.email')} onPress={() => router.push('/auth/registro')} />
          <MensajeError texto={error} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(500)} style={{ gap: 14, marginTop: 18 }}>
          <Enlace pregunta={t('registro.yaTienes')} accion={t('registro.entra')} onPress={() => router.push('/auth/entrar')} />
          <TextoAuth style={s.terminos}>{t('metodo.terminos')}</TextoAuth>
          {__DEV__ && (
            <View style={s.dev}>
              <TextInput
                value={alias}
                onChangeText={setAlias}
                placeholder={t('perfil.loginPrueba')}
                placeholderTextColor="rgba(255,255,255,0.35)"
                autoCapitalize="words"
                keyboardAppearance="dark"
                style={[s.inputDev, { fontFamily: fuenteWeb }, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
                onSubmitEditing={() => alias.trim() && entrarDev(alias.trim()).catch((e) => setError(String(e?.message ?? e)))}
              />
              <Pressable onPress={() => alias.trim() && entrarDev(alias.trim()).catch((e) => setError(String(e?.message ?? e)))} hitSlop={8}>
                <TextoAuth style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>DEV</TextoAuth>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </View>
      <BotonVolver />
    </View>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  contenido: { flex: 1, paddingHorizontal: 24, width: '100%', maxWidth: 480, alignSelf: 'center' },
  logo: { fontSize: 64, lineHeight: 68, fontWeight: '800', letterSpacing: -3 },
  lema: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4, color: 'rgba(255,255,255,0.88)', maxWidth: 280 },
  terminos: { fontSize: 12, lineHeight: 16, color: 'rgba(255,255,255,0.45)', textAlign: 'center', paddingHorizontal: 12 },
  dev: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed', paddingHorizontal: 14, height: 40 },
  inputDev: { flex: 1, color: '#fff', fontSize: 14 },
});
