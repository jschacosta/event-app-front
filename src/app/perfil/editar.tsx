import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image as ImagenRN, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Bandera } from '@/components/bandera';
import { AjustarFoto, type ImagenElegida } from '@/components/ajustar-foto';
import { RuedaFecha } from '@/components/rueda-fecha';
import { SelectorPaises } from '@/components/selector-paises';
import { BotonPrincipal, BotonTexto, Fila, FilaInterruptor, Grupo, Icono, Pildora, Texto, fuenteWeb } from '@/components/ui';
import { MaxContentWidth } from '@/constants/theme';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { confirmar, mostrarError } from '@/lib/avisos';
import { fechaCorta } from '@/lib/fechas';
import { INTERESES } from '@/lib/intereses';
import { IDIOMAS, nombrePais as nombreDePais } from '@/lib/paises';

const MAX_FOTOS = 6; // 1 de perfil + 5 de viajes

function hace(anios: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  return d;
}

function CampoTexto({ etiqueta, valor, onCambio, placeholder, sinMayusculas }: {
  etiqueta: string; valor: string; onCambio: (v: string) => void; placeholder: string; sinMayusculas?: boolean;
}) {
  const t = useTheme();
  return (
    <View style={styles.campo}>
      <Texto style={{ width: 96 }}>{etiqueta}</Texto>
      <TextInput
        value={valor}
        onChangeText={onCambio}
        placeholder={placeholder}
        placeholderTextColor={t.textSecondary}
        maxLength={40}
        autoCapitalize={sinMayusculas ? 'none' : 'words'}
        autoCorrect={!sinMayusculas}
        style={[styles.input, { color: t.text, fontFamily: fuenteWeb }]}
      />
    </View>
  );
}

