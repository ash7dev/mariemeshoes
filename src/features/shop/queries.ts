import { cache } from 'react';
import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { getLiveAutomaticPromotions } from '@/features/promotions/queries';
import { bestAutomaticPromotion, type PromotionRule } from '@/features/promotions/rules';
import { refreshBestsellers } from '@/features/collections/services/bestsellers';
import { GENRE_GENDERS, PRICE_RANGES, SHOP_PAGE_SIZE, type ShopParams } from './params';

/** Une paire est « nouvelle » pendant 14 jours après sa mise en ligne. */
const NEW_FOR_DAYS = 14;
/** En dessous de ce stock dans la pointure du client : « Plus que N en 43 ». */
const LOW_STOCK = 2;

export type ShopSwatch = { slug: string; name: string; imageUrl: string | null; current: boolean };

export type ShopCard = {
  id: string;
  href: string;
  brand: string;
  model: string;
  colorway: string;
  imageUrl: string | null;
  imageAlt: string;
  /** Prix payé (après prix barré ou promotion automatique). */
  price: number;
  /** Prix barré, ou null. */
  struck: number | null;
  /** Remise arrondie en %, ou null. */
  discountPercent: number | null;
  /** Pointures en stock, croissantes. */
  sizes: number[];
  /** Stock dans la pointure du client (null : pas de pointure choisie). */
  stockInSize: number | null;
  badge: { tone: 'promo' | 'info'; label: string } | null;
  swatches: ShopSwatch[];
};

export type SizeCount = { size: number; count: number };
export type FacetOption = { slug: string; name: string };

export type ShopCollectionTile = { slug: string; name: string; description: string | null; imageUrl: string | null; count: number };

export type ShopPage = {
  cards: ShopCard[];
  /** Modèles répondant aux filtres et à la pointure, coup de cœur compris. */
  total: number;
  hasMore: boolean;
  featured: ShopCard | null;
  collectionTile: ShopCollectionTile | null;
  /** Modèles disponibles par pointure, avec les autres filtres appliqués. */
  sizeCounts: SizeCount[];
  /** La boutique a-t-elle au moins une paire en ligne (tous filtres confondus) ? */
  catalogEmpty: boolean;
  facets: { brands: FacetOption[]; categories: FacetOption[]; collections: FacetOption[] };
  fastestDelivery: { zone: string; delay: string } | null;
};

export const IN_STOCK = { isActive: true, stock: { gt: 0 } } satisfies Prisma.VariantWhereInput;

/** Coloris visible en boutique : actif, publié, modèle et marque actifs, au moins une pointure en stock. */
export function visibleWhere(now: Date): Prisma.ColorwayWhereInput {
  return {
    isActive: true,
    publishedAt: { lte: now },
    product: { isActive: true, brand: { isActive: true } },
    variants: { some: IN_STOCK },
  };
}

/** Filtres de l'URL (sans la pointure). */
function filtersWhere(params: ShopParams, now: Date): Prisma.ColorwayWhereInput[] {
  const and: Prisma.ColorwayWhereInput[] = [];
  if (params.genre) and.push({ product: { gender: { in: GENRE_GENDERS[params.genre] } } });
  if (params.marques.length) and.push({ product: { brand: { slug: { in: params.marques } } } });
  if (params.categorie) and.push({ product: { category: { slug: params.categorie, isActive: true } } });
  if (params.prix) {
    const { min, max } = PRICE_RANGES[params.prix];
    and.push({ price: { ...(min !== null ? { gte: min } : {}), ...(max !== null ? { lte: max } : {}) } });
  }
  if (params.collection) {
    and.push({ collectionItems: { some: { collection: { slug: params.collection, ...liveCollection(now) } } } });
  }
  return and;
}

export function liveCollection(now: Date): Prisma.CollectionWhereInput {
  return {
    isActive: true,
    AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }],
  };
}

