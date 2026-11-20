import i18n, { idiomaActual } from '@/lib/i18n';
import { conPunto, NOMBRES } from '@/lib/nombres-fecha';

// Las fechas se muestran en la hora local de la ciudad elegida (Rio, Bogotá, Santiago…),
// aunque el celular del turista tenga otra zona. El formato sigue el idioma de la app.
let ZONA = 'America/Sao_Paulo';
let MONEDA = 'BRL';

export function fijarZonaYMoneda(zona: string, moneda: string) {
  if (zona !== ZONA) {
    porClave.clear();
    porPartes.clear();
    hoyCache.minuto = -1;
  }
  ZONA = zona;
  MONEDA = moneda;
}

// Crear un Intl.DateTimeFormat es caro (en Android, Hermes pasa por ICU): antes se creaban dos por cada
// fecha calculada, miles al dibujar la agenda. Ahora se crea uno por zona y cada resultado se guarda por fecha:
// la misma fecha (inicio de un evento) se pide muchas veces en cada dibujo.
const formatos = new Map<string, { dia: Intl.DateTimeFormat; hora: Intl.DateTimeFormat }>();
function formatosDe(zona: string) {
  let f = formatos.get(zona);
  if (!f) {
    f = {
      dia: new Intl.DateTimeFormat('en-CA', { timeZone: zona }),
      hora: new Intl.DateTimeFormat('en-GB', { timeZone: zona, hour: '2-digit', minute: '2-digit', hour12: false }),
    };
    formatos.set(zona, f);
  }
  return f;
}
const MAX_GUARDADOS = 5000;
const porClave = new Map<string, string>();
const porPartes = new Map<string, Partes>();
function guardar<T>(m: Map<string, T>, k: string, v: T) {
  if (m.size >= MAX_GUARDADOS) m.clear();
  m.set(k, v);
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Partes numéricas de una fecha ----------
// Intl solo se usa para pasar a la zona de la ciudad y con salida en números ("en-CA", "en-GB"):
// los nombres de días y meses salen de NOMBRES, porque en Android Hermes formatea con los idiomas
// del teléfono y no con el de la app.
type Partes = { anio: number; mes: number; dia: number; semana: number; hh: number; mm: number };

const desdeClave = (clave: string, hh = 12, mm = 0): Partes => {
  const [anio, mes, dia] = clave.split('-').map(Number);
  return { anio, mes: mes - 1, dia, semana: new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay(), hh, mm };
};

function enZona(iso: string, zona = ZONA): Partes {
  const k = zona === ZONA ? iso : `${zona}|${iso}`;
  const ya = porPartes.get(k);
  if (ya) return ya;
  const d = new Date(iso);
  const f = formatosDe(zona);
  const [hh, mm] = f.hora.format(d).match(/\d+/g)!.map(Number);
  const p = desdeClave(f.dia.format(d), hh % 24, mm);
  guardar(porPartes, k, p);
  return p;
}

const enUTC = (iso: string | Date) => {
  const d = new Date(iso);
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth(), dia: d.getUTCDate(), semana: d.getUTCDay(), hh: d.getUTCHours(), mm: d.getUTCMinutes() };
};

const enDispositivo = (iso: string | Date) => {
  const d = new Date(iso);
  return { anio: d.getFullYear(), mes: d.getMonth(), dia: d.getDate(), semana: d.getDay(), hh: d.getHours(), mm: d.getMinutes() };
};

// ---------- Formatos por idioma ----------
const dos = (n: number) => String(n).padStart(2, '0');
const n = () => NOMBRES[idiomaActual()];

// "21:45" (24 h en todos los idiomas para los eventos, como los publica cada fiesta)
const hhmm = (p: Partes) => `${dos(p.hh)}:${dos(p.mm)}`;

// "21 de noviembre" / "November 21" / "21 novembre" / "21. November", con día de la semana y año opcionales
function largo(p: Partes, { semana = false, anio = false } = {}) {
  const l = idiomaActual();
  const { dia: dias, mes: meses } = n();
  const d = dias[p.semana];
  const m = meses[p.mes];
  switch (l) {
    case 'en': return `${semana ? `${d}, ` : ''}${m} ${p.dia}${anio ? `, ${p.anio}` : ''}`;
    case 'fr': return `${semana ? `${d} ` : ''}${p.dia === 1 ? '1er' : p.dia} ${m}${anio ? ` ${p.anio}` : ''}`;
    case 'de': return `${semana ? `${d}, ` : ''}${p.dia}. ${m}${anio ? ` ${p.anio}` : ''}`;
    default: return `${semana ? `${d}, ` : ''}${p.dia} de ${m}${anio ? ` de ${p.anio}` : ''}`; // es, pt
  }
}

