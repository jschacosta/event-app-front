// Piezas del canal de un evento: normas antes de entrar, contraseña de canales propios
// y el selector de salas (General / idiomas / canales propios).
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { Bandera } from '@/components/bandera';
import { BotonPrincipal, BotonTexto, Icono, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, SALAS_IDIOMA, type CanalPropio, type Sala } from '@/lib/api';
import { textoCuenta, useNoLeidos } from '@/lib/no-leidos';

// ---------- Normas: se aceptan la primera vez que se abre cada grupo ----------
// Compacto: tiene que caber entero en la pantalla, sin scroll.
const NORMAS = [
  { icono: 'eye', clave: 'visible' },
  { icono: 'briefcase', clave: 'negocios' },
  { icono: 'hand.raised', clave: 'respeto' },
  { icono: 'flag', clave: 'reportar' },
] as const;

export function PanelNormas({ eventoId, onAceptadas }: { eventoId: string; onAceptadas: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { aceptarNormas } = useSesion();
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aceptar = async () => {
    setOcupado(true);
    try {
      await aceptarNormas(eventoId);
      onAceptadas();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOcupado(false);
    }
  };

  return (
    <View style={[styles.panel, styles.panelNormas]}>
      <View style={{ alignItems: 'center', gap: 6 }}>
        <Animated.View entering={FadeInDown.duration(380)} style={[styles.iconoNormas, { backgroundColor: t.backgroundElement }]}>
          <Icono nombre="shield.lefthalf.filled" tamano={22} color={t.text} />
        </Animated.View>
        <Texto v="titulo" style={{ textAlign: 'center' }}>{tr('normas.titulo')}</Texto>
        <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('normas.intro')}</Texto>
      </View>

      <View style={[styles.lista, { backgroundColor: t.backgroundElement }]}>
        {NORMAS.map((n, i) => (
          <Animated.View
            key={n.clave}
            entering={FadeInDown.delay(80 + i * 70).duration(380)}
            style={[styles.norma, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }]}>
            <View style={[styles.iconoNorma, { backgroundColor: t.background }]}>
              <Icono nombre={n.icono} tamano={15} color={t.text} />
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Texto v="detalle" style={{ fontWeight: '600' }}>{tr(`normas.${n.clave}.titulo`)}</Texto>
              <Texto v="pie" secundario>{tr(`normas.${n.clave}.texto`)}</Texto>
            </View>
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInUp.delay(400).duration(380)} style={styles.advertencia}>
        <Icono nombre="exclamationmark.triangle" tamano={14} color={t.danger} />
        <Texto v="pie" style={{ color: t.danger, flex: 1 }}>{tr('normas.consecuencia')}</Texto>
      </Animated.View>

      {error ? <Texto v="detalle" style={{ color: t.danger, textAlign: 'center' }}>{error}</Texto> : null}
      <View style={{ gap: 6, alignItems: 'center', alignSelf: 'stretch' }}>
        <View style={{ alignSelf: 'stretch' }}>
          <BotonPrincipal texto={tr('normas.aceptar')} onPress={aceptar} ocupado={ocupado} />
        </View>
        <BotonTexto texto={tr('normas.ahoraNo')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </View>
    </View>
  );
}

// ---------- Contraseña de un canal propio ----------
export function PanelClave({ canal, onDentro }: { canal: CanalPropio | undefined; onDentro: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { token, usuario } = useSesion();
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    if (!canal || !clave.trim()) return;
    setOcupado(true);
    setError(null);
    try {
      await api(`/canales/${canal.id}/entrar`, { metodo: 'POST', body: { clave: clave.trim() }, token });
      onDentro();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
    setOcupado(false);
  };

  // A los canales privados solo entran personas con la edad verificada.
  if (usuario && !usuario.edadVerificada && !usuario.admin) {
    return <AvisoVerificarEdad titulo={canal?.nombre ?? tr('canales.privado')} texto={tr('verificacion.paraEntrar')} />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.panel, { justifyContent: 'center', flexGrow: 1 }]} keyboardShouldPersistTaps="handled">
      <Animated.View entering={FadeInDown.duration(380)} style={[styles.iconoGrande, { backgroundColor: t.backgroundElement }]}>
        <Icono nombre="lock.fill" tamano={28} color={t.text} />
      </Animated.View>
      <Texto v="titulo" style={{ textAlign: 'center' }}>{canal?.nombre ?? tr('canales.privado')}</Texto>
      <Texto secundario style={{ textAlign: 'center' }}>{tr('canales.pideClave')}</Texto>
      <View style={[styles.campoClave, { backgroundColor: t.backgroundElement }]}>
        <Icono nombre="lock.fill" tamano={15} color={t.textSecondary} />
        <TextInput
          value={clave}
          onChangeText={(v) => { setClave(v); setError(null); }}
          placeholder={tr('canales.clave')}
          placeholderTextColor={t.textSecondary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={40}
          onSubmitEditing={entrar}
          returnKeyType="go"
          style={[styles.inputClave, { color: t.text, fontFamily: fuenteWeb }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as object)]}
        />
      </View>
      {error ? <Texto v="detalle" style={{ color: t.danger, textAlign: 'center' }}>{error}</Texto> : null}
      <View style={{ alignSelf: 'stretch' }}>
        <BotonPrincipal texto={tr('canales.entrar')} onPress={entrar} ocupado={ocupado} deshabilitado={!clave.trim()} />
      </View>
    </ScrollView>
  );
}

// ---------- Edad sin verificar: se pide para crear canales y entrar a canales privados ----------
export function AvisoVerificarEdad({ titulo, texto }: { titulo: string; texto: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <ScrollView contentContainerStyle={[styles.panel, { justifyContent: 'center', flexGrow: 1 }]}>
      <Animated.View entering={FadeInDown.duration(380)} style={[styles.iconoGrande, { backgroundColor: t.backgroundElement }]}>
        <Icono nombre="checkmark.seal.fill" tamano={30} color={t.text} />
      </Animated.View>
      <Texto v="titulo" style={{ textAlign: 'center' }}>{titulo}</Texto>
      <Texto secundario style={{ textAlign: 'center' }}>{texto}</Texto>
      <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
        <BotonPrincipal texto={tr('verificacion.empezarCorto')} onPress={() => router.push('/verificacion')} />
      </View>
    </ScrollView>
  );
}

// ---------- Salas: General / idiomas, y los canales propios del evento ----------
export const NOMBRES_IDIOMA: Record<string, string> = { es: 'Español', en: 'English', pt: 'Português' };
// Bandera de cada sala de idioma (General no tiene: lleva un globo).
const BANDERA_IDIOMA: Record<string, string> = { es: 'ES', en: 'GB', pt: 'BR' };

export function SelectorSalas({ eventoId, sala, canales, onCambio }: {
  eventoId: string; sala: Sala; canales: CanalPropio[]; onCambio: (sala: Sala) => void;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { usuario } = useSesion();
  const opciones = SALAS_IDIOMA.map((id) => ({ id, texto: id === 'general' ? tr('canales.general') : NOMBRES_IDIOMA[id] }));
  const puedeCrear = Boolean(usuario?.puedeCrearCanales);
  const nuevos = useNoLeidos()[eventoId]?.salas ?? {};

  // Todo en una sola fila deslizable y baja, para dejar el espacio a los mensajes:
  // idiomas (la elegida llena con el color de la marca) | canales propios | crear.
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filaSalas}
      accessibilityRole="tablist">
      {opciones.map((o) => {
        const activa = o.id === sala;
        // La sala abierta no se marca: lo que llega ahí se está leyendo.
        const marca = !activa && Boolean(nuevos[o.id]);
        return (
          <Pressable
            key={o.id}
            onPress={() => onCambio(o.id)}
            accessibilityRole="tab"
            accessibilityLabel={o.texto}
            accessibilityState={{ selected: activa }}
            style={({ pressed }) => [
              styles.pildoraSala,
              activa
                ? { backgroundColor: t.accent, borderColor: t.accent }
                : { backgroundColor: t.backgroundElement, borderColor: t.separator },
              pressed && { transform: [{ scale: 0.96 }] },
            ]}>
            {o.id === 'general'
              ? <Icono nombre="globe" tamano={14} color={activa ? t.onAccent : t.text} peso="semibold" />
              : <Bandera codigo={BANDERA_IDIOMA[o.id]} alto={11} />}
            <Texto v="pie" numberOfLines={1} style={{ fontWeight: activa ? '700' : '600', color: activa ? t.onAccent : t.text }}>
              {o.id === 'general' ? o.texto : o.id.toUpperCase()}
            </Texto>
            {marca ? <View style={[styles.puntoSala, { backgroundColor: t.danger, borderColor: t.background }]} /> : null}
          </Pressable>
        );
      })}

      {canales.length > 0 || puedeCrear ? <View style={[styles.divisor, { backgroundColor: t.separator }]} /> : null}

      {canales.map((c, i) => {
        const activa = c.id === sala;
        const cuenta = activa ? 0 : nuevos[c.id] ?? 0;
        return (
          <Animated.View key={c.id} entering={FadeInDown.delay(i * 40).duration(250)}>
            <Pressable
              onPress={() => onCambio(c.id)}
              accessibilityRole="button"
              accessibilityLabel={`${c.nombre}, ${tr('canales.personas', { count: c.miembros })}`}
              accessibilityState={{ selected: activa }}
              style={({ pressed }) => [
                styles.pildoraSala,
                activa
                  ? { backgroundColor: t.accent, borderColor: t.accent }
                  : { backgroundColor: t.backgroundElement, borderColor: t.separator },
                pressed && { opacity: 0.7 },
              ]}>
              <Icono nombre={c.privado && !c.soyMiembro ? 'lock.fill' : c.soloAvisos ? 'megaphone' : 'bubble.left.and.bubble.right'} tamano={13} color={activa ? t.onAccent : t.text} />
              <Texto v="pie" style={{ fontWeight: activa ? '700' : '600', maxWidth: 150, color: activa ? t.onAccent : t.text }} numberOfLines={1}>
                {c.creador?.admin ? 'Bora · ' : ''}{c.nombre}
              </Texto>
              {cuenta ? (
                <View style={[styles.cuentaSala, { backgroundColor: t.danger }]}>
                  <Texto v="mini" style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 10, lineHeight: 12 }}>{textoCuenta(cuenta)}</Texto>
                </View>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}

      {puedeCrear && (
        <Pressable
          onPress={() => router.push({ pathname: '/evento/[id]/nuevo-canal', params: { id: eventoId } })}
          accessibilityRole="button"
          accessibilityLabel={tr('canales.crear')}
          style={({ pressed }) => [styles.pildoraSala, styles.pildoraNueva, { borderColor: t.separator }, pressed && { opacity: 0.6 }]}>
          <Icono nombre="plus" tamano={14} color={t.text} />
          <Texto v="pie" style={{ fontWeight: '600' }}>{tr('canales.crear')}</Texto>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 24, gap: 16, alignItems: 'center', width: '100%', maxWidth: 520, alignSelf: 'center' },
  panelNormas: { flex: 1, justifyContent: 'center', paddingVertical: 12, gap: 12 },
  iconoNormas: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  filaSalas: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  pildoraSala: {
    height: 32, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11,
  },
  pildoraNueva: { borderStyle: 'dashed', borderWidth: 1 },
  puntoSala: { position: 'absolute', top: -1, right: -1, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  cuentaSala: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  divisor: { width: StyleSheet.hairlineWidth * 2, height: 20, marginHorizontal: 4 },
  iconoGrande: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  lista: { alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden' },
  norma: { flexDirection: 'row', gap: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  iconoNorma: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  advertencia: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', alignSelf: 'stretch', paddingHorizontal: 4 },
  campoClave: { alignSelf: 'stretch', height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  inputClave: { flex: 1, fontSize: 17, height: 50, padding: 0 },
});
