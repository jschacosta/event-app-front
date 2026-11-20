// Lo que ve quien todavía no entra a un canal (sin cuenta o sin aceptar las normas): los últimos
// mensajes de la sala General, legibles, y arriba burbujas difuminadas que invitan a unirse.
// También el adelanto de la ficha del evento y el fondo del chat (afiche difuminado + color del género).
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Bandera } from '@/components/bandera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { api, type MensajeVistaPrevia, type VistaCanal } from '@/lib/api';
import { horaDispositivo } from '@/lib/fechas';
import { coloresGenero } from '@/lib/generos';

const fuente = fuenteWeb;

// "#FFB340" + 0.3 → "rgba(255,179,64,0.3)"
function conAlfa(hex: string, a: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function useVistaCanal(eventoId: string | undefined, activo = true) {
  const { token } = useSesion();
  const [vista, setVista] = useState<VistaCanal | null>(null);
  useEffect(() => {
    if (!eventoId || !activo) return;
    let vivo = true;
    const cargar = () => api<VistaCanal>(`/events/${eventoId}/canal`, { token }).then((r) => vivo && setVista(r)).catch(() => {});
    cargar();
    // Se refresca cada 30 s: la conversación sigue mientras se mira.
    const intervalo = setInterval(cargar, 30000);
    return () => { vivo = false; clearInterval(intervalo); };
  }, [eventoId, activo, token]);
  return vista;
}

// ---------- Fondo del chat ----------
// El afiche del evento muy difuminado, teñido con el color del género y aclarado hacia abajo para que
// las burbujas se lean. Sin afiche: solo el degradado del género.
export function FondoEvento({ imagen, generos }: { imagen?: string | null; generos?: string[] }) {
  const t = useTheme();
  const oscuro = useColorScheme() === 'dark';
  // LGBT+ tiene 5 colores: se usan el primero y el último.
  const colores = generos?.length ? coloresGenero(generos[0]) : ['#64209A', '#1A1023'];
  const c1 = colores[0];
  const c2 = colores[colores.length - 1];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: t.chatWallpaper }]} />
      {imagen ? (
        <Image
          source={{ uri: imagen }}
          style={[StyleSheet.absoluteFill, { opacity: oscuro ? 0.55 : 0.4 }]}
          contentFit="cover"
          blurRadius={Platform.OS === 'web' ? 0 : 60}
          cachePolicy="memory-disk"
          transition={250}
        />
      ) : null}
      {imagen && Platform.OS === 'web' ? <BlurView intensity={80} tint={oscuro ? 'dark' : 'light'} style={StyleSheet.absoluteFill} /> : null}
      <LinearGradient
        colors={[conAlfa(c1, oscuro ? 0.32 : 0.22), conAlfa(c2, oscuro ? 0.22 : 0.1), conAlfa(t.chatWallpaper, oscuro ? 0.78 : 0.82), t.chatWallpaper]}
        locations={[0, 0.35, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ---------- Una burbuja de solo lectura ----------
function Burbuja({ m, anterior }: { m: MensajeVistaPrevia; anterior?: MensajeVistaPrevia }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const seguido = anterior?.autor.id === m.autor.id;
  const contenido = m.gif
    ? <Image source={{ uri: m.gif.preview }} style={{ width: 140, aspectRatio: Math.max(0.6, Math.min(2, m.gif.ancho / m.gif.alto)), borderRadius: 8 }} contentFit="cover" />
    : m.sticker && !m.texto
      ? <Text style={[estilos.texto, { color: t.textSecondary, fontStyle: 'italic' }]}>{tr('vistaPrevia.sticker')}</Text>
      : <Text style={[estilos.texto, { color: t.text }]}>{m.encuesta ? `📊 ${m.texto}` : m.texto}</Text>;
  return (
    <View style={{ marginTop: seguido ? 3 : 10 }}>
      {seguido ? null : (
        <View style={[estilos.autor, { marginLeft: 50 }]}>
          <Text style={[estilos.nombre, { color: t.textSecondary }]} numberOfLines={1}>{m.autor.nombreVisible}</Text>
          <Bandera codigo={m.autor.pais} alto={10} />
        </View>
      )}
      <View style={estilos.fila}>
        <View style={estilos.columnaFoto}>
          {seguido ? null : m.autor.foto
            ? <Image source={{ uri: m.autor.foto }} style={estilos.foto} cachePolicy="memory-disk" />
            : <View style={[estilos.foto, estilos.inicial, { backgroundColor: t.backgroundSelected }]}><Text style={{ color: t.textSecondary, fontWeight: '700' }}>{m.autor.nombreVisible.charAt(0)}</Text></View>}
        </View>
        <View style={[estilos.burbuja, { backgroundColor: t.bubbleIn }]}>
          {contenido}
          <Text style={[estilos.hora, { color: t.textSecondary }]}>{horaDispositivo(m.fecha)}</Text>
        </View>
      </View>
    </View>
  );
}

// Burbujas de relleno (sin texto real) para lo anterior: se ven como conversación, no se leen.
const RELLENO = [
  { izq: true, ancho: '62%', lineas: 2 }, { izq: true, ancho: '44%', lineas: 1 }, { izq: false, ancho: '52%', lineas: 1 },
  { izq: true, ancho: '70%', lineas: 3 }, { izq: false, ancho: '38%', lineas: 1 }, { izq: true, ancho: '56%', lineas: 2 },
] as const;

function Anteriores() {
  const t = useTheme();
  const oscuro = useColorScheme() === 'dark';
  return (
    <View style={estilos.anteriores} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ gap: 6, paddingHorizontal: 12, opacity: oscuro ? 0.5 : 0.65 }}>
        {RELLENO.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: r.izq ? 'flex-start' : 'flex-end', gap: 6 }}>
            {r.izq ? <View style={[estilos.foto, { backgroundColor: t.backgroundSelected }]} /> : null}
            <View style={[estilos.relleno, { width: r.ancho, backgroundColor: r.izq ? t.bubbleIn : t.bubbleOut, height: 18 + r.lineas * 15 }]} />
          </View>
        ))}
      </View>
      <BlurView intensity={Platform.OS === 'android' ? 18 : 28} tint={oscuro ? 'dark' : 'light'} experimentalBlurMethod="dimezisBlurView" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={[t.chatWallpaper, conAlfa(t.chatWallpaper, 0)]} locations={[0, 0.7]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// ---------- Chat en modo lectura ----------
// Arriba, lo anterior difuminado; al medio, los últimos mensajes legibles; abajo, fija, la invitación.
export function VistaPreviaCanal({ eventoId, onUnirme, textoBoton }: { eventoId: string; onUnirme: () => void; textoBoton: string }) {
  const vista = useVistaCanal(eventoId);
  const { t: tr } = useTranslation();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  if (!vista) return <View style={{ flex: 1 }} />;
  const { mensajes } = vista;
  return (
    <View style={{ flex: 1 }}>
      <Animated.ScrollView
        entering={FadeIn.duration(200)}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingBottom: 12 }}
        ref={(r) => { setTimeout(() => r?.scrollToEnd({ animated: false }), 0); }}>
        {vista.anteriores > 0 || mensajes.length >= 6 ? <Anteriores /> : null}
        {mensajes.length ? (
          <View style={{ paddingHorizontal: 8 }}>
            {mensajes.map((m, i) => <Burbuja key={m.id} m={m} anterior={mensajes[i - 1]} />)}
          </View>
        ) : (
          <Texto v="detalle" secundario style={{ textAlign: 'center', marginTop: 12 }}>{tr('vistaPrevia.vacio')}</Texto>
        )}
      </Animated.ScrollView>
      <LinearGradient pointerEvents="none" colors={[t.chatWallpaper, conAlfa(t.chatWallpaper, 0)]} style={estilos.desvanecido} />
      <Animated.View entering={FadeInDown.duration(320)} style={[estilos.invitacion, { backgroundColor: t.bar, borderTopColor: t.separator, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={estilos.invitacionTexto}>
          <View style={estilos.enVivo}>
            <View style={[estilos.punto, { backgroundColor: t.live }]} />
            <Texto v="detalle" style={{ fontWeight: '700' }}>{tr('vistaPrevia.conversando', { count: Math.max(vista.personas, 1) })}</Texto>
          </View>
          {vista.anteriores > 0 ? <Texto v="pie" secundario>{tr('vistaPrevia.anteriores', { count: vista.anteriores })}</Texto> : null}
        </View>
        <BotonPrincipal texto={textoBoton} onPress={onUnirme} />
      </Animated.View>
    </View>
  );
}

// ---------- Adelanto en la ficha del evento ----------
export function AdelantoCanal({ eventoId, onPress }: { eventoId: string; onPress: () => void }) {
  const vista = useVistaCanal(eventoId);
  const t = useTheme();
  const { t: tr } = useTranslation();
  if (!vista?.abierto || !vista.mensajes.length) return null;
  const ultimos = vista.mensajes.slice(-3);
  const caras = [...new Map(vista.mensajes.slice().reverse().filter((m) => m.autor.foto).map((m) => [m.autor.id, m.autor.foto!])).values()].slice(0, 4);
  return (
    <Animated.View entering={FadeIn.duration(220)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={tr('vistaPrevia.titulo')}
        style={({ pressed }) => [estilos.adelanto, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.75 }]}>
        <View style={estilos.adelantoCabeza}>
          <View style={estilos.enVivo}>
            <View style={[estilos.punto, { backgroundColor: t.live }]} />
            <Texto v="detalle" style={{ fontWeight: '700' }}>{tr('vistaPrevia.titulo')}</Texto>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row' }}>
              {caras.map((f, i) => <Image key={f} source={{ uri: f }} style={[estilos.cara, { borderColor: t.backgroundElement, marginLeft: i ? -7 : 0 }]} cachePolicy="memory-disk" />)}
            </View>
            <Texto v="pie" secundario>{vista.personas}</Texto>
          </View>
        </View>
        {ultimos.map((m) => (
          <View key={m.id} style={estilos.lineaAdelanto}>
            <Bandera codigo={m.autor.pais} alto={11} />
            <Text style={[estilos.textoAdelanto, { color: t.text }]} numberOfLines={1}>
              <Text style={{ fontWeight: '700' }}>{m.autor.nombreVisible.split(' ')[0]}</Text>
              {'  '}
              <Text style={{ color: t.textSecondary }}>{m.gif ? 'GIF' : m.sticker && !m.texto ? tr('vistaPrevia.sticker') : m.texto}</Text>
            </Text>
          </View>
        ))}
      </Pressable>
    </Animated.View>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingRight: 56 },
  columnaFoto: { width: 30 },
  foto: { width: 30, height: 30, borderRadius: 15 },
  inicial: { alignItems: 'center', justifyContent: 'center' },
  burbuja: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6, borderRadius: 18, flexShrink: 1, gap: 2 },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  nombre: { fontSize: 13, fontWeight: '600', fontFamily: fuente, flexShrink: 1 },
  texto: { fontSize: 16, lineHeight: 21, fontFamily: fuente },
  hora: { fontSize: 11, alignSelf: 'flex-end', fontFamily: fuente },
  anteriores: { paddingTop: 16, paddingBottom: 12, justifyContent: 'center', overflow: 'hidden' },
  relleno: { borderRadius: 14 },
  desvanecido: { position: 'absolute', top: 0, left: 0, right: 0, height: 56 },
  invitacion: { paddingHorizontal: 16, paddingTop: 12, gap: 10, borderTopWidth: StyleSheet.hairlineWidth },
  invitacionTexto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  enVivo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  punto: { width: 8, height: 8, borderRadius: 4 },
  adelanto: { borderRadius: 14, padding: 12, gap: 7 },
  adelantoCabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  cara: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  lineaAdelanto: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  textoAdelanto: { flex: 1, fontSize: 14, fontFamily: fuente },
});
