// Eliminar la cuenta (Ajustes → Eliminar mi cuenta). Lo exigen App Store y Google Play.
// Explica qué se borra y qué no, y pide marcar "entiendo" antes de habilitar el botón.
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonTexto, Icono, Texto } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';

function Lista({ titulo, puntos }: { titulo: string; puntos: string[] }) {
  const t = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Texto v="cuerpoFuerte">{titulo}</Texto>
      {puntos.map((p) => (
        <View key={p} style={styles.punto}>
          <View style={[styles.vineta, { backgroundColor: t.textSecondary }]} />
          <Texto v="detalle" style={{ flex: 1, lineHeight: 20 }}>{p}</Texto>
        </View>
      ))}
    </View>
  );
}

export default function EliminarCuentaScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { usuario, eliminarCuenta } = useSesion();
  const [entiendo, setEntiendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));
  const eliminar = async () => {
    setOcupado(true);
    setError(null);
    try {
      await eliminarCuenta();
      router.dismissAll();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
      setOcupado(false);
    }
  };

  const borra = tr('eliminarCuenta.seBorra', { returnObjects: true }) as string[];
  const queda = tr('eliminarCuenta.queda', { returnObjects: true }) as string[];

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <View style={[styles.barra, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8, borderBottomColor: t.separator }]}>
        <View style={{ width: 70 }} />
        <Texto v="cuerpoFuerte">{tr('ajustes.cuenta.eliminar')}</Texto>
        <View style={{ width: 70, alignItems: 'flex-end' }}><BotonTexto texto={tr('comun.cerrar')} onPress={cerrar} /></View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]}>
        <View style={{ gap: 6 }}>
          <Texto v="titulo">{tr('eliminarCuenta.titulo')}</Texto>
          <Texto v="detalle" secundario style={{ lineHeight: 20 }}>
            {usuario?.email ? tr('eliminarCuenta.introEmail', { email: usuario.email }) : tr('eliminarCuenta.intro')}
          </Texto>
        </View>
        <Lista titulo={tr('eliminarCuenta.seBorraTitulo')} puntos={borra} />
        <Lista titulo={tr('eliminarCuenta.quedaTitulo')} puntos={queda} />

        <Pressable
          onPress={() => setEntiendo(!entiendo)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: entiendo }}
          style={[styles.entiendo, { backgroundColor: t.card }]}>
          <View style={[styles.cajita, entiendo ? { backgroundColor: t.danger, borderColor: t.danger } : { borderColor: t.chevron }]}>
            {entiendo ? <Icono nombre="checkmark" tamano={12} color="#FFFFFF" peso="bold" /> : null}
          </View>
          <Texto v="detalle" style={{ flex: 1, lineHeight: 20 }}>{tr('eliminarCuenta.entiendo')}</Texto>
        </Pressable>

        {error ? <Texto v="detalle" style={{ color: t.danger }}>{error}</Texto> : null}

        <Pressable
          onPress={eliminar}
          disabled={!entiendo || ocupado}
          accessibilityRole="button"
          accessibilityState={{ disabled: !entiendo || ocupado }}
          style={({ pressed }) => [
            styles.boton,
            { backgroundColor: t.danger, opacity: !entiendo ? 0.35 : pressed ? 0.8 : 1 },
          ]}>
          {ocupado
            ? <ActivityIndicator color="#FFFFFF" />
            : <Texto v="cuerpoFuerte" style={{ color: '#FFFFFF' }}>{tr('eliminarCuenta.boton')}</Texto>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  contenido: { padding: 16, gap: 24 },
  punto: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  vineta: { width: 4, height: 4, borderRadius: 2, marginTop: 8 },
  entiendo: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 10 },
  cajita: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  boton: { height: 50, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
