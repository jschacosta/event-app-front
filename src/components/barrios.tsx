// Filtro "Barrio" de la Agenda: un botón junto a la ciudad y una hoja con los barrios que tienen eventos,
// de más a menos. Cada fila lleva una barra con cuántos eventos tiene, como un gráfico del line-up: de
// un vistazo se ve dónde está pasando todo esta semana.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { FilaOpcion, HojaBora } from '@/components/hoja-bora';
import { IconoBora } from '@/components/iconos-bora';
import { fuenteWeb, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Barrio } from '@/lib/agenda';

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const CON_BUSCADOR = 10;

export function BotonBarrio({ elegido, onAbrir, onQuitar }: { elegido: string | null; onAbrir: () => void; onQuitar: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  if (!elegido) {
    return (
      <Pressable onPress={onAbrir} accessibilityRole="button" accessibilityLabel={tr('barrio.elegir')} hitSlop={6}
        style={({ pressed }) => [styles.boton, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
        <IconoBora nombre="pin" tamano={16} color={t.text} />
        <Texto v="detalle" style={{ fontWeight: '700' }}>{tr('barrio.boton')}</Texto>
      </Pressable>
    );
  }
  return (
    <View style={[styles.boton, styles.elegido, { backgroundColor: t.accent }]}>
      <Pressable onPress={onAbrir} accessibilityRole="button" accessibilityLabel={tr('barrio.cambiar', { barrio: elegido })} hitSlop={6} style={styles.nombre}>
        <IconoBora nombre="pin" tamano={16} color={t.onAccent} />
        <Texto v="detalle" numberOfLines={1} style={{ fontWeight: '700', color: t.onAccent, maxWidth: 130 }}>{elegido}</Texto>
      </Pressable>
      <Pressable onPress={onQuitar} accessibilityRole="button" accessibilityLabel={tr('barrio.quitar')} hitSlop={8} style={styles.quitar}>
        <IconoBora nombre="cerrar" tamano={14} color={t.onAccent} grosor={2.4} />
      </Pressable>
    </View>
  );
}

function Barra({ cuenta, max }: { cuenta: number; max: number }) {
  const t = useTheme();
  return (
    <View style={styles.barraFila}>
      <View style={[styles.riel, { backgroundColor: t.backgroundElement }]}>
        <View style={[styles.relleno, { backgroundColor: t.accent, width: `${Math.max(8, (cuenta / max) * 100)}%` }]} />
      </View>
      <Texto v="pie" style={{ fontWeight: '700', width: 26, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{cuenta}</Texto>
    </View>
  );
}

export function HojaBarrios({ visible, barrios, elegido, onElegir, onCerrar }: {
  visible: boolean; barrios: Barrio[]; elegido: string | null; onElegir: (b: string | null) => void; onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [busqueda, setBusqueda] = useState('');
  const max = barrios[0]?.cuenta ?? 1;
  const lista = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return q ? barrios.filter((b) => sinAcentos(b.nombre).includes(q)) : barrios;
  }, [barrios, busqueda]);
  const elegir = (b: string | null) => {
    setBusqueda('');
    onElegir(b);
    onCerrar();
  };
  return (
    <HojaBora visible={visible} onCerrar={onCerrar} icono="pin" titulo={tr('barrio.titulo')} texto={tr('barrio.ayuda', { count: barrios.length })} alto="82%">
      {barrios.length > CON_BUSCADOR ? (
        <View style={[styles.buscador, { backgroundColor: t.backgroundElement }]}>
          <IconoBora nombre="buscar" tamano={16} color={t.textSecondary} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder={tr('barrio.buscar')}
            placeholderTextColor={t.textSecondary}
            autoCorrect={false}
            style={[styles.entrada, { color: t.text, fontFamily: fuenteWeb }]}
          />
        </View>
      ) : null}
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {busqueda ? null : <FilaOpcion texto={tr('barrio.todos')} elegida={elegido === null ? true : undefined} onPress={() => elegir(null)} />}
        {lista.map((b, i) => (
          <FilaOpcion
            key={b.nombre}
            texto={b.nombre}
            elegida={elegido === b.nombre ? true : undefined}
            ultima={i === lista.length - 1}
            derecha={<Barra cuenta={b.cuenta} max={max} />}
            onPress={() => elegir(b.nombre)}
          />
        ))}
        {lista.length === 0 ? <Texto v="detalle" secundario style={{ paddingVertical: 20, textAlign: 'center' }}>{tr('barrio.sinResultados')}</Texto> : null}
      </ScrollView>
    </HojaBora>
  );
}

const styles = StyleSheet.create({
  boton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 11, borderRadius: 6 },
  elegido: { paddingRight: 4 },
  nombre: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quitar: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  barraFila: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 104 },
  riel: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3 },
  buscador: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, borderRadius: 6, paddingHorizontal: 12, marginBottom: 6 },
  entrada: { flex: 1, fontSize: 16, paddingVertical: 0 },
});
