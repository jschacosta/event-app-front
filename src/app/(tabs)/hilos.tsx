// Pestaña Hilos (en la web, en vez de Canales): las guías de Bora de la ciudad, como un foro denso
// ordenado por votos. Arriba los temas; cada fila lleva sus votos, el tema, la pregunta y el resumen.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pildora } from '@/components/filtros';
import { nuevoPuntaje, pedirSesion, votarEn, Votos } from '@/components/opiniones';
import { BotonPrincipal, Icono, Texto } from '@/components/ui';
import { BottomTabInset } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { useCiudad } from '@/lib/ciudades';
import { cargarGuias, type GuiaResumen, type TemaGuia } from '@/lib/guias';

const ANCHO_MAX = 720;

function FilaGuia({ g, onAbrir, onVotar }: { g: GuiaResumen; onAbrir: () => void; onVotar: (v: number) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={onAbrir}
      accessibilityRole="link"
      style={({ pressed }) => [styles.fila, { borderBottomColor: t.separator }, pressed && { backgroundColor: t.backgroundElement }]}>
      <Votos puntaje={g.puntaje} miVoto={g.miVoto} onVotar={onVotar} />
      <View style={{ flex: 1, gap: 3 }}>
        <Texto v="mini" style={{ color: t.accentText, fontWeight: '800' }}>{tr(`hilos.temas.${g.tema}`)}</Texto>
        <Texto v="cuerpoFuerte" style={{ fontSize: 16, lineHeight: 20 }} numberOfLines={2}>{g.titulo}</Texto>
        <Texto v="pie" secundario numberOfLines={2} style={{ lineHeight: 18 }}>{g.resumen}</Texto>
        <View style={styles.pie}>
          <Icono nombre="bubble.left" tamano={12} color={t.textSecondary} />
          <Texto v="pie" secundario style={{ fontWeight: '600' }}>{tr('opiniones.respuestas', { count: g.respuestas })}</Texto>
        </View>
      </View>
    </Pressable>
  );
}

export default function HilosScreen() {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const ciudad = useCiudad();
  const [guias, setGuias] = useState<GuiaResumen[] | null>(null);
  const [temas, setTemas] = useState<TemaGuia[]>([]);
  const [tema, setTema] = useState<TemaGuia | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(() => {
    setError(false);
    cargarGuias(ciudad.id, i18n.language, token ?? null)
      .then((r) => { setGuias(r.guias); setTemas(r.temas); })
      .catch(() => setError(true));
  }, [ciudad.id, i18n.language, token]);
  useFocusEffect(cargar);

  const votar = async (g: GuiaResumen, valor: number) => {
    if (!token) return pedirSesion(tr, 'opinar', '/hilos');
    const cambiar = (x: Partial<GuiaResumen>) => setGuias((l) => l?.map((y) => (y.id === g.id ? { ...y, ...x } : y)) ?? l);
    cambiar({ miVoto: valor, puntaje: nuevoPuntaje(g.puntaje, g.miVoto, valor) });
    try {
      cambiar(await votarEn(`/hilos/${g.id}/voto`, token, valor));
    } catch {
      cambiar(g);
    }
  };

  const lista = guias?.filter((g) => !tema || g.tema === tema) ?? [];

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + BottomTabInset + 24 }}>
        <View style={styles.centro}>
          <View style={styles.cabeza}>
            <Texto v="tituloGrande">{tr('hilos.titulo', { ciudad: ciudad.nombre })}</Texto>
            <Texto v="detalle" secundario style={{ marginTop: 4, lineHeight: 20 }}>{tr('hilos.subtitulo')}</Texto>
          </View>
          {temas.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.temas}>
              <Pildora texto={tr('hilos.todo')} elegida={tema === null} onPress={() => setTema(null)} />
              {temas.map((x) => (
                <Pildora key={x} texto={tr(`hilos.temas.${x}`)} elegida={tema === x} onPress={() => setTema(tema === x ? null : x)} />
              ))}
            </ScrollView>
          ) : null}

          {guias === null ? (
            error ? (
              <View style={styles.vacio}>
                <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('comun.noSePudo')}</Texto>
                <BotonPrincipal texto={tr('comun.reintentar')} onPress={cargar} />
              </View>
            ) : <ActivityIndicator style={{ marginTop: 40 }} />
          ) : lista.length === 0 ? (
            <View style={styles.vacio}>
              <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('hilos.vacio')}</Texto>
              <BotonPrincipal texto={tr('hilos.verAgenda')} onPress={() => router.navigate('/')} />
            </View>
          ) : (
            <View style={[styles.lista, { borderTopColor: t.separator }]}>
              {lista.map((g) => (
                <FilaGuia
                  key={g.id}
                  g={g}
                  onVotar={(v) => votar(g, v)}
                  onAbrir={() => router.push({ pathname: '/[ciudad]/hilos/[slug]', params: { ciudad: ciudad.id, slug: g.slug } })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  centro: { width: '100%', maxWidth: ANCHO_MAX, alignSelf: 'center' },
  cabeza: { paddingHorizontal: 20 },
  temas: { paddingHorizontal: 20, gap: 8, paddingTop: 16, paddingBottom: 4 },
  lista: { marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  fila: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  pie: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  vacio: { alignItems: 'center', gap: 14, paddingHorizontal: 32, paddingTop: 48 },
});
