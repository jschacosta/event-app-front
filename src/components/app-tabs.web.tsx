import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icono, Texto } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { textoCuenta, useSincronizarNoLeidos } from '@/lib/no-leidos';

// En el navegador: barra inferior translúcida, igual que en iPhone.
const PESTANAS = [
  { name: 'index', href: '/', clave: 'tabs.agenda', icono: 'calendar' },
  { name: 'chats', href: '/chats', clave: 'tabs.chats', icono: 'person.2' },
  { name: 'experiencias', href: '/experiencias', clave: 'tabs.experiencias', icono: 'star' },
  { name: 'perfil', href: '/perfil', clave: 'tabs.perfil', icono: 'person' },
] as const;

// En React 19 la ref llega como prop normal, así que no hace falta forwardRef.
function Boton({ isFocused, texto, icono, cuenta, ...props }: TabTriggerSlotProps & { texto: string; icono: (typeof PESTANAS)[number]['icono']; cuenta?: number }) {
  const t = useTheme();
  const color = isFocused ? t.accentText : t.textSecondary;
  return (
    <Pressable {...(props as object)} style={styles.boton}>
      <View>
        <Icono nombre={icono} tamano={24} color={color} />
        {cuenta ? (
          <View style={[styles.globo, { backgroundColor: t.danger, borderColor: t.background }]}>
            <Texto v="mini" style={styles.globoTexto}>{textoCuenta(cuenta)}</Texto>
          </View>
        ) : null}
      </View>
      <Texto v="mini" style={{ color, fontSize: 10, fontWeight: isFocused ? '600' : '500' }}>{texto}</Texto>
    </Pressable>
  );
}

export default function AppTabs() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const noLeidos = useSincronizarNoLeidos();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList style={[styles.barra, { borderTopColor: t.separator }]}>
        {/* El vidrio va en una capa que se sale por abajo y por los lados: así los bordes del
            desenfoque (que Chrome dibuja mal) quedan fuera de la pantalla y no se ve el fondo. */}
        <View pointerEvents="none" style={[styles.vidrio, { backgroundColor: t.bar }]} />
        {PESTANAS.map((p) => (
          <TabTrigger key={p.name} name={p.name} href={p.href} asChild>
            <Boton texto={tr(p.clave)} icono={p.icono} cuenta={p.name === 'chats' ? noLeidos : undefined} />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barra: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 64, flexDirection: 'row', overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  vidrio: {
    position: 'absolute', top: 0, left: -48, right: -48, bottom: -48,
    backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)',
  } as object,
  globo: {
    position: 'absolute', top: -5, left: 15, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2,
  },
  globoTexto: { color: '#FFFFFF', fontSize: 10, lineHeight: 12, fontWeight: '700' },
  boton: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
});
