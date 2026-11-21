// Canales: un canal por evento. Abre 3 días antes y desaparece cuando el evento termina.
// Dos vistas: "Mis canales" (las salas donde ya entré, como la lista de chats de WhatsApp,
// para volver rápido y ver lo no leído) y "Explorar" (tarjetas con la foto del evento, filtro por fecha y buscador).
import { router, useFocusEffect } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Banderas } from '@/components/bandera';
import { IconoTopico } from '@/components/chat/topicos';
import { BotonArriba, EncabezadoCompacto, useDesplazamiento } from '@/components/desplazamiento';
import { EsqueletoCanales } from '@/components/esqueleto';
import { AvisoSinConexion, VacioSinConexion } from '@/components/aviso-sin-conexion';
import { BarraBusqueda, IconoVacio, TiraFechas } from '@/components/filtros';
import { HojaAcciones, type OpcionHoja } from '@/components/hoja-acciones';
import { FilaMiCanal, HojaElegirEvento, type MiCanal } from '@/components/mis-canales';
import { BotonTexto, Icono, Texto } from '@/components/ui';
import { BottomTabInset } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type Evento } from '@/lib/api';
import { crearBuscador } from '@/lib/buscar-eventos';
import { cuandoVuelvaLaConexion, useSinConexion } from '@/lib/conexion';
import { obtenerSocket } from '@/lib/socket';
import { escucharCambios, eventosDelTelefono, horaDeLista, eventosGuardados, guardarEventos, listaReciente, marcarDescarga } from '@/lib/eventos-cache';
import { useCiudad } from '@/lib/ciudades';
import { claveDia, claveHoy, diaCorto, diasDesdeHoy, hora } from '@/lib/fechas';
import { refrescarNoLeidos, textoCuenta, useNoLeidos } from '@/lib/no-leidos';
import { guardado, pedir, precargarChat, precargarEvento } from '@/lib/precarga';
import { FotoEvento } from '@/components/foto-evento';

const DIAS_ABREN_PRONTO = 7;
const DIAS_CHAT = 3; // el canal abre 3 días antes del evento (DIAS_ANTES_CHAT en el servidor)
// Lo que ya se bajó de cada ciudad (sobrevive al cambiar de pestaña).
const prontoCargado = new Set<string>();
const diasCanales = new Map<string, string[]>();
// Solo las primeras tarjetas entran animadas; con cientos de canales, el retraso escalonado
// hacía que las de más abajo tardaran segundos en aparecer.
const ANIMADAS = 6;

// Punto "en vivo" que late suavemente.
function PuntoVivo() {
  const t = useTheme();
  const aura = useSharedValue(0);
  useEffect(() => {
    aura.set(withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0, { duration: 0 })), -1));
  }, [aura]);
  const estiloAura = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - aura.value), transform: [{ scale: 1 + aura.value * 1.6 }] }));
  return (
    <View style={styles.puntoCaja}>
      <Animated.View style={[styles.punto, { backgroundColor: t.live }, estiloAura]} />
      <View style={[styles.punto, { backgroundColor: t.live }]} />
    </View>
  );
}

