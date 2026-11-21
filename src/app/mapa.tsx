// Mapa de la Agenda: los mismos eventos (con la categoría y el barrio que venían elegidos) puestos en el
// plano de la ciudad. Arriba, el rango de fechas; abajo a la derecha, "dónde estoy"; al tocar un pin sube
// la tarjeta del evento (o varias, si en ese lugar hay más de una fiesta) y desde ahí se abre la ficha.
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FotoEvento } from '@/components/foto-evento';
import { IconoBora } from '@/components/iconos-bora';
import { MapaEventos, type MapaEventosRef } from '@/components/mapa-eventos';
import { Icono, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import { asegurarBarrio, asegurarDia, asegurarGenero, useAgenda } from '@/lib/agenda';
import { useCiudad } from '@/lib/ciudades';
import { claveDia, claveHoy, claveManana, diaCorto, fechaDeClave, hora, sumarDias } from '@/lib/fechas';
import { colorEtiquetaGenero, nombreGenero } from '@/lib/generos';
import { precargarEvento } from '@/lib/precarga';
import { distancia, pedirPosicion, textoDistancia, usePosicion } from '@/lib/ubicacion';

type Rango = 'hoy' | 'manana' | 'semana' | string; // string: un día puntual que venía elegido en la Agenda

const conUbicacion = (e: Evento) => e.lat != null && e.lng != null;

function TarjetaMapa({ evento, ancho, ahora, cuantos, indice }: { evento: Evento; ancho: number; ahora: number; cuantos: number; indice: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const posicion = usePosicion();
  const vivo = new Date(evento.inicio).getTime() <= ahora && ahora < new Date(evento.fin).getTime();
  const genero = evento.generos[0];
  const metros = posicion ? distancia(posicion, evento) : null;
  const dia = claveDia(evento.inicio);
  const cuando = vivo ? tr('agenda.hastaCorto', { hora: hora(evento.fin) })
    : dia === claveHoy() ? hora(evento.inicio) : `${diaCorto(evento.inicio)} ${hora(evento.inicio)}`;
  return (
    <Pressable
      onPressIn={() => precargarEvento(evento)}
      onPress={() => router.push({ pathname: '/evento/[id]', params: { id: evento.id } })}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tarjeta, { width: ancho, backgroundColor: t.card }, pressed && { opacity: 0.9 }]}>
      <View style={[styles.foto, { backgroundColor: evento.imagen ? t.backgroundElement : colorEtiquetaGenero(genero ?? 'otro') }]}>
        {evento.imagen
          ? <FotoEvento url={evento.imagen} style={StyleSheet.absoluteFill} recyclingKey={evento.id} transition={150} />
          : <Texto style={styles.inicial}>{evento.titulo.trim().charAt(0).toUpperCase()}</Texto>}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.linea}>
          {vivo ? (
            <View style={[styles.etiqueta, { backgroundColor: t.sun }]}>
              <Texto v="mini" style={{ color: t.onSun, fontWeight: '800' }}>{tr('agenda.enVivo')}</Texto>
            </View>
          ) : null}
          <Texto style={[styles.hora, { color: t.accentText }]}>{cuando}</Texto>
          {cuantos > 1 ? <Texto v="mini" secundario style={{ marginLeft: 'auto', fontWeight: '700' }}>{tr('mapa.enEsteLugar', { n: indice + 1, total: cuantos })}</Texto> : null}
        </View>
        <Texto v="cuerpoFuerte" numberOfLines={2} style={{ fontSize: 15, lineHeight: 19 }}>{evento.titulo}</Texto>
        <View style={styles.linea}>
          {genero ? (
            <View style={[styles.etiqueta, { backgroundColor: colorEtiquetaGenero(genero) }]}>
              <Texto v="mini" style={{ color: '#FFFFFF', fontWeight: '700' }}>{nombreGenero(genero)}</Texto>
            </View>
          ) : null}
          <Texto v="pie" secundario numberOfLines={1} style={{ flexShrink: 1 }}>{evento.lugar ?? evento.barrio ?? ''}</Texto>
          {metros != null ? <Texto v="pie" style={{ fontWeight: '700', marginLeft: 'auto' }}>{tr('cerca.distancia', { d: textoDistancia(metros) })}</Texto> : null}
        </View>
      </View>
      <Icono nombre="chevron.right" tamano={12} color={t.textSecondary} peso="bold" />
    </Pressable>
  );
}

const Chip = memo(function Chip({ texto, elegido, onPress }: { texto: string; elegido: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: elegido }}
      style={({ pressed }) => [styles.chip, { backgroundColor: elegido ? t.accent : t.card }, pressed && { opacity: 0.8 }]}>
      <Texto v="detalle" style={{ fontWeight: '700', color: elegido ? t.onAccent : t.text }}>{texto}</Texto>
    </Pressable>
  );
});

