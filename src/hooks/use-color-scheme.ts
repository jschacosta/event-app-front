import { useColorScheme as useEsquemaSistema } from 'react-native';

import { useApariencia } from '@/lib/apariencia';

// Esquema efectivo: lo que eligió el usuario en su perfil o, en "Automático", lo del celular.
export function useColorScheme(): 'light' | 'dark' {
  const apariencia = useApariencia();
  const sistema = useEsquemaSistema();
  if (apariencia === 'oscuro') return 'dark';
  if (apariencia === 'claro') return 'light';
  return sistema === 'dark' ? 'dark' : 'light';
}
