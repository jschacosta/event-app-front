// Stickers animados y emojis grandes, como en Telegram.
// Salen de Noto Animated Emoji de Google (gratis, licencia CC BY 4.0): https://googlefonts.github.io/noto-emoji-animation/
// Cada sticker es un emoji con animación Lottie; el mensaje guarda su código y, como texto, el emoji.
import { almacen } from '@/lib/almacen';
import { CODIGOS_ANIMADOS } from '@/lib/noto-animados';

// `id` sirve también para el título traducido del paquete (expresion.paquetes.<id>).
export type PaqueteStickers = { id: string; icono: string; emojis: string[] };

// Solo emojis que tienen animación (revisado contra la lista de Noto).
export const PAQUETES: PaqueteStickers[] = [
  { id: 'fiesta', icono: '🥳', emojis: ['🥳', '🎉', '🎊', '🍻', '🥂', '🍾', '🍹', '🍷', '🪩', '💃', '🎶', '🔥', '✨', '⚡', '💥', '🤩', '😎', '🤪', '😜', '🤤', '🥴', '😵‍💫', '😴', '🥵', '🍕', '🌮', '🌭', '🍔', '🍿', '🎈', '🎆', '🎸', '🥁', '🎷', '🎺', '🤘'] },
  { id: 'reacciones', icono: '😂', emojis: ['😂', '🤣', '😭', '🥹', '😍', '🥰', '😘', '😱', '😮', '😳', '🤯', '🙄', '😬', '🤔', '🫣', '🤭', '🤫', '🤗', '😅', '😇', '🙃', '😉', '😏', '😤', '😡', '🤬', '🤡', '💀', '👻', '🙈', '👍', '👏', '🙌', '🙏', '🤝', '👋', '🤙', '🫡', '💯', '👀', '❤️', '❤️‍🔥', '💔', '💖', '🫶', '🫂'] },
  { id: 'amor', icono: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '🩵', '💙', '💜', '🖤', '🤍', '🩷', '💘', '💝', '💖', '💗', '💓', '💞', '💕', '💌', '❤️‍🔥', '❤️‍🩹', '😍', '🥰', '😘', '😚', '💋', '🫶', '🫂', '🌹', '💐', '🥀', '😻', '💔'] },
  { id: 'caras', icono: '🫠', emojis: ['😀', '😃', '😄', '😁', '😆', '🥲', '😊', '😌', '🙂‍↕️', '🙂‍↔️', '😋', '😛', '😝', '🫠', '🥺', '😑', '😐', '😶‍🌫️', '🫥', '🤐', '🧐', '🤨', '😒', '😮‍💨', '😞', '😓', '😟', '😥', '😢', '🥱', '😪', '🤧', '🤒', '🤕', '😷', '🤥', '🤠', '🤑', '🤓', '🥸', '💩', '😈', '👽', '🤖', '🙀', '😹', '😸'] },
  { id: 'comida', icono: '🍕', emojis: ['🍕', '🍔', '🌭', '🌮', '🌯', '🥗', '🍜', '🍝', '🍿', '🍩', '🍪', '🍦', '🍨', '🥧', '🍓', '🍉', '🍍', '🥭', '🍋', '🥑', '🧀', '🥓', '🍗', '🍳', '☕', '🧋', '🧉', '🍵', '🍻', '🥂', '🍾', '🍷', '🍹', '🫗'] },
  { id: 'animales', icono: '🦄', emojis: ['🐒', '🦁', '🐺', '🐻', '🐼', '🦊', '🐮', '🦄', '🐸', '🐢', '🐍', '🐊', '🦖', '🐉', '🐇', '🐕', '🦥', '🦘', '🦔', '🦦', '🐦', '🐓', '🐣', '🐥', '🦉', '🦩', '🦚', '🐧', '🦭', '🦈', '🐬', '🐳', '🐙', '🦀', '🦋', '🐝', '🐞', '🐾'] },
  { id: 'rio', icono: '🌊', emojis: ['🌞', '🌅', '🌊', '🌈', '🌸', '🌵', '🍍', '🥭', '🍉', '🍓', '🧉', '☕', '🍦', '⚽', '🏆', '🚕', '🚌', '🚲', '⛵', '✈️', '🛫', '📸', '🎢', '🐒', '🦩', '🐬', '🐢', '🦋', '🗿', '🏕️', '🌇', '🎡', '🛟'] },
];

