/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Paleta de Bora: "Açaí".
// Morado açaí para las acciones (un solo botón principal por pantalla), amarillo maracujá solo para
// lo que está pasando ahora (en vivo) y tinta morada muy oscura en vez de negro.
// De noche el fondo es morado casi negro, no negro puro.
export const Colors = {
  light: {
    text: '#1A1023',
    textSecondary: '#6B6175',
    background: '#FFFFFF',
    grouped: '#F5F2F7', // fondo detrás de listas agrupadas
    card: '#FFFFFF', // filas y tarjetas sobre "grouped"
    backgroundElement: '#F3EFF6', // chips, campos
    backgroundSelected: '#E8E1EE',
    segmentTrack: 'rgba(26,16,35,0.06)',
    segmentThumb: '#FFFFFF',
    separator: 'rgba(26,16,35,0.09)',
    chevron: '#B3A9BB',
    accent: '#64209A', // fondo de botones principales
    accentText: '#64209A', // enlaces y texto de acento
    onAccent: '#FFFFFF',
    accentSoft: '#EFE4FA',
    accentSoftText: '#4A1572',
    switchOn: '#64209A',
    live: '#E39E00',
    danger: '#D92D20',
    sun: '#FFC83D', // en vivo
    onSun: '#3A2600',
    outline: '#E6DFEC', // borde de chips sin elegir
    bubbleIn: '#FFFFFF',
    bubbleOut: '#64209A',
    onBubbleOut: '#FFFFFF',
    bubbleOutMeta: 'rgba(255,255,255,0.7)',
    chatWallpaper: '#F6F4F8',
    chatPattern: 'transparent',
    field: '#FFFFFF',
    bar: 'rgba(255,255,255,0.94)', // barras translúcidas
  },
  dark: {
    text: '#F3EDF7',
    textSecondary: '#A699B0',
    background: '#120A17',
    grouped: '#120A17',
    card: '#1D1324',
    backgroundElement: '#241830',
    backgroundSelected: '#2E2039',
    segmentTrack: 'rgba(243,237,247,0.08)',
    segmentThumb: '#3A2A47',
    separator: 'rgba(243,237,247,0.09)',
    chevron: '#5E5068',
    accent: '#B98CFF',
    accentText: '#C3A0FF',
    onAccent: '#1A0B2B',
    accentSoft: '#2E1C40',
    accentSoftText: '#D9C2FF',
    switchOn: '#9B6BE8',
    live: '#FFC83D',
    danger: '#FF6B61',
    sun: '#FFC83D',
    onSun: '#2E1F00',
    outline: '#33263E',
    bubbleIn: '#241830',
    bubbleOut: '#7B3FD0',
    onBubbleOut: '#FFFFFF',
    bubbleOutMeta: 'rgba(255,255,255,0.7)',
    chatWallpaper: '#120A17',
    chatPattern: 'transparent',
    field: '#1D1324',
    bar: 'rgba(18,10,23,0.94)',
  },
} as const;

// Tipografía: Barlow Condensed (angosta y gruesa, como los afiches pegados en las calles de Rio)
// en títulos, horas y días: deja espacio para más información en cada fila. El resto usa la letra del sistema.
export const FuenteTitulo = {
  // La del logo "bora!" y la web: negra y en cursiva. Para títulos y números grandes.
  cursiva: 'BarlowCondensed_900Black_Italic',
  negrita: 'BarlowCondensed_700Bold',
  extra: 'BarlowCondensed_800ExtraBold',
  media: 'BarlowCondensed_600SemiBold',
} as const;

// Radios: esquinas casi rectas, como un afiche o una entrada; nada de pastillas gigantes.
export const Radio = { chico: 4, medio: 6, grande: 10 } as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = 52; // alto de la barra de palabras (sin contar el área segura de abajo)
export const MaxContentWidth = 800;
