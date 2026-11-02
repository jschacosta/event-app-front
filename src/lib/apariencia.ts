// Modo claro / modo noche elegido por el usuario: "sistema" sigue al celular.
// Se guarda en el dispositivo y se aplica a toda la app (incluidas las barras nativas).
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

import { almacen } from '@/lib/almacen';

export type Apariencia = 'sistema' | 'claro' | 'oscuro';
const CLAVE = 'apariencia_app';

let actual: Apariencia = 'sistema';
const oyentes = new Set<() => void>();

function aplicarNativo(a: Apariencia) {
  if (Platform.OS === 'web') return;
  // En iOS/Android esto cambia también la barra de pestañas, el teclado y los selectores nativos.
  Appearance.setColorScheme?.(a === 'sistema' ? 'unspecified' : a === 'oscuro' ? 'dark' : 'light');
}

function fijar(a: Apariencia) {
  actual = a;
  aplicarNativo(a);
  oyentes.forEach((o) => o());
}

almacen.leer(CLAVE).then((v) => {
  if (v === 'claro' || v === 'oscuro') fijar(v);
});

export async function cambiarApariencia(a: Apariencia) {
  if (a === actual) return;
  fijar(a);
  await almacen.guardar(CLAVE, a);
}

export function useApariencia() {
  return useSyncExternalStore(
    (cb) => { oyentes.add(cb); return () => { oyentes.delete(cb); }; },
    () => actual,
    () => actual,
  );
}