export default function MapaScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { token } = useSesion();
  const ciudad = useCiudad();
  const params = useLocalSearchParams<{ genero?: string; barrio?: string; dia?: string }>();
  const agenda = useAgenda(ciudad.id);
  const posicion = usePosicion();
  const mapa = useRef<MapaEventosRef>(null);
  const [ahora] = useState(() => Date.now());
  const [genero, setGenero] = useState<string | null>(params.genero ?? null);
  const barrio = params.barrio ?? null;
  const diaPuntual = params.dia && params.dia !== claveHoy() && params.dia !== claveManana() ? params.dia : null;
  // null: automático (hoy, o la semana si hoy no queda nada con ubicación).
  const [rangoElegido, setRango] = useState<Rango | null>(params.dia === claveHoy() ? 'hoy' : params.dia === claveManana() ? 'manana' : diaPuntual);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);

  // Lo que falte de lo elegido se baja (la Agenda solo trae la primera semana de entrada).
  useEffect(() => {
    if (!rangoElegido) return;
    const rango = rangoElegido;
    if (rango !== 'hoy' && rango !== 'manana' && rango !== 'semana') asegurarDia(ciudad.id, rango, token ?? null).catch(() => {});
    if (rango === 'manana') asegurarDia(ciudad.id, claveManana(), token ?? null).catch(() => {});
  }, [rangoElegido, ciudad.id, token]);
  useEffect(() => { if (genero) asegurarGenero(ciudad.id, genero, token ?? null).catch(() => {}); }, [genero, ciudad.id, token]);
  useEffect(() => { if (barrio) asegurarBarrio(ciudad.id, barrio, token ?? null).catch(() => {}); }, [barrio, ciudad.id, token]);

  const { rango, enRango, visibles } = useMemo(() => {
    const hoy = claveHoy();
    const finSemana = sumarDias(hoy, 7);
    const base = (agenda.eventos ?? []).filter((e) => new Date(e.fin).getTime() > ahora
      && (!genero || e.generos.includes(genero)) && (!barrio || e.barrio === barrio));
    const en = (r: Rango) => base.filter((e) => {
      const vivo = new Date(e.inicio).getTime() <= ahora;
      const d = claveDia(e.inicio);
      if (r === 'hoy') return vivo || d === hoy;
      if (r === 'manana') return d === claveManana();
      if (r === 'semana') return vivo || d < finSemana;
      return d === r;
    });
    let rango: Rango = rangoElegido ?? 'hoy';
    let enRango = en(rango);
    // Un mapa vacío no sirve de entrada: si hoy no queda nada con ubicación, se abre en la semana.
    if (!rangoElegido && agenda.eventos && !enRango.some(conUbicacion)) {
      rango = 'semana';
      enRango = en(rango);
    }
    return { rango, enRango, visibles: enRango.filter(conUbicacion) };
  }, [agenda.eventos, genero, barrio, rangoElegido, ahora]);

  const porId = useMemo(() => new Map(visibles.map((e) => [e.id, e])), [visibles]);
  const tarjetas = useMemo(() => {
    const lista = elegidos.map((id) => porId.get(id)).filter((e): e is Evento => Boolean(e));
    return lista.sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }, [elegidos, porId]);

  const cambiarRango = (r: Rango) => { setElegidos([]); setRango(r); };
  const dondeEstoy = async () => {
    if (posicion) { mapa.current?.irA(posicion); }
    setBuscando(true);
    const p = await pedirPosicion();
    setBuscando(false);
    if (p) mapa.current?.irA(p);
  };

  const anchoTarjeta = Math.min(width - 32, 460);
  const altoTarjeta = 108;
  const abajo = Math.max(insets.bottom, 12) + 12;
  const arriba = insets.top + 8 + 44 + 8 + 34;

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <MapaEventos
        ref={mapa}
        eventos={visibles}
        ahora={ahora}
        elegidos={elegidos}
        posicion={posicion}
        margen={{ top: arriba, bottom: abajo + (tarjetas.length ? altoTarjeta + 12 : 56) }}
        onElegir={setElegidos}
      />

      {/* Arriba: volver, la ciudad con la cuenta y el rango de fechas */}
      <View style={[styles.arriba, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.cabeza} pointerEvents="box-none">
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel={tr('comun.volver')}
            hitSlop={6}
            style={({ pressed }) => [styles.redondo, { backgroundColor: t.card }, pressed && { opacity: 0.7 }]}>
            <Icono nombre="chevron.left" tamano={17} color={t.text} peso="semibold" />
          </Pressable>
          <View style={[styles.titulo, { backgroundColor: t.card }]}>
            <Texto numberOfLines={1} style={styles.ciudad}>{ciudad.nombre}</Texto>
            <Texto v="pie" secundario numberOfLines={1} style={{ fontWeight: '600' }}>
              {agenda.eventos ? tr('mapa.eventos', { count: visibles.length }) : tr('comun.cargando')}
            </Texto>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
          <Chip texto={tr('fechas.hoy')} elegido={rango === 'hoy'} onPress={() => cambiarRango('hoy')} />
          <Chip texto={tr('fechas.manana')} elegido={rango === 'manana'} onPress={() => cambiarRango('manana')} />
          <Chip texto={tr('mapa.semana')} elegido={rango === 'semana'} onPress={() => cambiarRango('semana')} />
          {diaPuntual ? <Chip texto={`${fechaDeClave(diaPuntual).semana} ${fechaDeClave(diaPuntual).numero}`} elegido={rango === diaPuntual} onPress={() => cambiarRango(diaPuntual)} /> : null}
          {genero ? (
            <Pressable
              onPress={() => { setElegidos([]); setGenero(null); }}
              accessibilityRole="button"
              accessibilityLabel={tr('mapa.quitarCategoria', { genero: nombreGenero(genero) })}
              style={({ pressed }) => [styles.chip, styles.chipGenero, { backgroundColor: colorEtiquetaGenero(genero) }, pressed && { opacity: 0.8 }]}>
              <Texto v="detalle" style={{ fontWeight: '700', color: '#FFFFFF' }}>{nombreGenero(genero)}</Texto>
              <IconoBora nombre="cerrar" tamano={13} color="#FFFFFF" grosor={2.4} />
            </Pressable>
          ) : null}
          {barrio ? (
            <View style={[styles.chip, styles.chipGenero, { backgroundColor: t.card }]}>
              <IconoBora nombre="pin" tamano={14} color={t.text} />
              <Texto v="detalle" style={{ fontWeight: '700' }}>{barrio}</Texto>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* Nada con ubicación en este rango */}
      {agenda.eventos && visibles.length === 0 ? (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.vacio, { backgroundColor: t.card, top: arriba + 16 }]}>
          <Texto v="detalle" style={{ fontWeight: '600', textAlign: 'center' }}>
            {enRango.length ? tr('mapa.sinUbicacion', { count: enRango.length }) : tr('mapa.vacio')}
          </Texto>
          {rango !== 'semana' ? (
            <Pressable onPress={() => cambiarRango('semana')} hitSlop={6}>
              <Texto v="detalle" style={{ fontWeight: '700', color: t.accentText }}>{tr('mapa.verSemana')}</Texto>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Dónde estoy */}
      <Pressable
        onPress={dondeEstoy}
        accessibilityRole="button"
        accessibilityLabel={tr('mapa.dondeEstoy')}
        style={({ pressed }) => [styles.redondo, styles.ubicarme, { backgroundColor: t.card, bottom: abajo + (tarjetas.length ? altoTarjeta + 12 : 0) }, pressed && { opacity: 0.7 }]}>
        <View style={{ opacity: buscando ? 0.4 : 1 }}>
          <IconoBora nombre="cerca" tamano={20} color={posicion ? t.accentText : t.text} />
        </View>
      </Pressable>

      {/* Tarjeta del evento elegido (o de todos los del mismo lugar) */}
      {tarjetas.length ? (
        <Animated.View key={tarjetas.map((e) => e.id).join()} entering={FadeInDown.duration(220)} exiting={FadeOut.duration(120)} style={[styles.abajo, { bottom: abajo }]}>
          <FlatList
            data={tarjetas}
            keyExtractor={(e) => e.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={anchoTarjeta + 10}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (width - anchoTarjeta) / 2, gap: 10 }}
            renderItem={({ item, index }) => (
              <TarjetaMapa evento={item} ancho={anchoTarjeta} ahora={ahora} cuantos={tarjetas.length} indice={index} />
            )}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const sombra = {
  shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
};

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  arriba: { position: 'absolute', left: 0, right: 0, top: 0, gap: 8 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  redondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', ...sombra },
  titulo: { flex: 1, height: 44, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center', ...sombra },
  ciudad: { fontFamily: FuenteTitulo.cursiva, fontSize: 19, lineHeight: 21, paddingRight: 2 },
  chips: { paddingHorizontal: 16, gap: 6, paddingBottom: 8 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 4, alignItems: 'center', justifyContent: 'center', ...sombra },
  chipGenero: { flexDirection: 'row', gap: 6 },
  ubicarme: { position: 'absolute', right: 16 },
  abajo: { position: 'absolute', left: 0, right: 0 },
  tarjeta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 8, height: 108, ...sombra },
  foto: { width: 84, height: 88, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 32, lineHeight: 36, paddingRight: 2 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiqueta: { height: 17, paddingHorizontal: 5, borderRadius: 3, justifyContent: 'center' },
  hora: { fontFamily: FuenteTitulo.cursiva, fontSize: 16, lineHeight: 18, paddingRight: 1 },
  vacio: { position: 'absolute', left: 32, right: 32, padding: 14, borderRadius: 8, alignItems: 'center', gap: 8, ...sombra },
});