const hex = (texto: string, conVariante: boolean) =>
  Array.from(texto)
    .filter((c) => conVariante || c !== '️')
    .map((c) => c.codePointAt(0)!.toString(16))
    .join('_');

// Código de Noto del emoji si tiene animación (con o sin el selector de variante U+FE0F), o null.
export function codigoAnimado(emoji: string): string | null {
  const con = hex(emoji, true);
  if (CODIGOS_ANIMADOS.has(con)) return con;
  const sin = hex(emoji, false);
  return CODIGOS_ANIMADOS.has(sin) ? sin : null;
}

export const urlLottie = (codigo: string) => `https://fonts.gstatic.com/s/e/notoemoji/latest/${codigo}/lottie.json`;

// Mensajes de solo emojis (hasta 3) se ven grandes y sin burbuja, como en Telegram.
const SOLO_EMOJIS = /^(?:\p{Regional_Indicator}{2}|[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:️|\p{Emoji_Modifier})?(?:‍[\p{Extended_Pictographic}\p{Emoji_Presentation}](?:️|\p{Emoji_Modifier})?)*)$/u;
export function emojisSolos(texto: string): string[] | null {
  const limpio = texto.trim();
  if (!limpio || limpio.length > 40) return null;
  const segmentos = segmentar(limpio).filter((s) => s.trim());
  if (!segmentos.length || segmentos.length > 3) return null;
  return segmentos.every((s) => SOLO_EMOJIS.test(s)) ? segmentos : null;
}

// Divide en grafemas (un emoji compuesto cuenta como uno). Intl.Segmenter no existe en todos los motores.
function segmentar(texto: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: new (l?: string, o?: { granularity: string }) => { segment: (t: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Seg) return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(texto), (s) => s.segment);
  // Respaldo: une ZWJ, variantes, tonos de piel y pares de banderas.
  const salida: string[] = [];
  for (const c of Array.from(texto)) {
    const previo = salida[salida.length - 1];
    const cp = c.codePointAt(0)!;
    const pega = previo && (cp === 0xfe0f || cp === 0x200d || (cp >= 0x1f3fb && cp <= 0x1f3ff) || previo.endsWith('‍')
      || (cp >= 0x1f1e6 && cp <= 0x1f1ff && Array.from(previo).length === 1 && previo.codePointAt(0)! >= 0x1f1e6 && previo.codePointAt(0)! <= 0x1f1ff));
    if (pega) salida[salida.length - 1] = previo + c;
    else salida.push(c);
  }
  return salida;
}

// ---------- Usados hace poco (emojis y stickers) ----------
const MAX_RECIENTES = 24;
const memoria: Record<string, string[] | undefined> = {};

export async function leerRecientes(tipo: 'emojis' | 'stickers'): Promise<string[]> {
  if (memoria[tipo]) return memoria[tipo]!;
  try {
    const guardado = await almacen.leer(`bora.recientes.${tipo}`);
    memoria[tipo] = guardado ? (JSON.parse(guardado) as string[]).slice(0, MAX_RECIENTES) : [];
  } catch {
    memoria[tipo] = [];
  }
  return memoria[tipo]!;
}

export function sumarReciente(tipo: 'emojis' | 'stickers', valor: string) {
  const lista = [valor, ...(memoria[tipo] ?? []).filter((v) => v !== valor)].slice(0, MAX_RECIENTES);
  memoria[tipo] = lista;
  almacen.guardar(`bora.recientes.${tipo}`, JSON.stringify(lista)).catch(() => {});
  return lista;
}
