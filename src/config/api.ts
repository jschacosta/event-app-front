import Constants from 'expo-constants';

// Servidor de producción. Es el valor por defecto en las versiones instaladas (APK, Play):
// las actualizaciones OTA se arman en el Mac con el .env local, que no trae EXPO_PUBLIC_API_URL,
// y sin este valor la app quedaría apuntando a localhost.
const PRODUCCION = 'https://bora-app.up.railway.app';

// En desarrollo, el celular no entiende "localhost": se usa la IP del Mac
// que Expo ya conoce (la misma desde donde se descarga la app).
function urlDesarrollo() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4100`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || (__DEV__ ? urlDesarrollo() : PRODUCCION);
