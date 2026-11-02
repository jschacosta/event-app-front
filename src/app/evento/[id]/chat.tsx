import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { NOMBRES_IDIOMA, PanelClave, PanelNormas, SelectorSalas } from '@/components/canales';
import { DeslizarParaResponder } from '@/components/deslizar-responder';
import { FilaReacciones, PanelEmojis } from '@/components/emojis';
import { HojaNuevaEncuesta, TarjetaEncuesta } from '@/components/encuesta';
import { HojaAcciones, type OpcionHoja } from '@/components/hoja-acciones';
import { Icono } from '@/components/ui';
import { BotonAqui, CabezaAqui, useYaAqui } from '@/components/ya-aqui';
import { PantallaMiembros } from '@/components/miembros';
import { ModalBloquear, ModalModoLento, ModalPerfilIncompleto, textoTiempo, useBloqueos } from '@/components/seguridad';
import { useSesion } from '@/context/sesion';
import { useChat } from '@/hooks/use-chat';
import { useTheme } from '@/hooks/use-theme';
import { api, MOTIVOS_REPORTE, SALAS_IDIOMA, type Autor, type CanalPropio, type Evento, type MensajeChat } from '@/lib/api';
import { compartirCanal } from '@/lib/compartir-canal';
import { claveDiaDispositivo, etiquetaDiaChat, hora, horaDispositivo } from '@/lib/fechas';
import { aplicarFormato, quitarFormato, textoConFormato, type Formato } from '@/lib/formato';
import i18n from '@/lib/i18n';

// Mensajes seguidos de la misma persona (con menos de 5 minutos entre sí) se agrupan:
// sin repetir foto ni nombre, como en WhatsApp.
const AGRUPAR_MS = 5 * 60 * 1000;
// Lo mismo que permite el servidor para editar o borrar un mensaje propio.
const EDITAR_MS = 15 * 60 * 1000;
const sePuedeEditar = (m: MensajeChat) => Date.now() - new Date(m.fecha).getTime() < EDITAR_MS;

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
  | { tipo: 'msg'; m: MensajeChat; agrupado: boolean };

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
    campo: t.background === '#000000' ? '#1C1C1E' : '#FFFFFF',
    avatarVacio: t.backgroundSelected,
    tarjeta: t.card,
  };
}

function avisar(texto: string) {
  if (Platform.OS === 'web') globalThis.alert?.(texto);
  else Alert.alert(i18n.t('chat.titulo'), texto);
}

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

