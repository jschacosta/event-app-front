// Sticker o emoji grande animado (Lottie de Noto Animated Emoji). Mientras carga, o si el emoji
// no tiene animación, se ve el emoji del sistema del mismo tamaño: nunca queda un hueco.
// Las animaciones se descargan una vez y quedan en memoria para toda la sesión.
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { codigoAnimado, urlLottie } from '@/lib/stickers';

const cache = new Map<string, Promise<AnimationObject | null>>();
const listas = new Map<string, AnimationObject>();

export function cargarAnimacion(codigo: string) {
  let p = cache.get(codigo);
  if (!p) {
    p = fetch(urlLottie(codigo))
      .then((r) => (r.ok ? (r.json() as Promise<AnimationObject>) : null))
      .then((a) => {
        if (a) listas.set(codigo, a);
        else cache.delete(codigo);
        return a;
      })
      .catch(() => {
        cache.delete(codigo); // se reintenta la próxima vez
        return null;
      });
    cache.set(codigo, p);
  }
  return p;
}

export const StickerAnimado = memo(function StickerAnimado({ emoji, codigo, tamano, repetir = false, tocarParaRepetir = true }: {
  emoji: string; codigo?: string | null; tamano: number;
  repetir?: boolean; // en bucle (vista previa); en el chat se reproduce una vez y se repite al tocar
  tocarParaRepetir?: boolean;
}) {
  const cod = codigo ?? codigoAnimado(emoji);
  const [animacion, setAnimacion] = useState<AnimationObject | null>(() => (cod ? listas.get(cod) ?? null : null));
  const ref = useRef<LottieView>(null);

  useEffect(() => {
    if (!cod || animacion) return;
    let vivo = true;
    cargarAnimacion(cod).then((a) => { if (vivo && a) setAnimacion(a); });
    return () => { vivo = false; };
  }, [cod, animacion]);

  const estatico = (
    <View style={[styles.caja, { width: tamano, height: tamano }]}>
      <Text style={{ fontSize: tamano * 0.78, lineHeight: tamano * 0.98, textAlign: 'center' }} allowFontScaling={false}>{emoji}</Text>
    </View>
  );
  if (!animacion) return estatico;
  const vista = (
    <LottieView
      ref={ref}
      source={animacion}
      autoPlay
      loop={repetir}
      cacheComposition
      resizeMode="contain"
      style={{ width: tamano, height: tamano }}
    />
  );
  if (!tocarParaRepetir || repetir) return vista;
  return (
    <Pressable onPress={() => { ref.current?.reset(); ref.current?.play(); }} accessibilityLabel={emoji}>
      {vista}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  caja: { alignItems: 'center', justifyContent: 'center' },
});
