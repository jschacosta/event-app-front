import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { BotonAuth, Campo, EMAIL_VALIDO, GrupoVidrio, MensajeError, PASSWORD_VALIDA, PantallaFormulario, TextoAuth } from '@/components/formulario';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { useSesion } from '@/context/sesion';
import { CampoCodigo, useEspera } from './verificar';

// Dos pasos: pedir el código por correo y luego escribir código + contraseña nueva.
export default function OlvideScreen() {
  const { t } = useTranslation('auth');
  const params = useLocalSearchParams<{ email?: string }>();
  const { olvideContrasena, restablecerContrasena } = useSesion();
  const [email, setEmail] = useState(params.email ?? '');
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [quedan, setQuedan] = useEspera(0);

  const pedirCodigo = async () => {
    if (!EMAIL_VALIDO.test(email.trim())) return setError(t('errores.emailInvalido'));
    setError(null);
    setOcupado(true);
    try {
      await olvideContrasena(email);
      setEnviado(true);
      setQuedan(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  const guardar = async () => {
    if (codigo.length !== 6) return setError(t('errores.codigoIncompleto'));
    if (!PASSWORD_VALIDA.test(password)) return setError(t('errores.passwordDebil'));
    setError(null);
    setOcupado(true);
    try {
      await restablecerContrasena(email, codigo, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  if (!enviado) {
    return (
      <PantallaFormulario foto={FOTOS_INTRO.techno} titulo={t('olvide.titulo')} texto={t('olvide.texto')}>
        <GrupoVidrio>
          <Campo
            etiqueta={t('campos.email')} value={email} onChangeText={setEmail} placeholder={t('campos.emailPlaceholder')}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email" onSubmitEditing={pedirCodigo}
          />
        </GrupoVidrio>
        <MensajeError texto={error} />
        <BotonAuth variante="principal" texto={t('olvide.enviar')} onPress={pedirCodigo} ocupado={ocupado} />
      </PantallaFormulario>
    );
  }

  return (
    <PantallaFormulario foto={FOTOS_INTRO.techno} titulo={t('olvide.titulo')} texto={t('olvide.textoCodigo', { email: email.trim().toLowerCase() })}>
      <CampoCodigo valor={codigo} onCambio={setCodigo} />
      <GrupoVidrio pie={t('campos.passwordAyuda')}>
        <Campo
          etiqueta={t('campos.passwordNueva')} value={password} onChangeText={setPassword} secreto
          autoCapitalize="none" textContentType="newPassword" autoComplete="new-password" onSubmitEditing={guardar}
        />
      </GrupoVidrio>
      <MensajeError texto={error} />
      <BotonAuth variante="principal" texto={t('olvide.guardar')} onPress={guardar} ocupado={ocupado} />
      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={pedirCodigo} disabled={quedan > 0} hitSlop={8}>
          <TextoAuth suave={quedan > 0} style={quedan <= 0 ? { color: '#fff', fontWeight: '600' } : undefined}>
            {quedan > 0 ? t('verificar.reenviarEn', { s: quedan }) : t('verificar.reenviar')}
          </TextoAuth>
        </Pressable>
      </View>
    </PantallaFormulario>
  );
}
