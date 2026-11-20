// Ciudades de la app. Debe coincidir con src/config/ciudades.js del backend.
// La ciudad elegida se guarda en el dispositivo y la comparten la Agenda y los Chats.
import { getCalendars } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import { almacen } from '@/lib/almacen';
import { fijarZonaYMoneda } from '@/lib/fechas';

export type Ciudad = {
  id: string;
  nombre: string;
  corto?: string; // para frases ("Todo lo que pasa en Rio")
  pais: string;
  zona: string;
  moneda: string;
  colores: [string, string]; // degradado de su tarjeta en el selector
};

export const CIUDADES: Ciudad[] = [
  { id: 'rio', nombre: 'Rio de Janeiro', corto: 'Rio', pais: 'BR', zona: 'America/Sao_Paulo', moneda: 'BRL', colores: ['#0E7C86', '#0B3D5C'] },
  { id: 'sao-paulo', nombre: 'São Paulo', pais: 'BR', zona: 'America/Sao_Paulo', moneda: 'BRL', colores: ['#5B5F6B', '#22252D'] },
  { id: 'florianopolis', nombre: 'Florianópolis', pais: 'BR', zona: 'America/Sao_Paulo', moneda: 'BRL', colores: ['#2E9CCA', '#155E8A'] },
  { id: 'bogota', nombre: 'Bogotá', pais: 'CO', zona: 'America/Bogota', moneda: 'COP', colores: ['#4C6A92', '#1F2F4A'] },
  { id: 'medellin', nombre: 'Medellín', pais: 'CO', zona: 'America/Bogota', moneda: 'COP', colores: ['#3F8F5A', '#1C4A2E'] },
  { id: 'cartagena', nombre: 'Cartagena', pais: 'CO', zona: 'America/Bogota', moneda: 'COP', colores: ['#E0874A', '#9C3D2A'] },
  { id: 'santiago', nombre: 'Santiago', pais: 'CL', zona: 'America/Santiago', moneda: 'CLP', colores: ['#8C6BB1', '#3B2C5E'] },
];

const CLAVE = 'ciudad_app';
let actual: Ciudad = CIUDADES[0];
const oyentes = new Set<() => void>();

function fijar(c: Ciudad) {
  actual = c;
  fijarZonaYMoneda(c.zona, c.moneda);
  oyentes.forEach((o) => o());
}

// Primera vez que se abre la app: la ciudad sale de la zona horaria del teléfono, que la red del
// celular ajusta sola donde esté la persona (sin pedir permiso de ubicación ni enviar nada).
// Brasil (cualquier zona del país) → Rio; Chile → Santiago; Colombia → Bogotá. Fuera de esos
// países queda Rio. Si la persona después elige otra ciudad, se respeta siempre.
const ZONA_A_CIUDAD: [RegExp, string][] = [
  [/^America\/(Sao_Paulo|Bahia|Fortaleza|Recife|Maceio|Belem|Araguaina|Santarem|Manaus|Cuiaba|Campo_Grande|Porto_Velho|Boa_Vista|Rio_Branco|Eirunepe|Noronha)$/, 'rio'],
  [/^(America\/(Santiago|Punta_Arenas)|Pacific\/Easter|Chile\/.*)$/, 'santiago'],
  [/^America\/Bogota$/, 'bogota'],
];

export function ciudadPorZona(zona: string | null | undefined): string {
  if (!zona) return 'rio';
  return ZONA_A_CIUDAD.find(([re]) => re.test(zona))?.[1] ?? 'rio';
}

function zonaDelTelefono() {
  try {
    return getCalendars()[0]?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

// Las pantallas esperan esto antes de pedir eventos, para no cargar Rio y después saltar a otra ciudad.
export const ciudadLista = almacen.leer(CLAVE).then((id) => {
  const c = CIUDADES.find((x) => x.id === (id ?? ciudadPorZona(zonaDelTelefono())));
  if (c && c.id !== actual.id) fijar(c);
  if (!id && c) almacen.guardar(CLAVE, c.id).catch(() => {});
}).catch(() => {});

export async function cambiarCiudad(id: string) {
  const c = CIUDADES.find((x) => x.id === id);
  if (!c || c.id === actual.id) return;
  fijar(c);
  await almacen.guardar(CLAVE, id);
}

export function useCiudad() {
  return useSyncExternalStore(
    (cb) => { oyentes.add(cb); return () => { oyentes.delete(cb); }; },
    () => actual,
    () => actual,
  );
}
