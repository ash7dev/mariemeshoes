import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import GalleryForm from '@/features/gallery/components/GalleryForm';
import { getGalleryPostForEdit } from '@/features/gallery/queries';
import { getPairOptions } from '@/features/collections/queries';

export const metadata: Metadata = {
  title: 'Modifier la photo · Galerie · Administration',
  robots: { index: false, follow: false },
};

export default async function EditGalleryPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [post, options] = await Promise.all([getGalleryPostForEdit(id), getPairOptions()]);
  if (!post) notFound();
  return <GalleryForm post={post} options={options} />;
}
