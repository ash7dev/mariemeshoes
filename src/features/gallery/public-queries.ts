import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { getLiveAutomaticPromotions } from '@/features/promotions/queries';
import { IN_STOCK, cardSelect, toCard, visibleWhere, type ShopCard } from '@/features/shop/queries';

/** Photos par page (« Voir plus de photos » en ajoute autant). */
export const GALLERY_PAGE_SIZE = 24;

export type PublicGalleryPost = {
  id: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  /** La paire portée, comme dans la boutique (prix, promo, stock dans la pointure). */
  card: ShopCard;
  /** Pointures en stock, pour l'ajout direct au panier. */
  sizes: Array<{ variantId: string; size: number; stock: number }>;
};

/**
 * Photos publiées de la galerie, les plus récentes d'abord. Une photo dont la paire
 * n'est plus en boutique (brouillon, épuisée, marque masquée) n'apparaît pas.
 */
export async function getPublicGallery(page: number, size: number | null): Promise<{ posts: PublicGalleryPost[]; hasMore: boolean }> {
  const now = new Date();
  const base = cardSelect(now);
  const take = page * GALLERY_PAGE_SIZE;

  const [promotions, rows] = await withDbRetry(() =>
    Promise.all([
      getLiveAutomaticPromotions(now),
      prisma.galleryPost.findMany({
        where: { isPublished: true, colorway: visibleWhere(now) },
        orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
        take: take + 1,
        select: {
          id: true,
          imagePath: true,
          width: true,
          height: true,
          caption: true,
          colorway: {
            select: { ...base, variants: { where: IN_STOCK, orderBy: { sizeEu: 'asc' }, select: { id: true, sizeEu: true, stock: true } } },
          },
        },
      }),
    ]),
  );

  const posts = rows.slice(0, take).flatMap((row) => {
    const imageUrl = productImageUrl(row.imagePath);
    if (!imageUrl) return [];
    return [
      {
        id: row.id,
        imageUrl,
        width: row.width,
        height: row.height,
        caption: row.caption,
        card: toCard(row.colorway, size, promotions, now),
        sizes: row.colorway.variants.map((v) => ({ variantId: v.id, size: v.sizeEu, stock: v.stock })),
      },
    ];
  });
  return { posts, hasMore: rows.length > take };
}
