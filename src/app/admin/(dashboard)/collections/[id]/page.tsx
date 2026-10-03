import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import CollectionForm from '@/features/collections/components/CollectionForm';
import { getCollectionForEdit, getPairOptions } from '@/features/collections/queries';

export const metadata: Metadata = {
  title: 'Modifier la collection · Administration',
  robots: { index: false, follow: false },
};

export default async function EditCollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [collection, options] = await Promise.all([getCollectionForEdit(id), getPairOptions()]);
  if (!collection) notFound();

  return (
    <CollectionForm
      // Nouvelle version en base (après enregistrement) : le formulaire repart des données fraîches.
      key={collection.updatedAt}
      collection={collection}
      options={options}
      notice={ok === 'modifiee' ? ok : undefined}
    />
  );
}
