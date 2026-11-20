// Pantallas para mantener a todos en la última versión (ver lib/version.ts), como en Kolke.
// "Actualizando Bora" usa el mismo açaí y el logo de la pantalla de carga: se siente parte del arranque.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { IconoBora } from '@/components/iconos-bora';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/ui';
import { abrirDialogo } from '@/lib/dialogo';
import { abrirTienda, aplicarUltimaOta, estadoVersion, marcarAvisada, versionesTienda, type VersionTienda } from '@/lib/version';

const VOLVER_MS = 30 * 60 * 1000; // al volver a la app después de esto, se revisa de nuevo
const ACAI = '#64209A';
const tienda = () => (Platform.OS === 'ios' ? 'App Store' : 'Google Play');

export function ControlVersion() {
  const { t } = useTranslation();
  const [bajando, setBajando] = useState(false);
  const [bloqueo, setBloqueo] = useState<VersionTienda | null>(null);
  const salio = useRef<number | null>(null);

  useEffect(() => {
    const revisar = async () => {
      // Primero la OTA: si hay una, la app se reinicia con ella y lo demás se revisa al volver a abrir.
      if (await aplicarUltimaOta(setBajando)) return;
      const { v, avisada } = await versionesTienda();
      const e = estadoVersion(v, avisada);
      setBloqueo(e === 'obligatoria' ? v : null);
      if (e === 'nueva' && v) {
        marcarAvisada(v);
        abrirDialogo({
          icono: 'descargar',
          titulo: t('version.nueva'),
          texto: t('version.nuevaTexto', { tienda: tienda() }),
          botones: [
            { texto: t('version.actualizar'), tipo: 'principal', onPress: () => { abrirTienda(v); } },
            { texto: t('comun.ahoraNo') },
          ],
        });
      }
    };
    revisar();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'background') salio.current = Date.now();
      if (s === 'active' && salio.current && Date.now() - salio.current > VOLVER_MS) {
        salio.current = null;
        revisar();
      }
    });
    return () => sub.remove();
  }, [t]);

  return (
    <>
      <Modal visible={bajando && !bloqueo} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
        <View style={styles.pantalla}>
          <Logo alto={64} variante="sobreFoto" />
          <View style={styles.textos}>
            <Texto v="titulo" style={styles.titulo}>{t('version.actualizando')}</Texto>
            <Texto v="detalle" style={styles.texto}>{t('version.actualizandoTexto')}</Texto>
          </View>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      </Modal>
      <Modal visible={Boolean(bloqueo)} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
        <View style={styles.pantalla}>
          <Logo alto={64} variante="sobreFoto" />
          <View style={styles.textos}>
            <Texto v="titulo" style={styles.titulo}>{t('version.obligatoria')}</Texto>
            <Texto v="detalle" style={styles.texto}>{t('version.obligatoriaTexto', { tienda: tienda() })}</Texto>
          </View>
          <Pressable onPress={() => abrirTienda(bloqueo)} accessibilityRole="button" style={({ pressed }) => [styles.boton, pressed && { opacity: 0.8 }]}>
            <IconoBora nombre="descargar" tamano={20} color={ACAI} />
            <Texto v="cuerpoFuerte" style={{ color: ACAI, fontWeight: '700' }}>{t('version.actualizar')}</Texto>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: ACAI, alignItems: 'center', justifyContent: 'center', gap: 28, padding: 32 },
  textos: { alignItems: 'center', gap: 8, maxWidth: 340 },
  titulo: { color: '#FFFFFF', textAlign: 'center' },
  texto: { color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  boton: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 24, borderRadius: 6, backgroundColor: '#FFFFFF' },
});
