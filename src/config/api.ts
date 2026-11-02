import Constants from 'expo-constants';

// En desarrollo, el celular no entiende "localhost": se usa la IP del Mac
// que Expo ya conoce (la misma desde donde se descarga la app).
function urlDesarrollo() {
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:4100`;
}

export const API_URL = process.env.EXPO_PUBLIC_API_URL || urlDesarrollo();
