// Texto de los avisos del sistema del chat (como en Telegram), en el idioma de la app,
// y la vista previa de un último mensaje (sticker, GIF, encuesta o aviso) para las listas.
import type { TFunction } from 'i18next';

import type { AvisoSistema } from '@/lib/api';
import { quitarFormato } from '@/lib/formato';

// `mio`: lo hice yo ("Te uniste", "Creaste el tópico…").
export function textoAviso(a: AvisoSistema, quien: string, tr: TFunction, mio = false) {
  const yo = mio ? 'Yo' : '';
  if (a.tipo === 'unido') return tr(`avisos.unido${yo}`, { nombre: quien });
  if (a.tipo === 'topico') return tr(`avisos.topico${yo}`, { nombre: quien, topico: `${a.icono ? `${a.icono} ` : ''}${a.nombre ?? ''}` });
  return tr(`avisos.canal${yo}`, { nombre: quien, canal: a.nombre ?? '' });
}

type Ultimo = { texto: string; autor: string; mio: boolean; sticker?: boolean; gif?: boolean; encuesta?: boolean; sistema?: AvisoSistema | null };

// "Lena: hola", "Tú: 🥳 Sticker", "Mateo: GIF", "Lena se unió".
export function vistaPrevia(u: Ultimo, tr: TFunction) {
  const quien = u.mio ? tr('chat.tu') : u.autor.split(' ')[0];
  if (u.sistema) return textoAviso(u.sistema, quien, tr, u.mio);
  const cuerpo = u.sticker ? `${u.texto} ${tr('expresion.sticker')}`
    : u.gif ? `🎞️ ${tr('expresion.gif')}`
    : `${u.encuesta ? '📊 ' : ''}${quitarFormato(u.texto)}`;
  return `${quien}: ${cuerpo}`;
}
