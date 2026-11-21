// Ubicación para "Cerca de mí" y el mapa. Solo mientras se usa la app (nunca en segundo plano) y solo
// cuando la persona lo pide: la posición se guarda en memoria, no se manda al servidor ni se escribe en
// el teléfono. La comparten la Agenda y el mapa, así no se pregunta dos veces.
import * as Location from 'expo-location';
import { useSyncExternalStore } from 'react';
import { Linking } from 'react-native';

import { abrirDialogo } from '@/lib/dialogo';
import i18n from '@/lib/i18n';

export type Posicion = { lat: number; lng: number };

let actual: Posicion | null = null;
const oyentes = new Set<() => void>();
const fijar = (p: Posicion) => { actual = p; oyentes.forEach((o) => o()); };

export function usePosicion() {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => actual,
  );
}

const desde = (l: Location.LocationObject): Posicion => ({ lat: l.coords.latitude, lng: l.coords.longitude });

// Pide permiso (si falta) y la posición. La última conocida sirve para responder al instante; la exacta
// llega después y reemplaza a la otra. Devuelve null si la persona no dio permiso o el GPS está apagado,
// y en ese caso explica cómo arreglarlo.
export async function pedirPosicion(): Promise<Posicion | null> {
  const tr = i18n.t.bind(i18n);
  try {
    let permiso = await Location.getForegroundPermissionsAsync();
    if (!permiso.granted && permiso.canAskAgain) permiso = await Location.requestForegroundPermissionsAsync();
    if (!permiso.granted) {
      abrirDialogo({
        icono: 'pin',
        titulo: tr('cerca.sinPermisoTitulo'),
        texto: tr('cerca.sinPermisoTexto'),
        botones: [
          { texto: tr('cerca.abrirAjustes'), tipo: 'principal', onPress: () => { Linking.openSettings().catch(() => {}); } },
          { texto: tr('comun.ahoraNo') },
        ],
      });
      return null;
    }
    const ultima = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60_000 }).catch(() => null);
    if (ultima) {
      fijar(desde(ultima));
      // La exacta, sin esperar: la lista se reordena sola si cambió.
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((l) => fijar(desde(l))).catch(() => {});
      return actual;
    }
    const exacta = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    fijar(desde(exacta));
    return actual;
  } catch {
    abrirDialogo({
      icono: 'pin',
      titulo: tr('cerca.sinGpsTitulo'),
      texto: tr('cerca.sinGpsTexto'),
      botones: [{ texto: tr('comun.entendido'), tipo: 'principal' }],
    });
    return null;
  }
}

// Distancia en metros (haversine): de sobra para una ciudad.
export function distancia(a: Posicion, b: { lat?: number | null; lng?: number | null }): number | null {
  if (b.lat == null || b.lng == null) return null;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// "350 m", "1,2 km", "14 km" (la coma o el punto según el idioma). Sin Intl: es lento en Android.
export function textoDistancia(metros: number) {
  if (metros < 950) return `${Math.max(50, Math.round(metros / 50) * 50)} m`;
  const km = metros / 1000;
  if (km >= 10) return `${Math.round(km)} km`;
  const decimal = i18n.language?.startsWith('en') ? '.' : ',';
  return `${km.toFixed(1).replace('.', decimal)} km`;
}
