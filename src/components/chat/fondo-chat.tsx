// Fondo del chat con dibujitos según la categoría del evento, como los fondos con patrón de Telegram:
// Samba lleva pandeiros, surdos y cavaquinhos; Funk, parlantes y micrófonos; Electrónica, audífonos y
// vinilos… y en todos aparece el Pan de Azúcar. Son trazos propios (24×24, línea de 1,6) repetidos en
// una baldosa de 240×240 con giros y tamaños distintos, para que no se note la repetición.
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, Pattern, Rect } from 'react-native-svg';

type Dibujo = (color: string) => React.ReactNode;
const linea = { fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const DIBUJOS: Record<string, Dibujo> = {
  nota: (c) => (
    <>
      <Path d="M9 17.5V5.5l10-2.2v12" stroke={c} {...linea} />
      <Circle cx={6.5} cy={17.5} r={2.6} stroke={c} {...linea} />
      <Circle cx={16.5} cy={15.3} r={2.6} stroke={c} {...linea} />
    </>
  ),
  pandeiro: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={c} {...linea} />
      <Circle cx={12} cy={12} r={5.5} stroke={c} {...linea} />
      {[0, 72, 144, 216, 288].map((a) => (
        <Rect key={a} x={11} y={2.2} width={2} height={1.8} rx={0.6} stroke={c} {...linea} transform={`rotate(${a} 12 12)`} />
      ))}
    </>
  ),
  surdo: (c) => (
    <>
      <Ellipse cx={12} cy={7} rx={8} ry={2.8} stroke={c} {...linea} />
      <Path d="M4 7v9.5c0 1.6 3.6 2.8 8 2.8s8-1.2 8-2.8V7" stroke={c} {...linea} />
      <Path d="M4.5 9.5l3.5 8M19.5 9.5l-3.5 8M12 10v9" stroke={c} {...linea} />
    </>
  ),
  cavaquinho: (c) => (
    <>
      <Circle cx={8} cy={16} r={4.6} stroke={c} {...linea} />
      <Circle cx={11.4} cy={12.2} r={3.2} stroke={c} {...linea} />
      <Circle cx={8.6} cy={15.4} r={1.2} stroke={c} {...linea} />
      <Path d="M13.4 10.2L20 3.6M18.4 2.4l3 3" stroke={c} {...linea} />
    </>
  ),
  palmera: (c) => (
    <>
      <Path d="M12.5 21c-.4-4.6.2-8.6 1.6-12" stroke={c} {...linea} />
      <Path d="M14 9c-2.6-2.6-6-2.8-8.6-1.2M14 9c.4-3.4 2.8-5.6 6-5.6M14 9c3 .2 5.4 2 6.4 4.6M14 9c-2 .6-3.8 2.4-4.4 5" stroke={c} {...linea} />
      <Path d="M8 21h9" stroke={c} {...linea} />
    </>
  ),
  sol: (c) => (
    <>
      <Circle cx={12} cy={12} r={4.2} stroke={c} {...linea} />
      <Path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" stroke={c} {...linea} />
    </>
  ),
  panDeAzucar: (c) => (
    <>
      <Path d="M2 19c1.6-3.4 3.2-5.2 4.8-5.2 1.4 0 2 1.6 3 1.6 1.4 0 2.2-8.4 5.2-8.4s4.4 6.6 7 12" stroke={c} {...linea} />
      <Path d="M6.8 13.8L15 7" stroke={c} {...linea} strokeDasharray="1.4 1.8" />
      <Path d="M2 21h20" stroke={c} {...linea} />
    </>
  ),
  coctel: (c) => (
    <>
      <Path d="M4.5 4h15L12 12.5z" stroke={c} {...linea} />
      <Path d="M12 12.5V20M8 20h8M15.5 2.5l-2.4 4.2" stroke={c} {...linea} />
      <Circle cx={9.4} cy={6.6} r={1.2} stroke={c} {...linea} />
    </>
  ),
  copa: (c) => (
    <>
      <Path d="M8 3h8l-.6 6.4a3.4 3.4 0 0 1-6.8 0z" stroke={c} {...linea} />
      <Path d="M12 13v7M8.5 20h7M9.2 6.6h5.6" stroke={c} {...linea} />
    </>
  ),
  bolaDisco: (c) => (
    <>
      <Path d="M12 2v3" stroke={c} {...linea} />
      <Circle cx={12} cy={13} r={8} stroke={c} {...linea} />
      <Path d="M4.4 10.6h15.2M4.4 15.4h15.2M12 5c-2.6 2.4-2.6 13.6 0 16M12 5c2.6 2.4 2.6 13.6 0 16" stroke={c} {...linea} />
    </>
  ),
  confeti: (c) => (
    <>
      <Path d="M4 20l4.4-11.6 7.2 7.2z" stroke={c} {...linea} />
      <Path d="M13 4.5c.6 1.4-.4 2.4.6 3.6M18.5 9.5c1 .2 1.6 1.2 2.8.8M16 3l.4 1.2M20 6l1-.6M11 2.5l-.2 1" stroke={c} {...linea} />
    </>
  ),
  luna: (c) => <Path d="M19 14.6A8 8 0 0 1 9.4 5a8 8 0 1 0 9.6 9.6z" stroke={c} {...linea} />,
  chispa: (c) => <Path d="M12 2.5c.8 5 2.5 6.7 7.5 7.5-5 .8-6.7 2.5-7.5 7.5-.8-5-2.5-6.7-7.5-7.5 5-.8 6.7-2.5 7.5-7.5z" stroke={c} {...linea} />,
  corazon: (c) => <Path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" stroke={c} {...linea} />,
  parlante: (c) => (
    <>
      <Rect x={5.5} y={2.5} width={13} height={19} rx={2} stroke={c} {...linea} />
      <Circle cx={12} cy={15} r={3.6} stroke={c} {...linea} />
      <Circle cx={12} cy={7} r={1.8} stroke={c} {...linea} />
    </>
  ),
  microfono: (c) => (
    <>
      <Circle cx={15} cy={7} r={4} stroke={c} {...linea} />
      <Path d="M12.2 9.8L4.5 19.5l1 1 9.7-7.7M12.4 4.6l5 5" stroke={c} {...linea} />
    </>
  ),
  audifonos: (c) => (
    <>
      <Path d="M4 15v-3a8 8 0 0 1 16 0v3" stroke={c} {...linea} />
      <Rect x={3} y={14} width={4.4} height={6.5} rx={1.6} stroke={c} {...linea} />
      <Rect x={16.6} y={14} width={4.4} height={6.5} rx={1.6} stroke={c} {...linea} />
    </>
  ),
  vinilo: (c) => (
    <>
      <Circle cx={12} cy={12} r={8.5} stroke={c} {...linea} />
      <Circle cx={12} cy={12} r={3} stroke={c} {...linea} />
      <Path d="M7.4 9.2a5.6 5.6 0 0 1 2.4-2.4M16.6 14.8a5.6 5.6 0 0 1-2.4 2.4" stroke={c} {...linea} />
    </>
  ),
  onda: (c) => <Path d="M3 12h1.6M7 8v8M10.4 4.5v15M13.8 7v10M17.2 9.5v5M20.5 12h.5" stroke={c} {...linea} />,
  rayo: (c) => <Path d="M13.5 2.5L5.5 13.5h6l-1 8 8-11h-6z" stroke={c} {...linea} />,
  maracas: (c) => (
    <>
      <Ellipse cx={8} cy={8} rx={4} ry={5} stroke={c} {...linea} transform="rotate(-25 8 8)" />
      <Path d="M10.2 12.4l2.6 8" stroke={c} {...linea} />
      <Ellipse cx={16.5} cy={9} rx={3.4} ry={4.4} stroke={c} {...linea} transform="rotate(20 16.5 9)" />
      <Path d="M15 13.2l-1.6 7" stroke={c} {...linea} />
    </>
  ),
  entrada: (c) => (
    <>
      <Path d="M3 7.5V5h18v2.5a2 2 0 0 0 0 4V19H3v-7.5a2 2 0 0 0 0-4z" stroke={c} {...linea} transform="rotate(-12 12 12)" />
      <Path d="M14.5 6v12" stroke={c} {...linea} strokeDasharray="1.4 1.8" transform="rotate(-12 12 12)" />
    </>
  ),
  mascara: (c) => (
    <>
      <Path d="M4 4.5h12v5.5a6 6 0 0 1-12 0z" stroke={c} {...linea} />
      <Path d="M7 8.5h1.6M11.4 8.5H13M7.4 12.2c1.4 1.2 3.8 1.2 5.2 0" stroke={c} {...linea} />
      <Path d="M17.5 9.5H20v5a6 6 0 0 1-8.4 5.5" stroke={c} {...linea} />
    </>
  ),
  acordeon: (c) => (
    <>
      <Rect x={2.5} y={6} width={5} height={12} rx={1.2} stroke={c} {...linea} />
      <Rect x={16.5} y={6} width={5} height={12} rx={1.2} stroke={c} {...linea} />
      <Path d="M7.5 7l2 10 2-10 2 10 2-10 1 5" stroke={c} {...linea} />
    </>
  ),
  saxo: (c) => (
    <>
      <Path d="M14 2.5l3 1.2-1.4 2.6v8.2a5 5 0 0 1-10 .4l-.2-2.4h3.2v2a2 2 0 0 0 4 0V5.2" stroke={c} {...linea} />
      <Circle cx={14.8} cy={9} r={0.6} stroke={c} {...linea} />
      <Circle cx={14.8} cy={12} r={0.6} stroke={c} {...linea} />
    </>
  ),
  guitarra: (c) => (
    <>
      <Path d="M10.6 11.2c-1.6-1.6-4.6-1-5.8.8-.8 1.2-.2 2.2-1.4 3.4-1.6 1.6.4 5 3.2 5.2 2.4.2 2.6-1.8 4-2.6 1.4-.8 3-.8 3.4-2.6.4-1.6-1.8-2.6-3.4-4.2z" stroke={c} {...linea} />
      <Path d="M11.5 12.5L20.5 3.5M7.6 15.4l1.6 1.6" stroke={c} {...linea} />
    </>
  ),
};

