// Íconos propios de Bora (no Ionicons ni SF Symbols): trazo de 2 px con puntas redondas en una grilla
// de 24, apenas inclinados como la cursiva del logo "bora!". Los nuevos íconos de la app van aquí.
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type NombreIconoBora =
  | 'entrada' | 'canal' | 'grupo' | 'buscar' | 'ajustes' | 'flecha' | 'encuesta' | 'chispa' | 'pin' | 'globo' | 'cerrar';

// Cada ícono: trazos dentro de un cuadro de 24×24.
const TRAZOS: Record<NombreIconoBora, (c: string) => React.ReactNode> = {
  // Entrada (ticket con su línea para cortar): "Voy"
  entrada: (c) => (
    <>
      <Path d="M4 7a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 7v2.3a2.7 2.7 0 0 0 0 5.4V17a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17v-2.3a2.7 2.7 0 0 0 0-5.4z" stroke={c} />
      <Path d="M14.5 6v1.6M14.5 11.2v1.6M14.5 16.4V18" stroke={c} />
      <Path d="M7.5 10.5h3.5M7.5 13.5h2" stroke={c} />
    </>
  ),
  // Globo de conversación con el "!" de la marca
  canal: (c) => (
    <>
      <Path d="M6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10.5L6 20.5V17h.5A2.5 2.5 0 0 1 4 14.5v-8A2.5 2.5 0 0 1 6.5 4z" stroke={c} />
      <Path d="M12 7.5v4" stroke={c} />
      <Circle cx="12" cy="14" r="0.6" fill={c} stroke={c} />
    </>
  ),
  // Tres personas: la previa en grupo
  grupo: (c) => (
    <>
      <Circle cx="12" cy="8" r="3" stroke={c} />
      <Path d="M6.5 19.5a5.5 5.5 0 0 1 11 0" stroke={c} />
      <Path d="M5.2 6.3a2.4 2.4 0 0 0 .3 4.6M2.5 17.5a4.3 4.3 0 0 1 2.4-3.6M18.8 6.3a2.4 2.4 0 0 1-.3 4.6M21.5 17.5a4.3 4.3 0 0 0-2.4-3.6" stroke={c} />
    </>
  ),
  buscar: (c) => (
    <>
      <Circle cx="10.5" cy="10.5" r="6" stroke={c} />
      <Path d="m15 15 5 5" stroke={c} />
    </>
  ),
  // Dos reguladores: ajustes
  ajustes: (c) => (
    <>
      <Path d="M4 8h9M17 8h3M4 16h3M11 16h9" stroke={c} />
      <Circle cx="15" cy="8" r="2" stroke={c} />
      <Circle cx="9" cy="16" r="2" stroke={c} />
    </>
  ),
  flecha: (c) => <Path d="m9.5 5.5 6.5 6.5-6.5 6.5" stroke={c} />,
  // Barras: encuesta
  encuesta: (c) => (
    <>
      <Rect x="4" y="5" width="13" height="3.2" rx="1.6" stroke={c} />
      <Rect x="4" y="10.4" width="16" height="3.2" rx="1.6" stroke={c} />
      <Rect x="4" y="15.8" width="8" height="3.2" rx="1.6" stroke={c} />
    </>
  ),
  // Destello: ideas para empezar la conversación
  chispa: (c) => (
    <>
      <Path d="M11 3.5c.6 4 2.3 5.8 6.5 6.5-4.2.7-5.9 2.5-6.5 6.5-.6-4-2.3-5.8-6.5-6.5 4.2-.7 5.9-2.5 6.5-6.5z" stroke={c} />
      <Path d="M18.5 15.5v4M16.5 17.5h4" stroke={c} />
    </>
  ),
  // Punto en el mapa: ciudad o lugar
  pin: (c) => (
    <>
      <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" stroke={c} />
      <Circle cx="12" cy="10" r="2.2" stroke={c} />
    </>
  ),
  // Globo terráqueo: idioma
  globo: (c) => (
    <>
      <Circle cx="12" cy="12" r="8.5" stroke={c} />
      <Path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z" stroke={c} />
    </>
  ),
  cerrar: (c) => <Path d="m6.5 6.5 11 11m0-11-11 11" stroke={c} />,
};

export function IconoBora({ nombre, tamano = 22, color, grosor = 2 }: {
  nombre: NombreIconoBora; tamano?: number; color: string; grosor?: number;
}) {
  return (
    <Svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none">
      {/* Inclinación leve, como la letra del logo */}
      <G strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" transform="translate(1.6 0) skewX(-7)">
        {TRAZOS[nombre](color)}
      </G>
    </Svg>
  );
}
