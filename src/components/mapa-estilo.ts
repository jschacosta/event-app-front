// Lo que comparten el mapa del teléfono (MapLibre nativo) y el de la web (maplibre-gl):
// el estilo base teñido con la paleta de Bora y el encuadre inicial.
import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import { useEffect, useState } from 'react';

import type { Evento } from '@/lib/api';

export const ESTILOS = {
  claro: 'https://tiles.openfreemap.org/styles/positron',
  oscuro: 'https://tiles.openfreemap.org/styles/dark',
};

// Colores del mapa base por capa. En oscuro, morados con contraste suficiente para leer calles y barrios
// (la base "dark" de OpenFreeMap es casi negra); los pines açaí siguen siendo lo más brillante.
// null quita la propiedad del estilo base (p. ej. la trama gris de los bosques del estilo oscuro).
const TINTES: Record<'claro' | 'oscuro', Record<string, Record<string, unknown>>> = {
  // "Lavanda": morado grisáceo claro para un mapa oscuro (se leen calles, agua y barrios sin encandilar).
  oscuro: {
    background: { 'background-color': '#3A3046' },
    water: { 'fill-color': '#4E4180' },
    waterway: { 'line-color': '#4E4180' },
    landuse_residential: { 'fill-color': '#40354D' },
    // Cerros y bosques en verde: en Río son la referencia para ubicarse.
    landcover_wood: { 'fill-color': '#3C5646', 'fill-pattern': null, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0, 11, 0.9] },
    landuse_park: { 'fill-color': '#41604B' },
    building: { 'fill-color': '#4A3E5A', 'fill-outline-color': '#4A3E5A' },
    highway_path: { 'line-color': '#5A4C6E' },
    highway_minor: { 'line-color': '#5A4C6E' },
    highway_major_casing: { 'line-color': 'rgba(210,190,240,0.3)' },
    highway_major_inner: { 'line-color': '#6C5C84' },
    highway_major_subtle: { 'line-color': '#6C5C84' },
    highway_motorway_casing: { 'line-color': 'rgba(210,190,240,0.3)' },
    highway_motorway_inner: { 'line-color': '#7D6A98' },
    highway_motorway_subtle: { 'line-color': '#7D6A98' },
    railway: { 'line-color': '#5A4C6E' },
    railway_minor: { 'line-color': '#5A4C6E' },
    railway_transit: { 'line-color': '#5A4C6E' },
    boundary_state: { 'line-color': '#5A4C6E' },
    water_name: { 'text-color': '#C6B9EA', 'text-halo-color': 'rgba(58,48,70,0.9)' },
    highway_name_other: { 'text-color': '#DCD2EA', 'text-halo-color': 'rgba(58,48,70,0.9)' },
    highway_name_motorway: { 'text-color': '#DCD2EA' },
    ...Object.fromEntries(['place_other', 'place_suburb', 'place_village', 'place_town', 'place_city', 'place_city_large', 'place_state']
      .map((id) => [id, { 'text-color': '#F6F0FC', 'text-halo-color': 'rgba(58,48,70,0.9)' }])),
  },
  claro: {
    background: { 'background-color': '#F6F4F8' },
    water: { 'fill-color': '#DCD4EA' },
    waterway: { 'line-color': '#DCD4EA' },
    park: { 'fill-color': '#D3E4C8' },
    landcover_wood: { 'fill-color': '#C4DAB6' },
  },
};

const cacheEstilos: Partial<Record<'claro' | 'oscuro', StyleSpecification>> = {};

export function useEstilo(modo: 'claro' | 'oscuro') {
  const [listos, setListos] = useState<Partial<Record<'claro' | 'oscuro', StyleSpecification | string>>>({});
  useEffect(() => {
    if (cacheEstilos[modo]) return;
    let vigente = true;
    const poner = (e: StyleSpecification | string) => { if (vigente) setListos((l) => ({ ...l, [modo]: e })); };
    // Si el estilo tarda, se usa tal cual (sin teñir): mejor un mapa gris que una pantalla vacía.
    const plan = setTimeout(() => poner(ESTILOS[modo]), 2500);
    fetch(ESTILOS[modo])
      .then((r) => r.json() as Promise<StyleSpecification>)
      .then((s) => {
        const tinte = TINTES[modo];
        s.layers = s.layers.map((l) => {
          if (!tinte[l.id]) return l;
          const paint = Object.fromEntries(Object.entries({ ...(('paint' in l && l.paint) || {}), ...tinte[l.id] }).filter(([, v]) => v !== null));
          return { ...l, paint } as typeof l;
        });
        cacheEstilos[modo] = s;
        clearTimeout(plan);
        poner(s);
      })
      .catch(() => { clearTimeout(plan); poner(ESTILOS[modo]); });
    return () => { vigente = false; clearTimeout(plan); };
  }, [modo]);
  return cacheEstilos[modo] ?? listos[modo] ?? null;
}

// Encuadre inicial: los eventos sin los que quedan muy lejos (un dato mal cargado no debe alejar todo).
export function encuadre(eventos: Evento[]): [number, number, number, number] | null {
  const lats = eventos.map((e) => e.lat!).sort((a, b) => a - b);
  const lngs = eventos.map((e) => e.lng!).sort((a, b) => a - b);
  if (!lats.length) return null;
  const corte = (xs: number[], p: number) => xs[Math.min(xs.length - 1, Math.max(0, Math.round((xs.length - 1) * p)))];
  const [s, n] = lats.length > 8 ? [corte(lats, 0.05), corte(lats, 0.95)] : [lats[0], lats[lats.length - 1]];
  const [w, e] = lngs.length > 8 ? [corte(lngs, 0.05), corte(lngs, 0.95)] : [lngs[0], lngs[lngs.length - 1]];
  // Un solo lugar: un poco de aire alrededor.
  const m = 0.004;
  return [w - m, s - m, e + m, n + m];
}