const POR_GENERO: Record<string, string[]> = {
  fiesta: ['coctel', 'bolaDisco', 'copa', 'confeti', 'luna', 'nota'],
  samba: ['pandeiro', 'surdo', 'cavaquinho', 'nota', 'palmera', 'sol'],
  funk: ['parlante', 'microfono', 'rayo', 'onda', 'nota', 'luna'],
  latino: ['maracas', 'nota', 'coctel', 'sol', 'corazon', 'palmera'],
  electronica: ['audifonos', 'vinilo', 'onda', 'rayo', 'luna', 'chispa'],
  pagode: ['cavaquinho', 'pandeiro', 'nota', 'copa', 'sol', 'palmera'],
  forro: ['acordeon', 'nota', 'sol', 'corazon', 'maracas', 'cavaquinho'],
  rock: ['guitarra', 'rayo', 'microfono', 'parlante', 'chispa', 'luna'],
  hiphop: ['microfono', 'parlante', 'vinilo', 'onda', 'rayo', 'chispa'],
  mpb: ['saxo', 'nota', 'vinilo', 'luna', 'copa', 'cavaquinho'],
  lgbt: ['corazon', 'chispa', 'bolaDisco', 'confeti', 'nota', 'copa'],
  shows: ['microfono', 'entrada', 'chispa', 'onda', 'nota', 'parlante'],
  teatro: ['mascara', 'entrada', 'chispa', 'luna', 'corazon', 'nota'],
  otro: ['chispa', 'nota', 'entrada', 'sol', 'luna', 'corazon'],
};

