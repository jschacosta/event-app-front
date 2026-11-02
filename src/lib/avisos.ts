import { Alert, Platform } from 'react-native';

import i18n from '@/lib/i18n';
import { esCancelacion } from '@/lib/login';

export function mostrarError(err: unknown) {
  if (esCancelacion(err)) return;
  const mensaje = err instanceof Error && err.message ? err.message : i18n.t('comun.intentaDeNuevo');
  if (Platform.OS === 'web') globalThis.alert?.(mensaje);
  else Alert.alert(i18n.t('comun.noSePudo'), mensaje);
}

// Pregunta antes de una acción destructiva (borrar, reportar).
export function confirmar(titulo: string, boton: string, accion: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(titulo)) accion();
    return;
  }
  Alert.alert(titulo, undefined, [
    { text: i18n.t('comun.cancelar'), style: 'cancel' },
    { text: boton, style: 'destructive', onPress: accion },
  ]);
}
