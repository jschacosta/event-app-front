// Lo que ve quien todavía no entra a una sala (sin cuenta o sin aceptar las normas): los últimos
// mensajes de esa sala, legibles, y arriba burbujas de relleno que se desvanecen e invitan a unirse.
// También el adelanto de la ficha del evento, el fondo del chat y el chat vacío con ideas para empezar.
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Bandera } from '@/components/bandera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconoBora } from '@/components/iconos-bora';
import { BotonPrincipal, Texto, fuenteWeb } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { api, type Evento, type MensajeVistaPrevia, type VistaCanal } from '@/lib/api';
import { diaCorto, hora, horaDispositivo } from '@/lib/fechas';
import { colorEtiquetaGenero } from '@/lib/generos';

const fuente = fuenteWeb;

// "#FFB340" + 0.3 → "rgba(255,179,64,0.3)"
function conAlfa(hex: string, a: number) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function useVistaCanal(eventoId: string | undefined, activo = true, sala = 'general') {
  const { token } = useSesion();
  const [vista, setVista] = useState<VistaCanal | null>(null);
  useEffect(() => {
    if (!eventoId || !activo) return;
    let vivo = true;
    const cargar = () => api<VistaCanal>(`/events/${eventoId}/canal${sala === 'general' ? '' : `?sala=${sala}`}`, { token }).then((r) => vivo && setVista(r)).catch(() => {});
    cargar();
    // Se refresca cada 30 s: la conversación sigue mientras se mira.
    const intervalo = setInterval(cargar, 30000);
    return () => { vivo = false; clearInterval(intervalo); };
  }, [eventoId, activo, token, sala]);
  return vista;
}

// ---------- Fondo del chat ----------
// Liso, del color del tema: el afiche difuminado de antes ensuciaba la pantalla, sobre todo sin mensajes.
// Se conservan los parámetros para no tocar a quien lo usa.
export function FondoEvento(_: { imagen?: string | null; generos?: string[] }) {
  const t = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: t.chatWallpaper }]} pointerEvents="none" />;
}

// ---------- Chat vacío ----------
// El afiche del evento y tres ideas para romper el hielo: al tocar una, queda escrita en el campo.
const IDEAS = ['previa', 'llegar', 'solo'] as const;

export function ChatVacio({ evento, onElegir, titulo }: { evento: Evento | null; onElegir: (frase: string) => void; titulo?: string }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Animated.View entering={FadeIn.duration(260)} style={estilos.vacio}>
      {evento ? (
        <View style={estilos.cabezaVacio}>
          <View style={[estilos.afiche, { backgroundColor: evento.imagen ? t.backgroundSelected : colorEtiquetaGenero(evento.generos[0] ?? 'otro') }]}>
            {evento.imagen
              ? <Image source={{ uri: evento.imagen }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              : <Text style={estilos.inicialAfiche}>{evento.titulo.trim().charAt(0).toUpperCase()}</Text>}
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[estilos.tituloVacio, { color: t.text }]} numberOfLines={2}>{evento.titulo}</Text>
            <Text style={[estilos.datoVacio, { color: t.textSecondary }]} numberOfLines={1}>
              {[`${diaCorto(evento.inicio)} ${hora(evento.inicio)}`, evento.lugar ?? evento.barrio].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>
      ) : null}
      <View style={{ gap: 4 }}>
        <Text style={[estilos.invitacionVacio, { color: t.text }]}>{titulo ?? tr('chatVacio.titulo')}</Text>
        <View style={estilos.lineaIdeas}>
          <IconoBora nombre="chispa" tamano={15} color={t.accentText} />
          <Text style={[estilos.datoVacio, { color: t.textSecondary }]}>{tr('chatVacio.ayuda')}</Text>
        </View>
      </View>
      <View style={estilos.ideas}>
        {IDEAS.map((k) => {
          const frase = tr(`chatVacio.${k}`);
          return (
            <Pressable
              key={k}
              onPress={() => onElegir(frase)}
              accessibilityRole="button"
              style={({ pressed }) => [estilos.idea, { backgroundColor: t.accentSoft }, pressed && { opacity: 0.7 }]}>
              <Text style={[estilos.ideaTexto, { color: t.accentSoftText }]}>{frase}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
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
      : m.encuesta
        ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <IconoBora nombre="encuesta" tamano={16} color={t.accentText} />
            <Text style={[estilos.texto, { color: t.text, flexShrink: 1 }]}>{m.texto}</Text>
          </View>
        )
        : <Text style={[estilos.texto, { color: t.text }]}>{m.texto}</Text>;
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

// Burbujas de relleno (sin texto real) para lo anterior: se ven como conversación y se desvanecen hacia arriba.
const RELLENO = [
  { izq: true, ancho: '62%', lineas: 2 }, { izq: true, ancho: '44%', lineas: 1 }, { izq: false, ancho: '52%', lineas: 1 },
  { izq: true, ancho: '70%', lineas: 3 }, { izq: false, ancho: '38%', lineas: 1 }, { izq: true, ancho: '56%', lineas: 2 },
] as const;

function Anteriores() {
  const t = useTheme();
  const oscuro = useColorScheme() === 'dark';
  return (
    <View style={estilos.anteriores} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={{ gap: 6, paddingHorizontal: 12, opacity: oscuro ? 0.35 : 0.5 }}>
        {RELLENO.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: r.izq ? 'flex-start' : 'flex-end', gap: 6 }}>
            {r.izq ? <View style={[estilos.foto, { backgroundColor: t.backgroundSelected }]} /> : null}
            <View style={[estilos.relleno, { width: r.ancho, backgroundColor: r.izq ? t.bubbleIn : t.bubbleOut, height: 18 + r.lineas * 15 }]} />
          </View>
        ))}
      </View>
      <LinearGradient colors={[t.chatWallpaper, conAlfa(t.chatWallpaper, 0)]} locations={[0, 0.7]} style={StyleSheet.absoluteFill} />
    </View>
  );
}

// ---------- Chat en modo lectura ----------
// Arriba, lo anterior difuminado; al medio, los últimos mensajes legibles; abajo, fija, la invitación.
export function VistaPreviaCanal({ eventoId, evento, sala = 'general', onUnirme, textoBoton }: {
  eventoId: string; evento?: Evento | null; sala?: string; onUnirme: () => void; textoBoton: string;
}) {
  const vista = useVistaCanal(eventoId, true, sala);
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
          // Sala sin mensajes: el evento y las ideas para empezar; tocar una lleva a unirse.
          <View style={{ paddingHorizontal: 8 }}>
            <ChatVacio evento={evento ?? null} titulo={tr('chatVacio.tituloPrevia')} onElegir={onUnirme} />
          </View>
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
  vacio: { gap: 16, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 18 },
  cabezaVacio: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  afiche: { width: 54, height: 72, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  inicialAfiche: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 30, paddingRight: 2 },
  tituloVacio: { fontSize: 17, lineHeight: 21, fontWeight: '700', fontFamily: fuente },
  datoVacio: { fontSize: 13, fontFamily: fuente },
  invitacionVacio: { fontFamily: FuenteTitulo.cursiva, fontSize: 24, lineHeight: 26, paddingRight: 2 },
  lineaIdeas: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ideas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  idea: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 6 },
  ideaTexto: { fontSize: 14, fontWeight: '600', fontFamily: fuente },
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
