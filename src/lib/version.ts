// Mantener a todos en la última versión (igual que Kolke):
//  - OTA: al abrir (y al volver después de un rato) se baja la última y se aplica de inmediato, sin tener
//    que cerrar y abrir la app dos veces.
//  - Tienda: el servidor dice la versión mínima y la última (GET /api/app/version, variables en Railway).
//    Bajo la mínima, la app se bloquea hasta actualizar desde la tienda; bajo la última, se avisa una vez.
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { Linking, Platform } from 'react-native';

import { API_URL } from '@/config/api';
import { guardarEnTelefono, leerDelTelefono } from '@/lib/disco';

export type VersionTienda = { minima: string; ultima: string; tienda: string };

const activo = () => !__DEV__ && Platform.OS !== 'web';
const conTiempo = <T,>(p: Promise<T>, ms: number) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('tiempo')), ms))]);

// Versión instalada desde la tienda (la de la compilación, no la de la OTA).
export const versionApp = () => Updates.runtimeVersion || Constants.expoConfig?.version || '0.0.0';

/** La OTA con que corre la app: fecha de publicación (ISO) y código corto. null si corre la versión de la tienda. */
export function otaActual(): { fecha: string; id: string } | null {
  if (Platform.OS === 'web' || !Updates.isEnabled || Updates.isEmbeddedLaunch || !Updates.createdAt) return null;
  return { fecha: new Date(Updates.createdAt).toISOString(), id: String(Updates.updateId ?? '').slice(0, 8) };
}

// true si la versión a es anterior a b ("1.1.0" < "1.2.0"). Una versión vacía no cuenta.
export function anterior(a?: string, b?: string) {
  if (!a || !b) return false;
  const x = a.split('.').map((n) => parseInt(n, 10) || 0);
  const y = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  return false;
}

// ---------- OTA ----------

// Si la app se abrió tocando una notificación, no se reinicia por una OTA: se perdería la pantalla
// que abrió el aviso (por ejemplo el chat). La OTA se baja igual y queda para la próxima vez.
let sinReiniciar = false;
export const noReiniciarPorOta = () => { sinReiniciar = true; };

// Si hay una OTA nueva, avisa con onBajando(true), la baja y reinicia la app con ella.
export async function aplicarUltimaOta(onBajando: (b: boolean) => void) {
  if (!activo() || !Updates.isEnabled) return false;
  let r: Updates.UpdateCheckResult;
  try { r = await conTiempo(Updates.checkForUpdateAsync(), 8000); } catch { return false; }
  if (!r.isAvailable) return false;
  if (sinReiniciar) {
    Updates.fetchUpdateAsync().catch(() => {});
    return false;
  }
  onBajando(true);
  try {
    await conTiempo(Updates.fetchUpdateAsync(), 45_000);
    if (sinReiniciar) { onBajando(false); return false; }
    await Updates.reloadAsync();
    return true;
  } catch {
    onBajando(false); // sin señal o falló la descarga: se sigue con la versión actual
    return false;
  }
}

// ---------- tienda ----------

const ARCHIVO = 'version-tienda';
type Guardado = { v: VersionTienda | null; avisada: string | null };

// Lo que dice el servidor para esta plataforma. Sin señal, la última respuesta guardada.
export async function versionesTienda(): Promise<{ v: VersionTienda | null; avisada: string | null }> {
  if (!activo()) return { v: null, avisada: null };
  const guardado = (await leerDelTelefono<Guardado>(ARCHIVO)) ?? { v: null, avisada: null };
  try {
    const res = await conTiempo(fetch(`${API_URL}/api/app/version`), 6000);
    if (res.ok) {
      const v = ((await res.json()) as Record<string, VersionTienda>)[Platform.OS] ?? null;
      guardarEnTelefono(ARCHIVO, () => ({ ...guardado, v }));
      return { v, avisada: guardado.avisada };
    }
  } catch {
    // sin señal
  }
  return guardado;
}

export function estadoVersion(v: VersionTienda | null, avisada: string | null): 'obligatoria' | 'nueva' | null {
  if (!v) return null;
  const mia = versionApp();
  if (anterior(mia, v.minima)) return 'obligatoria';
  if (anterior(mia, v.ultima) && avisada !== v.ultima) return 'nueva';
  return null;
}

export function marcarAvisada(v: VersionTienda) {
  guardarEnTelefono(ARCHIVO, () => ({ v, avisada: v.ultima }));
}

export async function abrirTienda(v?: VersionTienda | null) {
  if (Platform.OS === 'android') {
    try { await Linking.openURL('market://details?id=com.boraapp.app'); return; } catch { /* sin Play: la web */ }
  }
  const url = v?.tienda || 'https://play.google.com/store/apps/details?id=com.boraapp.app';
  try { await Linking.openURL(url); } catch { /* nada que abrir */ }
}
