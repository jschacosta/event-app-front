import i18n from '@/lib/i18n';

// Debe coincidir con INTERESES del backend (users/model.js). Nombres en los 3 idiomas de la app.
type Fila = { id: string; es: string; en: string; pt: string };
const DATOS: Fila[] = [
  { id: 'samba', es: 'Samba', en: 'Samba', pt: 'Samba' },
  { id: 'funk', es: 'Funk', en: 'Funk', pt: 'Funk' },
  { id: 'electronica', es: 'Electrónica', en: 'Electronic', pt: 'Eletrônica' },
  { id: 'pagode', es: 'Pagode', en: 'Pagode', pt: 'Pagode' },
  { id: 'forro', es: 'Forró', en: 'Forró', pt: 'Forró' },
  { id: 'hiphop', es: 'Hip hop', en: 'Hip-hop', pt: 'Hip-hop' },
  { id: 'lgbt', es: 'LGBT+', en: 'LGBTQ+', pt: 'LGBTQIA+' },
  { id: 'playa', es: 'Playa', en: 'Beach', pt: 'Praia' },
  { id: 'trekking', es: 'Trekking', en: 'Hiking', pt: 'Trilhas' },
  { id: 'futbol', es: 'Fútbol', en: 'Football', pt: 'Futebol' },
  { id: 'gastronomia', es: 'Gastronomía', en: 'Food', pt: 'Gastronomia' },
  { id: 'fotografia', es: 'Fotografía', en: 'Photography', pt: 'Fotografia' },
];

const idioma = (): 'es' | 'en' | 'pt' => (i18n.language === 'en' || i18n.language === 'pt' ? i18n.language : 'es');

// `nombre` se calcula al leerlo, así que siempre sale en el idioma actual.
export const INTERESES: { id: string; readonly nombre: string }[] = DATOS.map((d) => ({
  id: d.id,
  get nombre() { return d[idioma()]; },
}));

export const nombreInteres = (id: string) => INTERESES.find((i) => i.id === id)?.nombre ?? id;
