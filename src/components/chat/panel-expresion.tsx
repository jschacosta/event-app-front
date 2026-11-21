// Panel de emojis, stickers y GIFs que ocupa el lugar del teclado, como en Telegram.
// Stickers: todos los paquetes en un solo desplazamiento, con su título; los íconos de arriba saltan
// a cada paquete y se marcan solos al desplazarse. Solo se animan los que están a la vista.
// Mantener presionado un sticker lo muestra grande; tocarlo lo envía.
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { PestanaGifs, useGifsDisponibles } from '@/components/chat/gifs';
import { StickerAnimado, cargarAnimacion } from '@/components/chat/sticker-animado';
import { GRUPOS } from '@/components/emojis';
import { Icono } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Gif } from '@/lib/api';
import { PAQUETES, codigoAnimado, leerRecientes, sumarReciente } from '@/lib/stickers';

export type ModoPanel = 'emojis' | 'stickers' | 'gifs';

// Espacio libre al final de cada lista para que la pastilla flotante no tape la última fila.
const ESPACIO_PIE = 58;

const vibrar = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

type FilaStickers =
  | { tipo: 'titulo'; clave: string; seccion: string; texto: string }
  | { tipo: 'fila'; clave: string; seccion: string; emojis: string[] };

// Celda de sticker: animada (se reproduce una vez al aparecer); el toque y el mantener los maneja el panel.
const CeldaSticker = memo(function CeldaSticker({ emoji, tamano, onElegir, onVer, onSoltar, deshabilitado }: {
  emoji: string; tamano: number; onElegir: (e: string) => void; onVer: (e: string) => void; onSoltar: (e: string) => void; deshabilitado: boolean;
}) {
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={() => onElegir(emoji)}
      onLongPress={() => { vibrar(); onVer(emoji); }}
      onPressOut={() => onSoltar(emoji)}
      delayLongPress={250}
      disabled={deshabilitado}
      accessibilityLabel={tr('expresion.enviarSticker', { emoji })}
      style={({ pressed }) => [{ width: tamano, height: tamano }, styles.celda, pressed && { transform: [{ scale: 0.88 }] }, deshabilitado && { opacity: 0.4 }]}>
      <StickerAnimado emoji={emoji} tamano={tamano * 0.82} tocarParaRepetir={false} />
    </Pressable>
  );
});

