// Escenas animadas de la intro de Bora (una por idea). Se vuelven a montar en cada
// diapositiva, así las animaciones de entrada se repiten cada vez que se muestran.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, ZoomIn, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';

import { fuenteWeb } from '@/components/ui';

const BLANCO = '#FFFFFF';
const VERDE_VIVO = '#30D158';
const F = 'https://sosappfiles.s3.us-east-1.amazonaws.com/services/';
export const FOTOS_INTRO = {
  samba: `${F}69b612bb5a17bf65f51b889c/photos/Dd39HwNWBKCz.webp`,
  techno: `${F}69b612bb5a17bf65f51b889c/photos/TC-6UBWmDUTN.webp`,
  funk: `${F}69b612bb5a17bf65f51b889c/photos/BDgebgunwswH.webp`,
  grupo: `${F}69b612bb5a17bf65f51b88b3/photos/wFaXWYmDAlaR.webp`,
  noche: `${F}6ac4187898f6058c2014dd80/photos/qd3q9jHERzM2.webp`,
  lapa: `${F}69b612bb5a17bf65f51b886d/photos/S7oNit8pe3u4.webp`,
};
const CARAS = [
  `${F}69b612bb5a17bf65f51b886d/photos/eC98QmqO43Sa.webp`,
  `${F}69f579d750a8d2c4c4369172/photos/MItHqSMuaSJL.webp`,
  `${F}6ac4187898f6058c2014dd80/photos/wLrFSFKT6iuO.webp`,
  `${F}69b612bb5a17bf65f51b8876/photos/NDRMy6yOsbk9.webp`,
  `${F}69b612bb5a17bf65f51b889c/photos/2EC65hYHJ-0K.webp`,
  `${F}6abcf1ed701df44fbf5bc493/photos/8dKVoLL47Pn8.webp`,
];

const T = (props: React.ComponentProps<typeof Text>) => <Text {...props} style={[{ fontFamily: fuenteWeb, color: '#fff' }, props.style]} />;

