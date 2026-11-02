// Crear un canal propio dentro del canal de un evento (solo admin y usuarios habilitados).
// Libre o con contraseña; al crearlo se puede compartir el link.
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonPrincipal, BotonTexto, FilaInterruptor, Grupo, Icono, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { api, ApiError, type CanalPropio } from '@/lib/api';
import { compartirCanal } from '@/lib/compartir-canal';
import { AvisoVerificarEdad } from '@/components/canales';

function Campo({ valor, onCambio, placeholder, multilinea, secreto, max }: {
  valor: string; onCambio: (v: string) => void; placeholder: string; multilinea?: boolean; secreto?: boolean; max: number;
}) {
  const t = useTheme();
  return (
    <TextInput
      value={valor}
      onChangeText={onCambio}
      placeholder={placeholder}
      placeholderTextColor={t.textSecondary}
      maxLength={max}
      multiline={multilinea}
      secureTextEntry={secreto}
      autoCapitalize={secreto ? 'none' : 'sentences'}
      autoCorrect={!secreto}
      style={[
        styles.input,
        multilinea && { minHeight: 84, textAlignVertical: 'top', paddingTop: 14 },
        { color: t.text, fontFamily: fuenteWeb },
        Platform.OS === 'web' && ({ outlineStyle: 'none' } as object),
      ]}
    />
  );
}

export default function NuevoCanalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  const { token, usuario } = useSesion();
  const faltaVerificar = Boolean(usuario && !usuario.edadVerificada && !usuario.admin);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [conClave, setConClave] = useState(false);
  const [clave, setClave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<CanalPropio | null>(null);
  const [copiado, setCopiado] = useState(false);

  const valido = nombre.trim().length >= 3 && (!conClave || clave.trim().length >= 4);

  const crear = async () => {
    setOcupado(true);
    setError(null);
    try {
      const r = await api<{ canal: CanalPropio }>(`/canales/evento/${id}`, {
        metodo: 'POST',
        token,
        body: { nombre: nombre.trim(), descripcion: descripcion.trim() || undefined, clave: conClave ? clave.trim() : undefined },
      });
      setCreado(r.canal);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
    setOcupado(false);
  };

  const compartir = async () => {
    if (!creado) return;
    if ((await compartirCanal(creado, conClave ? clave.trim() : undefined)) === 'copiado') setCopiado(true);
  };

  const irAlCanal = () => {
    if (!creado) return;
    // Vuelve al canal del evento (que quedó debajo del modal), ya dentro del canal nuevo.
    router.dismissTo({ pathname: '/evento/[id]/chat', params: { id: id!, sala: creado.id } });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.grouped }} behavior="padding">
      <View style={[styles.barra, { paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 10 }]}>
        <BotonTexto texto={creado ? tr('canales.listo') : tr('comun.cancelar')} onPress={creado ? irAlCanal : () => router.back()} />
        <Texto v="cuerpoFuerte">{tr('canales.nuevo')}</Texto>
        <View style={{ width: 70 }} />
      </View>

      {faltaVerificar ? (
        <AvisoVerificarEdad titulo={tr('verificacion.titulo')} texto={tr('verificacion.paraCrear')} />
      ) : creado ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.listo}>
          <Animated.View entering={FadeInDown.springify().damping(14)} style={[styles.iconoListo, { backgroundColor: t.text }]}>
            <Icono nombre="checkmark" tamano={34} color={t.background} peso="bold" />
          </Animated.View>
          <Texto v="titulo" style={{ textAlign: 'center' }}>{creado.nombre}</Texto>
          <Texto secundario style={{ textAlign: 'center' }}>
            {creado.privado ? tr('canales.creadoPrivado') : tr('canales.creadoLibre')}
          </Texto>
          <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 8 }}>
            <BotonPrincipal texto={tr('canales.compartirLink')} onPress={compartir} />
            <BotonPrincipal texto={tr('canales.irAlCanal')} onPress={irAlCanal} secundario />
          </View>
          {copiado ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <Texto v="detalle" secundario>{tr('canales.linkCopiado')}</Texto>
            </Animated.View>
          ) : null}
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Texto v="detalle" secundario style={{ paddingHorizontal: 16 }}>{tr('canales.nuevoIntro')}</Texto>
          <Grupo titulo={tr('canales.nombreCanal')}>
            <Campo valor={nombre} onCambio={setNombre} placeholder={tr('canales.nombreEjemplo')} max={40} />
          </Grupo>
          <Grupo titulo={tr('canales.descripcion')} pie={tr('canales.descripcionPie')}>
            <Campo valor={descripcion} onCambio={setDescripcion} placeholder={tr('canales.descripcionEjemplo')} multilinea max={200} />
          </Grupo>
          <Grupo pie={conClave ? tr('canales.clavePie') : tr('canales.librePie')}>
            <FilaInterruptor etiqueta={tr('canales.conClave')} valor={conClave} onCambio={setConClave} />
            {conClave ? (
              <View style={styles.filaClave}>
                <Icono nombre="lock.fill" tamano={15} color={t.textSecondary} />
                <Campo valor={clave} onCambio={setClave} placeholder={tr('canales.clave')} secreto max={40} />
              </View>
            ) : null}
          </Grupo>
          {error ? <Texto v="detalle" style={{ color: t.danger, paddingHorizontal: 16 }}>{error}</Texto> : null}
          <View style={{ paddingHorizontal: 16 }}>
            <BotonPrincipal texto={tr('canales.crearCanal')} onPress={crear} ocupado={ocupado} deshabilitado={!valido} />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10 },
  contenido: { paddingTop: 8, gap: 22, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 4 },
  input: { fontSize: 17, minHeight: 48, paddingHorizontal: 16, flex: 1 },
  filaClave: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16 },
  listo: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12, width: '100%', maxWidth: 480, alignSelf: 'center' },
  iconoListo: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
