// Ciudades de la app. Debe coincidir con src/config/ciudades.js del backend.
// La ciudad elegida se guarda en el dispositivo y la comparten la Agenda y los Chats.
import { useSyncExternalStore } from 'react';

import { almacen } from '@/lib/almacen';
import { fijarZonaYMoneda } from '@/lib/fechas';

export type Ciudad = {
  id: string;
  nombre: string;
  pais: string;
  zona: string;
  moneda: string;
  colores: [string, string]; // degradado de su tarjeta en el selector
};

export const CIUDADES: Ciudad[] = [
  { id: 'rio', nombre: 'Rio de Janeiro', pais: 'BR', zona: 'America/Sao_Paulo', moneda: 'BRL', colores: ['#0E7C86', '#0B3D5C'] },
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

almacen.leer(CLAVE).then((id) => {
  const c = CIUDADES.find((x) => x.id === id);
  if (c && c.id !== actual.id) fijar(c);
});

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