export default function EditarPerfilScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { usuario, actualizarPerfil, subirFoto, borrarFoto } = useSesion();
  const { t: tr } = useTranslation();

  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState(usuario?.apellido ?? '');
  const [ocultarApellido, setOcultarApellido] = useState(usuario?.ocultarApellido ?? true);
  const [mostrarEdad, setMostrarEdad] = useState(usuario?.mostrarEdad ?? true);
  const [pais, setPais] = useState<string | null>(usuario?.pais ?? null);
  const [nacimiento, setNacimiento] = useState<string | null>(usuario?.fechaNacimiento ?? null);
  const [intereses, setIntereses] = useState<string[]>(usuario?.intereses ?? []);
  const [visitados, setVisitados] = useState<string[]>(usuario?.paisesVisitados ?? []);
  const [idiomas, setIdiomas] = useState<string[]>(usuario?.idiomas ?? []);
  const [instagram, setInstagram] = useState(usuario?.instagram ? `@${usuario.instagram}` : '');
  const [selector, setSelector] = useState<'pais' | 'visitados' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [subiendoPerfil, setSubiendoPerfil] = useState(false);
  const [porAjustar, setPorAjustar] = useState<ImagenElegida | null>(null);
  const [ruedaAbierta, setRuedaAbierta] = useState(false);

  if (!usuario) return null;
  const fotos = usuario.fotos;

  const cerrar = () => (router.canGoBack() ? router.back() : router.replace('/perfil'));

  const guardar = async () => {
    if (nombre.trim().length < 2 || apellido.trim().length < 2) return mostrarError(new Error(tr('editarPerfil.errorNombre')));
    setGuardando(true);
    try {
      await actualizarPerfil({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        ocultarApellido,
        mostrarEdad,
        intereses,
        paisesVisitados: visitados,
        idiomas,
        ...(pais ? { pais } : {}),
        ...(nacimiento && !usuario.fechaNacimiento ? { fechaNacimiento: nacimiento } : {}),
        instagram: instagram.trim(),
      });
      cerrar();
    } catch (e) {
      mostrarError(e);
    } finally {
      setGuardando(false);
    }
  };

  const agregarFoto = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (r.canceled || !r.assets[0]) return;
    setSubiendo(true);
    try {
      await subirFoto(r.assets[0].uri, r.assets[0].mimeType ?? 'image/jpeg');
    } catch (e) {
      mostrarError(e);
    } finally {
      setSubiendo(false);
    }
  };

  // Foto de perfil: se elige sin recortar, se ajusta en nuestro editor (el mismo del onboarding),
  // se sube, queda primera y la anterior se borra.
  const elegirFotoPerfil = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const a = r.canceled ? null : r.assets[0];
    if (a) setPorAjustar({ uri: a.uri, width: a.width, height: a.height });
  };
  // Fotos que no aparecen en la galería (por ejemplo, las que WhatsApp guarda como documento):
  // se eligen desde Archivos y pasan por el mismo editor.
  const elegirFotoDeArchivos = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
    const a = r.canceled ? null : r.assets[0];
    if (!a) return;
    ImagenRN.getSize(a.uri, (width, height) => setPorAjustar({ uri: a.uri, width, height }), (e) => mostrarError(e));
  };
  const subirFotoPerfil = async (uri: string) => {
    setPorAjustar(null);
    setSubiendoPerfil(true);
    const anterior = fotos[0];
    try {
      const u = await subirFoto(uri, 'image/jpeg');
      const nueva = u.fotos[u.fotos.length - 1];
      if (anterior) await borrarFoto(anterior);
      const orden = [nueva, ...u.fotos.filter((f) => f !== nueva && f !== anterior)];
      if (orden.length > 1) await actualizarPerfil({ fotos: orden });
    } catch (e) {
      mostrarError(e);
    } finally {
      setSubiendoPerfil(false);
    }
  };
  const viajes = fotos.slice(1);

  const quitarFoto = (url: string) =>
    confirmar(tr('editarPerfil.quitarFotoPregunta'), tr('editarPerfil.quitar'), () => borrarFoto(url).catch(mostrarError));

  const alternarInteres = (id: string) =>
    setIntereses((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const alternarIdioma = (c: string) =>
    setIdiomas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const mayorDeEdad = hace(18);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.grouped }} behavior="padding">
      <View style={[styles.barra, { paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8, borderBottomColor: t.separator }]}>
        <BotonTexto texto={tr('comun.cancelar')} onPress={cerrar} />
        <Texto v="cuerpoFuerte">{tr('editarPerfil.titulo')}</Texto>
        {guardando ? <ActivityIndicator /> : <BotonTexto texto={tr('comun.guardar')} onPress={guardar} />}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={[styles.contenido, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <Texto v="detalle" secundario style={{ paddingHorizontal: 4 }}>
          {tr('editarPerfil.intro')}
        </Texto>

        {/* Foto de perfil: la que ven los demás en los chats */}
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View>
          <Pressable onPress={elegirFotoPerfil} disabled={subiendoPerfil} accessibilityRole="button" accessibilityLabel={tr('editarPerfil.cambiarFoto')}
            style={({ pressed }) => [styles.avatar, { backgroundColor: t.card }, pressed && { opacity: 0.8 }]}>
            {subiendoPerfil ? <ActivityIndicator /> : fotos[0]
              ? <Image source={{ uri: fotos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <Text style={{ color: t.textSecondary, fontSize: 40, fontWeight: '600' }}>{(usuario.nombre ?? '?').charAt(0)}</Text>}
          </Pressable>
          <View style={[styles.camara, { backgroundColor: t.accent, borderColor: t.grouped }]} pointerEvents="none">
            <Icono nombre="camera" tamano={14} color={t.onAccent} />
          </View>
          </View>
          <BotonTexto texto={tr(fotos[0] ? 'editarPerfil.cambiarFoto' : 'editarPerfil.elegirFoto')} onPress={elegirFotoPerfil} />
          {Platform.OS !== 'web' ? (
            <Pressable onPress={elegirFotoDeArchivos} hitSlop={8} accessibilityRole="button">
              <Texto v="pie" secundario>{tr('editarPerfil.desdeArchivos')}</Texto>
            </Pressable>
          ) : null}
        </View>

        {fotos[0] ? (
          <View style={{ gap: 6 }}>
            <Texto v="grupo" secundario style={{ paddingHorizontal: 16 }}>{tr('editarPerfil.fotos')}</Texto>
            <View style={styles.fotos}>
              {viajes.map((url) => (
                <Pressable key={url} onPress={() => quitarFoto(url)} accessibilityLabel={tr('editarPerfil.fotoViaje')} style={styles.foto}>
                  <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                </Pressable>
              ))}
              {fotos.length < MAX_FOTOS && (
                <Pressable onPress={agregarFoto} disabled={subiendo} accessibilityLabel={tr('editarPerfil.agregarFoto')} style={[styles.foto, styles.agregar, { borderColor: t.chevron }]}>
                  {subiendo ? <ActivityIndicator /> : <Icono nombre="plus" tamano={26} color={t.accentText} />}
                </Pressable>
              )}
            </View>
            <Texto v="pie" secundario style={{ paddingHorizontal: 16 }}>
              {tr('editarPerfil.fotosPie', { max: MAX_FOTOS - 1 })}
            </Texto>
          </View>
        ) : null}

        <Grupo
          titulo={tr('editarPerfil.datos')}
          pie={`${tr('editarPerfil.datosPie')} ${usuario.fechaNacimiento ? tr('editarPerfil.nacimientoBloqueado') : tr('editarPerfil.nacimientoUnaVez')}`}>
          <CampoTexto etiqueta={tr('editarPerfil.nombre')} valor={nombre} onCambio={setNombre} placeholder={tr('editarPerfil.nombreEjemplo')} />
          <CampoTexto etiqueta={tr('editarPerfil.apellido')} valor={apellido} onCambio={setApellido} placeholder={tr('editarPerfil.apellidoEjemplo')} />
          <FilaInterruptor etiqueta={tr('editarPerfil.soloInicial')} valor={ocultarApellido} onCambio={setOcultarApellido} />
          <Fila etiqueta={tr('editarPerfil.pais')} valor={pais ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Bandera codigo={pais} alto={14} />
              <Texto secundario>{nombreDePais(pais)}</Texto>
            </View>
          ) : tr('comun.elegir')} onPress={() => setSelector('pais')} />
          {usuario.fechaNacimiento ? (
            // Se pone una sola vez: así nadie se cambia la edad según con quién habla.
            <Fila etiqueta={tr('editarPerfil.nacimiento')} valor={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Texto secundario>{fechaCorta(usuario.fechaNacimiento)}</Texto>
                <Icono nombre={usuario.edadVerificada ? 'checkmark.seal.fill' : 'lock.fill'} tamano={13} color={t.textSecondary} />
              </View>
            } />
          ) : (
            <Fila etiqueta={tr('editarPerfil.nacimiento')} valor={nacimiento ? fechaCorta(nacimiento) : tr('comun.elegir')} onPress={() => setRuedaAbierta(true)} />
          )}
        </Grupo>

        {/* La edad no se muestra en los chats: solo la ve quien creó un canal propio en el que estás. */}
        <Grupo pie={tr('editarPerfil.mostrarEdadPie')}>
          <FilaInterruptor etiqueta={tr('editarPerfil.mostrarEdad')} valor={mostrarEdad} onCambio={setMostrarEdad} />
        </Grupo>

        <Grupo titulo="Instagram" pie={tr('editarPerfil.instagramPie')}>
          <CampoTexto etiqueta="Instagram" valor={instagram} onCambio={setInstagram} placeholder="@usuario" sinMayusculas />
        </Grupo>

        <Grupo titulo={tr('editarPerfil.idiomas')}>
          <View style={styles.pildoras}>
            {IDIOMAS.map((i) => (
              <Pildora key={i.codigo} texto={i.nombre} activa={idiomas.includes(i.codigo)} onPress={() => alternarIdioma(i.codigo)} />
            ))}
          </View>
        </Grupo>

        <Grupo titulo={tr('editarPerfil.intereses')}>
          <View style={styles.pildoras}>
            {INTERESES.map((i) => (
              <Pildora key={i.id} texto={i.nombre} activa={intereses.includes(i.id)} onPress={() => alternarInteres(i.id)} />
            ))}
          </View>
        </Grupo>

        <Grupo titulo={tr('editarPerfil.visitados')}>
          <Fila
            etiqueta={visitados.length ? tr('onboarding.paises.cantidad', { ns: 'auth', count: visitados.length }) : tr('editarPerfil.agregarPaises')}
            valor={visitados.length ? String(visitados.length) : undefined}
            onPress={() => setSelector('visitados')}
          />
        </Grupo>

        <BotonPrincipal texto={tr('editarPerfil.guardarPerfil')} onPress={guardar} ocupado={guardando} />
      </ScrollView>

      <AjustarFoto imagen={porAjustar} onListo={subirFotoPerfil} onCancelar={() => setPorAjustar(null)} />

      {/* Fecha de nacimiento con nuestra rueda (la misma del onboarding). Se pone una sola vez. */}
      <Modal visible={ruedaAbierta} transparent animationType="fade" onRequestClose={() => setRuedaAbierta(false)} statusBarTranslucent>
        <View style={styles.veloRueda}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRuedaAbierta(false)} accessibilityLabel={tr('comun.cancelar')} />
          <View style={[styles.hojaRueda, { backgroundColor: t.card, paddingBottom: insets.bottom + 16 }]}>
            <Texto v="cuerpoFuerte" style={{ textAlign: 'center' }}>{tr('editarPerfil.nacimiento')}</Texto>
            <RuedaFecha
              valor={nacimiento ?? `${hace(25).getFullYear()}-01-01`}
              onCambio={setNacimiento}
              minimo={hace(100)}
              maximo={mayorDeEdad}
            />
            <Texto v="pie" secundario style={{ textAlign: 'center' }}>{tr('editarPerfil.nacimientoUnaVez')}</Texto>
            <BotonPrincipal texto={tr('comun.listo')} onPress={() => {
              if (!nacimiento) setNacimiento(`${hace(25).getFullYear()}-01-01`);
              setRuedaAbierta(false);
            }} />
          </View>
        </View>
      </Modal>

      <SelectorPaises
        visible={selector === 'pais'}
        titulo={tr('editarPerfil.tuPais')}
        seleccion={pais ? [pais] : []}
        onCerrar={() => setSelector(null)}
        onListo={([c]) => { setPais(c ?? null); setSelector(null); }}
      />
      <SelectorPaises
        visible={selector === 'visitados'}
        titulo={tr('editarPerfil.paisesVisitados')}
        multiple
        seleccion={visitados}
        onCerrar={() => setSelector(null)}
        onListo={(cs) => { setVisitados(cs); setSelector(null); }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  barra: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  contenido: { padding: 16, gap: 24 },
  campo: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16, gap: 12 },
  input: { flex: 1, fontSize: 17, paddingVertical: 10 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatar: { width: 112, height: 112, borderRadius: 56, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  camara: { position: 'absolute', right: 2, bottom: 2, width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  veloRueda: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  hojaRueda: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 14, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  foto: { width: '31.8%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden' },
  agregar: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
});
