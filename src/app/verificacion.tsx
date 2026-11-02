// Verificar la edad con documento + selfie (Didit). Se pide para crear canales y para entrar
// a canales privados (previas, grupos cerrados). Esta pantalla también es la dirección de
// vuelta: Didit redirige aquí con ?verificationSessionId=… y se comprueba el resultado.
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonTexto, Icono, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, type Usuario } from '@/lib/api';

type Estado = 'inicio' | 'abriendo' | 'comprobando' | 'aprobada' | 'en_revision' | 'pendiente' | 'rechazada';
type Respuesta = { estado: Exclude<Estado, 'inicio' | 'abriendo' | 'comprobando'> | 'sin_terminar' | 'sin_iniciar'; user: Usuario };

function Paso({ numero, texto }: { numero: number; texto: string }) {
  const t = useTheme();
  return (
    <View style={styles.paso}>
      <View style={[styles.numero, { backgroundColor: t.text }]}>
        <Texto v="pie" style={{ color: t.background, fontWeight: '700' }}>{numero}</Texto>
      </View>
      <Texto style={{ flex: 1 }}>{texto}</Texto>
    </View>
  );
}

export default function VerificacionScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  const { token, usuario, fijarUsuario } = useSesion();
  const params = useLocalSearchParams<{ verificationSessionId?: string }>();
  const [estado, setEstado] = useState<Estado>(usuario?.edadVerificada ? 'aprobada' : 'inicio');
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const comprobar = useCallback(async () => {
    setEstado('comprobando');
    setError(null);
    try {
      const r = await api<Respuesta>('/me/verificacion/comprobar', { metodo: 'POST', token });
      fijarUsuario(r.user);
      setEstado(r.estado === 'sin_terminar' || r.estado === 'sin_iniciar' ? 'inicio' : r.estado);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setEstado('inicio');
    }
  }, [token, fijarUsuario]);

  // Al volver desde Didit (o en la web, al recargar esta página con el id de la sesión).
  const yaComprobado = useRef(false);
  useEffect(() => {
    if (token && params.verificationSessionId && !yaComprobado.current) {
      yaComprobado.current = true;
      comprobar();
    }
  }, [token, params.verificationSessionId, comprobar]);

  const empezar = async () => {
    setEstado('abriendo');
    setError(null);
    const vuelta = Platform.OS === 'web' ? `${window.location.origin}/verificacion` : Linking.createURL('/verificacion');
    try {
      const r = await api<{ url: string | null; simulada?: boolean; estado?: string; user?: Usuario }>('/me/verificacion', {
        metodo: 'POST', token, body: { vuelta },
      });
      if (r.estado === 'aprobada' && r.user) {
        fijarUsuario(r.user);
        return setEstado('aprobada');
      }
      if (!r.url) return comprobar();
      if (Platform.OS === 'web') {
        // En la web se va en la misma pestaña; Didit vuelve a /verificacion y se comprueba solo.
        window.location.assign(r.url);
        return;
      }
      await WebBrowser.openAuthSessionAsync(r.url, vuelta);
      await comprobar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      setEstado('inicio');
    }
  };

  if (!usuario) {
    return (
      <View style={[styles.pantalla, styles.centro, { backgroundColor: t.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const ocupado = estado === 'abriendo' || estado === 'comprobando';
  const resultado = estado === 'aprobada' || estado === 'en_revision' || estado === 'pendiente' || estado === 'rechazada';

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <View style={[styles.barra, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8 }]}>
        <View />
        <BotonTexto texto={estado === 'aprobada' ? tr('comun.listo') : tr('comun.cancelar')} onPress={cerrar} />
      </View>
      <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]}>
        {resultado ? (
          <Animated.View entering={FadeIn.duration(250)} style={styles.centro}>
            <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.icono, { backgroundColor: estado === 'rechazada' ? t.backgroundElement : t.text }]}>
              <Icono
                nombre={estado === 'aprobada' ? 'checkmark.seal.fill' : estado === 'rechazada' ? 'exclamationmark.triangle' : 'hourglass'}
                tamano={34}
                color={estado === 'rechazada' ? t.text : t.background}
              />
            </Animated.View>
            <Texto v="titulo" style={{ textAlign: 'center' }}>{tr(`verificacion.${estado}.titulo`)}</Texto>
            <Texto secundario style={{ textAlign: 'center' }}>
              {tr(`verificacion.${estado}.texto`, { edad: usuario.edad ?? '' })}
            </Texto>
            <View style={{ alignSelf: 'stretch', marginTop: 12, gap: 10 }}>
              {estado === 'aprobada' ? (
                <BotonPrincipal texto={tr('verificacion.continuar')} onPress={cerrar} />
              ) : estado === 'rechazada' ? (
                <BotonPrincipal texto={tr('verificacion.intentarDeNuevo')} onPress={empezar} />
              ) : (
                <BotonPrincipal texto={tr('verificacion.comprobarDeNuevo')} onPress={comprobar} secundario />
              )}
            </View>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(350)} style={[styles.icono, { backgroundColor: t.text, alignSelf: 'center' }]}>
              <Icono nombre="checkmark.seal.fill" tamano={34} color={t.background} />
            </Animated.View>
            <View style={{ gap: 8 }}>
              <Texto v="titulo" style={{ textAlign: 'center' }}>{tr('verificacion.titulo')}</Texto>
              <Texto secundario style={{ textAlign: 'center' }}>{tr('verificacion.porQue')}</Texto>
            </View>
            <View style={[styles.tarjeta, { backgroundColor: t.card }]}>
              <Paso numero={1} texto={tr('verificacion.paso1')} />
              <Paso numero={2} texto={tr('verificacion.paso2')} />
              <Paso numero={3} texto={tr('verificacion.paso3')} />
            </View>
            <View style={styles.privacidad}>
              <Icono nombre="lock.fill" tamano={14} color={t.textSecondary} />
              <Texto v="pie" secundario style={{ flex: 1 }}>{tr('verificacion.privacidad')}</Texto>
            </View>
            {error ? <Texto v="detalle" style={{ color: t.danger, textAlign: 'center' }}>{error}</Texto> : null}
            <BotonPrincipal texto={tr('verificacion.empezar')} onPress={empezar} ocupado={ocupado} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 8 },
  contenido: { paddingHorizontal: 24, paddingTop: 12, gap: 20, width: '100%', maxWidth: 520, alignSelf: 'center' },
  centro: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 40 },
  icono: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 16, padding: 16, gap: 14 },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  numero: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  privacidad: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
});