export function cardSelect(now: Date) {
  return {
    id: true,
    name: true,
    slug: true,
    price: true,
    compareAtPrice: true,
    publishedAt: true,
    images: { orderBy: { position: 'asc' }, take: 1, select: { url: true, alt: true } },
    variants: { where: IN_STOCK, orderBy: { sizeEu: 'asc' }, select: { sizeEu: true, stock: true } },
    collectionItems: { select: { collectionId: true } },
    product: {
      select: {
        name: true,
        brandId: true,
        categoryId: true,
        brand: { select: { name: true } },
        colorways: {
          where: { isActive: true, publishedAt: { lte: now }, variants: { some: IN_STOCK } },
          orderBy: { createdAt: 'asc' },
          take: 6,
          select: { slug: true, name: true, images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } },
        },
      },
    },
  } satisfies Prisma.ColorwaySelect;
}

export type CardRow = Prisma.ColorwayGetPayload<{ select: ReturnType<typeof cardSelect> }>;

export function toCard(row: CardRow, size: number | null, promotions: PromotionRule[], now: Date): ShopCard {
  let price = row.price;
  let struck: number | null = null;
  if (row.compareAtPrice !== null && row.compareAtPrice > row.price) {
    struck = row.compareAtPrice;
  } else {
    const best = bestAutomaticPromotion(
      {
        key: row.id,
        colorwayId: row.id,
        brandId: row.product.brandId,
        categoryId: row.product.categoryId,
        collectionIds: row.collectionItems.map((item) => item.collectionId),
        unitPrice: row.price,
        compareAtPrice: null,
        quantity: 1,
      },
      promotions,
      now,
    );
    if (best) {
      price = row.price - best.unitDiscount;
      struck = row.price;
    }
  }
  const discountPercent = struck ? Math.max(1, Math.round(((struck - price) / struck) * 100)) : null;

  const stockInSize = size === null ? null : (row.variants.find((v) => v.sizeEu === size)?.stock ?? 0);
  const isNew = row.publishedAt !== null && now.getTime() - row.publishedAt.getTime() < NEW_FOR_DAYS * 86_400_000;
  const badge: ShopCard['badge'] = discountPercent
    ? { tone: 'promo', label: `−${discountPercent} %` }
    : stockInSize !== null && stockInSize > 0 && stockInSize <= LOW_STOCK
      ? { tone: 'info', label: `Plus que ${stockInSize} en ${size}` }
      : isNew
        ? { tone: 'info', label: 'Nouveau' }
        : null;

  const image = row.images[0];
  return {
    id: row.id,
    href: `/produits/${row.slug}`,
    brand: row.product.brand.name,
    model: row.product.name,
    colorway: row.name,
    imageUrl: productImageUrl(image?.url),
    imageAlt: image?.alt || `${row.product.brand.name} ${row.product.name}, ${row.name}`,
    price,
    struck,
    discountPercent,
    sizes: row.variants.map((v) => v.sizeEu),
    stockInSize,
    badge,
    swatches: row.product.colorways.map((c) => ({
      slug: c.slug,
      name: c.name,
      imageUrl: productImageUrl(c.images[0]?.url),
      current: c.slug === row.slug,
    })),
  };
}

const ORDER_BY: Record<ShopParams['tri'], Prisma.ColorwayOrderByWithRelationInput[]> = {
  nouveautes: [{ publishedAt: 'desc' }, { id: 'asc' }],
  'prix-croissant': [{ price: 'asc' }, { id: 'asc' }],
  'prix-decroissant': [{ price: 'desc' }, { id: 'asc' }],
};

/**
 * Tout ce que la page Boutique affiche, en une fois.
 * `size` : pointure du client (cookie), ou null. Seules les paires disponibles
 * dans cette pointure sont listées.
 */
