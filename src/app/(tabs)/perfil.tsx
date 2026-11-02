// Perfil — monocromo, como las pantallas de Apple: el color lo ponen las fotos.
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View, Linking } from 'react-native';
import Animated, {
  FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withSpring, withTiming, ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera, Banderas } from '@/components/bandera';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { Fila, Grupo, Icono, Texto } from '@/components/ui';
import { BottomTabInset, MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import type { Usuario } from '@/lib/api';
import { cambiarApariencia, useApariencia, type Apariencia } from '@/lib/apariencia';
import { cambiarIdioma, IDIOMAS_APP } from '@/lib/i18n';
import { nombreInteres } from '@/lib/intereses';
import { nombrePais } from '@/lib/paises';

const ROJO = '#FF3B30';
const entrada = (i: number) => FadeInDown.duration(420).delay(60 * i).springify().damping(20);

// Botón que se hunde un poco al tocarlo, como en iOS.
function Tocable({ onPress, children, style, etiqueta }: { onPress: () => void; children: ReactNode; style?: object; etiqueta?: string }) {
  const escala = useSharedValue(1);
  const animado = useAnimatedStyle(() => ({ transform: [{ scale: escala.value }] }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPressIn={() => { escala.set(withSpring(0.96, { damping: 20, stiffness: 400 })); }}
      onPressOut={() => { escala.set(withSpring(1, { damping: 14, stiffness: 300 })); }}>
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
    progreso.set(withSpring(activa ? 1 : 0, { damping: 15, stiffness: 220 }));
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
      <View style={[styles.circulo, { borderColor: activa ? t.text : t.chevron }]}>
        <Animated.View style={[styles.circuloRelleno, { backgroundColor: t.text }, aro]}>
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
              <Animated.View key={i18n.language} entering={ZoomIn.springify().damping(14)}>
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
  return <Texto v="pie" secundario style={{ textAlign: 'center' }}>{t('perfil.pieApp')}</Texto>;
}

// ---------- Sin cuenta ----------
function SinCuenta() {
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const beneficios: { icono: 'calendar' | 'bubble.left.and.bubble.right' | 'person.2'; texto: string }[] = [
    { icono: 'calendar', texto: t('perfil.invitado.b1') },
    { icono: 'bubble.left.and.bubble.right', texto: t('perfil.invitado.b2') },
    { icono: 'person.2', texto: t('perfil.invitado.b3') },
  ];
  return (
    <View style={{ gap: 30, paddingTop: insets.top + 12, paddingHorizontal: 16 }}>
      <Animated.View entering={entrada(0)} style={styles.portada}>
        <Image source={{ uri: FOTOS_INTRO.grupo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.9)']} locations={[0, 0.3, 0.72]} style={StyleSheet.absoluteFill} />
        <Texto style={styles.marca}>bora</Texto>
        <View style={styles.portadaContenido}>
          <Texto v="titulo" style={styles.blanco}>{t('perfil.invitado.titulo')}</Texto>
          <View style={{ gap: 12, marginTop: 4 }}>
            {beneficios.map((b, i) => (
              <Animated.View key={b.icono} entering={entrada(i + 2)} style={styles.beneficio}>
                <BlurView intensity={30} tint="light" style={styles.beneficioIcono}>
                  <Icono nombre={b.icono} tamano={15} color="#FFFFFF" peso="semibold" />
                </BlurView>
                <Texto v="detalle" style={[styles.blanco, { flex: 1, fontWeight: '500' }]}>{b.texto}</Texto>
              </Animated.View>
            ))}
          </View>
          <Tocable onPress={() => router.push('/auth')} style={styles.botonBlanco}>
            <Texto v="cuerpoFuerte" style={{ color: '#000000' }}>{t('intro.crearCuenta')}</Texto>
          </Tocable>
          <Pressable onPress={() => router.push('/auth/entrar')} hitSlop={8} style={{ alignSelf: 'center' }}>
            {({ pressed }) => (
              <Texto v="detalle" style={[styles.blanco, { opacity: pressed ? 0.5 : 0.85 }]}>
                {t('registro.yaTienes')} <Texto v="detalle" style={[styles.blanco, { fontWeight: '700' }]}>{t('registro.entra')}</Texto>
              </Texto>
            )}
          </Pressable>
        </View>
      </Animated.View>
      <Animated.View entering={entrada(3)}><SelectorApariencia /></Animated.View>
      <Animated.View entering={entrada(4)}><SelectorIdioma /></Animated.View>
      <PieApp />
    </View>
  );
}

// ---------- Con cuenta ----------
function progresoPerfil(u: Usuario) {
  const pasos = [u.foto, u.fechaNacimiento, u.pais, u.fotos.length > 1, u.paisesVisitados.length > 0, u.idiomas.length > 0];
  return Math.round((pasos.filter(Boolean).length / pasos.length) * 100);
}

function Cifras({ usuario }: { usuario: Usuario }) {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const cifras = [
    { valor: usuario.paisesVisitados.length, texto: tr('perfil.cifras.paises') },
    { valor: usuario.idiomas.length, texto: tr('perfil.cifras.idiomas') },
  ];
  return (
    <View style={[styles.cifras, { backgroundColor: t.card }]}>
      {cifras.map((c, i) => (
        <View key={c.texto} style={[styles.cifra, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.separator }]}>
          <Texto v="seccion">{c.valor}</Texto>
          <Texto v="mini" secundario style={{ textAlign: 'center' }}>{c.texto}</Texto>
        </View>
      ))}
    </View>
  );
}

function TarjetaCompletar({ usuario }: { usuario: Usuario }) {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const porcentaje = progresoPerfil(usuario);
  const ancho = useSharedValue(0);
  useEffect(() => {
    ancho.set(withTiming(porcentaje, { duration: 900 }));
  }, [porcentaje, ancho]);
  const relleno = useAnimatedStyle(() => ({ width: `${ancho.value}%` }));
  if (porcentaje >= 100) return null;
  return (
    <Tocable onPress={() => router.push('/onboarding')} style={[styles.completar, { backgroundColor: t.card }]}>
      <View style={{ flex: 1, gap: 8 }}>
        <View style={styles.completarCabeza}>
          <Texto v="cuerpoFuerte">{tr('perfil.completarTitulo')}</Texto>
          <Texto v="pie" secundario style={{ fontWeight: '600' }}>{porcentaje} %</Texto>
        </View>
        <View style={[styles.barra, { backgroundColor: t.backgroundSelected }]}>
          <Animated.View style={[styles.barraRelleno, { backgroundColor: t.text }, relleno]} />
        </View>
        <Texto v="pie" secundario>{usuario.perfilCompleto ? tr('perfil.completarExtra') : tr('perfil.completarPie')}</Texto>
      </View>
      <Icono nombre="chevron.right" tamano={14} color={t.chevron} peso="semibold" />
    </Tocable>
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

// Portada con la primera foto de viaje; al tirar hacia abajo se estira (como en Apple Music).
function Portada({ url, scroll }: { url: string; scroll: SharedValue<number> }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const alto = insets.top + 190;
  const estilo = useAnimatedStyle(() => ({
    transform: [
      { translateY: scroll.value < 0 ? scroll.value : scroll.value * 0.4 },
      { scale: scroll.value < 0 ? 1 + -scroll.value / alto : 1 },
    ],
  }));
  return (
    <View style={{ height: alto }}>
      <Animated.View style={[StyleSheet.absoluteFill, estilo]}>
        <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
        <LinearGradient colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0)', t.grouped]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

function ConCuenta({ usuario, scroll }: { usuario: Usuario; scroll: SharedValue<number> }) {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { salir } = useSesion();

  const viajes = usuario.fotos.slice(1);
  const portada = viajes[0] ?? null;
  const linea = [usuario.pais ? nombrePais(usuario.pais) : null, usuario.edad ? tr('perfil.edad', { count: usuario.edad }) : null]
    .filter(Boolean)
    .join(' · ');
  const hayAcercaDe = usuario.intereses.length > 0 || usuario.paisesVisitados.length > 0 || usuario.idiomas.length > 0;

  return (
    <View>
      {portada ? <Portada url={portada} scroll={scroll} /> : <View style={{ height: insets.top + 64 }} />}

      {/* Botón Editar: vidrio sobre la foto, texto simple si no hay portada */}
      <View style={[styles.editar, { top: insets.top + 8 }]}>
        {portada ? (
          <Tocable onPress={() => router.push('/perfil/editar')} etiqueta={tr('perfil.editar')} style={styles.editarVidrio}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
            <Texto v="detalle" style={[styles.blanco, { fontWeight: '600' }]}>{tr('perfil.editar')}</Texto>
          </Tocable>
        ) : (
          <Pressable onPress={() => router.push('/perfil/editar')} hitSlop={10}>
            {({ pressed }) => <Texto style={{ fontWeight: '600', opacity: pressed ? 0.4 : 1 }}>{tr('perfil.editar')}</Texto>}
          </Pressable>
        )}
      </View>

      <View style={styles.cuerpo}>
        <Animated.View entering={entrada(0)} style={[styles.identidad, portada && { marginTop: -70 }]}>
          <View style={[styles.avatar, { backgroundColor: t.backgroundSelected, borderColor: t.grouped }]}>
            {usuario.foto ? <Image source={{ uri: usuario.foto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} /> : (
              <Icono nombre="person" tamano={48} color={t.textSecondary} />
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Texto v="titulo" style={{ textAlign: 'center' }}>{usuario.nombreVisible || tr('perfil.sinNombre')}</Texto>
            {usuario.pais ? <Bandera codigo={usuario.pais} alto={20} /> : null}
          </View>
          {linea ? <Texto v="detalle" secundario>{linea}</Texto> : null}
          <View style={styles.insignias}>
            {usuario.edadVerificada ? (
              <View style={[styles.insignia, { backgroundColor: t.card }]}>
                <Icono nombre="checkmark.seal.fill" tamano={13} color={t.text} />
                <Texto v="pie" style={{ fontWeight: '600' }}>{tr('verificacion.verificada', { ns: 'comun' })}</Texto>
              </View>
            ) : usuario.fechaNacimiento ? (
              <Tocable onPress={() => router.push('/verificacion')} style={[styles.insignia, { backgroundColor: t.card }]}>
                <Icono nombre="checkmark.seal.fill" tamano={13} color={t.textSecondary} />
                <Texto v="pie" style={{ fontWeight: '600' }}>{tr('verificacion.empezarCorto', { ns: 'comun' })}</Texto>
                <Icono nombre="chevron.right" tamano={11} color={t.textSecondary} peso="semibold" />
              </Tocable>
            ) : null}
            {usuario.instagram ? (
              <Tocable onPress={() => Linking.openURL(`https://www.instagram.com/${usuario.instagram}/`)} style={[styles.insignia, { backgroundColor: t.card }]}>
                <Icono nombre="camera" tamano={13} color={t.text} />
                <Texto v="pie" style={{ fontWeight: '600' }}>@{usuario.instagram}</Texto>
              </Tocable>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={entrada(1)}><Cifras usuario={usuario} /></Animated.View>
        {progresoPerfil(usuario) < 100 && <Animated.View entering={entrada(2)}><TarjetaCompletar usuario={usuario} /></Animated.View>}

        <Animated.View entering={entrada(3)}>
          <Seccion titulo={tr('perfil.viajes')}>
            <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }} style={{ marginHorizontal: -16 }}>
              {viajes.map((url) => (
                <Image key={url} source={{ uri: url }} style={[styles.fotoViaje, { backgroundColor: t.backgroundElement }]} contentFit="cover" transition={200} />
              ))}
              {viajes.length < 3 && (
                <Tocable onPress={() => router.push('/perfil/editar')} style={[styles.fotoViaje, styles.agregarFoto, { backgroundColor: t.card }]}>
                  <View style={[styles.agregarIcono, { backgroundColor: t.backgroundElement }]}>
                    <Icono nombre="plus" tamano={20} color={t.text} peso="semibold" />
                  </View>
                  <Texto v="pie" secundario style={{ fontWeight: '600' }}>{tr('perfil.agregarFoto')}</Texto>
                </Tocable>
              )}
            </Animated.ScrollView>
          </Seccion>
        </Animated.View>

        {hayAcercaDe && (
          <Animated.View entering={entrada(4)} style={[styles.tarjeta, { backgroundColor: t.card }]}>
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

        <Animated.View entering={entrada(5)}><SelectorApariencia /></Animated.View>
        <Animated.View entering={entrada(6)}><SelectorIdioma /></Animated.View>

        <Grupo>
          <Fila
            etiqueta={tr('bloqueos.titulo')}
            valor={usuario.bloqueados?.length ? String(usuario.bloqueados.length) : undefined}
            onPress={() => router.push('/perfil/bloqueados')}
          />
        </Grupo>

        <Grupo pie={usuario.email ? tr('perfil.conectadoComo', { email: usuario.email }) : undefined}>
          <Pressable onPress={salir} style={({ pressed }) => [styles.salir, pressed && { backgroundColor: t.backgroundSelected }]}>
            <Texto style={{ color: ROJO }}>{tr('perfil.cerrarSesion')}</Texto>
          </Pressable>
        </Grupo>
        <PieApp />
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const tema = useTheme();
  const insets = useSafeAreaInsets();
  const { cargando, usuario } = useSesion();
  const scroll = useSharedValue(0);
  const alDesplazar = useAnimatedScrollHandler((e) => { scroll.set(e.contentOffset.y); });

  return (
    <View style={[styles.pantalla, { backgroundColor: tema.grouped }]}>
      <Animated.ScrollView
        style={styles.scroll}
        onScroll={alDesplazar}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 28 }}>
        {cargando ? <ActivityIndicator style={{ marginTop: insets.top + 64 }} /> : usuario ? <ConCuenta usuario={usuario} scroll={scroll} /> : <SinCuenta />}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%', maxWidth: MaxContentWidth },
  blanco: { color: '#FFFFFF' },

  // sin cuenta
  portada: { minHeight: 520, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end' },
  marca: { position: 'absolute', top: 20, left: 22, color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  portadaContenido: { padding: 22, gap: 14 },
  beneficio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  beneficioIcono: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  botonBlanco: { height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 10 },

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
  cuerpo: { paddingHorizontal: 16, gap: 24 },
  identidad: { alignItems: 'center', gap: 6 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 },
  insignia: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  cifras: { flexDirection: 'row', borderRadius: 12, paddingVertical: 14 },
  cifra: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 6 },
  completar: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 12 },
  completarCabeza: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  barra: { height: 4, borderRadius: 2, overflow: 'hidden' },
  barraRelleno: { height: 4, borderRadius: 2 },
  fotoViaje: { width: 132, height: 176, borderRadius: 16, overflow: 'hidden' },
  agregarFoto: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  agregarIcono: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tarjeta: { borderRadius: 12, padding: 16, gap: 20 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  etiqueta: { height: 32, paddingHorizontal: 12, borderRadius: 8, justifyContent: 'center' },
  salir: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
