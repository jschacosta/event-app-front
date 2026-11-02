// Piezas de las pantallas de acceso. Estilo "cine", igual que la intro: siempre oscuro,
// foto de fondo, campos de vidrio y botones de marca (Apple, Google, correo).
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import { Children, Fragment, isValidElement, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { FOTOS_INTRO } from '@/components/intro/escenas';
import { fuenteWeb } from '@/components/ui';

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_VALIDA = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const BLANCO_70 = 'rgba(255,255,255,0.7)';
const BLANCO_50 = 'rgba(255,255,255,0.5)';
const VIDRIO = 'rgba(255,255,255,0.09)';
const LINEA = 'rgba(255,255,255,0.12)';

// ---------- Texto blanco ----------
export function TextoAuth({ style, suave, ...props }: React.ComponentProps<typeof Text> & { suave?: boolean }) {
  return <Text {...props} style={[{ color: suave ? BLANCO_70 : '#fff', fontFamily: fuenteWeb, fontSize: 15, lineHeight: 20 }, style]} />;
}

// ---------- Logos ----------
export function LogoGoogle({ tamano = 20 }: { tamano?: number }) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function LogoApple({ color }: { color: string }) {
  if (Platform.OS === 'ios') return <SymbolView name="apple.logo" size={19} tintColor={color} weight="medium" />;
  return <Ionicons name="logo-apple" size={20} color={color} />;
}

function IconoCorreo() {
  if (Platform.OS === 'ios') return <SymbolView name="envelope.fill" size={17} tintColor="#fff" />;
  return <Ionicons name="mail" size={19} color="#fff" />;
}

// ---------- Botones ----------
type Variante = 'apple' | 'google' | 'correo' | 'principal' | 'vidrio';
export function BotonAuth({ variante, texto, onPress, ocupado, deshabilitado }: {
  variante: Variante; texto: string; onPress: () => void; ocupado?: boolean; deshabilitado?: boolean;
}) {
  const fondo = { apple: '#fff', google: '#fff', correo: VIDRIO, principal: '#fff', vidrio: VIDRIO }[variante];
  const color = variante === 'apple' || variante === 'google' || variante === 'principal' ? '#000' : '#fff';
  const icono = { apple: <LogoApple color="#000" />, google: <LogoGoogle />, correo: <IconoCorreo />, principal: null, vidrio: null }[variante];
  return (
    <Pressable
      onPress={onPress}
      disabled={ocupado || deshabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [
        s.boton,
        { backgroundColor: fondo },
        variante === 'correo' || variante === 'vidrio' ? s.bordeVidrio : null,
        (pressed || deshabilitado) && { opacity: deshabilitado ? 0.45 : 0.82 },
      ]}>
      {ocupado ? <ActivityIndicator color={color} /> : (
        <>
          {icono ? <View style={s.icono}>{icono}</View> : null}
          <Text style={[s.textoBoton, { color, fontFamily: fuenteWeb }]}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

// ---------- Pantalla base de formularios ----------
export function PantallaFormulario({ titulo, texto, children, foto = FOTOS_INTRO.noche }: {
  titulo: string; texto?: string; children: ReactNode; foto?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={s.pantalla}>
      <StatusBar style="light" />
      <View style={s.cabeceraFoto}>
        <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} />
        <LinearGradient colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', '#000']} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.contenido, { paddingTop: insets.top + 150, paddingBottom: insets.bottom + 32 }]}>
          {/* Sin animación de entrada: en Android, las que arrancan durante la transición de la pantalla
              a veces no se ejecutan y el contenido queda invisible (pantalla negra bajo el título). */}
          <View style={{ gap: 8 }}>
            <TextoAuth style={s.titulo}>{titulo}</TextoAuth>
            {texto ? <TextoAuth suave style={{ fontSize: 17, lineHeight: 23 }}>{texto}</TextoAuth> : null}
          </View>
          <View style={{ gap: 18 }}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
      <BotonVolver />
    </View>
  );
}

// Vuelve a la pantalla anterior; si no hay (por ejemplo, al abrir el enlace directo), va a la agenda.
export function BotonVolver() {
  const insets = useSafeAreaInsets();
  const navegacion = useNavigation();
  const volver = () => (navegacion.canGoBack() ? navegacion.goBack() : router.replace('/'));
  return (
    <Pressable onPress={volver} accessibilityLabel="‹" style={[s.volver, { top: insets.top + 10 }]} hitSlop={8}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      {Platform.OS === 'ios'
        ? <SymbolView name="chevron.left" size={17} tintColor="#fff" weight="semibold" />
        : <Ionicons name="chevron-back" size={20} color="#fff" />}
    </Pressable>
  );
}

// ---------- Campos de vidrio ----------
export function GrupoVidrio({ children, pie }: { children: ReactNode; pie?: string }) {
  const hijos = Children.toArray(children).filter(isValidElement);
  return (
    <View style={{ gap: 8 }}>
      <View style={s.grupo}>
        {hijos.map((h, i) => (
          <Fragment key={i}>
            {i > 0 && <View style={s.separador} />}
            {h}
          </Fragment>
        ))}
      </View>
      {pie ? <TextoAuth style={{ fontSize: 13, color: BLANCO_50, paddingHorizontal: 4 }}>{pie}</TextoAuth> : null}
    </View>
  );
}

export function Campo({ etiqueta, secreto, style, ...props }: TextInputProps & { etiqueta: string; secreto?: boolean; style?: StyleProp<TextStyle> }) {
  const { t } = useTranslation('auth');
  const [visible, setVisible] = useState(false);
  const [foco, setFoco] = useState(false);
  return (
    <View style={[s.campo, foco && { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
      <TextoAuth style={{ fontSize: 12, color: foco ? '#fff' : BLANCO_50, fontWeight: '600', letterSpacing: 0.2 }}>{etiqueta}</TextoAuth>
      <View style={s.filaCampo}>
        <TextInput
          placeholderTextColor="rgba(255,255,255,0.3)"
          secureTextEntry={secreto && !visible}
          autoCorrect={false}
          selectionColor="#fff"
          keyboardAppearance="dark"
          {...props}
          onFocus={(e) => { setFoco(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFoco(false); props.onBlur?.(e); }}
          style={[s.input, { fontFamily: fuenteWeb }, style, Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null]}
        />
        {secreto ? (
          <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
            <TextoAuth style={{ fontSize: 13, color: '#fff', fontWeight: '600' }}>{visible ? t('campos.ocultar') : t('campos.mostrar')}</TextoAuth>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function MensajeError({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <Animated.View entering={FadeInDown.duration(250)} style={s.error}>
      <TextoAuth style={{ color: '#FF6961', fontSize: 14 }}>{texto}</TextoAuth>
    </Animated.View>
  );
}

export function Enlace({ pregunta, accion, onPress }: { pregunta: string; accion: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ alignSelf: 'center', paddingVertical: 6 }} hitSlop={8}>
      <TextoAuth suave>
        {pregunta} <TextoAuth style={{ fontWeight: '700' }}>{accion}</TextoAuth>
      </TextoAuth>
    </Pressable>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000' },
  cabeceraFoto: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },
  contenido: { paddingHorizontal: 24, gap: 28, width: '100%', maxWidth: 480, alignSelf: 'center' },
  titulo: { fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -0.8 },
  boton: { height: 54, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  bordeVidrio: { borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.22)' },
  icono: { width: 22, alignItems: 'center' },
  textoBoton: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  volver: { position: 'absolute', left: 16, width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  grupo: { backgroundColor: VIDRIO, borderRadius: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: LINEA },
  separador: { height: StyleSheet.hairlineWidth, backgroundColor: LINEA, marginLeft: 16 },
  campo: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 2 },
  filaCampo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 17, color: '#fff', paddingVertical: 6 },
  error: { backgroundColor: 'rgba(255,69,58,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
});
