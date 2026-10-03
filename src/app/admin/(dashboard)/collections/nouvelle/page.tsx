import type { Metadata } from 'next';
import CollectionForm from '@/features/collections/components/CollectionForm';
import { getPairOptions } from '@/features/collections/queries';

export const metadata: Metadata = {
  title: 'Nouvelle collection · Administration',
  robots: { index: false, follow: false },
};

export default async function NewCollectionPage() {
  const options = await getPairOptions();
  return <CollectionForm options={options} />;
}
