import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { BotonAuth, GrupoVidrio, MensajeError, PantallaFormulario, TextoAuth } from '@/components/formulario';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';

// Seis casillas para el código; por debajo hay un solo campo (permite pegar y autocompletar).
export function CampoCodigo({ valor, onCambio, onCompleto }: { valor: string; onCambio: (v: string) => void; onCompleto?: (v: string) => void }) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} style={s.casillas} accessibilityLabel="Código">
      {Array.from({ length: 6 }, (_, i) => {
        const activa = i === Math.min(valor.length, 5);
        return (
          <View key={i} style={[s.casilla, { borderColor: activa ? '#fff' : 'rgba(255,255,255,0.14)' }]}>
            <TextoAuth style={s.digito}>{valor[i] ?? ''}</TextoAuth>
          </View>
        );
      })}
      <TextInput
        ref={ref}
        value={valor}
        onChangeText={(v) => {
          const limpio = v.replace(/\D/g, '').slice(0, 6);
          onCambio(limpio);
          if (limpio.length === 6) onCompleto?.(limpio);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        style={[s.oculto, { fontFamily: fuenteWeb, color: 'transparent' }]}
        keyboardAppearance="dark"
      />
    </Pressable>
  );
}

export function useEspera(segundosIniciales = 60) {
  const [quedan, setQuedan] = useState(segundosIniciales);
  useEffect(() => {
    if (quedan <= 0) return;
    const id = setTimeout(() => setQuedan((q) => q - 1), 1000);
    return () => clearTimeout(id);
  }, [quedan]);
  return [quedan, setQuedan] as const;
}

export default function VerificarScreen() {
  const { t } = useTranslation('auth');
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verificarEmail, reenviarCodigo } = useSesion();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [quedan, setQuedan] = useEspera(60);

  const verificar = async (c = codigo) => {
    if (c.length !== 6) return setError(t('errores.codigoIncompleto'));
    setError(null);
    setOcupado(true);
    try {
      await verificarEmail(email ?? '', c); // al guardar la sesión, el layout redirige solo
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCodigo('');
    } finally {
      setOcupado(false);
    }
  };

  const reenviar = async () => {
    try {
      await reenviarCodigo(email ?? '', 'verificacion');
      setAviso(t('verificar.enviado'));
      setQuedan(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <PantallaFormulario foto={FOTOS_INTRO.lapa} titulo={t('verificar.titulo')} texto={t('verificar.texto', { email })}>
      <CampoCodigo valor={codigo} onCambio={setCodigo} onCompleto={verificar} />
      <MensajeError texto={error} />
      {aviso ? <TextoAuth style={{ color: '#fff' }}>{aviso}</TextoAuth> : null}
      <BotonAuth variante="principal" texto={t('verificar.verificar')} onPress={() => verificar()} ocupado={ocupado} deshabilitado={codigo.length !== 6} />
      <View style={{ alignItems: 'center', gap: 8 }}>
        <Pressable onPress={reenviar} disabled={quedan > 0} hitSlop={8}>
          <TextoAuth suave={quedan > 0} style={quedan <= 0 ? { color: '#fff', fontWeight: '600' } : undefined}>
            {quedan > 0 ? t('verificar.reenviarEn', { s: quedan }) : t('verificar.reenviar')}
          </TextoAuth>
        </Pressable>
        <TextoAuth style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{t('verificar.noLlega')}</TextoAuth>
      </View>
    </PantallaFormulario>
  );
}

const s = StyleSheet.create({
  casillas: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  casilla: { width: 48, height: 60, borderRadius: 14, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  digito: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  oculto: { position: 'absolute', opacity: 0.01, width: '100%', height: '100%' },
});
