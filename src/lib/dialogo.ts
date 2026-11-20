// Avisos y preguntas propios de Bora (en vez de la alerta del sistema, que en Android e iPhone se ve
// distinta y fuera de lugar). Cualquier parte de la app los abre con abrirDialogo(); la hoja la dibuja
// DialogoGlobal (components/dialogo.tsx), montada una sola vez en el layout raíz.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { NombreIconoBora } from '@/components/iconos-bora';

export type BotonDialogo = { texto: string; tipo?: 'principal' | 'normal' | 'destructivo'; onPress?: () => void };
export type Dialogo = { icono?: NombreIconoBora; titulo: string; texto?: string; botones: BotonDialogo[] };

let actual: Dialogo | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

// `trasHoja`: se pide desde una opción de otra hoja que se está cerrando. En iPhone una ventana no
// puede abrirse mientras otra se cierra, así que se espera a que termine.
export function abrirDialogo(d: Dialogo, { trasHoja = false } = {}) {
  const abrir = () => { actual = d; avisar(); };
  if (trasHoja && Platform.OS === 'ios') setTimeout(abrir, 320);
  else abrir();
}

export function cerrarDialogo() {
  actual = null;
  avisar();
}

export function useDialogo() {
  return useSyncExternalStore(
    (f) => { oyentes.add(f); return () => { oyentes.delete(f); }; },
    () => actual,
  );
}
