// Fila de un evento en listas verticales (resultados de búsqueda, todos los eventos de un día).
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import { diaCorto, hora, precioTexto } from '@/lib/fechas';
import { iconoGenero, nombreGenero } from '@/lib/generos';
import type { Grupo } from '@/lib/series';

export function FilaEvento({ evento, repeticiones = 1, soloHora }: { evento: Evento; repeticiones?: number; soloHora?: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const detalle = [
    soloHora ? hora(evento.inicio) : `${diaCorto(evento.inicio)} ${hora(evento.inicio)}`,
    repeticiones > 1 ? tr('agenda.fechas', { count: repeticiones }) : null,
    evento.lugar ?? evento.barrio,
    precioTexto(evento.precioDesde),
  ].filter(Boolean).join(' · ');
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/evento/[id]', params: { id: evento.id } })}
      style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundSelected }]}>
      <View style={[styles.foto, { backgroundColor: t.backgroundElement }]}>
        {evento.imagen ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto v="cuerpoFuerte" numberOfLines={1}>{evento.titulo}</Texto>
        <Texto v="pie" secundario numberOfLines={1}>{detalle}</Texto>
        <View style={styles.generos}>
          {evento.chatAbierto && (
            <View style={styles.etiqueta}>
              <View style={[styles.puntoVivo, { backgroundColor: t.live }]} />
              <Texto v="mini" secundario style={{ fontWeight: '600' }}>{tr('agenda.chatAbierto')}</Texto>
            </View>
          )}
          {evento.generos.slice(0, 2).map((g) => (
            <View key={g} style={styles.etiqueta}>
              <MaterialCommunityIcons name={iconoGenero(g)} size={12} color={t.textSecondary} />
              <Texto v="mini" secundario>{nombreGenero(g)}</Texto>
            </View>
          ))}
        </View>
      </View>
      <Icono nombre="chevron.right" tamano={13} color={t.chevron} peso="semibold" />
    </Pressable>
  );
}

// Tarjeta agrupada con filas separadas por líneas finas, como las listas de iOS.
export function ListaEventos({ grupos, soloHora }: { grupos: Grupo[]; soloHora?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.lista, { backgroundColor: t.card }]}>
      {grupos.map((g, i) => (
        <View key={g.evento.id}>
          {i > 0 && <View style={[styles.separador, { backgroundColor: t.separator }]} />}
          <FilaEvento evento={g.evento} repeticiones={g.repeticiones} soloHora={soloHora} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: { borderRadius: 16, overflow: 'hidden' },
  separador: { height: StyleSheet.hairlineWidth, marginLeft: 92 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 14 },
  foto: { width: 68, height: 68, borderRadius: 12, overflow: 'hidden' },
  generos: { flexDirection: 'row', gap: 10, marginTop: 2, alignItems: 'center' },
  etiqueta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  puntoVivo: { width: 7, height: 7, borderRadius: 4 },
});