// Canal de un evento en "Explorar": fila con la foto (aro amarillo si está abierto), nombre,
// cuándo y dónde, y quiénes van o ya llegaron. Antes era una tarjeta de 190 px con 5 líneas sobre la foto.
const TarjetaCanal = memo(function TarjetaCanal({ evento: e, indice, ultima }: { evento: Evento; indice: number; ultima: boolean }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const nuevos = useNoLeidos()[e.id]?.total ?? 0;
  const abierto = e.chatAbierto;
  const a = e.asistencia;
  const abrir = () => abierto
    ? router.push({ pathname: '/evento/[id]/chat', params: { id: e.id } })
    : router.push({ pathname: '/evento/[id]', params: { id: e.id } });
  const extra = abierto && (e.miAsistencia?.aqui || a?.aqui)
    ? (e.miAsistencia?.aqui ? tr('aqui.estas') : tr('aqui.enLugar', { count: a?.aqui ?? 0 }))
    : a && a.van > 0 ? tr('agenda.van', { count: a.van }) : null;

  return (
    <Animated.View entering={indice < ANIMADAS ? FadeInDown.delay(40 * indice).duration(300) : undefined}>
      <Pressable onPressIn={() => (abierto ? precargarChat(e.id) : precargarEvento(e))} onPress={abrir} style={({ pressed }) => [styles.filaCanal, pressed && { backgroundColor: t.backgroundElement }]}>
        <View style={[styles.aroCanal, { borderColor: abierto ? t.sun : 'transparent' }]}>
          <View style={[styles.fotoCanal, { backgroundColor: t.backgroundElement }]}>
            {e.imagen ? <FotoEvento url={e.imagen} style={StyleSheet.absoluteFill} recyclingKey={e.id} transition={150} /> : null}
          </View>
        </View>
        <View style={[styles.cuerpoCanal, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
          <View style={styles.lineaCanal}>
            <Texto v="cuerpoFuerte" numberOfLines={1} style={{ flex: 1, fontSize: 16 }}>{e.titulo}</Texto>
            {abierto ? (
              <View style={styles.datos}><PuntoVivo /><Texto v="pie" style={{ fontWeight: '700', color: t.live }}>{tr('canales.enVivo')}</Texto></View>
            ) : null}
          </View>
          <View style={styles.lineaCanal}>
            <Texto v="detalle" secundario numberOfLines={1} style={{ flex: 1, fontSize: 14 }}>
              {abierto
                ? [`${diaCorto(e.inicio)} ${hora(e.inicio)}`, e.lugar ?? e.barrio].filter(Boolean).join(' · ')
                : tr('canales.abre', { dia: diaCorto(e.chatAbreEn), hora: hora(e.chatAbreEn) })}
            </Texto>
            {abierto && nuevos > 0 ? (
              <Animated.View entering={ZoomIn.duration(200).easing(Easing.out(Easing.cubic))} style={[styles.nuevos, { backgroundColor: t.accent }]} accessibilityLabel={tr('chat.nuevos', { count: nuevos })}>
                <Texto v="mini" style={{ color: t.onAccent, fontWeight: '700' }}>{textoCuenta(nuevos)}</Texto>
              </Animated.View>
            ) : null}
          </View>
          {extra ? (
            <View style={styles.datos}>
              {a?.paisesTop.length ? <Banderas codigos={a.paisesTop} alto={10} max={3} /> : null}
              <Texto v="pie" secundario style={{ fontWeight: '600' }}>{extra}</Texto>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

// La lista es plana (títulos de sección + tarjetas o filas) para poder virtualizarla.
type Fila =
  | { tipo: 'seccion'; clave: string; titulo: string; ayuda?: string }
  | { tipo: 'canal'; clave: string; evento: Evento; indice: number }
  | { tipo: 'mio'; clave: string; canal: MiCanal; ultima: boolean }
  | { tipo: 'topicoMio'; clave: string; topico: MiTopico; ultima: boolean };
type Vista = 'mis' | 'explorar';
// Tópico que creé (para el filtro "Creados por mí").
type MiTopico = {
  id: string; eventoId: string; sala: string; nombre: string; icono: string | null; color: number; cerrado: boolean;
  evento: { titulo: string; imagen: string | null }; canal: string | null;
};

// Fila de un tópico propio: su ícono, nombre y dónde está (evento y canal).
const FilaTopicoMio = memo(function FilaTopicoMio({ x, ultima, onAbrir }: { x: MiTopico; ultima: boolean; onAbrir: (x: MiTopico) => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Pressable onPress={() => onAbrir(x)} accessibilityRole="button" style={({ pressed }) => [styles.filaTopico, pressed && { backgroundColor: t.backgroundSelected }]}>
      <IconoTopico topico={x} tamano={46} />
      <View style={[styles.cuerpoTopico, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Texto v="cuerpoFuerte" numberOfLines={1} style={{ flexShrink: 1 }}>{x.nombre}</Texto>
          {x.cerrado ? <Icono nombre="lock.fill" tamano={12} color={t.textSecondary} /> : null}
        </View>
        <Texto v="pie" secundario numberOfLines={1}>
          {`${tr('topicos.etiqueta')} · ${x.canal ?? (x.sala === 'general' ? tr('canales.general') : x.sala.toUpperCase())} · ${x.evento.titulo}`}
        </Texto>
      </View>
    </Pressable>
  );
});

export default function CanalesScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { token, usuario, cargando: leyendoSesion } = useSesion();
  const { t: tr } = useTranslation();
  const ciudad = useCiudad();
  // Parte con los últimos canales que se vieron (memoria o teléfono) y se actualiza por detrás.
  const [eventos, setEventos] = useState<Evento[] | null>(() => eventosGuardados(ciudad.id, 'canales'));
  const sinSenal = useSinConexion();
  const [consulta, setConsulta] = useState('');
  const [dia, setDia] = useState<string | null>(null);
  // Mis canales parten con lo último que llegó (también lo guardado en el teléfono: sin señal se ven igual).
  type RespuestaMisCanales = { canales: MiCanal[]; misTopicos?: MiTopico[] };
  const [misCanalesApi, setMisCanales] = useState<MiCanal[] | null>(() => guardado<RespuestaMisCanales>('/me/canales', token)?.canales ?? null);
  const [misTopicos, setMisTopicos] = useState<MiTopico[]>(() => guardado<RespuestaMisCanales>('/me/canales', token)?.misTopicos ?? []);
  // Filtro dentro de "Mis canales": todos o solo los canales y tópicos que creé.
  const [soloCreados, setSoloCreados] = useState(false);
  const misCanales = useMemo(() => (token ? misCanalesApi : []), [token, misCanalesApi]); // sin sesión no hay
  // Parte en "Mis canales" si ya estoy en alguno; si no, en "Explorar". Después la elige la persona.
  const [vista, setVista] = useState<Vista | null>(null);
  const vistaActual: Vista = vista ?? (misCanales?.length ? 'mis' : 'explorar');
  const [opciones, setOpciones] = useState<MiCanal | null>(null);
  const [eligiendoEvento, setEligiendoEvento] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const { onScroll, medirBuscador, compacto, arriba } = useDesplazamiento();
  // Lista virtualizada: solo se dibujan las tarjetas cerca de la pantalla (puede haber cientos).
  const lista = useRef<FlatList<Fila>>(null);
  const subir = useCallback(() => lista.current?.scrollToOffset({ offset: 0, animated: true }), []);
  const desplazada = useRef(false);

  const [conPronto, setConPronto] = useState(() => prontoCargado.has(ciudad.id));
  const [diasServidor, setDiasServidor] = useState<string[] | null>(() => diasCanales.get(ciudad.id) ?? null);
  // Al cambiar de ciudad se limpia la pantalla y los filtros.
  const [ciudadVista, setCiudadVista] = useState(ciudad.id);
  if (ciudadVista !== ciudad.id) {
    setCiudadVista(ciudad.id);
    setEventos(eventosGuardados(ciudad.id, 'canales'));
    setConPronto(prontoCargado.has(ciudad.id));
    setDiasServidor(diasCanales.get(ciudad.id) ?? null);
    setConsulta('');
    setDia(null);
  }

  // Canales por partes: primero los abiertos (lo que se ve arriba) y "Abren pronto" recién al bajar hasta el
  // final, elegir una fecha o buscar. Antes se bajaban los ~580 de una vez y la pestaña tardaba en aparecer.
  // abiertos: true baja los abiertos; pronto: true baja "Abren pronto". Lo que no se baja se conserva.
  const bajarCanales = async ({ abiertos: conAbiertos, pronto: conPronto }: { abiertos: boolean; pronto: boolean }) => {
    const base = `/events?ciudad=${ciudad.id}&ligero=1`;
    const enTresDias = new Date(Date.now() + DIAS_CHAT * 864e5).toISOString();
    const [abiertos, pronto] = await Promise.all([
      conAbiertos ? api<{ eventos: Evento[]; dias?: string[] }>(`${base}&dias=1&canalesEnDias=0`, { token }) : null,
      conPronto ? api<{ eventos: Evento[] }>(`${base}&desde=${enTresDias}&canalesEnDias=${DIAS_ABREN_PRONTO + 1}`, { token }) : null,
    ]);
    const antes = eventosGuardados(ciudad.id, 'canales') ?? [];
    const listaAbiertos = abiertos?.eventos ?? antes.filter((e) => e.chatAbierto);
    const ids = new Set(listaAbiertos.map((e) => e.id));
    const listaPronto = (pronto?.eventos ?? antes.filter((e) => !e.chatAbierto)).filter((e) => !ids.has(e.id));
    const lista = [...listaAbiertos, ...listaPronto]
      .filter((e) => e.chatAbierto || diasDesdeHoy(e.chatAbreEn) <= DIAS_ABREN_PRONTO);
    setEventos(lista);
    guardarEventos(ciudad.id, lista, 'canales');
    if (abiertos) marcarDescarga(ciudad.id, 'canales', token ?? null);
    if (abiertos?.dias) { diasCanales.set(ciudad.id, abiertos.dias); setDiasServidor(abiertos.dias); }
    if (conPronto) { prontoCargado.add(ciudad.id); setConPronto(true); }
  };
  // Una descarga a la vez: volver a la pestaña mientras llega no la pide otra vez.
  const descargando = useRef<Promise<void> | null>(null);
  const descargar = useCallback((incluirPronto: boolean) => {
    if (descargando.current && !incluirPronto) return descargando.current;
    const p = bajarCanales({ abiertos: true, pronto: incluirPronto }).finally(() => { if (descargando.current === p) descargando.current = null; });
    descargando.current = p;
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ciudad.id, token]);
  useFocusEffect(useCallback(() => {
    refrescarNoLeidos();
    if (leyendoSesion || listaReciente(ciudad.id, 'canales', token ?? null)) return; // recién descargada: no trabar al volver
    descargar(prontoCargado.has(ciudad.id)).catch(async () => {
      // Sin señal: lo guardado en el teléfono (puede no haber terminado de leerse todavía).
      const l = eventosGuardados(ciudad.id, 'canales') ?? await eventosDelTelefono(ciudad.id, 'canales');
      setEventos((e) => e ?? l ?? []);
    });
  }, [token, ciudad.id, descargar, leyendoSesion]));
  const [pidiendoPronto, setPidiendoPronto] = useState(false);
  const pedirPronto = useCallback(() => {
    if (conPronto || pidiendoPronto) return;
    setPidiendoPronto(true);
    // Solo "Abren pronto": los abiertos ya están (si todavía no, van juntos).
    bajarCanales({ abiertos: !eventos, pronto: true }).catch(() => {}).finally(() => setPidiendoPronto(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conPronto, pidiendoPronto, eventos, ciudad.id, token]);
  useEffect(() => escucharCambios(() => {
    const l = eventosGuardados(ciudad.id, 'canales');
    if (l) setEventos(l);
  }), [ciudad.id]);

  useEffect(() => {
    let vigente = true;
    eventosDelTelefono(ciudad.id, 'canales').then((l) => { if (vigente && l) setEventos((e) => e ?? l); });
    return () => { vigente = false; };
  }, [ciudad.id]);

  // Mis canales: al volver a la pestaña y cada vez que cambian los no leídos (para el último mensaje).
  const noLeidos = useNoLeidos();
  const totalNuevos = useMemo(() => Object.values(noLeidos).reduce((n, e) => n + e.total, 0), [noLeidos]);
  const cargarMisCanales = useCallback(() => {
    if (!token) return;
    obtenerSocket(token); // la conexión del chat queda abierta antes de tocar un canal
    pedir<RespuestaMisCanales>('/me/canales', token, 0)
      .then((r) => { setMisCanales(r.canales); setMisTopicos(r.misTopicos ?? []); })
      .catch(() => {
        const g = guardado<RespuestaMisCanales>('/me/canales', token);
        setMisCanales((m) => m ?? g?.canales ?? []);
        if (g?.misTopicos) setMisTopicos((t) => (t.length ? t : g.misTopicos ?? []));
      });
  }, [token]);
  useFocusEffect(cargarMisCanales);
  // Volvió la señal: se actualiza sola.
  useEffect(() => cuandoVuelvaLaConexion(() => {
    descargar(prontoCargado.has(ciudad.id)).catch(() => {});
    cargarMisCanales();
  }), [descargar, ciudad.id, cargarMisCanales]);
  useEffect(() => { if (totalNuevos) cargarMisCanales(); }, [totalNuevos, cargarMisCanales]);

  useEffect(() => {
    if (!aviso) return;
    const id = setTimeout(() => setAviso(null), 2400);
    return () => clearTimeout(id);
  }, [aviso]);

  const abrirMiCanal = useCallback((c: MiCanal) => {
    router.push({ pathname: '/evento/[id]/chat', params: { id: c.eventoId, sala: c.sala } });
  }, []);

  const salir = async (c: MiCanal) => {
    // Se quita al instante; si falla, vuelve.
    setMisCanales((m) => m?.filter((x) => x.clave !== c.clave) ?? m);
    try {
      if (c.canal) await api(`/canales/${c.sala}/salir`, { metodo: 'POST', token });
      else await api(`/me/canales/${c.eventoId}?sala=${encodeURIComponent(c.sala)}`, { metodo: 'DELETE', token });
      refrescarNoLeidos();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : String(e));
      cargarMisCanales();
    }
  };

  const opcionesDe = (c: MiCanal): OpcionHoja[] => [
    { texto: tr('canales.abrir'), icono: 'bubble.left.and.bubble.right', onPress: () => abrirMiCanal(c) },
    { texto: tr('canales.verEvento'), icono: 'calendar', onPress: () => router.push({ pathname: '/evento/[id]', params: { id: c.eventoId } }) },
    ...(c.canal?.esMio ? [] : [{ texto: tr('canales.salir'), icono: 'rectangle.portrait.and.arrow.right', destructiva: true, onPress: () => salir(c) }]),
  ];
  const mensajeOpciones = (c: MiCanal) => c.canal?.esMio
    ? tr('canales.creadorNoSale')
    : c.canal?.privado ? tr('canales.salirClave') : tr('canales.salirAyuda');

  // Crear un canal desde aquí: primero se elige el evento (solo los que tienen el chat abierto).
  const puedeCrear = Boolean(usuario?.puedeCrearCanales);
  const conChatAbierto = useMemo(() => (eventos ?? []).filter((e) => e.chatAbierto), [eventos]);
  const crearEn = (e: Evento) => {
    setEligiendoEvento(false);
    setTimeout(() => router.push({ pathname: '/evento/[id]/nuevo-canal', params: { id: e.id } }), Platform.OS === 'ios' ? 450 : 50);
  };

  const buscando = consulta.trim().length >= 2;
  // El índice del buscador se arma recién al escribir (con cientos de canales tardaba aunque nadie buscara).
  const buscar = useMemo(() => (buscando ? crearBuscador(eventos ?? []) : null), [buscando, eventos]);
  // Al buscar o elegir una fecha también cuentan los que abren pronto.
  const cambiarConsulta = (v: string) => { setConsulta(v); if (v.trim().length >= 2) pedirPronto(); };
  const cambiarDia = (d: string | null) => { setDia(d); if (d) pedirPronto(); };
  const diaDe = (e: Evento) => (diasDesdeHoy(e.inicio) < 0 ? claveHoy() : claveDia(e.inicio));
  // Los días los manda el servidor: así la tira marca también los que abren pronto antes de bajarlos.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const diasConEventos = useMemo(() => new Set(diasServidor ?? (eventos ?? []).map(diaDe)), [diasServidor, eventos, ciudad.zona]);

  const { abiertos, pronto } = useMemo(() => {
    let lista = buscar ? buscar(consulta) : [...(eventos ?? [])];
    if (dia) lista = lista.filter((e) => diaDe(e) === dia);
    // Primero los que tienen mensajes nuevos; después los de eventos donde marqué que voy.
    const abiertos = lista.filter((e) => e.chatAbierto)
      .sort((a, b) => Number(Boolean(noLeidos[b.id])) - Number(Boolean(noLeidos[a.id]))
        || Number(Boolean(b.miAsistencia)) - Number(Boolean(a.miAsistencia)));
    return { abiertos, pronto: lista.filter((e) => !e.chatAbierto) };
  }, [buscar, consulta, eventos, dia, noLeidos]);

  const vacio = abiertos.length === 0 && pronto.length === 0;

  // Mis canales filtrados por el buscador (nombre del canal o del evento).
  const misFiltrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    const lista = (misCanales ?? []).filter((c) => !soloCreados || c.canal?.esMio);
    return q.length >= 2 ? lista.filter((c) => `${c.canal?.nombre ?? ''} ${c.evento.titulo}`.toLowerCase().includes(q)) : lista;
  }, [misCanales, consulta, soloCreados]);
  const topicosFiltrados = useMemo(() => {
    if (!soloCreados) return [];
    const q = consulta.trim().toLowerCase();
    return q.length >= 2 ? misTopicos.filter((x) => `${x.nombre} ${x.canal ?? ''} ${x.evento.titulo}`.toLowerCase().includes(q)) : misTopicos;
  }, [misTopicos, consulta, soloCreados]);
  const abrirTopicoMio = useCallback((x: MiTopico) => {
    router.push({ pathname: '/evento/[id]/chat', params: { id: x.eventoId, sala: x.sala, topico: x.id } });
  }, []);

  const filas = useMemo<Fila[]>(() => {
    const r: Fila[] = [];
    if (vistaActual === 'mis') {
      if (soloCreados && misFiltrados.length) r.push({ tipo: 'seccion', clave: 's-canales-mios', titulo: tr('canales.misCanalesCreados') });
      misFiltrados.forEach((c, i) => r.push({ tipo: 'mio', clave: c.clave, canal: c, ultima: i === misFiltrados.length - 1 }));
      if (topicosFiltrados.length) {
        r.push({ tipo: 'seccion', clave: 's-topicos-mios', titulo: tr('topicos.misTopicos') });
        topicosFiltrados.forEach((x, i) => r.push({ tipo: 'topicoMio', clave: `t-${x.id}`, topico: x, ultima: i === topicosFiltrados.length - 1 }));
      }
      return r;
    }
    if (abiertos.length) {
      r.push({ tipo: 'seccion', clave: 's-abiertos', titulo: tr('canales.abiertos') });
      abiertos.forEach((e, i) => r.push({ tipo: 'canal', clave: e.id, evento: e, indice: i }));
    }
    if (pronto.length) {
      r.push({ tipo: 'seccion', clave: 's-pronto', titulo: tr('canales.pronto'), ayuda: tr('canales.prontoAyuda') });
      pronto.forEach((e, i) => r.push({ tipo: 'canal', clave: e.id, evento: e, indice: abiertos.length + i }));
    }
    return r;
  }, [abiertos, pronto, tr, vistaActual, misFiltrados, topicosFiltrados, soloCreados]);

  const nuevosEnMis = (misCanales ?? []).some((c) => (noLeidos[c.eventoId]?.salas[c.sala] ?? 0) > 0);

  return (
    <View style={[styles.pantalla, { backgroundColor: t.background }]}>
      <EncabezadoCompacto
        visible={compacto}
        titulo={tr('canales.titulo')}
        busqueda={{ valor: consulta, onCambio: cambiarConsulta, placeholder: tr('canales.buscar') }}
      />
      <Animated.FlatList
        ref={lista}
        data={filas}
        keyExtractor={(f) => f.clave}
        renderItem={({ item: f, index }) => f.tipo === 'topicoMio' ? (
          <FilaTopicoMio x={f.topico} ultima={f.ultima} onAbrir={abrirTopicoMio} />
        ) : f.tipo === 'mio' ? (
          <FilaMiCanal
            c={f.canal}
            nuevos={noLeidos[f.canal.eventoId]?.salas[f.canal.sala] ?? 0}
            ultima={f.ultima}
            onAbrir={abrirMiCanal}
            onOpciones={setOpciones}
          />
        ) : f.tipo === 'seccion' ? (
          <View style={{ gap: 2, paddingHorizontal: 20, marginTop: index === 0 ? 20 : 28, marginBottom: 4 }}>
            <Texto v="seccion">{f.titulo}</Texto>
            {f.ayuda ? <Texto v="pie" secundario>{f.ayuda}</Texto> : null}
          </View>
        ) : (
          <TarjetaCanal evento={f.evento} indice={f.indice} ultima={filas[index + 1]?.tipo !== 'canal'} />
        )}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        onScrollBeginDrag={() => { desplazada.current = true; }}
        // Solo cuando la persona baja: con pocas filas dibujadas la lista "llega al final" sin que nadie la mueva.
        onEndReached={vistaActual === 'explorar' ? () => { if (eventos?.length && (desplazada.current || abiertos.length < 12)) pedirPronto(); } : undefined}
        onEndReachedThreshold={1.5}
        ListFooterComponent={vistaActual === 'explorar' && eventos?.length && !conPronto ? (
          <View style={styles.cargandoMas}><ActivityIndicator color={t.textSecondary} /></View>
        ) : undefined}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        contentContainerStyle={{ paddingBottom: insets.bottom + BottomTabInset + 24 }}
        // El margen de arriba va dentro del encabezado: así la posición del buscador se mide desde el
        // borde de la lista y la barra compacta aparece y se esconde en el punto justo (como en el inicio).
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 12 }}>
            <View style={styles.cabeza}>
              <Texto v="tituloGrande">{tr('canales.titulo')}</Texto>
              {puedeCrear ? (
                <Pressable
                  onPress={() => setEligiendoEvento(true)}
                  accessibilityRole="button"
                  accessibilityLabel={tr('canales.crear')}
                  style={({ pressed }) => [styles.botonRedondo, { backgroundColor: t.backgroundElement }, pressed && { opacity: 0.7 }]}>
                  <Icono nombre="pencil" tamano={18} color={t.accentText} peso="semibold" />
                </Pressable>
              ) : null}
            </View>
            <View style={{ paddingHorizontal: 20 }}><AvisoSinConexion desde={horaDeLista(ciudad.id, 'canales')} style={{ marginTop: 12 }} /></View>
            <View style={{ paddingHorizontal: 20, marginTop: 14 }} onLayout={medirBuscador}>
              <BarraBusqueda valor={consulta} onCambio={cambiarConsulta} placeholder={tr(vistaActual === 'mis' ? 'canales.buscarMios' : 'canales.buscar')} />
            </View>
            {/* Pestañas como las carpetas de Telegram: reemplazan al selector y a los chips de antes. */}
            <View style={[styles.pestanas, { borderBottomColor: t.separator }]}>
              {([
                { id: 'todos', texto: tr('canales.todos'), cuenta: misCanales?.length ?? 0, marca: false },
                { id: 'creados', texto: tr('canales.creadosPorMi'), cuenta: 0, marca: false },
                { id: 'explorar', texto: tr('canales.explorar'), cuenta: 0, marca: false },
              ] as const).map((p) => {
                const activa = p.id === 'explorar' ? vistaActual === 'explorar' : vistaActual === 'mis' && soloCreados === (p.id === 'creados');
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      if (p.id === 'explorar') setVista('explorar');
                      else { setVista('mis'); setSoloCreados(p.id === 'creados'); }
                      setDia(null);
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: activa }}
                    style={[styles.pestana, activa && { borderBottomColor: t.accent }]}>
                    <Texto v="detalle" style={{ fontWeight: '700', color: activa ? t.text : t.textSecondary }}>{p.texto}</Texto>
                    {p.id === 'todos' && nuevosEnMis && !activa ? <View style={[styles.marcaPestana, { backgroundColor: t.accent }]} /> : null}
                  </Pressable>
                );
              })}
            </View>
            {vistaActual === 'explorar' ? (
              <View style={{ marginTop: 14 }}>
                <Texto v="pie" secundario style={{ paddingHorizontal: 20, marginBottom: 10 }}>{tr('canales.explicacion')}</Texto>
                <TiraFechas valor={dia} onCambio={cambiarDia} diasConEventos={diasConEventos} dias={10} />
              </View>
            ) : <View style={{ height: 6 }} />}
          </View>
        }
        ListEmptyComponent={sinSenal && !consulta.trim() && (vistaActual === 'mis' ? !misCanales?.length : !eventos?.length) ? (
          <View style={styles.vacio}><VacioSinConexion /></View>
        ) : vistaActual === 'mis' ? (misCanales === null ? <EsqueletoCanales filas={4} /> : (
          <View style={styles.vacio}>
            <IconoVacio nombre={consulta.trim() ? 'magnifyingglass' : 'bubble.left.and.bubble.right'} />
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>
              {consulta.trim() ? tr('agenda.sinResultados', { q: consulta.trim() }) : tr('canales.misVacio')}
            </Texto>
            {!consulta.trim() && <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('canales.misVacioAyuda')}</Texto>}
            {!consulta.trim() && <BotonTexto texto={tr('canales.explorar')} onPress={() => setVista('explorar')} />}
          </View>
        )) : eventos === null ? <EsqueletoCanales /> : vacio ? (
          <View style={styles.vacio}>
            <IconoVacio nombre={buscando ? 'magnifyingglass' : 'bubble.left.and.bubble.right'} />
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>
              {buscando ? tr('agenda.sinResultados', { q: consulta.trim() }) : tr('canales.vacio', { ciudad: ciudad.nombre })}
            </Texto>
            {!buscando && <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('canales.vacioAyuda')}</Texto>}
            {dia ? <BotonTexto texto={tr('agenda.verTodasFechas')} onPress={() => setDia(null)} /> : null}
          </View>
        ) : undefined}
      />
      <BotonArriba visible={arriba} onPress={subir} />
      {aviso ? (
        <Animated.View entering={FadeInDown.duration(200)} style={[styles.aviso, { backgroundColor: t.text, bottom: insets.bottom + BottomTabInset + 16 }]}>
          <Texto v="pie" style={{ color: t.background, fontWeight: '600', textAlign: 'center' }}>{aviso}</Texto>
        </Animated.View>
      ) : null}
      <HojaAcciones
        visible={Boolean(opciones)}
        titulo={opciones ? opciones.canal?.nombre ?? opciones.evento.titulo : undefined}
        mensaje={opciones ? mensajeOpciones(opciones) : undefined}
        opciones={opciones ? opcionesDe(opciones) : []}
        onCerrar={() => setOpciones(null)}
      />
      <HojaElegirEvento
        visible={eligiendoEvento}
        eventos={conChatAbierto}
        ciudad={ciudad.nombre}
        onElegir={crearEn}
        onCerrar={() => setEligiendoEvento(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filtrosMis: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 10, marginBottom: 6 },
  chipFiltro: { height: 30, paddingHorizontal: 14, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  filaTopico: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20 },
  cuerpoTopico: { flex: 1, paddingVertical: 12, paddingRight: 20, gap: 2 },
  pantalla: { flex: 1, alignItems: 'center' },
  scroll: { width: '100%' },
  blanco: { color: '#FFFFFF' },
  tarjeta: { height: 190, borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-end' },
  tarjetaPronto: { height: 150 },
  estado: {
    position: 'absolute', top: 12, left: 12, height: 28, paddingHorizontal: 11, borderRadius: 14, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', gap: 7,
  },
  puntoCaja: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  punto: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  pie: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, padding: 16 },
  datos: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aqui: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)' },
  aquiMio: { backgroundColor: '#FFFFFF' },
  // Mensajes nuevos: globo blanco con el número, como en WhatsApp.
  nuevos: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  filaCanal: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20 },
  aroCanal: { width: 62, height: 62, borderRadius: 31, borderWidth: 2.5, padding: 2.5 },
  fotoCanal: { flex: 1, borderRadius: 26, overflow: 'hidden' },
  cuerpoCanal: { flex: 1, gap: 3, paddingVertical: 12, paddingRight: 20, minHeight: 84, justifyContent: 'center' },
  lineaCanal: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nuevosTexto: { color: '#000000', fontWeight: '700' },
  flecha: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 2 },
  botonRedondo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pestanas: { flexDirection: 'row', gap: 22, paddingHorizontal: 20, marginTop: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  pestana: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 2.5, borderBottomColor: 'transparent', marginBottom: -StyleSheet.hairlineWidth },
  marcaPestana: { width: 7, height: 7, borderRadius: 4 },
  botonCrear: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, paddingHorizontal: 12, borderRadius: 15 },
  pieMios: { textAlign: 'center', marginTop: 16, paddingHorizontal: 32 },
  aviso: { position: 'absolute', left: 24, right: 24, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14 },
  cargandoMas: { paddingVertical: 28, alignItems: 'center' },
  vacio: { marginTop: 48, alignItems: 'center', gap: 10, paddingHorizontal: 32 },
});
