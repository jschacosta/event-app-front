// Nombres de días y meses en los 5 idiomas de la app, escritos a mano.
// No se piden a Intl: en Android, Hermes usa los idiomas que trae el teléfono, y un celular en
// español mostraba "sábado" y "nov" aunque la app estuviera en francés o alemán.
import type { IdiomaApp } from '@/lib/i18n';

type Nombres = {
  dia: string[]; // domingo primero (como Date.getDay())
  diaCorto: string[]; // sin punto: las columnas angostas lo usan tal cual
  diaInicial: string[];
  mes: string[];
  mesCorto: string[]; // sin punto
};

export const NOMBRES: Record<IdiomaApp, Nombres> = {
  es: {
    dia: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    diaCorto: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    diaInicial: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    mes: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    mesCorto: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'],
  },
  en: {
    dia: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    diaCorto: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    diaInicial: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
    mes: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    mesCorto: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  pt: {
    dia: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
    diaCorto: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
    diaInicial: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'],
    mes: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
    mesCorto: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'],
  },
  fr: {
    dia: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    diaCorto: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
    diaInicial: ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
    mes: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
    mesCorto: ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'],
  },
  de: {
    dia: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    diaCorto: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    diaInicial: ['S', 'M', 'D', 'M', 'D', 'F', 'S'],
    mes: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
    mesCorto: ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'],
  },
};

// Abreviatura con punto donde el idioma lo usa ("sam.", "Sa.", "oct.", "Okt."), sin punto si la
// palabra está completa ("mai", "Mai", "juin").
export function conPunto(idioma: IdiomaApp, corto: string, completo: string) {
  return (idioma === 'fr' || idioma === 'de') && corto !== completo ? `${corto}.` : corto;
}
