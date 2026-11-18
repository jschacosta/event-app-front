// Ondas del calçadão de Copacabana (piedras blancas y negras), el sello visual de Bora.
// Se usa como fondo del chat, muy suave, igual que los fondos con dibujo de Telegram.
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

// Una franja ondulada de 14 de alto cada 28: queda mitad piedra clara, mitad oscura, como en la vereda.
const ONDA = 'M0 9 Q24 -1 48 9 T96 9 L96 23 Q72 33 48 23 T0 23 Z';

export function Calcadao({ color, escala = 1, style }: { color: string; escala?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="calcadao" patternUnits="userSpaceOnUse" width={96 * escala} height={28 * escala}>
            <Path d={ONDA} fill={color} scale={escala} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#calcadao)" />
      </Svg>
    </View>
  );
}
