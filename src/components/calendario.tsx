// Calendario mensual para elegir un día puntual (más allá de la tira de 2 semanas).
// Sube desde abajo como una hoja de iOS. Los días con eventos llevan un punto; los demás se ven apagados.
// Trabaja con claves "AAAA-MM-DD" de la zona de la ciudad, así no hay líos de zona horaria.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonTexto, Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { claveDia } from '@/lib/fechas';
import { localeIntl } from '@/lib/i18n';

const pad = (n: number) => String(n).padStart(2, '0');
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Mes como número absoluto (año * 12 + mes) para avanzar y retroceder fácil.
const mesDe = (clave: string) => Number(clave.slice(0, 4)) * 12 + Number(clave.slice(5, 7)) - 1;

function celdasDelMes(mes: number, empiezaLunes: boolean) {
  const anio = Math.floor(mes / 12);
  const m = mes % 12;
  const primero = new Date(Date.UTC(anio, m, 1)).getUTCDay(); // 0 = domingo
  const hueco = empiezaLunes ? (primero + 6) % 7 : primero;
  const dias = new Date(Date.UTC(anio, m + 1, 0)).getUTCDate();
  const celdas: (string | null)[] = Array.from({ length: hueco }, () => null);
  for (let d = 1; d <= dias; d++) celdas.push(`${anio}-${pad(m + 1)}-${pad(d)}`);
  while (celdas.length % 7) celdas.push(null);
  return celdas;
}

function Flecha({ direccion, deshabilitada, onPress }: { direccion: -1 | 1; deshabilitada: boolean; onPress: () => void }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitada}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={tr(direccion < 0 ? 'calendario.anterior' : 'calendario.siguiente')}
      style={({ pressed }) => [styles.flecha, { backgroundColor: t.backgroundElement, opacity: deshabilitada ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Icono nombre={direccion < 0 ? 'chevron.left' : 'chevron.right'} tamano={15} color={t.text} peso="semibold" />
    </Pressable>
  );
}

export function HojaCalendario({ visible, valor, diasConEventos, onElegir, onCerrar }: {
  visible: boolean;
  valor: string | null;
  diasConEventos: Set<string>;
  onElegir: (clave: string | null) => void;
  onCerrar: () => void;
}) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const hoy = claveDia(new Date().toISOString());
  const primerMes = mesDe(hoy);
  // Se puede avanzar hasta el último mes que tiene eventos.
  const ultimoMes = useMemo(
    () => Math.max(primerMes, ...[...diasConEventos].map(mesDe)),
    [diasConEventos, primerMes],
  );
  const [mes, setMes] = useState(() => (valor ? mesDe(valor) : primerMes));
  const [abiertoAntes, setAbiertoAntes] = useState(visible);
  if (visible !== abiertoAntes) {
    // Al abrir, el calendario muestra el mes del día elegido (o el actual).
    setAbiertoAntes(visible);
    if (visible) setMes(valor ? mesDe(valor) : primerMes);
  }

  const empiezaLunes = !i18n.language.startsWith('en');
  const celdas = useMemo(() => celdasDelMes(mes, empiezaLunes), [mes, empiezaLunes]);
  const titulo = mayuscula(new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(Math.floor(mes / 12), mes % 12, 15))));
  // Iniciales de los días: 1 de enero de 2024 fue lunes.
  const semana = useMemo(() => Array.from({ length: 7 }, (_, k) => new Intl.DateTimeFormat(localeIntl(), { timeZone: 'UTC', weekday: 'narrow' })
    .format(new Date(Date.UTC(2024, 0, (empiezaLunes ? 1 : 0) + k)))), [empiezaLunes, i18n.language]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCerrar} statusBarTranslucent>
      {visible && (
        <View style={styles.contenedor}>
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, styles.velo]} onPress={onCerrar} accessibilityLabel={tr('comun.cancelar')} />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.springify().damping(22).stiffness(240)}
            exiting={SlideOutDown.duration(180)}
            style={[styles.hoja, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
            <View style={[styles.asa, { backgroundColor: t.separator }]} />
            <View style={styles.cabeza}>
              <Texto v="seccion">{titulo}</Texto>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Flecha direccion={-1} deshabilitada={mes <= primerMes} onPress={() => setMes(mes - 1)} />
                <Flecha direccion={1} deshabilitada={mes >= ultimoMes} onPress={() => setMes(mes + 1)} />
              </View>
            </View>

            <View style={styles.grilla}>
              {semana.map((d, k) => (
                <View key={`s${k}`} style={styles.celda}>
                  <Texto v="mini" secundario style={{ fontWeight: '600', textTransform: 'uppercase' }}>{d}</Texto>
                </View>
              ))}
              {celdas.map((clave, k) => {
                if (!clave) return <View key={`v${k}`} style={styles.celda} />;
                const pasado = clave < hoy;
                const conEventos = diasConEventos.has(clave);
                const elegido = clave === valor;
                const esHoy = clave === hoy;
                const activo = conEventos && !pasado;
                return (
                  <View key={clave} style={styles.celda}>
                    <Pressable
                      onPress={() => { onElegir(clave); onCerrar(); }}
                      disabled={!activo}
                      accessibilityRole="button"
                      accessibilityState={{ selected: elegido, disabled: !activo }}
                      style={({ pressed }) => [
                        styles.dia,
                        elegido && { backgroundColor: t.text },
                        !elegido && esHoy && { borderWidth: 1.5, borderColor: t.text },
                        pressed && !elegido && { backgroundColor: t.backgroundSelected },
                      ]}>
                      <Texto
                        style={{
                          fontSize: 17,
                          fontWeight: elegido || esHoy ? '700' : activo ? '500' : '400',
                          color: elegido ? t.background : t.text,
                          opacity: activo || elegido ? 1 : 0.28,
                        }}>
                        {Number(clave.slice(8))}
                      </Texto>
                      <View style={[styles.punto, { backgroundColor: elegido ? t.background : t.text, opacity: activo ? 1 : 0 }]} />
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.pie}>
              {valor ? (
                <BotonTexto texto={tr('agenda.verTodasFechas')} onPress={() => { onElegir(null); onCerrar(); }} />
              ) : <View />}
              <BotonTexto texto={tr('comun.listo')} onPress={onCerrar} />
            </View>
          </Animated.View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  velo: { backgroundColor: 'rgba(0,0,0,0.35)' },
  hoja: {
    width: '100%', maxWidth: 500, alignSelf: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 16, paddingTop: 8,
  },
  asa: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 10 },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 12 },
  flecha: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  grilla: { flexDirection: 'row', flexWrap: 'wrap' },
  celda: { width: `${100 / 7}%`, height: 48, alignItems: 'center', justifyContent: 'center' },
  dia: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  punto: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
  pie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginTop: 12 },
});
