/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Paleta de Bora (pautas de Apple). Interfaz monocroma: blanco, negro y grises.
// El color lo ponen las fotos, las ciudades y los tipos de música. El verde solo marca lo que está "en vivo".
export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#6E6E73',
    background: '#FFFFFF',
    grouped: '#F2F2F7', // fondo detrás de listas agrupadas
    card: '#FFFFFF', // filas y tarjetas sobre "grouped"
    backgroundElement: '#F2F2F7', // chips, campos
    backgroundSelected: '#E5E5EA',
    segmentTrack: 'rgba(118,118,128,0.12)',
    segmentThumb: '#FFFFFF',
    separator: 'rgba(60,60,67,0.29)',
    chevron: '#C4C4C7',
    accent: '#000000', // fondo de botones principales
    accentText: '#000000', // enlaces y texto de acento
    onAccent: '#FFFFFF',
    accentSoft: '#F2F2F7',
    accentSoftText: '#000000',
    switchOn: '#000000',
    live: '#30D158',
    danger: '#FF3B30', // solo acciones destructivas (reportar, cerrar canal), como en iOS
    bubbleIn: '#E9E9EB',
    bar: 'rgba(249,249,249,0.86)', // barras translúcidas
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#98989F',
    background: '#000000',
    grouped: '#000000',
    card: '#1C1C1E',
    backgroundElement: '#1C1C1E',
    backgroundSelected: '#2C2C2E',
    segmentTrack: 'rgba(118,118,128,0.24)',
    segmentThumb: '#636366',
    separator: 'rgba(84,84,88,0.65)',
    chevron: '#5A5A5F',
    accent: '#FFFFFF',
    accentText: '#FFFFFF',
    onAccent: '#000000',
    accentSoft: '#1C1C1E',
    accentSoftText: '#FFFFFF',
    switchOn: '#8E8E93',
    live: '#30D158',
    danger: '#FF453A',
    bubbleIn: '#26252A',
    bar: 'rgba(22,22,24,0.86)',
  },
} as const;

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

export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 64 }) ?? 0;
export const MaxContentWidth = 800;
