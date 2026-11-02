// Ajustar la foto de perfil: se mueve con el dedo (o el mouse), se acerca con dos dedos
// o con la barra de zoom, y se recorta en círculo. Funciona igual en iPhone, Android y web.
import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Modal, PanResponder, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icono, Texto } from '@/components/ui';
import { mostrarError } from '@/lib/avisos';

export type ImagenElegida = { uri: string; width: number; height: number };

const ZOOM_MAX = 4;
const LADO_FINAL = 1080;

export function AjustarFoto({ imagen, onListo, onCancelar }: {
  imagen: ImagenElegida | null;
  onListo: (uri: string) => void;
  onCancelar: () => void;
}) {
  return (
    <Modal visible={Boolean(imagen)} animationType="fade" presentationStyle="fullScreen" onRequestClose={onCancelar}>
      {imagen ? <Editor key={imagen.uri} imagen={imagen} onListo={onListo} onCancelar={onCancelar} /> : null}
    </Modal>
  );
}

function Editor({ imagen, onListo, onCancelar }: { imagen: ImagenElegida; onListo: (uri: string) => void; onCancelar: () => void }) {
  const { t } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { width: anchoPantalla } = useWindowDimensions();
  const S = Math.min(anchoPantalla - 48, 340); // lado del cuadro de recorte
  const base = S / Math.min(imagen.width, imagen.height); // escala con la que la foto cubre el cuadro

  const [vista, setVistaEstado] = useState({ zoom: 1, x: 0, y: 0 });
  const ref = useRef(vista);
  const inicio = useRef({ zoom: 1, x: 0, y: 0, distancia: 0 });
  const setVista = (v: typeof vista | ((v: typeof vista) => typeof vista)) => {
    const nueva = typeof v === 'function' ? v(ref.current) : v;
    ref.current = nueva;
    setVistaEstado(nueva);
  };
  const [guardando, setGuardando] = useState(false);

  // Mantiene la foto cubriendo siempre todo el círculo.
  const limitar = (zoom: number, x: number, y: number) => {
    const z = Math.min(ZOOM_MAX, Math.max(1, zoom));
    const mx = (imagen.width * base * z - S) / 2;
    const my = (imagen.height * base * z - S) / 2;
    return { zoom: z, x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)) };
  };

  const gesto = useMemo(() => {
    const distancia = (toques: readonly { pageX: number; pageY: number }[]) =>
      Math.hypot(toques[0].pageX - toques[1].pageX, toques[0].pageY - toques[1].pageY);
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { inicio.current = { ...ref.current, distancia: 0 }; },
      onPanResponderMove: (e, g) => {
        const toques = e.nativeEvent.touches;
        const i = inicio.current;
        if (toques && toques.length >= 2) {
          if (!i.distancia) { inicio.current = { ...ref.current, distancia: distancia(toques) }; return; }
          setVista(limitar(i.zoom * (distancia(toques) / i.distancia), i.x, i.y));
        } else {
          setVista(limitar(i.zoom, i.x + g.dx, i.y + g.dy));
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S, base]);

  // Barra de zoom
  const [anchoBarra, setAnchoBarra] = useState(1);
  const zoomDesde = (x: number) => 1 + (Math.min(anchoBarra, Math.max(0, x)) / anchoBarra) * (ZOOM_MAX - 1);
  const gestoBarra = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setVista((v) => limitar(zoomDesde(e.nativeEvent.locationX), v.x, v.y)),
    onPanResponderMove: (e) => setVista((v) => limitar(zoomDesde(e.nativeEvent.locationX), v.x, v.y)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [anchoBarra, S, base]);

  const escala = base * vista.zoom;
  const anchoFoto = imagen.width * escala;
  const altoFoto = imagen.height * escala;
  const avance = (vista.zoom - 1) / (ZOOM_MAX - 1);

  const usar = async () => {
    setGuardando(true);
    try {
      // Todo en píxeles enteros y dentro de la foto: si el recorte se pasa aunque sea 1 píxel
      // (pasa con fotos largas, como pantallazos, al llevarlas al borde), Android rechaza la foto.
      const W = Math.floor(imagen.width);
      const H = Math.floor(imagen.height);
      const lado = Math.max(1, Math.min(Math.round(S / escala), W, H));
      const originX = Math.min(W - lado, Math.max(0, Math.round(((anchoFoto - S) / 2 - vista.x) / escala)));
      const originY = Math.min(H - lado, Math.max(0, Math.round(((altoFoto - S) / 2 - vista.y) / escala)));
      const recorte = { originX, originY, width: lado, height: lado };
      const contexto = ImageManipulator.manipulate(imagen.uri).crop(recorte);
      if (recorte.width > LADO_FINAL) contexto.resize({ width: LADO_FINAL });
      const imagenFinal = await contexto.renderAsync();
      const resultado = await imagenFinal.saveAsync({ format: SaveFormat.JPEG, compress: 0.88 });
      onListo(resultado.uri);
    } catch (e) {
      mostrarError(e);
      setGuardando(false);
    }
  };

  const r = S / 2;
  return (
    <View style={[styles.pantalla, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.barraSuperior}>
        <Pressable onPress={onCancelar} hitSlop={10} disabled={guardando}>
          <Texto style={styles.blanco}>{t('ajustar.cancelar')}</Texto>
        </Pressable>
        <Texto v="cuerpoFuerte" style={styles.blanco}>{t('ajustar.titulo')}</Texto>
        <View style={{ width: 70 }} />
      </View>

      <View style={styles.centro}>
        <View style={{ width: S, height: S, overflow: 'hidden', borderRadius: 4 }} {...gesto.panHandlers}>
          <Image
            source={{ uri: imagen.uri }}
            contentFit="fill"
            style={{ position: 'absolute', width: anchoFoto, height: altoFoto, left: (S - anchoFoto) / 2 + vista.x, top: (S - altoFoto) / 2 + vista.y }}
          />
          {/* Velo oscuro con un agujero redondo (un círculo con borde muy grueso): lo de adentro es la foto de perfil */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', left: -S, top: -S, width: S * 3, height: S * 3,
              borderRadius: S * 1.5, borderWidth: S, borderColor: 'rgba(0,0,0,0.7)', zIndex: 2,
            }}
          />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: S, height: S, borderRadius: r, borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)', zIndex: 3 }} />
        </View>
        <Texto v="pie" style={[styles.blanco, { opacity: 0.6, marginTop: 18 }]}>{t('ajustar.ayuda')}</Texto>
      </View>

      <View style={{ gap: 22, paddingHorizontal: 24, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
        <View style={styles.zoom}>
          <Icono nombre="magnifyingglass" tamano={14} color="rgba(255,255,255,0.6)" />
          <View style={styles.pista} onLayout={(e) => setAnchoBarra(e.nativeEvent.layout.width)} {...gestoBarra.panHandlers}>
            <View style={styles.riel} pointerEvents="none" />
            <View style={[styles.rielLleno, { width: `${avance * 100}%` }]} pointerEvents="none" />
            <View style={[styles.perilla, { left: avance * anchoBarra - 13 }]} pointerEvents="none" />
          </View>
          <Icono nombre="magnifyingglass" tamano={20} color="rgba(255,255,255,0.9)" />
        </View>
        <Pressable onPress={usar} disabled={guardando} style={({ pressed }) => [styles.boton, pressed && { opacity: 0.85 }]}>
          {guardando ? <ActivityIndicator color="#000" /> : <Texto v="cuerpoFuerte" style={{ color: '#000000' }}>{t('ajustar.usar')}</Texto>}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#000000' },
  blanco: { color: '#FFFFFF' },
  barraSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 44 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoom: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  pista: { flex: 1, height: 36, justifyContent: 'center' },
  riel: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.22)' },
  rielLleno: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' },
  perilla: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  boton: { height: 52, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
