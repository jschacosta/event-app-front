import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/hooks/use-theme';
import { textoCuenta, useSincronizarNoLeidos } from '@/lib/no-leidos';

// Barra de pestañas nativa: SF Symbols en iPhone, íconos Material en Android.
export default function AppTabs() {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const noLeidos = useSincronizarNoLeidos();
  return (
    <NativeTabs tintColor={t.accentText} backgroundColor={t.bar} iconColor={{ default: t.textSecondary, selected: t.accentText }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{tr('tabs.agenda')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_today" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="chats">
        <NativeTabs.Trigger.Label>{tr('tabs.chats')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'megaphone', selected: 'megaphone.fill' }} md="campaign" />
        {/* Sin texto cuando no hay nuevos: con "0" la barra nativa muestra el globo aunque esté oculto. */}
        <NativeTabs.Trigger.Badge hidden={!noLeidos}>{noLeidos ? textoCuenta(noLeidos) : undefined}</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="experiencias">
        <NativeTabs.Trigger.Label>{tr('tabs.experiencias')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'star', selected: 'star.fill' }} md="star" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>{tr('tabs.perfil')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
