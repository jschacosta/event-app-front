// Escenas de la intro de Bora (una por idea), con la interfaz real de la app: afiches de esta noche en la
// ciudad, el canal del evento, la previa y los perfiles de viajeros. Sin emojis: banderas e íconos
// vectoriales propios. Movimiento suave: todo aparece por opacidad y un desplazamiento corto con una
// curva que frena al final, sin rebotes. Con "reducir movimiento" del teléfono, todo aparece quieto.
// Cada escena se vuelve a montar al mostrarse, así su animación empieza de cero.
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Bandera, Banderas } from '@/components/bandera';
import { FotoEvento } from '@/components/foto-evento';
import { IconoBora } from '@/components/iconos-bora';
import { fuenteWeb } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import type { Evento } from '@/lib/api';
import { hora, tituloDia } from '@/lib/fechas';
import { colorEtiquetaGenero, nombreGenero } from '@/lib/generos';

export const C = {
  fondo: '#120A17',
  texto: '#F3EDF7',
  secundario: '#B9AEC2',
  suave: '#D3C8DC',
  lila: '#C3A0FF',
  boton: '#B98CFF',
  onBoton: '#1A0B2B',
  maracuja: '#FFC83D',
  vivo: '#4ADE80',
  panel: 'rgba(28,16,36,0.86)',
  borde: 'rgba(243,237,247,0.12)',
};

const F = 'https://sosappfiles.s3.us-east-1.amazonaws.com/services/';
export const FOTOS_INTRO = {
  samba: `${F}69b612bb5a17bf65f51b889c/photos/Dd39HwNWBKCz.webp`,
  techno: `${F}69b612bb5a17bf65f51b889c/photos/TC-6UBWmDUTN.webp`,
  funk: `${F}69b612bb5a17bf65f51b889c/photos/BDgebgunwswH.webp`,
  noche: `${F}6ac4187898f6058c2014dd80/photos/qd3q9jHERzM2.webp`,
  lapa: `${F}69b612bb5a17bf65f51b886d/photos/S7oNit8pe3u4.webp`,
};
export const CARAS = [
  `${F}69b612bb5a17bf65f51b886d/photos/eC98QmqO43Sa.webp`,
  `${F}69f579d750a8d2c4c4369172/photos/MItHqSMuaSJL.webp`,
  `${F}6ac4187898f6058c2014dd80/photos/wLrFSFKT6iuO.webp`,
  `${F}69b612bb5a17bf65f51b8876/photos/NDRMy6yOsbk9.webp`,
  `${F}69b612bb5a17bf65f51b889c/photos/2EC65hYHJ-0K.webp`,
  `${F}6abcf1ed701df44fbf5bc493/photos/8dKVoLL47Pn8.webp`,
];

// Lo que necesita la escena de un evento. Sale de los eventos reales de esta noche en la ciudad;
// si todavía no llegan (o no hay), se usa uno de muestra.
export type EventoIntro = { titulo: string; lugar: string; inicio: string | null; genero: string; imagen: string; van: number; paises: string[] };

export const EVENTO_MUESTRA: EventoIntro = {
  titulo: 'Roda de Samba', lugar: 'Pedra do Sal, Saúde', inicio: null, genero: 'samba', imagen: FOTOS_INTRO.samba, van: 0, paises: [],
};
const AFICHES_MUESTRA = [FOTOS_INTRO.techno, FOTOS_INTRO.funk];

export function aEventoIntro(e: Evento): EventoIntro {
  return {
    titulo: e.titulo,
    lugar: e.lugar ?? e.barrio ?? '',
    inicio: e.inicio,
    genero: e.generos[0] ?? 'otro',
    imagen: e.imagen ?? FOTOS_INTRO.samba,
    van: e.asistencia?.van ?? 0,
    paises: e.asistencia?.paisesTop ?? [],
  };
}

export type DatosIntro = { principal: EventoIntro; afiches: string[]; total: number }; // total: eventos de esta noche

// ———— Movimiento ————

const FRENA = Easing.bezier(0.2, 0.7, 0.2, 1);

