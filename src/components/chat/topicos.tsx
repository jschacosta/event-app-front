// Tópicos de una sala, como los temas de un grupo de Telegram: la lista (con último mensaje y
// no leídos), el ícono de cada tópico y la hoja para crearlo o editarlo.
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, LinearTransition, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonTexto, Icono, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Topico, type TopicoResumen } from '@/lib/api';
import { etiquetaDiaChat, horaDispositivo } from '@/lib/fechas';
import { vistaPrevia } from '@/lib/sistema';

// Mismos 7 colores que guarda el servidor (por número), como los íconos de los temas de Telegram.
export const COLORES_TOPICO = ['#2F8CFF', '#A35BFF', '#FF5A8A', '#FF8A00', '#2FBF71', '#00B5C8', '#E5484D'];
const SUGERIDOS = ['🚕', '🍻', '🎉', '📸', '🏖️', '🎶', '🍕', '🛍️', '💃', '🏨', '🎟️', '⚽', '🌊', '🗺️', '💬', '❓', '🆘', '🔥', '❤️', '🌅'];

function colorDeNombre(nombre: string) {
  let h = 0;
  for (const letra of nombre) h = (h * 31 + letra.charCodeAt(0)) >>> 0;
  return h % COLORES_TOPICO.length;
}

function cuando(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? horaDispositivo(iso) : etiquetaDiaChat(iso);
}

// Círculo del tópico: su emoji sobre un tono de su color, o "#" para el General.
export function IconoTopico({ topico, tamano = 44 }: { topico: Pick<Topico, 'id' | 'icono' | 'color' | 'nombre'>; tamano?: number }) {
  const t = useTheme();
  const color = COLORES_TOPICO[topico.color] ?? COLORES_TOPICO[0];
  if (topico.id === 'general') {
    return (
      <View style={[styles.icono, { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: t.backgroundSelected }]}>
        <Text style={{ fontSize: tamano * 0.46, fontWeight: '700', color: t.textSecondary }}>#</Text>
      </View>
    );
  }
  return (
    <View style={[styles.icono, { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: `${color}26` }]}>
      {topico.icono
        ? <Text style={{ fontSize: tamano * 0.5 }} allowFontScaling={false}>{topico.icono}</Text>
        : <Text style={{ fontSize: tamano * 0.42, fontWeight: '700', color }}>{(topico.nombre ?? '#').charAt(0).toUpperCase()}</Text>}
    </View>
  );
}

