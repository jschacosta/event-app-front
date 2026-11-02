// "Mis canales": las salas donde ya entré, como la lista de chats de WhatsApp
// (foto del evento, último mensaje, hora y no leídos). Y la hoja para elegir el evento al crear un canal.
import { Image } from 'expo-image';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { BarraBusqueda } from '@/components/filtros';
import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import { crearBuscador } from '@/lib/buscar-eventos';
import { diaCorto, etiquetaDiaChat, hora, horaDispositivo } from '@/lib/fechas';
import { quitarFormato } from '@/lib/formato';
import { textoCuenta } from '@/lib/no-leidos';

export type MiCanal = {
  clave: string;
  eventoId: string;
  sala: string;
  evento: { titulo: string; imagen: string | null; inicio: string; fin: string };
  canal: { nombre: string; privado: boolean; esMio: boolean; soloAvisos?: boolean } | null;
  ultimo: { texto: string; encuesta: boolean; autor: string; mio: boolean; fecha: string } | null;
  noLeidos: number;
  actividad: string;
};

const BANDERA_SALA: Record<string, string> = { es: 'ES', en: 'GB', pt: 'BR' };

// Los canales propios no llevan la foto del evento: un círculo de color con su inicial, para
// distinguirlos de las salas de idioma. El color sale del nombre, así cada canal mantiene el suyo.
const COLORES_CANAL = ['#5E5CE6', '#FF6B3D', '#30A46C', '#E5484D', '#0A84FF', '#D6409F', '#AD7F00', '#12A594'];
function colorCanal(nombre: string) {
  let h = 0;
  for (const letra of nombre) h = (h * 31 + letra.charCodeAt(0)) >>> 0;
  return COLORES_CANAL[h % COLORES_CANAL.length];
}

// "21:40" si fue hoy; si no, "Ayer", "Jueves" o "12 de octubre".
function cuando(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  return d.toDateString() === hoy.toDateString() ? horaDispositivo(iso) : etiquetaDiaChat(iso);
}

