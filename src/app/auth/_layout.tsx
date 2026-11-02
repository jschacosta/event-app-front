import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSesion } from '@/context/sesion';

// Flujo de acceso (siempre oscuro, sin barra: cada pantalla trae su botón para volver).
// Cuando hay sesión, sale solo: al asistente si falta perfil, si no a la agenda.
export default function AuthLayout() {
  const { usuario } = useSesion();

  useEffect(() => {
    if (usuario) router.replace(usuario.perfilCompleto ? '/' : '/onboarding');
  }, [usuario]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' }, animation: 'slide_from_right' }} />;
}
