// "Mis planes" en Perfil. El próximo plan es una entrada: el afiche a la izquierda y el talón con la fecha
// a la derecha, separados por la línea para cortar (el mismo dibujo del ícono de "Voy"). Los siguientes
// van como el line-up de la agenda: el número del día grande en la columna y una fila densa.
// Todo sale de lo guardado en el teléfono (lib/planes.ts), así que se ve y se abre sin señal.
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { FotoEvento } from '@/components/foto-evento';
import { IconoBora } from '@/components/iconos-bora';
import { Icono, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Evento } from '@/lib/api';
import { claveDia, diasHastaClave, fechaDeClave, hora } from '@/lib/fechas';
import { precargarEvento } from '@/lib/precarga';
import { usePlanes } from '@/lib/planes';
import { CHAT_ACTIVO } from '@/lib/funciones';

const VISIBLES = 5; // la entrada + 4 filas
const TALON = 88;
const ALTO = 150;
const MUESCA = 16;

const enCurso = (e: Evento, ahora: number) => new Date(e.inicio).getTime() <= ahora && ahora < new Date(e.fin).getTime();

function abrir(e: Evento) {
  router.push({ pathname: '/evento/[id]', params: { id: e.id } });
}

function useEtiquetas() {
  const { t } = useTranslation();
  return {
    estado: (e: Evento) => (e.miAsistencia ? t(`evento.opcion.${e.miAsistencia.estado}`) : ''),
    cuando: (e: Evento, ahora: number) => {
      if (enCurso(e, ahora)) return t('planes.ahora');
      const d = diasHastaClave(claveDia(e.inicio));
      return d <= 0 ? t('fechas.hoy') : d === 1 ? t('fechas.manana') : t('planes.enDias', { count: d });
    },
  };
}

// La línea para cortar: puntitos verticales con una muesca arriba y otra abajo (del color del fondo).
function Corte({ fondo, punto }: { fondo: string; punto: string }) {
  return (
    <View pointerEvents="none" style={[styles.corte, { right: TALON - MUESCA / 2 - 4 }]}>
      <View style={[styles.muesca, { backgroundColor: fondo, top: -MUESCA / 2 }]} />
      <View style={styles.puntos}>
        {Array.from({ length: 11 }, (_, i) => <View key={i} style={[styles.punto, { backgroundColor: punto, opacity: 0.45 }]} />)}
      </View>
      <View style={[styles.muesca, { backgroundColor: fondo, bottom: -MUESCA / 2 }]} />
    </View>
  );
}

function Entrada({ evento, ahora }: { evento: Evento; ahora: number }) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const et = useEtiquetas();
  const vivo = enCurso(evento, ahora);
  const { numero, semana } = fechaDeClave(claveDia(evento.inicio));
  const fondoTalon = vivo ? t.sun : t.accentSoft;
  const tinta = vivo ? t.onSun : t.accentSoftText;
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPressIn={() => precargarEvento(evento)}
        onPress={() => abrir(evento)}
        accessibilityRole="button"
        accessibilityLabel={`${evento.titulo}, ${semana} ${numero}, ${hora(evento.inicio)}, ${et.estado(evento)}`}
        style={({ pressed }) => [styles.entrada, pressed && { opacity: 0.85 }]}>
        <View style={[styles.afiche, { backgroundColor: t.backgroundElement }]}>
          {evento.imagen ? <FotoEvento url={evento.imagen} tamano="grande" style={StyleSheet.absoluteFill} transition={150} /> : null}
          <LinearGradient colors={['rgba(18,10,23,0)', 'rgba(18,10,23,0.9)']} locations={[0.25, 1]} style={StyleSheet.absoluteFill} />
          <View style={styles.aficheTexto}>
            <Texto style={styles.tituloEntrada} numberOfLines={2}>{evento.titulo}</Texto>
            {evento.lugar ? <Texto v="pie" numberOfLines={1} style={{ color: 'rgba(255,255,255,0.82)', fontWeight: '600' }}>{evento.lugar}</Texto> : null}
          </View>
        </View>
        <View style={[styles.talon, { backgroundColor: fondoTalon }]}>
          <Texto v="mini" style={{ color: tinta, fontWeight: '800' }}>{vivo ? tr('planes.ahora') : semana}</Texto>
          <Texto style={[styles.numeroTalon, { color: tinta }]}>{numero}</Texto>
          <Texto v="pie" style={{ color: tinta, fontWeight: '700' }}>{hora(evento.inicio)}</Texto>
          <View style={[styles.sello, { borderColor: tinta }]}>
            <Texto v="mini" numberOfLines={1} style={{ color: tinta, fontWeight: '800' }}>{et.estado(evento)}</Texto>
          </View>
        </View>
        <Corte fondo={t.background} punto={tinta} />
      </Pressable>
      <Texto v="pie" secundario style={{ fontWeight: '600' }}>
        {evento.chatAbierto && CHAT_ACTIVO ? `${et.cuando(evento, ahora)} · ${tr('agenda.canalAbierto')}` : et.cuando(evento, ahora)}
      </Texto>
    </View>
  );
}

