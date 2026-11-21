// La conversación de un hilo: las respuestas (con un nivel de respuestas a respuestas, unidas por una
// línea como el riel de la agenda), los votos y el campo para responder. La usan el hilo de una fiesta
// que se repite y las guías de Bora.
import { useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Autoria, nuevoPuntaje, pedirSesion, votarEn, Votos, type HiloResumen } from '@/components/opiniones';
import { fuenteWeb, Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor } from '@/lib/api';

export type Comentario = { id: string; padre: string | null; texto: string; autor: Autor | null; fue: boolean; puntaje: number; miVoto: number; creado: string };

// Carga el hilo con sus respuestas y deja listas las acciones (votar, responder).
// `volver` es la dirección a la que se vuelve después de entrar (si no hay sesión).
export function useConversacion(hiloId: string | null, token: string | null, volver: Href) {
  const { t: tr } = useTranslation();
  const [hilo, setHilo] = useState<HiloResumen | null>(null);
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [respondiendo, setRespondiendo] = useState<Comentario | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    if (!hiloId) return;
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
    if (!token || !hilo) return pedirSesion(tr, 'opinar', volver);
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
    if (!token) return pedirSesion(tr, 'opinar', volver);
    const cambiar = (x: Partial<Comentario>) => setComentarios((l) => l.map((y) => (y.id === c.id ? { ...y, ...x } : y)));
    cambiar({ miVoto: valor, puntaje: nuevoPuntaje(c.puntaje, c.miVoto, valor) });
    try {
      cambiar(await votarEn(`/comentarios/${c.id}/voto`, token, valor));
    } catch {
      cambiar(c);
    }
  };
  const enviar = async () => {
    if (!token) return pedirSesion(tr, 'opinar', volver);
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

  return { hilo, comentarios, error, texto, setTexto, respondiendo, setRespondiendo, enviando, votarHilo, votarComentario, enviar };
}
export type Conversacion = ReturnType<typeof useConversacion>;

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

export function ComentariosHilo({ c }: { c: Conversacion }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const raices = c.comentarios.filter((x) => !x.padre);
  const hijos = (id: string) => c.comentarios.filter((x) => x.padre === id);
  if (raices.length === 0) {
    return <Texto v="detalle" secundario style={{ paddingVertical: 20, textAlign: 'center' }}>{tr('opiniones.sinRespuestas')}</Texto>;
  }
  return (
    <>
      {raices.map((x) => (
        <View key={x.id}>
          <ItemComentario c={x} onVotar={(v) => c.votarComentario(x, v)} onResponder={() => c.setRespondiendo(x)} />
          {hijos(x.id).length ? (
            <View style={styles.rama}>
              <View style={[styles.riel, { backgroundColor: t.outline }]} />
              <View style={{ flex: 1 }}>
                {hijos(x.id).map((h) => <ItemComentario key={h.id} c={h} hijo onVotar={(v) => c.votarComentario(h, v)} onResponder={() => c.setRespondiendo(h)} />)}
              </View>
            </View>
          ) : null}
        </View>
      ))}
    </>
  );
}

export function RedactarHilo({ c }: { c: Conversacion }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.redactar, { paddingBottom: Math.max(insets.bottom, 10), borderTopColor: t.separator, backgroundColor: t.background }]}>
      {c.respondiendo ? (
        <Animated.View entering={FadeInDown.duration(150)} style={styles.respondiendo}>
          <Texto v="pie" secundario numberOfLines={1} style={{ flex: 1 }}>
            {tr('opiniones.respondiendoA', { nombre: c.respondiendo.autor?.nombreVisible ?? '' })}
          </Texto>
          <Pressable onPress={() => c.setRespondiendo(null)} hitSlop={8} accessibilityLabel={tr('comun.cancelar')}>
            <Icono nombre="xmark" tamano={13} color={t.textSecondary} peso="bold" />
          </Pressable>
        </Animated.View>
      ) : null}
      <View style={styles.filaCampo}>
        <TextInput
          value={c.texto}
          onChangeText={c.setTexto}
          placeholder={tr('opiniones.escribeRespuesta')}
          placeholderTextColor={t.textSecondary}
          multiline
          maxLength={2000}
          style={[styles.campo, { backgroundColor: t.backgroundElement, color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        />
        <Pressable
          onPress={c.enviar}
          disabled={!c.texto.trim() || c.enviando}
          accessibilityRole="button"
          accessibilityLabel={tr('opiniones.publicar')}
          style={({ pressed }) => [styles.enviar, { backgroundColor: c.texto.trim() ? t.accent : t.backgroundElement }, pressed && { opacity: 0.7 }]}>
          {c.enviando ? <ActivityIndicator color={t.onAccent} /> : <Icono nombre="arrow.up" tamano={17} color={c.texto.trim() ? t.onAccent : t.textSecondary} peso="bold" />}
        </Pressable>
      </View>
      {c.error ? <Texto v="pie" style={{ color: t.danger }}>{c.error}</Texto> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
