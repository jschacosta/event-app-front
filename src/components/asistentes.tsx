// Quiénes marcaron "Voy", "Tal vez" o "Previa" en un evento, con su foto, país y si van solos o ya llegaron.
// Se abre desde la ficha del evento y desde el menú del chat. Tocar a alguien abre sus opciones.
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { BotonTexto, Icono, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Asistente, type Autor } from '@/lib/api';

export type EstadoAsistencia = 'voy' | 'talvez' | 'previa';
type Lista = Record<EstadoAsistencia, Asistente[]>;
const ESTADOS: EstadoAsistencia[] = ['voy', 'talvez', 'previa'];

export function HojaAsistentes({ visible, eventoId, inicial = 'voy', onCerrar, onPersona }: {
  visible: boolean; eventoId: string; inicial?: EstadoAsistencia; onCerrar: () => void; onPersona?: (p: Autor) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { token, usuario } = useSesion();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState<Lista | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoAsistencia>(inicial);

  // Al abrir, se elige la pestaña pedida y se carga la lista.
  const [abiertaCon, setAbiertaCon] = useState<string | null>(null);
  const clave = visible ? inicial : null;
  if (clave !== abiertaCon) {
    setAbiertaCon(clave);
    if (clave) setEstado(clave);
  }
  useEffect(() => {
    if (!visible || !token) return;
    let vivo = true;
    api<Lista>(`/events/${eventoId}/asistentes`, { token })
      .then((r) => { if (vivo) { setLista(r); setError(null); } })
      .catch((e: Error) => { if (vivo) setError(e.message); });
    return () => { vivo = false; };
  }, [visible, eventoId, token]);

  const personas = lista?.[estado] ?? [];
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <View style={[styles.pantalla, { backgroundColor: t.grouped, paddingBottom: insets.bottom }]}>
        <View style={styles.cabeza}>
          <View style={{ width: 70 }} />
          <Texto v="cuerpoFuerte">{tr('asistentes.titulo')}</Texto>
          <View style={{ width: 70, alignItems: 'flex-end' }}><BotonTexto texto={tr('comun.listo')} onPress={onCerrar} /></View>
        </View>
        <View style={[styles.segmento, { backgroundColor: t.segmentTrack }]}>
          {ESTADOS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setEstado(e)}
              accessibilityRole="tab"
              accessibilityState={{ selected: estado === e }}
              style={[styles.opcion, estado === e && [styles.opcionElegida, { backgroundColor: t.segmentThumb }]]}>
              <Text style={[styles.opcionTexto, { color: estado === e ? t.text : t.textSecondary }]}>
                {tr(`asistentes.${e}`)}{lista ? ` · ${lista[e].length}` : ''}
              </Text>
            </Pressable>
          ))}
        </View>
        {!lista && !error ? <ActivityIndicator style={{ marginTop: 40 }} /> : error ? (
          <Texto secundario style={styles.vacio}>{error}</Texto>
        ) : (
          <Animated.View key={estado} entering={FadeIn.duration(160)} style={{ flex: 1 }}>
            <FlatList
              data={personas}
              keyExtractor={(p) => p.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              ListEmptyComponent={<Texto secundario style={styles.vacio}>{tr(`asistentes.vacio_${estado}`)}</Texto>}
              renderItem={({ item: p, index }) => (
                <Pressable
                  onPress={() => p.id !== usuario?.id && onPersona?.(p)}
                  style={({ pressed }) => [
                    styles.fila, { backgroundColor: t.card },
                    index === 0 && styles.primera, index === personas.length - 1 && styles.ultima,
                    pressed && { backgroundColor: t.backgroundSelected },
                  ]}>
                  {p.foto
                    ? <Image source={{ uri: p.foto }} style={styles.foto} cachePolicy="memory-disk" />
                    : <View style={[styles.foto, styles.sinFoto, { backgroundColor: t.backgroundSelected }]}><Text style={{ color: t.textSecondary, fontWeight: '600' }}>{p.nombreVisible.charAt(0)}</Text></View>}
                  <View style={[styles.cuerpo, index < personas.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
                    <View style={styles.linea}>
                      <Text style={[styles.nombre, { color: t.text }]} numberOfLines={1}>{p.id === usuario?.id ? `${p.nombreVisible} (${tr('chat.tu')})` : p.nombreVisible}</Text>
                      {p.pais ? <Bandera codigo={p.pais} alto={11} /> : null}
                      {p.edadVerificada ? <Icono nombre="checkmark.seal.fill" tamano={12} color={t.textSecondary} /> : null}
                    </View>
                    <View style={styles.linea}>
                      {p.aqui ? <Etiqueta texto={tr('aqui.sello')} icono="location.fill" /> : null}
                      {p.solo ? <Etiqueta texto={tr('asistentes.solo')} icono="person" /> : null}
                    </View>
                  </View>
                </Pressable>
              )}
            />
          </Animated.View>
        )}
      </View>
    </Modal>
  );
}

function Etiqueta({ texto, icono }: { texto: string; icono: string }) {
  const t = useTheme();
  return (
    <View style={[styles.etiqueta, { backgroundColor: t.backgroundElement }]}>
      <Icono nombre={icono} tamano={10} color={t.textSecondary} />
      <Text style={[styles.etiquetaTexto, { color: t.textSecondary }]}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  segmento: { flexDirection: 'row', borderRadius: 9, padding: 2, marginHorizontal: 16, marginBottom: 14 },
  opcion: { flex: 1, height: 32, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  opcionElegida: { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  opcionTexto: { fontSize: 13, fontWeight: '600', fontFamily: fuenteWeb },
  vacio: { textAlign: 'center', marginTop: 40, paddingHorizontal: 24 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12 },
  primera: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  ultima: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  foto: { width: 40, height: 40, borderRadius: 20 },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flex: 1, minHeight: 58, justifyContent: 'center', gap: 3, paddingRight: 12, paddingVertical: 8 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nombre: { flexShrink: 1, fontSize: 16, fontWeight: '600', fontFamily: fuenteWeb },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 18, borderRadius: 9 },
  etiquetaTexto: { fontSize: 11, fontWeight: '600', fontFamily: fuenteWeb },
});
