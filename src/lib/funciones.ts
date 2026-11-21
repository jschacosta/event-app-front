import { Platform } from 'react-native';

// Qué partes de Bora están encendidas en cada plataforma.
// La web parte sin chat: sin gente todavía, un canal vacío no aporta. La app lo mantiene.
export const CHAT_ACTIVO = Platform.OS !== 'web';
// Las guías de Bora (pestaña Hilos y "Guías para esta noche" en cada fiesta) parten solo en la web.
export const GUIAS_ACTIVAS = Platform.OS === 'web';
