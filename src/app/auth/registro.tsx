import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BotonAuth, Campo, EMAIL_VALIDO, Enlace, GrupoVidrio, MensajeError, PASSWORD_VALIDA, PantallaFormulario, TextoAuth } from '@/components/formulario';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { useSesion } from '@/context/sesion';

export default function RegistroScreen() {
  const { t } = useTranslation('auth');
  const { registrar } = useSesion();
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const crear = async () => {
    if (!nombre.trim() || !apellido.trim() || !email.trim() || !password) return setError(t('errores.faltanDatos'));
    if (!EMAIL_VALIDO.test(email.trim())) return setError(t('errores.emailInvalido'));
    if (!PASSWORD_VALIDA.test(password)) return setError(t('errores.passwordDebil'));
    setError(null);
    setOcupado(true);
    try {
      await registrar({ nombre: nombre.trim(), apellido: apellido.trim(), email, password });
      router.push({ pathname: '/auth/verificar', params: { email: email.trim().toLowerCase() } });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <PantallaFormulario foto={FOTOS_INTRO.noche} titulo={t('registro.titulo')}>
      <GrupoVidrio>
        <Campo etiqueta={t('campos.nombre')} value={nombre} onChangeText={setNombre} autoCapitalize="words" textContentType="givenName" autoComplete="given-name" />
        <Campo etiqueta={t('campos.apellido')} value={apellido} onChangeText={setApellido} autoCapitalize="words" textContentType="familyName" autoComplete="family-name" />
      </GrupoVidrio>
      <GrupoVidrio pie={t('campos.passwordAyuda')}>
        <Campo
          etiqueta={t('campos.email')} value={email} onChangeText={setEmail} placeholder={t('campos.emailPlaceholder')}
          keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" autoComplete="email"
        />
        <Campo
          etiqueta={t('campos.password')} value={password} onChangeText={setPassword} secreto
          autoCapitalize="none" textContentType="newPassword" autoComplete="new-password" onSubmitEditing={crear}
        />
      </GrupoVidrio>
      <MensajeError texto={error} />
      <BotonAuth variante="principal" texto={t('registro.crear')} onPress={crear} ocupado={ocupado} />
      <Enlace pregunta={t('registro.yaTienes')} accion={t('registro.entra')} onPress={() => router.replace('/auth/entrar')} />
    </PantallaFormulario>
  );
}
