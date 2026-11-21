// En la web no hay mapa nativo: la pantalla del mapa no se ofrece ahí (el botón solo aparece en el teléfono).
import { forwardRef } from 'react';
import { View } from 'react-native';

import type { Evento } from '@/lib/api';
import type { Posicion } from '@/lib/ubicacion';

export type MapaEventosRef = { irA: (p: Posicion, zoom?: number) => void; encuadrar: () => void };

type Props = {
  eventos: Evento[];
  ahora: number;
  elegidos: string[];
  posicion: Posicion | null;
  margen: { top: number; bottom: number };
  onElegir: (ids: string[]) => void;
};

export const MapaEventos = forwardRef<MapaEventosRef, Props>(function MapaEventos(_props, _ref) {
  return <View style={{ flex: 1 }} />;
});