// 0 → 1 una sola vez, después de `retraso` ms. Con "reducir movimiento", queda en 1 desde el inicio.
function useEntrada(retraso: number, duracion = 650) {
  const quieto = useReducedMotion();
  const v = useSharedValue(quieto ? 1 : 0);
  useEffect(() => {
    if (!quieto) v.value = withDelay(retraso, withTiming(1, { duration: duracion, easing: FRENA }));
  }, [quieto, retraso, duracion, v]);
  return v;
}

// Va y vuelve sin parar (latidos suaves, puntos de "escribiendo").
function useVaiven(duracion: number, retraso = 0) {
  const quieto = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (!quieto) v.value = withDelay(retraso, withRepeat(withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [quieto, duracion, retraso, v]);
  return v;
}

function Aparece({ retraso = 0, desde = 12, duracion, style, children }: {
  retraso?: number; desde?: number; duracion?: number; style?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const v = useEntrada(retraso, duracion);
  const estilo = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * desde }] }));
  return <Animated.View style={[style, estilo]}>{children}</Animated.View>;
}

// Tarjeta de un abanico: sale del centro y se abre hacia su lado (-1 izquierda, 0 centro, 1 derecha).
function CartaAbanico({ lado, retraso, abre = 84, giro = 9, achica = 0.86, style, children }: {
  lado: -1 | 0 | 1; retraso: number; abre?: number; giro?: number; achica?: number; style?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const v = useEntrada(retraso, 900);
  const estilo = useAnimatedStyle(() => {
    const p = v.value;
    if (lado === 0) return { opacity: p, transform: [{ translateY: (1 - p) * 14 }] };
    return {
      opacity: p,
      transform: [
        { translateX: lado * abre * p },
        { translateY: 10 + (abre / 6 - 10) * p },
        { rotate: `${lado * giro * p}deg` },
        { scale: achica },
      ],
    };
  });
  return <Animated.View style={[s.carta, style, estilo, { zIndex: lado === 0 ? 2 : 1 }]}>{children}</Animated.View>;
}

const T = ({ style, ...props }: React.ComponentProps<typeof Text> & { style?: StyleProp<TextStyle> }) => (
  <Text {...props} style={[{ fontFamily: fuenteWeb, color: C.texto }, style]} />
);

// ———— 1 · Todo lo que pasa en la ciudad: tres afiches de esta noche que se abren en abanico ————

export function EscenaEventos({ datos }: { datos: DatosIntro }) {
  const { t } = useTranslation('auth');
  const { t: tc } = useTranslation();
  const e = datos.principal;
  const lados = [...datos.afiches, ...AFICHES_MUESTRA].slice(0, 2);
  const cuando = e.inicio ? `${tituloDia(e.inicio)} ${hora(e.inicio)}` : t('intro.eventoHoy');

  return (
    <View style={s.abanico}>
      <CartaAbanico lado={-1} retraso={1000}><FotoEvento url={lados[0]} tamano="medio" style={StyleSheet.absoluteFill} /></CartaAbanico>
      <CartaAbanico lado={1} retraso={1000}><FotoEvento url={lados[1]} tamano="medio" style={StyleSheet.absoluteFill} /></CartaAbanico>
      <CartaAbanico lado={0} retraso={280}>
        <FotoEvento url={e.imagen} tamano="medio" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(10,4,16,0)', 'rgba(10,4,16,0.8)', 'rgba(10,4,16,0.97)']} locations={[0.3, 0.6, 1]} style={StyleSheet.absoluteFill} />
        <View style={[s.genero, { backgroundColor: colorEtiquetaGenero(e.genero) }]}>
          <T style={s.generoTexto}>{nombreGenero(e.genero)}</T>
        </View>
        <View style={s.pieCarta}>
          <Text style={s.horaCarta} numberOfLines={1}>{cuando}</Text>
          <Text style={s.tituloCarta} numberOfLines={2}>{e.titulo}</Text>
          {e.lugar ? <T style={s.lugarCarta} numberOfLines={1}>{e.lugar}</T> : null}
        </View>
      </CartaAbanico>

      <Aparece retraso={2100} desde={8} style={s.pildoraVan}>
        {e.van >= 5 ? (
          <>
            <T style={s.pildoraTexto}>{tc('agenda.van', { count: e.van })}</T>
            {e.paises.length ? <Banderas codigos={e.paises} alto={11} max={4} gap={3} /> : null}
          </>
        ) : datos.total > 1 ? (
          <>
            <IconoBora nombre="musica" tamano={16} color={C.maracuja} />
            <T style={s.pildoraTexto}>{t('intro.eventosNoche', { count: datos.total })}</T>
          </>
        ) : (
          <>
            <Caras fotos={CARAS.slice(0, 3)} tamano={22} />
            <T style={s.pildoraTexto}>{t('intro.van')}</T>
            <Banderas codigos={['DE', 'AR', 'US', 'FR']} alto={11} gap={3} />
          </>
        )}
      </Aparece>
    </View>
  );
}

function Caras({ fotos, tamano }: { fotos: string[]; tamano: number }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {fotos.map((f, i) => (
        <View key={f} style={[s.caraBorde, { width: tamano, height: tamano, borderRadius: tamano / 2, marginLeft: i ? -tamano / 3 : 0 }]}>
          <FotoEvento url={f} style={StyleSheet.absoluteFill} />
        </View>
      ))}
    </View>
  );
}

