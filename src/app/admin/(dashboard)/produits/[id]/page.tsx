import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { getFeaturedState, getProductForEdit, getProductFormOptions } from '@/features/catalog/queries';
import ProductForm from '@/features/catalog/components/ProductForm';
import FeaturedPanel from '@/features/catalog/components/FeaturedPanel';
import DeleteProductPanel from '@/features/catalog/components/DeleteProductPanel';

export const metadata: Metadata = {
  title: 'Modifier le produit · Administration',
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const [{ id }, { ok }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();

  const [product, options, featured] = await Promise.all([getProductForEdit(id), getProductFormOptions(), getFeaturedState(id)]);
  if (!product) notFound();

  return (
    <ProductForm
      // Nouvelle version en base (après enregistrement) : le formulaire repart des données fraîches.
      key={product.updatedAt}
      options={options}
      product={product}
      notice={ok === 'modifie' ? ok : undefined}
      extra={<FeaturedPanel productOnline={product.isActive} state={featured} />}
      footer={<DeleteProductPanel productId={product.id} productName={`${product.brandName} ${product.name}`} />}
    />
  );
}
