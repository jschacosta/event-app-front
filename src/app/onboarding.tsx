import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, ZoomIn, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AjustarFoto, type ImagenElegida } from '@/components/ajustar-foto';
import { Bandera, Banderas } from '@/components/bandera';
import { RuedaFecha } from '@/components/rueda-fecha';
import { SelectorPaises } from '@/components/selector-paises';
import { BotonPrincipal, BotonTexto, Grupo, Icono, Pildora, Texto, fuenteWeb } from '@/components/ui';
import { useSesion } from '@/context/sesion';
import { useTheme } from '@/hooks/use-theme';
import { mostrarError } from '@/lib/avisos';
import { nombrePais } from '@/lib/paises';

type Paso = 'nombre' | 'foto' | 'edad' | 'pais' | 'fotos' | 'paises' | 'idiomas' | 'fin';
const OBLIGATORIOS: Paso[] = ['nombre', 'foto', 'edad', 'pais'];
const IDIOMAS_HABLADOS = ['es', 'en', 'pt', 'fr', 'de', 'it', 'nl', 'he', 'zh', 'ja'];
const FOTOS_EXTRA = 3;

function hace(anios: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  return d;
}
function edadDe(iso: string | null) {
  if (!iso) return null;
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  let e = hoy.getFullYear() - a;
  if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) e--;
  return e;
}

async function elegirImagen() {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
  return r.canceled ? null : r.assets[0] ?? null;
}

// Para la foto de perfil se elige sin recortar: el recorte lo hace nuestro editor (igual en todas las plataformas).
async function elegirParaAjustar(): Promise<ImagenElegida | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  const a = r.canceled ? null : r.assets[0];
  return a ? { uri: a.uri, width: a.width, height: a.height } : null;
}

function Encabezado({ titulo, texto, opcional }: { titulo: string; texto: string; opcional?: boolean }) {
  const { t } = useTranslation('auth');
  return (
    <View style={{ gap: 8 }}>
      {opcional && <Texto v="pie" acento style={{ fontWeight: '600', textTransform: 'uppercase' }}>{t('onboarding.opcional')}</Texto>}
      <Texto v="tituloGrande">{titulo}</Texto>
      <Texto v="detalle" secundario>{texto}</Texto>
    </View>
  );
}

