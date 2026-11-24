// Perfil — monocromo, como las pantallas de Apple: el color lo ponen las fotos.
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ZoomIn, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera, Banderas } from '@/components/bandera';
import { LineupNoche, useEstaNoche, type ColoresLineup } from '@/components/esta-noche';
import { IconoBora } from '@/components/iconos-bora';
import { Logo } from '@/components/logo';
import { MisPlanes } from '@/components/mis-planes';
import { GrupoCuenta, GrupoLegal, GrupoNotificaciones, GrupoPrivacidad } from '@/components/ajustes';
import { Grupo, Icono, Texto } from '@/components/ui';
import { BottomTabInset } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import type { Usuario } from '@/lib/api';
import { cambiarApariencia, useApariencia, type Apariencia } from '@/lib/apariencia';
import { cambiarIdioma, IDIOMAS_APP } from '@/lib/i18n';
import { nombreInteres } from '@/lib/intereses';
import { nombrePais } from '@/lib/paises';
import { useCiudad } from '@/lib/ciudades';
import { CHAT_ACTIVO } from '@/lib/funciones';
import { diaCorto, hora } from '@/lib/fechas';
import { otaActual, versionApp } from '@/lib/version';

const entrada = (i: number) => FadeInDown.duration(420).delay(60 * i).easing(Easing.out(Easing.cubic));

// Botón que se hunde un poco al tocarlo, como en iOS.
function Tocable({ onPress, children, style, etiqueta }: { onPress: () => void; children: ReactNode; style?: object; etiqueta?: string }) {
  const escala = useSharedValue(1);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPressIn={() => { escala.set(withTiming(0.96, { duration: 220, easing: Easing.out(Easing.cubic) })); }}
      onPressOut={() => { escala.set(withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) })); }}>
      <Animated.View style={[style, animado]}>{children}</Animated.View>
    </Pressable>
  );
}

// ---------- Apariencia: tres mini pantallas como en Ajustes del iPhone ----------
function MiniPantalla({ oscura }: { oscura: boolean }) {
  const fondo = oscura ? '#000000' : '#FFFFFF';
  const barra = oscura ? '#2C2C2E' : '#E5E5EA';
  const tarjeta = oscura ? '#1C1C1E' : '#F2F2F7';
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: fondo, padding: 8, gap: 5 }]}>
      <View style={{ width: '55%', height: 6, borderRadius: 3, backgroundColor: oscura ? '#FFFFFF' : '#000000', opacity: 0.85, marginTop: 6 }} />
      <View style={{ height: 34, borderRadius: 6, backgroundColor: tarjeta, marginTop: 4 }} />
      <View style={{ width: '80%', height: 4, borderRadius: 2, backgroundColor: barra }} />
      <View style={{ width: '60%', height: 4, borderRadius: 2, backgroundColor: barra }} />
      <View style={{ height: 22, borderRadius: 6, backgroundColor: tarjeta, marginTop: 2 }} />
    </View>
  );
}

function OpcionApariencia({ id, texto, activa }: { id: Apariencia; texto: string; activa: boolean }) {
  const t = useTheme();
  const progreso = useSharedValue(activa ? 1 : 0);
  useEffect(() => {
    progreso.set(withTiming(activa ? 1 : 0, { duration: 220, easing: Easing.out(Easing.cubic) }));
  }, [activa, progreso]);
  const telefono = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progreso.value, [0, 1], [0.94, 1]) }],
    borderColor: t.text,
    borderWidth: 2,
  }));
  const aro = useAnimatedStyle(() => ({ opacity: progreso.value, transform: [{ scale: interpolate(progreso.value, [0, 1], [0.4, 1]) }] }));

  return (
    <Pressable onPress={() => cambiarApariencia(id)} accessibilityRole="radio" accessibilityState={{ checked: activa }} style={styles.opcionApariencia}>
      <Animated.View style={[styles.telefono, telefono, !activa && { borderColor: t.separator }]}>
        {id === 'sistema' ? (
          <>
            <MiniPantalla oscura={false} />
            <View style={[StyleSheet.absoluteFill, { left: '50%', overflow: 'hidden' }]}>
              <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '200%' }}>
                <MiniPantalla oscura />
              </View>
            </View>
          </>
        ) : (
          <MiniPantalla oscura={id === 'oscuro'} />
        )}
      </Animated.View>
      <Texto v="detalle" style={{ fontWeight: activa ? '600' : '400' }}>{texto}</Texto>
      <View style={[styles.circulo, { borderColor: activa ? t.accent : t.chevron }]}>
        <Animated.View style={[styles.circuloRelleno, { backgroundColor: t.accent }, aro]}>
          <Icono nombre="checkmark" tamano={11} color={t.background} peso="bold" />
        </Animated.View>
      </View>
    </Pressable>
  );
}

