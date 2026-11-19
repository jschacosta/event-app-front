// Solo en el APK de prueba: si la app falla al abrir, muestra el error en pantalla en vez de
// cerrarse sin decir nada, para poder mandarlo en una captura. Se importa primero en _layout.
import { Alert, Platform } from 'react-native';

type Manejador = (error: unknown, fatal?: boolean) => void;
const utils = (globalThis as { ErrorUtils?: { getGlobalHandler: () => Manejador; setGlobalHandler: (m: Manejador) => void } }).ErrorUtils;

if (Platform.OS !== 'web' && process.env.EXPO_PUBLIC_APK_PRUEBA === '1' && utils) {
  const anterior = utils.getGlobalHandler();
  utils.setGlobalHandler((error, fatal) => {
    if (!fatal) return anterior(error, fatal);
    const e = error instanceof Error ? error : new Error(String(error));
    const pila = (e.stack ?? '').split('\n').slice(0, 8).join('\n');
    Alert.alert('Error al abrir Bora', `${e.message}\n\n${pila}`);
  });
}
