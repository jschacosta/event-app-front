// Agenda de cada ciudad cargada por partes. Antes se bajaban todos los eventos de una vez (~1.100, 1 MB)
// y el teléfono tardaba en procesarlos. Ahora:
// - primero los próximos DIAS_PRIMERA días, más la lista de días y categorías con eventos (liviana);
// - al bajar hasta el final se suman los días siguientes (cargarMas);
// - al elegir una fecha que aún no está, se baja solo ese día (asegurarDia);
// - al elegir una categoría, se bajan sus eventos de todas las fechas (asegurarGenero);
// - el buscador pregunta al servidor, que busca en todas las fechas (buscarEnServidor).
// La lista unida vive en eventos-cache (así el evento abre al instante y los cambios de asistencia llegan).
import { useSyncExternalStore } from 'react';

import { api, type Evento } from '@/lib/api';
import { escucharCambios, eventosDelTelefono, eventosGuardados, guardarEventos, listaReciente, marcarDescarga } from '@/lib/eventos-cache';
import { claveDia, inicioDeClave, sumarDias } from '@/lib/fechas';

const DIAS_PRIMERA = 7;
const DIAS_MAS = 7;

export type Agenda = {
  eventos: Evento[] | null;
  // Todo lo que empieza antes de este instante está cargado. Infinity = lista del teléfono (sin datos de qué cubre).
  hasta: number;
  dias: string[] | null; // días con eventos en toda la agenda
  generos: string[] | null; // categorías con eventos en toda la agenda
  diasPorGenero: Record<string, string[]>;
  generosCompletos: ReadonlySet<string>;
  diasSueltos: ReadonlySet<string>;
};

type Meta = Omit<Agenda, 'eventos'>;
const metas = new Map<string, Meta>();
const fotos = new Map<string, Agenda>();
const oyentes = new Set<() => void>();
const enCurso = new Map<string, Promise<unknown>>();

const metaVacia = (): Meta => ({
  hasta: Infinity, dias: null, generos: null, diasPorGenero: {}, generosCompletos: new Set(), diasSueltos: new Set(),
});
const metaDe = (ciudad: string) => metas.get(ciudad) ?? metaVacia();

function avisar(ciudad?: string) {
  if (ciudad) fotos.delete(ciudad);
  else fotos.clear();
  oyentes.forEach((f) => f());
}
// Cambios de asistencia (voy, ya estoy aquí) corregidos en eventos-cache.
escucharCambios(() => avisar());

function instantanea(ciudad: string): Agenda {
  let f = fotos.get(ciudad);
  if (!f) {
    f = { ...metaDe(ciudad), eventos: eventosGuardados(ciudad) };
    fotos.set(ciudad, f);
  }
  return f;
}

