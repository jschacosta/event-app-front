// Ajustes → Cuenta → Correo: cambiar el correo de una cuenta con correo y contraseña.
// Paso 1: correo nuevo + contraseña actual (llega un código al correo nuevo).
// Paso 2: el código. Al confirmarlo, el correo anterior recibe un aviso del cambio.
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { CampoCodigo, useEspera } from '@/app/auth/verificar';
import { BotonAuth, Campo, EMAIL_VALIDO, GrupoVidrio, MensajeError, PantallaFormulario, TextoAuth } from '@/components/formulario';
import { FOTOS_INTRO } from '@/components/intro/escenas';
import { useSesion } from '@/context/sesion';
import { api, type Usuario } from '@/lib/api';

export default function CambiarCorreoScreen() {
  const { t } = useTranslation('auth');
  const { token, usuario, fijarUsuario } = useSesion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [quedan, setQuedan] = useEspera(0);

  const enviar = async () => {
    if (!EMAIL_VALIDO.test(email.trim())) return setError(t('errores.emailInvalido'));
    if (!password) return setError(t('correo.faltaPassword'));
    setError(null);
    setOcupado(true);
    try {
      await api('/me/correo', { metodo: 'POST', token, body: { email: email.trim().toLowerCase(), password } });
      setEnviado(true);
      setQuedan(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  const reenviar = async () => {
    setError(null);
    try {
      await api('/me/correo/reenviar', { metodo: 'POST', token });
      setQuedan(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const confirmar = async (valor = codigo) => {
    if (valor.length !== 6) return setError(t('errores.codigoIncompleto'));
    setError(null);
    setOcupado(true);
    try {
      const { user } = await api<{ user: Usuario }>('/me/correo/confirmar', { metodo: 'POST', token, body: { codigo: valor } });
      fijarUsuario(user);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setOcupado(false);
    }
  };

  if (!enviado) {
    return (
      <PantallaFormulario foto={FOTOS_INTRO.noche} titulo={t('correo.titulo')} texto={t('correo.texto', { email: usuario?.email ?? '' })}>
        <GrupoVidrio>
          <Campo
            etiqueta={t('correo.nuevo')} value={email} onChangeText={setEmail} placeholder={t('campos.emailPlaceholder')}
            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
          />
          <Campo
            etiqueta={t('correo.passwordActual')} value={password} onChangeText={setPassword} secreto
            autoCapitalize="none" textContentType="password" autoComplete="current-password" onSubmitEditing={enviar}
          />
        </GrupoVidrio>
        <MensajeError texto={error} />
        <BotonAuth variante="principal" texto={t('correo.enviar')} onPress={enviar} ocupado={ocupado} />
      </PantallaFormulario>
    );
  }

  return (
    <PantallaFormulario foto={FOTOS_INTRO.noche} titulo={t('correo.titulo')} texto={t('correo.textoCodigo', { email: email.trim().toLowerCase() })}>
      <CampoCodigo valor={codigo} onCambio={setCodigo} onCompleto={confirmar} />
      <MensajeError texto={error} />
      <BotonAuth variante="principal" texto={t('correo.confirmar')} onPress={() => confirmar()} ocupado={ocupado} />
      <View style={{ alignItems: 'center' }}>
        <Pressable onPress={reenviar} disabled={quedan > 0} hitSlop={8}>
          <TextoAuth suave={quedan > 0} style={quedan <= 0 ? { color: '#fff', fontWeight: '600' } : undefined}>
            {quedan > 0 ? t('verificar.reenviarEn', { s: quedan }) : t('verificar.reenviar')}
          </TextoAuth>
        </Pressable>
      </View>
    </PantallaFormulario>
  );
}
