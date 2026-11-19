import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonVolver } from '@/components/desplazamiento';
import { Autoria, nuevoPuntaje, pedirSesion, votarEn, Votos, type HiloResumen } from '@/components/opiniones';
import { fuenteWeb, Icono, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor } from '@/lib/api';

// Un hilo de una fiesta que se repite: la pregunta o relato arriba y las respuestas debajo.
// Las respuestas a una respuesta van un nivel más adentro, unidas por una línea (como el riel de la agenda).
type Comentario = { id: string; padre: string | null; texto: string; autor: Autor | null; fue: boolean; puntaje: number; miVoto: number; creado: string };

function ItemComentario({ c, hijo, onVotar, onResponder }: { c: Comentario; hijo?: boolean; onVotar: (v: number) => void; onResponder: () => void }) {
  const { t: tr } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(180)} style={[styles.comentario, hijo && styles.hijo]}>
      <Autoria autor={c.autor} fue={c.fue} creado={c.creado} />
      <Texto v="detalle" style={{ fontSize: 15, lineHeight: 21 }}>{c.texto}</Texto>
      <View style={styles.accionesComentario}>
        <Votos horizontal puntaje={c.puntaje} miVoto={c.miVoto} onVotar={onVotar} />
        <Pressable onPress={onResponder} hitSlop={8} accessibilityRole="button">
          {({ pressed }) => <Texto v="pie" secundario style={{ fontWeight: '700', opacity: pressed ? 0.5 : 1 }}>{tr('chat.responder')}</Texto>}
        </Pressable>
      </View>
    </Animated.View>
  );
}

