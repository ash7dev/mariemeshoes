import type { Metadata } from 'next';
import { getPromotionFormOptions } from '@/features/promotions/admin-queries';
import PromotionForm from '@/features/promotions/components/PromotionForm';

export const metadata: Metadata = {
  title: 'Nouvelle promotion · Administration',
  robots: { index: false, follow: false },
};

export default async function NewPromotionPage() {
  const options = await getPromotionFormOptions();
  return <PromotionForm options={options} />;
}
