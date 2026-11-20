// Foto de un evento al tamaño en que se ve. Los afiches llegan tal cual de las ticketeras
// (en promedio 270 KB y algunos de 1,5 MB, para un cuadrito de 56 px): pasan por wsrv.nl, que los
// achica y los entrega en WebP desde Cloudflare (la miniatura queda en ~6 KB). Solo se envía la URL
// pública del afiche. Si ese servicio falla, se carga la foto original: nunca se queda sin imagen.
import { Image, type ImageProps } from 'expo-image';
import { useState } from 'react';

type Tamano = 'mini' | 'medio' | 'grande';

// Pocos tamaños, así la misma miniatura sirve (desde la caché) en el inicio, Canales y los chats.
const PARAMS: Record<Tamano, string> = {
  mini: 'w=216&h=216&fit=cover&output=webp&q=72',
  medio: 'w=600&we&output=webp&q=75', // tarjetas de ~200 px (intro)
  grande: 'w=1080&we&output=webp&q=78',
};

export function urlFoto(url: string, tamano: Tamano) {
  if (!/^https?:\/\//.test(url)) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&${PARAMS[tamano]}`;
}

export function FotoEvento({ url, tamano = 'mini', ...props }: { url: string; tamano?: Tamano } & Omit<ImageProps, 'source' | 'placeholder'>) {
  const [fallida, setFallida] = useState<string | null>(null);
  const original = fallida === url;
  return (
    <Image
      contentFit="cover"
      cachePolicy="memory-disk"
      {...props}
      source={{ uri: original ? url : urlFoto(url, tamano) }}
      // Los tamaños grandes muestran primero la miniatura que ya está en memoria (la de la lista).
      placeholder={tamano !== 'mini' && !original ? { uri: urlFoto(url, 'mini') } : undefined}
      placeholderContentFit="cover"
      onError={() => setFallida(url)}
    />
  );
}
