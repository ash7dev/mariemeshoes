import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import type { GenderValue } from './schemas';
import type { FeaturedState } from './featured';

/** Suggestions du formulaire : marques et catégories existantes (on peut aussi en saisir une nouvelle). */
export async function getProductFormOptions(): Promise<{ brands: string[]; categories: string[] }> {
  const [brands, categories] = await Promise.all([
    withDbRetry(() => prisma.brand.findMany({ where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { name: true } })),
    withDbRetry(() => prisma.category.findMany({ where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { name: true } })),
  ]);
  return { brands: brands.map((b) => b.name), categories: categories.map((c) => c.name) };
}

export type ProductForEdit = {
  id: string;
  updatedAt: string;
  isActive: boolean;
  name: string;
  slug: string;
  brandName: string;
  categoryName: string;
  gender: GenderValue;
  description: string;
  sizeAdvice: string;
  colorways: Array<{
    id: string;
    name: string;
    slug: string;
    styleCode: string;
    price: number;
    compareAtPrice: number | null;
    isActive: boolean;
    images: Array<{ path: string; url: string; alt: string; width: number | null; height: number | null }>;
    variants: Array<{ id: string; sizeEu: number; stock: number; sku: string; isActive: boolean }>;
  }>;
};

/** Produit complet pour le formulaire de modification (null s'il n'existe pas). */
export async function getProductForEdit(id: string): Promise<ProductForEdit | null> {
  const product = await withDbRetry(() =>
    prisma.product.findUnique({
      where: { id },
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        colorways: {
          orderBy: { createdAt: 'asc' },
          include: {
            images: { orderBy: { position: 'asc' } },
            variants: { orderBy: { sizeEu: 'asc' } },
          },
        },
      },
    }),
  );
  if (!product) return null;

  return {
    id: product.id,
    updatedAt: product.updatedAt.toISOString(),
    isActive: product.isActive,
    name: product.name,
    slug: product.slug,
    brandName: product.brand.name,
    categoryName: product.category?.name ?? '',
    gender: product.gender,
    description: product.description ?? '',
    sizeAdvice: product.sizeAdvice ?? '',
    colorways: product.colorways.map((colorway) => ({
      id: colorway.id,
      name: colorway.name,
      slug: colorway.slug,
      styleCode: colorway.styleCode ?? '',
      price: colorway.price,
      compareAtPrice: colorway.compareAtPrice,
      isActive: colorway.isActive,
      images: colorway.images.map((image) => ({
        path: image.url,
        url: productImageUrl(image.url) ?? '',
        alt: image.alt ?? '',
        width: image.width,
        height: image.height,
      })),
      variants: colorway.variants.map((variant) => ({
        id: variant.id,
        sizeEu: variant.sizeEu,
        stock: variant.stock,
        sku: variant.sku,
        isActive: variant.isActive,
      })),
    })),
  };
}

export async function getFeaturedState(productId: string): Promise<FeaturedState> {
  const now = new Date();
  const [current, candidates] = await withDbRetry(() =>
    Promise.all([
      prisma.colorway.findFirst({
        where: { featuredUntil: { gt: now } },
        select: { id: true, name: true, featuredUntil: true, product: { select: { id: true, name: true } } },
      }),
      prisma.colorway.findMany({
        where: { productId, isActive: true, publishedAt: { not: null } },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true },
      }),
    ]),
  );
  return {
    current: current?.featuredUntil
      ? { colorwayId: current.id, productId: current.product.id, label: `${current.product.name} · ${current.name}`, until: current.featuredUntil.toISOString() }
      : null,
    candidates,
  };
}
