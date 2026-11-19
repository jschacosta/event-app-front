// Idiomas de la app: español, inglés, portugués, francés y alemán.
// Se usa el idioma del celular si es uno de esos; si no, inglés. El usuario puede cambiarlo en su perfil.
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { almacen } from '@/lib/almacen';
import authEn from '@/locales/en/auth.json';
import comunEn from '@/locales/en/comun.json';
import authEs from '@/locales/es/auth.json';
import comunEs from '@/locales/es/comun.json';
import authPt from '@/locales/pt/auth.json';
import comunPt from '@/locales/pt/comun.json';
import authFr from '@/locales/fr/auth.json';
import comunFr from '@/locales/fr/comun.json';
import authDe from '@/locales/de/auth.json';
import comunDe from '@/locales/de/comun.json';

export const IDIOMAS_APP = [
  { codigo: 'es', nombre: 'Español' },
  { codigo: 'en', nombre: 'English' },
  { codigo: 'pt', nombre: 'Português' },
  { codigo: 'fr', nombre: 'Français' },
  { codigo: 'de', nombre: 'Deutsch' },
] as const;
export type IdiomaApp = (typeof IDIOMAS_APP)[number]['codigo'];

const CLAVE = 'idioma_app';
const soportado = (c?: string | null): c is IdiomaApp => IDIOMAS_APP.some((l) => l.codigo === c);

function idiomaDelSistema(): IdiomaApp {
  const c = getLocales()[0]?.languageCode;
  return soportado(c) ? c : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    es: { comun: comunEs, auth: authEs },
    en: { comun: comunEn, auth: authEn },
    pt: { comun: comunPt, auth: authPt },
    fr: { comun: comunFr, auth: authFr },
    de: { comun: comunDe, auth: authDe },
  },
  lng: idiomaDelSistema(),
  fallbackLng: 'en',
  defaultNS: 'comun',
  ns: ['comun', 'auth'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Aplica el idioma guardado (si el usuario eligió uno a mano).
almacen.leer(CLAVE).then((c) => {
  if (soportado(c) && c !== i18n.language) i18n.changeLanguage(c);
});

export async function cambiarIdioma(c: IdiomaApp) {
  await i18n.changeLanguage(c);
  await almacen.guardar(CLAVE, c);
}

// Idioma actual de la app (si i18n trae otro código, se usa inglés).
export const idiomaActual = (): IdiomaApp => (soportado(i18n.language) ? i18n.language : 'en');

// Idioma actual como etiqueta para Intl (fechas): es-CL no, "es", "en", "pt-BR", "fr", "de".
export function localeIntl() {
  return i18n.language === 'pt' ? 'pt-BR' : i18n.language;
}

export default i18n;
