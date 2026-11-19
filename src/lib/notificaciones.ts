// Notificaciones de Bora en iPhone y Android.
// - Bandeja (sin Firebase): el servidor guarda cada aviso (respuestas, mensajes, canal abierto…) y el
//   teléfono los recoge cada 15 a 30 minutos, también con la app cerrada, y los muestra como avisos
//   locales. Con la app abierta se recogen cada 2 minutos y al volver a ella.
// - Push (opcional, vía Expo → Apple/Google): si el teléfono consigue token, se registra en /me/push
//   y el aviso llega al instante; el servidor lo marca entregado para que la bandeja no lo repita.
// - Local (programada en el mismo teléfono): respaldo para el "¿Cómo estuvo?" cuando no hay push,
//   por ejemplo en Expo Go. Se programa al marcar "Estoy aquí" y se cancela al responder.
// Se pide permiso en un momento con sentido (al decir "Voy" o "Estoy aquí"), no al abrir la app.
import * as BackgroundTask from 'expo-background-task';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { almacen } from '@/lib/almacen';
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

// ── Bandeja ──────────────────────────────────────────────────────────────────────────────────────
const TAREA_BANDEJA = 'bora-bandeja';
const CLAVE_TOKEN = 'sesion_token'; // la misma que usa la sesión
const CADA_ABIERTA = 2 * 60 * 1000;
type AvisoBandeja = { id: string; titulo: string; cuerpo: string; datos: { url?: string; clave?: string } };

let recogiendo = false;
export async function recogerBandeja() {
  if (!disponible || recogiendo) return;
  recogiendo = true;
  try {
    const sesion = await almacen.leer(CLAVE_TOKEN);
    if (!sesion || !(await Notifications.getPermissionsAsync()).granted) return;
    await prepararCanal();
    const { avisos } = await api<{ avisos: AvisoBandeja[] }>('/me/bandeja', { metodo: 'POST', token: sesion });
    for (const a of avisos) {
      // Un aviso con clave reemplaza al local que ya estaba programado (p. ej. el "¿Cómo estuvo?").
      const identifier = a.datos?.clave ?? `bandeja-${a.id}`;
      if (a.datos?.clave) await Notifications.cancelScheduledNotificationAsync(a.datos.clave).catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: a.titulo, body: a.cuerpo, data: a.datos ?? {} },
        trigger: Platform.OS === 'android' ? { channelId: CANAL } : null,
      });
    }
  } catch {
    // sin red o sin servidor: se intenta en la próxima vuelta
  } finally {
    recogiendo = false;
  }
}

// Con la app cerrada, Android/iOS despiertan esta tarea cada 15 minutos como mínimo (el sistema decide
// el momento exacto según batería y uso). Se define al cargar el módulo, como pide expo-task-manager.
if (disponible) {
  TaskManager.defineTask(TAREA_BANDEJA, async () => {
    await recogerBandeja();
    return BackgroundTask.BackgroundTaskResult.Success;
  });
}

async function registrarTareaBandeja() {
  try {
    if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(TAREA_BANDEJA)) return;
    await BackgroundTask.registerTaskAsync(TAREA_BANDEJA, { minimumInterval: 15 });
  } catch {
    // Expo Go o sin soporte: quedan la revisión con la app abierta y los avisos locales
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

// Recordatorio antes de un evento donde marcó Voy: lo programa el teléfono (no necesita push).
const HORAS_RECORDATORIO = 2;
export async function programarRecordatorio(evento: { id: string; titulo: string; inicio: string; lugar?: string | null }) {
  if (!disponible) return;
  const cuando = new Date(new Date(evento.inicio).getTime() - HORAS_RECORDATORIO * 3600000);
  if (cuando.getTime() < Date.now() + 60000) return; // ya pasó la hora del recordatorio
  try {
    await prepararCanal();
    if (!(await permiso(true))) return;
    const hora = new Date(evento.inicio).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
    await Notifications.scheduleNotificationAsync({
      identifier: `recordatorio-${evento.id}`,
      content: {
        title: i18n.t('notificaciones.recordatorio.titulo', { titulo: evento.titulo }),
        body: evento.lugar
          ? i18n.t('notificaciones.recordatorio.cuerpoLugar', { hora, lugar: evento.lugar })
          : i18n.t('notificaciones.recordatorio.cuerpo', { hora }),
        data: { url: `/evento/${evento.id}` },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: cuando, channelId: CANAL },
    });
  } catch {
    // sin permiso: no hay recordatorio
  }
}

export function cancelarRecordatorio(eventoId: string) {
  if (!disponible) return;
  Notifications.cancelScheduledNotificationAsync(`recordatorio-${eventoId}`).catch(() => {});
}

// Al apagar los recordatorios en Ajustes se cancelan los que ya estaban programados.
export async function cancelarRecordatorios() {
  if (!disponible) return;
  const programadas = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(programadas.filter((n) => n.identifier.startsWith('recordatorio-'))
    .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
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

  // Bandeja: tarea en segundo plano + revisión periódica mientras la app está abierta.
  useEffect(() => {
    if (!sesion) return;
    registrarTareaBandeja();
    recogerBandeja();
    const cada = setInterval(() => {
      if (AppState.currentState === 'active') recogerBandeja();
    }, CADA_ABIERTA);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') recogerBandeja();
    });
    return () => {
      clearInterval(cada);
      sub.remove();
    };
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
