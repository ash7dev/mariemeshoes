import { prisma } from '@/lib/prisma';
import { TX_OPTIONS } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';

/** Commandes encore en cours : leurs paires ne peuvent pas disparaître du catalogue. */
const OPEN_ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED'] as const;

export class ProductDeleteRefusedError extends DomainError {}

export type DeletedProduct = {
  name: string;
  /** Chemins des photos à retirer du stockage (après la transaction). */
  imagePaths: string[];
  /** Commandes terminées qui contenaient ce produit : elles gardent leur copie (nom, pointure, prix). */
  pastOrders: number;
};

/**
 * Supprime définitivement un produit et tout ce qui lui est rattaché :
 * coloris, photos (lignes), pointures, mouvements de stock, présence dans les
 * collections et cibles de promotions (cascades SQL).
 *
 * Refusé si une commande en cours contient une de ses paires. Les commandes
 * terminées restent intactes : chaque ligne garde son nom, sa pointure et son
 * prix ; seul le lien vers la pointure passe à NULL (ON DELETE SET NULL).
 */
export async function deleteProduct(productId: string): Promise<DeletedProduct> {
  return prisma.$transaction(async (tx) => {
    // Verrou : personne ne modifie ni ne commande ce produit pendant la suppression.
    await tx.$queryRaw`SELECT 1 FROM products WHERE id = ${productId}::uuid FOR UPDATE`;

    const product = await tx.product.findUnique({
      where: { id: productId },
      select: {
        name: true,
        colorways: {
          select: {
            images: { select: { url: true } },
            galleryPosts: { select: { imagePath: true } },
            variants: { select: { id: true } },
          },
        },
      },
    });
    if (!product) throw new ProductDeleteRefusedError('Ce produit n’existe plus.');

    const variantIds = product.colorways.flatMap((c) => c.variants.map((v) => v.id));

    const openOrders = await tx.order.findMany({
      where: { status: { in: [...OPEN_ORDER_STATUSES] }, items: { some: { variantId: { in: variantIds } } } },
      select: { reference: true },
      take: 5,
    });
    if (openOrders.length > 0) {
      const refs = openOrders.map((o) => o.reference).join(', ');
      throw new ProductDeleteRefusedError(
        `Impossible de supprimer : ce produit est dans une commande en cours (${refs}). Termine ou annule la commande d’abord, ou repasse le produit en brouillon.`,
      );
    }

    const pastOrders = await tx.order.count({ where: { items: { some: { variantId: { in: variantIds } } } } });

    // Le journal de stock bloque la suppression des pointures (ON DELETE RESTRICT) : il part avec elles.
    if (variantIds.length > 0) await tx.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
    await tx.product.delete({ where: { id: productId } });

    return {
      name: product.name,
      // Photos des coloris et de la galerie (ses publications partent avec la paire, CASCADE).
      imagePaths: [...new Set(product.colorways.flatMap((c) => [...c.images.map((i) => i.url), ...c.galleryPosts.map((g) => g.imagePath)]))],
      pastOrders,
    };
  }, TX_OPTIONS);
}
