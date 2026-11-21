import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComentariosHilo, RedactarHilo, useConversacion } from '@/components/conversacion-hilo';
import { BotonVolver } from '@/components/desplazamiento';
import { Autoria, Votos } from '@/components/opiniones';
import { Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';

// Los hilos que abre Bora traen viñetas ("- ") y párrafos en líneas separadas: se dibujan como en
// las guías (cuadrado de color en cada viñeta y aire entre párrafos). Los de la gente van tal cual.
function TextoBora({ texto }: { texto: string }) {
  const t = useTheme();
  const lineas = texto.split('\n').map((l) => l.trim()).filter(Boolean);
  return (
    <View style={{ gap: 10 }}>
      {lineas.map((l, i) => l.startsWith('- ') ? (
        <View key={i} style={styles.vineta}>
          <View style={[styles.punto, { backgroundColor: t.accent }]} />
          <Texto style={[styles.parrafo, { flex: 1 }]}>{l.slice(2)}</Texto>
        </View>
      ) : <Texto key={i} style={styles.parrafo}>{l}</Texto>)}
    </View>
  );
}

// Un hilo de una fiesta que se repite: la pregunta o relato arriba y las respuestas debajo
// (la conversación es la misma que en las guías: components/conversacion-hilo.tsx).
export default function HiloScreen() {
  const { id, hiloId } = useLocalSearchParams<{ id: string; hiloId: string }>();
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const c = useConversacion(hiloId ?? null, token ?? null, { pathname: '/evento/[id]/hilo/[hiloId]', params: { id: id ?? '', hiloId: hiloId ?? '' } });
  const hilo = c.hilo;

  if (!hilo) {
    return (
      <View style={[styles.centro, { backgroundColor: t.background }]}>
        {c.error ? <Texto secundario>{c.error}</Texto> : <ActivityIndicator />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.barra, { paddingTop: insets.top + 6, borderBottomColor: t.separator }]}>
        <BotonVolver onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Texto v="cuerpoFuerte" numberOfLines={1} style={{ flex: 1 }}>{tr('opiniones.hilo')}</Texto>
      </View>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Autoria autor={hilo.autor} fue={hilo.fue} creado={hilo.creado} />
        <Texto style={[styles.titulo, { color: t.text }]}>{hilo.titulo}</Texto>
        {hilo.texto ? (hilo.autor?.oficial ? <TextoBora texto={hilo.texto} /> : <Texto style={{ fontSize: 16, lineHeight: 23 }}>{hilo.texto}</Texto>) : null}
        {hilo.fuentes?.length ? (
          <View style={{ gap: 4, marginTop: 6 }}>
            <Texto v="pie" secundario style={{ fontWeight: '700' }}>{tr('hilos.fuentes')}</Texto>
            {hilo.fuentes.map((f) => (
              <Pressable key={f.url} onPress={() => WebBrowser.openBrowserAsync(f.url)} accessibilityRole="link" hitSlop={4}>
                {({ pressed }) => <Texto v="pie" style={{ color: t.accentText, opacity: pressed ? 0.6 : 1 }} numberOfLines={1}>{f.titulo}</Texto>}
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={[styles.accionesHilo, { borderBottomColor: t.separator }]}>
          <Votos horizontal puntaje={hilo.puntaje} miVoto={hilo.miVoto} onVotar={c.votarHilo} />
          <Texto v="pie" secundario style={{ fontWeight: '600' }}>{tr('opiniones.respuestas', { count: hilo.respuestas })}</Texto>
        </View>
        <ComentariosHilo c={c} />
      </ScrollView>
      <RedactarHilo c={c} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  contenido: { padding: 16, gap: 8, paddingBottom: 24 },
  titulo: { fontFamily: FuenteTitulo.cursiva, fontSize: 28, lineHeight: 30, marginTop: 2, paddingRight: 3 },
  parrafo: { fontSize: 16, lineHeight: 23 },
  vineta: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  punto: { width: 6, height: 6, borderRadius: 1, marginTop: 9 },
  accionesHilo: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
});
