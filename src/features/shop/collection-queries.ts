import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { getLiveAutomaticPromotions } from '@/features/promotions/queries';
import { refreshBestsellers } from '@/features/collections/services/bestsellers';
import { COLLECTION_HIGHLIGHTS } from '@/features/collections/schemas';
import { IN_STOCK, cardSelect, liveCollection, toCard, visibleWhere, type ShopCard, type SizeCount } from './queries';

const OTHERS = 3;
const NOTE_MAX = 140;

export type CollectionHighlight = {
  card: ShopCard;
  /** Mot de la collection, sinon première phrase de la description du produit. */
  note: string | null;
  sizes: Array<{ variantId: string; size: number; stock: number }>;
};

export type OtherCollection = { slug: string; name: string; count: number; imageUrl: string | null };

export type CollectionPage = {
  slug: string;
  name: string;
  description: string | null;
  /** Image de couverture choisie dans l'admin (sinon : les paires en éventail). */
  coverUrl: string | null;
  /** Photos des 3 premières paires, pour l'éventail. */
  fanImages: string[];
  /** Fin exclue (ISO), ou null : collection sans date de fin. */
  endsAt: string | null;
  /** La collection est finie : on le dit, sans afficher ses paires. */
  ended: boolean;
  total: number;
  /** Paires disponibles dans la pointure du client (null : pas de pointure). */
  inSize: number | null;
  fromPrice: number | null;
  sizeCounts: SizeCount[];
  highlights: CollectionHighlight[];
  /** Les autres paires, dans la pointure du client d'abord. */
  cards: ShopCard[];
  others: OtherCollection[];
};

/** Première phrase d'une description, si elle tient en une ligne de mise en avant. */
function firstSentence(text: string | null): string | null {
  const sentence = text?.trim().split(/(?<=[.!?])\s+/)[0]?.trim();
  if (!sentence) return null;
  return sentence.length <= NOTE_MAX ? sentence : `${sentence.slice(0, NOTE_MAX - 1).trimEnd()}…`;
}

/**
 * Page d'une collection (/collections/<slug>) ; null si elle n'existe pas, est
 * désactivée, pas encore commencée ou sans paire en ligne. Une collection terminée
 * renvoie `ended` : un lien partagé ne tombe pas sur une erreur.
 */
export const getCollectionPage = cache(async function getCollectionPage(slug: string, size: number | null): Promise<CollectionPage | null> {
  await refreshBestsellers().catch((error) => console.error('Recalcul des meilleures ventes impossible', error));
  const now = new Date();
  const visible = visibleWhere(now);
  const base = cardSelect(now);
  const select = {
    ...base,
    variants: { where: IN_STOCK, orderBy: { sizeEu: 'asc' as const }, select: { id: true, sizeEu: true, stock: true } },
    product: { select: { ...base.product.select, description: true } },
  };

  const [collection, promotions, otherRows] = await withDbRetry(() =>
    Promise.all([
      prisma.collection.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          coverImageUrl: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
          items: { where: { colorway: visible }, orderBy: { position: 'asc' }, select: { note: true, colorway: { select } } },
        },
      }),
      getLiveAutomaticPromotions(now),
      prisma.collection.findMany({
        where: { ...liveCollection(now), slug: { not: slug }, items: { some: { colorway: visible } } },
        orderBy: [{ showOnHome: 'desc' }, { homePosition: 'asc' }, { name: 'asc' }],
        take: OTHERS,
        select: {
          slug: true,
          name: true,
          items: {
            where: { colorway: visible },
            orderBy: { position: 'asc' },
            select: { colorway: { select: { images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } } } },
          },
        },
      }),
    ]),
  );

  if (!collection || !collection.isActive || (collection.startsAt && collection.startsAt > now)) return null;
  const ended = collection.endsAt !== null && collection.endsAt <= now;
  if (!ended && collection.items.length === 0) return null;

  const others = otherRows.map((c) => ({
    slug: c.slug,
    name: c.name,
    count: c.items.length,
    imageUrl: productImageUrl(c.items[0]?.colorway.images[0]?.url),
  }));

  const items = ended ? [] : collection.items;
  const fits = (variants: Array<{ sizeEu: number }>) => size !== null && variants.some((v) => v.sizeEu === size);
  const cards = items.map((item) => toCard(item.colorway, size, promotions, now));

  const highlights = items.slice(0, COLLECTION_HIGHLIGHTS).map((item, i) => ({
    card: cards[i],
    note: item.note ?? firstSentence(item.colorway.product.description),
    sizes: item.colorway.variants.map((v) => ({ variantId: v.id, size: v.sizeEu, stock: v.stock })),
  }));
  // Le reste : dans la pointure du client d'abord, l'ordre de la collection sinon.
  const rest = items.slice(COLLECTION_HIGHLIGHTS).map((item, i) => ({ fit: fits(item.colorway.variants), card: cards[i + COLLECTION_HIGHLIGHTS] }));
  const restCards = [...rest.filter((r) => r.fit), ...rest.filter((r) => !r.fit)].map((r) => r.card);

  const bySize = new Map<number, number>();
  for (const item of items) for (const v of item.colorway.variants) bySize.set(v.sizeEu, (bySize.get(v.sizeEu) ?? 0) + 1);

  return {
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    coverUrl: productImageUrl(collection.coverImageUrl),
    fanImages: cards.slice(0, 3).flatMap((c) => (c.imageUrl ? [c.imageUrl] : [])),
    endsAt: collection.endsAt?.toISOString() ?? null,
    ended,
    total: items.length,
    inSize: size === null ? null : items.filter((item) => fits(item.colorway.variants)).length,
    fromPrice: cards.length > 0 ? Math.min(...cards.map((c) => c.price)) : null,
    sizeCounts: [...bySize].map(([s, count]) => ({ size: s, count })).sort((a, b) => a.size - b.size),
    highlights,
    cards: restCards,
    others,
  };
});
