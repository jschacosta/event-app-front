// Editar nombre y descripción de un canal propio (quien lo creó o el admin).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonTexto, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type CanalPropio } from '@/lib/api';

export function HojaEditarCanal({ canal, onCerrar, onListo }: { canal: CanalPropio | null; onCerrar: () => void; onListo: (c: CanalPropio) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { token } = useSesion();
  const insets = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al abrir se cargan los datos actuales del canal.
  const [abiertoCon, setAbiertoCon] = useState<string | null>(null);
  if ((canal?.id ?? null) !== abiertoCon) {
    setAbiertoCon(canal?.id ?? null);
    if (canal) {
      setNombre(canal.nombre);
      setDescripcion(canal.descripcion ?? '');
      setError(null);
    }
  }

  const valido = nombre.trim().length >= 3;
  const guardar = async () => {
    if (!canal || !valido || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api<{ canal: CanalPropio }>(`/canales/${canal.id}`, { metodo: 'PATCH', token, body: { nombre: nombre.trim(), descripcion: descripcion.trim() || null } });
      onListo(r.canal);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };
  const campo = [styles.campo, { backgroundColor: t.background, color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)];

  return (
    <Modal visible={Boolean(canal)} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {canal && (
        <KeyboardAvoidingView style={styles.contenedor} behavior="padding">
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(240)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={[styles.asa, { backgroundColor: t.separator }]} />
            <View style={styles.cabeza}>
              <BotonTexto texto={tr('comun.cancelar')} onPress={onCerrar} />
              <Texto v="cuerpoFuerte">{tr('canales.editar')}</Texto>
              <View style={{ width: 70 }} />
            </View>
            <Texto v="pie" secundario style={styles.rotulo}>{tr('canales.nombre')}</Texto>
            <TextInput value={nombre} onChangeText={setNombre} maxLength={40} style={campo} placeholderTextColor={t.textSecondary} />
            <Texto v="pie" secundario style={[styles.rotulo, { marginTop: 6 }]}>{tr('canales.descripcion')}</Texto>
            <TextInput
              value={descripcion}
              onChangeText={setDescripcion}
              maxLength={200}
              multiline
              placeholder={tr('canales.descripcionAyuda')}
              placeholderTextColor={t.textSecondary}
              style={[campo, { minHeight: 90, textAlignVertical: 'top' }]}
            />
            <Texto v="mini" secundario style={{ textAlign: 'right' }}>{descripcion.length}/200</Texto>
            {error ? <Texto v="detalle" style={{ color: t.danger }}>{error}</Texto> : null}
            <BotonPrincipal texto={tr('topicos.guardar')} onPress={guardar} ocupado={enviando} deshabilitado={!valido} />
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: {
    width: '100%', maxWidth: 520, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8, gap: 8,
  },
  asa: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 4 },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  rotulo: { textTransform: 'uppercase', fontWeight: '600', paddingHorizontal: 4 },
  campo: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 17 },
});
