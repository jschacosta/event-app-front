// "Esta noche en <ciudad>": el line-up real de las próximas horas (no fotos de stock ni datos inventados).
// Lo usan la bienvenida y el perfil sin cuenta para mostrar Bora tal como es antes de pedir la cuenta.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Banderas } from '@/components/bandera';
import { fuenteWeb } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { api, type Evento } from '@/lib/api';
import { eventosDelTelefono, eventosGuardados, guardarEventos } from '@/lib/eventos-cache';
import { hora } from '@/lib/fechas';
import { colorEtiquetaGenero } from '@/lib/generos';
import { FotoEvento } from '@/components/foto-evento';

const HORAS = 30; // "esta noche" = lo que está en vivo o empieza en las próximas 30 horas

// Cuánto vale la pena mostrarlo arriba: gente que va y lo que dice el servidor (fiesta fija, buen lugar, de noche).
const puntaje = (e: Evento) => (e.destaque ?? 0) + Math.min((e.asistencia?.van ?? 0) * 12, 60) + (e.imagen ? 5 : 0);

export function useEstaNoche(ciudad: string, cuantos = 5) {
  const [eventos, setEventos] = useState<Evento[] | null>(() => eventosGuardados(ciudad));
  const [ahora, setAhora] = useState(() => Date.now()); // se renueva con cada carga
  useEffect(() => {
    let vigente = true;
    if (!eventosGuardados(ciudad)) eventosDelTelefono(ciudad).then((l) => { if (vigente && l) setEventos((e) => e ?? l); });
    api<{ eventos: Evento[] }>(`/events?ciudad=${ciudad}`)
      .then((r) => {
        if (!vigente) return;
        setEventos(r.eventos);
        setAhora(Date.now());
        guardarEventos(ciudad, r.eventos); // así el inicio ya los tiene al entrar
      })
      .catch(() => {});
    return () => { vigente = false; };
  }, [ciudad]);

  return useMemo(() => {
    if (!eventos) return { destacados: null, total: 0, ahora };
    const hasta = ahora + HORAS * 36e5;
    const noche = eventos.filter((e) => new Date(e.inicio).getTime() < hasta && new Date(e.fin).getTime() > ahora);
    const destacados = [...noche].sort((a, b) => puntaje(b) - puntaje(a)).slice(0, cuantos)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
    return { destacados, total: noche.length, ahora };
  }, [eventos, cuantos, ahora]);
}

export type ColoresLineup = { texto: string; secundario: string; acento: string; vivo: string; onVivo: string; separador: string; miniatura: string };

// Filas del line-up: hora grande en cursiva, nombre y lugar, y quién va. "En vivo" si ya empezó.
export function LineupNoche({ eventos, ahora, colores, retraso = 0 }: { eventos: Evento[]; ahora: number; colores: ColoresLineup; retraso?: number }) {
  const { t } = useTranslation();
  return (
    <View>
      {eventos.map((e, i) => {
        const vivo = new Date(e.inicio).getTime() <= ahora;
        const a = e.asistencia;
        return (
          <Animated.View
            key={e.id}
            entering={FadeInDown.delay(retraso + i * 70).duration(380)}
            style={[s.fila, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colores.separador }]}>
            <View style={s.columnaHora}>
              {vivo ? (
                <View style={[s.vivo, { backgroundColor: colores.vivo }]}>
                  <Text style={[s.vivoTexto, { color: colores.onVivo }]}>{t('agenda.enVivo')}</Text>
                </View>
              ) : (
                <Text style={[s.hora, { color: colores.acento }]}>{hora(e.inicio)}</Text>
              )}
            </View>
            {/* Sin afiche: el color del género con la inicial, como una etiqueta de festival */}
            <View style={[s.miniatura, { backgroundColor: e.imagen ? colores.miniatura : colorEtiquetaGenero(e.generos[0] ?? 'otro') }]}>
              {e.imagen
                ? <FotoEvento url={e.imagen} style={StyleSheet.absoluteFill} transition={200} />
                : <Text style={s.inicial}>{e.titulo.trim().charAt(0).toUpperCase()}</Text>}
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1} style={[s.titulo, { color: colores.texto }]}>{e.titulo}</Text>
              <View style={s.linea}>
                <Text numberOfLines={1} style={[s.lugar, { color: colores.secundario }]}>{e.lugar ?? e.barrio ?? ''}</Text>
                {a && a.van > 0 ? (
                  <View style={s.linea}>
                    <Banderas codigos={a.paisesTop} alto={9} max={3} gap={2} />
                    <Text style={[s.van, { color: colores.texto }]}>{t('agenda.van', { count: a.van })}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  columnaHora: { width: 54 },
  hora: { fontFamily: FuenteTitulo.cursiva, fontSize: 20, lineHeight: 22, paddingRight: 2 },
  vivo: { alignSelf: 'flex-start', height: 18, paddingHorizontal: 5, borderRadius: 3, justifyContent: 'center' },
  vivoTexto: { fontSize: 10, fontWeight: '800', fontFamily: fuenteWeb },
  miniatura: { width: 40, height: 40, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  inicial: { color: '#FFFFFF', fontFamily: FuenteTitulo.cursiva, fontSize: 22, paddingRight: 2 },
  titulo: { fontSize: 15, fontWeight: '700', fontFamily: fuenteWeb },
  linea: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lugar: { fontSize: 13, flexShrink: 1, fontFamily: fuenteWeb },
  van: { fontSize: 12, fontWeight: '700', fontFamily: fuenteWeb },
});