// "28 oct" / "Oct 28" / "28 out" / "28 oct." / "28. Okt.", con año opcional
function corto(p: Partes, anio = false) {
  const l = idiomaActual();
  const m = conPunto(l, n().mesCorto[p.mes], n().mes[p.mes]);
  switch (l) {
    case 'en': return `${m} ${p.dia}${anio ? `, ${p.anio}` : ''}`;
    case 'de': return `${p.dia}. ${m}${anio ? ` ${p.anio}` : ''}`;
    case 'fr': return `${p.dia === 1 ? '1er' : p.dia} ${m}${anio ? ` ${p.anio}` : ''}`;
    default: return `${p.dia} ${m}${anio ? ` ${p.anio}` : ''}`;
  }
}

// "martes 17" / "Tuesday 17" / "terça-feira, 17" / "mardi 17" / "Dienstag, 17."
function semanaYDia(p: Partes) {
  const d = n().dia[p.semana];
  switch (idiomaActual()) {
    case 'pt': return `${d}, ${p.dia}`;
    case 'de': return `${d}, ${p.dia}.`;
    default: return `${d} ${p.dia}`;
  }
}

// "noviembre de 2026" / "November 2026" / "novembre 2026"
export function mesYAnio(anio: number, mes: number) {
  const m = n().mes[mes];
  const l = idiomaActual();
  return l === 'es' || l === 'pt' ? `${m} de ${anio}` : `${m} ${anio}`;
}

export const nombreMes = (mes: number) => n().mes[mes];
// Iniciales de la semana, domingo primero: L M X J V S D en español.
export const inicialesSemana = () => n().diaInicial;

export function claveDia(iso: string) {
  let c = porClave.get(iso);
  if (c === undefined) {
    c = formatosDe(ZONA).dia.format(new Date(iso)); // 2026-11-01
    guardar(porClave, iso, c);
  }
  return c;
}

// "Hoy" y "mañana" se piden en cada fila: se calculan una vez por minuto (con la hora exacta, la caché
// por fecha se llenaría de instantes distintos).
let hoyCache = { minuto: -1, hoy: '', manana: '' };
function hoyYManana() {
  const minuto = Math.floor(Date.now() / 60000);
  if (hoyCache.minuto !== minuto) {
    const f = formatosDe(ZONA).dia;
    hoyCache = { minuto, hoy: f.format(new Date()), manana: f.format(new Date(Date.now() + 86400000)) };
  }
  return hoyCache;
}
export const claveHoy = () => hoyYManana().hoy;
export const claveManana = () => hoyYManana().manana;

export function tituloDia(iso: string) {
  const hoy = claveHoy();
  const manana = claveManana();
  const clave = claveDia(iso);
  if (clave === hoy) return i18n.t('fechas.hoy');
  if (clave === manana) return i18n.t('fechas.manana');
  return mayuscula(largo(enZona(iso), { semana: true }));
}

export function hora(iso: string) {
  return hhmm(enZona(iso));
}

// "sáb 21" / "Sat 21" / "sam. 21" / "Sa. 21."
export function diaCorto(iso: string) {
  const p = enZona(iso);
  const l = idiomaActual();
  const d = conPunto(l, n().diaCorto[p.semana], n().dia[p.semana]);
  return l === 'de' ? `${d} ${p.dia}.` : `${d} ${p.dia}`;
}

// "domingo, 1 de noviembre" / "Sunday, November 1" / "dimanche 1er novembre" / "Sonntag, 1. November"
export function fechaLarga(iso: string) {
  return largo(enZona(iso), { semana: true });
}

// "28 oct 2026" / "Oct 28, 2026" / "28 out 2026" / "28 oct. 2026" / "28. Okt. 2026" (fechas sin hora, en UTC)
export function fechaCorta(iso: string) {
  return corto(enUTC(iso), true);
}

// "27 oct" en la hora de la ciudad (fechas de una fiesta que se repite, que cruzan meses)
export function diaMes(iso: string) {
  return corto(enZona(iso));
}

// "28 oct" (sin año), para rangos de fechas como la estadía en Rio
export function fechaSinAnio(iso: string) {
  return corto(enUTC(iso));
}

// "noviembre de 2026", para la firma de las notas ("revisado en …")
export function mesAnioDeClave(clave: string) {
  const p = desdeClave(clave);
  return mesYAnio(p.anio, p.mes);
}

