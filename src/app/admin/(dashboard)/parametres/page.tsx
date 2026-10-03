import type { Metadata } from 'next';
import { getAdminSettings } from '@/features/settings/queries';
import { ReadinessPanel, SettingsNav, type ReadinessItem } from '@/features/settings/components/settings-ui';
import StoreInfoForm from '@/features/settings/components/StoreInfoForm';
import WavePaymentForm from '@/features/settings/components/WavePaymentForm';
import DeliveryZonesManager from '@/features/settings/components/DeliveryZonesManager';
import CatalogManager from '@/features/settings/components/CatalogManager';

export const metadata: Metadata = {
  title: 'Paramètres · Administration',
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const { settings, zones, brands, categories } = await getAdminSettings();

  const activeZones = zones.filter((zone) => zone.isActive).length;
  const waveReady = Boolean(settings.waveMerchantCode || settings.wavePaymentLink);

  const readiness: ReadinessItem[] = [
    { key: 'zones', label: 'Zones de livraison', done: activeZones > 0, required: true, href: '#livraison', hint: 'Sans zone proposée, le client ne peut pas valider sa commande.' },
    { key: 'wave', label: 'Paiement Wave', done: waveReady, required: true, href: '#wave', hint: 'Le code marchand ou le lien à payer, affiché au client.' },
    { key: 'whatsapp', label: 'Numéro WhatsApp', done: Boolean(settings.whatsappNumber), required: false, href: '#boutique', hint: 'Pour que les clients t’écrivent en un clic.' },
    { key: 'socials', label: 'Instagram ou TikTok', done: Boolean(settings.instagramUrl || settings.tiktokUrl), required: false, href: '#boutique', hint: 'Affichés dans le footer de la boutique.' },
  ];

  return (
    <div className="flex flex-col gap-5 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-[2rem] leading-none lg:text-[2.625rem]">Paramètres</h1>
        <p className="text-sm text-muted-ink">Boutique, paiement, livraison et catalogue · appliqués immédiatement à la boutique.</p>
      </header>

      <ReadinessPanel items={readiness} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        <SettingsNav warnings={{ boutique: !settings.whatsappNumber, wave: !waveReady, livraison: activeZones === 0 }} />
        <div className="flex min-w-0 max-w-4xl flex-col gap-5">
          <StoreInfoForm key={`info-${settings.updatedAt}`} settings={settings} />
          <WavePaymentForm key={`wave-${settings.updatedAt}`} settings={settings} />
          <DeliveryZonesManager zones={zones} />
          <CatalogManager brands={brands} categories={categories} />
        </div>
      </div>
    </div>
  );
}
