// Notificaciones de Bora en iPhone y Android.
// - Push (desde el servidor, vía Expo → Apple/Google): se registra el token del teléfono en /me/push.
//   Necesita una build de la app (no funciona en Expo Go de Android) y el projectId de EAS en app.json.
// - Local (programada en el mismo teléfono): respaldo para el "¿Cómo estuvo?" cuando no hay push,
//   por ejemplo en Expo Go. Se programa al marcar "Estoy aquí" y se cancela al responder.
// Se pide permiso en un momento con sentido (al decir "Voy" o "Estoy aquí"), no al abrir la app.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { api } from '@/lib/api';
import i18n from '@/lib/i18n';

const CANAL = 'avisos';
const disponible = Platform.OS !== 'web';
let tokenPush: string | null = null; // el de este teléfono, si se pudo registrar

if (disponible) {
  // Con la app abierta también se muestra el aviso arriba.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

async function prepararCanal() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CANAL, {
    name: i18n.t('notificaciones.canal'),
    // eslint-disable-next-line import/namespace -- sí existe (viene de un export * anidado que la regla no sigue)
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// ¿Hay permiso? Con preguntar = true se le pide al usuario si todavía no decidió.
async function permiso(preguntar: boolean) {
  const actual = await Notifications.getPermissionsAsync();
  if (actual.granted || !preguntar || !actual.canAskAgain) return actual.granted;
  return (await Notifications.requestPermissionsAsync()).granted;
}

const projectId = () => Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

// Deja el teléfono listo para recibir avisos de esta cuenta. Devuelve true si quedó con push.
export async function activarNotificaciones(sesion: string | null, { preguntar = false } = {}) {
  if (!disponible || !sesion) return false;
  try {
    await prepararCanal();
    if (!(await permiso(preguntar))) return false;
    const id = projectId();
    if (!Device.isDevice || !id) return false; // simulador o app sin proyecto de EAS: solo avisos locales
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await api('/me/push', { metodo: 'POST', token: sesion, body: { token: data } });
    tokenPush = data;
    return true;
  } catch {
    return false; // Expo Go en Android no tiene push; quedan los avisos locales
  }
}

// Al cerrar sesión, este teléfono deja de recibir los avisos de la cuenta.
export async function quitarNotificaciones(sesion: string | null) {
  if (!tokenPush || !sesion) return;
  const token = tokenPush;
  tokenPush = null;
  await api('/me/push', { metodo: 'DELETE', token: sesion, body: { token } }).catch(() => {});
}

// Respaldo sin push: "¿Cómo estuvo?" a las 13:00 del día siguiente al evento (hora del teléfono).
export async function programarAvisoLocal(evento: { id: string; titulo: string; fin: string }) {
  if (!disponible || tokenPush) return; // con push lo manda el servidor
  try {
    await prepararCanal();
    if (!(await permiso(true))) return;
    const fin = new Date(evento.fin);
    const cuando = new Date(fin);
    cuando.setHours(13, 0, 0, 0);
    if (cuando.getTime() < fin.getTime() + 6 * 3600000) cuando.setDate(cuando.getDate() + 1);
    await Notifications.scheduleNotificationAsync({
      identifier: `opinion-${evento.id}`,
      content: {
        title: i18n.t('opiniones.push.titulo', { titulo: evento.titulo }),
        body: i18n.t('opiniones.push.cuerpo'),
        data: { url: `/evento/${evento.id}?responder=${evento.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
    });
  } catch {
    // sin permiso o sin soporte: queda la tarjeta de la agenda
  }
}

export function cancelarAvisoLocal(eventoId: string) {
  if (!disponible) return;
  Notifications.cancelScheduledNotificationAsync(`opinion-${eventoId}`).catch(() => {});
}

// En la raíz de la app: registra el teléfono si ya dio permiso y abre la pantalla del aviso al tocarlo
// (también si la app estaba cerrada).
function useNotificacionesNativo(sesion: string | null) {
  const respuesta = Notifications.useLastNotificationResponse();
  const abierta = useRef<string | null>(null);

  useEffect(() => {
    activarNotificaciones(sesion);
  }, [sesion]);

  useEffect(() => {
    if (!respuesta || respuesta.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = respuesta.notification.request.identifier;
    const url = respuesta.notification.request.content.data?.url;
    if (abierta.current === id || typeof url !== 'string') return;
    abierta.current = id;
    router.push(url as Href);
  }, [respuesta]);
}

// En la web no hay notificaciones: el hook no hace nada (se elige una vez, al cargar el módulo).
export const useNotificaciones: (sesion: string | null) => void = disponible ? useNotificacionesNativo : () => {};
