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
  avisos?: Partial<Avisos>; // notificaciones que quiere recibir
  ciudad?: string | null; // ciudad elegida en la app (para el resumen semanal)
};

// Notificaciones que se eligen en Ajustes → Notificaciones (las mismas claves que AVISOS en el backend).
export const AVISOS = {
  recordatorio: true, canalAbierto: true, llenandose: true, opinion: true,
  respuestas: true, mensajes: true, canalActivo: true, semanal: false,
} as const;
export type Avisos = Record<keyof typeof AVISOS, boolean>;
export const quiereAviso = (u: { avisos?: Partial<Avisos> } | null | undefined, clave: keyof Avisos) => u?.avisos?.[clave] ?? AVISOS[clave];

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
  avisos: Partial<Avisos>;
  ciudad: string;
}>;

// Autor de un mensaje del chat (lo que ven los demás)
export type Autor = {
  id: string; nombreVisible: string; pais: string | null; edad?: number | null; foto: string | null; admin?: boolean; moderador?: boolean;
  edadVerificada?: boolean; instagram?: string | null;
  eliminada?: boolean; // la persona eliminó su cuenta: se muestra "Cuenta eliminada"
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
  editado?: boolean;
  topico?: string | null; // id del tópico (null = General)
  sticker?: string | null; // código del sticker animado; el texto es su emoji
  pendiente?: boolean; // enviado desde este teléfono y aún sin confirmar (se ve con reloj)
  gif?: Gif | null; // GIF de KLIPY (el texto es "GIF")
  sistema?: AvisoSistema | null; // aviso: "Lena se unió", "Lena creó el tópico…"
};

export type Gif = { url: string; preview: string; ancho: number; alto: number };
// Aviso del sistema dentro del chat. `id` es el tópico o canal al que lleva (si corresponde).
export type AvisoSistema = { tipo: 'unido' | 'topico' | 'canal'; nombre: string | null; icono: string | null; id?: string | null };
// Persona que marcó asistencia a un evento.
export type Asistente = Autor & { solo: boolean; aqui: boolean };

// Tópico de una sala (como los temas de un grupo de Telegram). "general" es el tópico General.
export type Topico = { id: string; nombre: string | null; icono: string | null; color: number; cerrado: boolean; creadorId: string | null };
export type TopicoResumen = Topico & {
  ultimo: { texto: string; sticker: boolean; gif?: boolean; sistema?: AvisoSistema | null; encuesta: boolean; autor: string; mio: boolean; fecha: string } | null;
  noLeidos: number;
  actividad: string | null;
};

// Canal propio dentro de un evento (lo crean el admin y los usuarios habilitados).
export type CanalPropio = {
  id: string;
  eventoId: string;
  nombre: string;
  descripcion: string | null;
  codigo: string;
  privado: boolean;
  soloAvisos?: boolean; // canal de avisos: solo escribe quien lo creó
  miembros: number;
  soyMiembro: boolean;
  esMio: boolean;
  creador: Autor | null;
  cierraEn: string;
};

export const MOTIVOS_REPORTE = ['negocio', 'agresividad', 'acoso', 'edad_falsa', 'spam', 'otro'] as const;
export type MotivoReporte = (typeof MOTIVOS_REPORTE)[number];

export type ResumenAsistencia = { van: number; talvez: number; previa: number; solos: number; aqui?: number; paisesTop: string[]; paises: number };

// "En internet": nota y resumen de Google Maps del lugar (no de la fiesta). Nunca se mezcla con Bora.
export type LugarGoogle = {
  fuente: 'google';
  nombre: string;
  nota: number | null;
  total: number;
  link: string;
  linkResenas: string;
  resumen: { texto: string; idioma: string; reportar: string | null } | null;
};

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
  recurrente?: boolean; // solo en el detalle: la serie tiene 2 fechas o más (contando pasadas)
  fechasSerie?: number;
  lugarGoogle?: LugarGoogle | null; // solo en el detalle: lo que dice Google Maps del lugar
  chatAbreEn: string;
  chatAbierto: boolean;
  aquiAbreEn?: string; // desde cuándo se puede marcar "Ya estoy aquí" (1 hora antes del inicio)
  asistencia?: ResumenAsistencia;
  destaque?: number; // solo en la lista: fiesta fija, nota del lugar en Google, si parece almuerzo o curso…
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
