import { File } from 'expo-file-system';
import { API_URL } from '@/config/api';
import { Platform } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';

import { api, ApiError, type CambiosPerfil, type Usuario } from '@/lib/api';
import { almacen } from '@/lib/almacen';
import i18n from '@/lib/i18n';
import { pedirTokenApple, pedirTokenGoogle } from '@/lib/login';
import { cerrarSocket } from '@/lib/socket';

const CLAVE_TOKEN = 'sesion_token';
const CLAVE_INTRO = 'intro_vista';

type Sesion = {
  cargando: boolean;
  token: string | null;
  usuario: Usuario | null;
  entrarConApple: () => Promise<void>;
  entrarConGoogle: () => Promise<void>;
  entrarDev: (alias: string) => Promise<void>;
  actualizarPerfil: (cambios: CambiosPerfil) => Promise<void>;
  subirFoto: (uri: string, tipo?: string) => Promise<Usuario>; // devuelve el perfil con la foto nueva al final
  borrarFoto: (url: string) => Promise<void>;
  salir: () => Promise<void>;
  // Normas de los canales: se aceptan la primera vez que se abre el canal de cada evento.
  aceptarNormas: (eventoId: string) => Promise<void>;
  // Reemplaza el usuario con el que devolvió el servidor (por ejemplo, tras verificar la edad)
  fijarUsuario: Dispatch<SetStateAction<Usuario | null>>;
  // Login con correo y contraseña
  registrar: (datos: { email: string; password: string; nombre: string; apellido: string }) => Promise<void>;
  verificarEmail: (email: string, codigo: string) => Promise<void>;
  entrarConEmail: (email: string, password: string) => Promise<void>;
  reenviarCodigo: (email: string, tipo: 'verificacion' | 'restablecer') => Promise<void>;
  olvideContrasena: (email: string) => Promise<void>;
  restablecerContrasena: (email: string, codigo: string, password: string) => Promise<void>;
  // Intro animada: se muestra una sola vez
  introVista: boolean | null;
  marcarIntroVista: () => Promise<void>;
};

const SesionContext = createContext<Sesion | null>(null);

type RespuestaLogin = { token: string; user: Usuario };

