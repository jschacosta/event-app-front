// GIFs de KLIPY: tendencias, categorías rápidas y buscador (a pantalla completa, como en Telegram,
// así el teclado no tapa los resultados). La búsqueda pasa por nuestro servidor.
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonTexto, Icono, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Gif } from '@/lib/api';

type Pagina = { gifs: (Gif & { id: string })[]; siguiente: number | null };

// Si el servidor no tiene clave de KLIPY, la pestaña de GIFs no aparece (se recuerda en la sesión).
let disponibles: boolean | null = null;
export const gifsDisponibles = () => disponibles;

// Al abrir el panel se pregunta una vez si hay GIFs (de paso quedan las tendencias en la caché del
// servidor). Mientras no se sabe, la pestaña no aparece: así nunca se ve un "no disponible".
let revision: Promise<boolean> | null = null;
export function useGifsDisponibles() {
  const { token } = useSesion();
  const [hay, setHay] = useState(disponibles === true);
  useEffect(() => {
    if (!token || disponibles !== null) return;
    revision ??= api('/gifs?pagina=1', { token })
      .then(() => (disponibles = true))
      .catch((e: { codigo?: string; status?: number }) => {
        if (e.codigo === 'GIFS_NO_DISPONIBLES' && e.status === 503) disponibles = false;
        revision = null; // si fue un corte de señal, se vuelve a preguntar la próxima vez
        return false;
      });
    let vivo = true;
    revision.then((r) => { if (vivo) setHay(r); });
    return () => { vivo = false; };
  }, [token]);
  return hay;
}

export function useGifs(consulta: string) {
  const { token } = useSesion();
  const [gifs, setGifs] = useState<(Gif & { id: string })[]>([]);
  const [siguiente, setSiguiente] = useState<number | null>(1);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(false);
  const pidiendo = useRef(false);
  const actual = useRef(consulta);

  const pedir = useCallback(async (q: string, pagina: number) => {
    if (!token || pidiendo.current) return;
    pidiendo.current = true;
    setCargando(true);
    try {
      const r = await api<Pagina>(`/gifs?pagina=${pagina}${q ? `&q=${encodeURIComponent(q)}` : ''}`, { token });
      disponibles = true;
      if (actual.current !== q) return;
      setGifs((antes) => {
        const vistos = new Set(antes.map((g) => g.id));
        return pagina === 1 ? r.gifs : [...antes, ...r.gifs.filter((g) => !vistos.has(g.id))];
      });
      setSiguiente(r.siguiente);
      setError(false);
    } catch (e) {
      if ((e as { codigo?: string }).codigo === 'GIFS_NO_DISPONIBLES' && (e as { status?: number }).status === 503) disponibles = false;
      setError(true);
    } finally {
      pidiendo.current = false;
      setCargando(false);
    }
  }, [token]);

  // Espera un momento mientras se escribe (no busca con cada letra).
  useEffect(() => {
    actual.current = consulta;
    const t = setTimeout(() => {
      setGifs([]);
      setSiguiente(1);
      pedir(consulta, 1);
    }, consulta ? 350 : 0);
    return () => clearTimeout(t);
  }, [consulta, pedir]);

  const mas = useCallback(() => { if (siguiente && !cargando) pedir(actual.current, siguiente); }, [siguiente, cargando, pedir]);
  return { gifs, cargando, error, mas };
}

// Dos columnas que se van llenando por la más corta (como un muro de fotos).
export const GrillaGifs = memo(function GrillaGifs({ gifs, ancho, onElegir, onFinal, cargando, abajo = 0 }: {
  gifs: (Gif & { id: string })[]; ancho: number; onElegir: (g: Gif) => void; onFinal: () => void; cargando: boolean; abajo?: number;
}) {
  const t = useTheme();
  const col = (ancho - 18) / 2;
  const columnas: { g: Gif & { id: string }; alto: number }[][] = [[], []];
  const altos = [0, 0];
  for (const g of gifs) {
    const alto = Math.max(70, Math.min(260, (col * g.alto) / g.ancho));
    const i = altos[0] <= altos[1] ? 0 : 1;
    columnas[i].push({ g, alto });
    altos[i] += alto + 6;
  }
  const alDesplazar = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y > contentSize.height - 400) onFinal();
  };
  return (
    <ScrollView onScroll={alDesplazar} scrollEventThrottle={100} keyboardShouldPersistTaps="always" keyboardDismissMode="on-drag"
      contentContainerStyle={[styles.muro, { paddingBottom: abajo + 8 }]}>
      {columnas.map((c, i) => (
        <View key={i} style={{ width: col, gap: 6 }}>
          {c.map(({ g, alto }) => (
            <Pressable
              key={g.id}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onElegir(g);
              }}
              style={({ pressed }) => [{ width: col, height: alto, borderRadius: 10, overflow: 'hidden', backgroundColor: t.backgroundElement }, pressed && { opacity: 0.7 }]}>
              <Image source={{ uri: g.preview }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} cachePolicy="memory-disk" recyclingKey={g.id} />
            </Pressable>
          ))}
        </View>
      ))}
      {cargando ? <ActivityIndicator style={styles.cargando} /> : null}
    </ScrollView>
  );
});

