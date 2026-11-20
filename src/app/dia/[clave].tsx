// Todos los eventos de un día, en lista vertical (desde "Ver todos" de la Agenda).
// Usa los eventos que la Agenda ya cargó; si se abre directo (link), los pide al servidor.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonArriba, BotonVolver, EncabezadoCompacto, useDesplazamiento } from '@/components/desplazamiento';
import { ListaEventos } from '@/components/fila-evento';
import { BarraBusqueda, FilaGeneros, IconoVacio } from '@/components/filtros';
import { BotonTexto, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { crearBuscador } from '@/lib/buscar-eventos';
import { useCiudad } from '@/lib/ciudades';
import { asegurarDia, cargarInicio, cubreDia, useAgenda } from '@/lib/agenda';
import { claveDia, claveHoy, diasDesdeHoy, tituloDeClave } from '@/lib/fechas';
import { GENEROS } from '@/lib/generos';
import { BotonBarrio, HojaBarrios } from '@/components/barrios';

export default function DiaScreen() {
  const params = useLocalSearchParams<{ clave: string; genero?: string; barrio?: string }>();
  const clave = params.clave;
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const { t: tr, i18n } = useTranslation();
  const ciudad = useCiudad();
  // La agenda se carga por partes: si el día todavía no está entero (por ejemplo, solo sus eventos de una categoría), se baja.
  const agenda = useAgenda(ciudad.id);
  const [fallo, setFallo] = useState(false);
  const eventos = agenda.eventos && (cubreDia(agenda, clave) || fallo) ? agenda.eventos : null;
  const [genero, setGenero] = useState<string | null>(params.genero ?? null);
  const [barrio, setBarrio] = useState<string | null>(params.barrio ?? null);
  const [hojaBarrios, setHojaBarrios] = useState(false);
  const [consulta, setConsulta] = useState('');
  const { ref: refScroll, onScroll, medirBuscador, compacto, arriba, subir } = useDesplazamiento();
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/'));

  useEffect(() => {
    (agenda.eventos ? Promise.resolve() : cargarInicio(ciudad.id, token ?? null))
      .then(() => asegurarDia(ciudad.id, clave, token ?? null))
      .catch(() => setFallo(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, ciudad.id, token]);

  // Los eventos de ese día (uno que ya empezó cuenta como de hoy), en orden de hora.
  const delDia = useMemo(() => {
    const hoy = claveHoy();
    return (eventos ?? [])
      .filter((e) => (diasDesdeHoy(e.inicio) < 0 ? hoy : claveDia(e.inicio)) === clave)
      .sort((a, b) => a.inicio.localeCompare(b.inicio));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, clave, ciudad.zona]);

  const generos = useMemo(() => GENEROS.filter((g) => delDia.some((e) => e.generos.includes(g))), [delDia]);
  // Barrios de este día, de más a menos (para la misma hoja de la Agenda).
  const barrios = useMemo(() => {
    const n = new Map<string, number>();
    for (const e of delDia) if (e.barrio) n.set(e.barrio, (n.get(e.barrio) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, cuenta]) => ({ nombre, cuenta }));
  }, [delDia]);
  const buscar = useMemo(() => crearBuscador(delDia), [delDia]);
  const buscando = consulta.trim().length >= 2;
  const lista = useMemo(() => {
    const base = buscando ? buscar(consulta) : delDia;
    return base.filter((e) => (!genero || e.generos.includes(genero)) && (!barrio || e.barrio === barrio)).map((evento) => ({ evento, repeticiones: 1 }));
    // i18n.language: los nombres de los géneros cambian con el idioma
  }, [buscando, buscar, consulta, delDia, genero, barrio, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  const titulo = tituloDeClave(clave);

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <EncabezadoCompacto
        visible={compacto}
        titulo={titulo}
        izquierda={<BotonVolver onPress={volver} />}
        busqueda={{ valor: consulta, onCambio: setConsulta, placeholder: tr('dia.buscar') }}
      />
      <Animated.ScrollView
        ref={refScroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.margen}>
          <BotonVolver onPress={volver} />
        </View>
        <View style={[styles.margen, styles.cabeza]}>
          <View style={{ flex: 1 }}>
            <Texto v="tituloGrande">{titulo}</Texto>
            {eventos ? <Texto v="detalle" secundario>{tr('dia.eventos', { count: delDia.length })}</Texto> : null}
          </View>
          {barrios.length >= 3 || barrio ? (
            <BotonBarrio elegido={barrio} onAbrir={() => setHojaBarrios(true)} onQuitar={() => setBarrio(null)} />
          ) : null}
        </View>
        <View style={[styles.margen, { marginTop: 16 }]} onLayout={medirBuscador}>
          <BarraBusqueda valor={consulta} onCambio={setConsulta} placeholder={tr('dia.buscar')} />
        </View>
        <View style={{ marginTop: 14 }}>
          <FilaGeneros generos={generos} elegido={genero} onCambio={setGenero} />
        </View>

        {eventos === null ? (
          <ActivityIndicator style={{ marginTop: 48 }} />
        ) : lista.length === 0 ? (
          <View style={styles.vacio}>
            <IconoVacio nombre={buscando ? 'magnifyingglass' : 'calendar'} />
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>
              {buscando ? tr('agenda.sinResultados', { q: consulta.trim() }) : tr('dia.vacio')}
            </Texto>
            {barrio ? <BotonTexto texto={tr('barrio.todos')} onPress={() => setBarrio(null)} />
              : genero ? <BotonTexto texto={tr('agenda.verTodosTipos')} onPress={() => setGenero(null)} /> : null}
          </View>
        ) : (
          <Animated.View entering={FadeIn.duration(200)} style={[styles.margen, { marginTop: 18 }]}>
            {genero || barrio || buscando ? (
              <Texto v="pie" secundario style={styles.cuenta}>{tr('agenda.resultados', { count: lista.length })}</Texto>
            ) : null}
            <ListaEventos grupos={lista} soloHora />
          </Animated.View>
        )}
      </Animated.ScrollView>
      <BotonArriba visible={arriba} onPress={subir} sinPestanas />
      <HojaBarrios visible={hojaBarrios} barrios={barrios} elegido={barrio} onElegir={setBarrio} onCerrar={() => setHojaBarrios(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  cabeza: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%' },
  margen: { paddingHorizontal: 20 },
  vacio: { marginTop: 48, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  cuenta: { marginBottom: 8, paddingHorizontal: 4, fontWeight: '600', textTransform: 'uppercase' },
});
