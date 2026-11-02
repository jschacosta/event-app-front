import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

// Escala tipográfica de iOS (SF Pro en iPhone).
const styles = StyleSheet.create({
  title: { fontSize: 34, lineHeight: 41, fontWeight: 700, letterSpacing: -0.4 },
  subtitle: { fontSize: 22, lineHeight: 28, fontWeight: 700, letterSpacing: -0.2 },
  default: { fontSize: 17, lineHeight: 22, fontWeight: 400 },
  small: { fontSize: 15, lineHeight: 20, fontWeight: 400 },
  smallBold: { fontSize: 13, lineHeight: 18, fontWeight: 600 },
  link: { fontSize: 17, lineHeight: 22 },
  linkPrimary: { fontSize: 17, lineHeight: 22, color: '#000000' },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
