import type { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { toDay, type CollectionTypeValue } from './schemas';

/** Coloris visible en boutique (mêmes règles que la page Boutique). */
function visibleColorway(now: Date): Prisma.ColorwayWhereInput {
  return {
    isActive: true,
    publishedAt: { lte: now },
    product: { isActive: true, brand: { isActive: true } },
    variants: { some: { isActive: true, stock: { gt: 0 } } },
  };
}

/** Une paire telle que l'admin la voit dans une collection, avec la raison si elle n'est pas en boutique. */
export type CollectionPair = {
  colorwayId: string;
  label: string;
  imageUrl: string | null;
  price: number;
  /** null : visible en boutique. */
  hiddenReason: 'brouillon' | 'masqué' | 'rupture' | null;
};

const PAIR_SELECT = {
  id: true,
  name: true,
  price: true,
  isActive: true,
  publishedAt: true,
  totalStock: true,
  product: { select: { name: true, isActive: true, brand: { select: { name: true } } } },
  images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
} satisfies Prisma.ColorwaySelect;

function toPair(c: Prisma.ColorwayGetPayload<{ select: typeof PAIR_SELECT }>, now: Date): CollectionPair {
  const hiddenReason = !c.product.isActive || !c.publishedAt || c.publishedAt > now ? 'brouillon' : !c.isActive ? 'masqué' : c.totalStock <= 0 ? 'rupture' : null;
  return {
    colorwayId: c.id,
    label: `${c.product.brand.name} ${c.product.name} · ${c.name}`,
    imageUrl: productImageUrl(c.images[0]?.url),
    price: c.price,
    hiddenReason,
  };
}

export type AdminCollectionRow = {
  id: string;
  name: string;
  slug: string;
  type: CollectionTypeValue;
  isActive: boolean;
  showOnHome: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  pairs: number;
  /** Paires réellement visibles en boutique. */
  visiblePairs: number;
  thumbnails: string[];
};

/** Toutes les collections : d'abord celles de l'accueil (dans leur ordre), puis les plus récentes. */
export async function listAdminCollections(): Promise<AdminCollectionRow[]> {
  const now = new Date();
  const rows = await withDbRetry(() =>
    prisma.collection.findMany({
      orderBy: [{ showOnHome: 'desc' }, { homePosition: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        isActive: true,
        showOnHome: true,
        startsAt: true,
        endsAt: true,
        _count: { select: { items: true } },
        items: {
          where: { colorway: visibleColorway(now) },
          orderBy: { position: 'asc' },
          select: { colorway: { select: { images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } } } },
        },
      },
    }),
  );
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    type: c.type,
    isActive: c.isActive,
    showOnHome: c.showOnHome,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    pairs: c._count.items,
    visiblePairs: c.items.length,
    thumbnails: c.items.flatMap((i) => {
      const url = productImageUrl(i.colorway.images[0]?.url);
      return url ? [url] : [];
    }).slice(0, 4),
  }));
}

export type CollectionForEdit = {
  id: string;
  updatedAt: string;
  name: string;
  slug: string;
  description: string;
  type: CollectionTypeValue;
  isActive: boolean;
  showOnHome: boolean;
  startsOn: string;
  endsOn: string;
  pairs: CollectionPair[];
  /** « Mot de la collection » par coloris. */
  notes: Record<string, string>;
  /** Promotions qui visent cette collection (information). */
  promotions: Array<{ id: string; name: string }>;
};

export async function getCollectionForEdit(id: string): Promise<CollectionForEdit | null> {
  const now = new Date();
  const c = await withDbRetry(() =>
    prisma.collection.findUnique({
      where: { id },
      select: {
        id: true,
        updatedAt: true,
        name: true,
        slug: true,
        description: true,
        type: true,
        isActive: true,
        showOnHome: true,
        startsAt: true,
        endsAt: true,
        items: { orderBy: { position: 'asc' }, select: { note: true, colorway: { select: PAIR_SELECT } } },
        promotionTargets: { select: { promotion: { select: { id: true, name: true } } } },
      },
    }),
  );
  if (!c) return null;
  return {
    id: c.id,
    updatedAt: c.updatedAt.toISOString(),
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    type: c.type,
    isActive: c.isActive,
    showOnHome: c.showOnHome,
    startsOn: toDay(c.startsAt),
    endsOn: toDay(c.endsAt, true),
    pairs: c.items.map((i) => toPair(i.colorway, now)),
    notes: Object.fromEntries(c.items.flatMap((i) => (i.note ? [[i.colorway.id, i.note]] : []))),
    promotions: c.promotionTargets.map((t) => t.promotion),
  };
}

/** Tous les coloris qu'on peut ajouter à une sélection (le catalogue reste petit : recherche côté navigateur). */
export async function getPairOptions(): Promise<CollectionPair[]> {
  const now = new Date();
  const rows = await withDbRetry(() =>
    prisma.colorway.findMany({
      orderBy: [{ product: { brand: { name: 'asc' } } }, { product: { name: 'asc' } }, { name: 'asc' }],
      select: PAIR_SELECT,
    }),
  );
  return rows.map((c) => toPair(c, now));
}
