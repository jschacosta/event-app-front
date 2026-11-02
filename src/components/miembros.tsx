// Personas de una sala del chat (como la lista de miembros de Discord).
// Se abre tocando el título del canal: primero el creador, luego quienes están conectados ahora
// y quienes ya llegaron al lugar. Tocar a alguien abre sus opciones (Instagram, reportar).
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { fuenteWeb, Icono, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor, type Evento } from '@/lib/api';

export type Miembro = Autor & { creador: boolean; enLinea: boolean; aqui: boolean };
type Respuesta = { personas: Miembro[]; total: number; enLinea: number };

const CON_BUSCADOR = 12; // desde cuántas personas aparece el buscador
const VERDE = '#34C759'; // el punto de "en línea", como en iOS

type Props = {
  visible: boolean;
  eventoId: string;
  sala: string;
  titulo: string;
  evento: Evento | null;
  onCerrar: () => void;
  onPersona: (p: Miembro) => void;
  onVerEvento: () => void;
};

export function PantallaMiembros({ visible, ...props }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={props.onCerrar}>
      {/* El Modal es otra ventana en iPhone y Android: necesita su propio proveedor de márgenes seguros. */}
      <SafeAreaProvider>
        {visible ? <ContenidoMiembros {...props} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function ContenidoMiembros({ eventoId, sala, titulo, evento, onCerrar, onPersona, onVerEvento }: Omit<Props, 'visible'>) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token, usuario } = useSesion();
  const [datos, setDatos] = useState<Respuesta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    api<Respuesta>(`/canales/evento/${eventoId}/miembros?sala=${encodeURIComponent(sala)}`, { token })
      .then(setDatos)
      .catch((e: Error) => setError(e.message));
  }, [eventoId, sala, token]);

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!datos) return [];
    return q ? datos.personas.filter((p) => p.nombreVisible.toLowerCase().includes(q)) : datos.personas;
  }, [datos, busqueda]);

  const resumen = datos
    ? [tr('canales.personas', { count: datos.total }), datos.enLinea ? tr('miembros.enLinea', { count: datos.enLinea }) : null].filter(Boolean).join(' · ')
    : '';

  return (
    <View style={[styles.pantalla, { backgroundColor: t.grouped, paddingTop: Platform.OS === 'ios' ? 12 : Math.max(insets.top, 12) }]}>
      <View style={styles.cabeza}>
        <View style={{ flex: 1 }}>
          <Texto v="titulo" numberOfLines={1}>{titulo}</Texto>
          {resumen ? <Texto v="pie" secundario>{resumen}</Texto> : null}
        </View>
        <Pressable
          onPress={onCerrar}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={tr('comun.cerrar')}
          style={({ pressed }) => [styles.cerrar, { backgroundColor: t.backgroundSelected }, pressed && { opacity: 0.6 }]}>
          <Icono nombre="xmark" tamano={14} color={t.text} peso="bold" />
        </Pressable>
      </View>

      {datos && datos.total >= CON_BUSCADOR ? (
        <View style={[styles.buscador, { backgroundColor: t.backgroundSelected }]}>
          <Icono nombre="magnifyingglass" tamano={16} color={t.textSecondary} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder={tr('miembros.buscar')}
            placeholderTextColor={t.textSecondary}
            autoCorrect={false}
            style={[styles.campo, { color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
          />
        </View>
      ) : null}

      {error ? (
        <View style={styles.centro}><Texto secundario>{error}</Texto></View>
      ) : !datos ? (
        <View style={styles.centro}><ActivityIndicator /></View>
      ) : (
        <FlatList
          data={filtradas}
          keyExtractor={(p) => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={evento ? (
            <Pressable
              onPress={onVerEvento}
              accessibilityRole="button"
              style={({ pressed }) => [styles.evento, { backgroundColor: t.card }, pressed && { opacity: 0.7 }]}>
              {evento.imagen ? <Image source={{ uri: evento.imagen }} style={styles.fotoEvento} /> : null}
              <View style={{ flex: 1 }}>
                <Texto v="mini" secundario style={{ textTransform: 'uppercase', fontWeight: '600' }}>{tr('miembros.verEvento')}</Texto>
                <Texto v="cuerpoFuerte" numberOfLines={1}>{evento.titulo}</Texto>
              </View>
              <Icono nombre="chevron.right" tamano={14} color={t.textSecondary} peso="semibold" />
            </Pressable>
          ) : undefined}
          ListEmptyComponent={<Texto secundario style={{ textAlign: 'center', marginTop: 24 }}>{tr(busqueda ? 'miembros.sinResultados' : 'miembros.nadie')}</Texto>}
          renderItem={({ item: p, index }) => {
            const yo = p.id === usuario?.id;
            const primero = index === 0;
            const ultimo = index === filtradas.length - 1;
            return (
              <Pressable
                onPress={() => !yo && onPersona(p)}
                disabled={yo}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.fila,
                  { backgroundColor: t.card },
                  primero && styles.filaPrimera,
                  ultimo && styles.filaUltima,
                  pressed && { opacity: 0.7 },
                ]}>
                <View>
                  <View style={[styles.avatar, { backgroundColor: t.backgroundSelected }]}>
                    {p.foto
                      ? <Image source={{ uri: p.foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
                      : <Text style={{ color: t.text, fontSize: 17, fontWeight: '600' }}>{p.nombreVisible.charAt(0)}</Text>}
                  </View>
                  {p.enLinea ? <View style={[styles.punto, { borderColor: t.card }]} accessibilityLabel={tr('miembros.conectado')} /> : null}
                </View>
                <View style={[styles.datos, !ultimo && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.linea}>
                      <Texto v="cuerpoFuerte" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {yo ? tr('miembros.tu', { nombre: p.nombreVisible }) : p.nombreVisible}
                      </Texto>
                      {p.edadVerificada ? <Icono nombre="checkmark.seal.fill" tamano={13} color={t.textSecondary} /> : null}
                    </View>
                    <View style={styles.linea}>
                      {p.pais ? <Bandera codigo={p.pais} alto={10} /> : null}
                      {p.edad ? <Texto v="pie" secundario>{tr('miembros.anios', { count: p.edad })}</Texto> : null}
                      {p.aqui ? (
                        <View style={[styles.etiqueta, { backgroundColor: t.backgroundSelected }]}>
                          <Icono nombre="location.fill" tamano={9} color={t.text} />
                          <Texto v="mini" style={{ fontWeight: '600' }}>{tr('aqui.sello')}</Texto>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {p.creador || p.admin || p.moderador ? (
                    <Texto v="mini" secundario style={{ fontWeight: '600' }}>
                      {tr(p.creador ? 'miembros.creador' : p.admin ? 'miembros.admin' : 'miembros.moderador')}
                    </Texto>
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1 },
  cabeza: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12 },
  cerrar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 10, height: 36, borderRadius: 10 },
  campo: { flex: 1, fontSize: 17, paddingVertical: 0 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  evento: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 14, marginBottom: 16 },
  fotoEvento: { width: 40, height: 40, borderRadius: 8 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12 },
  filaPrimera: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  filaUltima: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  punto: { position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, borderWidth: 2, backgroundColor: VERDE },
  datos: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingRight: 14, minHeight: 60 },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 16, borderRadius: 8 },
});
