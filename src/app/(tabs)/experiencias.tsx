// Experiencias: los paseos de Rio Diferente (operador local) para el día después de la fiesta.
// El catálogo viene del servidor (/api/experiencias, que lo lee de Rio Diferente en el idioma de la
// persona); cada fila abre la página de ese servicio para reservar. Es publicidad, así que va discreta:
// una foto destacada, filas como las de la agenda y la firma de Rio Diferente al final.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono, Pildora, Texto } from '@/components/ui';
import { BottomTabInset, FuenteTitulo, MaxContentWidth } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';
import { useCiudad } from '@/lib/ciudades';

type Experiencia = {
  id: string; nombre: string; resumen?: string; categoria: string; foto?: string; miniatura?: string;
  precio?: number; porPersona: boolean; duracion?: number; barrio?: string; destacada: boolean; url: string;
};
type Catalogo = { experiencias: Experiencia[]; categorias: { id: string; nombre: string }[]; sitio: string };

// Se guarda por idioma mientras la app está abierta: cambiar de pestaña no vuelve a pedirlo.
const guardado: Record<string, Catalogo> = {};
// La foto grande: el atardecer en el Pan de Azúcar es lo más cercano a la noche; si no está, la primera destacada.
const CATEGORIA_NOCHE = 'nightlife-events';

// Miles con el separador de cada idioma, sin crear Intl (ver feedback de rendimiento).
const SEP: Record<string, string> = { en: ',', fr: ' ' };
const miles = (n: number, idioma: string) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, SEP[idioma] ?? '.');
const duracion = (min?: number) => {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? (m ? `${h} h ${m}` : `${h} h`) : `${m} min`;
};

