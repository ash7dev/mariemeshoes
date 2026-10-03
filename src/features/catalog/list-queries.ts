import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { LOW_STOCK_THRESHOLD } from '@/features/admin/queries';
import type { GenderValue } from './schemas';

export const PRODUCT_STATUSES = ['tous', 'en-ligne', 'brouillons', 'stock-bas'] as const;
export type ProductStatusFilter = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_SORTS = ['recents', 'modifies', 'nom'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

export const PRODUCTS_PER_PAGE = 20;

export type ProductListParams = {
  q?: string;
  status: ProductStatusFilter;
  brand?: string;
  sort: ProductSort;
  page: number;
};

/** Lit et normalise les paramètres d'URL : toute valeur inconnue retombe sur le défaut. */
export function parseProductListParams(searchParams: Record<string, string | string[] | undefined>): ProductListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const status = one('statut') as ProductStatusFilter | undefined;
  const sort = one('tri') as ProductSort | undefined;
  const page = Number(one('page'));
  return {
    q: one('q')?.slice(0, 80),
    status: status && PRODUCT_STATUSES.includes(status) ? status : 'tous',
    brand: one('marque'),
    sort: sort && PRODUCT_SORTS.includes(sort) ? sort : 'recents',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** URL de la liste avec des filtres modifiés ; les valeurs par défaut sont omises. */
export function productListHref(params: ProductListParams, changes: Partial<ProductListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.status !== 'tous') query.set('statut', next.status);
  if (next.brand) query.set('marque', next.brand);
  if (next.sort !== 'recents') query.set('tri', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/produits?${query}` : '/admin/produits';
}

const ORDER_BY: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  recents: [{ createdAt: 'desc' }],
  modifies: [{ updatedAt: 'desc' }],
  nom: [{ name: 'asc' }],
};

/** Produit « en stock bas » : une pointure en vente, d'un coloris en vente, à 1 paire ou moins. */
const LOW_STOCK_WHERE: Prisma.ProductWhereInput = {
  colorways: { some: { isActive: true, variants: { some: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } } } } },
};

const STATUS_WHERE: Record<ProductStatusFilter, Prisma.ProductWhereInput> = {
  tous: {},
  'en-ligne': { isActive: true },
  brouillons: { isActive: false },
  'stock-bas': LOW_STOCK_WHERE,
};

export type AdminProductRow = {
  id: string;
  name: string;
  brandName: string;
  categoryName: string | null;
  gender: GenderValue;
  isActive: boolean;
  updatedAt: Date;
  /** Photo principale du premier coloris qui en a une ; null : aucune photo. */
  thumbnail: { url: string; alt: string } | null;
  /** Coloris, dans l'ordre de création, avec leurs pointures (panneau dépliable). */
  colorways: Array<{
    id: string;
    name: string;
    isActive: boolean;
    imageUrl: string | null;
    price: number;
    compareAtPrice: number | null;
    /** Paires des pointures en vente. */
    stock: number;
    variants: Array<{ id: string; sizeEu: number; stock: number; isActive: boolean; sku: string }>;
  }>;
  /** Fourchette de prix des coloris en vente (tous les coloris si aucun n'est en vente) ; null : aucun coloris. */
  price: { min: number; max: number } | null;
  /** Paires en vente (pointures et coloris en vente). */
  totalStock: number;
  sizes: { min: number; max: number; count: number } | null;
  lowStockSizes: number;
  /** Prêt à publier : au moins un coloris en vente avec une photo et une pointure en vente. */
  publishable: boolean;
};

export async function listAdminProducts(params: ProductListParams) {
  // Filtres communs (recherche, marque) : s'appliquent aussi aux compteurs des onglets.
  const q = params.q;
  const base: Prisma.ProductWhereInput = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { brand: { name: { contains: q, mode: 'insensitive' } } },
            {
              colorways: {
                some: {
                  OR: [
                    { name: { contains: q, mode: 'insensitive' } },
                    { styleCode: { contains: q, mode: 'insensitive' } },
                    { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(params.brand ? { brand: { slug: params.brand } } : {}),
  };

  const where: Prisma.ProductWhereInput = { AND: [base, STATUS_WHERE[params.status]] };

  const [products, ...counts] = await withDbRetry(() =>
    Promise.all([
      prisma.product.findMany({
        where,
        orderBy: ORDER_BY[params.sort],
        skip: (params.page - 1) * PRODUCTS_PER_PAGE,
        take: PRODUCTS_PER_PAGE,
        select: {
          id: true,
          name: true,
          gender: true,
          isActive: true,
          updatedAt: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
          colorways: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              name: true,
              price: true,
              isActive: true,
              images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
              compareAtPrice: true,
              variants: { orderBy: { sizeEu: 'asc' }, select: { id: true, sizeEu: true, stock: true, isActive: true, sku: true } },
            },
          },
        },
      }),
      ...PRODUCT_STATUSES.map((status) => prisma.product.count({ where: { AND: [base, STATUS_WHERE[status]] } })),
    ]),
  );

  const statusCounts = Object.fromEntries(PRODUCT_STATUSES.map((status, i) => [status, counts[i]])) as Record<ProductStatusFilter, number>;
  const total = statusCounts[params.status];

  const rows: AdminProductRow[] = products.map((product) => {
    const onSale = product.colorways.filter((c) => c.isActive);
    const priced = onSale.length > 0 ? onSale : product.colorways;
    const prices = priced.map((c) => c.price);
    const sellable = onSale.flatMap((c) => c.variants.filter((v) => v.isActive));
    const sizes = [...new Set(sellable.map((v) => v.sizeEu))].sort((a, b) => a - b);
    const withImage = product.colorways.find((c) => c.images.length > 0);
    const image = withImage?.images[0];

    return {
      id: product.id,
      name: product.name,
      brandName: product.brand.name,
      categoryName: product.category?.name ?? null,
      gender: product.gender,
      isActive: product.isActive,
      updatedAt: product.updatedAt,
      thumbnail: image ? { url: productImageUrl(image.url) ?? '', alt: image.alt ?? product.name } : null,
      colorways: product.colorways.map((c) => ({
        id: c.id,
        name: c.name,
        isActive: c.isActive,
        imageUrl: c.images[0] ? productImageUrl(c.images[0].url) : null,
        price: c.price,
        compareAtPrice: c.compareAtPrice,
        stock: c.variants.filter((v) => v.isActive).reduce((sum, v) => sum + v.stock, 0),
        variants: c.variants,
      })),
      price: prices.length > 0 ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
      totalStock: sellable.reduce((sum, v) => sum + v.stock, 0),
      sizes: sizes.length > 0 ? { min: sizes[0], max: sizes[sizes.length - 1], count: sizes.length } : null,
      lowStockSizes: sellable.filter((v) => v.stock <= LOW_STOCK_THRESHOLD).length,
      publishable: onSale.some((c) => c.images.length > 0 && c.variants.some((v) => v.isActive)),
    };
  });

  return { products: rows, total, statusCounts, pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PER_PAGE)) };
}

/** Marques qui ont au moins un produit (filtre de la liste). */
export async function listBrandsForFilter(): Promise<Array<{ name: string; slug: string }>> {
  return withDbRetry(() =>
    prisma.brand.findMany({
      where: { products: { some: {} } },
      orderBy: { name: 'asc' },
      select: { name: true, slug: true },
    }),
  );
}
