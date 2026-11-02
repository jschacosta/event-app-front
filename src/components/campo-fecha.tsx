import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { fechaCorta } from '@/lib/fechas';
import { localeIntl } from '@/lib/i18n';

// Fecha en formato "AAAA-MM-DD" (sin hora, para evitar líos de zona horaria).
export function aIso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function aDate(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function CampoFecha({ valor, onCambio, minimo, maximo, placeholder }: {
  valor: string | null; onCambio: (iso: string) => void; minimo?: Date; maximo?: Date; placeholder?: string;
}) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const fecha = valor ? aDate(valor) : maximo ?? new Date();

  // iOS: selector compacto nativo (la "píldora" gris del diseño).
  if (Platform.OS === 'ios') {
    return (
      <DateTimePicker
        value={fecha}
        mode="date"
        display="compact"
        locale={localeIntl()}
        minimumDate={minimo}
        maximumDate={maximo}
        accentColor={t.accent}
        onChange={(_, d) => d && onCambio(aIso(d))}
      />
    );
  }

  // Android: botón que abre el diálogo del sistema.
  return (
    <>
      <Pressable onPress={() => setAbierto(true)} style={[styles.pildora, { backgroundColor: t.backgroundElement }]}>
        <Texto secundario={!valor}>{valor ? fechaCorta(valor) : placeholder ?? tr('comun.elegir')}</Texto>
      </Pressable>
      {abierto && (
        <DateTimePicker
          value={fecha}
          mode="date"
          minimumDate={minimo}
          maximumDate={maximo}
          onChange={(e, d) => {
            setAbierto(false);
            if (e.type === 'set' && d) onCambio(aIso(d));
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  pildora: { borderRadius: 7, paddingHorizontal: 10, paddingVertical: 6 },
});