const Burbuja = memo(function Burbuja({ m, mia, agrupado, yo, resaltado, aqui, edad, onMenu, onPerfil, onReaccion, onIrACita, onResponder, onVotar }: {
  m: MensajeChat; mia: boolean; agrupado: boolean; yo?: string; resaltado: boolean;
  aqui: boolean; // la persona marcó "Ya estoy aquí"
  edad?: number; // solo la ven el creador de un canal propio y los admins

  onMenu: (m: MensajeChat) => void; onPerfil: (m: MensajeChat) => void; onReaccion: (m: MensajeChat, emoji: string) => void; onIrACita: (id: string) => void;
  onResponder: (m: MensajeChat) => void;
  onVotar: (m: MensajeChat, opcion: number) => void;
}) {
  const styles = useEstilos();
  const t = useTheme();
  const { t: tr } = useTranslation();
  // "editado" va junto a la hora, como en Telegram.
  const horaTexto = m.editado ? `${tr('chat.editado')} ${horaDispositivo(m.fecha)}` : horaDispositivo(m.fecha);
  const reacciones = m.reacciones ?? [];

  const burbuja = (
    <Pressable
      onLongPress={() => onMenu(m)}
      delayLongPress={300}
      // En la web también con clic derecho
      {...(Platform.OS === 'web' ? { onContextMenu: (e: { preventDefault: () => void }) => { e.preventDefault(); onMenu(m); } } : {})}
      style={({ pressed }) => [
        mia ? styles.burbujaMia : styles.burbujaOtro,
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
          <Text style={mia ? styles.espacioHoraMia : styles.espacioHoraOtro}>{`   ${horaTexto}`}</Text>
        </Text>
      )}
      <Text style={[styles.hora, mia && styles.horaMia]}>{horaTexto}</Text>
    </Pressable>
  );

  const chips = reacciones.length ? (
    <Animated.View layout={LinearTransition.duration(180)} style={[styles.reacciones, mia ? { alignSelf: 'flex-end' } : { marginLeft: 36 }]}>
      {reacciones.map((r) => {
        const mio = Boolean(yo && r.usuarios.includes(yo));
        return (
          <Animated.View key={r.emoji} entering={ZoomIn.springify().damping(14)} exiting={FadeOut.duration(120)}>
            <Pressable
              onPress={() => onReaccion(m, r.emoji)}
              accessibilityLabel={`${r.emoji} ${r.usuarios.length}`}
              style={[styles.chip, mio && { borderColor: t.text }]}>
              <Text style={styles.chipEmoji}>{r.emoji}</Text>
              {r.usuarios.length > 1 ? <Text style={styles.chipCuenta}>{r.usuarios.length}</Text> : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </Animated.View>
  ) : null;

  if (mia) {
    return (
      <DeslizarParaResponder onResponder={() => onResponder(m)}>
        <View style={[styles.filaMia, !agrupado && styles.separacion]}>
          {burbuja}
          {chips}
        </View>
      </DeslizarParaResponder>
    );
  }
  // Quien habla muestra su país. La edad, solo al creador de un canal propio y a los admins.
  return (
    <DeslizarParaResponder onResponder={() => onResponder(m)}>
      <View style={!agrupado && styles.separacion}>
        <View style={styles.filaOtro}>
          <Pressable onPress={() => onPerfil(m)} disabled={agrupado} style={styles.avatar} accessibilityLabel={m.autor.nombreVisible}>
            {!agrupado && (m.autor.foto
              ? <Image source={{ uri: m.autor.foto }} style={styles.avatar} />
              : <Text style={styles.inicial}>{m.autor.nombreVisible.charAt(0)}</Text>)}
          </Pressable>
          <View style={styles.columnaOtro}>
            {!agrupado && (
              <View style={styles.metaAutor}>
                <Text style={styles.nombreAutor}>{m.autor.nombreVisible}</Text>
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
            {burbuja}
          </View>
        </View>
        {chips}
      </View>
    </DeslizarParaResponder>
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
  const { id, sala: salaParam } = useLocalSearchParams<{ id: string; sala?: string }>();
  const sala = salaParam || 'general';
  const esIdioma = (SALAS_IDIOMA as readonly string[]).includes(sala);
  const insets = useSafeAreaInsets();
  const styles = useEstilos();
  const t = useTheme();
  const { usuario, token } = useSesion();
  const { t: tr, i18n: i18nHook } = useTranslation();
  const {
    estado, error, mensajes, escribiendo, enviar, avisarEscribiendo, reportarMensaje, reaccionar, reintentar,
    leidoHasta, fijado, puedeFijar, puedeEncuesta, fijar, crearEncuesta, votar,
    modoLento, esperaHasta, cambiarModoLento, miembro, unirme, salir, eliminar, editar, borrar, soloLectura,
  } = useChat(id, sala);
  const { ids: bloqueados } = useBloqueos();
  const [bloquear, setBloquear] = useState<Autor | null>(null);
  const [ajusteLento, setAjusteLento] = useState(false);
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
  const [seleccion, setSeleccion] = useState({ start: 0, end: 0 });
  const [enviando, setEnviando] = useState(false);
  const [respondiendo, setRespondiendo] = useState<MensajeChat | null>(null);
  // Mensaje propio que se está editando: el campo de texto lo trae y "enviar" lo guarda.
  const [editando, setEditando] = useState<MensajeChat | null>(null);
  const [enfocado, setEnfocado] = useState(false);
  const [panelEmojis, setPanelEmojis] = useState(false);
  const [resaltado, setResaltado] = useState<string | null>(null);
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

  // Mensajes con separadores de día ("Hoy", "Ayer", "Jueves", "12 de octubre").
  // Los mensajes de personas bloqueadas no se muestran (el servidor ya los quita del historial).
  const visibles = useMemo(() => (bloqueados.size ? mensajes.filter((m) => !bloqueados.has(m.autor.id)) : mensajes), [mensajes, bloqueados]);

  const items = useMemo<Item[]>(() => {
    const salida: Item[] = [];
    let diaAnterior = '';
    // "Mensajes nuevos" va antes del primero de otra persona que llegó después de la última visita.
    const limite = leidoHasta ? new Date(leidoHasta).getTime() : null;
    const primerNuevo = limite === null ? -1
      : visibles.findIndex((m) => m.autor.id !== usuario?.id && new Date(m.fecha).getTime() > limite);
    visibles.forEach((m, i) => {
      const clave = claveDiaDispositivo(m.fecha);
      if (clave !== diaAnterior) {
        salida.push({ tipo: 'dia', clave, etiqueta: etiquetaDiaChat(m.fecha) });
        diaAnterior = clave;
      }
      if (i === primerNuevo) salida.push({ tipo: 'nuevos' });
      const previo = visibles[i - 1];
      const agrupado = Boolean(previo && previo.autor.id === m.autor.id && claveDiaDispositivo(previo.fecha) === clave
        && new Date(m.fecha).getTime() - new Date(previo.fecha).getTime() < AGRUPAR_MS);
      salida.push({ tipo: 'msg', m, agrupado });
    });
    return salida;
    // i18n: las etiquetas de los días cambian con el idioma
  }, [visibles, leidoHasta, usuario?.id, i18nHook.language]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al entrar, la lista parte en "Mensajes nuevos" (si hay); después, cada mensaje nuevo baja al final.
  const yaPosicionado = useRef(false);
  useEffect(() => { yaPosicionado.current = false; }, [id, sala]);
  useEffect(() => {
    if (!mensajes.length) return;
    const linea = items.findIndex((it) => it.tipo === 'nuevos');
    if (!yaPosicionado.current && linea > 0) {
      yaPosicionado.current = true;
      setTimeout(() => lista.current?.scrollToIndex({ index: linea, animated: false, viewPosition: 0.1 }), 80);
      return;
    }
    yaPosicionado.current = true;
    setTimeout(() => lista.current?.scrollToEnd({ animated: true }), 50);
  }, [mensajes.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const cambiarSala = (nueva: string) => {
    setRespondiendo(null);
    if (editando) cancelarEdicion();
    router.setParams({ sala: nueva });
  };

  const cancelarEdicion = () => {
    setEditando(null);
    setTexto('');
  };

  const mandar = async () => {
    const limpio = texto.trim();
    if (editando) {
      if (!limpio || enviando) return;
      if (limpio === editando.texto) return cancelarEdicion();
      setEnviando(true);
      const r = await editar(editando.id, limpio);
      setEnviando(false);
      if (r.error) return avisar(r.error);
      return cancelarEdicion();
    }
    if (!limpio || enviando || esperando) return;
    if (usuario && !usuario.perfilCompleto && usuario.proveedor !== 'dev') return setPerfilPendiente(true);
    setEnviando(true);
    const r = await enviar(limpio, respondiendo?.id);
    setEnviando(false);
    if (r.error) {
      if (r.codigo === 'MODO_LENTO') return; // la cuenta regresiva ya se ve sobre el campo
      if (r.codigo === 'PERFIL_INCOMPLETO') return setPerfilPendiente(true);
      return avisar(r.error);
    }
    setTexto('');
    setRespondiendo(null);
  };

  // Pone el emoji donde está el cursor.
  const ponerEmoji = (e: string) => {
    const inicio = Math.min(seleccion.start, texto.length);
    const fin = Math.min(seleccion.end, texto.length);
    const nuevo = (texto.slice(0, inicio) + e + texto.slice(fin)).slice(0, 500);
    const pos = Math.min(inicio + e.length, nuevo.length);
    setTexto(nuevo);
    setSeleccion({ start: pos, end: pos });
  };

  // Negrita, cursiva… sobre lo seleccionado; la selección queda en el mismo texto.
  const darFormato = (formato: Formato) => {
    const r = aplicarFormato(texto, Math.min(seleccion.start, seleccion.end), Math.max(seleccion.start, seleccion.end), formato);
    if (r.texto.length > 500) return;
    setTexto(r.texto);
    setSeleccion({ start: r.inicio, end: r.fin });
    campo.current?.focus();
  };

  const alternarEmojis = () => {
    if (panelEmojis) {
      setPanelEmojis(false);
      campo.current?.focus();
    } else {
      Keyboard.dismiss();
      setPanelEmojis(true);
    }
  };

  // Ir al mensaje citado y marcarlo un momento.
  const irACita = useCallback((mensajeId: string) => {
    const indice = items.findIndex((it) => it.tipo === 'msg' && it.m.id === mensajeId);
    if (indice < 0) return setAviso(tr('chat.citaNoDisponible'));
    lista.current?.scrollToIndex({ index: indice, animated: true, viewPosition: 0.4 });
    setResaltado(mensajeId);
  }, [items, tr]);

  const responder = (m: MensajeChat) => {
    if (editando) cancelarEdicion();
    setRespondiendo(m);
    setPanelEmojis(false);
    setTimeout(() => campo.current?.focus(), 300);
  };

  const copiar = async (m: MensajeChat) => {
    await Clipboard.setStringAsync(m.texto);
    setAviso(tr('chat.copiado'));
  };

  const reaccionarA = useCallback((m: MensajeChat, emoji: string) => {
    if (usuario) reaccionar(m.id, emoji, usuario.id);
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

  const menuMensaje = useCallback((m: MensajeChat) => {
    const mio = m.autor.id === usuario?.id;
    const miReaccion = m.reacciones?.find((r) => usuario && r.usuarios.includes(usuario.id))?.emoji;
    const elegir = (e: string) => {
      setHoja(null);
      reaccionarA(m, e);
    };
    const abrirTodos = () => setHoja((h) => h && {
      ...h,
      encabezado: <View style={{ marginBottom: 2 }}><PanelEmojis onElegir={elegir} alto={250} /></View>,
    });
    setHoja({
      mensaje: (() => { const plano = quitarFormato(m.texto); return plano.length > 120 ? `${plano.slice(0, 119)}…` : plano; })(),
      encabezado: estado === 'listo' ? <FilaReacciones elegida={miReaccion} onElegir={elegir} onMas={abrirTodos} /> : undefined,
      opciones: [
        ...(estado === 'listo' ? [{ texto: tr('chat.responder'), icono: 'arrowshape.turn.up.left', onPress: () => responder(m) }] : []),
        { texto: tr('chat.copiar'), icono: 'doc.on.doc', onPress: () => copiar(m) },
        // Mensaje propio reciente: editar o borrar (las encuestas solo se borran).
        ...(mio && estado === 'listo' && sePuedeEditar(m) ? [
          ...(m.encuesta || soloLectura ? [] : [{
            texto: tr('chat.editar'), icono: 'pencil',
            onPress: () => {
              setRespondiendo(null);
              setPanelEmojis(false);
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
  }, [usuario, estado, reaccionarA, tr, puedeFijar, fijado, soloLectura]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const perfilAutor = useCallback((m: MensajeChat) => perfilPersona(m.autor, m.id), [usuario, tr]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Menú ⋯ de cualquier sala: compartir (canales propios), modo lento (quien modera), personas, evento y salir.
  const menuSala = () => {
    const opciones: OpcionHoja[] = [];
    if (canal) opciones.push({ texto: tr('canales.compartir'), icono: 'square.and.arrow.up', onPress: compartir });
    if (puedeFijar && estado === 'listo') opciones.push({ texto: tr('modoLento.titulo'), icono: 'timer', onPress: () => setTimeout(() => setAjusteLento(true), 250) });
    opciones.push({ texto: tr('miembros.verPersonas'), icono: 'person.2', onPress: () => setTimeout(() => setMiembros(true), 250) });
    if (id) opciones.push({ texto: tr('canales.verEvento'), icono: 'calendar', onPress: () => router.push({ pathname: '/evento/[id]', params: { id } }) });
    if (miembro && !canal?.esMio) {
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
    const nombreSala = canal?.nombre ?? (esIdioma && sala !== 'general' ? NOMBRES_IDIOMA[sala] : tr('canales.general'));
    setHoja({
      titulo: nombreSala,
      mensaje: canal?.descripcion ?? (miembro ? undefined : tr('canales.unirmeAyuda')),
      opciones,
    });
  };

  const alUnirme = async () => {
    const r = await unirme();
    if (r.error) return avisar(r.error);
    setAviso(tr('canales.unido'));
    if (canal) cargarCanales(); // para que el encabezado cuente a quien se acaba de unir
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

  const van = evento?.asistencia?.van;
  const subtitulo = canal
    ? [canal.soloAvisos ? tr('canales.avisos') : null, canal.privado ? tr('canales.privado') : null, tr('canales.personas', { count: canal.miembros })].filter(Boolean).join(' · ')
    : van ? tr('agenda.van', { count: van }) : null;
  const silenciado = usuario?.silenciadoHasta && new Date(usuario.silenciadoHasta) > new Date();
  const puedeEscribir = estado === 'listo' && !silenciado && !soloLectura;
  // En la web no se mira el foco: apretar un botón de formato saca el foco del campo antes del toque.
  const haySeleccion = (enfocado || Platform.OS === 'web') && seleccion.end !== seleccion.start && puedeEscribir;

  return (
    <KeyboardAvoidingView style={styles.pantalla} behavior="padding">
      <View style={[styles.encabezado, { paddingTop: insets.top + 2 }]}>
        <View style={styles.filaEncabezado}>
          <Pressable
            accessibilityLabel={tr('comun.volver')}
            onPress={() => (!esIdioma ? cambiarSala('general') : router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.botonVolver}>
            <Text style={styles.flecha}>‹</Text>
          </Pressable>
          {/* Como en WhatsApp: foto chica a la izquierda y el título al lado, todo en una fila baja. */}
          <Pressable
            style={({ pressed }) => [styles.tituloCentro, pressed && { opacity: 0.6 }]}
            onPress={() => setMiembros(true)}
            accessibilityRole="button"
            accessibilityHint={tr('miembros.verPersonas')}>
            {evento?.imagen ? <Image source={{ uri: evento.imagen }} style={styles.fotoEvento} /> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.titulo} numberOfLines={1}>{canal?.nombre ?? evento?.titulo ?? tr('chat.chatDelEvento')}</Text>
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
        {id && esIdioma && estado !== 'normas' ? <SelectorSalas eventoId={id} sala={sala} canales={canales} onCambio={cambiarSala} /> : null}
        {estado === 'listo' && fijado ? (
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

      {estado === 'sin-sesion' ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>{tr('chat.sinSesion')}</Text>
        </View>
      ) : estado === 'normas' ? (
        <PanelNormas eventoId={id ?? ''} onAceptadas={reintentar} />
      ) : estado === 'clave' ? (
        <PanelClave canal={canal} onDentro={() => { cargarCanales(); reintentar(); }} />
      ) : estado === 'conectando' ? (
        <View style={styles.centro}><ActivityIndicator /></View>
      ) : estado === 'cerrado' || estado === 'error' ? (
        <View style={styles.centro}>
          <Text style={styles.aviso}>{estado === 'cerrado' ? tr('canales.yaNoExiste') : error ?? tr('chat.errorAbrir')}</Text>
        </View>
      ) : (
        <FlatList
          ref={lista}
          data={items}
          keyExtractor={(it) => (it.tipo === 'dia' ? `dia-${it.clave}` : it.tipo === 'nuevos' ? 'nuevos' : it.m.id)}
          contentContainerStyle={styles.contenidoLista}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setPanelEmojis(false)}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            lista.current?.scrollToOffset({ offset: index * averageItemLength, animated: true });
            setTimeout(() => lista.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 }), 250);
          }}
          ListHeaderComponent={
            <View style={{ gap: 2, marginBottom: 6 }}>
              {canal?.descripcion ? <Text style={[styles.nota, { color: t.text }]}>{canal.descripcion}</Text> : null}
              <Text style={styles.nota}>
                {evento ? tr('chat.seBorraHora', { hora: hora(evento.fin) }) : tr('chat.seBorra')}
              </Text>
              <Text style={styles.nota}>{tr('chat.teVen')}</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.nota}>{soloLectura ? tr('chat.vacioAvisos') : esIdioma && sala !== 'general' ? tr('chat.vacioIdioma') : tr('chat.vacio')}</Text>}
          renderItem={({ item }) => item.tipo === 'dia' ? <SeparadorDia etiqueta={item.etiqueta} /> : item.tipo === 'nuevos' ? (
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
              yo={usuario?.id}
              resaltado={resaltado === item.m.id}
              aqui={aqui.ids.has(item.m.autor.id)}
              edad={edadDe(item.m.autor.id)}
              onMenu={menuMensaje}
              onPerfil={perfilAutor}
              onReaccion={reaccionarA}
              onIrACita={irACita}
              onResponder={responder}
              onVotar={votarEn}
            />
          )}
          ListFooterComponent={
            escribiendo && !bloqueados.has(escribiendo.id) ? <Text style={styles.escribiendo}>{tr('chat.escribiendo', { nombre: escribiendo.nombreVisible })}</Text> : undefined
          }
        />
      )}

      {aviso ? (
        <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(150)} pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastTexto}>{aviso}</Text>
        </Animated.View>
      ) : null}

      {estado === 'listo' || estado === 'conectando' ? (
        <View style={[styles.barraEntrada, { paddingBottom: panelEmojis ? 8 : Math.max(insets.bottom, 8) }]}>
          {soloLectura ? (
            <View style={styles.silenciado}>
              <Icono nombre="megaphone" tamano={15} color={t.textSecondary} />
              <Text style={styles.textoSilenciado}>{tr('chat.soloAvisos')}</Text>
            </View>
          ) : silenciado ? (
            <View style={styles.silenciado}>
              <Icono nombre="speaker.slash" tamano={15} color={t.textSecondary} />
              <Text style={styles.textoSilenciado}>{tr('chat.silenciado')}</Text>
            </View>
          ) : (
            <>
              {respondiendo ? (
                <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={styles.respondiendo}>
                  <Icono nombre="arrowshape.turn.up.left" tamano={16} color={t.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Cita
                      nombre={tr('chat.respondiendoA', { nombre: respondiendo.autor.id === usuario?.id ? tr('chat.tiMismo') : respondiendo.autor.nombreVisible })}
                      texto={respondiendo.texto}
                    />
                  </View>
                  <Pressable onPress={() => setRespondiendo(null)} hitSlop={10} accessibilityLabel={tr('chat.cancelarRespuesta')}>
                    <Icono nombre="xmark.circle.fill" tamano={20} color={t.textSecondary} />
                  </Pressable>
                </Animated.View>
              ) : null}
              {editando ? (
                <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOut.duration(120)} style={styles.respondiendo}>
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
              <View style={styles.filaCampo}>
                {puedeEncuesta ? (
                  <Pressable
                    onPress={() => { setPanelEmojis(false); setNuevaEncuesta(true); }}
                    disabled={!puedeEscribir}
                    hitSlop={6}
                    accessibilityLabel={tr('encuesta.nueva')}
                    style={({ pressed }) => [styles.botonEmoji, pressed && { opacity: 0.5 }]}>
                    <Icono nombre="chart.bar" tamano={22} color={t.textSecondary} />
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={alternarEmojis}
                  disabled={!puedeEscribir}
                  hitSlop={6}
                  accessibilityLabel={tr('chat.emojis')}
                  style={({ pressed }) => [styles.botonEmoji, pressed && { opacity: 0.5 }]}>
                  <Icono nombre={panelEmojis ? 'keyboard' : 'face.smiling'} tamano={24} color={t.textSecondary} />
                </Pressable>
                <View style={styles.campo}>
                  <TextInput
                    ref={campo}
                    value={texto}
                    onChangeText={(v) => {
                      setTexto(v);
                      avisarEscribiendo();
                    }}
                    selection={Platform.OS === 'web' ? undefined : seleccion}
                    onSelectionChange={(e) => setSeleccion(e.nativeEvent.selection)}
                    onFocus={() => { setPanelEmojis(false); setEnfocado(true); }}
                    onBlur={() => setEnfocado(false)}
                    placeholder={canal ? tr('chat.mensajeEn', { canal: canal.nombre }) : tr('chat.mensaje')}
                    placeholderTextColor={t.textSecondary}
                    style={styles.input}
                    maxLength={500}
                    editable={puedeEscribir}
                    onSubmitEditing={mandar}
                    submitBehavior="submit"
                    returnKeyType="send"
                  />
                  <Pressable
                    accessibilityLabel={tr('chat.enviar')}
                    onPress={mandar}
                    disabled={!texto.trim() || enviando || (esperando && !editando)}
                    style={[styles.botonEnviar, (!texto.trim() || enviando || (esperando && !editando)) && { opacity: 0.4 }]}>
                    {editando
                      ? <Icono nombre="checkmark" tamano={16} color={t.onAccent} peso="bold" />
                      : esperando
                      ? <Text style={styles.cuentaLento}>{faltan}</Text>
                      : <Icono nombre="arrow.up" tamano={16} color={t.onAccent} peso="bold" />}
                  </Pressable>
                </View>
              </View>
            </>
          )}
          {panelEmojis && !silenciado ? (
            <Animated.View entering={FadeIn.duration(160)} style={{ marginTop: 8, paddingBottom: insets.bottom }}>
              <PanelEmojis onElegir={ponerEmoji} />
            </Animated.View>
          ) : null}
        </View>
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
      <HojaAcciones
        visible={Boolean(hoja)}
        titulo={hoja?.titulo}
        mensaje={hoja?.mensaje}
        opciones={hoja?.opciones ?? []}
        encabezado={hoja?.encabezado}
        onCerrar={() => setHoja(null)}
      />
    </KeyboardAvoidingView>
  );
}

const fuente = Platform.select({ web: '-apple-system, "SF Pro Text", Inter, system-ui, sans-serif', default: undefined });

function crearEstilos(C: ReturnType<typeof colores>) {
  return StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: C.fondo },
  encabezado: {
    backgroundColor: C.barra, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.separador,
  },
  filaEncabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, minHeight: 48 },
  botonVolver: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  botonMenu: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  unirme: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: C.acento, marginLeft: 2 },
  unirmeTexto: { fontSize: 14, fontWeight: '700', color: C.sobreAcento, fontFamily: fuente },
  flecha: { fontSize: 34, lineHeight: 36, color: C.acentoTexto, fontWeight: '400' },
  tituloCentro: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 4 },
  fotoEvento: { width: 34, height: 34, borderRadius: 17 },
  titulo: { fontSize: 15, fontWeight: '600', color: C.texto, fontFamily: fuente },
  tituloSecundario: { fontSize: 12, color: C.secundario, fontFamily: fuente },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  aviso: { fontSize: 17, color: C.secundario, textAlign: 'center', fontFamily: fuente },
  contenidoLista: { paddingHorizontal: 16, paddingVertical: 12, gap: 2 },
  nota: { alignSelf: 'center', fontSize: 12, color: C.secundario, textAlign: 'center', marginVertical: 2, fontFamily: fuente },
  separacion: { marginTop: 10 },

  dia: { alignSelf: 'center', backgroundColor: C.tarjeta, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 14, marginBottom: 4 },
  diaTexto: { fontSize: 12, fontWeight: '600', color: C.secundario, fontFamily: fuente },

  filaMia: { alignSelf: 'flex-end', maxWidth: '78%' },
  nuevos: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10, paddingHorizontal: 4 },
  nuevosLinea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: C.secundario },
  nuevosTexto: { fontSize: 12, fontWeight: '600', color: C.secundario, fontFamily: fuente, textTransform: 'uppercase', letterSpacing: 0.3 },
  fijado: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, marginHorizontal: 12, paddingRight: 12,
    borderRadius: 12, backgroundColor: C.tarjeta,
  },
  fijadoToque: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingLeft: 10 },
  fijadoLinea: { width: 3, alignSelf: 'stretch', borderRadius: 2, backgroundColor: C.texto },
  fijadoRotulo: { fontSize: 12, fontWeight: '600', color: C.texto, fontFamily: fuente },
  fijadoTexto: { fontSize: 14, color: C.secundario, fontFamily: fuente },
  burbujaMia: { backgroundColor: C.acento, borderRadius: 18, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7 },
  burbujaOtro: { backgroundColor: C.burbujaOtro, borderRadius: 18, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 7, alignSelf: 'flex-start' },
  resaltado: { transform: [{ scale: 1.03 }], opacity: 0.75 },
  textoMio: { color: C.sobreAcento, fontSize: 17, lineHeight: 22, fontFamily: fuente },
  textoOtro: { color: C.texto, fontSize: 17, lineHeight: 22, fontFamily: fuente },
  espacioHoraMia: { fontSize: 11, color: C.acento },
  espacioHoraOtro: { fontSize: 11, color: C.burbujaOtro },
  hora: { position: 'absolute', right: 10, bottom: 5, fontSize: 11, color: C.secundario, fontFamily: fuente },
  horaMia: { color: C.sobreAcento, opacity: 0.6 },

  cita: { flexDirection: 'row', gap: 8, borderRadius: 10, paddingVertical: 6, paddingRight: 10, paddingLeft: 8, marginBottom: 5, overflow: 'hidden' },
  citaOtro: { backgroundColor: C.fondo === '#000000' ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' },
  citaMia: { backgroundColor: C.fondo === '#000000' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.14)' },
  citaLinea: { width: 3, borderRadius: 2, backgroundColor: C.texto },
  citaLineaMia: { backgroundColor: C.sobreAcento },
  citaNombre: { fontSize: 13, fontWeight: '600', color: C.texto, fontFamily: fuente },
  citaTexto: { fontSize: 13, lineHeight: 17, color: C.secundario, fontFamily: fuente },
  citaTextoMio: { color: C.sobreAcento, opacity: 0.85 },

  reacciones: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: -4, zIndex: 1 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, paddingHorizontal: 7, borderRadius: 13,
    backgroundColor: C.tarjeta, borderWidth: 1.5, borderColor: C.fondo,
  },
  chipEmoji: { fontSize: 14 },
  chipCuenta: { fontSize: 12, fontWeight: '600', color: C.texto, fontFamily: fuente },

  filaOtro: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '85%' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  inicial: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.avatarVacio, textAlign: 'center',
    lineHeight: 28, fontSize: 13, fontWeight: '600', color: C.secundario, overflow: 'hidden',
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
    position: 'absolute', alignSelf: 'center', bottom: 96, maxWidth: '86%',
    backgroundColor: C.texto, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
  },
  toastTexto: { color: C.fondo, fontSize: 14, fontWeight: '500', textAlign: 'center', fontFamily: fuente },
  silenciado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 36, paddingHorizontal: 12 },
  textoSilenciado: { flexShrink: 1, fontSize: 13, color: C.secundario, textAlign: 'center', fontFamily: fuente },
  escribiendo: { fontSize: 12, color: C.secundario, marginTop: 8, marginLeft: 36, fontFamily: fuente },
  barraEntrada: {
    paddingHorizontal: 12, paddingTop: 8, backgroundColor: C.barra,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.separador,
  },
  respondiendo: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4, marginBottom: 8 },
  filaFormato: { flexDirection: 'row', alignSelf: 'center', gap: 4, padding: 4, marginBottom: 8, borderRadius: 12, backgroundColor: C.campo, borderWidth: StyleSheet.hairlineWidth, borderColor: C.separador },
  botonFormato: { width: 40, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  letraFormato: { fontSize: 16, color: C.texto, fontFamily: fuente },
  filaCampo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  botonEmoji: { width: 34, height: 36, alignItems: 'center', justifyContent: 'center' },
  campo: {
    flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 36, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth, borderColor: C.separador, backgroundColor: C.campo, paddingLeft: 14, paddingRight: 4,
  },
  input: { flex: 1, fontSize: 17, paddingVertical: 6, color: C.texto, fontFamily: fuente },
  botonEnviar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.acento, alignItems: 'center', justifyContent: 'center' },
});
}

function useEstilos() {
  const t = useTheme();
  return useMemo(() => crearEstilos(colores(t)), [t]);
}
