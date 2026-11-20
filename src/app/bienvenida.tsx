// Bienvenida: un afiche de la noche. La ciudad en grande (como el titular de un festival), el line-up
// real de hoy con quién va, lo que se puede hacer en Bora y los botones. Siempre oscura, en açaí.
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { LineupNoche, useEstaNoche, type ColoresLineup } from '@/components/esta-noche';
import { IconoBora, type NombreIconoBora } from '@/components/iconos-bora';
import { Logo } from '@/components/logo';
import { fuenteWeb } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useCiudad } from '@/lib/ciudades';
import { cambiarIdioma, IDIOMAS_APP } from '@/lib/i18n';

const C = {
  fondo: '#120A17',
  acai: '#64209A',
  lila: '#C3A0FF',
  boton: '#B98CFF',
  onBoton: '#1A0B2B',
  texto: '#F3EDF7',
  secundario: '#A699B0',
  maracuja: '#FFC83D',
  linea: 'rgba(243,237,247,0.1)',
};
const LINEUP: ColoresLineup = {
  texto: C.texto, secundario: C.secundario, acento: C.lila, vivo: C.maracuja, onVivo: '#2E1F00', separador: C.linea, miniatura: '#241830',
};
const PUNTOS: { icono: NombreIconoBora; clave: string }[] = [
  { icono: 'entrada', clave: 'p1' },
  { icono: 'canal', clave: 'p2' },
  { icono: 'grupo', clave: 'p3' },
];

// Luz açaí arriba a la derecha, como un foco de escenario.
function Foco() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="foco" cx="85%" cy="8%" r="75%">
          <Stop offset="0" stopColor={C.acai} stopOpacity="0.85" />
          <Stop offset="1" stopColor={C.acai} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#foco)" />
    </Svg>
  );
}

// Filas grises mientras llega el line-up.
function LineupCargando() {
  return (
    <View style={{ gap: 18, paddingVertical: 12 }} accessibilityElementsHidden>
      {[0.8, 0.6, 0.7, 0.5].map((w, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={[s.gris, { width: 44, height: 18 }]} />
          <View style={[s.gris, { width: 40, height: 40, marginLeft: 10 }]} />
          <View style={[s.gris, { width: `${w * 60}%`, height: 14 }]} />
        </View>
      ))}
    </View>
  );
}

