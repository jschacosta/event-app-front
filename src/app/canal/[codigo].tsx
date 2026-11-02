// Link para compartir un canal propio: bora://canal/<código>. Busca el canal y abre
// el canal del evento ya dentro de esa sala. Si el canal ya no existe, lo dice.
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { BotonPrincipal, Icono, Texto } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, type CanalPropio } from '@/lib/api';
import { fechaLarga, hora } from '@/lib/fechas';

type Respuesta = { canal: CanalPropio; evento: { id: string; titulo: string; chatAbreEn: string } };

export default function AbrirCanalScreen() {
  const { codigo } = useLocalSearchParams<{ codigo: string }>();
  const t = useTheme();
  const { t: tr } = useTranslation();
  const { token, cargando } = useSesion();
  const [problema, setProblema] = useState<string | null>(null);
  const [aunNoAbre, setAunNoAbre] = useState<Respuesta | null>(null);

  useEffect(() => {
    if (cargando || !codigo) return;
    api<Respuesta>(`/canales/codigo/${codigo}`, { token })
      .then((r) => {
        if (new Date(r.evento.chatAbreEn) > new Date()) return setAunNoAbre(r);
        router.replace({ pathname: '/evento/[id]/chat', params: { id: r.evento.id, sala: r.canal.id } });
      })
      .catch((e: Error) => setProblema(e.message));
  }, [codigo, token, cargando]);

  const irAlInicio = () => router.replace('/');

  if (!problema && !aunNoAbre) {
    return <View style={[styles.centro, { backgroundColor: t.background }]}><ActivityIndicator /></View>;
  }
  return (
    <View style={[styles.centro, { backgroundColor: t.background }]}>
      <View style={[styles.icono, { backgroundColor: t.backgroundElement }]}>
        <Icono nombre={aunNoAbre ? 'calendar' : 'link'} tamano={28} color={t.text} />
      </View>
      <Texto v="seccion" style={{ textAlign: 'center' }}>{aunNoAbre ? aunNoAbre.canal.nombre : tr('canales.linkInvalido')}</Texto>
      <Texto secundario style={{ textAlign: 'center' }}>
        {aunNoAbre
          ? tr('canales.abreEl', { evento: aunNoAbre.evento.titulo, dia: fechaLarga(aunNoAbre.evento.chatAbreEn), hora: hora(aunNoAbre.evento.chatAbreEn) })
          : problema}
      </Texto>
      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        {aunNoAbre ? (
          <BotonPrincipal texto={tr('canales.verEvento')} onPress={() => router.replace({ pathname: '/evento/[id]', params: { id: aunNoAbre.evento.id } })} />
        ) : null}
        <BotonPrincipal texto={tr('canales.irAlInicio')} onPress={irAlInicio} secundario={Boolean(aunNoAbre)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  icono: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