// 1 · Tarjetas de eventos que se abren en abanico
export function EscenaEventos() {
  const { t } = useTranslation('auth');
  const cartas = [
    { foto: FOTOS_INTRO.techno, giro: '-9deg', x: -70, retraso: 0 },
    { foto: FOTOS_INTRO.funk, giro: '9deg', x: 70, retraso: 120 },
  ];
  return (
    <View style={s.centro}>
      {cartas.map((c) => (
        <Animated.View
          key={c.foto}
          entering={FadeInDown.delay(c.retraso).springify().damping(14)}
          style={[s.carta, { transform: [{ translateX: c.x }, { rotate: c.giro }, { scale: 0.88 }] }]}>
          <Image source={{ uri: c.foto }} style={StyleSheet.absoluteFill} contentFit="cover" />
        </Animated.View>
      ))}
      <Animated.View entering={FadeInUp.delay(260).springify().damping(13)} style={s.carta}>
        <Image source={{ uri: FOTOS_INTRO.samba }} style={StyleSheet.absoluteFill} contentFit="cover" />
        <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.8)']} style={s.velo} />
        <View style={s.textoCarta}>
          <T style={s.cartaDetalle}>{t('intro.eventoHoy')}</T>
          <T style={s.cartaTitulo}>Roda de Samba</T>
          <Animated.View entering={ZoomIn.delay(900)} style={s.pildoraVan}>
            <View style={s.punto} />
            <T style={s.pildoraTexto}>{t('intro.van')} · 🇩🇪 🇦🇷 🇺🇸 🇫🇷</T>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

// 2 · Mensajes del chat que van apareciendo, cada uno con su bandera
export function EscenaChat() {
  const mensajes = [
    { autor: 'Lena 🇩🇪', texto: "Who's going from Copacabana?", cara: CARAS[0] },
    { autor: 'Mateo 🇦🇷', texto: 'Yo salgo de Ipanema a las 18:30', cara: CARAS[1] },
    { autor: 'Camille 🇫🇷', texto: 'Count me in! 🙌', cara: CARAS[2] },
  ];
  return (
    <View style={[s.centro, { alignItems: 'stretch', paddingHorizontal: 28, gap: 10 }]}>
      {mensajes.map((m, i) => (
        <Animated.View key={m.autor} entering={FadeInUp.delay(250 + i * 650).springify().damping(15)} style={s.filaMensaje}>
          <Image source={{ uri: m.cara }} style={s.cara} contentFit="cover" />
          <View style={{ gap: 3, flexShrink: 1 }}>
            <T style={s.autor}>{m.autor}</T>
            <View style={s.burbuja}><T style={s.textoBurbuja}>{m.texto}</T></View>
          </View>
        </Animated.View>
      ))}
      <Animated.View entering={FadeInUp.delay(250 + 3 * 650).springify().damping(15)} style={s.burbujaMia}>
        <T style={[s.textoBurbuja, { color: '#000' }]}>Vamos juntos 🇨🇱</T>
      </Animated.View>
    </View>
  );
}

// 3 · Tarjeta de previa: se van sumando personas
export function EscenaPrevia() {
  const { t } = useTranslation('auth');
  const pulso = useSharedValue(1);
  useEffect(() => {
    pulso.value = withDelay(2600, withRepeat(withSequence(withTiming(1.08, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
  }, [pulso]);
  const estiloBoton = useAnimatedStyle(() => ({ transform: [{ scale: pulso.value }] }));

  return (
    <View style={[s.centro, { paddingHorizontal: 28 }]}>
      <Animated.View entering={ZoomIn.springify().damping(14)} style={s.tarjetaPrevia}>
        <View style={s.iconoPrevia}><T style={{ fontSize: 26 }}>🍹</T></View>
        <T style={s.tituloTarjeta}>{t('intro.previa')}</T>
        <T style={s.detalleTarjeta}>{t('intro.previaDetalle')}</T>
        <View style={s.caras}>
          {CARAS.map((c, i) => (
            <Animated.View key={c} entering={ZoomIn.delay(500 + i * 280).springify()} style={[s.caraGrande, i > 0 && { marginLeft: -14 }]}>
              <Image source={{ uri: c }} style={StyleSheet.absoluteFill} contentFit="cover" />
            </Animated.View>
          ))}
        </View>
        <Animated.View style={[s.botonUnirme, estiloBoton]}>
          <T style={[s.textoBoton, { color: '#000' }]}>{t('intro.unirme')}</T>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// 4 · Ruta del hotel a la fiesta: la línea se dibuja y el auto avanza
export function EscenaSeguro() {
  const { t } = useTranslation('auth');
  const avance = useSharedValue(0);
  useEffect(() => {
    avance.value = withDelay(400, withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) }));
  }, [avance]);
  const ANCHO = 220;
  const linea = useAnimatedStyle(() => ({ width: ANCHO * avance.value }));
  const auto = useAnimatedStyle(() => ({ transform: [{ translateX: ANCHO * avance.value - 14 }] }));

  return (
    <View style={[s.centro, { gap: 28 }]}>
      <Animated.View entering={FadeIn.duration(500)} style={s.ruta}>
        <View style={[s.pin, { left: -18 }]}><T style={{ fontSize: 22 }}>🏨</T></View>
        <View style={[s.rutaFondo, { width: ANCHO }]} />
        <Animated.View style={[s.rutaLinea, linea]} />
        <Animated.View style={[s.auto, auto]}><T style={{ fontSize: 22 }}>🚐</T></Animated.View>
        <View style={[s.pin, { left: ANCHO - 18 }]}><T style={{ fontSize: 22 }}>🎉</T></View>
      </Animated.View>
      <Animated.View entering={FadeInUp.delay(900).springify().damping(15)} style={s.tarjetaTraslado}>
        <View style={s.check}><T style={{ fontSize: 16, fontWeight: '700', color: '#000' }}>✓</T></View>
        <View>
          <T style={s.tituloTarjeta}>{t('intro.traslado')}</T>
          <T style={s.detalleTarjeta}>{t('intro.trasladoDetalle')}</T>
        </View>
      </Animated.View>
      <Animated.View entering={ZoomIn.delay(2700).springify()} style={s.llegaste}>
        <View style={[s.punto, { backgroundColor: VERDE_VIVO }]} />
        <T style={s.pildoraTexto}>{t('intro.llegaste')}</T>
      </Animated.View>
    </View>
  );
}

// 5 · Banderas que flotan suavemente
function Bandera({ emoji, x, y, retraso, tamano }: { emoji: string; x: number; y: number; retraso: number; tamano: number }) {
  const flota = useSharedValue(0);
  useEffect(() => {
    flota.value = withDelay(retraso, withRepeat(withTiming(1, { duration: 2200 + retraso, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [flota, retraso]);
  const estilo = useAnimatedStyle(() => ({ transform: [{ translateY: -10 * flota.value }] }));
  return (
    <Animated.View entering={ZoomIn.delay(retraso).springify()} style={[{ position: 'absolute', left: `${x}%`, top: `${y}%` }]}>
      <Animated.View style={estilo}><Text style={{ fontSize: tamano }}>{emoji}</Text></Animated.View>
    </Animated.View>
  );
}

export function EscenaMundo() {
  const banderas = [
    ['🇩🇪', 12, 12, 0, 40], ['🇦🇷', 68, 8, 150, 46], ['🇺🇸', 40, 26, 300, 54], ['🇫🇷', 80, 36, 450, 38],
    ['🇨🇱', 6, 44, 600, 48], ['🇧🇷', 46, 52, 750, 60], ['🇮🇹', 74, 64, 900, 40], ['🇨🇴', 18, 72, 1050, 44],
    ['🇬🇧', 56, 80, 1200, 36], ['🇲🇽', 30, 2, 1350, 34], ['🇪🇸', 88, 82, 1500, 34], ['🇳🇱', 2, 86, 1650, 32],
  ] as const;
  return (
    <View style={s.lienzo}>
      {banderas.map(([e, x, y, r, t]) => <Bandera key={e} emoji={e} x={x} y={y} retraso={r} tamano={t} />)}
    </View>
  );
}

export const ESCENAS = [EscenaEventos, EscenaChat, EscenaPrevia, EscenaSeguro, EscenaMundo];

const s = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lienzo: { flex: 1, marginHorizontal: 24 },
  carta: { position: 'absolute', width: 210, height: 290, borderRadius: 26, overflow: 'hidden', backgroundColor: '#1C1C1E' },
  velo: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '65%' },
  textoCarta: { position: 'absolute', left: 16, right: 16, bottom: 16, gap: 2 },
  cartaDetalle: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  cartaTitulo: { fontSize: 24, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  pildoraVan: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 14, paddingHorizontal: 10, height: 28 },
  pildoraTexto: { fontSize: 13, fontWeight: '600' },
  punto: { width: 7, height: 7, borderRadius: 4, backgroundColor: VERDE_VIVO },
  filaMensaje: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  cara: { width: 30, height: 30, borderRadius: 15 },
  autor: { fontSize: 12, opacity: 0.7, paddingLeft: 12 },
  burbuja: { backgroundColor: '#2C2C2E', borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9 },
  burbujaMia: { alignSelf: 'flex-end', backgroundColor: BLANCO, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 9, marginTop: 4 },
  textoBurbuja: { fontSize: 17, lineHeight: 22 },
  tarjetaPrevia: { width: '100%', maxWidth: 340, backgroundColor: '#1C1C1E', borderRadius: 26, padding: 22, alignItems: 'center', gap: 6 },
  iconoPrevia: { width: 56, height: 56, borderRadius: 16, backgroundColor: BLANCO, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  tituloTarjeta: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  detalleTarjeta: { fontSize: 15, opacity: 0.7, textAlign: 'center' },
  caras: { flexDirection: 'row', marginTop: 14, marginBottom: 16 },
  caraGrande: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 3, borderColor: '#1C1C1E' },
  botonUnirme: { backgroundColor: BLANCO, borderRadius: 14, height: 46, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  textoBoton: { fontSize: 17, fontWeight: '600' },
  ruta: { width: 220, height: 50, justifyContent: 'center' },
  rutaFondo: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)' },
  rutaLinea: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: BLANCO },
  pin: { position: 'absolute', top: -40, width: 36, alignItems: 'center' },
  auto: { position: 'absolute', top: 2 },
  tarjetaTraslado: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#1C1C1E', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14 },
  check: { width: 34, height: 34, borderRadius: 17, backgroundColor: BLANCO, alignItems: 'center', justifyContent: 'center' },
  llegaste: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(48,209,88,0.16)', borderRadius: 16, paddingHorizontal: 14, height: 32 },
});
