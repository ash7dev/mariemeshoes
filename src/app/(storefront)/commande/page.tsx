import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { getStoreSettings } from '@/features/settings/queries';
import CheckoutForm from '@/features/checkout/components/CheckoutForm';

export const metadata: Metadata = {
  title: 'Commande',
  robots: { index: false, follow: false },
};

/** Commande : coordonnées, zone de livraison (liste), paiement Wave ou à la livraison. */
export default async function CommandePage() {
  const [zones, settings] = await Promise.all([
    withDbRetry(() =>
      prisma.deliveryZone.findMany({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, fee: true, estimatedDelay: true },
      }),
    ),
    getStoreSettings(),
  ]);
  return <CheckoutForm zones={zones} wavePaymentLink={settings.wavePaymentLink} />;
}
