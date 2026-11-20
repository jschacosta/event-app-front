// Bienvenida: la intro que explica Bora en 4 escenas, como historias (avanzan solas cada 7 s; toque a la
// derecha adelanta y a la izquierda vuelve). La primera escena usa los afiches reales de esta noche en la
// ciudad del teléfono, y el título dice esa ciudad. Las fotos pasan por el achicador (WebP) y se
// descargan todas al abrir, así cada escena aparece sin esperar.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, ReduceMotion, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useEstaNoche } from '@/components/esta-noche';
import { FotoEvento, urlFoto } from '@/components/foto-evento';
import {
  aEventoIntro, C, CARAS, EscenaChat, EscenaEventos, EscenaMundo, EscenaPrevia, EVENTO_MUESTRA, FOTOS_INTRO, type DatosIntro,
} from '@/components/intro/escenas';
import { Logo } from '@/components/logo';
import { fuenteWeb } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useCiudad } from '@/lib/ciudades';
import { cambiarIdioma, IDIOMAS_APP } from '@/lib/i18n';

const DURACION = 7000; // ms por escena
const FRENA = Easing.bezier(0.2, 0.7, 0.2, 1);
// Claves de texto de cada escena (la del traslado, s4, queda fuera por ahora).
const TEXTOS = ['s1', 's2', 's3', 's5'];

function Progreso({ total, actual, avance }: { total: number; actual: number; avance: SharedValue<number> }) {
  const estilo = useAnimatedStyle(() => ({ width: `${avance.get() * 100}%` }));
  return (
    <View style={s.progreso} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={s.segmento}>
          {i < actual && <View style={[s.relleno, { width: '100%' }]} />}
          {i === actual && <Animated.View style={[s.relleno, estilo]} />}
        </View>
      ))}
    </View>
  );
}

// Foto de fondo de una escena: entra y sale por opacidad (fundido cruzado) y, mientras está activa,
// se acerca muy lento. La del canal es el afiche del evento, muy difuminado (basta la miniatura).
function Fondo({ url, activo, difuso }: { url: string; activo: boolean; difuso?: boolean }) {
  const quieto = useReducedMotion();
  const opacidad = useSharedValue(activo ? 1 : 0);
  const zoom = useSharedValue(1.04);
  useEffect(() => {
    opacidad.set(withTiming(activo ? 1 : 0, { duration: 700, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.Never }));
    if (activo && !quieto) {
      zoom.set(1.04);
      zoom.set(withTiming(1.14, { duration: DURACION + 700, easing: Easing.inOut(Easing.quad) }));
    }
  }, [activo, quieto, opacidad, zoom]);
  const estilo = useAnimatedStyle(() => ({ opacity: opacidad.get(), transform: [{ scale: zoom.get() }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, estilo]} pointerEvents="none">
      <FotoEvento
        url={url}
        tamano={difuso ? 'mini' : 'grande'}
        blurRadius={difuso ? 24 : 0}
        style={[StyleSheet.absoluteFill, difuso && { opacity: 0.9 }]}
        transition={0}
      />
    </Animated.View>
  );
}

function TextoEscena({ titulo, texto }: { titulo: string; texto: string }) {
  const mueve = useReducedMotion() ? 0 : 10;
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withTiming(1, { duration: 600, easing: FRENA, reduceMotion: ReduceMotion.Never }));
  }, [v]);
  const estilo = useAnimatedStyle(() => ({ opacity: v.get(), transform: [{ translateY: (1 - v.get()) * mueve }] }));
  return (
    <Animated.View style={[{ gap: 12 }, estilo]} accessibilityLiveRegion="polite">
      <Text style={s.titulo} accessibilityRole="header">{titulo}</Text>
      <Text style={s.texto}>{texto}</Text>
    </Animated.View>
  );
}

