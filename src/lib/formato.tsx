// Formato de los mensajes, como en Telegram: *negrita*, _cursiva_, __subrayado__, ~tachado~ y ||spoiler||.
// El texto viaja y se guarda tal cual (con las marcas); aquí se convierte en estilos al mostrarlo.
// Una marca solo cuenta si abre pegada a una palabra y cierra pegada a otra ("a * b" no es negrita),
// y no en medio de una palabra (en "nombre_de_archivo" no hay cursiva).
import { useState, type ReactNode } from 'react';
import { Text, type TextStyle } from 'react-native';

export type Formato = 'negrita' | 'cursiva' | 'subrayado' | 'tachado' | 'spoiler';
type Nodo = string | { formato: Formato; hijos: Nodo[] };

// Las de dos caracteres primero: "__" es subrayado, no dos cursivas.
export const MARCAS: [string, Formato][] = [['||', 'spoiler'], ['__', 'subrayado'], ['*', 'negrita'], ['_', 'cursiva'], ['~', 'tachado']];
export const MARCA_DE = Object.fromEntries(MARCAS.map(([m, f]) => [f, m])) as Record<Formato, string>;

const esPalabra = (c: string | undefined) => Boolean(c && /[\p{L}\p{N}]/u.test(c));
const esEspacio = (c: string | undefined) => !c || /\s/.test(c);

function analizar(texto: string): Nodo[] {
  const nodos: Nodo[] = [];
  let suelto = '';
  let i = 0;
  while (i < texto.length) {
    let hallado: { fin: number; marca: string; formato: Formato } | null = null;
    if (!esPalabra(texto[i - 1])) {
      for (const [marca, formato] of MARCAS) {
        if (!texto.startsWith(marca, i) || esEspacio(texto[i + marca.length])) continue;
        // Cierre: la misma marca, pegada al texto y sin una letra justo después.
        let j = texto.indexOf(marca, i + marca.length + 1);
        while (j !== -1 && (esEspacio(texto[j - 1]) || esPalabra(texto[j + marca.length]))) j = texto.indexOf(marca, j + 1);
        if (j !== -1) {
          hallado = { fin: j, marca, formato };
          break;
        }
      }
    }
    if (!hallado) {
      suelto += texto[i];
      i += 1;
      continue;
    }
    if (suelto) nodos.push(suelto);
    suelto = '';
    nodos.push({ formato: hallado.formato, hijos: analizar(texto.slice(i + hallado.marca.length, hallado.fin)) });
    i = hallado.fin + hallado.marca.length;
  }
  if (suelto) nodos.push(suelto);
  return nodos;
}

// Texto sin marcas, para vistas previas (Mis canales, mensaje fijado, citas). El spoiler no se revela.
export function quitarFormato(texto: string): string {
  const plano = (nodos: Nodo[]): string =>
    nodos.map((n) => (typeof n === 'string' ? n : n.formato === 'spoiler' ? '•••' : plano(n.hijos))).join('');
  return plano(analizar(texto));
}

const ESTILO: Record<Exclude<Formato, 'spoiler'>, TextStyle> = {
  negrita: { fontWeight: '700' },
  cursiva: { fontStyle: 'italic' },
  subrayado: { textDecorationLine: 'underline' },
  tachado: { textDecorationLine: 'line-through' },
};

// Spoiler: un bloque del color del texto que se descubre al tocarlo.
function Spoiler({ hijos, color }: { hijos: ReactNode; color: string }) {
  const [visto, setVisto] = useState(false);
  return (
    <Text
      onPress={visto ? undefined : () => setVisto(true)}
      suppressHighlighting
      style={visto ? undefined : { backgroundColor: color, color }}>
      {hijos}
    </Text>
  );
}

// Piezas para poner dentro de un <Text> (la burbuja sigue con su estilo y su hora).
export function textoConFormato(texto: string, colorTexto: string): ReactNode[] {
  const dibujar = (nodos: Nodo[], ruta: string): ReactNode[] =>
    nodos.map((n, i) => {
      const clave = `${ruta}.${i}`;
      if (typeof n === 'string') return n;
      const hijos = dibujar(n.hijos, clave);
      if (n.formato === 'spoiler') return <Spoiler key={clave} hijos={hijos} color={colorTexto} />;
      return <Text key={clave} style={ESTILO[n.formato]}>{hijos}</Text>;
    });
  return dibujar(analizar(texto), 'f');
}

// Pone la marca alrededor de lo seleccionado (o la quita si ya la tenía justo alrededor).
export function aplicarFormato(texto: string, inicio: number, fin: number, formato: Formato) {
  const marca = MARCA_DE[formato];
  const antes = texto.slice(0, inicio);
  const sel = texto.slice(inicio, fin);
  const despues = texto.slice(fin);
  if (antes.endsWith(marca) && despues.startsWith(marca)) {
    return { texto: antes.slice(0, -marca.length) + sel + despues.slice(marca.length), inicio: inicio - marca.length, fin: fin - marca.length };
  }
  // Los espacios de los bordes quedan fuera de la marca (si no, no se reconocería).
  const izquierda = sel.length - sel.trimStart().length;
  const derecha = sel.length - sel.trimEnd().length;
  const centro = sel.trim();
  const nuevo = antes + sel.slice(0, izquierda) + marca + centro + marca + sel.slice(sel.length - derecha) + despues;
  const desde = inicio + izquierda + marca.length;
  return { texto: nuevo, inicio: desde, fin: desde + centro.length };
}
