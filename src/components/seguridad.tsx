// Seguridad de los canales: bloquear personas y el modo lento.
// Cada acción se confirma con un modal propio que explica qué va a pasar antes de hacerlo.
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { Icono, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Autor } from '@/lib/api';

type NombreIcono = Parameters<typeof Icono>[0]['nombre'];
type Punto = { icono: NombreIcono; texto: string };

// ---------- Modal base: ícono, título, qué va a pasar y el botón para hacerlo ----------
export function ModalExplicacion({ visible, icono, titulo, intro, puntos, children, accion, destructiva, deshabilitada, onAceptar, onCerrar }: {
  visible: boolean;
  icono: NombreIcono;
  titulo: string;
  intro?: string;
  puntos: Punto[];
  children?: ReactNode;
  accion: string;
  destructiva?: boolean;
  deshabilitada?: boolean;
  onAceptar: () => Promise<string | null | void>; // devuelve un error para mostrarlo
  onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada vez que se abre, parte limpio.
  const [abierto, setAbierto] = useState(visible);
  if (abierto !== visible) {
    setAbierto(visible);
    if (visible) {
      setError(null);
      setOcupado(false);
    }
  }

  const aceptar = async () => {
    setOcupado(true);
    setError(null);
    const e = await onAceptar();
    setOcupado(false);
    if (e) setError(e);
  };

  const colorAccion = destructiva ? t.danger : t.accent;
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible ? (
        <View style={styles.contenedor}>
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={ZoomIn.springify().damping(18).stiffness(260)}
            exiting={FadeOut.duration(120)}
            accessibilityViewIsModal
            style={[styles.tarjeta, { backgroundColor: t.card }]}>
            <View style={[styles.icono, { backgroundColor: destructiva ? 'rgba(255,59,48,0.14)' : t.backgroundSelected }]}>
              <Icono nombre={icono} tamano={26} color={destructiva ? t.danger : t.text} peso="semibold" />
            </View>
            <Texto v="titulo" style={{ textAlign: 'center' }}>{titulo}</Texto>
            {intro ? <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{intro}</Texto> : null}
            {children}
            <View style={styles.puntos}>
              {puntos.map((p) => (
                <View key={p.texto} style={styles.punto}>
                  <Icono nombre={p.icono} tamano={18} color={t.textSecondary} />
                  <Texto v="detalle" style={{ flex: 1 }}>{p.texto}</Texto>
                </View>
              ))}
            </View>
            {error ? <Texto v="pie" style={{ color: t.danger, textAlign: 'center' }}>{error}</Texto> : null}
            <View style={styles.botones}>
              <Pressable
                onPress={aceptar}
                disabled={ocupado || deshabilitada}
                accessibilityRole="button"
                style={({ pressed }) => [styles.boton, { backgroundColor: colorAccion }, (pressed || deshabilitada) && { opacity: deshabilitada ? 0.4 : 0.8 }]}>
                {ocupado
                  ? <ActivityIndicator color={destructiva ? '#FFFFFF' : t.onAccent} />
                  : <Texto v="cuerpoFuerte" style={{ color: destructiva ? '#FFFFFF' : t.onAccent }}>{accion}</Texto>}
              </Pressable>
              <Pressable onPress={onCerrar} accessibilityRole="button" style={({ pressed }) => [styles.boton, pressed && { opacity: 0.6 }]}>
                <Texto v="cuerpoFuerte">{tr('comun.cancelar')}</Texto>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </Modal>
  );
}

// ---------- Bloquear ----------
export function useBloqueos() {
  const { token, usuario, fijarUsuario } = useSesion();
  const ids = useMemo(() => new Set(usuario?.bloqueados ?? []), [usuario?.bloqueados]);

  const cambiar = async (persona: Autor, bloquear: boolean) => {
    const r = await api<{ bloqueados: string[] }>(
      bloquear ? '/me/bloqueos' : `/me/bloqueos/${persona.id}`,
      { metodo: bloquear ? 'POST' : 'DELETE', token, body: bloquear ? { usuarioId: persona.id } : undefined },
    );
    fijarUsuario((u) => (u ? { ...u, bloqueados: r.bloqueados } : u));
  };
  return { ids, cambiar };
}

// `modo`: bloquear o desbloquear a `persona` (null = cerrado).
export function ModalBloquear({ persona, modo, onCerrar, onHecho }: {
  persona: Autor | null;
  modo: 'bloquear' | 'desbloquear';
  onCerrar: () => void;
  onHecho?: (persona: Autor) => void;
}) {
  const { t: tr } = useTranslation();
  const { cambiar } = useBloqueos();
  // Se guarda la última persona para que el texto no desaparezca mientras el modal se cierra.
  const [ultima, setUltima] = useState(persona);
  if (persona && persona !== ultima) setUltima(persona);
  const nombre = ultima?.nombreVisible ?? '';
  const bloquear = modo === 'bloquear';

  const puntos: Punto[] = bloquear
    ? [
      { icono: 'eye.slash', texto: tr('bloqueos.puntoMensajes') },
      { icono: 'bell.slash', texto: tr('bloqueos.puntoNoLeidos') },
      { icono: 'hand.raised', texto: tr('bloqueos.puntoSinAviso') },
      { icono: 'arrow.uturn.backward', texto: tr('bloqueos.puntoDeshacer') },
    ]
    : [
      { icono: 'eye', texto: tr('bloqueos.puntoVolver') },
      { icono: 'hand.raised', texto: tr('bloqueos.puntoSinAvisoDesbloqueo') },
    ];

  return (
    <ModalExplicacion
      visible={Boolean(persona)}
      icono={bloquear ? 'hand.raised' : 'person'}
      titulo={tr(bloquear ? 'bloqueos.tituloBloquear' : 'bloqueos.tituloDesbloquear', { nombre })}
      puntos={puntos}
      accion={tr(bloquear ? 'bloqueos.bloquear' : 'bloqueos.desbloquear')}
      destructiva={bloquear}
      onCerrar={onCerrar}
      onAceptar={async () => {
        if (!persona) return null;
        try {
          await cambiar(persona, bloquear);
        } catch (e) {
          return e instanceof Error ? e.message : '';
        }
        onCerrar();
        onHecho?.(persona);
        return null;
      }}
    />
  );
}

// ---------- Perfil incompleto: qué falta para escribir y un botón que lleva a completarlo ----------
export function ModalPerfilIncompleto({ visible, onCerrar }: { visible: boolean; onCerrar: () => void }) {
  const { t: tr } = useTranslation();
  const { usuario } = useSesion();
  const requisitos: [boolean, Punto][] = [
    [!usuario?.nombre, { icono: 'person', texto: tr('perfilIncompleto.nombre') }],
    [!usuario?.pais, { icono: 'flag', texto: tr('perfilIncompleto.pais') }],
    [!usuario?.fechaNacimiento, { icono: 'calendar', texto: tr('perfilIncompleto.nacimiento') }],
    [!usuario?.fotos?.length, { icono: 'camera', texto: tr('perfilIncompleto.foto') }],
  ];
  const faltan = requisitos.filter(([falta]) => falta).map(([, punto]) => punto);

  return (
    <ModalExplicacion
      visible={visible}
      icono="person.crop.circle.badge.exclamationmark"
      titulo={tr('perfilIncompleto.titulo')}
      intro={tr('perfilIncompleto.intro')}
      puntos={faltan}
      accion={tr('perfilIncompleto.ir')}
      onCerrar={onCerrar}
      onAceptar={async () => {
        onCerrar();
        // Se espera a que el modal se cierre antes de abrir la pantalla del perfil.
        setTimeout(() => router.push('/perfil/editar'), 250);
      }}
    />
  );
}

// ---------- Modo lento ----------
export const PASOS_MODO_LENTO = [0, 10, 30, 60, 300] as const;

export function textoTiempo(segundos: number, tr: (k: string, o?: Record<string, unknown>) => string) {
  return segundos >= 60 ? tr('modoLento.min', { n: Math.round(segundos / 60) }) : tr('modoLento.seg', { n: segundos });
}

export function ModalModoLento({ visible, actual, onGuardar, onCerrar }: {
  visible: boolean;
  actual: number;
  onGuardar: (segundos: number) => Promise<string | null>;
  onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [elegido, setElegido] = useState(actual || 30);
  useEffect(() => {
    if (visible) setElegido(actual || 30); // eslint-disable-line react-hooks/set-state-in-effect
  }, [visible, actual]);

  const tiempo = textoTiempo(elegido, tr);
  const puntos: Punto[] = elegido
    ? [
      { icono: 'timer', texto: tr('modoLento.puntoCada', { tiempo }) },
      { icono: 'hourglass', texto: tr('modoLento.puntoEspera') },
      { icono: 'person', texto: tr('modoLento.puntoTu') },
    ]
    : [{ icono: 'bubble.left.and.bubble.right', texto: tr('modoLento.puntoApagado') }];
  const accion = !elegido ? tr('modoLento.apagar') : actual ? tr('comun.guardar') : tr('modoLento.activar');

  return (
    <ModalExplicacion
      visible={visible}
      icono="timer"
      titulo={tr('modoLento.titulo')}
      intro={tr('modoLento.intro')}
      puntos={puntos}
      accion={accion}
      deshabilitada={elegido === actual}
      onCerrar={onCerrar}
      onAceptar={() => onGuardar(elegido)}>
      <View style={styles.pasos} accessibilityRole="radiogroup">
        {PASOS_MODO_LENTO.map((s) => {
          const activo = s === elegido;
          return (
            <Pressable
              key={s}
              onPress={() => setElegido(s)}
              accessibilityRole="radio"
              accessibilityState={{ checked: activo }}
              style={({ pressed }) => [styles.paso, { backgroundColor: activo ? t.accent : t.backgroundSelected }, pressed && { opacity: 0.7 }]}>
              <Texto v="pie" style={{ fontWeight: '600', color: activo ? t.onAccent : t.text }}>
                {s ? textoTiempo(s, tr) : tr('modoLento.no')}
              </Texto>
            </Pressable>
          );
        })}
      </View>
    </ModalExplicacion>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  velo: { backgroundColor: 'rgba(0,0,0,0.5)' },
  tarjeta: { width: '100%', maxWidth: 380, borderRadius: 24, padding: 22, gap: 12, alignItems: 'stretch' },
  icono: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 2 },
  puntos: { gap: 12, marginTop: 4 },
  punto: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  botones: { gap: 4, marginTop: 6 },
  boton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pasos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 4 },
  paso: { minWidth: 48, height: 34, borderRadius: 17, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' },
});
