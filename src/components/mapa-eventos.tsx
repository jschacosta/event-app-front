// Mapa de eventos con MapLibre y los mapas libres de OpenFreeMap (sin clave ni cobro por uso).
// El estilo base se baja una vez y se tiñe con la paleta de Bora (agua y fondo morados en modo oscuro),
// los pines son açaí (amarillos si el evento está en vivo) y se agrupan al alejar, con la cantidad dentro.
// Al tocar un grupo se acerca; si todos están en el mismo lugar (una disco con varias fiestas) se
// eligen todos de una vez.
import { Camera, GeoJSONSource, Layer, Map, NativeUserLocation, type CameraRef, type GeoJSONSourceRef } from '@maplibre/maplibre-react-native';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import type { Posicion } from '@/lib/ubicacion';

import { encuadre, useEstilo } from './mapa-estilo';

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
