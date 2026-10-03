import type { Metadata } from 'next';
import { getProductFormOptions } from '@/features/catalog/queries';
import ProductForm from '@/features/catalog/components/ProductForm';

export const metadata: Metadata = {
  title: 'Nouveau produit · Administration',
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const options = await getProductFormOptions();
  return <ProductForm options={options} />;
}
