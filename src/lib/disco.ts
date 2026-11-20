// Lo que la app necesita sin señal, guardado en el teléfono (en la carpeta permanente de la app: la caché
// la puede vaciar Android o iOS cuando falta espacio, justo cuando más se necesita).
// Las escrituras se juntan: se guarda unos segundos después del último cambio y, sí o sí, al salir de la app
// (así no se pierde lo que se cargó justo antes de cerrarla).
import { Directory, File, Paths } from 'expo-file-system';
import { AppState, Platform } from 'react-native';

const web = Platform.OS === 'web';
const ESPERA = 4000;
const pendientes = new Map<string, () => unknown>();
let timer: ReturnType<typeof setTimeout> | null = null;

const carpeta = () => new Directory(Paths.document, 'sin-conexion');
const archivo = (nombre: string) => new File(carpeta(), `${nombre}.json`);

function escribirTodo() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (!pendientes.size) return;
  const lista = [...pendientes];
  pendientes.clear();
  try {
    const c = carpeta();
    if (!c.exists) c.create({ intermediates: true });
  } catch {
    return;
  }
  for (const [nombre, datos] of lista) {
    try {
      Promise.resolve(archivo(nombre).write(JSON.stringify(datos()))).catch(() => {});
    } catch {
      // sin copia esta vez; se intenta en el próximo cambio
    }
  }
}

if (!web) {
  AppState.addEventListener('change', (estado) => {
    if (estado !== 'active') escribirTodo();
  });
}

// Programa el guardado. `datos` se llama recién al escribir (lo último que haya en ese momento).
export function guardarEnTelefono(nombre: string, datos: () => unknown) {
  if (web) return;
  pendientes.set(nombre, datos);
  if (!timer) timer = setTimeout(escribirTodo, ESPERA);
}

export async function leerDelTelefono<T>(nombre: string): Promise<T | null> {
  if (web) return null;
  try {
    const f = archivo(nombre);
    if (!f.exists) return null;
    return JSON.parse(await f.text()) as T;
  } catch {
    return null;
  }
}

export function borrarDelTelefono(nombre: string) {
  pendientes.delete(nombre);
  if (web) return;
  try {
    const f = archivo(nombre);
    if (f.exists) f.delete();
  } catch {
    // nada que borrar
  }
}

// Nombre de archivo seguro a partir de una clave cualquiera (ciudad, sala…).
export const nombreSeguro = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
