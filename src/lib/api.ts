import { API_URL } from '@/config/api';
import i18n from '@/lib/i18n';

// Perfil propio, tal como lo devuelve GET /api/me
export type Usuario = {
  id: string;
  nombreVisible: string;
  nombre: string | null;
  apellido: string | null;
  ocultarApellido: boolean;
  pais: string | null;
  edad: number | null;
  // Si el creador de un canal propio puede ver su edad (por defecto sí)
  mostrarEdad?: boolean;
  fechaNacimiento: string | null;
  llegada: string | null;
  salida: string | null;
  intereses: string[];
  paisesVisitados: string[];
  idiomas: string[];
  foto: string | null;
  fotos: string[];
  email: string | null;
  proveedor: 'google' | 'apple' | 'dev' | 'email';
  idioma?: 'es' | 'en' | 'pt';
  emailVerificado?: boolean;
  perfilCompleto: boolean;
  normasAceptadas?: boolean;
  puedeCrearCanales?: boolean;
  silenciadoHasta?: string | null;
  admin?: boolean;
  moderador?: boolean; // modera las salas públicas (lo que puede hacer se edita en el admin de riodiferente)
  verEdades?: boolean; // puede ver la edad de cualquiera en la lista de personas
  // Edad verificada con documento: se exige para crear canales y entrar a canales privados
  edadVerificada?: boolean;
  instagram?: string | null;
  bloqueados?: string[]; // ids de las personas que bloqueó
};

export type CambiosPerfil = Partial<{
  nombre: string;
  apellido: string;
  ocultarApellido: boolean;
  mostrarEdad: boolean;
  pais: string;
  fechaNacimiento: string;
  llegada: string | null;
  salida: string | null;
  intereses: string[];
  paisesVisitados: string[];
  idiomas: string[];
  fotos: string[];
  idioma: 'es' | 'en' | 'pt';
  instagram: string;
}>;

// Autor de un mensaje del chat (lo que ven los demás)
export type Autor = {
  id: string; nombreVisible: string; pais: string | null; edad?: number | null; foto: string | null; admin?: boolean; moderador?: boolean;
  edadVerificada?: boolean; instagram?: string | null;
};

// "general", "es", "en", "pt" o el id de un canal propio
export type Sala = string;
export const SALAS_IDIOMA = ['general', 'es', 'en', 'pt'] as const;

export type Reaccion = { emoji: string; usuarios: string[] };
export type CitaMensaje = { id: string; autorId: string | null; autorNombre: string; texto: string };
// Encuesta de un canal propio: el texto del mensaje es la pregunta. `votos` son ids de usuarios.
export type Encuesta = { opciones: { texto: string; votos: string[] }[] };

export type MensajeChat = {
  id: string; eventoId: string; sala?: Sala; texto: string; fecha: string; autor: Autor;
  respuestaA?: CitaMensaje | null;
  reacciones?: Reaccion[];
  encuesta?: Encuesta | null;
  fijado?: boolean;
};

// Canal propio dentro de un evento (lo crean el admin y los usuarios habilitados).
export type CanalPropio = {
  id: string;
  eventoId: string;
  nombre: string;
  descripcion: string | null;
  codigo: string;
  privado: boolean;
  miembros: number;
  soyMiembro: boolean;
  esMio: boolean;
  creador: Autor | null;
  cierraEn: string;
};

export const MOTIVOS_REPORTE = ['negocio', 'agresividad', 'acoso', 'edad_falsa', 'spam', 'otro'] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

export type ResumenAsistencia = { van: number; talvez: number; previa: number; solos: number; aqui?: number; paisesTop: string[]; paises: number };

export type Evento = {
  id: string;
  titulo: string;
  ciudad: string;
  descripcion: string | null;
  inicio: string;
  fin: string;
  lugar: string | null;
  barrio: string | null;
  precioDesde: number | null;
  generos: string[];
  imagen: string | null;
  linkEntradas: string | null;
  fuente?: string; // sympla, eventbrite, ra… o manual
  serie?: string | null; // fiestas que se repiten: mismo valor = misma fiesta
  otrasFechas?: { id: string; inicio: string }[]; // solo en el detalle
  chatAbreEn: string;
  chatAbierto: boolean;
  aquiAbreEn?: string; // desde cuándo se puede marcar "Ya estoy aquí" (1 hora antes del inicio)
  asistencia?: ResumenAsistencia;
  miAsistencia?: { estado: 'voy' | 'talvez' | 'previa'; solo: boolean; aqui?: boolean } | null;
};

export class ApiError extends Error {
  constructor(message: string, public status: number, public codigo?: string, public datos?: Record<string, unknown>) {
    super(message);
  }
}

export async function api<T>(ruta: string, opciones: { metodo?: string; body?: unknown; token?: string | null } = {}) {
  const res = await fetch(`${API_URL}/api${ruta}`, {
    method: opciones.metodo ?? 'GET',
    headers: {
      'Accept-Language': i18n.language,
      ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      ...(opciones.token ? { Authorization: `Bearer ${opciones.token}` } : {}),
    },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? i18n.t('comun:errores.conexion', { defaultValue: 'Error de conexión' }), res.status, data.codigo, data);
  return data as T;
}
