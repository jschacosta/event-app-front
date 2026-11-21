import { Platform } from 'react-native';

// Qué partes de Bora están encendidas en cada plataforma.
// La web parte sin chat: sin gente todavía, un canal vacío no aporta. La app lo mantiene.
export const CHAT_ACTIVO = Platform.OS !== 'web';