function SelectorApariencia() {
  const { t } = useTranslation('auth');
  const tema = useTheme();
  const actual = useApariencia();
  const opciones: Apariencia[] = ['sistema', 'claro', 'oscuro'];
  return (
    <View style={{ gap: 6 }}>
      <Texto v="grupo" secundario style={{ paddingHorizontal: 16 }}>{t('perfil.apariencia')}</Texto>
      <View style={[styles.apariencia, { backgroundColor: tema.card }]}>
        {opciones.map((id) => <OpcionApariencia key={id} id={id} texto={t(`perfil.tema.${id}`)} activa={actual === id} />)}
      </View>
    </View>
  );
}

// ---------- Idioma: lista con check, como en iOS ----------
function SelectorIdioma() {
  const { t, i18n } = useTranslation('auth');
  const tema = useTheme();
  return (
    <Grupo titulo={t('perfil.idiomaApp')}>
      {IDIOMAS_APP.map((l) => {
        const activo = i18n.language === l.codigo;
        return (
          <Pressable
            key={l.codigo}
            onPress={() => cambiarIdioma(l.codigo)}
            accessibilityRole="radio"
            accessibilityState={{ checked: activo }}
            style={({ pressed }) => [styles.filaIdioma, pressed && { backgroundColor: tema.backgroundSelected }]}>
            <View style={{ flex: 1 }}>
              <Texto>{l.nombre}</Texto>
              {t(`idiomas.${l.codigo}`) !== l.nombre && <Texto v="pie" secundario>{t(`idiomas.${l.codigo}`)}</Texto>}
            </View>
            {activo && (
              <Animated.View key={i18n.language} entering={ZoomIn.duration(200).easing(Easing.out(Easing.cubic))}>
                <Icono nombre="checkmark" tamano={17} color={tema.text} peso="semibold" />
              </Animated.View>
            )}
          </Pressable>
        );
      })}
    </Grupo>
  );
}

function PieApp() {
  const { t } = useTranslation('auth');
  return (
    <View style={{ gap: 6 }}>
      <Texto v="pie" secundario style={{ textAlign: 'center' }}>{t('perfil.pieApp')}</Texto>
      <VersionInstalada />
    </View>
  );
}

// Versión instalada y fecha de la última OTA que llegó a este teléfono; al mantener apretado se ve su código.
function VersionInstalada() {
  const { t } = useTranslation();
  const [verCodigo, setVerCodigo] = useState(false);
  if (Platform.OS === 'web') return null;
  const ota = otaActual();
  const linea = ota
    ? t('version.instaladaOta', { v: versionApp(), dia: diaCorto(ota.fecha), hora: hora(ota.fecha) })
    : t('version.instalada', { v: versionApp() });
  return (
    <Pressable onLongPress={() => ota && setVerCodigo((x) => !x)} hitSlop={8} accessibilityRole="text">
      <Texto v="pie" secundario style={{ textAlign: 'center', fontSize: 11, opacity: 0.7 }}>
        {verCodigo && ota ? t('version.codigo', { id: ota.id }) : linea}
      </Texto>
    </Pressable>
  );
}

// ---------- Sin cuenta ----------
// Lo mismo que la bienvenida, en los colores del tema: qué pasa esta noche en tu ciudad (eventos reales,
// con quién va), lo que se desbloquea con la cuenta y, abajo, los ajustes que no la necesitan.
// En la web no hay chat: en vez del canal se cuenta lo del mapa.
const PUNTOS_SIN_CUENTA = [
  { icono: 'entrada', clave: 'p1' },
  CHAT_ACTIVO ? { icono: 'canal' as const, clave: 'p2' as const } : { icono: 'mapa' as const, clave: 'p2Web' as const },
  { icono: 'grupo', clave: 'p3' },
] as const;