export default function HiloScreen() {
  const { id, hiloId } = useLocalSearchParams<{ id: string; hiloId: string }>();
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const [hilo, setHilo] = useState<HiloResumen | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [respondiendo, setRespondiendo] = useState<Comentario | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const r = await api<{ hilo: HiloResumen; comentarios: Comentario[] }>(`/hilos/${hiloId}`, { token });
      setHilo(r.hilo);
      setComentarios(r.comentarios);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('comun.noSePudo'));
    }
  }, [hiloId, token, tr]);
  useFocusEffect(useCallback(() => { cargar(); }, [cargar]));

  const votarHilo = async (valor: number) => {
    if (!token || !hilo) return pedirSesion(tr, 'opinar', `/evento/${id}/hilo/${hiloId}`);
    const antes = hilo;
    setHilo({ ...hilo, miVoto: valor, puntaje: nuevoPuntaje(hilo.puntaje, hilo.miVoto, valor) });
    try {
      const r = await votarEn(`/hilos/${hilo.id}/voto`, token, valor);
      setHilo((h) => (h ? { ...h, ...r } : h));
    } catch {
      setHilo(antes);
    }
  };
  const votarComentario = async (c: Comentario, valor: number) => {
    if (!token) return pedirSesion(tr, 'opinar', `/evento/${id}/hilo/${hiloId}`);
    const cambiar = (x: Partial<Comentario>) => setComentarios((l) => l.map((y) => (y.id === c.id ? { ...y, ...x } : y)));
    cambiar({ miVoto: valor, puntaje: nuevoPuntaje(c.puntaje, c.miVoto, valor) });
    try {
      cambiar(await votarEn(`/comentarios/${c.id}/voto`, token, valor));
    } catch {
      cambiar(c);
    }
  };

  const enviar = async () => {
    if (!token) return pedirSesion(tr, 'opinar', `/evento/${id}/hilo/${hiloId}`);
    const limpio = texto.trim();
    if (!limpio || !hilo) return;
    setEnviando(true);
    try {
      const r = await api<{ comentario: Comentario }>(`/hilos/${hilo.id}/comentarios`, {
        metodo: 'POST', token, body: { texto: limpio, padre: respondiendo?.id ?? null },
      });
      setComentarios((l) => [...l, r.comentario]);
      setHilo((h) => (h ? { ...h, respuestas: h.respuestas + 1 } : h));
      setTexto('');
      setRespondiendo(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('comun.noSePudo'));
    } finally {
      setEnviando(false);
    }
  };

  if (!hilo) {
    return (
      <View style={[styles.centro, { backgroundColor: t.background }]}>
        {error ? <Texto secundario>{error}</Texto> : <ActivityIndicator />}
      </View>
    );
  }

  const raices = comentarios.filter((c) => !c.padre);
  const hijos = (id: string) => comentarios.filter((c) => c.padre === id);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.barra, { paddingTop: insets.top + 6, borderBottomColor: t.separator }]}>
        <BotonVolver onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Texto v="cuerpoFuerte" numberOfLines={1} style={{ flex: 1 }}>{tr('opiniones.hilo')}</Texto>
      </View>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <Autoria autor={hilo.autor} fue={hilo.fue} creado={hilo.creado} />
        <Texto style={[styles.titulo, { color: t.text }]}>{hilo.titulo}</Texto>
        {hilo.texto ? <Texto style={{ fontSize: 16, lineHeight: 23 }}>{hilo.texto}</Texto> : null}
        <View style={[styles.accionesHilo, { borderBottomColor: t.separator }]}>
          <Votos horizontal puntaje={hilo.puntaje} miVoto={hilo.miVoto} onVotar={votarHilo} />
          <Texto v="pie" secundario style={{ fontWeight: '600' }}>{tr('opiniones.respuestas', { count: hilo.respuestas })}</Texto>
        </View>
        {raices.length === 0 ? (
          <Texto v="detalle" secundario style={{ paddingVertical: 20, textAlign: 'center' }}>{tr('opiniones.sinRespuestas')}</Texto>
        ) : raices.map((c) => (
          <View key={c.id}>
            <ItemComentario c={c} onVotar={(v) => votarComentario(c, v)} onResponder={() => setRespondiendo(c)} />
            {hijos(c.id).length ? (
              <View style={styles.rama}>
                <View style={[styles.riel, { backgroundColor: t.outline }]} />
                <View style={{ flex: 1 }}>{hijos(c.id).map((h) => <ItemComentario key={h.id} c={h} hijo onVotar={(v) => votarComentario(h, v)} onResponder={() => setRespondiendo(h)} />)}</View>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.redactar, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: t.separator, backgroundColor: t.background }]}>
        {respondiendo ? (
          <Animated.View entering={FadeInDown.duration(150)} style={styles.respondiendo}>
            <Texto v="pie" secundario numberOfLines={1} style={{ flex: 1 }}>
              {tr('opiniones.respondiendoA', { nombre: respondiendo.autor?.nombreVisible ?? '' })}
            </Texto>
            <Pressable onPress={() => setRespondiendo(null)} hitSlop={8} accessibilityLabel={tr('comun.cancelar')}>
              <Icono nombre="xmark" tamano={13} color={t.textSecondary} peso="bold" />
            </Pressable>
          </Animated.View>
        ) : null}
        <View style={styles.filaCampo}>
          <TextInput
            value={texto}
            onChangeText={setTexto}
            placeholder={tr('opiniones.escribeRespuesta')}
            placeholderTextColor={t.textSecondary}
            multiline
            maxLength={2000}
            style={[styles.campo, { backgroundColor: t.backgroundElement, color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
          <Pressable
            onPress={enviar}
            disabled={!texto.trim() || enviando}
            accessibilityRole="button"
            accessibilityLabel={tr('opiniones.publicar')}
            style={({ pressed }) => [styles.enviar, { backgroundColor: texto.trim() ? t.accent : t.backgroundElement }, pressed && { opacity: 0.7 }]}>
            {enviando ? <ActivityIndicator color={t.onAccent} /> : <Icono nombre="arrow.up" tamano={17} color={texto.trim() ? t.onAccent : t.textSecondary} peso="bold" />}
          </Pressable>
        </View>
        {error ? <Texto v="pie" style={{ color: t.danger }}>{error}</Texto> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  contenido: { padding: 16, gap: 8, paddingBottom: 24 },
  titulo: { fontFamily: FuenteTitulo.cursiva, fontSize: 28, lineHeight: 30, marginTop: 2, paddingRight: 3 },
  accionesHilo: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 4 },
  comentario: { gap: 4, paddingVertical: 10 },
  hijo: { paddingVertical: 8 },
  accionesComentario: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 2 },
  rama: { flexDirection: 'row', gap: 12, paddingLeft: 4 },
  riel: { width: 2, borderRadius: 1, marginVertical: 6 },
  redactar: { paddingHorizontal: 12, paddingTop: 8, gap: 6, borderTopWidth: StyleSheet.hairlineWidth },
  respondiendo: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  filaCampo: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  campo: { flex: 1, minHeight: 40, maxHeight: 120, borderRadius: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, fontSize: 16 },
  enviar: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