// Espera a que la sesión esté cargada: los pasos y los valores iniciales dependen del usuario.
export default function OnboardingScreen() {
  const t = useTheme();
  const { cargando, usuario } = useSesion();
  useEffect(() => {
    if (!cargando && !usuario) router.replace('/auth');
  }, [cargando, usuario]);
  if (cargando || !usuario) {
    return <View style={{ flex: 1, backgroundColor: t.grouped, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  return <Asistente />;
}

function Asistente() {
  const t = useTheme();
  const { t: tr } = useTranslation('auth');
  const insets = useSafeAreaInsets();
  const { usuario, actualizarPerfil, subirFoto, borrarFoto } = useSesion();

  // Los pasos se fijan al entrar: el nombre solo se pide si falta (Google y Apple suelen traerlo).
  const pasos = useMemo<Paso[]>(
    () => [...(usuario?.nombre ? [] : (['nombre'] as Paso[])), 'foto', 'edad', 'pais', 'fotos', 'paises', 'idiomas', 'fin'],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [i, setI] = useState(0);
  const paso = pasos[i];
  const total = pasos.length - 1; // "fin" no cuenta

  const [nombre, setNombre] = useState(usuario?.nombre ?? '');
  const [apellido, setApellido] = useState(usuario?.apellido ?? '');
  const [nacimiento, setNacimiento] = useState<string | null>(usuario?.fechaNacimiento ?? null);
  const [pais, setPais] = useState<string | null>(usuario?.pais ?? null);
  const [visitados, setVisitados] = useState<string[]>(usuario?.paisesVisitados ?? []);
  const [idiomas, setIdiomas] = useState<string[]>(usuario?.idiomas ?? []);
  const [selector, setSelector] = useState<'pais' | 'visitados' | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [porAjustar, setPorAjustar] = useState<ImagenElegida | null>(null);
  // Edad mínima 18: la rueda no deja pasar de esta fecha.
  const [minNacimiento, maxNacimiento] = useMemo(() => [hace(100), hace(18)], []);
  const [ruedaTocada, setRuedaTocada] = useState(Boolean(usuario?.fechaNacimiento));

  const progreso = useAnimatedStyle(() => ({ width: withTiming(`${(Math.min(i, total) / total) * 100}%`, { duration: 350 }) }));

  if (!usuario) return null;
  const fotos = usuario.fotos;
  const edad = edadDe(nacimiento);

  const valido: Record<Paso, boolean> = {
    nombre: nombre.trim().length >= 2,
    foto: fotos.length > 0,
    edad: ruedaTocada && edad !== null && edad >= 18,
    pais: Boolean(pais),
    fotos: true,
    paises: true,
    idiomas: true,
    fin: true,
  };

  const siguiente = () => {
    setError(null);
    if (i < pasos.length - 1) setI(i + 1);
  };

  // Guarda lo del paso actual y avanza.
  const continuar = async () => {
    if (!valido[paso]) {
      if (paso === 'edad' && edad !== null && edad < 18) setError(tr('onboarding.edad.menor'));
      return;
    }
    setOcupado(true);
    try {
      if (paso === 'nombre') await actualizarPerfil({ nombre: nombre.trim(), ...(apellido.trim() ? { apellido: apellido.trim() } : {}) });
      if (paso === 'edad' && nacimiento) await actualizarPerfil({ fechaNacimiento: nacimiento });
      if (paso === 'pais' && pais) await actualizarPerfil({ pais });
      if (paso === 'paises') await actualizarPerfil({ paisesVisitados: visitados });
      if (paso === 'idiomas') await actualizarPerfil({ idiomas });
      siguiente();
    } catch (e) {
      mostrarError(e);
    } finally {
      setOcupado(false);
    }
  };

  const agregarFoto = async () => {
    const a = await elegirImagen();
    if (!a) return;
    setSubiendo(true);
    try {
      await subirFoto(a.uri, a.mimeType ?? 'image/jpeg');
    } catch (e) {
      mostrarError(e);
    } finally {
      setSubiendo(false);
    }
  };

  // Foto de perfil: se elige, se ajusta en el editor y se sube. Si ya había una, se reemplaza.
  const elegirFotoPerfil = async () => {
    const a = await elegirParaAjustar();
    if (a) setPorAjustar(a);
  };
  const subirFotoPerfil = async (uri: string) => {
    setPorAjustar(null);
    setSubiendo(true);
    try {
      const anterior = fotos[0];
      await subirFoto(uri, 'image/jpeg');
      if (anterior) await borrarFoto(anterior);
    } catch (e) {
      mostrarError(e);
    } finally {
      setSubiendo(false);
    }
  };

  const contenido: Record<Paso, ReactNode> = {
    nombre: (
      <>
        <Encabezado titulo={tr('onboarding.nombre.titulo')} texto={tr('onboarding.nombre.texto')} />
        <Grupo>
          {[
            [tr('campos.nombre'), nombre, setNombre, 'given-name'],
            [tr('campos.apellido'), apellido, setApellido, 'family-name'],
          ].map(([etiqueta, valor, cambiar, auto]) => (
            <View key={etiqueta as string} style={s.campo}>
              <Texto v="pie" secundario>{etiqueta as string}</Texto>
              <TextInput
                value={valor as string}
                onChangeText={cambiar as (v: string) => void}
                autoCapitalize="words"
                autoComplete={auto as 'given-name'}
                maxLength={40}
                style={[s.input, { color: t.text, fontFamily: fuenteWeb }]}
              />
            </View>
          ))}
        </Grupo>
      </>
    ),
    foto: (
      <>
        <Encabezado titulo={tr('onboarding.foto.titulo')} texto={tr('onboarding.foto.texto')} />
        <View style={{ alignItems: 'center', gap: 16 }}>
          <Pressable onPress={elegirFotoPerfil} style={[s.fotoPerfil, { backgroundColor: t.card }]}>
            {subiendo ? <ActivityIndicator /> : fotos[0] ? (
              <Animated.View entering={ZoomIn.springify()} style={StyleSheet.absoluteFill}>
                <Image source={{ uri: fotos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
              </Animated.View>
            ) : <Icono nombre="camera" tamano={40} color={t.textSecondary} />}
          </Pressable>
          <BotonTexto texto={fotos[0] ? tr('onboarding.foto.cambiar') : tr('onboarding.foto.elegir')} onPress={elegirFotoPerfil} />
          <Texto v="pie" secundario style={{ textAlign: 'center' }}>{tr('onboarding.foto.ayuda')}</Texto>
        </View>
      </>
    ),
    edad: (
      <>
        <Encabezado titulo={tr('onboarding.edad.titulo')} texto={tr('onboarding.edad.texto')} />
        <View style={{ alignItems: 'center', gap: 16 }}>
          <View style={{ height: 44, justifyContent: 'center' }}>
            {ruedaTocada && edad !== null ? (
              <Animated.View key={edad} entering={ZoomIn.springify().damping(14)}>
                <Texto v="titulo">{tr('onboarding.edad.edad', { count: edad })}</Texto>
              </Animated.View>
            ) : (
              <Texto v="detalle" secundario>{tr('onboarding.edad.desliza')}</Texto>
            )}
          </View>
          <View style={{ alignSelf: 'stretch' }}>
            <RuedaFecha
              valor={nacimiento ?? `${hace(25).getFullYear()}-01-01`}
              onCambio={(v) => { setNacimiento(v); setRuedaTocada(true); setError(null); }}
              minimo={minNacimiento}
              maximo={maxNacimiento}
            />
          </View>
          <Texto v="pie" secundario style={{ textAlign: 'center' }}>{tr('onboarding.edad.minimo')}</Texto>
        </View>
      </>
    ),
    pais: (
      <>
        <Encabezado titulo={tr('onboarding.pais.titulo')} texto={tr('onboarding.pais.texto')} />
        <Pressable onPress={() => setSelector('pais')} style={[s.tarjetaPais, { backgroundColor: t.card }]}>
          {pais ? (
            <Animated.View key={pais} entering={ZoomIn.springify()} style={{ alignItems: 'center', gap: 6 }}>
              <Bandera codigo={pais} alto={64} style={s.banderaGrande} />
              <Texto v="seccion">{nombrePais(pais)}</Texto>
            </Animated.View>
          ) : <Texto v="cuerpoFuerte" acento>{tr('onboarding.pais.elegir')}</Texto>}
        </Pressable>
        {pais ? <BotonTexto texto={tr('onboarding.pais.elegir')} onPress={() => setSelector('pais')} /> : null}
      </>
    ),
    fotos: (
      <>
        <Encabezado titulo={tr('onboarding.fotos.titulo')} texto={tr('onboarding.fotos.texto')} opcional />
        <View style={s.cuadricula}>
          {Array.from({ length: FOTOS_EXTRA }, (_, n) => {
            const url = fotos[n + 1];
            return (
              <Pressable
                key={n}
                onPress={url ? () => borrarFoto(url).catch(mostrarError) : agregarFoto}
                disabled={subiendo}
                style={[s.fotoViaje, { backgroundColor: t.card, borderColor: url ? 'transparent' : t.chevron }]}>
                {url ? (
                  <Animated.View entering={ZoomIn.springify()} style={StyleSheet.absoluteFill}>
                    <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </Animated.View>
                ) : subiendo && n === fotos.length - 1 ? <ActivityIndicator /> : <Icono nombre="plus" tamano={26} color={t.accentText} />}
              </Pressable>
            );
          })}
        </View>
      </>
    ),
    paises: (
      <>
        <Encabezado titulo={tr('onboarding.paises.titulo')} texto={tr('onboarding.paises.texto')} opcional />
        {visitados.length > 0 && (
          <Animated.View entering={FadeIn}>
            <View style={{ alignItems: 'center', gap: 12 }}>
              <Banderas codigos={visitados} alto={26} gap={10} />
              <Texto v="pie" secundario style={{ textAlign: 'center' }}>{tr('onboarding.paises.cantidad', { count: visitados.length })}</Texto>
            </View>
          </Animated.View>
        )}
        <BotonPrincipal texto={tr('onboarding.paises.elegir')} secundario onPress={() => setSelector('visitados')} />
      </>
    ),
    idiomas: (
      <>
        <Encabezado titulo={tr('onboarding.idiomas.titulo')} texto={tr('onboarding.idiomas.texto')} opcional />
        <View style={s.pildoras}>
          {IDIOMAS_HABLADOS.map((c) => (
            <Pildora
              key={c}
              texto={tr(`idiomas.${c}`)}
              activa={idiomas.includes(c)}
              onPress={() => setIdiomas((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}
            />
          ))}
        </View>
      </>
    ),
    fin: (
      <View style={s.fin}>
        <Animated.View entering={ZoomIn.springify().damping(10)} style={[s.check, { backgroundColor: t.accent }]}>
          <Icono nombre="checkmark" tamano={44} color={t.onAccent} peso="bold" />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(300)} style={{ gap: 8, alignItems: 'center' }}>
          <Texto v="tituloGrande" style={{ textAlign: 'center' }}>{tr('onboarding.fin.titulo', { nombre: usuario.nombre ?? nombre })}</Texto>
          <Texto v="detalle" secundario style={{ textAlign: 'center' }}>{tr('onboarding.fin.texto')}</Texto>
        </Animated.View>
      </View>
    ),
  };

  const opcional = !OBLIGATORIOS.includes(paso) && paso !== 'fin';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.grouped }} behavior="padding">
      <View style={[s.barra, { paddingTop: insets.top + 8 }]}>
        {paso !== 'fin' ? (
          <>
            <View style={s.filaBarra}>
              {i > 0 ? <BotonTexto texto="‹" onPress={() => setI(i - 1)} /> : <View style={{ width: 20 }} />}
              <Texto v="pie" secundario>{tr('onboarding.paso', { n: i + 1, total })}</Texto>
              {opcional ? <BotonTexto texto={tr('onboarding.omitir')} onPress={siguiente} /> : <View style={{ width: 20 }} />}
            </View>
            <View style={[s.pista, { backgroundColor: t.segmentTrack }]}>
              <Animated.View style={[s.avance, { backgroundColor: t.accent }, progreso]} />
            </View>
          </>
        ) : null}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.contenido}>
        <Animated.View key={paso} entering={FadeInRight.duration(350)} style={{ gap: 28 }}>
          {contenido[paso]}
        </Animated.View>
        {error ? <Texto v="pie" style={{ color: '#FF3B30' }}>{error}</Texto> : null}
      </ScrollView>

      <View style={[s.pie, { paddingBottom: insets.bottom + 16 }]}>
        {paso === 'fin' ? (
          <BotonPrincipal texto={tr('onboarding.fin.ver')} onPress={() => router.replace('/')} />
        ) : (
          <BotonPrincipal texto={tr('onboarding.continuar')} onPress={continuar} ocupado={ocupado} deshabilitado={!valido[paso] || subiendo} />
        )}
      </View>

      <AjustarFoto imagen={porAjustar} onListo={subirFotoPerfil} onCancelar={() => setPorAjustar(null)} />

      <SelectorPaises
        visible={selector === 'pais'}
        titulo={tr('onboarding.pais.titulo')}
        seleccion={pais ? [pais] : []}
        onCerrar={() => setSelector(null)}
        onListo={([c]) => { setPais(c ?? null); setSelector(null); }}
      />
      <SelectorPaises
        visible={selector === 'visitados'}
        titulo={tr('onboarding.paises.titulo')}
        multiple
        seleccion={visitados}
        onCerrar={() => setSelector(null)}
        onListo={(cs) => { setVisitados(cs); setSelector(null); }}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  banderaGrande: { shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, marginBottom: 8 },
  barra: { paddingHorizontal: 16, gap: 10, width: '100%', maxWidth: 520, alignSelf: 'center' },
  filaBarra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  pista: { height: 4, borderRadius: 2, overflow: 'hidden' },
  avance: { height: 4, borderRadius: 2 },
  contenido: { padding: 24, paddingTop: 28, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1 },
  pie: { paddingHorizontal: 24, width: '100%', maxWidth: 520, alignSelf: 'center' },
  campo: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  input: { fontSize: 17, paddingVertical: 6 },
  fotoPerfil: { width: 180, height: 180, borderRadius: 90, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  tarjetaPais: { height: 200, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cuadricula: { flexDirection: 'row', gap: 10 },
  fotoViaje: { flex: 1, aspectRatio: 0.8, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  pildoras: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  fin: { alignItems: 'center', gap: 24, paddingTop: 60 },
  check: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
});
