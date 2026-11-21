// Perfil de otra persona, al tocar su foto en un chat o en la lista de quién está en la sala.
// Como un afiche: sus fotos arriba (se deslizan, con las rayitas de cuántas hay), el nombre sobre la foto
// y debajo lo que ella eligió mostrar: verificación, Instagram, los eventos a los que van los dos,
// intereses, países e idiomas. Al final, bloquear o reportar (discretos, pero siempre a mano).
// Se abre al instante con lo que ya trae el mensaje (nombre, foto, país) y el resto llega del servidor.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera, Banderas } from '@/components/bandera';
import { FotoEvento } from '@/components/foto-evento';
import { IconoBora } from '@/components/iconos-bora';
import { Icono, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor } from '@/lib/api';
import { hora, mesYAnio, tituloDia } from '@/lib/fechas';
import { nombreInteres } from '@/lib/intereses';
import { nombrePais } from '@/lib/paises';

type EventoEnComun = { id: string; titulo: string; imagen: string | null; inicio: string; fin: string; lugar: string | null };
export type PersonaPublica = Autor & {
  fotos: string[];
  intereses: string[];
  paisesVisitados: string[];
  idiomas: string[];
  desde: string;
  bloqueada: boolean;
  enComun: EventoEnComun[];
};

const ALTO_FOTO = 380;

function Fotos({ fotos, nombre, ancho }: { fotos: string[]; nombre: string; ancho: number }) {
  const t = useTheme();
  const [indice, setIndice] = useState(0);
  if (!fotos.length) {
    return (
      <LinearGradient colors={[t.accent, '#2A0D45']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.sinFoto, { width: ancho }]}>
        <Texto style={styles.inicial}>{(nombre || '?').charAt(0).toUpperCase()}</Texto>
      </LinearGradient>
    );
  }
  return (
    <View style={{ width: ancho, height: ALTO_FOTO }}>
      <FlatList
        data={fotos}
        keyExtractor={(u) => u}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndice(Math.round(e.nativeEvent.contentOffset.x / ancho))}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ width: ancho, height: ALTO_FOTO, backgroundColor: t.backgroundElement }} contentFit="cover" transition={200} />
        )}
      />
      {/* Rayitas arriba: cuántas fotos hay y en cuál va */}
      {fotos.length > 1 ? (
        <View style={styles.rayitas} pointerEvents="none">
          {fotos.map((u, i) => <View key={u} style={[styles.rayita, { opacity: i === indice ? 1 : 0.4 }]} />)}
        </View>
      ) : null}
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Texto v="pie" secundario style={{ fontWeight: '700' }}>{titulo}</Texto>
      {children}
    </View>
  );
}

function Etiqueta({ texto }: { texto: string }) {
  const t = useTheme();
  return (
    <View style={[styles.etiqueta, { backgroundColor: t.backgroundElement }]}>
      <Texto v="detalle">{texto}</Texto>
    </View>
  );
}

