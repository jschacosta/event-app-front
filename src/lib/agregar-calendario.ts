// "Agregar al calendario": abre la pantalla de evento nuevo del propio calendario del teléfono, ya llena
// (título, horario, lugar y el enlace a Bora). La persona decide en qué calendario guardarlo y puede
// cambiar lo que quiera. No pide permiso: la que guarda es la app de calendario, Bora nunca lo lee.
// En la web (o si algo falla) abre Google Calendar.
import * as Calendar from 'expo-calendar/legacy';
import { Linking, Platform } from 'react-native';

import type { Evento } from '@/lib/api';
import { linkEvento } from '@/lib/compartir-evento';

type Datos = Pick<Evento, 'id' | 'titulo' | 'inicio' | 'fin' | 'lugar' | 'direccion' | 'barrio' | 'ciudad'>;

const lugarDe = (e: Datos) => [e.lugar, e.direccion ?? e.barrio, e.ciudad].filter(Boolean).join(', ');

function enlaceGoogle(e: Datos) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.titulo,
    dates: `${f(e.inicio)}/${f(e.fin)}`,
    location: lugarDe(e),
    details: linkEvento(e.id),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// true si quedó guardado (o si no se puede saber, como en Android); false si la persona canceló.
export async function agregarAlCalendario(e: Datos): Promise<boolean> {
  if (Platform.OS === 'web') {
    await Linking.openURL(enlaceGoogle(e)).catch(() => {});
    return true;
  }
  try {
    const r = await Calendar.createEventInCalendarAsync({
      title: e.titulo,
      startDate: new Date(e.inicio),
      endDate: new Date(e.fin),
      location: lugarDe(e),
      notes: linkEvento(e.id),
      url: linkEvento(e.id),
    });
    return r.action !== 'canceled';
  } catch {
    // Sin app de calendario o sin permiso: Google Calendar en el navegador sirve igual.
    await Linking.openURL(enlaceGoogle(e)).catch(() => {});
    return true;
  }
}
