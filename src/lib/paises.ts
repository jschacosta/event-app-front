import i18n from '@/lib/i18n';

// Países frecuentes entre turistas en Rio: código ISO de 2 letras + nombre en los 3 idiomas de la app.
type Nombres = { es: string; en: string; pt: string };
const DATOS: (Nombres & { codigo: string })[] = [
  { codigo: 'AR', es: 'Argentina', en: 'Argentina', pt: 'Argentina' },
  { codigo: 'AU', es: 'Australia', en: 'Australia', pt: 'Austrália' },
  { codigo: 'AT', es: 'Austria', en: 'Austria', pt: 'Áustria' },
  { codigo: 'BE', es: 'Bélgica', en: 'Belgium', pt: 'Bélgica' },
  { codigo: 'BO', es: 'Bolivia', en: 'Bolivia', pt: 'Bolívia' },
  { codigo: 'BR', es: 'Brasil', en: 'Brazil', pt: 'Brasil' },
  { codigo: 'CA', es: 'Canadá', en: 'Canada', pt: 'Canadá' },
  { codigo: 'CL', es: 'Chile', en: 'Chile', pt: 'Chile' },
  { codigo: 'CN', es: 'China', en: 'China', pt: 'China' },
  { codigo: 'CO', es: 'Colombia', en: 'Colombia', pt: 'Colômbia' },
  { codigo: 'KR', es: 'Corea del Sur', en: 'South Korea', pt: 'Coreia do Sul' },
  { codigo: 'CR', es: 'Costa Rica', en: 'Costa Rica', pt: 'Costa Rica' },
  { codigo: 'CU', es: 'Cuba', en: 'Cuba', pt: 'Cuba' },
  { codigo: 'DK', es: 'Dinamarca', en: 'Denmark', pt: 'Dinamarca' },
  { codigo: 'EC', es: 'Ecuador', en: 'Ecuador', pt: 'Equador' },
  { codigo: 'EG', es: 'Egipto', en: 'Egypt', pt: 'Egito' },
  { codigo: 'AE', es: 'Emiratos Árabes Unidos', en: 'United Arab Emirates', pt: 'Emirados Árabes Unidos' },
  { codigo: 'ES', es: 'España', en: 'Spain', pt: 'Espanha' },
  { codigo: 'US', es: 'Estados Unidos', en: 'United States', pt: 'Estados Unidos' },
  { codigo: 'FI', es: 'Finlandia', en: 'Finland', pt: 'Finlândia' },
  { codigo: 'FR', es: 'Francia', en: 'France', pt: 'França' },
  { codigo: 'DE', es: 'Alemania', en: 'Germany', pt: 'Alemanha' },
  { codigo: 'GR', es: 'Grecia', en: 'Greece', pt: 'Grécia' },
  { codigo: 'GT', es: 'Guatemala', en: 'Guatemala', pt: 'Guatemala' },
  { codigo: 'HN', es: 'Honduras', en: 'Honduras', pt: 'Honduras' },
  { codigo: 'IN', es: 'India', en: 'India', pt: 'Índia' },
  { codigo: 'IE', es: 'Irlanda', en: 'Ireland', pt: 'Irlanda' },
  { codigo: 'IL', es: 'Israel', en: 'Israel', pt: 'Israel' },
  { codigo: 'IT', es: 'Italia', en: 'Italy', pt: 'Itália' },
  { codigo: 'JP', es: 'Japón', en: 'Japan', pt: 'Japão' },
  { codigo: 'MX', es: 'México', en: 'Mexico', pt: 'México' },
  { codigo: 'NO', es: 'Noruega', en: 'Norway', pt: 'Noruega' },
  { codigo: 'NZ', es: 'Nueva Zelanda', en: 'New Zealand', pt: 'Nova Zelândia' },
  { codigo: 'NL', es: 'Países Bajos', en: 'Netherlands', pt: 'Países Baixos' },
  { codigo: 'PA', es: 'Panamá', en: 'Panama', pt: 'Panamá' },
  { codigo: 'PY', es: 'Paraguay', en: 'Paraguay', pt: 'Paraguai' },
  { codigo: 'PE', es: 'Perú', en: 'Peru', pt: 'Peru' },
  { codigo: 'PL', es: 'Polonia', en: 'Poland', pt: 'Polônia' },
  { codigo: 'PT', es: 'Portugal', en: 'Portugal', pt: 'Portugal' },
  { codigo: 'PR', es: 'Puerto Rico', en: 'Puerto Rico', pt: 'Porto Rico' },
  { codigo: 'GB', es: 'Reino Unido', en: 'United Kingdom', pt: 'Reino Unido' },
  { codigo: 'CZ', es: 'República Checa', en: 'Czechia', pt: 'Tchéquia' },
  { codigo: 'DO', es: 'República Dominicana', en: 'Dominican Republic', pt: 'República Dominicana' },
  { codigo: 'RU', es: 'Rusia', en: 'Russia', pt: 'Rússia' },
  { codigo: 'SV', es: 'El Salvador', en: 'El Salvador', pt: 'El Salvador' },
  { codigo: 'ZA', es: 'Sudáfrica', en: 'South Africa', pt: 'África do Sul' },
  { codigo: 'SE', es: 'Suecia', en: 'Sweden', pt: 'Suécia' },
  { codigo: 'CH', es: 'Suiza', en: 'Switzerland', pt: 'Suíça' },
  { codigo: 'TR', es: 'Turquía', en: 'Turkey', pt: 'Turquia' },
  { codigo: 'UA', es: 'Ucrania', en: 'Ukraine', pt: 'Ucrânia' },
  { codigo: 'UY', es: 'Uruguay', en: 'Uruguay', pt: 'Uruguai' },
  { codigo: 'VE', es: 'Venezuela', en: 'Venezuela', pt: 'Venezuela' },
];

const idioma = (): keyof Nombres => (i18n.language === 'en' || i18n.language === 'pt' ? i18n.language : 'es');

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
  { codigo: 'es', es: 'Español', en: 'Spanish', pt: 'Espanhol' },
  { codigo: 'en', es: 'Inglés', en: 'English', pt: 'Inglês' },
  { codigo: 'pt', es: 'Portugués', en: 'Portuguese', pt: 'Português' },
  { codigo: 'fr', es: 'Francés', en: 'French', pt: 'Francês' },
  { codigo: 'de', es: 'Alemán', en: 'German', pt: 'Alemão' },
  { codigo: 'it', es: 'Italiano', en: 'Italian', pt: 'Italiano' },
];
export const IDIOMAS: Pais[] = IDIOMAS_DATOS.map(conNombre);
export const nombreIdioma = (codigo: string) => IDIOMAS.find((i) => i.codigo === codigo)?.nombre ?? codigo;
