import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { BotonTexto, Icono, Texto, fuenteWeb } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { paisesOrdenados } from '@/lib/paises';

// Hoja para elegir uno o varios países, con buscador.
export function SelectorPaises({ visible, titulo, multiple, seleccion, onListo, onCerrar }: {
  visible: boolean;
  titulo: string;
  multiple?: boolean;
  seleccion: string[];
  onListo: (codigos: string[]) => void;
  onCerrar: () => void;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr, i18n } = useTranslation();
  const [busqueda, setBusqueda] = useState('');
  const [elegidos, setElegidos] = useState<string[]>(seleccion);

  const lista = useMemo(() => {
    // Búsqueda sin tildes: "peru" encuentra "Perú".
    const normal = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = normal(busqueda.trim());
    const todos = paisesOrdenados();
    return q ? todos.filter((p) => normal(p.nombre).includes(q)) : todos;
    // i18n.language: el orden y los nombres cambian con el idioma
  }, [busqueda, i18n.language]);

  const tocar = (codigo: string) => {
    if (!multiple) return onListo([codigo]);
    setElegidos((prev) => (prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]));
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar} onShow={() => setElegidos(seleccion)}>
      <View style={[styles.hoja, { backgroundColor: t.grouped, paddingBottom: insets.bottom }]}>
        <View style={styles.barra}>
          <BotonTexto texto={tr('comun.cancelar')} onPress={onCerrar} />
          <Texto v="cuerpoFuerte">{titulo}</Texto>
          {multiple ? <BotonTexto texto={tr('comun.listo')} onPress={() => onListo(elegidos)} /> : <View style={{ width: 60 }} />}
        </View>
        <View style={[styles.buscador, { backgroundColor: t.segmentTrack }]}>
          <Icono nombre="magnifyingglass" tamano={15} color={t.textSecondary} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder={tr('comun.buscar')}
            placeholderTextColor={t.textSecondary}
            style={[styles.input, { color: t.text, fontFamily: fuenteWeb }]}
          />
        </View>
        <FlatList
          data={lista}
          keyExtractor={(p) => p.codigo}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item, index }) => {
            const activo = elegidos.includes(item.codigo);
            return (
              <Pressable
                onPress={() => tocar(item.codigo)}
                style={[
                  styles.fila,
                  { backgroundColor: t.card, borderTopColor: t.separator },
                  index === 0 && styles.primera,
                  index === lista.length - 1 && styles.ultima,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                ]}>
                <Bandera codigo={item.codigo} alto={18} />
                <Texto style={{ flex: 1 }}>{item.nombre}</Texto>
                {activo && <Icono nombre="checkmark" tamano={16} color={t.text} peso="semibold" />}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hoja: { flex: 1 },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  buscador: { marginHorizontal: 16, marginBottom: 12, height: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8 },
  input: { flex: 1, fontSize: 17, paddingVertical: 0 },
  fila: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  primera: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  ultima: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12, marginBottom: 24 },
});
