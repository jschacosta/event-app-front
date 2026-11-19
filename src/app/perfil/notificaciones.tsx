// Ajustes → Notificaciones: un interruptor por cada aviso de Bora, agrupados por tema.
// Arriba, el estado del permiso del teléfono (sin permiso no llega ninguno, aunque estén encendidos).
// Los avisos de mensajes de un canal en particular se silencian desde el menú ⋯ de ese canal.
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonTexto, FilaInterruptor, Grupo, Icono, Texto } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { quiereAviso, type Avisos } from '@/lib/api';
import { activarNotificaciones, cancelarRecordatorios } from '@/lib/notificaciones';

type Permiso = 'si' | 'no' | 'preguntar' | null;

const GRUPOS: { titulo: string; pie?: string; claves: (keyof Avisos)[] }[] = [
  { titulo: 'eventos', claves: ['recordatorio', 'canalAbierto', 'llenandose', 'opinion'] },
  { titulo: 'canales', pie: 'canalesPie', claves: ['respuestas', 'mensajes', 'canalActivo'] },
  { titulo: 'novedades', claves: ['semanal'] },
];

export default function NotificacionesScreen() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { usuario, token, actualizarPerfil } = useSesion();
  const [permiso, setPermiso] = useState<Permiso>(null);
  const [pendiente, setPendiente] = useState<Partial<Avisos>>({});
  const [error, setError] = useState<string | null>(null);

  const leerPermiso = useCallback(() => {
    if (Platform.OS === 'web') return;
    Notifications.getPermissionsAsync()
      .then((p) => setPermiso(p.granted ? 'si' : p.canAskAgain ? 'preguntar' : 'no'))
      .catch(() => {});
  }, []);
  useFocusEffect(leerPermiso); // al volver desde los ajustes del teléfono

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  // El interruptor se mueve al tiro y vuelve atrás si el servidor no lo guarda.
  const cambiar = async (clave: keyof Avisos, valor: boolean) => {
    setPendiente((p) => ({ ...p, [clave]: valor }));
    setError(null);
    try {
      await actualizarPerfil({ avisos: { [clave]: valor } });
      if (clave === 'recordatorio' && !valor) cancelarRecordatorios();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPendiente(({ [clave]: _, ...resto }) => resto);
    }
  };

  const activar = async () => {
    await activarNotificaciones(token, { preguntar: true });
    leerPermiso();
  };

  if (!usuario) return null;
  const valor = (clave: keyof Avisos) => pendiente[clave] ?? quiereAviso(usuario, clave);

  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <View style={[styles.barra, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8, borderBottomColor: t.separator }]}>
        <View style={{ width: 70 }} />
        <Texto v="cuerpoFuerte">{tr('ajustes.notificaciones.titulo')}</Texto>
        <View style={{ width: 70, alignItems: 'flex-end' }}><BotonTexto texto={tr('comun.listo')} onPress={cerrar} /></View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]}>
        {permiso === 'no' || permiso === 'preguntar' ? (
          <View style={[styles.permiso, { backgroundColor: t.card }]}>
            <View style={[styles.icono, { backgroundColor: t.accent }]}>
              <Icono nombre="bell.slash" tamano={18} color={t.onAccent} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Texto v="cuerpoFuerte">{tr('ajustes.notificaciones.sinPermisoTitulo')}</Texto>
              <Texto v="detalle" secundario style={{ lineHeight: 19 }}>
                {permiso === 'no' ? tr('ajustes.notificaciones.bloqueadas') : tr('ajustes.notificaciones.sinPermiso')}
              </Texto>
              <View style={{ marginTop: 8 }}>
                <BotonPrincipal
                  texto={permiso === 'no' ? tr('ajustes.notificaciones.abrirAjustes') : tr('ajustes.notificaciones.activar')}
                  onPress={permiso === 'no' ? () => Linking.openSettings() : activar}
                />
              </View>
            </View>
          </View>
        ) : null}

        {GRUPOS.map((g) => (
          <Grupo key={g.titulo} titulo={tr(`ajustes.notificaciones.grupos.${g.titulo}`)} pie={g.pie ? tr(`ajustes.notificaciones.grupos.${g.pie}`) : undefined}>
            {g.claves.map((clave) => (
              <FilaInterruptor
                key={clave}
                etiqueta={tr(`ajustes.notificaciones.avisos.${clave}.titulo`)}
                detalle={tr(`ajustes.notificaciones.avisos.${clave}.detalle`)}
                valor={valor(clave)}
                onCambio={(v) => cambiar(clave, v)}
              />
            ))}
          </Grupo>
        ))}

        {error ? <Texto v="detalle" style={{ color: t.danger, paddingHorizontal: 16 }}>{error}</Texto> : null}
        <Texto v="detalle" secundario style={{ paddingHorizontal: 16, lineHeight: 19 }}>{tr('ajustes.notificaciones.horario')}</Texto>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  contenido: { padding: 16, gap: 24 },
  permiso: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 10 },
  icono: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