export async function getShopPage(params: ShopParams, size: number | null): Promise<ShopPage> {
  // Collections « Meilleures ventes » : remises à jour au plus toutes les 15 minutes ; une erreur ne bloque pas la page.
  await refreshBestsellers().catch((error) => console.error('Recalcul des meilleures ventes impossible', error));
  const now = new Date();
  const visible = visibleWhere(now);
  const filters = filtersWhere(params, now);
  const inSize: Prisma.ColorwayWhereInput[] = size === null ? [] : [{ variants: { some: { ...IN_STOCK, sizeEu: size } } }];
  const where: Prisma.ColorwayWhereInput = { AND: [visible, ...filters, ...inSize] };
  const select = cardSelect(now);
  const take = params.page * SHOP_PAGE_SIZE;

  const [promotions, featuredRow, rows, total, sizeRows, catalogCount, brands, categories, collections, zone] = await withDbRetry(() =>
    Promise.all([
      getLiveAutomaticPromotions(now),
      prisma.colorway.findFirst({ where: { AND: [visible, ...filters, ...inSize, { featuredUntil: { gt: now } }] }, select }),
      // +2 : le coup de cœur peut en faire partie, et une ligne de plus dit s'il en reste.
      prisma.colorway.findMany({ where, orderBy: ORDER_BY[params.tri], take: take + 2, select }),
      prisma.colorway.count({ where }),
      prisma.variant.findMany({
        where: { ...IN_STOCK, colorway: { AND: [visible, ...filters] } },
        select: { sizeEu: true },
      }),
      prisma.colorway.count({ where: visible }),
      prisma.brand.findMany({ where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { slug: true, name: true } }),
      prisma.category.findMany({ where: { isActive: true }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { slug: true, name: true } }),
      prisma.collection.findMany({
        where: { ...liveCollection(now), items: { some: { colorway: visible } } },
        orderBy: [{ homePosition: 'asc' }, { name: 'asc' }],
        select: {
          slug: true,
          name: true,
          description: true,
          coverImageUrl: true,
          showOnHome: true,
          items: {
            where: { colorway: visible },
            orderBy: { position: 'asc' },
            select: { colorway: { select: { images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } } } },
          },
        },
      }),
      prisma.deliveryZone.findFirst({ where: { isActive: true, estimatedDelay: { not: null } }, orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { name: true, estimatedDelay: true } }),
    ]),
  );

  // Le coup de cœur (qui répond aux mêmes filtres) est en tête : il ne revient pas dans la grille.
  const featured = featuredRow ? toCard(featuredRow, size, promotions, now) : null;
  const listed = rows.filter((row) => row.id !== featuredRow?.id);
  const hasMore = listed.length > take;
  const cards = listed.slice(0, take).map((row) => toCard(row, size, promotions, now));

  // Une variante = une pointure d'un coloris (unique) : compter les lignes suffit.
  const bySize = new Map<number, number>();
  for (const { sizeEu } of sizeRows) bySize.set(sizeEu, (bySize.get(sizeEu) ?? 0) + 1);

  // Tuile : la première collection mise en avant (sinon la première en cours), si aucune n'est déjà filtrée.
  const tileSource = params.collection ? null : (collections.find((c) => c.showOnHome) ?? collections[0] ?? null);
  const collectionTile: ShopCollectionTile | null = tileSource
    ? {
        slug: tileSource.slug,
        name: tileSource.name,
        description: tileSource.description,
        imageUrl: productImageUrl(tileSource.coverImageUrl) ?? productImageUrl(tileSource.items[0]?.colorway.images[0]?.url),
        count: tileSource.items.length,
      }
    : null;

  return {
    cards,
    total,
    hasMore,
    featured,
    collectionTile,
    sizeCounts: [...bySize].map(([s, count]) => ({ size: s, count })).sort((a, b) => a.size - b.size),
    catalogEmpty: catalogCount === 0,
    facets: {
      brands,
      categories,
      collections: collections.map(({ slug, name }) => ({ slug, name })),
    },
    fastestDelivery: zone?.estimatedDelay ? { zone: zone.name, delay: zone.estimatedDelay } : null,
  };
}

export type MenuCollection = { slug: string; name: string; count: number };

/**
 * Collections du menu « Collections » (header ordinateur) : en cours, avec au moins une
 * paire visible. Les collections mises en avant d'abord, dans l'ordre de l'accueil.
 */