export const FilaMiCanal = memo(function FilaMiCanal({ c, nuevos, ultima, onAbrir, onOpciones }: {
  c: MiCanal; nuevos: number; ultima: boolean; onAbrir: (c: MiCanal) => void; onOpciones: (c: MiCanal) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const titulo = c.canal?.nombre ?? c.evento.titulo;
  // En las salas de idioma se dice cuál es; en los canales propios, que es un canal y de qué evento.
  const contexto = c.canal ? `${tr('canales.etiquetaCanal')} · ${c.evento.titulo}` : c.sala === 'general' ? tr('canales.general') : c.sala.toUpperCase();
  const ultimo = c.ultimo
    ? `${c.ultimo.mio ? tr('chat.tu') : c.ultimo.autor.split(' ')[0]}: ${c.ultimo.encuesta ? '📊 ' : ''}${quitarFormato(c.ultimo.texto)}`
    : tr('canales.sinMensajes');

  return (
    <Pressable
      onPress={() => onAbrir(c)}
      onLongPress={() => onOpciones(c)}
      delayLongPress={350}
      {...(Platform.OS === 'web' ? { onContextMenu: (e: { preventDefault: () => void }) => { e.preventDefault(); onOpciones(c); } } : {})}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}${nuevos ? `, ${tr('chat.nuevos', { count: nuevos })}` : ''}`}
      accessibilityHint={tr('canales.mantenerParaSalir')}
      style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundElement }]}>
      <View>
        {c.canal ? (
          <View style={[styles.foto, { backgroundColor: colorCanal(c.canal.nombre) }]}>
            <Text style={styles.inicial}>{[...c.canal.nombre.trim()][0]?.toUpperCase() ?? '#'}</Text>
          </View>
        ) : (
          <View style={[styles.foto, { backgroundColor: t.backgroundSelected }]}>
            {c.evento.imagen
              ? <Image source={{ uri: c.evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              : <Icono nombre="bubble.left.and.bubble.right" tamano={20} color={t.textSecondary} />}
          </View>
        )}
        {/* Sello en la foto: qué sala es (bandera, globo o el ícono del canal propio). */}
        <View style={[styles.sello, { backgroundColor: c.canal ? t.text : t.background, borderColor: t.background }]}>
          {c.canal
            ? <Icono nombre={c.canal.privado ? 'lock.fill' : c.canal.soloAvisos ? 'megaphone' : 'bubble.left.and.bubble.right'} tamano={9} color={t.background} />
            : BANDERA_SALA[c.sala]
              ? <Bandera codigo={BANDERA_SALA[c.sala]} alto={9} />
              : <Icono nombre="globe" tamano={11} color={t.text} />}
        </View>
      </View>
      <View style={[styles.datos, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
        <View style={styles.linea}>
          <Texto v="cuerpoFuerte" numberOfLines={1} style={{ flex: 1 }}>{titulo}</Texto>
          <Texto v="mini" style={{ color: nuevos ? t.text : t.textSecondary, fontWeight: nuevos ? '700' : '400' }}>
            {cuando(c.ultimo?.fecha ?? c.actividad)}
          </Texto>
        </View>
        <View style={styles.linea}>
          <View style={{ flex: 1, gap: 1 }}>
            <Texto v="mini" secundario numberOfLines={1} style={{ fontWeight: '600' }}>{contexto}</Texto>
            <Texto v="pie" numberOfLines={1} style={{ color: nuevos ? t.text : t.textSecondary }}>{ultimo}</Texto>
          </View>
          {nuevos > 0 ? (
            <View style={[styles.cuenta, { backgroundColor: t.text }]}>
              <Text style={[styles.cuentaTexto, { color: t.background }]}>{textoCuenta(nuevos)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

// ---------- Elegir el evento al crear un canal desde la pantalla de Canales ----------
export function HojaElegirEvento({ visible, eventos, ciudad, onElegir, onCerrar }: {
  visible: boolean; eventos: Evento[]; ciudad: string; onElegir: (e: Evento) => void; onCerrar: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaProvider>
        {visible ? <ContenidoElegir eventos={eventos} ciudad={ciudad} onElegir={onElegir} onCerrar={onCerrar} /> : null}
      </SafeAreaProvider>
    </Modal>
  );
}

function ContenidoElegir({ eventos, ciudad, onElegir, onCerrar }: {
  eventos: Evento[]; ciudad: string; onElegir: (e: Evento) => void; onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const [consulta, setConsulta] = useState('');
  const buscar = useMemo(() => crearBuscador(eventos), [eventos]);
  const lista = consulta.trim().length >= 2 ? buscar(consulta) : eventos;

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped, paddingTop: Platform.OS === 'ios' ? 12 : Math.max(insets.top, 12) }}>
      <View style={styles.cabeza}>
        <View style={{ flex: 1, gap: 2 }}>
          <Texto v="titulo">{tr('canales.elegirEvento')}</Texto>
          <Texto v="pie" secundario>{tr('canales.elegirEventoAyuda')}</Texto>
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
      {eventos.length > 6 ? (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <BarraBusqueda valor={consulta} onCambio={setConsulta} placeholder={tr('canales.buscar')} />
        </View>
      ) : null}
      <FlatList
        data={lista}
        keyExtractor={(e) => e.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        ListEmptyComponent={
          <Texto secundario style={{ textAlign: 'center', marginTop: 24 }}>
            {consulta.trim() ? tr('agenda.sinResultados', { q: consulta.trim() }) : tr('canales.sinAbiertos', { ciudad })}
          </Texto>
        }
        renderItem={({ item: e, index }) => (
          <Pressable
            onPress={() => onElegir(e)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.filaEvento,
              { backgroundColor: t.card },
              index === 0 && styles.primera,
              index === lista.length - 1 && styles.ultimaFila,
              pressed && { opacity: 0.7 },
            ]}>
            <View style={[styles.fotoEvento, { backgroundColor: t.backgroundSelected }]}>
              {e.imagen ? <Image source={{ uri: e.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
            </View>
            <View style={[styles.datosEvento, index < lista.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto v="cuerpoFuerte" numberOfLines={1}>{e.titulo}</Texto>
                <Texto v="pie" secundario numberOfLines={1}>
                  {[`${diaCorto(e.inicio)} ${hora(e.inicio)}`, e.lugar ?? e.barrio].filter(Boolean).join(' · ')}
                </Texto>
              </View>
              <Icono nombre="plus" tamano={16} color={t.textSecondary} peso="semibold" />
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20 },
  foto: { width: 52, height: 52, borderRadius: 26, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' },
  sello: {
    position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  datos: { flex: 1, gap: 2, paddingVertical: 11, paddingRight: 20, minHeight: 74, justifyContent: 'center' },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cuenta: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  cuentaTexto: { fontSize: 12, fontWeight: '700' },
  cabeza: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
  cerrar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  filaEvento: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 12 },
  primera: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  ultimaFila: { borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  fotoEvento: { width: 44, height: 44, borderRadius: 10, overflow: 'hidden' },
  datosEvento: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingRight: 14, minHeight: 64 },
});