// Pestaña de GIFs dentro del panel: botón de buscar, categorías rápidas y el muro.
export function PestanaGifs({ ancho, onElegir }: { ancho: number; onElegir: (g: Gif) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const categorias = tr('expresion.categoriasGif', { returnObjects: true }) as string[];
  const [categoria, setCategoria] = useState('');
  const [buscando, setBuscando] = useState(false);
  const { gifs, cargando, error, mas } = useGifs(categoria);
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.cabeza}>
        <Pressable onPress={() => setBuscando(true)} style={[styles.buscar, { backgroundColor: t.backgroundElement }]} accessibilityRole="search">
          <Icono nombre="magnifyingglass" tamano={15} color={t.textSecondary} />
          <Text style={[styles.buscarTexto, { color: t.textSecondary }]}>{tr('expresion.buscarGif')}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="always">
        {['', ...categorias].map((c) => (
          <Pressable
            key={c || 'tendencias'}
            onPress={() => setCategoria(c)}
            style={[styles.chip, { backgroundColor: categoria === c ? t.accent : t.backgroundElement }]}>
            <Text style={[styles.chipTexto, { color: categoria === c ? t.onAccent : t.text }]}>{c || tr('expresion.tendencias')}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {error && !gifs.length ? (
        <Text style={[styles.vacio, { color: t.textSecondary }]}>{tr(gifsDisponibles() === false ? 'expresion.gifsNoActivos' : 'expresion.gifsError')}</Text>
      ) : (
        <GrillaGifs gifs={gifs} ancho={ancho} onElegir={onElegir} onFinal={mas} cargando={cargando} />
      )}
      <BuscadorGifs visible={buscando} onCerrar={() => setBuscando(false)} onElegir={(g) => { setBuscando(false); onElegir(g); }} />
    </View>
  );
}

// Buscador a pantalla completa (el teclado abajo y los resultados arriba).
function BuscadorGifs({ visible, onCerrar, onElegir }: { visible: boolean; onCerrar: () => void; onElegir: (g: Gif) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [ancho, setAncho] = useState(360);
  const { gifs, cargando, mas } = useGifs(visible ? q.trim() : '');
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCerrar} presentationStyle="fullScreen" statusBarTranslucent>
      <View style={[styles.pantalla, { backgroundColor: t.background, paddingTop: insets.top + 6 }]} onLayout={(e) => setAncho(Math.min(e.nativeEvent.layout.width, 600))}>
        <View style={styles.filaBuscador}>
          <View style={[styles.campo, { backgroundColor: t.backgroundElement }]}>
            <Icono nombre="magnifyingglass" tamano={16} color={t.textSecondary} />
            <TextInput
              value={q}
              onChangeText={setQ}
              autoFocus
              placeholder={tr('expresion.buscarGif')}
              placeholderTextColor={t.textSecondary}
              returnKeyType="search"
              style={[styles.input, { color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
            />
            {q ? (
              <Pressable onPress={() => setQ('')} hitSlop={8}>
                <Icono nombre="xmark.circle.fill" tamano={17} color={t.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <BotonTexto texto={tr('comun.cancelar')} onPress={onCerrar} />
        </View>
        <Animated.View entering={FadeIn.duration(200)} style={{ flex: 1 }}>
          <GrillaGifs gifs={gifs} ancho={ancho} onElegir={onElegir} onFinal={mas} cargando={cargando} abajo={insets.bottom} />
        </Animated.View>
        <Text style={[styles.marca, { color: t.textSecondary, paddingBottom: insets.bottom + 4 }]}>{tr('expresion.conKlipy')}</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  muro: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 4 },
  cargando: { position: 'absolute', bottom: 8, alignSelf: 'center', left: 0, right: 0 },
  cabeza: { paddingHorizontal: 8, paddingTop: 6 },
  buscar: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, borderRadius: 10, paddingHorizontal: 10 },
  buscarTexto: { fontSize: 15, fontFamily: fuenteWeb },
  chips: { gap: 6, paddingHorizontal: 8, paddingVertical: 8 },
  chip: { height: 28, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipTexto: { fontSize: 13, fontWeight: '600', fontFamily: fuenteWeb },
  vacio: { padding: 24, fontSize: 14, textAlign: 'center' },
  pantalla: { flex: 1 },
  filaBuscador: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingBottom: 8 },
  campo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, borderRadius: 11, paddingHorizontal: 10 },
  input: { flex: 1, fontSize: 16, paddingVertical: 0 },
  marca: { fontSize: 11, textAlign: 'center', paddingTop: 4 },
});