export default function ExperienciasScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr, i18n } = useTranslation();
  const idioma = i18n.language;
  const ciudad = useCiudad();
  const [, setCargado] = useState(0);
  const [errorEn, setErrorEn] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const catalogo = guardado[idioma] ?? null;
  const error = errorEn === idioma;

  useEffect(() => {
    if (guardado[idioma]) return;
    api<Catalogo>(`/experiencias?idioma=${idioma}`)
      .then((c) => { guardado[idioma] = c; setCargado((n) => n + 1); })
      .catch(() => setErrorEn(idioma));
  }, [idioma]);

  const { destacada, resto } = useMemo(() => {
    const todas = catalogo?.experiencias ?? [];
    const lista = categoria ? todas.filter((e) => e.categoria === categoria) : todas;
    const d = (!categoria && lista.find((e) => e.categoria === CATEGORIA_NOCHE && e.foto)) || lista.find((e) => e.destacada && e.foto) || lista.find((e) => e.foto);
    return { destacada: d, resto: lista.filter((e) => e !== d) };
  }, [catalogo, categoria]);

  const nombreCategoria = (id: string) => catalogo?.categorias.find((c) => c.id === id)?.nombre ?? '';
  const precio = (e: Experiencia) => (e.precio ? tr('experiencias.desde', { precio: `R$ ${miles(e.precio, idioma)}` }) : null);
  const datos = (e: Experiencia) => [duracion(e.duracion), precio(e)].filter(Boolean).join('   ');
  const abrir = (url: string) => WebBrowser.openBrowserAsync(url);

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + BottomTabInset + 32 }}>
        <View style={styles.margen}>
          <Texto v="tituloGrande">{tr('experiencias.titulo')}</Texto>
          <Texto v="detalle" secundario style={{ marginTop: 4 }}>{tr('experiencias.subtitulo')}</Texto>
          {ciudad.id !== 'rio' ? (
            <View style={[styles.aviso, { borderLeftColor: t.accent, backgroundColor: t.accentSoft }]}>
              <Texto v="cuerpoFuerte" style={{ color: t.accentSoftText }}>{tr('experiencias.soloRio.titulo')}</Texto>
              <Texto v="pie" style={{ color: t.accentSoftText, opacity: 0.85 }}>{tr('experiencias.soloRio.texto', { ciudad: ciudad.corto ?? ciudad.nombre })}</Texto>
            </View>
          ) : null}
        </View>

        {!catalogo ? (
          <View style={styles.cargando}>
            {error ? <Texto secundario style={{ textAlign: 'center' }}>{tr('experiencias.error')}</Texto> : <ActivityIndicator />}
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pildoras}>
              <Pildora texto={tr('experiencias.todas')} activa={!categoria} onPress={() => setCategoria(null)} />
              {catalogo.categorias.map((c) => (
                <Pildora key={c.id} texto={c.nombre} activa={categoria === c.id} onPress={() => setCategoria(c.id)} />
              ))}
            </ScrollView>

            <View style={[styles.margen, { gap: 4 }]}>
              {destacada ? (
                <Pressable onPress={() => abrir(destacada.url)} accessibilityRole="link" style={({ pressed }) => [styles.portada, pressed && { opacity: 0.92 }]}>
                  <Image source={{ uri: destacada.foto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
                  <LinearGradient colors={['rgba(18,10,23,0)', 'rgba(18,10,23,0.82)']} style={styles.velo} />
                  <View style={styles.portadaTexto}>
                    <Texto v="mini" style={styles.portadaCategoria}>{nombreCategoria(destacada.categoria)}</Texto>
                    <Texto style={styles.portadaNombre} numberOfLines={2}>{destacada.nombre}</Texto>
                    <View style={styles.portadaPie}>
                      <Texto v="pie" style={{ color: '#FFFFFF', opacity: 0.9, flex: 1 }}>{datos(destacada)}</Texto>
                      <View style={styles.portadaFlecha}>
                        <Icono nombre="chevron.right" tamano={11} color="#FFFFFF" peso="bold" />
                      </View>
                    </View>
                  </View>
                </Pressable>
              ) : null}

              <View style={{ marginTop: 8 }}>
                {resto.map((e) => (
                  <Pressable
                    key={e.id}
                    onPress={() => abrir(e.url)}
                    accessibilityRole="link"
                    style={({ pressed }) => [styles.fila, { borderBottomColor: t.separator }, pressed && { opacity: 0.6 }]}>
                    <View style={[styles.miniatura, { backgroundColor: t.backgroundElement }]}>
                      {e.miniatura || e.foto ? <Image source={{ uri: e.miniatura ?? e.foto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto v="mini" numberOfLines={1} style={{ color: t.accentText, fontWeight: '700' }}>{nombreCategoria(e.categoria)}</Texto>
                      <Texto v="cuerpoFuerte" numberOfLines={2} style={{ lineHeight: 20 }}>{e.nombre}</Texto>
                      <Texto v="pie" secundario numberOfLines={1}>{datos(e)}</Texto>
                    </View>
                    <Icono nombre="chevron.right" tamano={12} color={t.chevron} peso="bold" />
                  </Pressable>
                ))}
              </View>

              <View style={[styles.firma, { borderTopColor: t.separator }]}>
                <View style={[styles.sello, { borderColor: t.outline }]}>
                  <Texto style={[styles.selloTexto, { color: t.textSecondary }]}>RD</Texto>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto v="pie" secundario>{tr('experiencias.firma')}</Texto>
                  <Pressable onPress={() => abrir(catalogo.sitio)} accessibilityRole="link" hitSlop={6}>
                    {({ pressed }) => <Texto v="pie" style={{ color: t.accentText, fontWeight: '600', opacity: pressed ? 0.6 : 1 }}>{tr('experiencias.verTodo')}</Texto>}
                  </Pressable>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  margen: { paddingHorizontal: 20 },
  aviso: { marginTop: 14, paddingVertical: 10, paddingHorizontal: 12, borderLeftWidth: 3, borderRadius: 3, gap: 2 },
  cargando: { paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center' },
  pildoras: { gap: 8, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14 },
  portada: { height: 260, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  portadaTexto: { padding: 16, gap: 4 },
  portadaCategoria: { color: '#FFFFFF', opacity: 0.8, fontWeight: '700' },
  portadaNombre: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 30, lineHeight: 31, paddingRight: 3 },
  portadaPie: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  portadaFlecha: { width: 26, height: 26, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  miniatura: { width: 64, height: 64, borderRadius: 3, overflow: 'hidden' },
  firma: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth },
  sello: { width: 34, height: 34, borderRadius: 3, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selloTexto: { fontFamily: FuenteTitulo.extra, fontSize: 15, letterSpacing: 0.5 },
});
