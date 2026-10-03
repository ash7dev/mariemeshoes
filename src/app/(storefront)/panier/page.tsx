import type { Metadata } from 'next';
import { getStoreSettings } from '@/features/settings/queries';
import CartPage from '@/features/cart/components/CartPage';

export const metadata: Metadata = {
  title: 'Panier',
  robots: { index: false, follow: false },
};

/** Le panier vit dans le navigateur ; ses prix sont recalculés par le serveur. */
export default async function PanierPage() {
  const settings = await getStoreSettings();
  return <CartPage whatsappNumber={settings.whatsappNumber} />;
}
