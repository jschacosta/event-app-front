// Bandera real en vectores (no emoji): rectángulo 3:2 con esquinas redondeadas y un borde muy fino,
// como las banderas de las apps de Apple. Funciona sin internet.
import * as BANDERAS from 'country-flag-icons/string/3x2';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';

const SVG = BANDERAS as unknown as Record<string, string | undefined>;

export function Bandera({ codigo, alto = 14, style }: { codigo?: string | null; alto?: number; style?: StyleProp<ViewStyle> }) {
  const xml = codigo ? SVG[codigo.toUpperCase()] : undefined;
  const ancho = Math.round(alto * 1.5);
  const radio = Math.max(2, alto * 0.16);
  return (
    <View style={[{ width: ancho, height: alto, borderRadius: radio, overflow: 'hidden', backgroundColor: '#D1D1D6' }, style]}>
      {xml ? <SvgXml xml={xml} width={ancho} height={alto} preserveAspectRatio="xMidYMid slice" /> : null}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radio, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.18)' }]} />
    </View>
  );
}

// Fila de banderas (países que van a un evento, países visitados…).
export function Banderas({ codigos, alto = 12, max, gap = 4 }: { codigos: string[]; alto?: number; max?: number; gap?: number }) {
  const lista = max ? codigos.slice(0, max) : codigos;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, alignItems: 'center' }}>
      {lista.map((c) => <Bandera key={c} codigo={c} alto={alto} />)}
    </View>
  );
}
