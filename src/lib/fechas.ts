import i18n, { localeIntl } from '@/lib/i18n';

// Las fechas se muestran en la hora local de la ciudad elegida (Rio, Bogotá, Santiago…),
// aunque el celular del turista tenga otra zona. El formato sigue el idioma de la app.
let ZONA = 'America/Sao_Paulo';
let MONEDA = 'BRL';

export function fijarZonaYMoneda(zona: string, moneda: string) {
  ZONA = zona;
  MONEDA = moneda;
}

const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function claveDia(iso: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA }).format(new Date(iso)); // 2026-11-01
}

export function tituloDia(iso: string) {
  const hoy = claveDia(new Date().toISOString());
  const manana = claveDia(new Date(Date.now() + 86400000).toISOString());
  const clave = claveDia(iso);
  if (clave === hoy) return i18n.t('fechas.hoy');
  if (clave === manana) return i18n.t('fechas.manana');
  return mayuscula(new Intl.DateTimeFormat(localeIntl(), { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso)));
}

export function hora(iso: string) {
  return new Intl.DateTimeFormat(localeIntl(), { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}

export function diaCorto(iso: string) {
  return new Intl.DateTimeFormat(localeIntl(), { timeZone: ZONA, weekday: 'short', day: 'numeric' }).format(new Date(iso));
}

// "domingo, 1 de noviembre" / "Sunday, November 1" / "domingo, 1 de novembro"
export function fechaLarga(iso: string) {
  return new Intl.DateTimeFormat(localeIntl(), { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso));
}

// "28 oct 2026" / "Oct 28, 2026" / "28 de out. de 2026"
export function fechaCorta(iso: string) {
  return new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(iso))
    .replace(/\.(?= )/, '');
}

// "28 oct" (sin año), para rangos de fechas como la estadía en Rio
export function fechaSinAnio(iso: string) {
  return new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', day: 'numeric', month: 'short' })
    .format(new Date(iso))
    .replace(/\.$/, '');
}

// Días entre hoy (hora de Rio) y la fecha del evento: 0 = hoy, 1 = mañana…
export function diasDesdeHoy(iso: string) {
  const a = new Date(claveDia(new Date().toISOString()) + 'T00:00:00Z').getTime();
  const b = new Date(claveDia(iso) + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

// "R$ 60" en Brasil, "$30.000" en Colombia y Chile: símbolo antes, miles con punto.
const SIMBOLO: Record<string, string> = { BRL: 'R$ ', COP: '$', CLP: '$' };
export function precioTexto(p: number | null) {
  if (p === null) return null;
  if (p === 0) return i18n.t('comun.gratis');
  return `${SIMBOLO[MONEDA] ?? `${MONEDA} `}${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(p)}`;
}

// Los próximos `n` días en la zona de la ciudad: clave "2026-11-03", número, día de la semana corto.
export function proximosDias(n: number) {
  return Array.from({ length: n }, (_, k) => {
    const iso = new Date(Date.now() + k * 86400000).toISOString();
    return {
      clave: claveDia(iso),
      numero: Number(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, day: 'numeric' }).format(new Date(iso))),
      semana: new Intl.DateTimeFormat(localeIntl(), { timeZone: ZONA, weekday: 'short' }).format(new Date(iso)).replace('.', ''),
      mes: new Intl.DateTimeFormat(localeIntl(), { timeZone: ZONA, month: 'short' }).format(new Date(iso)).replace('.', ''),
      iso,
    };
  });
}

// Partes de un día dado por su clave ("2026-11-21"): número, día de la semana y mes cortos.
export function fechaDeClave(clave: string) {
  const d = new Date(`${clave}T12:00:00Z`);
  return {
    numero: d.getUTCDate(),
    semana: new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', weekday: 'short' }).format(d).replace('.', ''),
    mes: new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', month: 'short' }).format(d).replace('.', ''),
  };
}

// "Sábado 21 de noviembre" (u "Hoy"/"Mañana") a partir de la clave del día.
export function tituloDeClave(clave: string) {
  const hoy = claveDia(new Date().toISOString());
  const manana = claveDia(new Date(Date.now() + 86400000).toISOString());
  if (clave === hoy) return i18n.t('fechas.hoy');
  if (clave === manana) return i18n.t('fechas.manana');
  return mayuscula(new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${clave}T12:00:00Z`)));
}

// ---------- Chat: horas y días en la zona del celular de cada persona ----------
// (a diferencia de los eventos, que van en la hora de la ciudad)

// "21:45" (o "9:45 p. m." según el idioma)
export function horaDispositivo(iso: string) {
  return new Intl.DateTimeFormat(localeIntl(), { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
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
  if (dias < 7) return mayuscula(new Intl.DateTimeFormat(localeIntl(), { weekday: 'long' }).format(d));
  return mayuscula(new Intl.DateTimeFormat(localeIntl(), {
    day: 'numeric', month: 'long', ...(d.getFullYear() !== hoy.getFullYear() ? { year: 'numeric' } : {}),
  }).format(d));
}
