// Compartir un evento: el texto de siempre (título, cuándo y dónde) más un link https a su página
// pública (/e/<id> en el servidor). En WhatsApp se ve como tarjeta con foto, y desde ahí se abre Bora.
// (Cuando haya dominio propio, se cambia aquí y en el servidor.)
import * as Clipboard from 'expo-clipboard';
import { Platform, Share } from 'react-native';

import { API_URL } from '@/config/api';

export const linkEvento = (id: string) => `${API_URL}/e/${id}`;

// Devuelve 'copiado' cuando no hay hoja para compartir (web de escritorio) y el texto quedó en el portapapeles.
export async function compartirEvento(id: string, resumen: string) {
  const link = linkEvento(id);
  const mensaje = `${resumen}\n${link}`;
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      try {
        await nav.share({ text: resumen, url: link });
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
