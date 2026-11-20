import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, BackHandler, FlatList, Keyboard, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View,
  type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { useKeyboardHandler, useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeOut, Keyframe, LinearTransition, SlideInLeft, SlideInRight, useAnimatedStyle, useSharedValue, withTiming, ZoomIn, ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HojaAsistentes } from '@/components/asistentes';
import { Bandera } from '@/components/bandera';
import { HojaEditarCanal } from '@/components/chat/editar-canal';
import { NOMBRES_IDIOMA, PanelClave, PanelNormas, SelectorSalas } from '@/components/canales';
import { PanelExpresion, type ModoPanel } from '@/components/chat/panel-expresion';
import { StickerAnimado } from '@/components/chat/sticker-animado';
import { ChatVacio, FondoEvento, VistaPreviaCanal } from '@/components/chat/vista-previa';
import { AvisoTopicos, HojaTopico, IconoTopico, ListaTopicos } from '@/components/chat/topicos';
import { DeslizarParaResponder } from '@/components/deslizar-responder';
import { FilaReacciones, PanelEmojis, Pop, useSalto } from '@/components/emojis';
import { HojaNuevaEncuesta, TarjetaEncuesta } from '@/components/encuesta';
import { HojaAcciones, type OpcionHoja } from '@/components/hoja-acciones';
import { MenuMensaje, type Ancla } from '@/components/chat/menu-mensaje';
import { Icono } from '@/components/ui';
import { BotonAqui, CabezaAqui, useYaAqui } from '@/components/ya-aqui';
import { PantallaMiembros } from '@/components/miembros';
import { ModalBloquear, ModalModoLento, ModalPerfilIncompleto, textoTiempo, useBloqueos } from '@/components/seguridad';
import { useSesion } from '@/context/sesion';
import { useChat } from '@/hooks/use-chat';
import { tieneTopicos, useTopicos } from '@/hooks/use-topicos';
import { useTheme } from '@/hooks/use-theme';
import { api, MOTIVOS_REPORTE, SALAS_IDIOMA, type Autor, type CanalPropio, type Evento, type Gif, type MensajeChat, type Topico, type TopicoResumen } from '@/lib/api';
import { compartirCanal } from '@/lib/compartir-canal';
import { claveDiaDispositivo, etiquetaDiaChat, hora, horaDispositivo } from '@/lib/fechas';
import { aplicarFormato, quitarFormato, textoConFormato, type Formato } from '@/lib/formato';
import i18n from '@/lib/i18n';
import { obtenerSocket } from '@/lib/socket';
import { textoAviso } from '@/lib/sistema';
import { emojisSolos } from '@/lib/stickers';
import { FotoEvento } from '@/components/foto-evento';

// Mensajes seguidos de la misma persona (con menos de 5 minutos entre sí) se agrupan:
// sin repetir nombre ni foto, y con las esquinas de las burbujas unidas, como en Telegram.
const AGRUPAR_MS = 5 * 60 * 1000;
// Lo mismo que permite el servidor para editar o borrar un mensaje propio.
const EDITAR_MS = 15 * 60 * 1000;
const sePuedeEditar = (m: MensajeChat) => Date.now() - new Date(m.fecha).getTime() < EDITAR_MS;
const MAX_TEXTO = 500;
// Alto del panel de emojis y stickers antes de conocer el del teclado (después se usa el del teclado).
const ALTO_PANEL_INICIAL = Platform.OS === 'ios' ? 336 : 300;
const TAMANO_STICKER = 150;

// Botones de formato que aparecen al seleccionar texto en el campo (como en Telegram).
const BOTONES_FORMATO: { formato: Formato; letra: string; estilo: object }[] = [
  { formato: 'negrita', letra: 'B', estilo: { fontWeight: '800' } },
  { formato: 'cursiva', letra: 'I', estilo: { fontStyle: 'italic', fontWeight: '600' } },
  { formato: 'subrayado', letra: 'U', estilo: { textDecorationLine: 'underline', fontWeight: '600' } },
  { formato: 'tachado', letra: 'S', estilo: { textDecorationLine: 'line-through', fontWeight: '600' } },
];

type Item =
  | { tipo: 'dia'; clave: string; etiqueta: string }
  | { tipo: 'nuevos' }
  | { tipo: 'aviso'; m: MensajeChat }
  | { tipo: 'msg'; m: MensajeChat; agrupado: boolean; continua: boolean };

// Al reaccionar, el emoji salta grande sobre el mensaje y se va hacia arriba (como en Telegram).
const ESTALLIDO = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 0 }, { scale: 0.3 }] },
  25: { opacity: 1, transform: [{ translateY: -14 }, { scale: 1.7 }] },
  60: { opacity: 1, transform: [{ translateY: -30 }, { scale: 1.25 }] },
  100: { opacity: 0, transform: [{ translateY: -56 }, { scale: 1 }] },
}).duration(850);
const DOBLE_TOQUE_MS = 280;
const REACCION_DOBLE_TOQUE = '❤️';

// Colores del tema (modo claro y modo noche)
type Tema = ReturnType<typeof useTheme>;
function colores(t: Tema) {
  return {
    fondo: t.background,
    barra: t.bar,
    separador: t.separator,
    burbujaOtro: t.bubbleIn,
    acento: t.accent,
    acentoTexto: t.accentText,
    sobreAcento: t.onAccent,
    secundario: t.textSecondary,
    texto: t.text,
    campo: t.field,
    burbujaMia: t.bubbleOut,
    sobreBurbujaMia: t.onBubbleOut,
    horaBurbujaMia: t.bubbleOutMeta,
    papel: t.chatWallpaper,
    dibujo: t.chatPattern,
    oscuro: t.background !== '#FFFFFF',
    avatarVacio: t.backgroundSelected,
    tarjeta: t.card,
  };
}

function avisar(texto: string) {
  if (Platform.OS === 'web') globalThis.alert?.(texto);
  else Alert.alert(i18n.t('chat.titulo'), texto);
}

const vibrar = (estilo: 'leve' | 'seleccion' = 'leve') => {
  if (Platform.OS === 'web') return;
  (estilo === 'seleccion' ? Haptics.selectionAsync() : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)).catch(() => {});
};

// Cita del mensaje al que se responde (dentro de la burbuja o sobre el campo de texto).
function Cita({ nombre, texto, mia, onPress }: { nombre: string; texto: string; mia?: boolean; onPress?: () => void }) {
  const styles = useEstilos();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.cita, mia ? styles.citaMia : styles.citaOtro]}>
      <View style={[styles.citaLinea, mia && styles.citaLineaMia]} />
      <View style={{ flexShrink: 1 }}>
        <Text style={[styles.citaNombre, mia && styles.citaTextoMio]} numberOfLines={1}>{nombre}</Text>
        <Text style={[styles.citaTexto, mia && styles.citaTextoMio]} numberOfLines={2}>{quitarFormato(texto)}</Text>
      </View>
    </Pressable>
  );
}

// Hora (y reloj si aún no llega al servidor) sobre un sticker o un emoji grande.
function HoraFlotante({ texto, pendiente }: { texto: string; pendiente?: boolean }) {
  const styles = useEstilos();
  return (
    <View style={styles.horaFlotante}>
      {pendiente ? <Icono nombre="clock" tamano={10} color="#FFFFFF" /> : null}
      <Text style={styles.horaFlotanteTexto}>{texto}</Text>
    </View>
  );
}

// Reacción debajo de un mensaje: sin borde; la tuya va rellena de morado (como en Telegram).
// Aparece con un "pop" y la cuenta salta cuando cambia.
function ChipReaccion({ emoji, cuenta, mio, onPress }: { emoji: string; cuenta: number; mio: boolean; onPress: () => void }) {
  const styles = useEstilos();
  const t = useTheme();
  const salto = useSalto(`${cuenta}-${mio}`);
  return (
    <Pop>
      <Animated.View style={salto}>
        <Pressable
          onPress={onPress}
          accessibilityLabel={`${emoji} ${cuenta}`}
          style={({ pressed }) => [styles.chip, mio && { backgroundColor: t.accent }, pressed && { opacity: 0.7 }]}>
          <Text style={styles.chipEmoji}>{emoji}</Text>
          {cuenta > 1 ? <Text style={[styles.chipCuenta, mio && { color: t.onAccent }]}>{cuenta}</Text> : null}
        </Pressable>
      </Animated.View>
    </Pop>
  );
}

// Para la copia del mensaje en el menú: no responde a nada.
const nada = () => {};

type DatosVista = { mia: boolean; agrupado: boolean; continua: boolean; aqui: boolean; edad?: number };

