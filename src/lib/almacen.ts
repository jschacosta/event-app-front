import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// En el celular la sesión se guarda cifrada (Keychain / Keystore).
// En la web (solo desarrollo) se usa localStorage.
export const almacen = {
  async leer(clave: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(clave) ?? null;
    return SecureStore.getItemAsync(clave);
  },
  async guardar(clave: string, valor: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.setItem(clave, valor);
    return SecureStore.setItemAsync(clave, valor);
  },
  async borrar(clave: string) {
    if (Platform.OS === 'web') return globalThis.localStorage?.removeItem(clave);
    return SecureStore.deleteItemAsync(clave);
  },
};
