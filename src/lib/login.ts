import * as AppleAuthentication from 'expo-apple-authentication';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

// Expo Go no incluye el módulo nativo de Google; para probar Google hace falta
// una "development build" (se arma más adelante con EAS).
export const enExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

// Web: popup de Google (Google Identity Services). Nativo: SDK de Google (no funciona en Expo Go).
export const googleDisponible =
  Boolean(googleWebClientId) && (Platform.OS === 'web' || !enExpoGo);

export async function appleDisponible() {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync();
}

export async function pedirTokenApple() {
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!cred.identityToken) throw new Error('Apple no entregó el token');
  return { identityToken: cred.identityToken, nombre: cred.fullName?.givenName ?? undefined, apellido: cred.fullName?.familyName ?? undefined };
}

export type TokenGoogle = { idToken: string } | { accessToken: string };

export async function pedirTokenGoogle(): Promise<TokenGoogle | null> {
  if (Platform.OS === 'web') return pedirTokenGoogleWeb();
  // Se carga solo cuando se usa, para que la app no falle en Expo Go.
  const { GoogleSignin, isSuccessResponse } = require('@react-native-google-signin/google-signin');
  GoogleSignin.configure({ webClientId: googleWebClientId, iosClientId: googleIosClientId });
  await GoogleSignin.hasPlayServices();
  const res = await GoogleSignin.signIn();
  if (!isSuccessResponse(res)) return null; // el usuario canceló
  const idToken = res.data.idToken;
  if (!idToken) throw new Error('Google no entregó el token');
  return { idToken };
}

// --- Web: mismo flujo que Rio Diferente (popup que entrega un access token) ---

type ClienteTokenGoogle = { requestAccessToken: () => void };
type GoogleGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (cfg: {
        client_id: string;
        scope: string;
        callback: (r: { access_token?: string; error?: string }) => void;
        error_callback?: (e: { type?: string }) => void;
      }) => ClienteTokenGoogle;
    };
  };
};

let scriptGoogle: Promise<GoogleGlobal> | null = null;

function cargarScriptGoogle(): Promise<GoogleGlobal> {
  const w = globalThis as unknown as { google?: GoogleGlobal; document: Document };
  if (w.google?.accounts?.oauth2) return Promise.resolve(w.google);
  scriptGoogle ??= new Promise((resolve, reject) => {
    const s = w.document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => (w.google ? resolve(w.google) : reject(new Error('No se pudo cargar Google')));
    s.onerror = () => {
      scriptGoogle = null;
      reject(new Error('No se pudo cargar Google'));
    };
    w.document.head.appendChild(s);
  });
  return scriptGoogle;
}

async function pedirTokenGoogleWeb(): Promise<TokenGoogle | null> {
  const google = await cargarScriptGoogle();
  return new Promise((resolve, reject) => {
    const cliente = google.accounts.oauth2.initTokenClient({
      client_id: googleWebClientId!,
      scope: 'openid email profile',
      callback: (r) => {
        if (r.access_token) resolve({ accessToken: r.access_token });
        else reject(new Error(r.error ? `Google rechazó el inicio de sesión (${r.error})` : 'Google no entregó el token'));
      },
      // El usuario cerró el popup, o el navegador lo bloqueó.
      error_callback: (e) => (e.type === 'popup_closed' ? resolve(null) : reject(new Error('No se pudo abrir la ventana de Google'))),
    });
    cliente.requestAccessToken();
  });
}

export function esCancelacion(err: unknown) {
  const code = (err as { code?: string })?.code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED' || code === '-5';
}