export default function BienvenidaScreen() {
  const { t, i18n } = useTranslation('auth');
  const { t: tc } = useTranslation();
  const insets = useSafeAreaInsets();
  const { marcarIntroVista } = useSesion();
  const ciudad = useCiudad();
  const { destacados, total, ahora } = useEstaNoche(ciudad.id, 4);

  const ir = async (ruta: '/auth' | '/auth/entrar' | '/') => {
    await marcarIntroVista();
    router.replace(ruta);
  };

  return (
    <View style={s.pantalla}>
      <StatusBar style="light" />
      <Foco />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.contenido, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}>
        <View style={s.barra}>
          <Logo alto={28} variante="sobreFoto" />
          <View style={s.idiomas}>
            {IDIOMAS_APP.map((l) => {
              const activo = i18n.language === l.codigo;
              return (
                <Pressable
                  key={l.codigo}
                  onPress={() => cambiarIdioma(l.codigo)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activo }}
                  accessibilityLabel={l.nombre}
                  style={[s.idioma, activo && s.idiomaActivo]}>
                  <Text style={[s.idiomaTexto, activo && { color: C.texto }]}>{l.codigo.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.View entering={FadeIn.duration(500)} style={{ marginTop: 34 }}>
          <Text style={s.antetitulo}>{t('bienvenida.estaNoche')}</Text>
          <Pressable
            onPress={() => router.push('/ciudad')}
            accessibilityRole="button"
            accessibilityLabel={tc('ciudad.cambiar')}
            style={({ pressed }) => [s.ciudad, pressed && { opacity: 0.7 }]}>
            <Text style={s.ciudadTexto} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{ciudad.nombre}</Text>
            <View style={s.cambiar}>
              <IconoBora nombre="pin" tamano={15} color={C.lila} />
              <Text style={s.cambiarTexto}>{tc('ciudad.cambiar')}</Text>
            </View>
          </Pressable>
        </Animated.View>

        <View style={{ marginTop: 22 }}>
          {destacados === null ? <LineupCargando /> : destacados.length ? (
            <>
              <LineupNoche eventos={destacados} ahora={ahora} colores={LINEUP} retraso={200} />
              {total > destacados.length ? (
                <Animated.Text entering={FadeIn.delay(600)} style={s.mas}>{t('bienvenida.destacados', { count: total })}</Animated.Text>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={s.puntos}>
          {PUNTOS.map((p, i) => (
            <Animated.View key={p.clave} entering={FadeInDown.delay(500 + i * 80).duration(400)} style={s.punto}>
              <View style={s.iconoPunto}><IconoBora nombre={p.icono} tamano={20} color={C.lila} /></View>
              <Text style={s.puntoTexto}>{t(`bienvenida.${p.clave}`)}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={[s.abajo, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={() => ir('/auth')} style={({ pressed }) => [s.botonPrincipal, pressed && { opacity: 0.85 }]} accessibilityRole="button">
          <Text style={s.textoBotonPrincipal}>{t('intro.crearCuenta')}</Text>
        </Pressable>
        <View style={s.filaSecundaria}>
          <Pressable onPress={() => ir('/auth/entrar')} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [s.enlace, pressed && { opacity: 0.6 }]}>
            <Text style={s.secundario}>{t('intro.yaTengoCuenta')}</Text>
          </Pressable>
          <View style={s.separador} />
          <Pressable onPress={() => ir('/')} hitSlop={8} accessibilityRole="button" style={({ pressed }) => [s.enlace, pressed && { opacity: 0.6 }]}>
            <Text style={s.secundario}>{t('intro.explorar')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo, overflow: 'hidden' },
  contenido: { paddingHorizontal: 22, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  idiomas: { flexDirection: 'row', gap: 2 },
  idioma: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
  idiomaActivo: { backgroundColor: 'rgba(243,237,247,0.12)' },
  idiomaTexto: { color: C.secundario, fontSize: 12, fontWeight: '700', fontFamily: fuenteWeb },
  antetitulo: { color: C.lila, fontFamily: FuenteTitulo.cursiva, fontSize: 24, lineHeight: 26, paddingRight: 2 },
  ciudad: { alignSelf: 'flex-start', maxWidth: '100%' },
  ciudadTexto: { color: C.texto, fontFamily: FuenteTitulo.cursiva, fontSize: 64, lineHeight: 62, paddingRight: 4, paddingTop: 4 },
  cambiar: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  cambiarTexto: { color: C.lila, fontSize: 14, fontWeight: '600', fontFamily: fuenteWeb },
  mas: { color: C.secundario, fontSize: 13, marginTop: 8, fontFamily: fuenteWeb },
  gris: { backgroundColor: '#241830', borderRadius: 4 },
  puntos: { gap: 14, marginTop: 28 },
  punto: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconoPunto: { width: 36, height: 36, borderRadius: 6, backgroundColor: 'rgba(185,140,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  puntoTexto: { flex: 1, color: C.texto, fontSize: 15, lineHeight: 20, fontWeight: '500', fontFamily: fuenteWeb },
  abajo: { paddingHorizontal: 22, paddingTop: 12, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: C.fondo, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.linea },
  botonPrincipal: { height: 54, borderRadius: 8, backgroundColor: C.boton, alignItems: 'center', justifyContent: 'center' },
  textoBotonPrincipal: { color: C.onBoton, fontSize: 17, fontWeight: '700', fontFamily: fuenteWeb },
  filaSecundaria: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  // Cada enlace se achica y pasa a 2 líneas si el idioma es largo (inglés, francés, alemán), sin salirse.
  enlace: { flexShrink: 1 },
  secundario: { color: C.texto, fontSize: 15, fontWeight: '600', fontFamily: fuenteWeb, paddingVertical: 4, textAlign: 'center' },
  separador: { width: 1, height: 14, backgroundColor: C.linea },
});