export async function getMenuCollections(): Promise<MenuCollection[]> {
  const now = new Date();
  const visible = visibleWhere(now);
  const rows = await withDbRetry(() =>
    prisma.collection.findMany({
      where: { ...liveCollection(now), items: { some: { colorway: visible } } },
      orderBy: [{ showOnHome: 'desc' }, { homePosition: 'asc' }, { name: 'asc' }],
      take: 12,
      select: { slug: true, name: true, _count: { select: { items: { where: { colorway: visible } } } } },
    }),
  );
  return rows.map((c) => ({ slug: c.slug, name: c.name, count: c._count.items }));
}

// -----------------------------------------------------------------------------
//  Page Marques (l'Index)
// -----------------------------------------------------------------------------

export type BrandIndexEntry = {
  slug: string;
  name: string;
  /** Modèles (coloris) en ligne. */
  models: number;
  /** Modèles disponibles dans la pointure du client (null : pas de pointure choisie). */
  inSize: number | null;
  /** Prix d'entrée, promotions comprises. */
  fromPrice: number;
  /** Modèles phares : les noms qui ont le plus de coloris en ligne. */
  highlights: string[];
  /** Paires vendues sur 90 jours (tri « Les plus vendues »). */
  sold: number;
  /** 4 paires à montrer quand la marque est dépliée (dans la pointure d'abord). */
  preview: ShopCard[];
};

const BRAND_PREVIEW = 4;

