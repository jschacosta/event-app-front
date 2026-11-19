import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSesion } from '@/context/sesion';
import { tomarVolverTrasEntrar } from '@/lib/pedir-sesion';

// Flujo de acceso (siempre oscuro, sin barra: cada pantalla trae su botón para volver).
// Cuando hay sesión, sale solo: al asistente si falta perfil; si no, a la pantalla desde donde se pidió
// entrar (p. ej. el evento donde ibas a responder) o a la agenda.
export default function AuthLayout() {
  const { usuario } = useSesion();

  useEffect(() => {
    if (!usuario) return;
    const volver = tomarVolverTrasEntrar();
    if (!usuario.perfilCompleto) router.replace('/onboarding');
    else if (volver) router.dismissTo(volver);
    else router.replace('/');
  }, [usuario]);

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#000' }, animation: 'slide_from_right' }} />;
}
