// Personas bloqueadas: la lista y el botón para desbloquear (con el modal que explica qué pasa).
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { ModalBloquear } from '@/components/seguridad';
import { BotonTexto, Grupo, Texto } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor } from '@/lib/api';

export default function BloqueadosScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, usuario } = useSesion();
  const [personas, setPersonas] = useState<Autor[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [desbloquear, setDesbloquear] = useState<Autor | null>(null);

  // Se recarga si la lista cambia desde otro lado (por ejemplo, al bloquear en un canal).
  const cuantos = usuario?.bloqueados?.length ?? 0;
  useEffect(() => {
    if (!token) return;
    api<{ personas: Autor[] }>('/me/bloqueos', { token })
      .then((r) => setPersonas(r.personas))
      .catch((e: Error) => setError(e.message));
  }, [token, cuantos]);

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <View style={[styles.barra, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8, borderBottomColor: t.separator }]}>
        <View style={{ width: 70 }} />
        <Texto v="cuerpoFuerte">{tr('bloqueos.titulo')}</Texto>
        <View style={{ width: 70, alignItems: 'flex-end' }}><BotonTexto texto={tr('comun.cerrar')} onPress={cerrar} /></View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]}>
        {error ? <Texto secundario style={{ textAlign: 'center' }}>{error}</Texto> : personas === null ? <ActivityIndicator /> : (
          <Grupo pie={tr('bloqueos.pie')}>
            {personas.length ? personas.map((p) => (
              <Animated.View key={p.id} exiting={FadeOut.duration(150)} layout={LinearTransition.duration(200)} style={styles.fila}>
                <View style={[styles.avatar, { backgroundColor: t.backgroundSelected }]}>
                  {p.foto
                    ? <Image source={{ uri: p.foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    : <Text style={{ color: t.text, fontSize: 16, fontWeight: '600' }}>{p.nombreVisible.charAt(0)}</Text>}
                </View>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Texto numberOfLines={1} style={{ flexShrink: 1 }}>{p.nombreVisible}</Texto>
                  {p.pais ? <Bandera codigo={p.pais} alto={10} /> : null}
                </View>
                <Pressable
                  onPress={() => setDesbloquear(p)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.boton, { backgroundColor: t.backgroundSelected }, pressed && { opacity: 0.6 }]}>
                  <Texto v="pie" style={{ fontWeight: '600' }}>{tr('bloqueos.desbloquear')}</Texto>
                </Pressable>
              </Animated.View>
            )) : (
              <View style={{ padding: 16 }}><Texto secundario>{tr('bloqueos.vacio')}</Texto></View>
            )}
          </Grupo>
        )}
      </ScrollView>

      <ModalBloquear
        persona={desbloquear}
        modo="desbloquear"
        onCerrar={() => setDesbloquear(null)}
        onHecho={(p) => setPersonas((prev) => prev?.filter((x) => x.id !== p.id) ?? prev)}
      />
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
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  boton: { paddingHorizontal: 12, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