// Días entre hoy (hora de Rio) y la fecha del evento: 0 = hoy, 1 = mañana…
export function diasDesdeHoy(iso: string) {
  const a = new Date(claveHoy() + 'T00:00:00Z').getTime();
  const b = new Date(claveDia(iso) + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

// "R$ 60" en Brasil, "$30.000" en Colombia y Chile: símbolo antes, miles con punto.
const formatoPrecio = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const SIMBOLO: Record<string, string> = { BRL: 'R$ ', COP: '$', CLP: '$' };
export function precioTexto(p: number | null) {
  if (p === null) return null;
  if (p === 0) return i18n.t('comun.gratis');
  return `${SIMBOLO[MONEDA] ?? `${MONEDA} `}${formatoPrecio.format(p)}`;
}

// Los próximos `n` días en la zona de la ciudad: clave "2026-11-03", número, día de la semana corto.
export function proximosDias(cuantos: number) {
  return Array.from({ length: cuantos }, (_, k) => {
    const iso = new Date(Date.now() + k * 86400000).toISOString();
    const p = enZona(iso);
    return { clave: claveDia(iso), numero: p.dia, semana: n().diaCorto[p.semana], mes: n().mesCorto[p.mes], iso };
  });
}

// Partes de un día dado por su clave ("2026-11-21"): número, día de la semana y mes cortos.
export function fechaDeClave(clave: string) {
  const p = desdeClave(clave);
  return { numero: p.dia, semana: n().diaCorto[p.semana], mes: n().mesCorto[p.mes] };
}

// "Sábado 21 de noviembre" (u "Hoy"/"Mañana") a partir de la clave del día.
export function tituloDeClave(clave: string) {
  const hoy = claveHoy();
  const manana = claveManana();
  if (clave === hoy) return i18n.t('fechas.hoy');
  if (clave === manana) return i18n.t('fechas.manana');
  return mayuscula(largo(desdeClave(clave), { semana: true }));
}

// ---------- Chat: horas y días en la zona del celular de cada persona ----------
// (a diferencia de los eventos, que van en la hora de la ciudad)

// "21:45" (o "9:45 PM" en inglés)
export function horaDispositivo(iso: string) {
  const p = enDispositivo(iso);
  if (idiomaActual() !== 'en') return hhmm(p);
  return `${p.hh % 12 || 12}:${dos(p.mm)} ${p.hh < 12 ? 'AM' : 'PM'}`;
}

// "2026-11-01" en la zona del celular
export function claveDiaDispositivo(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Separador de días del chat: "Hoy", "Ayer", "Jueves" (esta semana) o "12 de octubre" (+ año si no es el actual)
export function etiquetaDiaChat(iso: string) {
  const d = new Date(iso);
  const hoy = new Date();
  const dias = Math.round(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000,
  );
  if (dias <= 0) return i18n.t('fechas.hoy');
  if (dias === 1) return i18n.t('fechas.ayer');
  if (dias < 7) return mayuscula(n().dia[d.getDay()]);
  return mayuscula(largo(enDispositivo(d), { anio: d.getFullYear() !== hoy.getFullYear() }));
}

// Días entre hoy (en la ciudad) y la clave dada: 0 = hoy, 1 = mañana.
export function diasHastaClave(clave: string) {
  const hoy = claveHoy();
  return Math.round((Date.parse(`${clave}T12:00:00Z`) - Date.parse(`${hoy}T12:00:00Z`)) / 86400000);
}

// Encabezado de un día en la agenda: "Hoy, martes 17", "Mañana, miércoles 18" o "Jueves 19 de noviembre".
export function encabezadoDia(clave: string) {
  const semana = semanaYDia(desdeClave(clave));
  const hoy = claveHoy();
  const manana = claveManana();
  if (clave === hoy) return `${i18n.t('fechas.hoy')}, ${semana}`;
  if (clave === manana) return `${i18n.t('fechas.manana')}, ${semana}`;
  return tituloDeClave(clave);
}

// "ahora", "hace 5 min", "hace 3 h", "hace 2 d" (en el idioma de la app). Sin Intl.RelativeTimeFormat:
// Hermes en Android no lo trae y la pantalla se caía.
export function haceTiempo(iso: string) {
  const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return i18n.t('fechas.hace.ahora');
  if (seg < 3600) return i18n.t('fechas.hace.min', { n: Math.round(seg / 60) });
  if (seg < 86400) return i18n.t('fechas.hace.h', { n: Math.round(seg / 3600) });
  if (seg < 86400 * 30) return i18n.t('fechas.hace.d', { n: Math.round(seg / 86400) });
  return i18n.t('fechas.hace.mes', { n: Math.round(seg / (86400 * 30)) });
}

// "2026-11-21" + 3 → "2026-11-24" (sin zonas: es aritmética sobre la clave).
export function sumarDias(clave: string, dias: number) {
  return new Date(Date.parse(`${clave}T12:00:00Z`) + dias * 864e5).toISOString().slice(0, 10);
}

// Instante (ms) en que empieza el día `clave` en la zona de la ciudad: para pedir la agenda por partes.
export function inicioDeClave(clave: string) {
  const base = Date.parse(`${clave}T12:00:00Z`);
  const p = enZona(new Date(base).toISOString());
  const desfase = Date.UTC(p.anio, p.mes, p.dia, p.hh, p.mm) - base; // hora de la ciudad − UTC
  return Date.parse(`${clave}T00:00:00Z`) - desfase;
}
