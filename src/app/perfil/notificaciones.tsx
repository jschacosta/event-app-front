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
import { api, quiereAviso, type Avisos } from '@/lib/api';
import { activarNotificaciones, cancelarRecordatorios, estadoPush } from '@/lib/notificaciones';

type Permiso = 'si' | 'no' | 'preguntar' | null;
type ResultadoPrueba = { tokens: number; errores?: string[]; resultados: { estado: string; error: string | null; mensaje: string | null }[] };

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

  // Prueba: registra de nuevo este teléfono y se manda una notificación; se muestra qué pasó.
  const [prueba, setPrueba] = useState<{ cargando: boolean; lineas: string[] }>({ cargando: false, lineas: [] });
  const probar = async () => {
    setPrueba({ cargando: true, lineas: [] });
    const lineas: string[] = [];
    const conPush = await activarNotificaciones(token, { preguntar: true });
    leerPermiso();
    if (!conPush) lineas.push(tr('ajustes.notificaciones.prueba.registro', { detalle: estadoPush().error ?? '?' }));
    try {
      const r = await api<ResultadoPrueba>('/me/push/prueba', { metodo: 'POST', token });
      if (!r.tokens) lineas.push(tr('ajustes.notificaciones.prueba.sinToken'));
      for (const e of r.errores ?? []) lineas.push(tr('ajustes.notificaciones.prueba.error', { detalle: e }));
      for (const x of r.resultados) {
        lineas.push(x.estado === 'ok'
          ? tr('ajustes.notificaciones.prueba.enviada')
          : tr('ajustes.notificaciones.prueba.error', { detalle: [x.error, x.mensaje].filter(Boolean).join(' · ') || x.estado }));
      }
    } catch (e) {
      lineas.push(tr('ajustes.notificaciones.prueba.error', { detalle: e instanceof Error ? e.message : String(e) }));
    }
    setPrueba({ cargando: false, lineas });
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

        <View style={[styles.prueba, { backgroundColor: t.card }]}>
          <Texto v="cuerpoFuerte">{tr('ajustes.notificaciones.prueba.titulo')}</Texto>
          <Texto v="detalle" secundario style={{ lineHeight: 19 }}>{tr('ajustes.notificaciones.prueba.detalle')}</Texto>
          <View style={{ marginTop: 4 }}>
            <BotonPrincipal texto={prueba.cargando ? tr('ajustes.notificaciones.prueba.enviando') : tr('ajustes.notificaciones.prueba.boton')} onPress={prueba.cargando ? () => {} : probar} />
          </View>
          {prueba.lineas.map((l, i) => <Texto key={i} v="detalle" selectable style={{ lineHeight: 19 }}>{l}</Texto>)}
        </View>

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
  prueba: { gap: 6, padding: 14, borderRadius: 10 },
  icono: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
