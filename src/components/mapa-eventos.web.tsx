// Mapa de eventos en la web: la misma idea que el del teléfono (mapa-eventos.tsx), con maplibre-gl.
// Comparte con él el estilo teñido con la paleta de Bora y el encuadre (mapa-estilo.ts): pines açaí
// (amarillos si el evento está en vivo) que se agrupan al alejar; al tocar un grupo se acerca y, si
// todos están en el mismo lugar, se eligen todos de una vez.
import 'maplibre-gl/dist/maplibre-gl.css';

import maplibregl, { type ExpressionSpecification, type GeoJSONSource, type LngLatBoundsLike, type MapMouseEvent } from 'maplibre-gl';
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

const filtroElegidos = (ids: string[]): ExpressionSpecification => ['in', ['get', 'id'], ['literal', ids]];

export const MapaEventos = forwardRef<MapaEventosRef, Props>(function MapaEventos({ eventos, ahora, elegidos, posicion, margen, onElegir }, ref) {
  const t = useTheme();
  const modo = useColorScheme() === 'dark' ? 'oscuro' : 'claro';
  const estilo = useEstilo(modo);
  const contenedor = useRef<unknown>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const listo = useRef(false);

  const datos = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(() => ({
    type: 'FeatureCollection',
    features: eventos.map((e) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lng!, e.lat!] },
      properties: { id: e.id, vivo: new Date(e.inicio).getTime() <= ahora && ahora < new Date(e.fin).getTime() ? 1 : 0 },
    })),
  }), [eventos, ahora]);
  const caja = useMemo(() => encuadre(eventos), [eventos]);
  const relleno = { top: margen.top + 24, bottom: margen.bottom + 24, left: 36, right: 36 };

  // Lo último de cada prop, para los manejadores del mapa (que se registran una sola vez).
  const ultimo = useRef({ datos, elegidos, posicion, onElegir, caja, relleno, margen });
  ultimo.current = { datos, elegidos, posicion, onElegir, caja, relleno, margen };

  const pin = t.accent;
  const borde = modo === 'oscuro' ? '#3A3046' : '#FFFFFF';
  const colores = { pin, borde, sol: t.sun, textoGrupo: t.onAccent };
  const coloresRef = useRef(colores);
  coloresRef.current = colores;

  useImperativeHandle(ref, () => ({
    irA: (p, zoom = 14) => mapa.current?.flyTo({ center: [p.lng, p.lat], zoom, duration: 900 }),
    encuadrar: () => { if (caja) mapa.current?.fitBounds(caja as LngLatBoundsLike, { padding: relleno, duration: 700 }); },
  }));

  // El mapa se crea una vez por estilo (claro u oscuro).
  useEffect(() => {
    const div = contenedor.current as unknown as HTMLElement | null;
    const inicial = ultimo.current.caja;
    if (!estilo || !div || !inicial) return;
    const m = new maplibregl.Map({
      container: div,
      style: estilo as maplibregl.StyleSpecification | string,
      bounds: inicial as LngLatBoundsLike,
      fitBoundsOptions: { padding: ultimo.current.relleno },
      minZoom: 9,
      maxZoom: 18,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    mapa.current = m;

    m.on('load', () => {
      const c = coloresRef.current;
      const { datos: d, elegidos: el } = ultimo.current;
      m.addSource('eventos', { type: 'geojson', data: d, cluster: true, clusterRadius: 46, clusterMaxZoom: 16 });
      m.addSource('yo', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      m.addLayer({ id: 'grupo-halo', type: 'circle', source: 'eventos', filter: ['has', 'point_count'],
        paint: { 'circle-color': c.pin, 'circle-opacity': 0.18, 'circle-radius': ['step', ['get', 'point_count'], 24, 10, 29, 40, 35] } });
      m.addLayer({ id: 'grupo', type: 'circle', source: 'eventos', filter: ['has', 'point_count'],
        paint: { 'circle-color': c.pin, 'circle-radius': ['step', ['get', 'point_count'], 16, 10, 20, 40, 25], 'circle-stroke-color': c.borde, 'circle-stroke-width': 2 } });
      m.addLayer({ id: 'grupo-cuenta', type: 'symbol', source: 'eventos', filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13, 'text-allow-overlap': true },
        paint: { 'text-color': c.textoGrupo } });
      m.addLayer({ id: 'pin-halo', type: 'circle', source: 'eventos', filter: ['all', ['!', ['has', 'point_count']], filtroElegidos(el)],
        paint: { 'circle-color': c.pin, 'circle-opacity': 0.22, 'circle-radius': 20 } });
      m.addLayer({ id: 'pin', type: 'circle', source: 'eventos', filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['case', ['==', ['get', 'vivo'], 1], c.sol, c.pin],
          'circle-radius': ['case', filtroElegidos(el), 11, 7.5],
          'circle-stroke-color': c.borde,
          'circle-stroke-width': ['case', filtroElegidos(el), 3, 2],
        } });
      // Dónde estoy: el punto azul de siempre, con un halo.
      m.addLayer({ id: 'yo-halo', type: 'circle', source: 'yo', paint: { 'circle-color': '#2F80ED', 'circle-opacity': 0.18, 'circle-radius': 16 } });
      m.addLayer({ id: 'yo', type: 'circle', source: 'yo', paint: { 'circle-color': '#2F80ED', 'circle-radius': 6, 'circle-stroke-color': '#FFFFFF', 'circle-stroke-width': 2 } });
      listo.current = true;
      // Los créditos parten plegados (un botón "i"), como en el teléfono.
      m.getContainer().querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
      subirCreditos(m, ultimo.current.margen.bottom);
      ponerPosicion(m, ultimo.current.posicion);
    });

    // Tocar un pin o un grupo (con un poco de margen alrededor, como en el teléfono).
    m.on('click', async (ev: MapMouseEvent) => {
      if (!listo.current) return;
      const { x, y } = ev.point;
      const fs = m.queryRenderedFeatures([[x - 12, y - 12], [x + 12, y + 12]], { layers: ['grupo', 'pin'] });
      if (!fs.length) { ultimo.current.onElegir([]); return; }
      const fuente = m.getSource('eventos') as GeoJSONSource;
      const grupo = fs.find((f) => f.properties?.cluster);
      if (grupo) {
        const idGrupo = Number(grupo.properties.cluster_id);
        const centro = (grupo.geometry as GeoJSON.Point).coordinates as [number, number];
        const zoom = await fuente.getClusterExpansionZoom(idGrupo).catch(() => null);
        // Todos en el mismo lugar (el grupo no se separa ni con el máximo acercamiento): se eligen todos.
        if (zoom == null || zoom > 17) {
          const hojas = await fuente.getClusterLeaves(idGrupo, 50, 0).catch(() => []);
          ultimo.current.onElegir(hojas.map((h) => String(h.properties?.id)).filter(Boolean));
          m.easeTo({ center: centro, duration: 400 });
          return;
        }
        m.easeTo({ center: centro, zoom: zoom + 0.3, duration: 500 });
        return;
      }
      ultimo.current.onElegir([...new Set(fs.map((f) => String(f.properties?.id)).filter((x) => x && x !== 'undefined'))]);
    });
    const mano = () => { m.getCanvas().style.cursor = 'pointer'; };
    const flecha = () => { m.getCanvas().style.cursor = ''; };
    for (const capa of ['grupo', 'pin']) { m.on('mouseenter', capa, mano); m.on('mouseleave', capa, flecha); }

    return () => { listo.current = false; mapa.current = null; m.remove(); };
  }, [estilo, Boolean(caja)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Otros eventos (otro día, otra categoría): se cambian los datos y se vuelve a encuadrar.
  const primera = useRef(true);
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo.current) return;
    (m.getSource('eventos') as GeoJSONSource | undefined)?.setData(datos);
    if (primera.current) { primera.current = false; return; }
    if (caja) m.fitBounds(caja as LngLatBoundsLike, { padding: ultimo.current.relleno, duration: 600 });
  }, [datos, caja]);

  // Pines elegidos: más grandes y con halo.
  useEffect(() => {
    const m = mapa.current;
    if (!m || !listo.current) return;
    m.setFilter('pin-halo', ['all', ['!', ['has', 'point_count']], filtroElegidos(elegidos)]);
    m.setPaintProperty('pin', 'circle-radius', ['case', filtroElegidos(elegidos), 11, 7.5]);
    m.setPaintProperty('pin', 'circle-stroke-width', ['case', filtroElegidos(elegidos), 3, 2]);
  }, [elegidos]);

  useEffect(() => {
    if (mapa.current && listo.current) ponerPosicion(mapa.current, posicion);
  }, [posicion]);

  // Los créditos del mapa van sobre la tarjeta de abajo, no debajo de ella.
  useEffect(() => {
    if (mapa.current) subirCreditos(mapa.current, margen.bottom);
  }, [margen.bottom]);

  const fondo = modo === 'oscuro' ? '#3A3046' : '#F6F4F8';
  // maplibre-gl pone "position: relative" en su contenedor: por eso va dentro de una capa que ocupa todo.
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: fondo }]}>
      <View ref={contenedor as never} style={{ width: '100%', height: '100%' }} />
    </View>
  );
});

function subirCreditos(m: maplibregl.Map, alto: number) {
  m.getContainer().querySelectorAll<HTMLElement>('.maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right').forEach((e) => { e.style.bottom = `${alto}px`; });
}

function ponerPosicion(m: maplibregl.Map, p: Posicion | null) {
  (m.getSource('yo') as GeoJSONSource | undefined)?.setData({
    type: 'FeatureCollection',
    features: p ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: {} }] : [],
  });
}
