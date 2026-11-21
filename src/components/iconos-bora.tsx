// Íconos propios de Bora (no Ionicons ni SF Symbols): trazo de 2 px con puntas redondas en una grilla
// de 24, apenas inclinados como la cursiva del logo "bora!". Los nuevos íconos de la app van aquí.
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

export type NombreIconoBora =
  | 'entrada' | 'canal' | 'grupo' | 'buscar' | 'ajustes' | 'flecha' | 'encuesta' | 'chispa' | 'pin' | 'globo' | 'cerrar' | 'copa' | 'musica' | 'sinSenal' | 'descargar' | 'campana' | 'ruta' | 'mapa' | 'cerca' | 'calendario' | 'lista';

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
  // Copa de cóctel con su rodaja: la previa
  copa: (c) => (
    <>
      <Path d="M4.5 4.5h15L12 13z" stroke={c} />
      <Path d="M12 13v6.5M8.5 19.5h7M15.5 4.5l2.2-2.5" stroke={c} />
      <Circle cx="16.5" cy="8" r="1.4" stroke={c} />
    </>
  ),
  // Nota musical doble: la fiesta o el evento
  musica: (c) => (
    <>
      <Path d="M9 18V6l10-2v12" stroke={c} />
      <Circle cx="6.5" cy="18" r="2.5" stroke={c} />
      <Circle cx="16.5" cy="16" r="2.5" stroke={c} />
    </>
  ),
  // Señal cortada: las ondas del wifi con una raya encima
  sinSenal: (c) => (
    <>
      <Path d="M2.8 9.2a13.5 13.5 0 0 1 6.4-3.4M14.6 5.8a13.5 13.5 0 0 1 6.6 3.4" stroke={c} />
      <Path d="M6.2 12.6a8.6 8.6 0 0 1 3.4-2M15.6 11a8.6 8.6 0 0 1 2.2 1.6" stroke={c} />
      <Path d="M9.6 16a3.6 3.6 0 0 1 4.8 0" stroke={c} />
      <Circle cx="12" cy="19.4" r="1.1" fill={c} />
      <Path d="M4.5 3.5l15 17" stroke={c} />
    </>
  ),
  // Flecha que baja a la bandeja: actualizar la app
  descargar: (c) => (
    <>
      <Path d="M12 4v10.5M7.5 10.5 12 15l4.5-4.5" stroke={c} />
      <Path d="M4.5 15.5v2.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5" stroke={c} />
    </>
  ),
  // Campana con el badajo y una onda: el recordatorio antes del evento
  campana: (c) => (
    <>
      <Path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5H5z" stroke={c} />
      <Path d="M10.2 20.5a2 2 0 0 0 3.6 0" stroke={c} />
      <Path d="M19.8 6.2a7 7 0 0 1 1.2 3.3" stroke={c} />
    </>
  ),
  // Recorrido punteado que termina en el lugar: cómo llegar
  ruta: (c) => (
    <>
      <Circle cx="5.5" cy="18.5" r="1.8" stroke={c} />
      <Path d="M7.6 18.5h5.2a2.8 2.8 0 0 0 0-5.6h-2.6a2.8 2.8 0 0 1 0-5.6h1.3" stroke={c} strokeDasharray="0.1 3" />
      <Path d="M17.5 12.5s-3.5-3-3.5-5.9a3.5 3.5 0 0 1 7 0c0 2.9-3.5 5.9-3.5 5.9z" stroke={c} />
      <Circle cx="17.5" cy="6.6" r="1" fill={c} />
    </>
  ),
  // Plano doblado en tres paños con un punto marcado: ver en el mapa
  mapa: (c) => (
    <>
      <Path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" stroke={c} />
      <Path d="M9 4.5v13M15 6.5v6" stroke={c} />
      <Path d="M18 21s-2.6-2.2-2.6-4.3a2.6 2.6 0 0 1 5.2 0c0 2.1-2.6 4.3-2.6 4.3z" stroke={c} fill={c} />
    </>
  ),
  // Mira con el punto al centro: dónde estoy
  cerca: (c) => (
    <>
      <Circle cx="12" cy="12" r="6.5" stroke={c} />
      <Circle cx="12" cy="12" r="2" fill={c} stroke={c} />
      <Path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" stroke={c} />
    </>
  ),
  // Hoja de calendario con sus anillos y un "+": agregar al calendario
  calendario: (c) => (
    <>
      <Path d="M5.5 5.5h13a1.5 1.5 0 0 1 1.5 1.5v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5z" stroke={c} />
      <Path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" stroke={c} />
      <Path d="M12 12.8v4.4M9.8 15h4.4" stroke={c} />
    </>
  ),
  // Renglones con su viñeta: volver a la lista
  lista: (c) => (
    <>
      <Path d="M9.5 7h10M9.5 12h10M9.5 17h10" stroke={c} />
      <Circle cx="5" cy="7" r="0.9" fill={c} stroke={c} />
      <Circle cx="5" cy="12" r="0.9" fill={c} stroke={c} />
      <Circle cx="5" cy="17" r="0.9" fill={c} stroke={c} />
    </>
  ),
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
