// "Cómo llegar" en la ficha del evento: ruta en Google Maps (o Mapas en iPhone), Waze o Uber hasta el lugar,
// con las coordenadas exactas cuando las hay (si no, se busca por nombre y barrio). Los enlaces son los
// universales de cada app: abren la app si está instalada y, si no, su página web.
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Linking, Platform } from 'react-native';

import { FilaOpcion, HojaBora } from '@/components/hoja-bora';
import type { Evento } from '@/lib/api';
import { abrirDialogo } from '@/lib/dialogo';

type Destino = Pick<Evento, 'lugar' | 'barrio' | 'ciudad' | 'direccion' | 'lat' | 'lng'>;

const q = encodeURIComponent;
const textoDe = (e: Destino) => [e.lugar, e.direccion ?? e.barrio, e.ciudad].filter(Boolean).join(', ');

function enlaces(e: Destino) {
  const coord = e.lat != null && e.lng != null ? `${e.lat},${e.lng}` : null;
  const texto = textoDe(e);
  const destino = coord ?? texto;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q(destino)}`,
    apple: `http://maps.apple.com/?daddr=${q(destino)}${e.lugar ? `&q=${q(e.lugar)}` : ''}`,
    waze: coord ? `https://waze.com/ul?ll=${q(coord)}&navigate=yes` : `https://waze.com/ul?q=${q(texto)}&navigate=yes`,
    uber: coord
      ? `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${e.lat}&dropoff[longitude]=${e.lng}`
        + `&dropoff[nickname]=${q(e.lugar ?? '')}&dropoff[formatted_address]=${q(e.direccion ?? texto)}`
      : null,
    verLugar: `https://www.google.com/maps/search/?api=1&query=${q(texto)}`,
  };
}

export function HojaComoLlegar({ evento, visible, onCerrar }: { evento: Destino; visible: boolean; onCerrar: () => void }) {
  const { t: tr } = useTranslation();
  const l = enlaces(evento);
  const abrir = (url: string) => {
    onCerrar();
    Linking.openURL(url).catch(() => {});
  };
  const copiar = async () => {
    onCerrar();
    await Clipboard.setStringAsync(evento.direccion ? `${evento.lugar ? `${evento.lugar}, ` : ''}${evento.direccion}` : textoDe(evento));
    // Después de cerrar esta hoja (en iPhone no se abren dos seguidas sin esperar).
    abrirDialogo({ icono: 'ruta', titulo: tr('llegar.copiada'), botones: [{ texto: tr('comun.entendido'), tipo: 'principal' }] }, { trasHoja: true });
  };
  const opciones = [
    ...(Platform.OS === 'ios' ? [{ texto: tr('llegar.apple'), detalle: tr('llegar.rutaDetalle'), url: l.apple }] : []),
    { texto: tr('llegar.google'), detalle: tr('llegar.rutaDetalle'), url: l.google },
    { texto: tr('llegar.waze'), detalle: tr('llegar.wazeDetalle'), url: l.waze },
    ...(l.uber ? [{ texto: tr('llegar.uber'), detalle: tr('llegar.uberDetalle'), url: l.uber }] : []),
    { texto: tr('llegar.verLugar'), detalle: tr('llegar.verLugarDetalle'), url: l.verLugar },
  ];
  return (
    <HojaBora
      visible={visible}
      onCerrar={onCerrar}
      icono="ruta"
      titulo={tr('llegar.titulo')}
      texto={[evento.lugar, evento.direccion ?? evento.barrio].filter(Boolean).join(' · ') || undefined}>
      {opciones.map((o) => <FilaOpcion key={o.texto} texto={o.texto} detalle={o.detalle} flecha onPress={() => abrir(o.url)} />)}
      <FilaOpcion texto={tr('llegar.copiar')} detalle={tr('llegar.copiarDetalle')} onPress={copiar} ultima />
    </HojaBora>
  );
}
