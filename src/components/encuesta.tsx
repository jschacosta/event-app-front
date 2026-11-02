// Encuestas de los canales propios: la tarjeta para votar (dentro de la burbuja del chat)
// y la hoja para crear una. Solo el creador del canal (o el admin) puede crear encuestas.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonTexto, fuenteWeb, Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Encuesta } from '@/lib/api';

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;
const MAX_PREGUNTA = 200;
const MAX_OPCION = 60;

// ---------- Tarjeta para votar ----------
// `mia`: va en una burbuja propia (fondo de acento), así se invierten los colores.
export function TarjetaEncuesta({ pregunta, encuesta, yo, mia, onVotar }: {
  pregunta: string; encuesta: Encuesta; yo?: string; mia: boolean; onVotar: (opcion: number) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const texto = mia ? t.onAccent : t.text;
  const total = encuesta.opciones.reduce((n, o) => n + o.votos.length, 0);
  const miVoto = yo ? encuesta.opciones.findIndex((o) => o.votos.includes(yo)) : -1;

  return (
    <View style={styles.tarjeta}>
      <View style={styles.etiqueta}>
        <Icono nombre="chart.bar" tamano={12} color={texto} />
        <Text style={[styles.etiquetaTexto, { color: texto }]}>{tr('encuesta.titulo')}</Text>
      </View>
      <Text style={[styles.pregunta, { color: texto, fontFamily: fuenteWeb }]}>{pregunta}</Text>
      {encuesta.opciones.map((o, i) => {
        const elegida = i === miVoto;
        const parte = total ? o.votos.length / total : 0;
        return (
          <Pressable
            key={i}
            onPress={() => onVotar(i)}
            disabled={!yo}
            accessibilityRole="button"
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={`${o.texto}, ${tr('encuesta.votos', { count: o.votos.length })}`}
            style={({ pressed }) => [styles.opcion, pressed && { opacity: 0.6 }]}>
            <View style={styles.filaOpcion}>
              <View style={[styles.circulo, { borderColor: texto }, elegida && { backgroundColor: texto }]}>
                {elegida ? <Icono nombre="checkmark" tamano={11} color={mia ? t.accent : t.background} peso="bold" /> : null}
              </View>
              <Text style={[styles.opcionTexto, { color: texto, fontFamily: fuenteWeb }]}>{o.texto}</Text>
              <Text style={[styles.cuenta, { color: texto }]}>{o.votos.length}</Text>
            </View>
            <View style={styles.riel}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: texto, opacity: 0.18 }]} />
              <Animated.View layout={LinearTransition.duration(220)} style={[styles.relleno, { backgroundColor: texto, width: `${Math.round(parte * 100)}%` }]} />
            </View>
          </Pressable>
        );
      })}
      <Text style={[styles.total, { color: texto }]}>{tr('encuesta.votos', { count: total })}</Text>
    </View>
  );
}

