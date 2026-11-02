import '@/lib/i18n';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SesionProvider, useSesion } from '@/context/sesion';

SplashScreen.preventAutoHideAsync();

// La primera vez que se abre la app (sin sesión) se muestra la intro animada.
function Guardia() {
  const { cargando, usuario, introVista } = useSesion();
  const segmentos = useSegments();
  useEffect(() => {
    if (cargando || introVista === null) return;
    if (!introVista && !usuario && segmentos[0] !== 'bienvenida') router.replace('/bienvenida');
  }, [cargando, introVista, usuario, segmentos]);
  return null;
}

// En el navegador: la barra de scroll y los controles nativos siguen el tema de la app
// (sin esto, Chrome de escritorio dibuja una barra blanca en modo oscuro).
function TemaNavegador({ oscuro }: { oscuro: boolean }) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const raiz = document.documentElement;
    raiz.style.colorScheme = oscuro ? 'dark' : 'light';
    // scrollbar-width no se hereda: se aplica a todos los elementos (las listas de la app son divs con scroll).
    let estilo = document.getElementById('barras-scroll');
    if (!estilo) {
      estilo = document.createElement('style');
      estilo.id = 'barras-scroll';
      document.head.appendChild(estilo);
    }
    estilo.textContent = `html, body { overflow-x: hidden; } * { scrollbar-width: thin; scrollbar-color: ${oscuro ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)'} transparent; }`;
  }, [oscuro]);
  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SesionProvider>
          <TemaNavegador oscuro={colorScheme === 'dark'} />
          <AnimatedSplashOverlay />
          <Guardia />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="bienvenida" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="evento/[id]/index" />
            <Stack.Screen name="evento/[id]/chat" />
            <Stack.Screen name="evento/[id]/nuevo-canal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="canal/[codigo]" options={{ animation: 'fade' }} />
            <Stack.Screen name="dia/[clave]" />
            <Stack.Screen name="verificacion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/editar" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/bloqueados" options={{ presentation: 'modal' }} />
            <Stack.Screen name="ciudad" options={{ presentation: 'modal' }} />
          </Stack>
        </SesionProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