// ———— 2 · Canal del evento: los mensajes llegan uno a uno ————

const MENSAJES = [
  { autor: 'Lena', pais: 'DE', texto: "Who's going from Copacabana?", cara: CARAS[0] },
  { autor: 'Mateo', pais: 'AR', texto: 'Yo salgo de Ipanema a las 18:30', cara: CARAS[1] },
  { autor: 'Camille', pais: 'FR', texto: 'Count me in!', cara: CARAS[2] },
];

function Punto({ retraso }: { retraso: number }) {
  const v = useVaiven(600, retraso);
  const estilo = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * v.value }));
  return <Animated.View style={[s.puntito, estilo]} />;
}

export function EscenaChat({ datos }: { datos: DatosIntro }) {
  const { t } = useTranslation('auth');
  const e = datos.principal;
  return (
    <View style={s.zonaPanel}>
      <Aparece style={s.panel}>
        <View style={s.cabeceraCanal}>
          <View style={s.miniAfiche}><FotoEvento url={e.imagen} style={StyleSheet.absoluteFill} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T style={s.tituloCanal} numberOfLines={1}>{e.titulo}</T>
            <View style={s.fila}>
              <View style={s.luz} />
              <T style={s.detalle}>{e.van >= 3 ? t('intro.canalAbierto', { count: e.van }) : t('intro.canalAbiertoSolo')}</T>
            </View>
          </View>
          <IconoBora nombre="canal" tamano={20} color={C.lila} />
        </View>
        <View style={{ padding: 14, gap: 12 }}>
          {MENSAJES.map((m, i) => (
            <Aparece key={m.autor} retraso={400 + i * 800} style={s.filaMensaje}>
              <View style={s.caraChat}><FotoEvento url={m.cara} style={StyleSheet.absoluteFill} /></View>
              <View style={{ flexShrink: 1 }}>
                <View style={s.autor}>
                  <T style={s.autorTexto}>{m.autor}</T>
                  <Bandera codigo={m.pais} alto={10} />
                </View>
                <View style={s.burbuja}><T style={s.textoBurbuja}>{m.texto}</T></View>
              </View>
            </Aparece>
          ))}
          <Aparece retraso={2900} style={s.burbujaMia}>
            <T style={[s.textoBurbuja, { color: C.onBoton, fontWeight: '600' }]}>{t('intro.vamosJuntos')}</T>
          </Aparece>
          <Aparece retraso={3700} desde={0} style={s.fila}>
            <View style={s.escribiendo}>
              <Punto retraso={0} /><Punto retraso={200} /><Punto retraso={400} />
            </View>
            <T style={s.detalle}>{t('intro.escribiendo', { nombre: 'Lena' })}</T>
          </Aparece>
        </View>
      </Aparece>
    </View>
  );
}

// ———— 3 · Arma tu previa: la ruta se dibuja y la gente se va uniendo ————