// ---------- Hoja para crear una encuesta ----------
export function HojaNuevaEncuesta({ visible, onCrear, onCerrar }: {
  visible: boolean;
  onCrear: (pregunta: string, opciones: string[]) => Promise<{ error?: string }>;
  onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const limpias = opciones.map((o) => o.trim()).filter(Boolean);
  const repetidas = new Set(limpias.map((o) => o.toLowerCase())).size !== limpias.length;
  const valida = pregunta.trim().length > 0 && limpias.length >= MIN_OPCIONES && !repetidas;

  const cerrar = () => {
    setPregunta('');
    setOpciones(['', '']);
    setError(null);
    onCerrar();
  };

  const crear = async () => {
    if (!valida || enviando) return;
    setEnviando(true);
    setError(null);
    const r = await onCrear(pregunta.trim(), limpias);
    setEnviando(false);
    if (r.error) return setError(r.error);
    cerrar();
  };

  const campo = [styles.campo, { backgroundColor: t.background, color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={cerrar} statusBarTranslucent>
      {visible && (
        <KeyboardAvoidingView style={styles.contenedor} behavior="padding">
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={cerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(240)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={[styles.asa, { backgroundColor: t.separator }]} />
            <View style={styles.cabeza}>
              <BotonTexto texto={tr('comun.cancelar')} onPress={cerrar} />
              <Texto v="cuerpoFuerte">{tr('encuesta.nueva')}</Texto>
              <View style={{ width: 70 }} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
              <Texto v="pie" secundario style={styles.rotulo}>{tr('encuesta.pregunta')}</Texto>
              <TextInput
                value={pregunta}
                onChangeText={setPregunta}
                placeholder={tr('encuesta.preguntaEjemplo')}
                placeholderTextColor={t.textSecondary}
                maxLength={MAX_PREGUNTA}
                multiline
                style={[campo, { minHeight: 48 }]}
              />
              <Texto v="pie" secundario style={[styles.rotulo, { marginTop: 6 }]}>{tr('encuesta.opciones')}</Texto>
              {opciones.map((o, i) => (
                <Animated.View key={i} entering={FadeIn.duration(150)} layout={LinearTransition.duration(180)} style={styles.filaCampo}>
                  <TextInput
                    value={o}
                    onChangeText={(v) => setOpciones((prev) => prev.map((x, k) => (k === i ? v : x)))}
                    placeholder={tr('encuesta.opcionN', { n: i + 1 })}
                    placeholderTextColor={t.textSecondary}
                    maxLength={MAX_OPCION}
                    style={[campo, { flex: 1 }]}
                  />
                  {opciones.length > MIN_OPCIONES ? (
                    <Pressable
                      onPress={() => setOpciones((prev) => prev.filter((_, k) => k !== i))}
                      hitSlop={8}
                      accessibilityLabel={tr('encuesta.quitarOpcion')}>
                      <Icono nombre="minus.circle" tamano={22} color={t.danger} />
                    </Pressable>
                  ) : null}
                </Animated.View>
              ))}
              {opciones.length < MAX_OPCIONES ? (
                <Pressable
                  onPress={() => setOpciones((prev) => [...prev, ''])}
                  style={({ pressed }) => [styles.agregar, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button">
                  <Icono nombre="plus" tamano={18} color={t.text} />
                  <Texto style={{ fontWeight: '600' }}>{tr('encuesta.agregarOpcion')}</Texto>
                </Pressable>
              ) : null}
              {repetidas ? <Texto v="detalle" style={{ color: t.danger }}>{tr('encuesta.repetidas')}</Texto> : null}
              {error ? <Texto v="detalle" style={{ color: t.danger }}>{error}</Texto> : null}
            </ScrollView>
            <BotonPrincipal texto={tr('encuesta.crear')} onPress={crear} ocupado={enviando} deshabilitado={!valida} />
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  tarjeta: { gap: 8, minWidth: 220, paddingBottom: 14 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 5, opacity: 0.7 },
  etiquetaTexto: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  pregunta: { fontSize: 17, lineHeight: 22, fontWeight: '600', marginBottom: 2 },
  opcion: { gap: 6, paddingVertical: 2 },
  filaOpcion: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circulo: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  opcionTexto: { flex: 1, fontSize: 16, lineHeight: 21 },
  cuenta: { fontSize: 14, fontWeight: '600', opacity: 0.8, minWidth: 16, textAlign: 'right' },
  // El riel es el color del texto con poca opacidad; el relleno, el mismo color casi entero.
  riel: { height: 5, borderRadius: 3, marginLeft: 30, overflow: 'hidden' },
  relleno: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, opacity: 0.85 },
  total: { fontSize: 12, opacity: 0.65, marginTop: 2 },
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: {
    width: '100%', maxWidth: 520, maxHeight: '90%', alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, gap: 8,
  },
  asa: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  rotulo: { textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: 4 },
  campo: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17 },
  filaCampo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agregar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
});