function Fila({ evento, ahora, ultima }: { evento: Evento; ahora: number; ultima: boolean }) {
  const t = useTheme();
  const et = useEtiquetas();
  const clave = claveDia(evento.inicio);
  const { numero, semana } = fechaDeClave(clave);
  const vivo = enCurso(evento, ahora);
  return (
    <Pressable
      onPressIn={() => precargarEvento(evento)}
      onPress={() => abrir(evento)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.fila, !ultima && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }, pressed && { opacity: 0.6 }]}>
      <View style={styles.columnaDia}>
        <Texto style={[styles.numeroFila, { color: t.text }]}>{numero}</Texto>
        <Texto v="mini" style={{ fontWeight: '700', color: vivo ? t.live : t.textSecondary }}>{vivo ? et.cuando(evento, ahora) : semana}</Texto>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto v="cuerpoFuerte" numberOfLines={1}>{evento.titulo}</Texto>
        <Texto v="pie" secundario numberOfLines={1}>{[hora(evento.inicio), evento.lugar].filter(Boolean).join(' · ')}</Texto>
      </View>
      <Texto v="pie" style={{ fontWeight: '700', color: t.accentText }}>{et.estado(evento)}</Texto>
    </Pressable>
  );
}

function SinPlanes() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  return (
    <View style={[styles.vacio, { borderColor: t.outline }]}>
      <View style={[styles.circulo, { backgroundColor: t.accentSoft }]}>
        <IconoBora nombre="entrada" tamano={26} color={t.accentSoftText} />
      </View>
      <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('planes.vacioTitulo')}</Texto>
      <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('planes.vacioAyuda')}</Texto>
      <Pressable onPress={() => router.navigate('/')} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.botonVacio, pressed && { opacity: 0.6 }]}>
        <Texto v="detalle" style={{ fontWeight: '700', color: t.accentText }}>{tr('planes.verAgenda')}</Texto>
        <Icono nombre="chevron.right" tamano={11} color={t.accentText} peso="bold" />
      </Pressable>
    </View>
  );
}

export function MisPlanes() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const planes = usePlanes();
  const [todos, setTodos] = useState(false);
  const [ahora] = useState(() => Date.now());
  // Todavía no se sabe (primera vez, sin nada guardado): no se muestra la sección vacía de golpe.
  if (planes === null) return null;
  const [primero, ...resto] = planes;
  const filas = todos ? resto : resto.slice(0, VISIBLES - 1);
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.cabeza}>
        <Texto v="seccion">{tr('planes.titulo')}</Texto>
        {planes.length ? <Texto v="detalle" secundario style={{ fontWeight: '700' }}>{planes.length}</Texto> : null}
      </View>
      {!primero ? <SinPlanes /> : (
        <>
          <Entrada evento={primero} ahora={ahora} />
          {filas.length ? (
            <View>{filas.map((e, i) => <Fila key={e.id} evento={e} ahora={ahora} ultima={i === filas.length - 1} />)}</View>
          ) : null}
          {resto.length > VISIBLES - 1 ? (
            <Pressable onPress={() => setTodos((v) => !v)} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.verTodos, pressed && { opacity: 0.6 }]}>
              <Texto v="detalle" style={{ fontWeight: '700', color: t.accentText }}>
                {todos ? tr('planes.verMenos') : tr('planes.verTodos', { count: planes.length })}
              </Texto>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cabeza: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  entrada: { flexDirection: 'row', height: ALTO },
  afiche: { flex: 1, borderTopLeftRadius: 6, borderBottomLeftRadius: 6, overflow: 'hidden', justifyContent: 'flex-end' },
  aficheTexto: { padding: 12, paddingRight: MUESCA, gap: 2 },
  tituloEntrada: { fontFamily: FuenteTitulo.cursiva, fontSize: 24, lineHeight: 25, color: '#FFFFFF', paddingRight: 3 },
  talon: { width: TALON, borderTopRightRadius: 6, borderBottomRightRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 6 },
  numeroTalon: { fontFamily: FuenteTitulo.cursiva, fontSize: 44, lineHeight: 46, paddingRight: 3 },
  sello: { marginTop: 6, borderWidth: 1.5, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, maxWidth: TALON - 12 },
  corte: { position: 'absolute', top: 0, bottom: 0, width: MUESCA, alignItems: 'center' },
  muesca: { position: 'absolute', width: MUESCA, height: MUESCA, borderRadius: MUESCA / 2 },
  puntos: { flex: 1, justifyContent: 'space-evenly', paddingVertical: MUESCA / 2 + 2 },
  punto: { width: 2, height: 5, borderRadius: 1 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  columnaDia: { width: 44 },
  numeroFila: { fontFamily: FuenteTitulo.cursiva, fontSize: 28, lineHeight: 29, paddingRight: 2 },
  verTodos: { alignSelf: 'flex-start', paddingVertical: 2 },
  vacio: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 6, padding: 20, alignItems: 'center', gap: 8 },
  circulo: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  botonVacio: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
});
