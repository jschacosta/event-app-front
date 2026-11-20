// Errores, avisos y confirmaciones con la hoja propia de Bora (lib/dialogo.ts), no la alerta del sistema.
import { abrirDialogo } from '@/lib/dialogo';
import i18n from '@/lib/i18n';
import { esCancelacion } from '@/lib/login';

export function mostrarError(err: unknown) {
  if (esCancelacion(err)) return;
  const mensaje = err instanceof Error && err.message ? err.message : i18n.t('comun.intentaDeNuevo');
  avisar(i18n.t('comun.noSePudo'), mensaje);
}

// Un aviso con un solo botón ("Entendido").
export function avisar(titulo: string, texto?: string) {
  abrirDialogo({ titulo, texto: texto || undefined, botones: [{ texto: i18n.t('comun.entendido'), tipo: 'principal' }] });
}

// Pregunta antes de una acción destructiva (borrar, reportar). Suele pedirse desde otra hoja.
export function confirmar(titulo: string, boton: string, accion: () => void) {
  abrirDialogo({
    titulo,
    botones: [{ texto: boton, tipo: 'destructivo', onPress: accion }, { texto: i18n.t('comun.cancelar') }],
  }, { trasHoja: true });
}
