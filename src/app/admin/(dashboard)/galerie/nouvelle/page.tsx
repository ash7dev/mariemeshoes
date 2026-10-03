import type { Metadata } from 'next';
import GalleryForm from '@/features/gallery/components/GalleryForm';
import { getPairOptions } from '@/features/collections/queries';

export const metadata: Metadata = {
  title: 'Nouvelle photo · Galerie · Administration',
  robots: { index: false, follow: false },
};

export default async function NewGalleryPostPage() {
  const options = await getPairOptions();
  return <GalleryForm options={options} />;
}
