// ¿Hay señal? Se sabe por las mismas peticiones de la app (sin módulos nativos): si una no llega al servidor,
// la app pasa a "sin conexión", muestra lo guardado en el teléfono y prueba cada pocos segundos hasta que vuelve.
// Al volver, avisa a las pantallas para que se actualicen solas (sin botones de "reintentar").
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { API_URL } from '@/config/api';

let sinConexion = false;
const oyentes = new Set<() => void>();
const alVolver = new Set<() => void>();
let prueba: ReturnType<typeof setInterval> | null = null;
const CADA = 8000;

function cambiar(valor: boolean) {
  if (valor === sinConexion) return;
  sinConexion = valor;
  oyentes.forEach((f) => f());
  if (valor) empezarPruebas();
  else {
    pararPruebas();
    alVolver.forEach((f) => f());
  }
}

// La petición llegó al servidor (aunque responda un error: hay señal).
export const marcarConexion = () => cambiar(false);
// La petición no llegó (sin red o tardó demasiado).
export const marcarSinConexion = () => cambiar(true);

async function probar() {
  try {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), 6000);
    await fetch(`${API_URL}/api/health`, { signal: control.signal });
    clearTimeout(corte);
    marcarConexion();
  } catch {
    // sigue sin señal
  }
}

function empezarPruebas() {
  if (prueba || Platform.OS === 'web') return;
  prueba = setInterval(() => {
    if (AppState.currentState === 'active') probar();
  }, CADA);
}
function pararPruebas() {
  if (prueba) clearInterval(prueba);
  prueba = null;
}

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (e) => {
    if (e === 'active' && sinConexion) probar();
  });
}

export function useSinConexion() {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => sinConexion,
  );
}

export const estaSinConexion = () => sinConexion;

// Para que una pantalla vuelva a pedir sus datos cuando regresa la señal.
export function cuandoVuelvaLaConexion(f: () => void) {
  alVolver.add(f);
  return () => { alVolver.delete(f); };
}
