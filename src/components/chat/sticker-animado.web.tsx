// En la web (solo desarrollo) los stickers se ven como el emoji grande, sin animación:
// lottie-react-native necesita otra librería para el navegador y no vale la pena sumarla.
import { memo } from 'react';
import { Text, View } from 'react-native';

export function cargarAnimacion() {
  return Promise.resolve(null);
}

export const StickerAnimado = memo(function StickerAnimado({ emoji, tamano }: {
  emoji: string; codigo?: string | null; tamano: number; repetir?: boolean; tocarParaRepetir?: boolean;
}) {
  return (
    <View style={{ width: tamano, height: tamano, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: tamano * 0.78, lineHeight: tamano * 0.98, textAlign: 'center' }}>{emoji}</Text>
    </View>
  );
});
