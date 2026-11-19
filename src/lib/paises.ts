import { idiomaActual } from '@/lib/i18n';

// Países frecuentes entre turistas en Rio: código ISO de 2 letras + nombre en los 5 idiomas de la app.
type Nombres = { es: string; en: string; pt: string; fr: string; de: string };
const DATOS: (Nombres & { codigo: string })[] = [
  { codigo: 'AR', es: 'Argentina', en: 'Argentina', pt: 'Argentina', fr: 'Argentine', de: 'Argentinien' },
  { codigo: 'AU', es: 'Australia', en: 'Australia', pt: 'Austrália', fr: 'Australie', de: 'Australien' },
  { codigo: 'AT', es: 'Austria', en: 'Austria', pt: 'Áustria', fr: 'Autriche', de: 'Österreich' },
  { codigo: 'BE', es: 'Bélgica', en: 'Belgium', pt: 'Bélgica', fr: 'Belgique', de: 'Belgien' },
  { codigo: 'BO', es: 'Bolivia', en: 'Bolivia', pt: 'Bolívia', fr: 'Bolivie', de: 'Bolivien' },
  { codigo: 'BR', es: 'Brasil', en: 'Brazil', pt: 'Brasil', fr: 'Brésil', de: 'Brasilien' },
  { codigo: 'CA', es: 'Canadá', en: 'Canada', pt: 'Canadá', fr: 'Canada', de: 'Kanada' },
  { codigo: 'CL', es: 'Chile', en: 'Chile', pt: 'Chile', fr: 'Chili', de: 'Chile' },
  { codigo: 'CN', es: 'China', en: 'China', pt: 'China', fr: 'Chine', de: 'China' },
  { codigo: 'CO', es: 'Colombia', en: 'Colombia', pt: 'Colômbia', fr: 'Colombie', de: 'Kolumbien' },
  { codigo: 'KR', es: 'Corea del Sur', en: 'South Korea', pt: 'Coreia do Sul', fr: 'Corée du Sud', de: 'Südkorea' },
  { codigo: 'CR', es: 'Costa Rica', en: 'Costa Rica', pt: 'Costa Rica', fr: 'Costa Rica', de: 'Costa Rica' },
  { codigo: 'CU', es: 'Cuba', en: 'Cuba', pt: 'Cuba', fr: 'Cuba', de: 'Kuba' },
  { codigo: 'DK', es: 'Dinamarca', en: 'Denmark', pt: 'Dinamarca', fr: 'Danemark', de: 'Dänemark' },
  { codigo: 'EC', es: 'Ecuador', en: 'Ecuador', pt: 'Equador', fr: 'Équateur', de: 'Ecuador' },
  { codigo: 'EG', es: 'Egipto', en: 'Egypt', pt: 'Egito', fr: 'Égypte', de: 'Ägypten' },
  { codigo: 'AE', es: 'Emiratos Árabes Unidos', en: 'United Arab Emirates', pt: 'Emirados Árabes Unidos', fr: 'Émirats arabes unis', de: 'Vereinigte Arabische Emirate' },
  { codigo: 'ES', es: 'España', en: 'Spain', pt: 'Espanha', fr: 'Espagne', de: 'Spanien' },
  { codigo: 'US', es: 'Estados Unidos', en: 'United States', pt: 'Estados Unidos', fr: 'États-Unis', de: 'USA' },
  { codigo: 'FI', es: 'Finlandia', en: 'Finland', pt: 'Finlândia', fr: 'Finlande', de: 'Finnland' },
  { codigo: 'FR', es: 'Francia', en: 'France', pt: 'França', fr: 'France', de: 'Frankreich' },
  { codigo: 'DE', es: 'Alemania', en: 'Germany', pt: 'Alemanha', fr: 'Allemagne', de: 'Deutschland' },
  { codigo: 'GR', es: 'Grecia', en: 'Greece', pt: 'Grécia', fr: 'Grèce', de: 'Griechenland' },
  { codigo: 'GT', es: 'Guatemala', en: 'Guatemala', pt: 'Guatemala', fr: 'Guatemala', de: 'Guatemala' },
  { codigo: 'HN', es: 'Honduras', en: 'Honduras', pt: 'Honduras', fr: 'Honduras', de: 'Honduras' },
  { codigo: 'IN', es: 'India', en: 'India', pt: 'Índia', fr: 'Inde', de: 'Indien' },
  { codigo: 'IE', es: 'Irlanda', en: 'Ireland', pt: 'Irlanda', fr: 'Irlande', de: 'Irland' },
  { codigo: 'IL', es: 'Israel', en: 'Israel', pt: 'Israel', fr: 'Israël', de: 'Israel' },
  { codigo: 'IT', es: 'Italia', en: 'Italy', pt: 'Itália', fr: 'Italie', de: 'Italien' },
  { codigo: 'JP', es: 'Japón', en: 'Japan', pt: 'Japão', fr: 'Japon', de: 'Japan' },
  { codigo: 'MX', es: 'México', en: 'Mexico', pt: 'México', fr: 'Mexique', de: 'Mexiko' },
  { codigo: 'NO', es: 'Noruega', en: 'Norway', pt: 'Noruega', fr: 'Norvège', de: 'Norwegen' },
  { codigo: 'NZ', es: 'Nueva Zelanda', en: 'New Zealand', pt: 'Nova Zelândia', fr: 'Nouvelle-Zélande', de: 'Neuseeland' },
  { codigo: 'NL', es: 'Países Bajos', en: 'Netherlands', pt: 'Países Baixos', fr: 'Pays-Bas', de: 'Niederlande' },
  { codigo: 'PA', es: 'Panamá', en: 'Panama', pt: 'Panamá', fr: 'Panama', de: 'Panama' },
  { codigo: 'PY', es: 'Paraguay', en: 'Paraguay', pt: 'Paraguai', fr: 'Paraguay', de: 'Paraguay' },
  { codigo: 'PE', es: 'Perú', en: 'Peru', pt: 'Peru', fr: 'Pérou', de: 'Peru' },
  { codigo: 'PL', es: 'Polonia', en: 'Poland', pt: 'Polônia', fr: 'Pologne', de: 'Polen' },
  { codigo: 'PT', es: 'Portugal', en: 'Portugal', pt: 'Portugal', fr: 'Portugal', de: 'Portugal' },
  { codigo: 'PR', es: 'Puerto Rico', en: 'Puerto Rico', pt: 'Porto Rico', fr: 'Porto Rico', de: 'Puerto Rico' },
  { codigo: 'GB', es: 'Reino Unido', en: 'United Kingdom', pt: 'Reino Unido', fr: 'Royaume-Uni', de: 'Vereinigtes Königreich' },
  { codigo: 'CZ', es: 'República Checa', en: 'Czechia', pt: 'Tchéquia', fr: 'Tchéquie', de: 'Tschechien' },
  { codigo: 'DO', es: 'República Dominicana', en: 'Dominican Republic', pt: 'República Dominicana', fr: 'République dominicaine', de: 'Dominikanische Republik' },
  { codigo: 'RU', es: 'Rusia', en: 'Russia', pt: 'Rússia', fr: 'Russie', de: 'Russland' },
  { codigo: 'SV', es: 'El Salvador', en: 'El Salvador', pt: 'El Salvador', fr: 'Salvador', de: 'El Salvador' },
  { codigo: 'ZA', es: 'Sudáfrica', en: 'South Africa', pt: 'África do Sul', fr: 'Afrique du Sud', de: 'Südafrika' },
  { codigo: 'SE', es: 'Suecia', en: 'Sweden', pt: 'Suécia', fr: 'Suède', de: 'Schweden' },
  { codigo: 'CH', es: 'Suiza', en: 'Switzerland', pt: 'Suíça', fr: 'Suisse', de: 'Schweiz' },
  { codigo: 'TR', es: 'Turquía', en: 'Turkey', pt: 'Turquia', fr: 'Turquie', de: 'Türkei' },
  { codigo: 'UA', es: 'Ucrania', en: 'Ukraine', pt: 'Ucrânia', fr: 'Ukraine', de: 'Ukraine' },
  { codigo: 'UY', es: 'Uruguay', en: 'Uruguay', pt: 'Uruguai', fr: 'Uruguay', de: 'Uruguay' },
  { codigo: 'VE', es: 'Venezuela', en: 'Venezuela', pt: 'Venezuela', fr: 'Venezuela', de: 'Venezuela' },
];