const FilaTopico = memo(function FilaTopico({ x, onAbrir, onOpciones }: {
  x: TopicoResumen; onAbrir: (x: TopicoResumen) => void; onOpciones: (x: TopicoResumen) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const nombre = x.id === 'general' ? tr('topicos.general') : x.nombre ?? '';
  const ultimo = x.ultimo ? vistaPrevia(x.ultimo, tr) : tr('topicos.sinMensajes');
  const nuevos = x.noLeidos > 0;
  return (
    <Pressable
      onPress={() => onAbrir(x)}
      onLongPress={() => onOpciones(x)}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`${nombre}${nuevos ? `, ${tr('chat.nuevos', { count: x.noLeidos })}` : ''}`}
      style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundSelected }]}>
      <IconoTopico topico={x} />
      <View style={[styles.cuerpoFila, { borderBottomColor: t.separator }]}>
        <View style={styles.lineaFila}>
          <View style={styles.nombreFila}>
            <Text style={[styles.nombre, { color: t.text }]} numberOfLines={1}>{nombre}</Text>
            {x.cerrado ? <Icono nombre="lock.fill" tamano={12} color={t.textSecondary} /> : null}
          </View>
          {x.ultimo ? <Text style={[styles.hora, { color: nuevos ? t.text : t.textSecondary }]}>{cuando(x.ultimo.fecha)}</Text> : null}
        </View>
        <View style={styles.lineaFila}>
          <Text style={[styles.ultimo, { color: t.textSecondary }]} numberOfLines={2}>{ultimo}</Text>
          {nuevos ? (
            <Animated.View entering={FadeIn.duration(150)} style={[styles.globo, { backgroundColor: t.accent }]}>
              <Text style={[styles.globoTexto, { color: t.onAccent }]}>{x.noLeidos > 99 ? '99+' : x.noLeidos}</Text>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

export function ListaTopicos({ topicos, puedeCrear, onAbrir, onOpciones, onNuevo, onRecargar, cabecera }: {
  topicos: TopicoResumen[];
  puedeCrear: boolean;
  onAbrir: (x: TopicoResumen) => void;
  onOpciones: (x: TopicoResumen) => void;
  onNuevo: () => void;
  onRecargar: () => Promise<void>;
  cabecera?: React.ReactElement;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [recargando, setRecargando] = useState(false);
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={topicos}
        keyExtractor={(x) => x.id}
        renderItem={({ item }) => <FilaTopico x={item} onAbrir={onAbrir} onOpciones={onOpciones} />}
        ListHeaderComponent={cabecera}
        contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
        refreshControl={<RefreshControl refreshing={recargando} onRefresh={async () => { setRecargando(true); await onRecargar(); setRecargando(false); }} />}
        initialNumToRender={14}
      />
      {puedeCrear ? (
        <Animated.View entering={FadeInDown.duration(320).easing(Easing.out(Easing.cubic))} style={[styles.flotante, { bottom: insets.bottom + 18 }]}>
          <Pressable
            onPress={onNuevo}
            accessibilityRole="button"
            style={({ pressed }) => [styles.botonNuevo, { backgroundColor: t.accent }, pressed && { transform: [{ scale: 0.96 }] }]}>
            <Icono nombre="plus" tamano={16} color={t.onAccent} peso="bold" />
            <Text style={[styles.botonNuevoTexto, { color: t.onAccent }]}>{tr('topicos.nuevo')}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

// Crear un tópico o editar uno (nombre, emoji y color). Devuelve el tópico creado o editado.
export function HojaTopico({ visible, eventoId, sala, editar, onListo, onCerrar }: {
  visible: boolean; eventoId: string; sala: string;
  editar?: Topico | null;
  onListo: (t: Topico) => void;
  onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { token } = useSesion();
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState<string | null>(null);
  // null = automático: sale del nombre, así cada tópico tiene su color sin elegirlo.
  const [colorElegido, setColor] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir la hoja se cargan los datos del tópico (o se parte de cero para uno nuevo).
  const claveApertura = visible ? editar?.id ?? 'nuevo' : null;
  const [abiertaPara, setAbiertaPara] = useState<string | null>(null);
  if (claveApertura !== abiertaPara) {
    setAbiertaPara(claveApertura);
    if (claveApertura) {
      setNombre(editar?.nombre ?? '');
      setIcono(editar ? editar.icono : SUGERIDOS[0]);
      setColor(editar?.color ?? null);
      setError(null);
    }
  }

  const limpio = nombre.trim();
  const color = colorElegido ?? colorDeNombre(limpio);
  const valido = limpio.length >= 2;
  const guardar = async () => {
    if (!valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = editar
        ? await api<{ topico: Topico }>(`/topicos/t/${editar.id}`, { metodo: 'PATCH', token, body: { nombre: limpio, icono, color } })
        : await api<{ topico: Topico }>(`/topicos/${eventoId}`, { metodo: 'POST', token, body: { sala, nombre: limpio, icono, color } });
      onListo(r.topico);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible && (
        <KeyboardAvoidingView style={styles.contenedor} behavior="padding">
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
            exiting={SlideOutDown.duration(180)}
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={[styles.asa, { backgroundColor: t.separator }]} />
            <View style={styles.cabeza}>
              <BotonTexto texto={tr('comun.cancelar')} onPress={onCerrar} />
              <Texto v="cuerpoFuerte">{tr(editar ? 'topicos.editar' : 'topicos.nuevo')}</Texto>
              <View style={{ width: 70 }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14, paddingBottom: 12 }}>
              <View style={styles.vistaPrevia}>
                <Animated.View key={`${icono}-${color}`} entering={FadeIn.duration(150)}>
                  <IconoTopico topico={{ id: 'nuevo', icono, color, nombre: limpio || '#' }} tamano={72} />
                </Animated.View>
              </View>
              <TextInput
                value={nombre}
                onChangeText={setNombre}
                placeholder={tr('topicos.nombreEjemplo')}
                placeholderTextColor={t.textSecondary}
                maxLength={40}
                autoFocus={!editar}
                returnKeyType="done"
                onSubmitEditing={guardar}
                style={[styles.campo, { backgroundColor: t.background, color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
              />
              <Texto v="pie" secundario style={styles.rotulo}>{tr('topicos.color')}</Texto>
              <View style={styles.colores}>
                {COLORES_TOPICO.map((c, i) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(i)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: color === i }}
                    accessibilityLabel={`${tr('topicos.color')} ${i + 1}`}
                    style={[styles.puntoColor, { backgroundColor: c }, color === i && { borderColor: t.text }]}
                  />
                ))}
              </View>
              <Texto v="pie" secundario style={styles.rotulo}>{tr('topicos.icono')}</Texto>
              <View style={styles.iconos}>
                <Pressable
                  onPress={() => setIcono(null)}
                  accessibilityLabel={tr('topicos.sinIcono')}
                  style={[styles.opcionIcono, icono === null && { backgroundColor: t.backgroundSelected }]}>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: COLORES_TOPICO[color] }}>{(limpio || 'A').charAt(0).toUpperCase()}</Text>
                </Pressable>
                {SUGERIDOS.map((e) => (
                  <Pressable key={e} onPress={() => setIcono(e)} accessibilityLabel={e} style={[styles.opcionIcono, icono === e && { backgroundColor: t.backgroundSelected }]}>
                    <Text style={{ fontSize: 24 }} allowFontScaling={false}>{e}</Text>
                  </Pressable>
                ))}
              </View>
              {error ? <Texto v="detalle" style={{ color: t.danger }}>{error}</Texto> : null}
            </ScrollView>
            <BotonPrincipal texto={tr(editar ? 'topicos.guardar' : 'topicos.crear')} onPress={guardar} ocupado={enviando} deshabilitado={!valido} />
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

// Aviso dentro de una sala sin tópicos: explica para qué sirven (solo la primera vez que se ofrece).
export function AvisoTopicos({ onCrear }: { onCrear: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Animated.View layout={LinearTransition} entering={FadeInDown.duration(200)} style={[styles.aviso, { backgroundColor: t.card }]}>
      <Icono nombre="text.bubble" tamano={18} color={t.text} />
      <Text style={[styles.avisoTexto, { color: t.textSecondary }]}>{tr('topicos.ayuda')}</Text>
      <Pressable onPress={onCrear} hitSlop={8} accessibilityRole="button">
        <Text style={[styles.avisoBoton, { color: t.text }]}>{tr('topicos.crear')}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  icono: { alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  cuerpoFila: { flex: 1, paddingVertical: 10, paddingRight: 14, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 68, justifyContent: 'center' },
  lineaFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nombreFila: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  nombre: { flexShrink: 1, fontSize: 16, fontWeight: '600', fontFamily: fuenteWeb },
  hora: { fontSize: 13, fontFamily: fuenteWeb },
  ultimo: { flex: 1, fontSize: 14, lineHeight: 18, fontFamily: fuenteWeb },
  globo: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  globoTexto: { fontSize: 12, fontWeight: '700' },
  flotante: { position: 'absolute', alignSelf: 'center' },
  botonNuevo: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 20, borderRadius: 22,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  botonNuevoTexto: { fontSize: 15, fontWeight: '700', fontFamily: fuenteWeb },
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: {
    width: '100%', maxWidth: 520, maxHeight: '90%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, gap: 8,
  },
  asa: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  vistaPrevia: { alignItems: 'center', paddingVertical: 4 },
  campo: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 17 },
  rotulo: { textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: 4 },
  colores: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  puntoColor: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: 'transparent' },
  iconos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  opcionIcono: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 14 },
  avisoTexto: { flex: 1, fontSize: 13, lineHeight: 17, fontFamily: fuenteWeb },
  avisoBoton: { fontSize: 14, fontWeight: '700', fontFamily: fuenteWeb },
});
