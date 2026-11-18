import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonVolver } from '@/components/desplazamiento';
import { BotonPrincipal, fuenteWeb, Texto } from '@/components/ui';
import { FuenteTitulo } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/lib/api';

// Abrir un hilo en una fiesta que se repite: una pregunta o un relato, con un texto opcional.
const MIN_TITULO = 4;

export default function NuevoHiloScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { t: tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { token } = useSesion();
  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publicar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await api<{ hilo: { id: string } }>(`/events/${id}/hilos`, { metodo: 'POST', token, body: { titulo: titulo.trim(), texto: texto.trim() } });
      router.replace({ pathname: '/evento/[id]/hilo/[hiloId]', params: { id, hiloId: r.hilo.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : tr('comun.noSePudo'));
    } finally {
      setEnviando(false);
    }
  };

  const sinBorde = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.barra, { paddingTop: insets.top + 6 }]}>
        <BotonVolver onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
        <Texto v="cuerpoFuerte">{tr('opiniones.nuevoHilo')}</Texto>
      </View>
      <ScrollView contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled">
        <TextInput
          value={titulo}
          onChangeText={setTitulo}
          placeholder={tr('opiniones.tituloEjemplo')}
          placeholderTextColor={t.textSecondary}
          maxLength={140}
          multiline
          autoFocus
          style={[styles.titulo, { color: t.text }, sinBorde]}
        />
        <TextInput
          value={texto}
          onChangeText={setTexto}
          placeholder={tr('opiniones.textoEjemplo')}
          placeholderTextColor={t.textSecondary}
          maxLength={4000}
          multiline
          style={[styles.texto, { color: t.text, fontFamily: fuenteWeb }, sinBorde]}
        />
        <Texto v="pie" secundario>{tr('opiniones.reglas')}</Texto>
        {error ? <Texto v="detalle" style={{ color: t.danger }}>{error}</Texto> : null}
      </ScrollView>
      <View style={[styles.pie, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <BotonPrincipal texto={tr('opiniones.publicar')} onPress={publicar} ocupado={enviando} deshabilitado={titulo.trim().length < MIN_TITULO} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 8 },
  contenido: { padding: 16, gap: 12 },
  titulo: { fontFamily: FuenteTitulo.extra, fontSize: 26, lineHeight: 30, padding: 0 },
  texto: { fontSize: 16, lineHeight: 23, minHeight: 140, padding: 0, textAlignVertical: 'top' },
  pie: { paddingHorizontal: 16, paddingTop: 8 },
});