function SinCuenta() {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation();
  const tema = useTheme();
  const insets = useSafeAreaInsets();
  const ciudad = useCiudad();
  const { destacados, total, ahora } = useEstaNoche(ciudad.id, 3);
  const colores: ColoresLineup = {
    texto: tema.text, secundario: tema.textSecondary, acento: tema.accentText, vivo: tema.sun, onVivo: tema.onSun,
    separador: tema.separator, miniatura: tema.backgroundSelected,
  };
  return (
    <View style={{ gap: 30, paddingTop: insets.top + 14, paddingHorizontal: 20 }}>
      <Animated.View entering={entrada(0)} style={{ gap: 18 }}>
        <Logo alto={30} />
        <View>
          <Texto v="seccion" acento>{t('bienvenida.estaNoche')}</Texto>
          <Texto v="tituloGrande" numberOfLines={2} style={{ fontSize: 46, lineHeight: 46, paddingTop: 2 }}>{ciudad.nombre}</Texto>
        </View>
      </Animated.View>

      {destacados?.length ? (
        <View style={[styles.lineupSinCuenta, { backgroundColor: tema.backgroundElement }]}>
          <LineupNoche eventos={destacados} ahora={ahora} colores={colores} retraso={120} />
          {total > destacados.length ? (
            <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" style={({ pressed }) => [styles.verAgenda, { borderTopColor: tema.separator }, pressed && { opacity: 0.6 }]}>
              <Texto v="detalle" style={{ fontWeight: '700', color: tema.accentText }}>{t('bienvenida.verAgenda', { count: total })}</Texto>
              <IconoBora nombre="flecha" tamano={15} color={tema.accentText} grosor={2.4} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={{ gap: 14 }}>
        {PUNTOS_SIN_CUENTA.map((p, i) => (
          <Animated.View key={p.clave} entering={entrada(i + 2)} style={styles.beneficio}>
            <View style={[styles.beneficioIcono, { backgroundColor: tema.accentSoft }]}>
              <IconoBora nombre={p.icono} tamano={20} color={tema.accentSoftText} />
            </View>
            <Texto style={{ flex: 1, fontWeight: '500' }}>{t(`bienvenida.${p.clave}`)}</Texto>
          </Animated.View>
        ))}
      </View>

      <View style={{ gap: 14 }}>
        <Tocable onPress={() => router.push('/auth')} style={[styles.botonCuenta, { backgroundColor: tema.accent }]}>
          <Texto v="cuerpoFuerte" style={{ color: tema.onAccent, fontWeight: '700' }}>{t('intro.crearCuenta')}</Texto>
        </Tocable>
        <Pressable onPress={() => router.push('/auth/entrar')} hitSlop={8} style={{ alignSelf: 'center' }} accessibilityRole="button">
          {({ pressed }) => (
            <Texto v="detalle" secundario style={{ opacity: pressed ? 0.5 : 1 }}>
              {t('registro.yaTienes')} <Texto v="detalle" style={{ fontWeight: '700', color: tema.accentText }}>{t('registro.entra')}</Texto>
            </Texto>
          )}
        </Pressable>
      </View>

      <View style={[styles.separadorAjustes, { backgroundColor: tema.separator }]} />
      <View style={styles.cabezaAjustes}>
        <IconoBora nombre="ajustes" tamano={18} color={tema.textSecondary} />
        <Texto v="grupo" secundario>{tc('ajustes.titulo')}</Texto>
      </View>
      <Animated.View entering={entrada(5)} style={{ marginTop: -18 }}><SelectorApariencia /></Animated.View>
      <Animated.View entering={entrada(6)}><SelectorIdioma /></Animated.View>
      <PieApp />
    </View>
  );
}

// ---------- Con cuenta ----------

// Lo que falta para escribir en los canales (y para un perfil completo), como lista de pasos con check.
// Antes eran dos ceros gigantes ("0 países, 0 idiomas") y una barra con porcentaje.
function TarjetaCompletar({ usuario }: { usuario: Usuario }) {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const pasos = [
    { id: 'foto', listo: Boolean(usuario.foto) },
    { id: 'edad', listo: Boolean(usuario.fechaNacimiento) },
    { id: 'pais', listo: Boolean(usuario.pais) },
    { id: 'viajes', listo: usuario.fotos.length > 1 },
    { id: 'paises', listo: usuario.paisesVisitados.length > 0 },
    { id: 'idiomas', listo: usuario.idiomas.length > 0 },
  ];
  const hechos = pasos.filter((p) => p.listo).length;
  const ancho = useSharedValue(0);
  useEffect(() => {
    ancho.set(withTiming((hechos / pasos.length) * 100, { duration: 700 }));
  }, [hechos, pasos.length, ancho]);
  const relleno = useAnimatedStyle(() => ({ width: `${ancho.value}%` }));
  if (hechos === pasos.length) return null;
  // Se ven los hechos (tachados) y los 3 primeros que faltan.
  const faltan = pasos.filter((p) => !p.listo).slice(0, 3);
  const visibles = [...pasos.filter((p) => p.listo).slice(-1), ...faltan];
  return (
    <View style={[styles.completar, { backgroundColor: t.backgroundElement }]}>
      <View style={styles.completarCabeza}>
        <Texto v="cuerpoFuerte" style={{ flex: 1, fontSize: 16 }}>{usuario.perfilCompleto ? tr('perfil.completarTitulo') : tr('perfil.listoTitulo')}</Texto>
        <Texto v="detalle" style={{ fontWeight: '700', color: t.accentText }}>{tr('perfil.pasos', { hechos, total: pasos.length })}</Texto>
      </View>
      <View style={[styles.barra, { backgroundColor: t.backgroundSelected }]}>
        <Animated.View style={[styles.barraRelleno, { backgroundColor: t.accent }, relleno]} />
      </View>
      {visibles.map((p, i) => (
        <Pressable
          key={p.id}
          disabled={p.listo}
          onPress={() => router.push(p.id === 'viajes' ? '/perfil/editar' : '/onboarding')}
          style={({ pressed }) => [styles.paso, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }, pressed && { opacity: 0.6 }]}>
          <View style={[styles.check, p.listo ? { backgroundColor: t.accent } : { borderWidth: 2, borderColor: t.chevron }]}>
            {p.listo ? <Icono nombre="checkmark" tamano={12} color={t.onAccent} peso="bold" /> : null}
          </View>
          <Texto v="detalle" style={[{ flex: 1 }, p.listo && { color: t.textSecondary, textDecorationLine: 'line-through' }]}>{tr(`perfil.paso.${p.id}`)}</Texto>
          {p.listo ? null : <Icono nombre="chevron.right" tamano={13} color={t.chevron} peso="semibold" />}
        </Pressable>
      ))}
    </View>
  );
}

// Ajustes en su propia hoja (antes estaban mezclados con el perfil en una sola pantalla larga).
function HojaAjustes({ visible, usuario, onCerrar }: { visible: boolean; usuario: Usuario | null; onCerrar: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCerrar}>
      <SafeAreaProvider>
        <ContenidoAjustes usuario={usuario} onCerrar={onCerrar} />
      </SafeAreaProvider>
    </Modal>
  );
}

function ContenidoAjustes({ usuario, onCerrar }: { usuario: Usuario | null; onCerrar: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.grouped }}>
      <View style={[styles.cabezaHoja, { paddingTop: Platform.OS === 'ios' ? 18 : insets.top + 12 }]}>
        <Texto v="titulo">{tr('perfil.ajustes')}</Texto>
        <Pressable onPress={onCerrar} accessibilityRole="button" accessibilityLabel={tr('perfil.cerrar')} hitSlop={10}
          style={({ pressed }) => [styles.redondo, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
          <Icono nombre="xmark" tamano={15} color={t.text} peso="bold" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, gap: 24, paddingBottom: insets.bottom + 32 }}>
        {usuario ? <GrupoNotificaciones usuario={usuario} onIr={(ruta) => { onCerrar(); router.push(ruta); }} /> : null}
        {usuario ? <GrupoPrivacidad usuario={usuario} onIr={(ruta) => { onCerrar(); router.push(ruta); }} /> : null}
        <SelectorApariencia />
        <SelectorIdioma />
        <GrupoLegal />
        {usuario ? <GrupoCuenta usuario={usuario} onCerrar={onCerrar} /> : null}
        <PieApp />
      </ScrollView>
    </View>
  );
}

