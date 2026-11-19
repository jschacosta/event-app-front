// Grupos de Ajustes: notificaciones, privacidad, ayuda y legal, y cuenta.
// Las notificaciones tienen su pantalla (app/perfil/notificaciones.tsx); aquí solo va la fila que lleva a ella.
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, Pressable, StyleSheet } from 'react-native';

import { Fila, FilaInterruptor, Grupo, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { AVISOS, quiereAviso, type CambiosPerfil, type Usuario } from '@/lib/api';
import { CONTACTO, paginaSitio } from '@/lib/sitio';

type Permiso = 'si' | 'no' | 'preguntar' | null;

// Estado del permiso de notificaciones del teléfono (se vuelve a leer al volver a la app desde Ajustes).
function usePermisoNotificaciones() {
  const [permiso, setPermiso] = useState<Permiso>(null);
  useFocusEffect(useCallback(() => {
    if (Platform.OS === 'web') return;
    let vivo = true;
    Notifications.getPermissionsAsync().then((p) => {
      if (vivo) setPermiso(p.granted ? 'si' : p.canAskAgain ? 'preguntar' : 'no');
    }).catch(() => {});
    return () => { vivo = false; };
  }, []));
  return permiso;
}

// Cambia un ajuste al tiro (el interruptor se mueve antes de que responda el servidor) y lo deshace si falla.
function useCambioInmediato() {
  const { actualizarPerfil } = useSesion();
  const [pendiente, setPendiente] = useState<CambiosPerfil | null>(null);
  const cambiar = async (cambios: CambiosPerfil) => {
    setPendiente(cambios);
    try {
      await actualizarPerfil(cambios);
    } finally {
      setPendiente(null);
    }
  };
  return { pendiente, cambiar };
}

// Una fila que lleva a Ajustes → Notificaciones, con cuántos avisos están encendidos (o "Bloqueadas").
export function GrupoNotificaciones({ usuario, onIr }: { usuario: Usuario; onIr: (ruta: '/perfil/notificaciones') => void }) {
  const { t: tr } = useTranslation();
  const permiso = usePermisoNotificaciones();
  const claves = Object.keys(AVISOS) as (keyof typeof AVISOS)[];
  const encendidos = claves.filter((k) => quiereAviso(usuario, k)).length;
  const valor = permiso === 'no' ? tr('ajustes.notificaciones.bloqueadasCorto') : tr('ajustes.notificaciones.encendidas', { n: encendidos, total: claves.length });
  return (
    <Grupo>
      <Fila etiqueta={tr('ajustes.notificaciones.titulo')} valor={valor} onPress={() => onIr('/perfil/notificaciones')} />
    </Grupo>
  );
}

export function GrupoPrivacidad({ usuario, onIr }: { usuario: Usuario; onIr: (ruta: '/perfil/bloqueados') => void }) {
  const { t: tr } = useTranslation();
  const { pendiente, cambiar } = useCambioInmediato();
  const mostrarEdad = pendiente?.mostrarEdad ?? usuario.mostrarEdad !== false;
  const ocultarApellido = pendiente?.ocultarApellido ?? usuario.ocultarApellido;
  return (
    <Grupo titulo={tr('ajustes.privacidad.titulo')}>
      <FilaInterruptor etiqueta={tr('ajustes.privacidad.mostrarEdad')} valor={mostrarEdad} onCambio={(v) => cambiar({ mostrarEdad: v })} />
      {usuario.apellido ? (
        <FilaInterruptor etiqueta={tr('ajustes.privacidad.soloInicial')} valor={ocultarApellido} onCambio={(v) => cambiar({ ocultarApellido: v })} />
      ) : null}
      <Fila
        etiqueta={tr('bloqueos.titulo')}
        valor={usuario.bloqueados?.length ? String(usuario.bloqueados.length) : undefined}
        onPress={() => onIr('/perfil/bloqueados')}
      />
    </Grupo>
  );
}

export function GrupoLegal() {
  const { t: tr, i18n } = useTranslation();
  const abrir = (ruta: Parameters<typeof paginaSitio>[0]) => WebBrowser.openBrowserAsync(paginaSitio(ruta, i18n.language));
  return (
    <Grupo titulo={tr('ajustes.legal.titulo')} pie={tr('ajustes.legal.pie', { correo: CONTACTO })}>
      <Fila etiqueta={tr('ajustes.legal.normas')} onPress={() => abrir('normas')} />
      <Fila etiqueta={tr('ajustes.legal.privacidad')} onPress={() => abrir('privacidad')} />
      <Fila etiqueta={tr('ajustes.legal.terminos')} onPress={() => abrir('terminos')} />
      <Fila etiqueta={tr('ajustes.legal.contacto')} onPress={() => Linking.openURL(`mailto:${CONTACTO}?subject=Bora`)} />
    </Grupo>
  );
}

export function GrupoCuenta({ usuario, onCerrar }: { usuario: Usuario; onCerrar: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { t: trAuth } = useTranslation('auth');
  const { salir } = useSesion();
  return (
    <Grupo pie={usuario.email && usuario.proveedor !== 'email' ? trAuth('perfil.conectadoComo', { email: usuario.email }) : undefined}>
      {usuario.proveedor === 'email' ? (
        <Fila etiqueta={tr('ajustes.cuenta.correo')} valor={usuario.email ?? undefined} onPress={() => { onCerrar(); router.push('/perfil/correo'); }} />
      ) : null}
      <Pressable onPress={() => { onCerrar(); salir(); }} accessibilityRole="button" style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundSelected }]}>
        <Texto>{trAuth('perfil.cerrarSesion')}</Texto>
      </Pressable>
      <Pressable onPress={() => { onCerrar(); router.push('/perfil/eliminar'); }} accessibilityRole="button" style={({ pressed }) => [styles.fila, pressed && { backgroundColor: t.backgroundSelected }]}>
        <Texto style={{ color: t.danger }}>{tr('ajustes.cuenta.eliminar')}</Texto>
      </Pressable>
    </Grupo>
  );
}

const styles = StyleSheet.create({
  fila: { minHeight: 48, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
});
