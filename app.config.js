// Configuración de Expo: parte de app.json y agrega las opciones nativas de Android.
// - Siempre: reglas para que, al achicar el código de la APK (R8), no se borren piezas de WorkManager
//   (lo usa expo-background-task para revisar la bandeja de avisos con la app cerrada). Sin esto la app
//   se cae al abrir con "NoSuchMethodException: androidx.work.impl.WorkDatabase_Impl.<init>".
// - Solo en el perfil "preview" de EAS (APK para probar en teléfonos): la app habla con el servidor del
//   Mac por la red local, sin HTTPS, y Android lo bloquea salvo que se permita aquí.
const REGLAS_R8 = [
  '-keep class androidx.work.** { *; }',
  '-keep class * extends androidx.room.RoomDatabase { <init>(); }',
  '-keep class androidx.room.** { *; }',
].join('\n');

module.exports = ({ config }) => {
  const prueba = process.env.EAS_BUILD_PROFILE === 'preview' || process.env.APP_PRUEBA === '1';
  // `expo install` agrega el plugin a app.json sin opciones: aquí se reemplaza por la versión con opciones.
  const plugins = (config.plugins ?? []).filter((p) => (Array.isArray(p) ? p[0] : p) !== 'expo-build-properties');
  plugins.push(['expo-build-properties', {
    android: { extraProguardRules: REGLAS_R8, ...(prueba ? { usesCleartextTraffic: true } : {}) },
  }]);
  return { ...config, plugins };
};