function Etiqueta({ texto }: { texto: string }) {
  const t = useTheme();
  return (
    <View style={[styles.etiqueta, { backgroundColor: t.backgroundElement }]}>
      <Texto v="detalle">{texto}</Texto>
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Texto v="pie" secundario style={{ fontWeight: '600' }}>{titulo}</Texto>
      {children}
    </View>
  );
}

function ConCuenta({ usuario }: { usuario: Usuario }) {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const [ajustes, setAjustes] = useState(false);

  const viajes = usuario.fotos.slice(1);
  const linea = [usuario.pais ? nombrePais(usuario.pais) : null, usuario.edad ? tr('perfil.edad', { count: usuario.edad }) : null]
    .filter(Boolean)
    .join(' · ');
  const hayAcercaDe = usuario.intereses.length > 0 || usuario.paisesVisitados.length > 0 || usuario.idiomas.length > 0;

  return (
    <View style={[styles.cuerpo, { paddingTop: insets.top + 14 }]}>
      {/* Encabezado compacto: foto, nombre y bandera, y el botón de ajustes. */}
      <Animated.View entering={entrada(0)} style={styles.identidad}>
        <Tocable onPress={() => router.push('/perfil/editar')} etiqueta={tr('perfil.editarPerfil')}
          style={[styles.avatar, { backgroundColor: t.accentSoft }]}>
          {usuario.foto ? <Image source={{ uri: usuario.foto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : (
            <Texto v="titulo" style={{ color: t.accentSoftText }}>{(usuario.nombreVisible || '?').charAt(0).toUpperCase()}</Texto>
          )}
        </Tocable>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Texto v="titulo" numberOfLines={1} style={{ flexShrink: 1 }}>{usuario.nombreVisible || tr('perfil.sinNombre')}</Texto>
            {usuario.pais ? <Bandera codigo={usuario.pais} alto={16} /> : null}
          </View>
          {linea ? <Texto v="detalle" secundario numberOfLines={1}>{linea}</Texto> : null}
        </View>
        <Pressable onPress={() => setAjustes(true)} accessibilityRole="button" accessibilityLabel={tr('perfil.ajustes')}
          style={({ pressed }) => [styles.redondo, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.6 }]}>
          <Icono nombre="line.3.horizontal.decrease" tamano={18} color={t.text} peso="semibold" />
        </Pressable>
      </Animated.View>

      <Animated.View entering={entrada(1)} style={styles.insignias}>
        <Tocable onPress={() => router.push('/perfil/editar')} style={[styles.insignia, { backgroundColor: t.backgroundElement }]}>
          <Icono nombre="pencil" tamano={13} color={t.text} />
          <Texto v="pie" style={{ fontWeight: '600' }}>{tr('perfil.editarPerfil')}</Texto>
        </Tocable>
        {usuario.edadVerificada ? (
          <View style={[styles.insignia, { backgroundColor: t.accentSoft }]}>
            <Icono nombre="checkmark.seal.fill" tamano={13} color={t.accentSoftText} />
            <Texto v="pie" style={{ fontWeight: '600', color: t.accentSoftText }}>{tr('verificacion.verificada', { ns: 'comun' })}</Texto>
          </View>
        ) : usuario.fechaNacimiento ? (
          <Tocable onPress={() => router.push('/verificacion')} style={[styles.insignia, { backgroundColor: t.backgroundElement }]}>
            <Icono nombre="checkmark.seal.fill" tamano={13} color={t.textSecondary} />
            <Texto v="pie" style={{ fontWeight: '600' }}>{tr('verificacion.empezarCorto', { ns: 'comun' })}</Texto>
          </Tocable>
        ) : null}
        {usuario.instagram ? (
          <Tocable onPress={() => Linking.openURL(`https://www.instagram.com/${usuario.instagram}/`)} style={[styles.insignia, { backgroundColor: t.backgroundElement }]}>
            <Icono nombre="camera" tamano={13} color={t.text} />
            <Texto v="pie" style={{ fontWeight: '600' }}>@{usuario.instagram}</Texto>
          </Tocable>
        ) : null}
      </Animated.View>

      <Animated.View entering={entrada(2)}><MisPlanes /></Animated.View>

      <Animated.View entering={entrada(2)}><TarjetaCompletar usuario={usuario} /></Animated.View>

      <Animated.View entering={entrada(3)} style={{ gap: 12 }}>
        <View style={styles.cabezaSeccion}>
          <Texto v="seccion">{tr('perfil.viajes')}</Texto>
          {viajes.length < 3 ? <BotonTextoChico texto={tr('perfil.agregarFoto')} onPress={() => router.push('/perfil/editar')} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }} style={{ marginHorizontal: -20 }}>
          {viajes.map((url) => (
            <Image key={url} source={{ uri: url }} style={[styles.fotoViaje, { backgroundColor: t.backgroundElement }]} contentFit="cover" transition={200} />
          ))}
          {viajes.length < 3 && (
            <Tocable onPress={() => router.push('/perfil/editar')} style={[styles.fotoViaje, styles.agregarFoto, { borderColor: t.outline }]}>
              <Icono nombre="plus" tamano={22} color={t.textSecondary} peso="semibold" />
              <Texto v="pie" secundario style={{ fontWeight: '600' }}>{tr('perfil.agregarFoto')}</Texto>
            </Tocable>
          )}
        </ScrollView>
      </Animated.View>

      {hayAcercaDe && (
        <Animated.View entering={entrada(4)} style={{ gap: 18 }}>
          {usuario.intereses.length > 0 && (
            <Seccion titulo={tr('perfil.intereses')}>
              <View style={styles.etiquetas}>{usuario.intereses.map((i) => <Etiqueta key={i} texto={nombreInteres(i)} />)}</View>
            </Seccion>
          )}
          {usuario.paisesVisitados.length > 0 && (
            <Seccion titulo={tr('perfil.paisesVisitados', { count: usuario.paisesVisitados.length })}>
              <Banderas codigos={usuario.paisesVisitados} alto={22} gap={8} />
            </Seccion>
          )}
          {usuario.idiomas.length > 0 && (
            <Seccion titulo={tr('perfil.idiomas')}>
              <View style={styles.etiquetas}>
                {usuario.idiomas.map((c) => <Etiqueta key={c} texto={tr(`idiomas.${c}`, { defaultValue: c.toUpperCase() })} />)}
              </View>
            </Seccion>
          )}
        </Animated.View>
      )}
      <HojaAjustes visible={ajustes} usuario={usuario} onCerrar={() => setAjustes(false)} />
    </View>
  );
}

