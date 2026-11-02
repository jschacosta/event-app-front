import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import i18n from '@/lib/i18n';

export type IconoGenero = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Debe coincidir con GENEROS del backend (events/model.js).
type Genero = { id: string; icono: IconoGenero; es: string; en: string; pt: string; colores: string[] };
const DATOS: Genero[] = [
  // Salidas sin un género musical claro: clubes, fiestas temáticas, open bar…
  { id: 'fiesta', icono: 'glass-cocktail', es: 'Fiestas', en: 'Parties', pt: 'Festas', colores: ['#FF2D95', '#5B0F8C'] },
  { id: 'samba', icono: 'party-popper', es: 'Samba', en: 'Samba', pt: 'Samba', colores: ['#FFB340', '#E8452C'] },
  { id: 'funk', icono: 'speaker', es: 'Funk', en: 'Funk', pt: 'Funk', colores: ['#FF375F', '#8A1C47'] },
  { id: 'latino', icono: 'human-female-dance', es: 'Latino', en: 'Latin', pt: 'Latino', colores: ['#FF7A45', '#B0124B'] },
  { id: 'electronica', icono: 'headphones', es: 'Electrónica', en: 'Electronic', pt: 'Eletrônica', colores: ['#6E6BFF', '#1F1B66'] },
  { id: 'pagode', icono: 'guitar-acoustic', es: 'Pagode', en: 'Pagode', pt: 'Pagode', colores: ['#FF9F0A', '#9A4A12'] },
  { id: 'forro', icono: 'music', es: 'Forró', en: 'Forró', pt: 'Forró', colores: ['#40C8E0', '#0D5466'] },
  { id: 'rock', icono: 'guitar-electric', es: 'Rock', en: 'Rock', pt: 'Rock', colores: ['#636366', '#1C1C1E'] },
  { id: 'hiphop', icono: 'microphone-variant', es: 'Hip hop', en: 'Hip-hop', pt: 'Hip-hop', colores: ['#BF5AF2', '#4A1670'] },
  { id: 'mpb', icono: 'saxophone', es: 'MPB y jazz', en: 'MPB & jazz', pt: 'MPB e jazz', colores: ['#C69C6D', '#5A3E22'] },
  { id: 'lgbt', icono: 'heart', es: 'LGBT+', en: 'LGBTQ+', pt: 'LGBTQIA+', colores: ['#FF453A', '#FF9F0A', '#32D74B', '#0A84FF', '#BF5AF2'] },
  { id: 'shows', icono: 'stadium-variant', es: 'Conciertos', en: 'Concerts', pt: 'Shows', colores: ['#0A84FF', '#0B2A66'] },
  { id: 'teatro', icono: 'drama-masks', es: 'Teatro y humor', en: 'Theater & comedy', pt: 'Teatro e humor', colores: ['#E0A800', '#7A4B00'] },
  { id: 'otro', icono: 'star-four-points', es: 'Otros', en: 'Other', pt: 'Outros', colores: ['#8E8E93', '#3A3A3C'] },
];

const idioma = (): 'es' | 'en' | 'pt' => (i18n.language === 'en' || i18n.language === 'pt' ? i18n.language : 'es');

export const GENEROS = DATOS.map((d) => d.id);
export const iconoGenero = (id: string): IconoGenero => DATOS.find((d) => d.id === id)?.icono ?? 'music-note';
export const nombreGenero = (id: string) => {
  const d = DATOS.find((x) => x.id === id);
  return d ? d[idioma()] : id;
};
// Todos los nombres en los 3 idiomas: así "electronic", "eletrônica" o "electrónica" encuentran lo mismo.
export const nombresGenero = (id: string) => {
  const d = DATOS.find((x) => x.id === id);
  return d ? [d.es, d.en, d.pt].join(' ') : id;
};

export const coloresGenero = (id: string) => DATOS.find((d) => d.id === id)?.colores ?? ['#8E8E93', '#3A3A3C'];
