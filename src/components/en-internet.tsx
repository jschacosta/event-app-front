// "Reseñas del lugar": lo que dice Google Maps del lugar donde es el evento (no de la fiesta).
// Va aparte de las opiniones de Bora y sin el morado de Bora: tinta y gris, con la fuente siempre a la
// vista. Google pide mostrar "Resumen de Gemini" y el enlace para reportarlo.
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import type { LugarGoogle } from '@/lib/api';

function Estrellas({ nota, color, vacia }: { nota: number; color: string; vacia: string }) {
  return (
    <View style={styles.estrellas} accessible={false}>
      {[1, 2, 3, 4, 5].map((i) => {
        const llena = nota >= i - 0.25;
        const media = !llena && nota >= i - 0.75;
        return (
          <Icono
            key={i}
            nombre={llena ? 'star.fill' : media ? 'star.leadinghalf.filled' : 'star'}
            tamano={13}
            color={llena || media ? color : vacia}
          />
        );
      })}
    </View>
  );
}

export function EnInternet({ lugar }: { lugar: LugarGoogle }) {
  const t = useTheme();
  const { t: tr, i18n } = useTranslation();
  const [completo, setCompleto] = useState(false);
  const abrir = (url: string | null | undefined) => url && WebBrowser.openBrowserAsync(url);
  const numero = (n: number, decimales = 0) =>
    n.toLocaleString(i18n.language, { minimumFractionDigits: decimales, maximumFractionDigits: decimales });

  // ~4 líneas en un teléfono: más que eso se corta y se ofrece "Leer más" (onTextLayout no cuenta líneas en web).
  const largo = (lugar.resumen?.texto.length ?? 0) > 190;

  return (
    <View style={styles.bloque}>
      <View style={{ gap: 2 }}>
        <Texto v="seccion" style={{ fontSize: 18 }}>{tr('enInternet.titulo')}</Texto>
        <Texto v="pie" secundario numberOfLines={1}>{tr('enInternet.enGoogle', { lugar: lugar.nombre })}</Texto>
      </View>

      {lugar.nota != null ? (
        <View
          style={styles.nota}
          accessible
          accessibilityLabel={tr('enInternet.notaAccesible', { nota: numero(lugar.nota, 1), count: lugar.total })}>
          <Texto v="tituloGrande" style={styles.numero}>{numero(lugar.nota, 1)}</Texto>
          <View style={{ gap: 3 }}>
            <Estrellas nota={lugar.nota} color={t.text} vacia={t.chevron} />
            <Texto v="pie" secundario>{tr('enInternet.resenas', { count: lugar.total, n: numero(lugar.total) })}</Texto>
          </View>
        </View>
      ) : null}

      {lugar.resumen ? (
        <View style={{ gap: 6 }}>
          <Pressable
            onPress={() => setCompleto(!completo)}
            disabled={!largo}
            accessibilityRole="button"
            accessibilityState={{ expanded: completo }}
            style={[styles.cita, { borderLeftColor: t.outline }]}>
            <Texto
              v="detalle"
              style={{ lineHeight: 20 }}
              numberOfLines={completo || !largo ? undefined : 4}>
              {lugar.resumen.texto}
            </Texto>
            {largo && !completo ? <Texto v="pie" style={{ fontWeight: '600', marginTop: 2 }}>{tr('enInternet.leerMas')}</Texto> : null}
          </Pressable>
          <View style={styles.pieResumen}>
            <Texto v="mini" secundario>{tr('enInternet.gemini')}</Texto>
            {lugar.resumen.reportar ? (
              <Pressable onPress={() => abrir(lugar.resumen?.reportar)} hitSlop={8} accessibilityRole="link">
                <Texto v="mini" secundario style={{ textDecorationLine: 'underline' }}>{tr('enInternet.reportar')}</Texto>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={() => abrir(lugar.linkResenas || lugar.link)}
        accessibilityRole="link"
        style={({ pressed }) => [styles.enlace, { borderColor: t.outline }, pressed && { backgroundColor: t.backgroundElement }]}>
        <Texto v="detalle" style={{ fontWeight: '600', flex: 1 }}>{tr('enInternet.verEnGoogle')}</Texto>
        <Icono nombre="arrow.up.right" tamano={13} color={t.textSecondary} peso="semibold" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: { gap: 12 },
  nota: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  numero: { fontSize: 40, lineHeight: 42, fontVariant: ['tabular-nums'] },
  estrellas: { flexDirection: 'row', gap: 1 },
  cita: { borderLeftWidth: 2, paddingLeft: 12, paddingVertical: 2 },
  pieResumen: { flexDirection: 'row', gap: 12, paddingLeft: 14 },
  enlace: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 11,
  },
});
