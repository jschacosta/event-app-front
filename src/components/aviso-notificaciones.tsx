// Franja en el chat de un grupo cuando el teléfono no tiene las notificaciones activadas: sin ellas no se
// entera cuando le escriben con Bora cerrada. "Activar" pide el permiso (o abre los ajustes del teléfono si
// ya lo negó) y "Ahora no" la esconde por 3 días.
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { IconoBora } from '@/components/iconos-bora';
import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { almacen } from '@/lib/almacen';
import { activarNotificaciones, estadoPermiso } from '@/lib/notificaciones';

const CLAVE = 'aviso_notificaciones_chat_hasta';
const PAUSA = 3 * 24 * 60 * 60 * 1000;

export function AvisoNotificaciones({ token }: { token: string | null }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [permiso, setPermiso] = useState<'si' | 'preguntar' | 'no' | null>(null);
  const [oculto, setOculto] = useState(true);

  const revisar = useCallback(() => { estadoPermiso().then(setPermiso).catch(() => {}); }, []);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    revisar();
    almacen.leer(CLAVE).then((v) => setOculto(Boolean(v) && Number(v) > Date.now())).catch(() => setOculto(false));
    // Al volver desde los ajustes del teléfono
    const sub = AppState.addEventListener('change', (e) => { if (e === 'active') revisar(); });
    return () => sub.remove();
  }, [revisar]);

  if (Platform.OS === 'web' || oculto || !permiso || permiso === 'si') return null;

  const activar = async () => {
    if (permiso === 'no') { Linking.openSettings(); return; }
    await activarNotificaciones(token, { preguntar: true });
    revisar();
  };
  const ahoraNo = () => {
    setOculto(true);
    almacen.guardar(CLAVE, String(Date.now() + PAUSA)).catch(() => {});
  };

  return (
    <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(150)} style={[styles.caja, { backgroundColor: t.card, borderColor: t.separator }]}>
      <View style={[styles.icono, { backgroundColor: t.accent }]}>
        <IconoBora nombre="campana" tamano={17} color={t.onAccent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto v="cuerpoFuerte">{tr('chat.notificaciones.titulo')}</Texto>
        <Texto v="detalle" secundario style={{ lineHeight: 18 }}>{tr('chat.notificaciones.texto')}</Texto>
        <View style={styles.botones}>
          <Pressable onPress={activar} accessibilityRole="button" hitSlop={6}
            style={({ pressed }) => [styles.boton, { backgroundColor: t.accent }, pressed && { opacity: 0.75 }]}>
            <Texto v="detalle" style={{ color: t.onAccent, fontWeight: '700' }}>
              {permiso === 'no' ? tr('chat.notificaciones.abrirAjustes') : tr('chat.notificaciones.activar')}
            </Texto>
          </Pressable>
          <Pressable onPress={ahoraNo} accessibilityRole="button" hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.5 }}>
            <Texto v="detalle" secundario style={{ fontWeight: '600' }}>{tr('chat.notificaciones.ahoraNo')}</Texto>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  caja: { flexDirection: 'row', gap: 12, marginHorizontal: 12, marginTop: 8, padding: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  icono: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  botones: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 8 },
  boton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
});