const Burbuja = memo(function Burbuja({ m, mia, agrupado, continua, yo, resaltado, aqui, edad, clon, oculto, onMenu, onPerfil, onReaccion, onIrACita, onResponder, onVotar }: {
  m: MensajeChat; mia: boolean; yo?: string; resaltado: boolean;
  agrupado: boolean; // sigue a otro mensaje de la misma persona (sin nombre)
  continua: boolean; // el siguiente también es de la misma persona (sin foto, esquina unida)
  aqui: boolean; // la persona marcó "Ya estoy aquí"
  edad?: number; // solo la ven el creador de un canal propio y los admins

  oculto?: boolean; // mientras su copia está en el menú
  clon?: boolean; // copia que se muestra encima en el menú del mensaje (sin gestos ni márgenes)
  onMenu: (m: MensajeChat, ancla: Ancla, vista: DatosVista) => void; onPerfil: (m: MensajeChat) => void; onReaccion: (m: MensajeChat, emoji: string) => void; onIrACita: (id: string) => void;
  onResponder: (m: MensajeChat) => void;
  onVotar: (m: MensajeChat, opcion: number) => void;
}) {
  const styles = useEstilos();
  const t = useTheme();
  const { t: tr } = useTranslation();
  // "editado" va junto a la hora, como en Telegram.
  const horaTexto = m.editado ? `${tr('chat.editado')} ${horaDispositivo(m.fecha)}` : horaDispositivo(m.fecha);
  const reacciones = m.reacciones ?? [];
  // Stickers, GIFs y mensajes de solo emojis (hasta 3) van grandes y sin burbuja.
  const emojis = !m.sticker && !m.gif && !m.encuesta && !m.respuestaA ? emojisSolos(m.texto) : null;
  const sinBurbuja = Boolean(m.sticker || m.gif || emojis);

  // Cuando mi reacción cambia a un emoji nuevo, ese emoji "salta" sobre el mensaje.
  const miReaccion = (yo && reacciones.find((r) => r.usuarios.includes(yo))?.emoji) || null;
  const [reaccionVista, setReaccionVista] = useState(miReaccion);
  const [estallido, setEstallido] = useState<{ emoji: string; n: number } | null>(null);
  if (miReaccion !== reaccionVista) {
    setReaccionVista(miReaccion);
    if (miReaccion) setEstallido((e) => ({ emoji: miReaccion, n: (e?.n ?? 0) + 1 }));
  }
  useEffect(() => {
    if (!estallido) return;
    const id = setTimeout(() => setEstallido(null), 900);
    return () => clearTimeout(id);
  }, [estallido]);

  // La fila se mide en la pantalla para que el menú ponga la copia del mensaje justo encima.
  const filaRef = useRef<ComponentRef<typeof View>>(null);
  const apriete = useSharedValue(1);
  const estiloApriete = useAnimatedStyle(() => ({ transform: [{ scale: apriete.value }] }));
  const alMenu = () => {
    if (m.pendiente || clon) return;
    vibrar('seleccion');
    apriete.set(withTiming(1, { duration: 120 }));
    filaRef.current?.measureInWindow((x, y, ancho, alto) => {
      onMenu(m, { x, y, ancho, alto }, { mia, agrupado, continua, aqui, edad });
    });
  };
  // Doble toque: ❤️ (como en Telegram e Instagram). Otro doble toque lo quita.
  const ultimoToque = useRef(0);
  const alTocar = () => {
    if (m.pendiente) return;
    const ahora = Date.now();
    if (ahora - ultimoToque.current < DOBLE_TOQUE_MS) {
      ultimoToque.current = 0;
      vibrar();
      onReaccion(m, REACCION_DOBLE_TOQUE);
    } else {
      ultimoToque.current = ahora;
    }
  };
  // Mientras se mantiene apretado, el mensaje se achica un poco (como en Telegram) hasta que abre el menú.
  const toque = {
    onPress: alTocar,
    onLongPress: alMenu,
    onPressIn: () => { if (!clon && !m.pendiente) apriete.set(withTiming(0.96, { duration: 280, easing: Easing.out(Easing.quad) })); },
    onPressOut: () => apriete.set(withTiming(1, { duration: 140 })),
    delayLongPress: 280,
    // En la web también con clic derecho
    ...(Platform.OS === 'web' ? { onContextMenu: (e: { preventDefault: () => void }) => { e.preventDefault(); alMenu(); } } : {}),
  };

  // Esquinas: la del lado de quien escribe se achica donde se une con el mensaje anterior o el siguiente.
  const esquinas = mia
    ? { borderTopRightRadius: agrupado ? 6 : 18, borderBottomRightRadius: continua ? 6 : 18 }
    : { borderTopLeftRadius: agrupado ? 6 : 18, borderBottomLeftRadius: continua ? 6 : 18 };

  const contenido = sinBurbuja ? (
    <Pressable {...toque} style={[mia ? styles.grandeMio : styles.grandeOtro, resaltado && styles.resaltado, m.pendiente && { opacity: 0.6 }]}>
      {m.respuestaA ? (
        <View style={[mia ? styles.burbujaMia : styles.burbujaOtro, { marginBottom: 4 }]}>
          <Cita nombre={m.respuestaA.autorId === yo ? tr('chat.tu') : m.respuestaA.autorNombre} texto={m.respuestaA.texto} mia={mia} onPress={() => onIrACita(m.respuestaA!.id)} />
        </View>
      ) : null}
      {m.gif
        ? <Image source={{ uri: m.gif.url }} placeholder={{ uri: m.gif.preview }} style={[styles.gif, { aspectRatio: Math.max(0.5, Math.min(2, m.gif.ancho / m.gif.alto)) }]} contentFit="cover" cachePolicy="memory-disk" transition={150} />
        : m.sticker
        ? <StickerAnimado emoji={m.texto} codigo={m.sticker} tamano={TAMANO_STICKER} />
        : emojis!.length === 1
          ? <StickerAnimado emoji={emojis![0]} tamano={96} />
          : <Text style={styles.emojisGrandes} allowFontScaling={false}>{emojis!.join('')}</Text>}
      <HoraFlotante texto={horaTexto} pendiente={m.pendiente} />
    </Pressable>
  ) : (
    <Pressable
      {...toque}
      style={({ pressed }) => [
        mia ? styles.burbujaMia : styles.burbujaOtro,
        esquinas,
        pressed && { opacity: 0.85 },
        resaltado && styles.resaltado,
      ]}>
      {m.respuestaA ? (
        <Cita
          nombre={m.respuestaA.autorId === yo ? tr('chat.tu') : m.respuestaA.autorNombre}
          texto={m.respuestaA.texto}
          mia={mia}
          onPress={() => onIrACita(m.respuestaA!.id)}
        />
      ) : null}
      {m.encuesta ? (
        <TarjetaEncuesta pregunta={m.texto} encuesta={m.encuesta} yo={yo} mia={mia} onVotar={(i) => onVotar(m, i)} />
      ) : (
        <Text style={mia ? styles.textoMio : styles.textoOtro}>
          {textoConFormato(m.texto, mia ? t.onAccent : t.text)}
          {/* Espacio para que la hora no se monte sobre el texto. Va del color de la burbuja:
              en Android el color 'transparent' dentro de un texto a veces se ve y la hora salía dos veces. */}
          <Text style={mia ? styles.espacioHoraMia : styles.espacioHoraOtro}>{`   ${horaTexto}${m.pendiente ? '   ' : ''}`}</Text>
        </Text>
      )}
      <View style={styles.horaCaja}>
        <Text style={[styles.hora, mia && styles.horaMia]}>{horaTexto}</Text>
        {m.pendiente ? <Icono nombre="clock" tamano={10} color={mia ? t.onAccent : t.textSecondary} /> : null}
      </View>
    </Pressable>
  );

  const chips = reacciones.length ? (
    <Animated.View layout={LinearTransition.duration(180)} style={[styles.reacciones, mia ? { alignSelf: 'flex-end' } : { marginLeft: 36 }]}>
      {reacciones.map((r) => (
        <ChipReaccion key={r.emoji} emoji={r.emoji} cuenta={r.usuarios.length} mio={Boolean(yo && r.usuarios.includes(yo))} onPress={() => onReaccion(m, r.emoji)} />
      ))}
    </Animated.View>
  ) : null;

  // Los mensajes propios entran desde abajo (como en Telegram); el resto solo aparece.
  const entrada = m.pendiente ? FadeInDown.duration(160) : undefined;
  const salto = estallido ? (
    <Animated.Text key={estallido.n} entering={ESTALLIDO} pointerEvents="none" style={[styles.estallido, mia ? { right: 8 } : { left: 44 }]}>
      {estallido.emoji}
    </Animated.Text>
  ) : null;

  const contenidoVivo = clon ? contenido : <Animated.View style={estiloApriete}>{contenido}</Animated.View>;

  if (mia) {
    const fila = (
      <Animated.View ref={filaRef} entering={clon ? undefined : entrada} style={[styles.filaMia, clon ? { maxWidth: '100%' } : !agrupado && styles.separacion, oculto && { opacity: 0 }]}>
        {contenidoVivo}
        {chips}
        {clon ? null : salto}
      </Animated.View>
    );
    return clon ? fila : <DeslizarParaResponder onResponder={() => onResponder(m)}>{fila}</DeslizarParaResponder>;
  }
  // Quien habla muestra su país. La edad, solo al creador de un canal propio y a los admins.
  // Como en Telegram: el nombre arriba del primer mensaje y la foto junto al último.
  const fila = (
      <View ref={filaRef} style={[!agrupado && !clon && styles.separacion, oculto && { opacity: 0 }]}>
        <View style={styles.filaOtro}>
          <Pressable onPress={() => onPerfil(m)} disabled={continua} style={styles.avatar} accessibilityLabel={m.autor.nombreVisible}>
            {!continua && (m.autor.foto
              ? <Image source={{ uri: m.autor.foto }} style={styles.avatar} transition={120} cachePolicy="memory-disk" />
              : <Text style={styles.inicial}>{m.autor.nombreVisible.charAt(0)}</Text>)}
          </Pressable>
          <View style={styles.columnaOtro}>
            {!agrupado && (
              <View style={styles.metaAutor}>
                <Text style={styles.nombreAutor} onPress={() => onPerfil(m)}>{m.autor.eliminada ? tr('cuentaEliminada') : m.autor.nombreVisible}</Text>
                {m.autor.admin ? <Icono nombre="checkmark.seal.fill" tamano={12} color={t.text} /> : null}
                {m.autor.moderador ? (
                  <View style={styles.selloMod} accessibilityLabel={tr('miembros.moderador')}>
                    <Icono nombre="shield.lefthalf.filled" tamano={9} color={t.text} />
                    <Text style={styles.selloAquiTexto}>{tr('miembros.moderador')}</Text>
                  </View>
                ) : null}
                {m.autor.pais ? <Bandera codigo={m.autor.pais} alto={10} /> : null}
                {edad ? <Text style={styles.edadAutor}>{edad}</Text> : null}
                {m.autor.edadVerificada ? <Icono nombre="checkmark.seal.fill" tamano={11} color={t.textSecondary} /> : null}
                {aqui ? (
                  <View style={styles.selloAqui} accessibilityLabel={tr('aqui.sello')}>
                    <Icono nombre="location.fill" tamano={9} color={t.text} />
                    <Text style={styles.selloAquiTexto}>{tr('aqui.sello')}</Text>
                  </View>
                ) : null}
              </View>
            )}
            {contenidoVivo}
          </View>
        </View>
        {chips}
        {clon ? null : salto}
      </View>
  );
  return clon ? fila : <DeslizarParaResponder onResponder={() => onResponder(m)}>{fila}</DeslizarParaResponder>;
});

// Aviso del sistema en el chat: "Lena se unió", "Lena creó el tópico 🚕 Transporte" (tocándolo se entra).
const AvisoChat = memo(function AvisoChat({ m, yo, onAbrir }: { m: MensajeChat; yo?: string; onAbrir: (m: MensajeChat) => void }) {
  const styles = useEstilos();
  const { t: tr } = useTranslation();
  const t = useTheme();
  if (!m.sistema) return null;
  const quien = m.autor.id === yo ? tr('chat.tu') : m.autor.nombreVisible;
  const lleva = m.sistema.tipo !== 'unido' && Boolean(m.sistema.id);
  return (
    <Animated.View entering={m.pendiente ? undefined : FadeIn.duration(220)} style={styles.avisoFila}>
      <Pressable onPress={() => lleva && onAbrir(m)} disabled={!lleva} style={({ pressed }) => [styles.aviso2, pressed && { opacity: 0.6 }]}>
        <Text style={styles.avisoTexto}>{textoAviso(m.sistema, quien, tr, m.autor.id === yo)}</Text>
        {lleva ? <Icono nombre="chevron.right" tamano={11} color={t.textSecondary} peso="semibold" /> : null}
      </Pressable>
    </Animated.View>
  );
});

function SeparadorDia({ etiqueta }: { etiqueta: string }) {
  const styles = useEstilos();
  return (
    <View style={styles.dia}>
      <Text style={styles.diaTexto}>{etiqueta}</Text>
    </View>
  );
}

