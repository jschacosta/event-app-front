import { idiomaActual } from '@/lib/i18n';

// Debe coincidir con INTERESES del backend (users/model.js). Nombres en los 5 idiomas de la app.
type Fila = { id: string; es: string; en: string; pt: string; fr: string; de: string };
const DATOS: Fila[] = [
  { id: 'samba', es: 'Samba', en: 'Samba', pt: 'Samba', fr: 'Samba', de: 'Samba' },
  { id: 'funk', es: 'Funk', en: 'Funk', pt: 'Funk', fr: 'Funk', de: 'Funk' },
  { id: 'electronica', es: 'Electrónica', en: 'Electronic', pt: 'Eletrônica', fr: 'Électro', de: 'Elektro' },
  { id: 'pagode', es: 'Pagode', en: 'Pagode', pt: 'Pagode', fr: 'Pagode', de: 'Pagode' },
  { id: 'forro', es: 'Forró', en: 'Forró', pt: 'Forró', fr: 'Forró', de: 'Forró' },
  { id: 'hiphop', es: 'Hip hop', en: 'Hip-hop', pt: 'Hip-hop', fr: 'Hip-hop', de: 'Hip-Hop' },
  { id: 'lgbt', es: 'LGBT+', en: 'LGBTQ+', pt: 'LGBTQIA+', fr: 'LGBTQ+', de: 'LGBTQ+' },
  { id: 'playa', es: 'Playa', en: 'Beach', pt: 'Praia', fr: 'Plage', de: 'Strand' },
  { id: 'trekking', es: 'Trekking', en: 'Hiking', pt: 'Trilhas', fr: 'Randonnée', de: 'Wandern' },
  { id: 'futbol', es: 'Fútbol', en: 'Football', pt: 'Futebol', fr: 'Football', de: 'Fußball' },
  { id: 'gastronomia', es: 'Gastronomía', en: 'Food', pt: 'Gastronomia', fr: 'Gastronomie', de: 'Kulinarik' },
  { id: 'fotografia', es: 'Fotografía', en: 'Photography', pt: 'Fotografia', fr: 'Photo', de: 'Fotografie' },
];

const idioma = idiomaActual;

// `nombre` se calcula al leerlo, así que siempre sale en el idioma actual.
export const INTERESES: { id: string; readonly nombre: string }[] = DATOS.map((d) => ({
  id: d.id,
  get nombre() { return d[idioma()]; },
}));

export const nombreInteres = (id: string) => INTERESES.find((i) => i.id === id)?.nombre ?? id;
