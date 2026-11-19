import '@/lib/error-arranque';
import '@/lib/i18n';
import { DarkTheme, DefaultTheme, router, Stack, ThemeProvider, useSegments } from 'expo-router';
import { BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold, BarlowCondensed_900Black_Italic, useFonts } from '@expo-google-fonts/barlow-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SesionProvider, useSesion } from '@/context/sesion';
import { useNotificaciones } from '@/lib/notificaciones';

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

// Registra el teléfono para las notificaciones y abre lo que corresponde al tocar una.
function Notificaciones() {
  const { token } = useSesion();
  useNotificaciones(token);
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
  // La letra de los títulos viene con la app; se espera a que cargue (la pantalla de inicio sigue visible).
  const [fuentesListas, errorFuentes] = useFonts({ BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold, BarlowCondensed_900Black_Italic });
  if (!fuentesListas && !errorFuentes) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* El chat mueve la barra de escribir junto con el teclado, cuadro a cuadro (como Telegram). */}
      <KeyboardProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <SesionProvider>
          <TemaNavegador oscuro={colorScheme === 'dark'} />
          <AnimatedSplashOverlay />
          <Guardia />
          <Notificaciones />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="bienvenida" options={{ animation: 'fade' }} />
            <Stack.Screen name="auth" />
            <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
            <Stack.Screen name="evento/[id]/index" />
            {/* En Android, el chat entra deslizándose desde la derecha (como en iPhone y en Telegram). */}
            <Stack.Screen name="evento/[id]/chat" options={{ animation: Platform.OS === 'android' ? 'slide_from_right' : 'default' }} />
            <Stack.Screen name="evento/[id]/nuevo-canal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="canal/[codigo]" options={{ animation: 'fade' }} />
            <Stack.Screen name="dia/[clave]" />
            <Stack.Screen name="verificacion" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/editar" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/bloqueados" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/eliminar" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/notificaciones" options={{ presentation: 'modal' }} />
            <Stack.Screen name="perfil/correo" />
            <Stack.Screen name="ciudad" options={{ presentation: 'modal' }} />
          </Stack>
        </SesionProvider>
      </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