export default function ChatScreen() {
  const { id, sala: salaParam, topico: topicoParam } = useLocalSearchParams<{ id: string; sala?: string; topico?: string }>();
  const sala = salaParam || 'general';
  const esIdioma = (SALAS_IDIOMA as readonly string[]).includes(sala);
  const insets = useSafeAreaInsets();
  const styles = useEstilos();
  const t = useTheme();
  const { usuario, token } = useSesion();
  const { t: tr, i18n: i18nHook } = useTranslation();

  // ---------- Tópicos ----------
  // Una sala con tópicos abre en su lista (como un grupo con temas en Telegram); al tocar uno se entra.
  const topicoElegido = topicoParam || undefined;
  const topicos = useTopicos(id, sala, !topicoElegido);
  const conocidos = topicos.topicos ? topicos.topicos.length > 1 : id ? tieneTopicos(id, sala) : undefined;
  // Sin sesión (o sin evento) no hay lista que pedir: el chat muestra "Inicia sesión".
  const modo: 'lista' | 'chat' | 'cargando' = topicoElegido || !token || !id ? 'chat'
    : conocidos === undefined ? (topicos.error ? 'chat' : 'cargando')
    : conocidos ? 'lista' : 'chat';
  const enLista = modo === 'lista';
  // Sin cuenta o sin aceptar las normas, las salas abiertas (General y de idioma) se muestran en modo
  // lectura con sus últimos mensajes. Los canales propios no se adelantan.
  const vistaPrevia = Boolean(id) && (SALAS_IDIOMA as readonly string[]).includes(sala) && !topicoElegido;
  const [verNormas, setVerNormas] = useState(false);

  const {
    estado, error, mensajes, escribiendo, enviar, avisarEscribiendo, reportarMensaje, reaccionar, reintentar,
    leidoHasta, fijado, puedeFijar, puedeEncuesta, fijar, crearEncuesta, votar,
    modoLento, esperaHasta, cambiarModoLento, miembro, unirme, salir, eliminar, editar, borrar, soloLectura,
    infoTopico, silenciada, silenciar,
  } = useChat(id, sala, topicoElegido ?? (conocidos ? 'general' : undefined), modo === 'chat');
  const { ids: bloqueados } = useBloqueos();
  const [bloquear, setBloquear] = useState<Autor | null>(null);
  const [ajusteLento, setAjusteLento] = useState(false);
  const [hojaTopico, setHojaTopico] = useState<{ editar: Topico | null } | null>(null);
  const [verAsistentes, setVerAsistentes] = useState(false);
  const [editandoCanal, setEditandoCanal] = useState<CanalPropio | null>(null);
  // Modo lento: cuenta regresiva hasta poder volver a escribir (se refresca cada segundo mientras falta).
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  useEffect(() => {
    if (!esperaHasta) return;
    const actualizar = () => {
      const n = Math.max(0, Math.ceil((esperaHasta - Date.now()) / 1000));
      setSegundosRestantes(n);
      if (!n) clearInterval(intervalo);
    };
    const primero = setTimeout(actualizar, 0);
    const intervalo = setInterval(actualizar, 1000);
    return () => {
      clearTimeout(primero);
      clearInterval(intervalo);
    };
  }, [esperaHasta]);
  const faltan = esperaHasta ? segundosRestantes : 0;
  const esperando = faltan > 0;
  const [nuevaEncuesta, setNuevaEncuesta] = useState(false);
  const [evento, setEvento] = useState<Evento | null>(null);
  const aqui = useYaAqui(evento, true);
  const [canales, setCanales] = useState<CanalPropio[]>([]);
  const [texto, setTexto] = useState('');
  const seleccion = useRef({ start: 0, end: 0 });
  const [haySeleccionTexto, setHaySeleccionTexto] = useState(false);
  const [respondiendo, setRespondiendo] = useState<MensajeChat | null>(null);
  // Mensaje propio que se está editando: el campo de texto lo trae y "enviar" lo guarda.
  const [editando, setEditando] = useState<MensajeChat | null>(null);
  const [enviandoEdicion, setEnviandoEdicion] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [menu, setMenu] = useState<{
    m: MensajeChat; ancla: Ancla; vista: DatosVista; opciones: OpcionHoja[]; reaccion?: string; todos: boolean;
  } | null>(null);
  const [hoja, setHoja] = useState<{ titulo?: string; mensaje?: string; opciones: OpcionHoja[]; encabezado?: ReactNode } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const lista = useRef<FlatList<Item>>(null);
  const campo = useRef<ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (id) api<{ evento: Evento }>(`/events/${id}`, { token }).then((r) => setEvento(r.evento)).catch(() => {});
  }, [id, token]);

  // Canales propios del evento (se recargan al volver, por ejemplo después de crear uno).
  const cargarCanales = useCallback(() => {
    if (id) api<{ canales: CanalPropio[] }>(`/canales/evento/${id}`, { token }).then((r) => setCanales(r.canales)).catch(() => {});
  }, [id, token]);
  useFocusEffect(cargarCanales);
  // Si quien creó el canal cambia su nombre o descripción, se ve al instante.
  useEffect(() => {
    if (!token) return;
    const s = obtenerSocket(token);
    const alCambio = ({ canalId }: { canalId: string }) => { if (canalId === sala) cargarCanales(); };
    s.on('chat:canal', alCambio);
    return () => { s.off('chat:canal', alCambio); };
  }, [token, sala, cargarCanales]);
  const canal = esIdioma ? undefined : canales.find((c) => c.id === sala);

  // Edades: el servidor solo se las da al creador de un canal propio y a los admins
  // (y no las de quienes las ocultaron). No viajan en los mensajes.
  const verEdades = Boolean(usuario?.verEdades || canal?.esMio);
  const [edades, setEdades] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!verEdades || !id || estado !== 'listo') return;
    api<{ personas: Autor[] }>(`/canales/evento/${id}/miembros?sala=${encodeURIComponent(sala)}`, { token })
      .then((r) => setEdades(Object.fromEntries(r.personas.filter((p) => p.edad).map((p) => [p.id, p.edad as number]))))
      .catch(() => {});
  }, [verEdades, id, sala, token, estado]);
  const edadDe = (autorId: string) => (verEdades ? edades[autorId] : undefined);

  // Sin perfil completo no se puede escribir: se explica qué falta y se lleva al perfil.
  const [perfilPendiente, setPerfilPendiente] = useState(false);

  // ---------- Teclado y panel de emojis/stickers (como Telegram) ----------
  // Debajo de la barra de escribir hay un espacio que mide lo mismo que el teclado. Cuando se cambia
  // del teclado al panel (o al revés), el panel ocupa ese espacio mientras el teclado entra o sale:
  // la barra no salta. El espacio se anima en el hilo de la interfaz, cuadro a cuadro.
  const { height: alturaTeclado } = useReanimatedKeyboardAnimation();
  const altoPanel = useSharedValue(ALTO_PANEL_INICIAL);
  const [altoPanelJs, setAltoPanelJs] = useState(ALTO_PANEL_INICIAL);
  const panelAbierto = useSharedValue(0);
  const [panel, setPanel] = useState<ModoPanel | null>(null);
  const [modoPanel, setModoPanel] = useState<ModoPanel>('emojis');
  const panelRef = useRef<ModoPanel | null>(null);
  useEffect(() => { panelRef.current = panel; }, [panel]);
  const cierrePanel = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useKeyboardHandler({
    onEnd: (e) => {
      'worklet';
      // El panel toma el alto del teclado (cada teléfono tiene el suyo).
      if (e.height > 120) altoPanel.value = e.height;
    },
  }, []);
  useEffect(() => {
    const mostrar = Keyboard.addListener('keyboardDidShow', (e) => {
      const h = e.endCoordinates.height;
      if (h > 120) setAltoPanelJs(h);
      // Ya se ve el teclado: el panel que estaba debajo se quita sin que se note.
      if (panelRef.current) {
        clearTimeout(cierrePanel.current);
        panelAbierto.set(0);
        panelRef.current = null;
        setPanel(null);
      }
    });
    return () => mostrar.remove();
  }, [panelAbierto]);

  const espacioInferior = useAnimatedStyle(() => ({
    height: Math.max(-alturaTeclado.value, panelAbierto.value * altoPanel.value, insets.bottom),
  }));

  const abrirPanel = (m: ModoPanel) => {
    clearTimeout(cierrePanel.current);
    setModoPanel(m);
    setPanel(m);
    panelRef.current = m;
    const tecladoAbierto = -alturaTeclado.get() > 40;
    // Con el teclado abierto el panel aparece detrás de él (sin animar) y el teclado baja encima.
    panelAbierto.set(tecladoAbierto ? 1 : withTiming(1, { duration: 220 }));
    if (tecladoAbierto) Keyboard.dismiss();
  };
  const cerrarPanel = useCallback(() => {
    if (!panelRef.current) return;
    panelRef.current = null;
    panelAbierto.set(withTiming(0, { duration: 200 }));
    clearTimeout(cierrePanel.current);
    cierrePanel.current = setTimeout(() => setPanel(null), 210);
  }, [panelAbierto]);
  const alternarPanel = () => {
    if (panel) {
      // Del panel al teclado: el panel queda hasta que el teclado termina de subir.
      campo.current?.focus();
      if (Platform.OS === 'web') cerrarPanel();
    } else {
      abrirPanel(modoPanel);
    }
  };
  // Atrás en Android cierra primero el panel.
  useEffect(() => {
    if (!panel) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { cerrarPanel(); return true; });
    return () => sub.remove();
  }, [panel, cerrarPanel]);

  // ---------- Lista de mensajes ----------
  // Mensajes con separadores de día ("Hoy", "Ayer", "Jueves", "12 de octubre").
  // Los mensajes de personas bloqueadas no se muestran (el servidor ya los quita del historial).
  const visibles = useMemo(() => (bloqueados.size ? mensajes.filter((m) => !bloqueados.has(m.autor.id)) : mensajes), [mensajes, bloqueados]);

  // La lista va invertida (lo último abajo, como en Telegram): parte en el último mensaje sin saltos
  // y los nuevos no mueven lo que se está leyendo más arriba.
  const items = useMemo<Item[]>(() => {
    const salida: Item[] = [];
    let diaAnterior = '';
    // "Mensajes nuevos" va antes del primero de otra persona que llegó después de la última visita.
    const limite = leidoHasta ? new Date(leidoHasta).getTime() : null;
    const primerNuevo = limite === null ? -1
      : visibles.findIndex((m) => m.autor.id !== usuario?.id && !m.sistema && new Date(m.fecha).getTime() > limite);
    const seAgrupa = (a: MensajeChat | undefined, b: MensajeChat | undefined) => Boolean(a && b && !a.sistema && !b.sistema && a.autor.id === b.autor.id
      && claveDiaDispositivo(a.fecha) === claveDiaDispositivo(b.fecha)
      && Math.abs(new Date(b.fecha).getTime() - new Date(a.fecha).getTime()) < AGRUPAR_MS);
    visibles.forEach((m, i) => {
      const clave = claveDiaDispositivo(m.fecha);
      if (clave !== diaAnterior) {
        salida.push({ tipo: 'dia', clave, etiqueta: etiquetaDiaChat(m.fecha) });
        diaAnterior = clave;
      }
      if (i === primerNuevo) salida.push({ tipo: 'nuevos' });
      if (m.sistema) {
        salida.push({ tipo: 'aviso', m });
        return;
      }
      const agrupado = seAgrupa(visibles[i - 1], m) && i !== primerNuevo;
      const continua = seAgrupa(m, visibles[i + 1]) && i + 1 !== primerNuevo;
      salida.push({ tipo: 'msg', m, agrupado, continua });
    });
    return salida.reverse();
    // i18n: las etiquetas de los días cambian con el idioma
  }, [visibles, leidoHasta, usuario?.id, i18nHook.language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al entrar con muchos mensajes nuevos, la lista parte en "Mensajes nuevos".
  const yaPosicionado = useRef(false);
  useEffect(() => { yaPosicionado.current = false; }, [id, sala, topicoElegido]);
  useEffect(() => {
    if (yaPosicionado.current || !items.length || estado !== 'listo') return;
    yaPosicionado.current = true;
    const linea = items.findIndex((it) => it.tipo === 'nuevos');
    if (linea > 8) setTimeout(() => lista.current?.scrollToIndex({ index: linea, animated: false, viewPosition: 0.9 }), 60);
  }, [items, estado]);

  // Botón para bajar al último mensaje (con cuántos llegaron mientras se leía más arriba).
  const [lejos, setLejos] = useState(false);
  const lejosRef = useRef(false);
  const [sinVer, setSinVer] = useState(0);
  const cantidadAnterior = useRef(visibles.length);
  useEffect(() => {
    const nuevos = visibles.length - cantidadAnterior.current;
    cantidadAnterior.current = visibles.length;
    if (nuevos > 0 && lejosRef.current) setSinVer((n) => n + nuevos);
  }, [visibles.length]);
  const alDesplazar = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const lejosAhora = y > 320;
    if (lejosAhora !== lejosRef.current) {
      lejosRef.current = lejosAhora;
      setLejos(lejosAhora);
      if (!lejosAhora) setSinVer(0);
    }
  }, []);
  const bajar = () => {
    lista.current?.scrollToOffset({ offset: 0, animated: true });
    setSinVer(0);
  };

  // Aviso breve que se oculta solo (reporte enviado, mensaje copiado…).
  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2200);
    return () => clearTimeout(id);
  }, [aviso]);

  useEffect(() => {
    if (!resaltado) return;
    const id = setTimeout(() => setResaltado(null), 1400);
    return () => clearTimeout(id);
  }, [resaltado]);

  const limpiarBarra = () => {
    setRespondiendo(null);
    if (editando) cancelarEdicion();
  };
  const cambiarSala = (nueva: string) => {
    setDireccion(nueva === 'general' ? 'atras' : 'adelante');
    limpiarBarra();
    cerrarPanel();
    router.setParams({ sala: nueva, topico: '' });
  };
  // Dirección de la transición entre la lista de tópicos, un tópico y otra sala (null = sin animar).
  const [direccion, setDireccion] = useState<'adelante' | 'atras' | null>(null);
  const abrirTopico = useCallback((x: TopicoResumen | Topico) => {
    setDireccion('adelante');
    topicos.marcarLeido(x.id);
    router.setParams({ topico: x.id });
  }, [topicos]);
  const volverALista = () => {
    setDireccion('atras');
    limpiarBarra();
    cerrarPanel();
    Keyboard.dismiss();
    router.setParams({ topico: '' });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setTexto('');
  };

  const yo = useMemo<Autor | undefined>(() => (usuario ? {
    id: usuario.id, nombreVisible: usuario.nombreVisible, pais: usuario.pais ?? null, foto: usuario.foto ?? null,
  } as Autor : undefined), [usuario]);

  const mandar = async () => {
    const limpio = texto.trim();
    if (editando) {
      if (!limpio || enviandoEdicion) return;
      if (limpio === editando.texto) return cancelarEdicion();
      setEnviandoEdicion(true);
      const r = await editar(editando.id, limpio);
      setEnviandoEdicion(false);
      if (r.error) return avisar(r.error);
      return cancelarEdicion();
    }
    if (!limpio || esperando) return;
    if (usuario && !usuario.perfilCompleto && usuario.proveedor !== 'dev') return setPerfilPendiente(true);
    // Como en Telegram: el campo se vacía al tiro y el mensaje aparece con un reloj hasta que llega.
    const cita = respondiendo;
    setTexto('');
    setRespondiendo(null);
    const r = await enviar(limpio, { respuestaA: cita, yo });
    if (r.error) {
      // Se devuelve lo escrito para no perderlo.
      setTexto((actual) => (actual ? actual : limpio));
      if (cita) setRespondiendo(cita);
      if (r.codigo === 'MODO_LENTO') return; // la cuenta regresiva ya se ve sobre el campo
      if (r.codigo === 'PERFIL_INCOMPLETO') return setPerfilPendiente(true);
      return avisar(r.error);
    }
  };

  const mandarSticker = async (emoji: string, codigo: string) => {
    if (esperando || editando) return;
    if (usuario && !usuario.perfilCompleto && usuario.proveedor !== 'dev') return setPerfilPendiente(true);
    const cita = respondiendo;
    setRespondiendo(null);
    const r = await enviar(emoji, { sticker: codigo, respuestaA: cita, yo });
    if (r.error) {
      if (r.codigo === 'PERFIL_INCOMPLETO') return setPerfilPendiente(true);
      if (r.codigo !== 'MODO_LENTO') avisar(r.error);
    }
  };

  const mandarGif = async (gif: Gif) => {
    if (esperando || editando) return;
    if (usuario && !usuario.perfilCompleto && usuario.proveedor !== 'dev') return setPerfilPendiente(true);
    cerrarPanel();
    const cita = respondiendo;
    setRespondiendo(null);
    const r = await enviar('GIF', { gif, respuestaA: cita, yo });
    if (r.error) {
      if (r.codigo === 'PERFIL_INCOMPLETO') return setPerfilPendiente(true);
      if (r.codigo !== 'MODO_LENTO') avisar(r.error);
    }
  };

  // Pone el emoji donde está el cursor.
  const ponerEmoji = (e: string) => {
    const { start, end } = seleccion.current;
    const inicio = Math.min(start, end, texto.length);
    const fin = Math.min(Math.max(start, end), texto.length);
    const nuevo = (texto.slice(0, inicio) + e + texto.slice(fin)).slice(0, MAX_TEXTO);
    const pos = Math.min(inicio + e.length, nuevo.length);
    setTexto(nuevo);
    seleccion.current = { start: pos, end: pos };
    setTimeout(() => campo.current?.setSelection?.(pos, pos), 0);
  };
  // Borrar del panel: quita el carácter (o emoji completo) antes del cursor.
  const borrarAtras = () => {
    const { start, end } = seleccion.current;
    const inicio = Math.min(start, end, texto.length);
    const fin = Math.min(Math.max(start, end), texto.length);
    if (inicio !== fin) {
      setTexto(texto.slice(0, inicio) + texto.slice(fin));
      seleccion.current = { start: inicio, end: inicio };
      return;
    }
    if (!inicio) return;
    const antes = Array.from(texto.slice(0, inicio));
    let quitar = 1;
    // Emojis compuestos (con ZWJ, variante o tono de piel) se borran enteros.
    while (antes.length - quitar > 0 && /[‍️\u{1F3FB}-\u{1F3FF}]/u.test(antes[antes.length - quitar] ?? '')) quitar++;
    if (antes[antes.length - quitar - 1] === '‍') quitar += 2;
    const nuevoAntes = antes.slice(0, Math.max(0, antes.length - quitar)).join('');
    setTexto(nuevoAntes + texto.slice(inicio));
    seleccion.current = { start: nuevoAntes.length, end: nuevoAntes.length };
  };

  // Negrita, cursiva… sobre lo seleccionado; la selección queda en el mismo texto.
  const darFormato = (formato: Formato) => {
    const { start, end } = seleccion.current;
    const r = aplicarFormato(texto, Math.min(start, end), Math.max(start, end), formato);
    if (r.texto.length > MAX_TEXTO) return;
    setTexto(r.texto);
    seleccion.current = { start: r.inicio, end: r.fin };
    campo.current?.focus();
    setTimeout(() => campo.current?.setSelection?.(r.inicio, r.fin), 0);
  };

  // Ir al mensaje citado y marcarlo un momento.
  const irACita = (mensajeId: string) => {
    const indice = items.findIndex((it) => it.tipo === 'msg' && it.m.id === mensajeId);
    if (indice < 0) return setAviso(tr('chat.citaNoDisponible'));
    lista.current?.scrollToIndex({ index: indice, animated: true, viewPosition: 0.5 });
    setResaltado(mensajeId);
  };

  const responder = (m: MensajeChat) => {
    if (m.pendiente) return;
    if (editando) cancelarEdicion();
    setRespondiendo(m);
    if (!panelRef.current) setTimeout(() => campo.current?.focus(), 250);
  };

  const copiar = async (m: MensajeChat) => {
    await Clipboard.setStringAsync(m.texto);
    setAviso(tr('chat.copiado'));
  };

  const reaccionarA = useCallback((m: MensajeChat, emoji: string) => {
    if (usuario && !m.pendiente) reaccionar(m.id, emoji, usuario.id);
  }, [reaccionar, usuario]);

  // Reportar: primero se elige el motivo; se reporta a la persona y, si viene de un mensaje, también el mensaje.
  const reportar = (autor: Autor, mensajeId?: string) => {
    setHoja({
      titulo: tr('reportes.porQue', { nombre: autor.nombreVisible }),
      opciones: MOTIVOS_REPORTE.map((motivo) => ({
        texto: tr(`reportes.motivos.${motivo}`),
        onPress: async () => {
          const [r] = await Promise.all([
            api('/me/reportes', { metodo: 'POST', token, body: { usuarioId: autor.id, motivo, ...(mensajeId ? { mensajeId } : {}) } }).then(() => ({ error: null as string | null })).catch((e: Error) => ({ error: e.message })),
            mensajeId ? reportarMensaje(mensajeId, motivo) : null,
          ]);
          setAviso(r.error ?? tr('reportes.gracias'));
        },
      })),
    });
  };

  const opcionInstagram = (autor: Autor): OpcionHoja[] => (autor.instagram ? [{
    texto: `Instagram · @${autor.instagram}`,
    icono: 'camera',
    onPress: () => Linking.openURL(`https://www.instagram.com/${autor.instagram}/`),
  }] : []);

  // Mantener presionado un mensaje: reacciones arriba y acciones abajo, como en WhatsApp.
  const cambiarFijado = async (mensajeId: string, valor: boolean) => {
    const r = await fijar(mensajeId, valor);
    if (r.error) avisar(r.error);
    else setAviso(tr(valor ? 'chat.fijado' : 'chat.desfijado'));
  };

  const votarEn = useCallback((m: MensajeChat, opcion: number) => {
    if (usuario) votar(m.id, opcion, usuario.id);
  }, [usuario, votar]);

  const menuMensaje = (m: MensajeChat, ancla: Ancla, vista: DatosVista) => {
    const mio = m.autor.id === usuario?.id;
    const miReaccion = m.reacciones?.find((r) => usuario && r.usuarios.includes(usuario.id))?.emoji;
    setMenu({
      m, ancla, vista, reaccion: miReaccion, todos: false,
      opciones: [
        ...(estado === 'listo' ? [{ texto: tr('chat.responder'), icono: 'arrowshape.turn.up.left', onPress: () => responder(m) }] : []),
        ...(m.sticker ? [] : [{ texto: tr('chat.copiar'), icono: 'doc.on.doc', onPress: () => copiar(m) }]),
        // Mensaje propio reciente: editar o borrar (las encuestas y los stickers solo se borran).
        ...(mio && estado === 'listo' && sePuedeEditar(m) ? [
          ...(m.encuesta || m.sticker || soloLectura ? [] : [{
            texto: tr('chat.editar'), icono: 'pencil',
            onPress: () => {
              setRespondiendo(null);
              cerrarPanel();
              setEditando(m);
              setTexto(m.texto);
              setTimeout(() => campo.current?.focus(), 300);
            },
          }]),
          {
            texto: tr('chat.borrar'), icono: 'trash', destructiva: true,
            onPress: async () => {
              const r = await borrar(m.id);
              if (r.error) avisar(r.error);
              else setAviso(tr('chat.borrado'));
            },
          },
        ] : []),
        ...(puedeFijar && estado === 'listo' ? [m.id === fijado?.id
          ? { texto: tr('chat.desfijar'), icono: 'pin.slash', onPress: () => cambiarFijado(m.id, false) }
          : { texto: tr('chat.fijar'), icono: 'pin', onPress: () => cambiarFijado(m.id, true) }] : []),
        // Quien modera la sala (moderador, admin o el creador del canal) puede eliminar mensajes de otros.
        ...(puedeFijar && estado === 'listo' && !mio ? [{
          texto: tr('chat.eliminar'), icono: 'trash', destructiva: true,
          onPress: async () => {
            const r = await eliminar(m.id);
            if (r.error) avisar(r.error);
            else setAviso(tr('chat.eliminado'));
          },
        }] : []),
        ...(mio ? [] : [
          ...opcionInstagram(m.autor),
          { texto: tr('bloqueos.bloquearA', { nombre: m.autor.nombreVisible }), icono: 'hand.raised', onPress: () => setTimeout(() => setBloquear(m.autor), 250) },
          { texto: tr('reportes.reportarA', { nombre: m.autor.nombreVisible }), icono: 'flag', destructiva: true, onPress: () => setTimeout(() => reportar(m.autor, m.id), 250) },
        ]),
      ],
    });
  };
  const elegirReaccion = (e: string) => {
    if (menu) reaccionarA(menu.m, e);
  };

  // Tocar la foto de alguien (o a alguien en la lista de personas): su edad, verificación, Instagram y reportar.
  const perfilPersona = (autor: Autor, mensajeId?: string) => {
    if (autor.id === usuario?.id) return;
    setHoja({
      titulo: [autor.nombreVisible, (autor.edad ?? edadDe(autor.id)) ? String(autor.edad ?? edadDe(autor.id)) : null].filter(Boolean).join(' · '),
      mensaje: autor.edadVerificada ? tr('verificacion.sello') : undefined,
      opciones: [
        ...opcionInstagram(autor),
        { texto: tr('bloqueos.bloquearA', { nombre: autor.nombreVisible }), icono: 'hand.raised', onPress: () => setTimeout(() => setBloquear(autor), 250) },
        { texto: tr('reportes.reportarA', { nombre: autor.nombreVisible }), icono: 'flag', destructiva: true, onPress: () => setTimeout(() => reportar(autor, mensajeId), 250) },
      ],
    });
  };
  const perfilAutor = (m: MensajeChat) => perfilPersona(m.autor, m.id);

  // Lista de personas de la sala (tocando el título). Desde ahí también se llega al evento.
  const [miembros, setMiembros] = useState(false);
  const verPersona = (p: Autor) => {
    setMiembros(false);
    setTimeout(() => perfilPersona(p), Platform.OS === 'ios' ? 450 : 50);
  };
  const verEvento = () => {
    setMiembros(false);
    if (id) setTimeout(() => router.push({ pathname: '/evento/[id]', params: { id } }), Platform.OS === 'ios' ? 450 : 50);
  };

  const compartir = async () => {
    if (!canal) return;
    const r = await compartirCanal(canal);
    if (r === 'copiado') setAviso(tr('canales.linkCopiado'));
  };

  // ---------- Tópicos: crear, editar, cerrar y borrar ----------
  const puedeCrearTopico = topicos.puedeCrear && estado !== 'normas' && estado !== 'clave';
  const nuevoTopico = () => {
    Keyboard.dismiss();
    cerrarPanel();
    setHojaTopico({ editar: null });
  };
  const opcionesTopico = (x: Topico): OpcionHoja[] => {
    if (x.id === 'general') return [];
    const puede = topicos.modera || x.creadorId === usuario?.id;
    if (!puede) return [];
    return [
      { texto: tr('topicos.editar'), icono: 'pencil', onPress: () => setTimeout(() => setHojaTopico({ editar: x }), 250) },
      {
        texto: tr(x.cerrado ? 'topicos.reabrir' : 'topicos.cerrar'), icono: x.cerrado ? 'lock.open' : 'lock.fill',
        onPress: async () => {
          await api(`/topicos/t/${x.id}`, { metodo: 'PATCH', token, body: { cerrado: !x.cerrado } }).catch((e: Error) => avisar(e.message));
          setAviso(tr(x.cerrado ? 'topicos.reabierto' : 'topicos.cerrado'));
          topicos.recargar();
        },
      },
      {
        texto: tr('topicos.borrar'), icono: 'trash', destructiva: true,
        onPress: () => setTimeout(() => setHoja({
          titulo: tr('topicos.borrarPregunta', { nombre: x.nombre }),
          mensaje: tr('topicos.borrarAyuda'),
          opciones: [{
            texto: tr('topicos.borrar'), icono: 'trash', destructiva: true,
            onPress: async () => {
              try {
                await api(`/topicos/t/${x.id}`, { metodo: 'DELETE', token });
                setAviso(tr('topicos.borrado'));
                if (topicoElegido === x.id) router.setParams({ topico: '' });
                topicos.recargar();
              } catch (e) {
                avisar((e as Error).message);
              }
            },
          }],
        }), 250),
      },
    ];
  };
  const menuFilaTopico = (x: TopicoResumen) => {
    const opciones = opcionesTopico(x);
    if (!opciones.length) return;
    vibrar('seleccion');
    setHoja({ titulo: x.nombre ?? undefined, opciones });
  };

  // Menú ⋯ de cualquier sala: tópicos, compartir (canales propios), modo lento (quien modera), personas, evento y salir.
  const menuSala = () => {
    const opciones: OpcionHoja[] = [];
    if (infoTopico) opciones.push(...opcionesTopico(infoTopico));
    if (puedeCrearTopico && (enLista || estado === 'listo')) opciones.push({ texto: tr('topicos.nuevo'), icono: 'text.bubble', onPress: () => setTimeout(nuevoTopico, 250) });
    if (canal?.esMio) opciones.push({ texto: tr('canales.editar'), icono: 'pencil', onPress: () => setTimeout(() => setEditandoCanal(canal), 250) });
    if (canal) opciones.push({ texto: tr('canales.compartir'), icono: 'square.and.arrow.up', onPress: compartir });
    if (id) opciones.push({ texto: tr('asistentes.quienVa'), icono: 'person.2', onPress: () => setTimeout(() => setVerAsistentes(true), 250) });
    if (puedeFijar && estado === 'listo') opciones.push({ texto: tr('modoLento.titulo'), icono: 'timer', onPress: () => setTimeout(() => setAjusteLento(true), 250) });
    opciones.push({ texto: tr('miembros.verPersonas'), icono: 'person.2', onPress: () => setTimeout(() => setMiembros(true), 250) });
    if (soyMiembro && !enLista) {
      opciones.push({
        texto: silenciada ? tr('canales.activarAvisos') : tr('canales.silenciar'), icono: silenciada ? 'bell' : 'bell.slash',
        onPress: async () => {
          const r = await silenciar(!silenciada);
          if (r.error) return avisar(r.error);
          setAviso(silenciada ? tr('canales.avisosActivados') : tr('canales.silenciado'));
        },
      });
    }
    if (id) opciones.push({ texto: tr('canales.verEvento'), icono: 'calendar', onPress: () => router.push({ pathname: '/evento/[id]', params: { id } }) });
    if (soyMiembro && !canal?.esMio) {
      opciones.push({
        texto: tr('canales.salir'), icono: 'rectangle.portrait.and.arrow.right', destructiva: true,
        onPress: async () => {
          const r = await salir();
          if (r.error) return avisar(r.error);
          setAviso(tr('canales.saliste'));
          if (canal) {
            cargarCanales();
            if (canal.privado) cambiarSala('general'); // sin la contraseña ya no se puede ver
          }
        },
      });
    }
    if (canal?.esMio) {
      opciones.push({
        texto: tr('canales.cerrar'), icono: 'trash', destructiva: true,
        onPress: async () => {
          await api(`/canales/${canal.id}`, { metodo: 'DELETE', token }).catch((e: Error) => avisar(e.message));
          cargarCanales();
          cambiarSala('general');
        },
      });
    }
    setHoja({
      titulo: tituloTopico ?? nombreSala,
      mensaje: infoTopico ? nombreSala : canal?.descripcion ?? (soyMiembro ? undefined : tr('canales.unirmeAyuda')),
      opciones,
    });
  };

  // 📎 Adjuntar: stickers, encuesta y nuevo tópico (lo que se puede según la sala).
  const menuAdjuntar = () => {
    const opciones: OpcionHoja[] = [
      { texto: tr('expresion.stickers'), icono: 'face.smiling', onPress: () => setTimeout(() => abrirPanel('stickers'), 200) },
    ];
    if (puedeEncuesta) opciones.push({ texto: tr('encuesta.nueva'), icono: 'chart.bar', onPress: () => { cerrarPanel(); setTimeout(() => setNuevaEncuesta(true), 250); } });
    if (puedeCrearTopico) opciones.push({ texto: tr('topicos.nuevo'), icono: 'text.bubble', onPress: () => setTimeout(nuevoTopico, 250) });
    Keyboard.dismiss();
    setHoja({ opciones });
  };

  const alUnirme = async () => {
    const r = await unirme();
    if (r.error) return avisar(r.error);
    setAviso(tr('canales.unido'));
    if (canal) cargarCanales(); // para que el encabezado cuente a quien se acaba de unir
    topicos.recargar();
  };

  // "Ya estoy aquí" desde el botón 📍 del encabezado: las caras y marcar o quitar.
  const hojaAqui = () => setHoja({
    encabezado: <CabezaAqui aqui={aqui} />,
    opciones: [aqui.mio
      ? { texto: tr('aqui.quitarBoton'), icono: 'minus.circle', destructiva: true, onPress: () => marcarAqui(false) }
      : { texto: tr('aqui.boton'), icono: 'location.fill', onPress: () => marcarAqui(true) }],
  });
  const marcarAqui = async (valor: boolean) => {
    const { error } = await aqui.marcar(valor);
    if (error) avisar(error);
    else setAviso(tr(valor ? 'aqui.listo' : 'aqui.quitado'));
  };

  // En la lista de tópicos el chat no está conectado: la membresía sale de la lista.
  const soyMiembro = enLista ? topicos.miembro : miembro;
  const nombreSala = canal?.nombre ?? (esIdioma && sala !== 'general' ? NOMBRES_IDIOMA[sala] : evento?.titulo ?? tr('canales.general'));
  const enTopico = Boolean(topicoElegido);
  const datosTopico = infoTopico ?? (topicoElegido ? topicos.topicos?.find((x) => x.id === topicoElegido) ?? null : null);
  const tituloTopico = enTopico ? (topicoElegido === 'general' ? tr('topicos.general') : datosTopico?.nombre ?? '') : null;
  const van = evento?.asistencia?.van;
  const cantidadTopicos = topicos.topicos?.length ?? 0;
  const subtitulo = enTopico
    ? [datosTopico?.cerrado ? tr('topicos.cerradoCorto') : null, canal?.nombre ?? evento?.titulo].filter(Boolean).join(' · ')
    : enLista
      ? tr('topicos.cuenta', { count: cantidadTopicos })
      : canal
        ? [canal.soloAvisos ? tr('canales.avisos') : null, canal.privado ? tr('canales.privado') : null, tr('canales.personas', { count: canal.miembros })].filter(Boolean).join(' · ')
        : van ? tr('agenda.van', { count: van }) : null;
  const silenciado = usuario?.silenciadoHasta && new Date(usuario.silenciadoHasta) > new Date();
  const puedeEscribir = estado === 'listo' && !silenciado && !soloLectura;
  const haySeleccion = (enfocado || Platform.OS === 'web') && haySeleccionTexto && puedeEscribir;
  const hayTexto = texto.trim().length > 0;
  const mostrarBarra = modo === 'chat' && (estado === 'listo' || estado === 'conectando');

  const alVolver = () => {
    if (enTopico && conocidos) return volverALista();
    if (!esIdioma) return cambiarSala('general');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const abrirDesdeAviso = (m: MensajeChat) => {
    if (!m.sistema?.id) return;
    if (m.sistema.tipo === 'topico') abrirTopico({ id: m.sistema.id } as Topico);
    else if (m.sistema.tipo === 'canal') cambiarSala(m.sistema.id);
  };
  const renderItem = ({ item }: { item: Item }) => item.tipo === 'dia' ? <SeparadorDia etiqueta={item.etiqueta} />
    : item.tipo === 'aviso' ? <AvisoChat m={item.m} yo={usuario?.id} onAbrir={abrirDesdeAviso} />
    : item.tipo === 'nuevos' ? (
    <View style={styles.nuevos}>
      <View style={styles.nuevosLinea} />
      <Text style={styles.nuevosTexto}>{tr('chat.mensajesNuevos')}</Text>
      <View style={styles.nuevosLinea} />
    </View>
  ) : (
    <Burbuja
      m={item.m}
      mia={item.m.autor.id === usuario?.id}
      agrupado={item.agrupado}
      continua={item.continua}
      yo={usuario?.id}
      resaltado={resaltado === item.m.id}
      oculto={menu?.m.id === item.m.id}
      aqui={aqui.ids.has(item.m.autor.id)}
      edad={edadDe(item.m.autor.id)}
      onMenu={menuMensaje}
      onPerfil={perfilAutor}
      onReaccion={reaccionarA}
      onIrACita={irACita}
      onResponder={responder}
      onVotar={votarEn}
    />
  );

  return (
    <View style={styles.pantalla}>
      <View style={[styles.encabezado, { paddingTop: insets.top + 2 }]}>
        <View style={styles.filaEncabezado}>
          <Pressable accessibilityLabel={tr('comun.volver')} onPress={alVolver} style={styles.botonVolver}>
            <Text style={styles.flecha}>‹</Text>
          </Pressable>
          {/* Como en Telegram: foto (o ícono del tópico) a la izquierda y el título al lado, todo en una fila baja. */}
          <Pressable
            style={({ pressed }) => [styles.tituloCentro, pressed && { opacity: 0.6 }]}
            onPress={() => setMiembros(true)}
            accessibilityRole="button"
            accessibilityHint={tr('miembros.verPersonas')}>
            {enTopico && topicoElegido
              ? <IconoTopico topico={{ id: topicoElegido, icono: datosTopico?.icono ?? null, color: datosTopico?.color ?? 0, nombre: tituloTopico }} tamano={34} />
              : evento?.imagen ? <FotoEvento url={evento.imagen} style={styles.fotoEvento} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo} numberOfLines={1}>{tituloTopico ?? canal?.nombre ?? evento?.titulo ?? tr('chat.chatDelEvento')}</Text>
              {subtitulo ? <Text style={styles.tituloSecundario} numberOfLines={1}>{subtitulo}</Text> : null}
            </View>
          </Pressable>
          {estado === 'listo' && aqui.abierto ? <BotonAqui aqui={aqui} onPress={hojaAqui} /> : null}
          {/* Unirme: la única forma de tener la sala en "Mis canales" (mirar o escribir no une). */}
          {estado === 'listo' && !miembro ? (
            <Pressable
              onPress={alUnirme}
              accessibilityRole="button"
              accessibilityHint={tr('canales.unirmeAyuda')}
              hitSlop={6}
              style={({ pressed }) => [styles.unirme, pressed && { opacity: 0.7 }]}>
              <Icono nombre="plus" tamano={13} color={t.onAccent} peso="bold" />
              <Text style={styles.unirmeTexto}>{tr('canales.unirme')}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={menuSala} style={styles.botonMenu} accessibilityLabel={tr('canales.opciones')}>
            <Icono nombre="ellipsis" tamano={20} color={t.text} />
          </Pressable>
        </View>
        {/* Un canal propio es una sola sala (sin idiomas): adentro no se muestran las salas del evento. */}
        {id && esIdioma && !enTopico && estado !== 'normas' ? <SelectorSalas eventoId={id} sala={sala} canales={canales} onCambio={cambiarSala} /> : null}
        {modo === 'chat' && estado === 'listo' && fijado ? (
          <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOut.duration(150)} style={styles.fijado}>
            <Pressable
              onPress={() => irACita(fijado.id)}
              accessibilityRole="button"
              accessibilityLabel={`${tr('chat.mensajeFijado')}: ${quitarFormato(fijado.texto)}`}
              style={({ pressed }) => [styles.fijadoToque, pressed && { opacity: 0.6 }]}>
              <View style={styles.fijadoLinea} />
              <View style={{ flex: 1 }}>
                <Text style={styles.fijadoRotulo}>{tr(fijado.encuesta ? 'chat.encuestaFijada' : 'chat.mensajeFijado')}</Text>
                <Text style={styles.fijadoTexto} numberOfLines={1}>{quitarFormato(fijado.texto)}</Text>
              </View>
              <Icono nombre="pin.fill" tamano={15} color={t.textSecondary} />
            </Pressable>
            {puedeFijar ? (
              <Pressable onPress={() => cambiarFijado(fijado.id, false)} hitSlop={10} accessibilityLabel={tr('chat.desfijar')}>
                <Icono nombre="xmark" tamano={14} color={t.textSecondary} peso="semibold" />
              </Pressable>
            ) : null}
          </Animated.View>
        ) : null}
      </View>

      {/* Cada vista (lista de tópicos, un tópico, otra sala) entra deslizándose, como al navegar en Telegram. */}
      <Animated.View
        key={`${sala}:${topicoElegido ?? (enLista ? 'lista' : 'chat')}`}
        entering={direccion === 'adelante' ? SlideInRight.duration(240) : direccion === 'atras' ? SlideInLeft.duration(240) : undefined}
        style={{ flex: 1 }}>
        {modo !== 'lista' ? <FondoEvento imagen={evento?.imagen} generos={evento?.generos} /> : null}
        {modo === 'cargando' ? (
          <View style={styles.centro}><ActivityIndicator /></View>
        ) : enLista && topicos.topicos ? (
          <ListaTopicos
            topicos={topicos.topicos}
            puedeCrear={puedeCrearTopico}
            onAbrir={abrirTopico}
            onOpciones={menuFilaTopico}
            onNuevo={nuevoTopico}
            onRecargar={topicos.recargar}
          />
        ) : estado === 'sin-sesion' && vistaPrevia ? (
          <VistaPreviaCanal eventoId={id!} evento={evento} sala={sala} textoBoton={tr('vistaPrevia.crearCuenta')} onUnirme={() => router.push('/auth')} />
        ) : estado === 'normas' && vistaPrevia && !verNormas ? (
          <VistaPreviaCanal eventoId={id!} evento={evento} sala={sala} textoBoton={tr('vistaPrevia.unirme')} onUnirme={() => setVerNormas(true)} />
        ) : estado === 'sin-sesion' ? (
          <View style={styles.centro}>
            <Text style={styles.aviso}>{tr('chat.sinSesion')}</Text>
          </View>
        ) : estado === 'normas' ? (
          <PanelNormas eventoId={id ?? ''} onAceptadas={() => { reintentar(); topicos.recargar(); }} />
        ) : estado === 'clave' ? (
          <PanelClave canal={canal} onDentro={() => { cargarCanales(); reintentar(); topicos.recargar(); }} />
        ) : estado === 'conectando' && !mensajes.length ? (
          <View style={styles.centro}><ActivityIndicator /></View>
        ) : estado === 'cerrado' || estado === 'error' ? (
          <View style={styles.centro}>
            <Text style={styles.aviso}>{estado === 'cerrado' ? error ?? tr('canales.yaNoExiste') : error ?? tr('chat.errorAbrir')}</Text>
            {estado === 'cerrado' && enTopico && conocidos ? (
              <Pressable onPress={volverALista} style={({ pressed }) => [styles.unirme, { marginTop: 16, height: 36 }, pressed && { opacity: 0.7 }]}>
                <Text style={styles.unirmeTexto}>{tr('topicos.verTodos')}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.papel}>
            <FlatList
              ref={lista}
              data={items}
              inverted
              keyExtractor={(it) => (it.tipo === 'dia' ? `dia-${it.clave}` : it.tipo === 'nuevos' ? 'nuevos' : it.m.id)}
              contentContainerStyle={styles.contenidoLista}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onScrollBeginDrag={cerrarPanel}
              onScroll={alDesplazar}
              scrollEventThrottle={64}
              // Lo nuevo no mueve lo que se está leyendo; cerca del final, la lista lo sigue.
              maintainVisibleContentPosition={{ minIndexForVisible: 0, autoscrollToTopThreshold: 120 }}
              initialNumToRender={18}
              maxToRenderPerBatch={12}
              windowSize={15}
              onScrollToIndexFailed={({ index, averageItemLength }) => {
                lista.current?.scrollToOffset({ offset: index * averageItemLength, animated: true });
                setTimeout(() => lista.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 }), 250);
              }}
              // Invertida: el "encabezado" queda abajo (quién escribe) y el "pie", arriba (notas del canal).
              ListHeaderComponent={
                escribiendo && !bloqueados.has(escribiendo.id)
                  ? <Animated.Text entering={FadeIn.duration(150)} style={styles.escribiendo}>{tr('chat.escribiendo', { nombre: escribiendo.nombreVisible })}</Animated.Text>
                  : undefined
              }
              ListFooterComponent={
                <View style={{ gap: 2, marginBottom: 6 }}>
                  {/* Sala vacía: el evento e ideas para el primer mensaje (al tocar una queda escrita en el campo) */}
                  {!items.length && estado === 'listo' && !enTopico && !soloLectura && puedeEscribir ? (
                    <ChatVacio evento={evento} onElegir={(frase) => { setTexto(frase); campo.current?.focus(); }} />
                  ) : null}
                  {!enTopico && !conocidos && puedeCrearTopico && miembro ? <View style={{ marginBottom: 6 }}><AvisoTopicos onCrear={nuevoTopico} /></View> : null}
                  {canal?.descripcion && !enTopico ? <Text style={[styles.nota, { color: t.text }]}>{canal.descripcion}</Text> : null}
                  <Text style={styles.nota}>
                    {evento ? tr('chat.seBorraHora', { hora: hora(evento.fin) }) : tr('chat.seBorra')}
                  </Text>
                  <Text style={styles.nota}>{tr('chat.teVen')}</Text>
                  {!items.length && estado === 'listo' && !(!enTopico && !soloLectura && puedeEscribir) ? (
                    <Text style={[styles.nota, { marginTop: 18 }]}>
                      {soloLectura && !datosTopico?.cerrado ? tr('chat.vacioAvisos') : enTopico ? tr('topicos.vacio') : esIdioma && sala !== 'general' ? tr('chat.vacioIdioma') : tr('chat.vacio')}
                    </Text>
                  ) : null}
                </View>
              }
              renderItem={renderItem}
            />
            {lejos ? (
              <Animated.View entering={ZoomIn.duration(160)} exiting={ZoomOut.duration(140)} style={styles.bajarCaja}>
                <Pressable onPress={bajar} accessibilityRole="button" accessibilityLabel={tr('chat.irAlFinal')} style={({ pressed }) => [styles.bajar, pressed && { opacity: 0.7 }]}>
                  <Icono nombre="chevron.down" tamano={18} color={t.text} peso="semibold" />
                </Pressable>
                {sinVer > 0 ? (
                  <View style={styles.bajarGlobo}>
                    <Text style={styles.bajarGloboTexto}>{sinVer > 99 ? '99+' : sinVer}</Text>
                  </View>
                ) : null}
              </Animated.View>
            ) : null}
          </View>
        )}
      </Animated.View>

      {aviso ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(150)} pointerEvents="none" style={[styles.toast, { bottom: (mostrarBarra ? 70 : 24) + insets.bottom }]}>
          <Text style={styles.toastTexto}>{aviso}</Text>
        </Animated.View>
      ) : null}

      {mostrarBarra ? (
        <>
          <View style={styles.barraEntrada}>
            {soloLectura ? (
              <View style={styles.silenciado}>
                <Icono nombre={datosTopico?.cerrado ? 'lock.fill' : 'megaphone'} tamano={15} color={t.textSecondary} />
                <Text style={styles.textoSilenciado}>{tr(datosTopico?.cerrado ? 'topicos.cerradoAviso' : 'chat.soloAvisos')}</Text>
              </View>
            ) : silenciado ? (
              <View style={styles.silenciado}>
                <Icono nombre="speaker.slash" tamano={15} color={t.textSecondary} />
                <Text style={styles.textoSilenciado}>{tr('chat.silenciado')}</Text>
              </View>
            ) : (
              <>
                {respondiendo ? (
                  <Animated.View entering={FadeInDown.duration(160)} exiting={FadeOut.duration(100)} style={styles.respondiendo}>
                    <Icono nombre="arrowshape.turn.up.left" tamano={16} color={t.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Cita
                        nombre={tr('chat.respondiendoA', { nombre: respondiendo.autor.id === usuario?.id ? tr('chat.tiMismo') : respondiendo.autor.nombreVisible })}
                        texto={respondiendo.sticker ? `${respondiendo.texto} ${tr('expresion.sticker')}` : respondiendo.texto}
                      />
                    </View>
                    <Pressable onPress={() => setRespondiendo(null)} hitSlop={10} accessibilityLabel={tr('chat.cancelarRespuesta')}>
                      <Icono nombre="xmark.circle.fill" tamano={20} color={t.textSecondary} />
                    </Pressable>
                  </Animated.View>
                ) : null}
                {editando ? (
                  <Animated.View entering={FadeInDown.duration(160)} exiting={FadeOut.duration(100)} style={styles.respondiendo}>
                    <Icono nombre="pencil" tamano={16} color={t.textSecondary} />
                    <View style={{ flex: 1 }}>
                      <Cita nombre={tr('chat.editando')} texto={editando.texto} />
                    </View>
                    <Pressable onPress={cancelarEdicion} hitSlop={10} accessibilityLabel={tr('chat.cancelarEdicion')}>
                      <Icono nombre="xmark.circle.fill" tamano={20} color={t.textSecondary} />
                    </Pressable>
                  </Animated.View>
                ) : null}
                {haySeleccion ? (
                  <View style={styles.filaFormato}>
                    {BOTONES_FORMATO.map((b) => (
                      <Pressable
                        key={b.formato}
                        onPress={() => darFormato(b.formato)}
                        accessibilityRole="button"
                        accessibilityLabel={tr(`formato.${b.formato}`)}
                        style={({ pressed }) => [styles.botonFormato, pressed && { opacity: 0.5 }]}>
                        <Text style={[styles.letraFormato, b.estilo]}>{b.letra}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => darFormato('spoiler')}
                      accessibilityRole="button"
                      accessibilityLabel={tr('formato.spoiler')}
                      style={({ pressed }) => [styles.botonFormato, pressed && { opacity: 0.5 }]}>
                      <Icono nombre="eye.slash" tamano={16} color={t.text} />
                    </Pressable>
                  </View>
                ) : null}
                {modoLento ? (
                  <View style={styles.notaLento} accessibilityLiveRegion="polite">
                    <Icono nombre="timer" tamano={13} color={t.textSecondary} />
                    <Text style={styles.notaLentoTexto}>
                      {esperando ? tr('modoLento.falta', { segundos: faltan }) : tr('modoLento.nota', { tiempo: textoTiempo(modoLento, tr) })}
                    </Text>
                  </View>
                ) : null}
                {/* Como Telegram: 📎 a la izquierda, el campo con el botón de emojis/stickers adentro y enviar al aparecer texto. */}
                <View style={styles.filaCampo}>
                  {!editando ? (
                    <Pressable
                      onPress={menuAdjuntar}
                      disabled={!puedeEscribir}
                      hitSlop={6}
                      accessibilityLabel={tr('expresion.adjuntar')}
                      style={({ pressed }) => [styles.botonLado, pressed && { opacity: 0.5 }]}>
                      <Icono nombre="paperclip" tamano={23} color={t.textSecondary} />
                    </Pressable>
                  ) : null}
                  <View style={styles.campo}>
                    <TextInput
                      ref={campo}
                      value={texto}
                      onChangeText={(v) => {
                        setTexto(v);
                        avisarEscribiendo();
                      }}
                      onSelectionChange={(e) => {
                        const s = e.nativeEvent.selection;
                        seleccion.current = s;
                        const hay = s.start !== s.end;
                        setHaySeleccionTexto((antes) => (antes === hay ? antes : hay));
                      }}
                      onFocus={() => setEnfocado(true)}
                      onBlur={() => setEnfocado(false)}
                      // En la web, Enter envía y Mayús+Enter baja de línea.
                      {...(Platform.OS === 'web' ? {
                        onKeyPress: (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault?: () => void }) => {
                          if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                            e.preventDefault?.();
                            mandar();
                          }
                        },
                      } : {})}
                      placeholder={tituloTopico ? tr('chat.mensajeEn', { canal: tituloTopico }) : canal ? tr('chat.mensajeEn', { canal: canal.nombre }) : tr('chat.mensaje')}
                      placeholderTextColor={t.textSecondary}
                      style={styles.input}
                      maxLength={MAX_TEXTO}
                      editable={puedeEscribir}
                      multiline
                      textAlignVertical="center"
                    />
                    <Pressable
                      onPress={alternarPanel}
                      disabled={!puedeEscribir}
                      hitSlop={6}
                      accessibilityLabel={panel ? tr('expresion.teclado') : tr('chat.emojis')}
                      style={({ pressed }) => [styles.botonPanel, pressed && { opacity: 0.5 }]}>
                      <Icono nombre={panel ? 'keyboard' : 'face.smiling'} tamano={23} color={t.textSecondary} />
                    </Pressable>
                  </View>
                  {hayTexto || editando ? (
                    <Animated.View entering={ZoomIn.duration(140)} exiting={ZoomOut.duration(120)}>
                      <Pressable
                        accessibilityLabel={tr('chat.enviar')}
                        onPress={mandar}
                        disabled={!hayTexto || enviandoEdicion || (esperando && !editando)}
                        style={({ pressed }) => [styles.botonEnviar, (!hayTexto || (esperando && !editando)) && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.92 }] }]}>
                        {editando
                          ? <Icono nombre="checkmark" tamano={17} color={t.onAccent} peso="bold" />
                          : esperando
                            ? <Text style={styles.cuentaLento}>{faltan}</Text>
                            : <Icono nombre="arrow.up" tamano={17} color={t.onAccent} peso="bold" />}
                      </Pressable>
                    </Animated.View>
                  ) : null}
                </View>
              </>
            )}
          </View>
          {/* Espacio del teclado y del panel: mide lo mismo que el teclado mientras entra y sale. */}
          <Animated.View style={[styles.espacioTeclado, espacioInferior]}>
            {panel && !silenciado && !soloLectura ? (
              <View style={{ height: altoPanelJs, paddingBottom: insets.bottom, backgroundColor: t.bar }}>
                <PanelExpresion
                  alto={altoPanelJs - insets.bottom}
                  modo={modoPanel}
                  onModo={setModoPanel}
                  onEmoji={ponerEmoji}
                  onSticker={mandarSticker}
                  onGif={mandarGif}
                  onBorrar={borrarAtras}
                  puedeSticker={!editando && !esperando}
                />
              </View>
            ) : null}
          </Animated.View>
        </>
      ) : null}

      {id ? (
        <PantallaMiembros
          visible={miembros}
          eventoId={id}
          sala={sala}
          titulo={canal?.nombre ?? (sala === 'general' ? tr('canales.general') : NOMBRES_IDIOMA[sala] ?? tr('chat.chatDelEvento'))}
          evento={evento}
          onCerrar={() => setMiembros(false)}
          onPersona={verPersona}
          onVerEvento={verEvento}
        />
      ) : null}
      {id ? (
        <HojaTopico
          visible={Boolean(hojaTopico)}
          eventoId={id}
          sala={sala}
          editar={hojaTopico?.editar}
          onCerrar={() => setHojaTopico(null)}
          onListo={(x) => {
            const nuevo = !hojaTopico?.editar;
            setHojaTopico(null);
            topicos.recargar();
            if (nuevo) {
              setAviso(tr('topicos.creado'));
              // Se entra directo al tópico recién creado (la lista queda para volver).
              abrirTopico(x);
            }
          }}
        />
      ) : null}
      {id ? (
        <HojaAsistentes
          visible={verAsistentes}
          eventoId={id}
          onCerrar={() => setVerAsistentes(false)}
          onPersona={(p) => { setVerAsistentes(false); setTimeout(() => perfilPersona(p), Platform.OS === 'ios' ? 450 : 50); }}
        />
      ) : null}
      <HojaEditarCanal
        canal={editandoCanal}
        onCerrar={() => setEditandoCanal(null)}
        onListo={() => { setEditandoCanal(null); cargarCanales(); setAviso(tr('canales.guardado')); }}
      />
      <ModalPerfilIncompleto visible={perfilPendiente} onCerrar={() => setPerfilPendiente(false)} />
      <ModalBloquear
        persona={bloquear}
        modo="bloquear"
        onCerrar={() => setBloquear(null)}
        onHecho={(p) => {
          if (respondiendo?.autor.id === p.id) setRespondiendo(null);
          setAviso(tr('bloqueos.bloqueaste', { nombre: p.nombreVisible }));
        }}
      />
      <ModalModoLento
        visible={ajusteLento}
        actual={modoLento}
        onCerrar={() => setAjusteLento(false)}
        onGuardar={async (segundos) => {
          const r = await cambiarModoLento(segundos);
          if (r.error) return r.error;
          setAjusteLento(false);
          setAviso(segundos ? tr('modoLento.activado', { tiempo: textoTiempo(segundos, tr) }) : tr('modoLento.apagado'));
          return null;
        }}
      />
      <HojaNuevaEncuesta visible={nuevaEncuesta} onCrear={crearEncuesta} onCerrar={() => setNuevaEncuesta(false)} />
      <MenuMensaje
        ancla={menu?.ancla ?? null}
        mia={menu?.vista.mia ?? false}
        vista={menu ? (
          <Burbuja
            clon
            m={menu.m}
            {...menu.vista}
            yo={usuario?.id}
            resaltado={false}
            onMenu={nada}
            onPerfil={nada}
            onReaccion={nada}
            onIrACita={nada}
            onResponder={nada}
            onVotar={nada}
          />
        ) : null}
        reacciones={menu && estado === 'listo' ? (
          <FilaReacciones
            elegida={menu.reaccion}
            onElegir={(e) => { setMenu(null); elegirReaccion(e); }}
            onMas={() => setMenu((x) => x && { ...x, todos: true })}
          />
        ) : undefined}
        panel={menu?.todos ? <PanelEmojis onElegir={(e) => { setMenu(null); elegirReaccion(e); }} alto={260} /> : undefined}
        opciones={menu?.opciones ?? []}
        onCerrar={() => setMenu(null)}
      />
      <HojaAcciones
        visible={Boolean(hoja)}
        titulo={hoja?.titulo}
        mensaje={hoja?.mensaje}
        opciones={hoja?.opciones ?? []}
        encabezado={hoja?.encabezado}
        onCerrar={() => setHoja(null)}
      />
    </View>
  );
}