// Lugares dentro de la baldosa de 240×240: x, y, tamaño y giro. El Pan de Azúcar va en el 0.
const LUGARES: [number, number, number, number][] = [
  [14, 12, 34, 0], [92, 6, 26, 18], [170, 20, 30, -14], [58, 62, 24, -22], [138, 70, 32, 10], [206, 92, 24, 26],
  [10, 116, 28, 12], [82, 128, 30, -8], [160, 146, 26, -24], [36, 186, 26, 20], [116, 196, 28, -12], [194, 186, 30, 8],
];
const BALDOSA = 240;

export const FondoDibujos = memo(function FondoDibujos({ genero, color }: { genero?: string; color: string }) {
  const set = POR_GENERO[genero ?? ''] ?? POR_GENERO.otro;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="dibujos" patternUnits="userSpaceOnUse" width={BALDOSA} height={BALDOSA}>
            {LUGARES.map(([x, y, tam, giro], i) => {
              const nombre = i === 0 ? 'panDeAzucar' : set[(i - 1) % set.length];
              const s = tam / 24;
              return (
                <G key={i} transform={`translate(${x} ${y}) rotate(${giro} ${tam / 2} ${tam / 2}) scale(${s})`}>
                  {DIBUJOS[nombre](color)}
                </G>
              );
            })}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#dibujos)" />
      </Svg>
    </View>
  );
});
