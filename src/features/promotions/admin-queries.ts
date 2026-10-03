import type { DiscountType, PromotionKind, PromotionScope } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';

export type TargetOption = { id: string; label: string; hint?: string; imageUrl?: string | null };

export type PromotionFormOptions = {
  brands: TargetOption[];
  categories: TargetOption[];
  collections: TargetOption[];
  colorways: TargetOption[];
};

/** Tout ce qu'une promotion peut cibler. */
export async function getPromotionFormOptions(): Promise<PromotionFormOptions> {
  const [brands, categories, collections, colorways] = await withDbRetry(() =>
    Promise.all([
      prisma.brand.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, _count: { select: { products: true } } } }),
      prisma.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, _count: { select: { products: true } } } }),
      prisma.collection.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, _count: { select: { items: true } } } }),
      prisma.colorway.findMany({
        orderBy: [{ product: { name: 'asc' } }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          product: { select: { name: true, brand: { select: { name: true } } } },
          images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
        },
      }),
    ]),
  );
  const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;
  return {
    brands: brands.map((b) => ({ id: b.id, label: b.name, hint: plural(b._count.products, 'modèle') })),
    categories: categories.map((c) => ({ id: c.id, label: c.name, hint: plural(c._count.products, 'modèle') })),
    collections: collections.map((c) => ({ id: c.id, label: c.name, hint: plural(c._count.items, 'coloris') })),
    colorways: colorways.map((c) => ({
      id: c.id,
      label: `${c.product.brand.name} ${c.product.name} ${c.name}`,
      hint: c.isActive ? undefined : 'masqué',
      imageUrl: productImageUrl(c.images[0]?.url),
    })),
  };
}

export type PromotionForEdit = {
  id: string;
  updatedAt: string;
  kind: PromotionKind;
  name: string;
  description: string;
  code: string;
  discountType: DiscountType;
  value: number | null;
  maxDiscount: number | null;
  scope: PromotionScope;
  targets: { brandIds: string[]; categoryIds: string[]; collectionIds: string[]; colorwayIds: string[] };
  minSubtotal: number | null;
  minPairs: number | null;
  firstOrderOnly: boolean;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  /** Commandes (non annulées) qui ont utilisé le code ; paires vendues avec la promotion automatique. */
  usage: { orders: number; pairs: number };
  /** Jamais utilisée : peut être supprimée (sinon, seulement désactivée). */
  deletable: boolean;
};

export async function getPromotionForEdit(id: string): Promise<PromotionForEdit | null> {
  const promotion = await withDbRetry(() =>
    prisma.promotion.findUnique({
      where: { id },
      include: {
        targets: true,
        _count: { select: { orders: true, orderItems: true } },
      },
    }),
  );
  if (!promotion) return null;

  const [orders, pairs] = await withDbRetry(() =>
    Promise.all([
      prisma.order.count({ where: { promotionId: id, status: { not: 'CANCELLED' } } }),
      prisma.orderItem.aggregate({ where: { promotionId: id, order: { status: { not: 'CANCELLED' } } }, _sum: { quantity: true } }),
    ]),
  );

  const ids = (key: 'brandId' | 'categoryId' | 'collectionId' | 'colorwayId') =>
    promotion.targets.flatMap((target) => (target[key] ? [target[key]] : []));

  return {
    id: promotion.id,
    updatedAt: promotion.updatedAt.toISOString(),
    kind: promotion.kind,
    name: promotion.name,
    description: promotion.description ?? '',
    code: promotion.code ?? '',
    discountType: promotion.discountType,
    value: promotion.value,
    maxDiscount: promotion.maxDiscount,
    scope: promotion.scope,
    targets: { brandIds: ids('brandId'), categoryIds: ids('categoryId'), collectionIds: ids('collectionId'), colorwayIds: ids('colorwayId') },
    minSubtotal: promotion.minSubtotal,
    minPairs: promotion.minPairs,
    firstOrderOnly: promotion.firstOrderOnly,
    usageLimit: promotion.usageLimit,
    usageLimitPerCustomer: promotion.usageLimitPerCustomer,
    stackable: promotion.stackable,
    isActive: promotion.isActive,
    startsAt: promotion.startsAt.toISOString(),
    endsAt: promotion.endsAt?.toISOString() ?? null,
    usage: { orders, pairs: pairs._sum.quantity ?? 0 },
    deletable: promotion._count.orders + promotion._count.orderItems === 0,
  };
}
