// Fila "Te avisamos 2 h antes · Cambiar" en la ficha de un evento marcado, y su hoja para elegir cuándo.
// Si los recordatorios están apagados en Ajustes, o el teléfono bloqueó las notificaciones, la fila lo dice
// y lleva a donde se arregla (no se queda prometiendo un aviso que no va a llegar).
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { FilaOpcion, HojaBora } from '@/components/hoja-bora';
import { IconoBora } from '@/components/iconos-bora';
import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import { hora } from '@/lib/fechas';
import { estadoPermiso, horasRecordatorio } from '@/lib/notificaciones';
import { cambiarModo, useModoRecordatorio, useRecordatoriosActivos, type ModoRecordatorio } from '@/lib/recordatorios';

export function FilaRecordatorio({ evento }: { evento: Evento }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const modo = useModoRecordatorio(evento.id);
  const activos = useRecordatoriosActivos();
  const [abierta, setAbierta] = useState(false);
  const [permiso, setPermiso] = useState<'si' | 'preguntar' | 'no'>('si');
  // Al volver de los ajustes del teléfono se revisa de nuevo.
  useFocusEffect(useCallback(() => { estadoPermiso().then(setPermiso); }, []));

  if (Platform.OS === 'web' || !evento.miAsistencia) return null;
  const h = horasRecordatorio(evento.inicio);
  if (!h.antes && !h.dia) return null; // ya no queda ningún recordatorio por delante

  // Lo que de verdad queda por sonar (el aviso del día anterior puede haber pasado ya).
  const efectivo: ModoRecordatorio = modo === 'ambos' ? (h.dia ? (h.antes ? 'ambos' : 'dia') : 'antes')
    : (modo === 'dia' && !h.dia) || (modo === 'antes' && !h.antes) ? 'no' : modo;
  const estado = !activos
    ? { texto: tr('recordatorio.apagados'), accion: tr('recordatorio.activar'), ir: () => router.push('/perfil/notificaciones') }
    : permiso === 'no'
      ? { texto: tr('recordatorio.bloqueadas'), accion: tr('recordatorio.abrirAjustes'), ir: () => Linking.openSettings() }
      : { texto: tr(`recordatorio.fila.${efectivo}`), accion: tr('recordatorio.cambiar'), ir: () => setAbierta(true) };
  const apagado = !activos || permiso === 'no' || efectivo === 'no';

  const elegir = (m: ModoRecordatorio) => {
    setAbierta(false);
    cambiarModo(evento, m).then(() => estadoPermiso().then(setPermiso));
  };
  const opciones: { modo: ModoRecordatorio; detalle?: string }[] = [
    ...(h.antes ? [{ modo: 'antes' as const, detalle: tr('recordatorio.aLas', { hora: hora(h.antes.toISOString()) }) }] : []),
    ...(h.dia ? [{ modo: 'dia' as const, detalle: tr('recordatorio.diaAntesDetalle', { hora: hora(h.dia.toISOString()) }) }] : []),
    ...(h.antes && h.dia ? [{ modo: 'ambos' as const }] : []),
    { modo: 'no' },
  ];

  return (
    <>
      <Pressable
        onPress={estado.ir}
        accessibilityRole="button"
        accessibilityLabel={`${estado.texto}. ${estado.accion}`}
        style={({ pressed }) => [styles.fila, { borderColor: t.separator }, pressed && { opacity: 0.6 }]}>
        <View style={[styles.circulo, { backgroundColor: apagado ? t.backgroundElement : t.accentSoft }]}>
          <IconoBora nombre="campana" tamano={17} color={apagado ? t.textSecondary : t.accentSoftText} />
        </View>
        <Texto v="detalle" style={{ flex: 1, fontWeight: '600', color: apagado ? t.textSecondary : t.text }} numberOfLines={2}>{estado.texto}</Texto>
        <Texto v="detalle" style={{ fontWeight: '700', color: t.accentText }}>{estado.accion}</Texto>
      </Pressable>
      <HojaBora visible={abierta} onCerrar={() => setAbierta(false)} icono="campana" titulo={tr('recordatorio.titulo')} texto={evento.titulo}>
        {opciones.map((o) => (
          <FilaOpcion
            key={o.modo}
            texto={tr(`recordatorio.opcion.${o.modo}`)}
            detalle={o.detalle}
            elegida={modo === o.modo}
            onPress={() => elegir(o.modo)}
          />
        ))}
        <FilaOpcion
          texto={tr('recordatorio.todos')}
          detalle={tr('recordatorio.todosDetalle')}
          flecha
          ultima
          onPress={() => { setAbierta(false); router.push('/perfil/notificaciones'); }}
        />
      </HojaBora>
    </>
  );
}

const styles = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, paddingVertical: 8, paddingHorizontal: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6 },
  circulo: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