function BotonTextoChico({ texto, onPress }: { texto: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button">
      {({ pressed }) => <Texto v="detalle" style={{ color: t.accentText, fontWeight: '600', opacity: pressed ? 0.5 : 1 }}>{texto}</Texto>}
    </Pressable>
  );
}

export default function PerfilScreen() {
  const tema = useTheme();
  const insets = useSafeAreaInsets();
  const { cargando, usuario } = useSesion();
  const scroll = useSharedValue(0);
  const alDesplazar = useAnimatedScrollHandler((e) => { scroll.set(e.contentOffset.y); });

  return (
    <View style={[styles.pantalla, { backgroundColor: tema.background }]}>
      <Animated.ScrollView
        style={styles.scroll}
        onScroll={alDesplazar}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 28 }}>
        {cargando ? <ActivityIndicator style={{ marginTop: insets.top + 64 }} /> : usuario ? <ConCuenta usuario={usuario} /> : <SinCuenta />}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%' },
  blanco: { color: '#FFFFFF' },

  // sin cuenta
  lineupSinCuenta: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 4 },
  verAgenda: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  beneficioIcono: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  botonCuenta: { height: 52, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  separadorAjustes: { height: StyleSheet.hairlineWidth },
  cabezaAjustes: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -12 },

  // apariencia
  apariencia: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 12, paddingVertical: 18, paddingHorizontal: 8 },
  opcionApariencia: { alignItems: 'center', gap: 8, flex: 1 },
  telefono: { width: 72, height: 124, borderRadius: 14, overflow: 'hidden' },
  circulo: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  circuloRelleno: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },

  // idioma
  filaIdioma: { minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },

  // con cuenta
  editar: { position: 'absolute', right: 16, zIndex: 2 },
  editarVidrio: { height: 34, paddingHorizontal: 16, borderRadius: 17, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  cuerpo: { paddingHorizontal: 20, gap: 22 },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  redondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cabezaHoja: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  cabezaSeccion: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 13, borderRadius: 17 },
  cifras: { flexDirection: 'row', borderRadius: 12, paddingVertical: 14 },
  cifra: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  completar: { padding: 16, paddingBottom: 6, borderRadius: 20, gap: 10 },
  completarCabeza: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  barra: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  barraRelleno: { height: 6, borderRadius: 3 },
  fotoViaje: { width: 128, height: 160, borderRadius: 16, overflow: 'hidden' },
  agregarFoto: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed' },
  agregarIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 12, padding: 16, gap: 20 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  etiqueta: { height: 32, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  salir: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