const fuente = Platform.select({ web: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif', default: undefined });

function crearEstilos(C: ReturnType<typeof colores>) {
  return StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo },
  papel: { flex: 1 },
  encabezado: {
    backgroundColor: C.barra, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separador, zIndex: 2,
  },
  filaEncabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, minHeight: 48 },
  botonVolver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  botonMenu: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  unirme: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: C.acento, marginLeft: 2 },
  unirmeTexto: { fontSize: 14, fontWeight: '700', color: C.sobreAcento, fontFamily: fuente },
  flecha: { fontSize: 34, lineHeight: 36, color: C.acentoTexto, fontWeight: '400' },
  tituloCentro: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 4 },
  fotoEvento: { width: 34, height: 34, borderRadius: 17 },
  titulo: { fontSize: 15, fontWeight: '600', color: C.texto, fontFamily: fuente },
  tituloSecundario: { fontSize: 12, color: C.secundario, fontFamily: fuente },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  aviso: { fontSize: 17, color: C.secundario, textAlign: 'center', fontFamily: fuente },
  contenidoLista: { paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  nota: { alignSelf: 'center', fontSize: 12, color: C.secundario, textAlign: 'center', marginVertical: 2, fontFamily: fuente },
  separacion: { marginTop: 8 },

  dia: { alignSelf: 'center', backgroundColor: C.tarjeta, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 12, marginBottom: 4 },
  diaTexto: { fontSize: 12, fontWeight: '600', color: C.secundario, fontFamily: fuente },

  filaMia: { alignSelf: 'flex-end', maxWidth: '80%' },
  nuevos: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, paddingHorizontal: 4 },
  nuevosLinea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.secundario },
  nuevosTexto: { fontSize: 12, fontWeight: '600', color: C.secundario, fontFamily: fuente, textTransform: 'uppercase', letterSpacing: 0.3 },
  fijado: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginBottom: 6, marginHorizontal: 12, paddingRight: 12,
    borderRadius: 12, backgroundColor: C.tarjeta,
  },
  fijadoToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 10 },
  fijadoLinea: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: C.acentoTexto },
  fijadoRotulo: { fontSize: 12, fontWeight: '600', color: C.acentoTexto, fontFamily: fuente },
  fijadoTexto: { fontSize: 14, color: C.secundario, fontFamily: fuente },
  burbujaMia: { backgroundColor: C.burbujaMia, borderRadius: 18, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7 },
  burbujaOtro: { backgroundColor: C.burbujaOtro, borderRadius: 18, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7, alignSelf: 'flex-start' },
  grandeMio: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  grandeOtro: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  emojisGrandes: { fontSize: 46, lineHeight: 56 },
  gif: { width: 230, maxHeight: 300, borderRadius: 16, backgroundColor: C.avatarVacio },
  estallido: { position: 'absolute', top: -6, fontSize: 34, zIndex: 3 },
  avisoFila: { alignItems: 'center', marginVertical: 6 },
  aviso2: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '86%',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: C.tarjeta,
  },
  avisoTexto: { fontSize: 13, fontWeight: '500', color: C.secundario, textAlign: 'center', fontFamily: fuente, flexShrink: 1 },
  horaFlotante: {
    position: 'absolute', right: 2, bottom: 2, flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 6, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.42)',
  },
  horaFlotanteTexto: { fontSize: 11, color: '#FFFFFF', fontFamily: fuente },
  resaltado: { transform: [{ scale: 1.03 }], opacity: 0.75 },
  textoMio: { color: C.sobreBurbujaMia, fontSize: 17, lineHeight: 22, fontFamily: fuente },
  textoOtro: { color: C.texto, fontSize: 17, lineHeight: 22, fontFamily: fuente },
  espacioHoraMia: { fontSize: 11, color: C.burbujaMia },
  espacioHoraOtro: { fontSize: 11, color: C.burbujaOtro },
  horaCaja: { position: 'absolute', right: 10, bottom: 5, flexDirection: 'row', alignItems: 'center', gap: 3 },
  hora: { fontSize: 11, color: C.secundario, fontFamily: fuente },
  horaMia: { color: C.horaBurbujaMia },

  cita: { flexDirection: 'row', gap: 8, borderRadius: 10, paddingVertical: 6, paddingRight: 10, paddingLeft: 8, marginBottom: 5, overflow: 'hidden' },
  citaOtro: { backgroundColor: C.oscuro ? 'rgba(255,255,255,0.06)' : 'rgba(10,122,78,0.07)' },
  citaMia: { backgroundColor: C.oscuro ? 'rgba(0,0,0,0.18)' : 'rgba(10,122,78,0.10)' },
  citaLinea: { width: 3, borderRadius: 2, backgroundColor: C.acentoTexto },
  citaLineaMia: { backgroundColor: C.horaBurbujaMia },
  citaNombre: { fontSize: 13, fontWeight: '600', color: C.texto, fontFamily: fuente },
  citaTexto: { fontSize: 13, lineHeight: 17, color: C.secundario, fontFamily: fuente },
  citaTextoMio: { color: C.sobreBurbujaMia, opacity: 0.75 },

  reacciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -4, zIndex: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, paddingHorizontal: 7, borderRadius: 13,
    backgroundColor: C.tarjeta,
  },
  chipEmoji: { fontSize: 14 },
  chipCuenta: { fontSize: 12, fontWeight: '600', color: C.texto, fontFamily: fuente },

  filaOtro: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '86%' },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inicial: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: C.avatarVacio, textAlign: 'center',
    lineHeight: 30, fontSize: 13, fontWeight: '600', color: C.secundario, overflow: 'hidden',
  },
  columnaOtro: { flexShrink: 1, gap: 2 },
  metaAutor: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 12 },
  nombreAutor: { fontSize: 12, color: C.secundario, fontWeight: '600', fontFamily: fuente },
  notaLento: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingBottom: 6 },
  notaLentoTexto: { fontSize: 12, color: C.secundario, fontFamily: fuente },
  cuentaLento: { fontSize: 12, fontWeight: '700', color: C.sobreAcento, fontFamily: fuente },
  selloMod: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 16, borderRadius: 8, backgroundColor: C.avatarVacio },
  selloAqui: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, height: 16, borderRadius: 8, backgroundColor: C.avatarVacio },
  selloAquiTexto: { fontSize: 11, fontWeight: '600', color: C.texto, fontFamily: fuente },
  edadAutor: { fontSize: 12, color: C.secundario, fontFamily: fuente },
  toast: {
    position: 'absolute', alignSelf: 'center', maxWidth: '86%', zIndex: 5,
    backgroundColor: C.texto, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
  },
  toastTexto: { color: C.fondo, fontSize: 14, fontWeight: '500', textAlign: 'center', fontFamily: fuente },
  silenciado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 36, paddingHorizontal: 12 },
  textoSilenciado: { flexShrink: 1, fontSize: 13, color: C.secundario, textAlign: 'center', fontFamily: fuente },
  escribiendo: { fontSize: 12, color: C.secundario, marginTop: 6, marginLeft: 40, fontFamily: fuente },
  bajarCaja: { position: 'absolute', right: 12, bottom: 12 },
  bajar: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: C.tarjeta,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separador,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  bajarGlobo: {
    position: 'absolute', top: -6, alignSelf: 'center', minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center', backgroundColor: C.acento,
  },
  bajarGloboTexto: { fontSize: 11, fontWeight: '700', color: C.sobreAcento, fontFamily: fuente },
  barraEntrada: {
    paddingHorizontal: 8, paddingTop: 7, paddingBottom: 7, backgroundColor: C.barra,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separador,
  },
  espacioTeclado: { backgroundColor: C.barra, overflow: 'hidden' },
  respondiendo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6, marginBottom: 7 },
  filaFormato: { flexDirection: 'row', alignSelf: 'center', gap: 4, padding: 4, marginBottom: 8, borderRadius: 12, backgroundColor: C.campo, borderWidth: StyleSheet.hairlineWidth, borderColor: C.separador },
  botonFormato: { width: 40, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letraFormato: { fontSize: 16, color: C.texto, fontFamily: fuente },
  filaCampo: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  botonLado: { width: 36, height: 38, alignItems: 'center', justifyContent: 'center' },
  campo: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-end', minHeight: 38, borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separador, backgroundColor: C.campo, paddingLeft: 14, paddingRight: 2,
  },
  input: {
    flex: 1, fontSize: 17, lineHeight: 22, maxHeight: 22 * 6 + 16, paddingTop: Platform.OS === 'ios' ? 8 : 6, paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    color: C.texto, fontFamily: fuente,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  botonPanel: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  botonEnviar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.acento, alignItems: 'center', justifyContent: 'center' },
});
}

function useEstilos() {
  const t = useTheme();
  return useMemo(() => crearEstilos(colores(t)), [t]);
}