const RUTA = 'M58 30 C 100 26, 120 60, 170 54 S 230 30, 244 36';
const LARGO_RUTA = 220; // un poco más que el largo real: al llegar a 0 queda entera
const PathAnimado = Animated.createAnimatedComponent(Path);

function RutaPrevia() {
  const v = useEntrada(600, 2200);
  const props = useAnimatedProps(() => ({ strokeDashoffset: LARGO_RUTA * (1 - v.value) }));
  return (
    <Svg width="100%" height={84} viewBox="0 0 298 84" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Path d="M0 18h298M0 44h298M0 70h298M30 0v84M88 0v84M150 0v84M214 0v84M266 0v84" stroke="rgba(243,237,247,0.08)" strokeWidth={1} />
      <Path d="M-10 60 C 60 52, 110 78, 180 64 S 260 40, 310 50" stroke="rgba(243,237,247,0.16)" strokeWidth={6} fill="none" />
      <PathAnimado d={RUTA} stroke={C.lila} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeDasharray={[LARGO_RUTA, LARGO_RUTA]} animatedProps={props} />
    </Svg>
  );
}

function CaraQueSeUne({ url, retraso, primera }: { url: string; retraso: number; primera: boolean }) {
  const v = useEntrada(retraso, 600);
  const estilo = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.8 + 0.2 * v.value }] }));
  return (
    <Animated.View style={[s.caraBorde, s.caraPrevia, !primera && { marginLeft: -12 }, estilo]}>
      <FotoEvento url={url} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}

// Halo que respira detrás del botón (sin agrandar el botón: nada de rebotes).
function BotonConHalo({ texto }: { texto: string }) {
  const v = useVaiven(1400, 3500);
  const halo = useAnimatedStyle(() => ({ opacity: v.value * 0.35 }));
  return (
    <View>
      <Animated.View style={[s.halo, halo]} />
      <View style={s.botonUnirme}><T style={s.textoUnirme}>{texto}</T></View>
    </View>
  );
}

