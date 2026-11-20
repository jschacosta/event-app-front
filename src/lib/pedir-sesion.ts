// Aviso cuando algo necesita sesión (marcar que vas, responder cómo estuvo, votar o comentar).
// Hoja propia de Bora con "Iniciar sesión" y "Ahora no", que abre el acceso. Al entrar, se vuelve a la
// pantalla desde donde se pidió (no a la agenda).
import { router, type Href } from 'expo-router';

import { abrirDialogo } from '@/lib/dialogo';

let volverA: Href | null = null;

/** La pantalla a la que se vuelve después de entrar (una sola vez). */
export function tomarVolverTrasEntrar(): Href | null {
  const v = volverA;
  volverA = null;
  return v;
}

type Tr = (k: string) => string;

export function pedirSesion(tr: Tr, motivo: 'voy' | 'opinar' = 'opinar', volver?: Href) {
  const titulo = tr('evento.iniciaSesion');
  const texto = tr(motivo === 'voy' ? 'evento.iniciaSesionTexto' : 'evento.iniciaSesionOpinar');
  const entrar = () => {
    volverA = volver ?? null;
    router.push('/auth');
  };
  abrirDialogo({
    icono: motivo === 'voy' ? 'entrada' : 'canal',
    titulo,
    texto,
    botones: [{ texto: tr('evento.botonEntrar'), tipo: 'principal', onPress: entrar }, { texto: tr('comun.ahoraNo') }],
  });
}
