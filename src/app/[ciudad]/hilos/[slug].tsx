// Una guía de Bora (/rio/hilos/<dirección>): la que encuentra Google. Arriba el tema, la pregunta como
// titular, el sello de Bora y la respuesta corta; después el texto, las fiestas que tienen que ver
// (de la agenda real), las fuentes y, abajo, la conversación de la gente con sus votos.
// El idioma del texto lo da la dirección (cada idioma tiene la suya); se puede cambiar arriba.
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import Head from 'expo-router/head';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ComentariosHilo, RedactarHilo, useConversacion } from '@/components/conversacion-hilo';
import { BotonVolver } from '@/components/desplazamiento';
import { FotoEvento } from '@/components/foto-evento';
import { Autoria, Votos } from '@/components/opiniones';
import { BotonPrincipal, Icono, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { fechaCorta, hora, tituloDia } from '@/lib/fechas';
import { bloquesDe, cargarGuia, IDIOMAS_GUIA, type Guia } from '@/lib/guias';

const ANCHO_MAX = 720;

function Cuerpo({ texto }: { texto: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 12 }}>
      {bloquesDe(texto).map((b, i) => {
        if (b.tipo === 'titulo') return <Texto key={i} v="seccion" style={{ marginTop: 10 }}>{b.texto}</Texto>;
        if (b.tipo === 'parrafo') return <Texto key={i} style={styles.parrafo}>{b.texto}</Texto>;
        return (
          <View key={i} style={{ gap: 8 }}>
            {b.items.map((x, j) => (
              <View key={j} style={styles.vineta}>
                <View style={[styles.punto, { backgroundColor: t.accent }]} />
                <Texto style={[styles.parrafo, { flex: 1 }]}>{x}</Texto>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

export default function GuiaScreen() {
  const { ciudad, slug } = useLocalSearchParams<{ ciudad: string; slug: string }>();
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const [datos, setDatos] = useState<Guia | null>(null);
  const [error, setError] = useState(false);
  const aqui: Href = { pathname: '/[ciudad]/hilos/[slug]', params: { ciudad: ciudad ?? '', slug: slug ?? '' } };
  const c = useConversacion(datos?.hilo.id ?? null, token ?? null, aqui);

  useFocusEffect(useCallback(() => {
    if (!ciudad || !slug) return;
    cargarGuia(ciudad, slug, token ?? null).then(setDatos).catch(() => setError(true));
  }, [ciudad, slug, token]));

  const volver = () => (router.canGoBack() ? router.back() : router.replace('/hilos'));

  if (!datos) {
    return (
      <View style={[styles.centrado, { backgroundColor: t.background }]}>
        {error ? (
          <>
            <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('hilos.noEncontrada')}</Texto>
            <BotonPrincipal texto={tr('hilos.otras')} onPress={() => router.replace('/hilos')} />
          </>
        ) : <ActivityIndicator />}
      </View>
    );
  }

  const { guia, idioma, alternos, eventos } = datos;
  const hilo = c.hilo ?? datos.hilo;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Head>
        <title>{`${guia.titulo} · Bora`}</title>
        <meta name="description" content={guia.resumen} />
        <html lang={idioma} />
      </Head>
      <View style={[styles.barra, { paddingTop: insets.top + 6, borderBottomColor: t.separator }]}>
        <BotonVolver onPress={volver} />
        <Pressable onPress={() => router.navigate('/hilos')} accessibilityRole="link" style={{ flex: 1 }}>
          <Texto v="cuerpoFuerte" numberOfLines={1}>{tr('hilos.otras')}</Texto>
        </Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.centro}>
          <Texto v="detalle" style={{ color: t.accentText, fontWeight: '800' }}>{tr(`hilos.temas.${guia.tema}`)}</Texto>
          <Texto style={[styles.titulo, { color: t.text }]} accessibilityRole="header">{guia.titulo}</Texto>
          <View style={styles.firma}>
            <Autoria autor={hilo.autor} fue={false} creado={guia.creada} />
            <Texto v="pie" secundario>{tr('hilos.actualizada', { fecha: fechaCorta(guia.actualizada) })}</Texto>
          </View>

          {Object.keys(alternos).length > 1 ? (
            <View style={styles.idiomas}>
              <Texto v="pie" secundario>{tr('hilos.leerEn')}</Texto>
              {IDIOMAS_GUIA.filter((l) => alternos[l]).map((l) => (
                <Pressable
                  key={l}
                  onPress={() => { if (l !== idioma) router.replace({ pathname: '/[ciudad]/hilos/[slug]', params: { ciudad, slug: alternos[l]! } }); }}
                  accessibilityRole="link"
                  accessibilityState={{ selected: l === idioma }}
                  style={({ pressed }) => [styles.idioma, { backgroundColor: l === idioma ? t.accent : t.backgroundElement }, pressed && { opacity: 0.7 }]}>
                  <Texto v="mini" style={{ fontWeight: '800', color: l === idioma ? t.onAccent : t.text }}>{l.toUpperCase()}</Texto>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.resumen, { borderLeftColor: t.accent }]}>
            <Texto style={[styles.resumenTexto, { color: t.text }]}>{guia.resumen}</Texto>
          </View>

          <Cuerpo texto={guia.cuerpo} />

          {eventos.length ? (
            <View style={styles.seccion}>
              <Texto v="seccion">{tr('hilos.fiestas')}</Texto>
              <View style={[styles.eventos, { borderTopColor: t.separator }]}>
                {eventos.map((e) => (
                  <Pressable
                    key={e.id}
                    onPress={() => router.push({ pathname: '/evento/[id]', params: { id: e.id } })}
                    accessibilityRole="link"
                    style={({ pressed }) => [styles.evento, { borderBottomColor: t.separator }, pressed && { opacity: 0.7 }]}>
                    <View style={[styles.foto, { backgroundColor: t.backgroundElement }]}>
                      {e.imagen ? <FotoEvento url={e.imagen} style={StyleSheet.absoluteFill} /> : null}
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Texto v="cuerpoFuerte" numberOfLines={1}>{e.titulo}</Texto>
                      <Texto v="pie" secundario numberOfLines={1}>{`${tituloDia(e.inicio)} · ${hora(e.inicio)}${e.lugar ? ` · ${e.lugar}` : ''}`}</Texto>
                    </View>
                    <Icono nombre="chevron.right" tamano={12} color={t.textSecondary} peso="bold" />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {guia.fuentes.length ? (
            <View style={[styles.seccion, { gap: 6 }]}>
              <Texto v="pie" secundario style={{ fontWeight: '700' }}>{tr('hilos.fuentes')}</Texto>
              {guia.fuentes.map((f) => (
                <Pressable key={f.url} onPress={() => WebBrowser.openBrowserAsync(f.url)} accessibilityRole="link" hitSlop={4}>
                  {({ pressed }) => <Texto v="pie" style={{ color: t.accentText, opacity: pressed ? 0.6 : 1 }} numberOfLines={1}>{f.titulo}</Texto>}
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.acciones, { borderBottomColor: t.separator }]}>
            <Votos horizontal puntaje={hilo.puntaje} miVoto={hilo.miVoto} onVotar={c.votarHilo} />
            <Texto v="pie" secundario style={{ fontWeight: '600' }}>{tr('opiniones.respuestas', { count: hilo.respuestas })}</Texto>
          </View>
          <Texto v="seccion" style={{ marginTop: 14 }}>{tr('hilos.conversacion')}</Texto>
          <ComentariosHilo c={c} />
        </View>
      </ScrollView>
      <View style={styles.redactar}><RedactarHilo c={c} /></View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 32 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  centro: { width: '100%', maxWidth: ANCHO_MAX, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 18, gap: 10 },
  titulo: { fontFamily: FuenteTitulo.cursiva, fontSize: 36, lineHeight: 38, paddingRight: 3 },
  firma: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  idiomas: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  idioma: { height: 24, minWidth: 32, paddingHorizontal: 7, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  resumen: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 2, marginVertical: 6 },
  resumenTexto: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  parrafo: { fontSize: 16, lineHeight: 25 },
  vineta: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  punto: { width: 6, height: 6, borderRadius: 1, marginTop: 10 },
  seccion: { marginTop: 18, gap: 8 },
  eventos: { borderTopWidth: StyleSheet.hairlineWidth },
  evento: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  foto: { width: 48, height: 48, borderRadius: 4, overflow: 'hidden' },
  acciones: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, marginTop: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  redactar: { width: '100%', maxWidth: ANCHO_MAX, alignSelf: 'center' },
});
