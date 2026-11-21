// Mapa de eventos con MapLibre y los mapas libres de OpenFreeMap (sin clave ni cobro por uso).
// El estilo base se baja una vez y se tiñe con la paleta de Bora (agua y fondo morados en modo oscuro),
// los pines son açaí (amarillos si el evento está en vivo) y se agrupan al alejar, con la cantidad dentro.
// Al tocar un grupo se acerca; si todos están en el mismo lugar (una disco con varias fiestas) se
// eligen todos de una vez.
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation, type CameraRef, type GeoJSONSourceRef, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import type { Posicion } from '@/lib/ubicacion';

const ESTILOS = {
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

function useEstilo(modo: 'claro' | 'oscuro') {
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
function encuadre(eventos: Evento[]): [number, number, number, number] | null {
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

export type MapaEventosRef = {
  irA: (p: Posicion, zoom?: number) => void;
  encuadrar: () => void;
};

type Props = {
  eventos: Evento[];
  ahora: number;
  elegidos: string[];
  posicion: Posicion | null;
  // Espacio que tapan los controles de arriba y la tarjeta de abajo (para encuadrar sin esconder pines).
  margen: { top: number; bottom: number };
  onElegir: (ids: string[]) => void;
};

export const MapaEventos = forwardRef<MapaEventosRef, Props>(function MapaEventos({ eventos, ahora, elegidos, posicion, margen, onElegir }, ref) {
  const t = useTheme();
  const modo = useColorScheme() === 'dark' ? 'oscuro' : 'claro';
  const estilo = useEstilo(modo);
  const camara = useRef<CameraRef>(null);
  const fuente = useRef<GeoJSONSourceRef>(null);
  const tocoPin = useRef(0);

  const datos = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
    type: 'FeatureCollection',
    features: eventos.map((e) => ({
      type: 'Feature',
      id: e.id,
      geometry: { type: 'Point', coordinates: [e.lng!, e.lat!] },
      properties: { id: e.id, vivo: new Date(e.inicio).getTime() <= ahora && ahora < new Date(e.fin).getTime() ? 1 : 0 },
    })),
  }), [eventos, ahora]);

  const caja = useMemo(() => encuadre(eventos), [eventos]);
  const relleno = { top: margen.top + 24, bottom: margen.bottom + 24, left: 36, right: 36 };

  useImperativeHandle(ref, () => ({
    irA: (p, zoom = 14) => camara.current?.flyTo({ center: [p.lng, p.lat], zoom, duration: 900 }),
    encuadrar: () => { if (caja) camara.current?.fitBounds(caja, { padding: relleno, duration: 700 }); },
  }));

  // Cambió el filtro (otro día, otra categoría): se vuelve a encuadrar.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    if (caja) camara.current?.fitBounds(caja, { padding: relleno, duration: 600 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caja]);

  const alTocarFuente = async (ev: { nativeEvent: { features: GeoJSON.Feature[]; lngLat: [number, number] } }) => {
    tocoPin.current = Date.now();
    const fs = ev.nativeEvent.features;
    const grupo = fs.find((f) => f.properties?.cluster);
    if (grupo) {
      const idGrupo = Number(grupo.properties!.cluster_id);
      const centro = (grupo.geometry as GeoJSON.Point).coordinates as [number, number];
      const zoom = await fuente.current?.getClusterExpansionZoom(idGrupo).catch(() => null);
      // Todos en el mismo lugar (el grupo no se separa ni con el máximo acercamiento): se eligen todos.
      if (zoom == null || zoom > 17) {
        const hojas = await fuente.current?.getClusterLeaves(idGrupo, 50, 0).catch(() => []) ?? [];
        onElegir(hojas.map((h) => String(h.properties?.id)).filter(Boolean));
        camara.current?.easeTo({ center: centro, duration: 400 });
        return;
      }
      camara.current?.easeTo({ center: centro, zoom: zoom + 0.3, duration: 500 });
      return;
    }
    const ids = [...new Set(fs.map((f) => String(f.properties?.id)).filter((x) => x && x !== 'undefined'))];
    if (ids.length) onElegir(ids);
  };

  if (!estilo || !caja) return <View style={[StyleSheet.absoluteFill, { backgroundColor: modo === 'oscuro' ? '#3A3046' : '#F6F4F8' }]} />;

  const pin = t.accent;
  const borde = modo === 'oscuro' ? '#3A3046' : '#FFFFFF';
  const textoGrupo = t.onAccent;
  const filtroElegidos: ['in', ['get', 'id'], ['literal', string[]]] = ['in', ['get', 'id'], ['literal', elegidos]];

  return (
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={estilo}
      logo={false}
      attribution
      attributionPosition={{ bottom: margen.bottom + 6, left: 10 }}
      compass={false}
      touchPitch={false}
      tintColor={t.textSecondary}
      onPress={() => { if (Date.now() - tocoPin.current > 350) onElegir([]); }}>
      <Camera ref={camara} initialViewState={{ bounds: caja, padding: relleno }} minZoom={9} maxZoom={18} />
      <GeoJSONSource
        id="eventos"
        ref={fuente}
        data={datos}
        cluster
        clusterRadius={46}
        clusterMaxZoom={16}
        hitbox={{ top: 12, bottom: 12, left: 12, right: 12 }}
        onPress={alTocarFuente as never}>
        {/* Grupo: un halo suave y el círculo con la cantidad */}
        <Layer
          id="grupo-halo"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': pin,
            'circle-opacity': 0.18,
            'circle-radius': ['step', ['get', 'point_count'], 24, 10, 29, 40, 35],
          }}
        />
        <Layer
          id="grupo"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': pin,
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 40, 25],
            'circle-stroke-color': borde,
            'circle-stroke-width': 2,
          }}
        />
        <Layer
          id="grupo-cuenta"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 13,
            'text-allow-overlap': true,
          }}
          paint={{ 'text-color': textoGrupo }}
        />
        {/* Evento suelto */}
        <Layer
          id="pin-halo"
          type="circle"
          filter={['all', ['!', ['has', 'point_count']], filtroElegidos]}
          paint={{ 'circle-color': pin, 'circle-opacity': 0.22, 'circle-radius': 20 }}
        />
        <Layer
          id="pin"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': ['case', ['==', ['get', 'vivo'], 1], t.sun, pin],
            'circle-radius': ['case', filtroElegidos, 11, 7.5],
            'circle-stroke-color': borde,
            'circle-stroke-width': ['case', filtroElegidos, 3, 2],
          }}
        />
      </GeoJSONSource>
      {posicion ? <NativeUserLocation /> : null}
    </Map>
  );
});
