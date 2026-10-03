import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getPromotionForEdit, getPromotionFormOptions } from '@/features/promotions/admin-queries';
import PromotionForm from '@/features/promotions/components/PromotionForm';

export const metadata: Metadata = {
  title: 'Modifier la promotion · Administration',
  robots: { index: false, follow: false },
};

export default async function EditPromotionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [promotion, options] = await Promise.all([getPromotionForEdit(id), getPromotionFormOptions()]);
  if (!promotion) notFound();

  return (
    <PromotionForm
      // Nouvelle version en base (après enregistrement) : le formulaire repart des données fraîches.
      key={promotion.updatedAt}
      options={options}
      promotion={promotion}
      notice={ok === 'creee' || ok === 'modifiee' ? ok : undefined}
    />
  );
}