const idioma = idiomaActual;

// `nombre` se calcula al leerlo, así que siempre sale en el idioma actual de la app.
export type Pais = { codigo: string; readonly nombre: string };
function conNombre(d: (typeof DATOS)[number]): Pais {
  return { codigo: d.codigo, get nombre() { return d[idioma()]; } };
}

// Lista ordenada alfabéticamente en el idioma actual.
export function paisesOrdenados(): Pais[] {
  const l = idioma();
  return [...DATOS].sort((a, b) => a[l].localeCompare(b[l], l)).map(conNombre);
}

// Compatibilidad: lista fija (el orden es el del español; el nombre sí cambia con el idioma).
export const PAISES: Pais[] = [...DATOS].sort((a, b) => a.es.localeCompare(b.es, 'es')).map(conNombre);

export function nombrePais(codigo?: string | null) {
  if (!codigo) return '';
  const d = DATOS.find((p) => p.codigo === codigo.toUpperCase());
  return d ? d[idioma()] : codigo.toUpperCase();
}

// "CL" → 🇨🇱 (cada letra se convierte en su "letra regional" de Unicode)
export function bandera(codigo?: string | null) {
  if (!codigo || !/^[A-Za-z]{2}$/.test(codigo)) return '🏳️';
  return String.fromCodePoint(...[...codigo.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

// Idiomas que puede hablar un viajero (para su perfil). El nombre sale en el idioma de la app.
const IDIOMAS_DATOS: (Nombres & { codigo: string })[] = [
  { codigo: 'es', es: 'Español', en: 'Spanish', pt: 'Espanhol', fr: 'Espagnol', de: 'Spanisch' },
  { codigo: 'en', es: 'Inglés', en: 'English', pt: 'Inglês', fr: 'Anglais', de: 'Englisch' },
  { codigo: 'pt', es: 'Portugués', en: 'Portuguese', pt: 'Português', fr: 'Portugais', de: 'Portugiesisch' },
  { codigo: 'fr', es: 'Francés', en: 'French', pt: 'Francês', fr: 'Français', de: 'Französisch' },
  { codigo: 'de', es: 'Alemán', en: 'German', pt: 'Alemão', fr: 'Allemand', de: 'Deutsch' },
  { codigo: 'it', es: 'Italiano', en: 'Italian', pt: 'Italiano', fr: 'Italien', de: 'Italienisch' },
];
export const IDIOMAS: Pais[] = IDIOMAS_DATOS.map(conNombre);
export const nombreIdioma = (codigo: string) => IDIOMAS.find((i) => i.codigo === codigo)?.nombre ?? codigo;