/** Toutes les marques actives qui ont au moins une paire en ligne, avec leurs chiffres. */
export async function getBrandIndex(size: number | null): Promise<BrandIndexEntry[]> {
  const now = new Date();
  const select = { ...cardSelect(now), product: { select: { ...cardSelect(now).product.select, brand: { select: { name: true, slug: true } } } } };

  const [promotions, rows, sales] = await withDbRetry(() =>
    Promise.all([
      getLiveAutomaticPromotions(now),
      prisma.colorway.findMany({ where: visibleWhere(now), orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], select }),
      prisma.$queryRaw<Array<{ slug: string; sold: number }>>`
        SELECT b.slug, sum(oi.quantity)::int AS sold
          FROM order_items oi
          JOIN orders o     ON o.id = oi.order_id
          JOIN variants v   ON v.id = oi.variant_id
          JOIN colorways c  ON c.id = v.colorway_id
          JOIN products p   ON p.id = c.product_id
          JOIN brands b     ON b.id = p.brand_id
         WHERE o.status IN ('CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED')
           AND o.created_at >= now() - interval '90 days'
         GROUP BY b.slug`,
    ]),
  );
  const soldBySlug = new Map(sales.map((s) => [s.slug, s.sold]));

  const byBrand = new Map<string, { name: string; slug: string; cards: ShopCard[]; productNames: Map<string, number> }>();
  for (const row of rows) {
    const { slug, name } = row.product.brand;
    let entry = byBrand.get(slug);
    if (!entry) byBrand.set(slug, (entry = { name, slug, cards: [], productNames: new Map() }));
    entry.cards.push(toCard(row, size, promotions, now));
    entry.productNames.set(row.product.name, (entry.productNames.get(row.product.name) ?? 0) + 1);
  }

  return [...byBrand.values()]
    .map(({ name, slug, cards, productNames }) => {
      const fitting = size === null ? cards : cards.filter((c) => (c.stockInSize ?? 0) > 0);
      const others = size === null ? [] : cards.filter((c) => !c.stockInSize);
      return {
        slug,
        name,
        models: cards.length,
        inSize: size === null ? null : fitting.length,
        fromPrice: Math.min(...cards.map((c) => c.price)),
        highlights: [...productNames].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n),
        sold: soldBySlug.get(slug) ?? 0,
        preview: [...fitting, ...others].slice(0, BRAND_PREVIEW),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// -----------------------------------------------------------------------------
//  Fiche produit (une page = un coloris)
// -----------------------------------------------------------------------------

export type ProductPageSize = { variantId: string; size: number; stock: number };
export type ProductPageImage = { url: string; alt: string };

export type ProductPage = {
  card: ShopCard;
  slug: string;
  brandSlug: string;
  description: string | null;
  sizeAdvice: string | null;
  images: ProductPageImage[];
  /** Pointures en vente du coloris, en stock ou non (épuisées barrées). */
  sizes: ProductPageSize[];
  /** Tous les coloris en ligne du modèle (même épuisés), le coloris affiché compris. */
  colorways: Array<ShopSwatch & { soldOut: boolean }>;
  /** Zone de livraison la plus proche (première zone active avec un délai). */
  delivery: { zone: string; delay: string | null; fee: number } | null;
  /** Autres paires disponibles dans la pointure du client (ou les plus récentes). */
  recommendations: ShopCard[];
};

/**
 * Fiche d'un coloris en ligne ; null s'il n'existe pas ou n'est pas publié.
 * Mise en cache le temps d'une requête : les métadonnées et la page la lisent une seule fois.
 */
export const getProductPage = cache(async function getProductPage(slug: string, size: number | null): Promise<ProductPage | null> {
  const now = new Date();
  const published: Prisma.ColorwayWhereInput = {
    slug,
    isActive: true,
    publishedAt: { lte: now },
    product: { isActive: true, brand: { isActive: true } },
  };

  const [promotions, row, extra, zone] = await withDbRetry(() =>
    Promise.all([
      getLiveAutomaticPromotions(now),
      prisma.colorway.findFirst({ where: published, select: cardSelect(now) }),
      prisma.colorway.findFirst({
        where: published,
        select: {
          id: true,
          images: { orderBy: { position: 'asc' }, select: { url: true, alt: true } },
          variants: { where: { isActive: true }, orderBy: { sizeEu: 'asc' }, select: { id: true, sizeEu: true, stock: true } },
          product: {
            select: {
              id: true,
              description: true,
              sizeAdvice: true,
              brand: { select: { slug: true } },
              colorways: {
                where: { isActive: true, publishedAt: { lte: now } },
                orderBy: { createdAt: 'asc' },
                select: {
                  slug: true,
                  name: true,
                  totalStock: true,
                  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
                },
              },
            },
          },
        },
      }),
      prisma.deliveryZone.findFirst({
        where: { isActive: true },
        orderBy: [{ position: 'asc' }, { name: 'asc' }],
        select: { name: true, estimatedDelay: true, fee: true },
      }),
    ]),
  );
  if (!row || !extra) return null;

  // Recommandations : autres modèles, dans la pointure du client si elle est connue.
  const recoRows = await withDbRetry(() =>
    prisma.colorway.findMany({
      where: {
        AND: [
          visibleWhere(now),
          { productId: { not: extra.product.id } },
          ...(size === null ? [] : [{ variants: { some: { ...IN_STOCK, sizeEu: size } } }]),
        ],
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      take: 4,
      select: cardSelect(now),
    }),
  );

  const card = toCard(row, size, promotions, now);
  return {
    card,
    slug,
    brandSlug: extra.product.brand.slug,
    description: extra.product.description,
    sizeAdvice: extra.product.sizeAdvice,
    images: extra.images.flatMap((image) => {
      const url = productImageUrl(image.url);
      return url ? [{ url, alt: image.alt || `${card.brand} ${card.model}, ${card.colorway}` }] : [];
    }),
    sizes: extra.variants.map((v) => ({ variantId: v.id, size: v.sizeEu, stock: v.stock })),
    colorways: extra.product.colorways.map((c) => ({
      slug: c.slug,
      name: c.name,
      imageUrl: productImageUrl(c.images[0]?.url),
      current: c.slug === slug,
      soldOut: c.totalStock <= 0,
    })),
    delivery: zone ? { zone: zone.name, delay: zone.estimatedDelay, fee: zone.fee } : null,
    recommendations: recoRows.map((r) => toCard(r, size, promotions, now)),
  };
});