export function SesionProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [introVista, setIntroVista] = useState<boolean | null>(null);

  useEffect(() => {
    almacen.leer(CLAVE_INTRO).then((v) => setIntroVista(v === '1'));
  }, []);

  const marcarIntroVista = useCallback(async () => {
    await almacen.guardar(CLAVE_INTRO, '1');
    setIntroVista(true);
  }, []);

  // Al abrir la app, recupera la sesión guardada y comprueba que siga válida.
  useEffect(() => {
    (async () => {
      const guardado = await almacen.leer(CLAVE_TOKEN);
      if (guardado) {
        try {
          const { user } = await api<{ user: Usuario }>('/me', { token: guardado });
          setToken(guardado);
          setUsuario(user);
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) await almacen.borrar(CLAVE_TOKEN);
        }
      }
      setCargando(false);
    })();
  }, []);

  const guardarSesion = useCallback(async ({ token: t, user }: RespuestaLogin) => {
    await almacen.guardar(CLAVE_TOKEN, t);
    setToken(t);
    setUsuario(user);
  }, []);

  const entrarConApple = useCallback(async () => {
    const datos = await pedirTokenApple();
    await guardarSesion(await api<RespuestaLogin>('/auth/apple', { metodo: 'POST', body: datos }));
  }, [guardarSesion]);

  const entrarConGoogle = useCallback(async () => {
    const token = await pedirTokenGoogle();
    if (!token) return; // el usuario canceló
    await guardarSesion(await api<RespuestaLogin>('/auth/google', { metodo: 'POST', body: token }));
  }, [guardarSesion]);

  const entrarDev = useCallback(async (alias: string) => {
    await guardarSesion(await api<RespuestaLogin>('/auth/dev', { metodo: 'POST', body: { alias } }));
  }, [guardarSesion]);

  const actualizarPerfil = useCallback<Sesion['actualizarPerfil']>(async (cambios) => {
    const { user } = await api<{ user: Usuario }>('/me', { metodo: 'PATCH', body: cambios, token });
    setUsuario(user);
  }, [token]);

  // Sube una foto (multipart). En web la imagen elegida llega como blob: o data: y se convierte a Blob.
  const subirFoto = useCallback<Sesion['subirFoto']>(async (uri, tipo = 'image/jpeg') => {
    const form = new FormData();
    if (Platform.OS === 'web') {
      const blob = await (await fetch(uri)).blob();
      form.append('foto', blob, 'foto.jpg');
    } else {
      // El fetch de Expo no acepta el { uri } de React Native: se leen los bytes del archivo
      // y se entrega una parte con nombre, tipo y bytes(), que es lo que sabe enviar.
      const archivo = new File(uri);
      form.append('foto', { name: 'foto.jpg', type: tipo, bytes: () => archivo.bytes() } as unknown as Blob);
    }
    const res = await fetch(`${API_URL}/api/me/fotos`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? 'No se pudo subir la foto', res.status);
    setUsuario(data.user);
    return data.user as Usuario;
  }, [token]);

  const borrarFoto = useCallback<Sesion['borrarFoto']>(async (url) => {
    const { user } = await api<{ user: Usuario }>('/me/fotos', { metodo: 'DELETE', body: { url }, token });
    setUsuario(user);
  }, [token]);

  const registrar = useCallback<Sesion['registrar']>(async (datos) => {
    await api('/auth/registro', { metodo: 'POST', body: { ...datos, email: datos.email.trim().toLowerCase(), idioma: i18n.language } });
  }, []);

  const verificarEmail = useCallback<Sesion['verificarEmail']>(async (email, codigo) => {
    await guardarSesion(await api<RespuestaLogin>('/auth/verificar', { metodo: 'POST', body: { email: email.trim().toLowerCase(), codigo } }));
  }, [guardarSesion]);

  const entrarConEmail = useCallback<Sesion['entrarConEmail']>(async (email, password) => {
    await guardarSesion(await api<RespuestaLogin>('/auth/login', { metodo: 'POST', body: { email: email.trim().toLowerCase(), password } }));
  }, [guardarSesion]);

  const reenviarCodigo = useCallback<Sesion['reenviarCodigo']>(async (email, tipo) => {
    await api('/auth/reenviar-codigo', { metodo: 'POST', body: { email: email.trim().toLowerCase(), tipo } });
  }, []);

  const olvideContrasena = useCallback<Sesion['olvideContrasena']>(async (email) => {
    await api('/auth/olvide', { metodo: 'POST', body: { email: email.trim().toLowerCase() } });
  }, []);

  const restablecerContrasena = useCallback<Sesion['restablecerContrasena']>(async (email, codigo, password) => {
    await guardarSesion(await api<RespuestaLogin>('/auth/restablecer', { metodo: 'POST', body: { email: email.trim().toLowerCase(), codigo, password } }));
  }, [guardarSesion]);

  // Normas de los canales: se aceptan una vez (o de nuevo si cambian).
  const aceptarNormas = useCallback<Sesion['aceptarNormas']>(async (eventoId) => {
    const { user } = await api<{ user: Usuario }>('/me/normas', { metodo: 'POST', token, body: { eventoId } });
    setUsuario(user);
  }, [token]);

  const salir = useCallback(async () => {
    cerrarSocket();
    await almacen.borrar(CLAVE_TOKEN);
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <SesionContext.Provider
      value={{ cargando, token, usuario, entrarConApple, entrarConGoogle, entrarDev, actualizarPerfil, subirFoto, borrarFoto, salir, aceptarNormas, fijarUsuario: setUsuario,
        registrar, verificarEmail, entrarConEmail, reenviarCodigo, olvideContrasena, restablecerContrasena, introVista, marcarIntroVista }}>
      {children}
    </SesionContext.Provider>
  );
}

export function useSesion() {
  const ctx = useContext(SesionContext);
  if (!ctx) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return ctx;
}