export function PerfilPersona({ autor, edad, token, onCerrar, onBloquear, onReportar }: {
  autor: Autor | null;
  edad?: number | null; // la que manda el chat (p. ej. a quien creó el canal)
  token: string | null;
  onCerrar: () => void;
  onBloquear: (a: Autor) => void;
  onReportar: (a: Autor) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { t: trAuth } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [datos, setDatos] = useState<{ id: string; persona: PersonaPublica | null; error: boolean } | null>(null);

  useEffect(() => {
    if (!autor) return;
    let vigente = true;
    api<{ persona: PersonaPublica }>(`/personas/${autor.id}`, { token })
      .then((r) => { if (vigente) setDatos({ id: autor.id, persona: r.persona, error: false }); })
      .catch(() => { if (vigente) setDatos({ id: autor.id, persona: null, error: true }); });
    return () => { vigente = false; };
  }, [autor, token]);

  if (!autor) return null;
  const listo = datos?.id === autor.id ? datos : null;
  const p = listo?.persona;
  const fotos = p?.fotos.length ? p.fotos : autor.foto ? [autor.foto] : [];
  const edadVisible = edad ?? p?.edad ?? autor.edad ?? null;
  const linea = [autor.pais ? nombrePais(autor.pais) : null, edadVisible ? trAuth('perfil.edad', { count: edadVisible }) : null].filter(Boolean).join(' · ');
  const desde = p?.desde ? new Date(p.desde) : null;
  const vacio = p && !p.intereses.length && !p.paisesVisitados.length && !p.idiomas.length && !p.enComun.length;

  const abrirEvento = (id: string) => {
    onCerrar();
    setTimeout(() => router.push({ pathname: '/evento/[id]', params: { id } }), 250);
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      <View style={styles.contenedor}>
        <Animated.View entering={FadeIn.duration(180)} style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityRole="button" accessibilityLabel={tr('comun.cerrar')} />
        </Animated.View>
        <Animated.View
          entering={SlideInDown.duration(300).easing(Easing.out(Easing.cubic))}
          accessibilityViewIsModal
          style={[styles.hoja, { backgroundColor: t.card, marginTop: insets.top + 24 }]}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) + 12 }} bounces={false}>
            {/* Afiche: fotos con el nombre encima */}
            <View>
              <Fotos fotos={fotos} nombre={autor.nombreVisible} ancho={width} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.72)']} style={styles.degradado} pointerEvents="none" />
              <View style={styles.sobreFoto} pointerEvents="none">
                <View style={styles.filaNombre}>
                  <Texto numberOfLines={1} style={styles.nombre}>{autor.nombreVisible}</Texto>
                  {autor.pais ? <Bandera codigo={autor.pais} alto={18} /> : null}
                </View>
                {linea ? <Texto v="detalle" style={{ color: 'rgba(255,255,255,0.88)', fontWeight: '600' }}>{linea}</Texto> : null}
              </View>
              <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel={tr('comun.cerrar')} hitSlop={8}
                style={({ pressed }) => [styles.cerrar, pressed && { opacity: 0.7 }]}>
                <IconoBora nombre="cerrar" tamano={16} color="#FFFFFF" grosor={2.4} />
              </Pressable>
            </View>

            <View style={styles.cuerpo}>
              {/* Sellos: verificada, Instagram y desde cuándo está en Bora */}
              <View style={styles.insignias}>
                {autor.edadVerificada ? (
                  <View style={[styles.insignia, { backgroundColor: t.accentSoft }]}>
                    <Icono nombre="checkmark.seal.fill" tamano={13} color={t.accentSoftText} />
                    <Texto v="pie" style={{ fontWeight: '700', color: t.accentSoftText }}>{tr('verificacion.verificada')}</Texto>
                  </View>
                ) : null}
                {autor.instagram ? (
                  <Pressable onPress={() => Linking.openURL(`https://www.instagram.com/${autor.instagram}/`).catch(() => {})}
                    style={({ pressed }) => [styles.insignia, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
                    <Icono nombre="camera" tamano={13} color={t.text} />
                    <Texto v="pie" style={{ fontWeight: '700' }}>@{autor.instagram}</Texto>
                  </Pressable>
                ) : null}
                {desde ? (
                  <Texto v="pie" secundario style={{ fontWeight: '600', alignSelf: 'center' }}>
                    {tr('persona.desde', { fecha: mesYAnio(desde.getFullYear(), desde.getMonth()) })}
                  </Texto>
                ) : null}
              </View>

              {p?.bloqueada ? (
                <View style={[styles.aviso, { backgroundColor: t.backgroundElement }]}>
                  <IconoBora nombre="cerrar" tamano={16} color={t.textSecondary} />
                  <Texto v="detalle" secundario style={{ flex: 1 }}>{tr('persona.bloqueada')}</Texto>
                </View>
              ) : null}

              {!listo ? (
                <View style={styles.cargando}><ActivityIndicator color={t.textSecondary} /></View>
              ) : listo.error ? (
                <Texto v="detalle" secundario style={{ textAlign: 'center', paddingVertical: 20 }}>{tr('persona.error')}</Texto>
              ) : p ? (
                <Animated.View entering={FadeIn.duration(200)} style={{ gap: 22 }}>
                  {p.enComun.length ? (
                    <Seccion titulo={tr('persona.enComun')}>
                      <View style={{ gap: 4 }}>
                        {p.enComun.map((e) => (
                          <Pressable key={e.id} onPress={() => abrirEvento(e.id)} accessibilityRole="button"
                            style={({ pressed }) => [styles.evento, pressed && { backgroundColor: t.backgroundElement }]}>
                            <View style={[styles.miniatura, { backgroundColor: t.backgroundElement }]}>
                              {e.imagen ? <FotoEvento url={e.imagen} style={StyleSheet.absoluteFill} recyclingKey={e.id} /> : null}
                            </View>
                            <View style={{ flex: 1, gap: 1 }}>
                              <Texto v="cuerpoFuerte" numberOfLines={1} style={{ fontSize: 15 }}>{e.titulo}</Texto>
                              <Texto v="pie" secundario numberOfLines={1}>{[`${tituloDia(e.inicio)} ${hora(e.inicio)}`, e.lugar].filter(Boolean).join(' · ')}</Texto>
                            </View>
                            <Icono nombre="chevron.right" tamano={11} color={t.textSecondary} peso="bold" />
                          </Pressable>
                        ))}
                      </View>
                    </Seccion>
                  ) : null}
                  {p.intereses.length ? (
                    <Seccion titulo={trAuth('perfil.intereses')}>
                      <View style={styles.etiquetas}>{p.intereses.map((i) => <Etiqueta key={i} texto={nombreInteres(i)} />)}</View>
                    </Seccion>
                  ) : null}
                  {p.paisesVisitados.length ? (
                    <Seccion titulo={trAuth('perfil.paisesVisitados', { count: p.paisesVisitados.length })}>
                      <Banderas codigos={p.paisesVisitados} alto={22} gap={8} />
                    </Seccion>
                  ) : null}
                  {p.idiomas.length ? (
                    <Seccion titulo={trAuth('perfil.idiomas')}>
                      <View style={styles.etiquetas}>
                        {p.idiomas.map((c) => <Etiqueta key={c} texto={trAuth(`idiomas.${c}`, { defaultValue: c.toUpperCase() })} />)}
                      </View>
                    </Seccion>
                  ) : null}
                  {vacio ? <Texto v="detalle" secundario>{tr('persona.sinInfo', { nombre: autor.nombreVisible })}</Texto> : null}
                </Animated.View>
              ) : null}

              {/* Seguridad: a mano, sin robar protagonismo */}
              <View style={[styles.acciones, { borderTopColor: t.separator }]}>
                {p?.bloqueada ? null : (
                  <Pressable onPress={() => onBloquear(autor)} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.accion, pressed && { opacity: 0.6 }]}>
                    <Icono nombre="hand.raised" tamano={15} color={t.textSecondary} />
                    <Texto v="detalle" secundario style={{ fontWeight: '600' }}>{tr('bloqueos.bloquearA', { nombre: autor.nombreVisible })}</Texto>
                  </Pressable>
                )}
                <Pressable onPress={() => onReportar(autor)} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.accion, pressed && { opacity: 0.6 }]}>
                  <Icono nombre="flag" tamano={15} color={t.danger} />
                  <Texto v="detalle" style={{ fontWeight: '600', color: t.danger }}>{tr('reportes.reportarA', { nombre: autor.nombreVisible })}</Texto>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.5)' },
  hoja: { flex: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' },
  sinFoto: { height: 240, alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 96, lineHeight: 104, paddingRight: 6 },
  rayitas: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', gap: 4 },
  rayita: { flex: 1, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  degradado: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  sobreFoto: { position: 'absolute', left: 20, right: 20, bottom: 16, gap: 2 },
  filaNombre: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nombre: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 32, lineHeight: 36, paddingRight: 3, flexShrink: 1 },
  cerrar: {
    position: 'absolute', top: 22, right: 14, width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.42)', alignItems: 'center', justifyContent: 'center',
  },
  cuerpo: { paddingHorizontal: 20, paddingTop: 16, gap: 22 },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 10, borderRadius: 6 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8 },
  cargando: { paddingVertical: 28, alignItems: 'center' },
  evento: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, paddingHorizontal: 6, marginHorizontal: -6, borderRadius: 6 },
  miniatura: { width: 46, height: 46, borderRadius: 6, overflow: 'hidden' },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  etiqueta: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 6 },
  acciones: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14, gap: 4 },
  accion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
});