function suscribir(f: () => void) {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

export function useAgenda(ciudad: string) {
  return useSyncExternalStore(suscribir, () => instantanea(ciudad));
}

// Une eventos nuevos con los que ya había (sin repetir) y los deja en orden de inicio.
function unir(ciudad: string, nuevos: Evento[], base = eventosGuardados(ciudad) ?? []) {
  const porId = new Map(base.map((e) => [e.id, e]));
  for (const e of nuevos) porId.set(e.id, e);
  const lista = [...porId.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
  guardarEventos(ciudad, lista);
}

type Respuesta = { eventos: Evento[]; dias?: string[]; generos?: string[] };
const pedir = (ciudad: string, extra: string, token: string | null) =>
  api<Respuesta>(`/events?ciudad=${ciudad}&ligero=1${extra}`, { token });
const iso = (ms: number) => new Date(ms).toISOString();
const hoy = () => claveDia(new Date().toISOString());

// Una sola descarga a la vez por cada parte pedida (dos toques seguidos no la piden dos veces).
function unaVez<T>(clave: string, f: () => Promise<T>): Promise<T> {
  const ya = enCurso.get(clave) as Promise<T> | undefined;
  if (ya) return ya;
  const p = f().finally(() => enCurso.delete(clave));
  enCurso.set(clave, p);
  return p;
}

// Al abrir la app: lo guardado en el teléfono mientras llega lo nuevo.
export async function agendaDelTelefono(ciudad: string) {
  if (eventosGuardados(ciudad)) return;
  const l = await eventosDelTelefono(ciudad);
  if (l && !eventosGuardados(ciudad)) {
    guardarEventos(ciudad, l);
    avisar(ciudad);
  }
}

export function agendaReciente(ciudad: string, token: string | null) {
  return listaReciente(ciudad, 'agenda', token) && metas.has(ciudad);
}

// Primera parte: los próximos días (con lo que está en vivo). Reemplaza todo lo anterior.
export function cargarInicio(ciudad: string, token: string | null) {
  return unaVez(`inicio-${ciudad}`, async () => {
    const hasta = inicioDeClave(sumarDias(hoy(), DIAS_PRIMERA));
    const r = await pedir(ciudad, `&dias=1&hasta=${iso(hasta)}`, token);
    metas.set(ciudad, { ...metaVacia(), hasta, dias: r.dias ?? null, generos: r.generos ?? null });
    guardarEventos(ciudad, r.eventos);
    marcarDescarga(ciudad, 'agenda', token);
    avisar(ciudad);
  });
}

// ¿Quedan días con eventos después de lo cargado?
export function hayMas(a: Agenda) {
  if (!Number.isFinite(a.hasta) || !a.dias?.length) return false;
  return inicioDeClave(a.dias[a.dias.length - 1]) >= a.hasta;
}

// Los DIAS_MAS días siguientes a lo cargado (al llegar al final de la lista).
export function cargarMas(ciudad: string, token: string | null) {
  const a = instantanea(ciudad);
  if (!hayMas(a)) return Promise.resolve();
  return unaVez(`mas-${ciudad}`, async () => {
    const desde = a.hasta;
    const hasta = inicioDeClave(sumarDias(claveDia(iso(desde + 12 * 36e5)), DIAS_MAS));
    const r = await pedir(ciudad, `&desde=${iso(desde)}&hasta=${iso(hasta)}`, token);
    const m = metaDe(ciudad);
    if (m.hasta !== desde) return; // mientras tanto se recargó la agenda
    unir(ciudad, r.eventos);
    metas.set(ciudad, { ...m, hasta });
    avisar(ciudad);
  });
}

export function cubreDia(a: Agenda, clave: string) {
  return inicioDeClave(sumarDias(clave, 1)) <= a.hasta || a.diasSueltos.has(clave);
}

// Un día elegido en la tira o el calendario que todavía no se bajó.
export function asegurarDia(ciudad: string, clave: string, token: string | null) {
  if (cubreDia(instantanea(ciudad), clave)) return Promise.resolve();
  return unaVez(`dia-${ciudad}-${clave}`, async () => {
    const r = await pedir(ciudad, `&desde=${iso(inicioDeClave(clave))}&hasta=${iso(inicioDeClave(sumarDias(clave, 1)))}`, token);
    unir(ciudad, r.eventos);
    const m = metaDe(ciudad);
    metas.set(ciudad, { ...m, diasSueltos: new Set([...m.diasSueltos, clave]) });
    avisar(ciudad);
  });
}

// Todos los eventos de una categoría (de todas las fechas): son pocos comparados con la agenda entera.
export function asegurarGenero(ciudad: string, genero: string, token: string | null) {
  if (instantanea(ciudad).generosCompletos.has(genero)) return Promise.resolve();
  return unaVez(`genero-${ciudad}-${genero}`, async () => {
    const r = await pedir(ciudad, `&dias=1&genero=${encodeURIComponent(genero)}`, token);
    unir(ciudad, r.eventos);
    const m = metaDe(ciudad);
    metas.set(ciudad, {
      ...m,
      diasPorGenero: { ...m.diasPorGenero, [genero]: r.dias ?? [] },
      generosCompletos: new Set([...m.generosCompletos, genero]),
    });
    avisar(ciudad);
  });
}

// ¿Se muestra este evento en la lista del inicio? Solo lo que está cubierto entero (para no dejar días a medias).
export function cubierto(a: Agenda, e: Evento, genero: string | null) {
  return new Date(e.inicio).getTime() < a.hasta
    || a.diasSueltos.has(claveDia(e.inicio))
    || (genero !== null && a.generosCompletos.has(genero) && e.generos.includes(genero));
}

// Búsqueda en toda la agenda (el servidor revisa todas las fechas). Los resultados quedan para abrir el evento al instante.
export async function buscarEnServidor(ciudad: string, q: string, token: string | null) {
  const r = await pedir(ciudad, `&limite=80&q=${encodeURIComponent(q)}`, token);
  const base = eventosGuardados(ciudad) ?? [];
  const nuevos = r.eventos.filter((e) => !base.some((x) => x.id === e.id));
  if (nuevos.length) {
    // Quedan guardados (para abrir el evento al instante); la lista del inicio no cambia: cubierto() los deja fuera.
    unir(ciudad, nuevos, base);
    avisar(ciudad);
  }
  return r.eventos;
}