export default function BienvenidaScreen() {
  const { t, i18n } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { marcarIntroVista } = useSesion();
  const ciudad = useCiudad();
  const { destacados, total } = useEstaNoche(ciudad.id, 8);
  const [i, setI] = useState(0);
  const avance = useSharedValue(0);

  // El evento principal y los afiches de los lados: los de esta noche que tienen afiche.
  const datos = useMemo<DatosIntro>(() => {
    const conAfiche = (destacados ?? []).filter((e) => e.imagen);
    const principal = conAfiche.find((e) => (e.asistencia?.van ?? 0) > 0) ?? conAfiche[0];
    return {
      principal: principal ? aEventoIntro(principal) : EVENTO_MUESTRA,
      afiches: conAfiche.filter((e) => e !== principal).map((e) => e.imagen as string).slice(0, 2),
      total,
    };
  }, [destacados, total]);

  // Fuera de Rio, la primera escena tiene de fondo un afiche real de la ciudad (difuminado), no una foto de Rio.
  const fondoCiudad = ciudad.id !== 'rio' ? datos.afiches[0] : undefined;
  const fondos = [fondoCiudad ?? FOTOS_INTRO.samba, datos.principal.imagen, FOTOS_INTRO.lapa, FOTOS_INTRO.techno];

  // Todas las fotos de la intro, al tamaño en que se ven, quedan en la caché desde el comienzo.
  useEffect(() => {
    const urls = [
      urlFoto(FOTOS_INTRO.samba, 'grande'), urlFoto(FOTOS_INTRO.lapa, 'grande'), urlFoto(FOTOS_INTRO.techno, 'grande'),
      urlFoto(datos.principal.imagen, 'medio'), urlFoto(datos.principal.imagen, 'mini'),
      ...datos.afiches.map((a) => urlFoto(a, 'medio')),
      ...CARAS.map((c) => urlFoto(c, 'mini')), ...CARAS.slice(0, 3).map((c) => urlFoto(c, 'medio')),
    ];
    Image.prefetch(urls, 'memory-disk').catch(() => {});
  }, [datos]);

  // Barra de progreso y avance automático
  useEffect(() => {
    // La barra muestra el tiempo de cada escena: avanza siempre, aunque el teléfono reduzca animaciones.
    avance.set(0);
    avance.set(withTiming(1, { duration: DURACION, easing: Easing.linear, reduceMotion: ReduceMotion.Never }));
    const timer = setTimeout(() => setI((n) => (n + 1) % TEXTOS.length), DURACION);
    return () => {
      clearTimeout(timer);
      cancelAnimation(avance);
    };
  }, [i, avance]);

  const ir = async (ruta: '/auth' | '/auth/entrar' | '/') => {
    await marcarIntroVista();
    router.replace(ruta);
  };

  const clave = TEXTOS[i];
  const titulo = t(`intro.${clave}.titulo`, { ciudad: ciudad.corto ?? ciudad.nombre });

  return (
    <View style={s.pantalla}>
      <StatusBar style="light" />
      {fondos.map((f, n) => <Fondo key={n} url={f} activo={n === i} difuso={n === 1 || (n === 0 && !!fondoCiudad)} />)}
      <LinearGradient
        colors={['rgba(18,10,23,0.8)', 'rgba(40,12,64,0.58)', 'rgba(18,10,23,0.85)', C.fondo]}
        locations={[0, 0.3, 0.58, 0.74]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[s.arriba, { paddingTop: insets.top + 8 }]}>
        <Progreso total={TEXTOS.length} actual={i} avance={avance} />
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
      </View>

      {/* Toque a la izquierda: atrás; a la derecha: adelante */}
      <View style={s.escena}>
        {i === 0 && <EscenaEventos key="e0" datos={datos} />}
        {i === 1 && <EscenaChat key="e1" datos={datos} />}
        {i === 2 && <EscenaPrevia key="e2" />}
        {i === 3 && <EscenaMundo key="e3" />}
        <Pressable style={[s.zona, { left: 0 }]} onPress={() => setI((n) => Math.max(0, n - 1))} accessibilityLabel="‹" />
        <Pressable style={[s.zona, { right: 0 }]} onPress={() => setI((n) => (n + 1) % TEXTOS.length)} accessibilityLabel="›" />
      </View>

      <View style={[s.abajo, { paddingBottom: insets.bottom + 14 }]}>
        <TextoEscena
          key={`texto-${i}`}
          titulo={titulo}
          texto={t(i === 0 && ciudad.id !== 'rio' ? 'intro.s1.textoGeneral' : `intro.${clave}.texto`)}
        />
        <View style={{ gap: 14, marginTop: 22 }}>
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
    </View>
  );
}

const s = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo, overflow: 'hidden' },
  arriba: { paddingHorizontal: 16, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  progreso: { flexDirection: 'row', gap: 4 },
  segmento: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(243,237,247,0.28)', overflow: 'hidden' },
  relleno: { height: '100%', backgroundColor: C.texto },
  barra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6 },
  idiomas: { flexDirection: 'row', gap: 2 },
  idioma: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4 },
  idiomaActivo: { backgroundColor: 'rgba(243,237,247,0.14)' },
  idiomaTexto: { color: '#A699B0', fontSize: 12, fontWeight: '700', fontFamily: fuenteWeb },
  escena: { flex: 1, justifyContent: 'center' },
  zona: { position: 'absolute', top: 0, bottom: 0, width: '35%' },
  abajo: { paddingHorizontal: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  titulo: { color: C.texto, fontFamily: FuenteTitulo.cursiva, fontSize: 44, lineHeight: 43, paddingRight: 4 },
  texto: { color: C.suave, fontSize: 16, lineHeight: 23, fontFamily: fuenteWeb },
  botonPrincipal: { height: 56, borderRadius: 8, backgroundColor: C.boton, alignItems: 'center', justifyContent: 'center' },
  textoBotonPrincipal: { color: C.onBoton, fontSize: 17, fontWeight: '700', fontFamily: fuenteWeb },
  filaSecundaria: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 4 },
  // Cada enlace se achica y pasa a 2 líneas si el idioma es largo (inglés, francés, alemán), sin salirse.
  enlace: { flexShrink: 1 },
  secundario: { color: C.texto, fontSize: 15, fontWeight: '600', fontFamily: fuenteWeb, paddingVertical: 4, textAlign: 'center' },
  separador: { width: 1, height: 14, backgroundColor: 'rgba(243,237,247,0.2)' },
});