export function EscenaPrevia() {
  const { t } = useTranslation('auth');
  return (
    <View style={s.zonaPanel}>
      <Aparece style={[s.panel, { padding: 18, gap: 14, marginHorizontal: 8 }]}>
        <View style={[s.fila, { gap: 12 }]}>
          <View style={s.iconoPrevia}><IconoBora nombre="copa" tamano={26} color={C.lila} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={s.tituloPrevia}>{t('intro.previa')}</Text>
            <T style={s.detalle}>{t('intro.previaCuando')}</T>
          </View>
        </View>

        <View style={s.mapa}>
          <RutaPrevia />
          <View style={[s.marca, { left: '15%', top: 18, backgroundColor: C.boton }]}>
            <IconoBora nombre="copa" tamano={14} color={C.onBoton} grosor={2.6} />
          </View>
          <View style={[s.marca, { left: '78%', top: 24, backgroundColor: C.maracuja }]}>
            <IconoBora nombre="musica" tamano={14} color="#2E1F00" grosor={2.6} />
          </View>
          <T style={s.aPie}>{t('intro.aPie')}</T>
        </View>

        <View style={[s.fila, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row' }}>
            {CARAS.map((c, i) => <CaraQueSeUne key={c} url={c} retraso={900 + i * 400} primera={i === 0} />)}
          </View>
          <Aparece retraso={3400} desde={0}>
            <T style={s.cuenta}>{t('intro.seUnieron', { count: 6 })}</T>
          </Aparece>
        </View>

        <BotonConHalo texto={t('intro.unirme')} />
      </Aparece>
    </View>
  );
}

// ———— 4 · Viajeros de todo el mundo: perfiles con bandera, idiomas y países ————

const VIAJEROS = [
  { nombre: 'Mateo', pais: 'AR', idiomas: ['ES', 'EN', 'PT'], paises: ['CL', 'BR', 'US'], total: 9, portada: CARAS[1], color: '#FFC83D', lado: -1 as const },
  { nombre: 'Camille', pais: 'FR', idiomas: ['FR', 'EN'], paises: ['DE', 'US', 'BR'], total: 11, portada: CARAS[2], color: '#FF8A65', lado: 1 as const },
  { nombre: 'Hanna', pais: 'DE', idiomas: ['DE', 'EN', 'ES'], paises: ['BR', 'CL', 'AR', 'FR', 'US'], total: 14, portada: CARAS[0], color: '#C3A0FF', lado: 0 as const },
];

const CirculoAnimado = Animated.createAnimatedComponent(Circle);
const VUELTA = 2 * Math.PI * 8;

// Anillo que se va vaciando: el canal tiene fecha de cierre.
function Anillo() {
  const v = useEntrada(3800, 3000);
  const props = useAnimatedProps(() => ({ strokeDashoffset: VUELTA * 0.32 * v.value }));
  return (
    <Svg width={20} height={20} viewBox="0 0 20 20">
      <Circle cx={10} cy={10} r={8} fill="none" stroke="rgba(243,237,247,0.16)" strokeWidth={2.2} />
      <CirculoAnimado cx={10} cy={10} r={8} fill="none" stroke={C.maracuja} strokeWidth={2.2} strokeLinecap="round"
        strokeDasharray={[VUELTA, VUELTA]} animatedProps={props} transform="rotate(-90 10 10)" />
    </Svg>
  );
}

// Tarjeta de perfil: foto de un viaje como portada, la inicial en un círculo, bandera, idiomas y países.
function Perfil({ v }: { v: (typeof VIAJEROS)[number] }) {
  const { t } = useTranslation('auth');
  const centro = v.lado === 0;
  return (
    <CartaAbanico lado={v.lado} retraso={centro ? 280 : 1000} abre={92} giro={8} achica={0.84} style={s.perfil}>
      <View style={s.portada}>
        <FotoEvento url={v.portada} tamano="medio" style={StyleSheet.absoluteFill} />
        <LinearGradient colors={['rgba(28,16,36,0)', 'rgba(28,16,36,0.9)']} locations={[0.5, 1]} style={StyleSheet.absoluteFill} />
      </View>
      <View style={s.cuerpoPerfil}>
        <View style={[s.inicial, { backgroundColor: v.color }]}>
          <Text style={s.inicialTexto}>{v.nombre.charAt(0)}</Text>
        </View>
        <View style={[s.fila, { gap: 7 }]}>
          <Text style={s.nombrePerfil}>{v.nombre}</Text>
          <Bandera codigo={v.pais} alto={14} />
        </View>
        <Aparece retraso={centro ? 2400 : 1400} desde={6} style={{ flexDirection: 'row', gap: 4 }}>
          {v.idiomas.map((i) => <View key={i} style={s.idioma}><T style={s.idiomaTexto}>{i}</T></View>)}
        </Aparece>
        <Aparece retraso={centro ? 2800 : 1600} desde={6} style={s.fila}>
          <Banderas codigos={v.paises} alto={10} gap={3} />
          <T style={s.viajes}>{t('intro.paisesN', { count: v.total })}</T>
        </Aparece>
      </View>
    </CartaAbanico>
  );
}

export function EscenaMundo() {
  const { t } = useTranslation('auth');
  return (
    <View style={s.abanico}>
      {VIAJEROS.map((v) => <Perfil key={v.nombre} v={v} />)}
      <Aparece retraso={3500} desde={10} style={[s.pildoraVan, { top: 296, paddingLeft: 9 }]}>
        <Anillo />
        <T style={[s.pildoraTexto, { fontWeight: '600' }]}>{t('intro.canalSeCierra')}</T>
      </Aparece>
    </View>
  );
}

export const ESCENAS = [EscenaEventos, EscenaChat, EscenaPrevia, EscenaMundo] as const;

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  abanico: { width: 300, height: 360, alignSelf: 'center' },
  carta: { position: 'absolute', left: 55, top: 0, width: 190, height: 262, borderRadius: 10, overflow: 'hidden', backgroundColor: '#241830',
    shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  pieCarta: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 4 },
  horaCarta: { fontFamily: FuenteTitulo.cursiva, fontSize: 20, lineHeight: 22, color: C.maracuja, paddingRight: 2, flexShrink: 1 },
  genero: { position: 'absolute', top: 10, left: 10, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 3 },
  generoTexto: { fontSize: 11, fontWeight: '700' },
  tituloCarta: { fontFamily: FuenteTitulo.cursiva, fontSize: 28, lineHeight: 28, color: C.texto, paddingRight: 3 },
  lugarCarta: { fontSize: 12, color: '#D8CEE0' },
  pildoraVan: { position: 'absolute', top: 290, alignSelf: 'center', zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 6, backgroundColor: 'rgba(18,10,23,0.86)', borderWidth: 1, borderColor: 'rgba(243,237,247,0.14)' },
  pildoraTexto: { fontSize: 13, fontWeight: '700' },
  caraBorde: { overflow: 'hidden', borderWidth: 2, borderColor: '#1C1024', backgroundColor: '#241830' },
  zonaPanel: { paddingHorizontal: 20 },
  panel: { borderRadius: 12, backgroundColor: C.panel, borderWidth: 1, borderColor: C.borde, overflow: 'hidden' },
  cabeceraCanal: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(243,237,247,0.1)' },
  miniAfiche: { width: 36, height: 36, borderRadius: 6, overflow: 'hidden', backgroundColor: '#241830' },
  tituloCanal: { fontSize: 15, fontWeight: '700' },
  luz: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.vivo },
  detalle: { fontSize: 12, color: C.secundario },
  filaMensaje: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  caraChat: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden', backgroundColor: '#241830' },
  autor: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 2, marginBottom: 4 },
  autorTexto: { fontSize: 12, fontWeight: '700', color: '#C9BED3' },
  burbuja: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderBottomLeftRadius: 4, backgroundColor: 'rgba(243,237,247,0.1)' },
  burbujaMia: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderBottomRightRadius: 4, backgroundColor: C.boton },
  textoBurbuja: { fontSize: 15, lineHeight: 20 },
  escribiendo: { flexDirection: 'row', gap: 3, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(243,237,247,0.08)' },
  puntito: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C9BED3' },
  iconoPrevia: { width: 46, height: 46, borderRadius: 8, backgroundColor: 'rgba(185,140,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  tituloPrevia: { fontFamily: FuenteTitulo.cursiva, fontSize: 26, lineHeight: 27, color: C.texto, paddingRight: 3 },
  mapa: { height: 84, borderRadius: 8, overflow: 'hidden', backgroundColor: '#1B1123' },
  marca: { position: 'absolute', width: 24, height: 24, borderRadius: 12, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  aPie: { position: 'absolute', right: 10, bottom: 8, fontSize: 11, fontWeight: '700', color: '#D8CEE0' },
  caraPrevia: { width: 34, height: 34, borderRadius: 17 },
  cuenta: { fontSize: 14, fontWeight: '700' },
  halo: { position: 'absolute', top: -6, left: -6, right: -6, bottom: -6, borderRadius: 12, backgroundColor: 'rgba(185,140,255,0.4)' },
  botonUnirme: { height: 46, borderRadius: 8, backgroundColor: C.boton, alignItems: 'center', justifyContent: 'center' },
  textoUnirme: { color: C.onBoton, fontSize: 16, fontWeight: '700' },
  perfil: { left: 47, width: 206, height: 268, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(243,237,247,0.1)', backgroundColor: '#1C1024' },
  portada: { height: 150, overflow: 'hidden', backgroundColor: '#241830' },
  cuerpoPerfil: { flex: 1, paddingHorizontal: 12, paddingBottom: 12, gap: 7, marginTop: -28 },
  inicial: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, borderColor: '#1C1024', alignItems: 'center', justifyContent: 'center' },
  inicialTexto: { fontFamily: FuenteTitulo.cursiva, fontSize: 26, lineHeight: 30, color: '#1A0B2B', paddingRight: 2 },
  nombrePerfil: { fontFamily: FuenteTitulo.cursiva, fontSize: 28, lineHeight: 29, color: C.texto, paddingRight: 3 },
  idioma: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, backgroundColor: 'rgba(185,140,255,0.2)' },
  idiomaTexto: { fontSize: 11, fontWeight: '700', color: '#E2D2FF' },
  viajes: { fontSize: 12, fontWeight: '600', color: '#C9BED3' },
});
