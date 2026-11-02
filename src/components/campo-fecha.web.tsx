import { createElement } from 'react';

import { localeIntl } from '@/lib/i18n';

import { useTheme } from '@/hooks/use-theme';

export function aIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// En el navegador se usa el selector de fecha nativo del navegador.
export function CampoFecha({ valor, onCambio, minimo, maximo }: {
  valor: string | null; onCambio: (iso: string) => void; minimo?: Date; maximo?: Date; placeholder?: string;
}) {
  const t = useTheme();
  return createElement('input', {
    type: 'date',
    lang: localeIntl(),
    value: valor ? valor.slice(0, 10) : '',
    min: minimo ? aIso(minimo) : undefined,
    max: maximo ? aIso(maximo) : undefined,
    onChange: (e: { target: { value: string } }) => e.target.value && onCambio(e.target.value),
    style: {
      border: 0, borderRadius: 7, padding: '6px 10px', fontSize: 17, fontFamily: 'inherit',
      background: t.backgroundElement, color: t.text, colorScheme: t.background === '#000000' ? 'dark' : 'light',
    },
  });
}
