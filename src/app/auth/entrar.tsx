import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';

import { BotonAuth, Campo, EMAIL_VALIDO, Enlace, GrupoVidrio, MensajeError, PantallaFormulario, TextoAuth } from '@/components/formulario';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { useSesion } from '@/context/sesion';
import { ApiError } from '@/lib/api';

export default function EntrarScreen() {
  const { t } = useTranslation('auth');
  const { entrarConEmail } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const entrar = async () => {
    if (!email.trim() || !password) return setError(t('errores.faltanDatos'));
    if (!EMAIL_VALIDO.test(email.trim())) return setError(t('errores.emailInvalido'));
    setError(null);
    setOcupado(true);
    try {
      await entrarConEmail(email, password);
    } catch (e) {
      // Cuenta sin verificar: el servidor ya envió un código nuevo.
      if (e instanceof ApiError && e.codigo === 'NO_VERIFICADO') {
        router.push({ pathname: '/auth/verificar', params: { email: email.trim().toLowerCase() } });
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setOcupado(false);
    }
  };

  return (
    <PantallaFormulario foto={FOTOS_INTRO.techno} titulo={t('entrar.titulo')}>
      <GrupoVidrio>
        <Campo
          etiqueta={t('campos.email')} value={email} onChangeText={setEmail} placeholder={t('campos.emailPlaceholder')}
          keyboardType="email-address" autoCapitalize="none" textContentType="username" autoComplete="email"
        />
        <Campo
          etiqueta={t('campos.password')} value={password} onChangeText={setPassword} secreto
          autoCapitalize="none" textContentType="password" autoComplete="current-password" onSubmitEditing={entrar}
        />
      </GrupoVidrio>
      <MensajeError texto={error} />
      <BotonAuth variante="principal" texto={t('entrar.entrar')} onPress={entrar} ocupado={ocupado} />
      <Pressable onPress={() => router.push({ pathname: '/auth/olvide', params: { email } })} style={{ alignSelf: 'center' }} hitSlop={8}>
        <TextoAuth style={{ color: '#fff', fontWeight: '600' }}>{t('entrar.olvide')}</TextoAuth>
      </Pressable>
      <Enlace pregunta={t('entrar.noTienes')} accion={t('entrar.creala')} onPress={() => router.replace('/auth')} />
    </PantallaFormulario>
  );
}