export const PanelExpresion = memo(function PanelExpresion({ alto, modo, onModo, onEmoji, onSticker, onGif, onBorrar, puedeSticker }: {
  alto: number;
  modo: ModoPanel;
  onModo: (m: ModoPanel) => void;
  onEmoji: (e: string) => void;
  onSticker: (emoji: string, codigo: string) => void;
  onGif: (g: Gif) => void;
  onBorrar: () => void;
  puedeSticker: boolean; // al editar un mensaje no se mandan stickers ni GIFs
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { width } = useWindowDimensions();
  const ancho = Math.min(width, 600);
  const [recientesEmojis, setRecientesEmojis] = useState<string[]>([]);
  const [recientesStickers, setRecientesStickers] = useState<string[]>([]);
  const [grupo, setGrupo] = useState<number | 'recientes'>(0);
  const [seccion, setSeccion] = useState<string>('');
  const [vista, setVista] = useState<string | null>(null); // sticker mostrado en grande
  const listaStickers = useRef<FlatList<FilaStickers>>(null);
  const hayGifs = useGifsDisponibles();
  // Si se pidió la pestaña de GIFs y no hay, se muestran los stickers.
  useEffect(() => { if (modo === 'gifs' && !hayGifs) onModo('stickers'); }, [modo, hayGifs, onModo]);

  useEffect(() => {
    leerRecientes('emojis').then((r) => { setRecientesEmojis(r); if (r.length) setGrupo('recientes'); });
    leerRecientes('stickers').then(setRecientesStickers);
  }, []);

  const columnasEmoji = Math.max(7, Math.floor((ancho - 12) / 46));
  const celdaEmoji = (ancho - 12) / columnasEmoji;
  const columnasSticker = Math.max(5, Math.floor((ancho - 12) / 76));
  const celdaSticker = (ancho - 12) / columnasSticker;

  // Todas las secciones de stickers en filas (la lista solo dibuja las que están cerca de la vista).
  const secciones = useMemo(() => [
    ...(recientesStickers.length ? [{ id: 'recientes', icono: null as string | null, emojis: recientesStickers }] : []),
    ...PAQUETES.map((p) => ({ id: p.id, icono: p.icono as string | null, emojis: p.emojis })),
  ], [recientesStickers]);
  const filas = useMemo(() => {
    const r: FilaStickers[] = [];
    for (const s of secciones) {
      r.push({ tipo: 'titulo', clave: `t-${s.id}`, seccion: s.id, texto: tr(`expresion.paquetes.${s.id}`) });
      for (let i = 0; i < s.emojis.length; i += columnasSticker) {
        r.push({ tipo: 'fila', clave: `${s.id}-${i}`, seccion: s.id, emojis: s.emojis.slice(i, i + columnasSticker) });
      }
    }
    return r;
  }, [secciones, columnasSticker, tr]);
  const seccionActiva = seccion || secciones[0]?.id;

  // Las animaciones del primer paquete se piden apenas se abre la pestaña.
  useEffect(() => {
    if (modo !== 'stickers') return;
    secciones[0]?.emojis.slice(0, 15).forEach((e) => { const c = codigoAnimado(e); if (c) cargarAnimacion(c); });
  }, [modo, secciones]);

  const alVer = useRef(({ viewableItems }: { viewableItems: { item: FilaStickers; isViewable: boolean }[] }) => {
    const primera = viewableItems.find((v) => v.isViewable)?.item;
    if (primera) setSeccion(primera.seccion);
  }).current;
  const irASeccion = (id: string) => {
    const indice = filas.findIndex((f) => f.tipo === 'titulo' && f.seccion === id);
    if (indice >= 0) listaStickers.current?.scrollToIndex({ index: indice, animated: true });
    setSeccion(id);
  };

  const listaEmojis = grupo === 'recientes' ? recientesEmojis : GRUPOS[grupo].emojis;
  const elegirEmoji = (e: string) => {
    onEmoji(e);
    setRecientesEmojis(sumarReciente('emojis', e));
  };
  const elegirSticker = (e: string) => {
    const codigo = codigoAnimado(e);
    if (!codigo || !puedeSticker) return;
    vibrar();
    setVista(null);
    onSticker(e, codigo);
    setRecientesStickers(sumarReciente('stickers', e));
  };
  const soltar = (e: string) => setVista((v) => (v === e ? null : v));

  const pestanasEmoji = [...(recientesEmojis.length ? [{ clave: 'recientes' as const, icono: null }] : []), ...GRUPOS.map((g, i) => ({ clave: i, icono: g.icono }))];
  const ALTO_FILA = celdaSticker;
  const ALTO_TITULO = 30;

  return (
    <View style={[styles.panel, { height: alto, backgroundColor: t.bar, borderTopColor: t.separator }]}>
      {modo === 'emojis' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filaPestanas} contentContainerStyle={styles.pestanas} keyboardShouldPersistTaps="always">
            {pestanasEmoji.map((p) => (
              <Pressable
                key={String(p.clave)}
                onPress={() => setGrupo(p.clave)}
                accessibilityRole="tab"
                accessibilityState={{ selected: grupo === p.clave }}
                accessibilityLabel={p.clave === 'recientes' ? tr('expresion.recientes') : p.icono ?? ''}
                style={[styles.pestana, grupo === p.clave && { backgroundColor: t.backgroundSelected }]}>
                {p.icono ? <Text style={styles.iconoPestana}>{p.icono}</Text> : <Icono nombre="clock" tamano={18} color={t.textSecondary} />}
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView key={`e-${String(grupo)}`} style={styles.contenido} contentContainerStyle={[styles.grilla, { paddingBottom: ESPACIO_PIE }]} keyboardShouldPersistTaps="always">
            {listaEmojis.map((e) => (
              <Pressable
                key={e}
                onPress={() => elegirEmoji(e)}
                accessibilityLabel={e}
                style={({ pressed }) => [{ width: celdaEmoji, height: 46 }, styles.celda, pressed && { backgroundColor: t.backgroundSelected }]}>
                <Text style={styles.emoji} allowFontScaling={false}>{e}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : modo === 'stickers' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filaPestanas} contentContainerStyle={styles.pestanas} keyboardShouldPersistTaps="always">
            {secciones.map((s) => {
              const elegida = seccionActiva === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => irASeccion(s.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: elegida }}
                  accessibilityLabel={tr(`expresion.paquetes.${s.id}`)}
                  style={[styles.pestanaSticker, elegida && { backgroundColor: t.backgroundSelected }]}>
                  {s.icono ? <StickerAnimado emoji={s.icono} tamano={26} tocarParaRepetir={false} /> : <Icono nombre="clock" tamano={19} color={t.textSecondary} />}
                </Pressable>
              );
            })}
          </ScrollView>
          <FlatList
            ref={listaStickers}
            data={filas}
            keyExtractor={(f) => f.clave}
            style={styles.contenido}
            keyboardShouldPersistTaps="always"
            onViewableItemsChanged={alVer}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            initialNumToRender={8}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews={Platform.OS === 'android'}
            getItemLayout={(_, index) => {
              let offset = 0;
              for (let i = 0; i < index; i++) offset += filas[i].tipo === 'titulo' ? ALTO_TITULO : ALTO_FILA;
              return { length: filas[index].tipo === 'titulo' ? ALTO_TITULO : ALTO_FILA, offset, index };
            }}
            contentContainerStyle={{ paddingHorizontal: 6, paddingBottom: ESPACIO_PIE }}
            renderItem={({ item }) => item.tipo === 'titulo' ? (
              <Text style={[styles.tituloPaquete, { color: t.textSecondary, height: ALTO_TITULO }]}>{item.texto}</Text>
            ) : (
              <View style={[styles.filaStickers, { height: ALTO_FILA }]}>
                {item.emojis.map((e) => (
                  <CeldaSticker key={e} emoji={e} tamano={celdaSticker} onElegir={elegirSticker} onVer={setVista} onSoltar={soltar} deshabilitado={!puedeSticker} />
                ))}
              </View>
            )}
          />
        </>
      ) : (
        <PestanaGifs ancho={ancho} abajo={ESPACIO_PIE} onElegir={(g) => { if (puedeSticker) onGif(g); }} />
      )}

      {/* Como Telegram: las pestañas flotan sobre el contenido, abajo al centro. */}
      <View style={styles.pie} pointerEvents="box-none">
        <View style={[styles.segmento, { backgroundColor: t.card, borderColor: t.separator }]}>
          {(['emojis', ...(hayGifs ? ['gifs' as const] : []), 'stickers'] as ModoPanel[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => onModo(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: modo === m }}
              style={[styles.opcionSegmento, modo === m && { backgroundColor: t.backgroundSelected }]}>
              <Text style={[styles.textoSegmento, { color: modo === m ? t.text : t.textSecondary }]}>{tr(`expresion.${m}`)}</Text>
            </Pressable>
          ))}
        </View>
        {modo === 'emojis' ? (
          <Pressable onPress={onBorrar} onLongPress={onBorrar} hitSlop={8} accessibilityLabel={tr('expresion.borrar')} style={({ pressed }) => [styles.borrar, { backgroundColor: t.card, borderColor: t.separator }, pressed && { opacity: 0.5 }]}>
            <Icono nombre="delete.left" tamano={22} color={t.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      {vista ? (
        <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)} pointerEvents="none" style={[StyleSheet.absoluteFill, styles.velo]}>
          <Animated.View entering={ZoomIn.springify().damping(16)}>
            <StickerAnimado emoji={vista} tamano={Math.min(220, alto - 40)} repetir />
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  panel: { borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  filaPestanas: { flexGrow: 0, flexShrink: 0 },
  pestanas: { paddingHorizontal: 8, paddingVertical: 6, gap: 4 },
  contenido: { flex: 1 },
  pestana: { width: 38, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  pestanaSticker: { width: 40, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  iconoPestana: { fontSize: 19 },
  grilla: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 6, paddingBottom: 8 },
  celda: { alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  emoji: { fontSize: 30 },
  tituloPaquete: { fontSize: 13, fontWeight: '700', paddingHorizontal: 6, paddingTop: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  filaStickers: { flexDirection: 'row' },
  pie: { position: 'absolute', left: 0, right: 0, bottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  segmento: {
    flexDirection: 'row', borderRadius: 20, padding: 3, borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  opcionSegmento: { paddingHorizontal: 18, height: 32, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  textoSegmento: { fontSize: 14, fontWeight: '600' },
  borrar: {
    position: 'absolute', right: 12, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  velo: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
});
