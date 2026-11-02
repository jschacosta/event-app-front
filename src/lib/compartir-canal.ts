// Link para compartir un canal propio. En la app instalada abre bora://canal/<código>;
// en web, la misma ruta del sitio. (Cuando haya dominio propio, se puede pasar a https.)
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import i18n from '@/lib/i18n';
import type { CanalPropio } from '@/lib/api';

export const linkCanal = (codigo: string) => Linking.createURL(`/canal/${codigo}`);

// Devuelve 'copiado' cuando no hay hoja para compartir (web de escritorio) y el link quedó en el portapapeles.
export async function compartirCanal(canal: Pick<CanalPropio, 'nombre' | 'codigo' | 'privado'>, clave?: string) {
  const link = linkCanal(canal.codigo);
  const mensaje = [
    i18n.t('canales.compartirTexto', { nombre: canal.nombre, link }),
    canal.privado && clave ? i18n.t('canales.compartirClave', { clave }) : null,
  ].filter(Boolean).join('\n');

  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      try {
        await nav.share({ text: mensaje });
        return 'compartido';
      } catch {
        // cancelado: se copia igual
      }
    }
    await Clipboard.setStringAsync(mensaje);
    return 'copiado';
  }
  await Share.share({ message: mensaje });
  return 'compartido';
}
