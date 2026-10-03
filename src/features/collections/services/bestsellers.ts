import { prisma } from '@/lib/prisma';
import { BESTSELLER_DAYS, BESTSELLER_LIMIT } from '../schemas';

/** Recalcul au plus toutes les 15 minutes par instance du serveur (la boutique l'appelle à chaque visite). */
const THROTTLE_MS = 15 * 60_000;
let lastRun = 0;

/**
 * Collections « Meilleures ventes » : leurs paires sont recalculées à partir des ventes
 * (paires des commandes confirmées, en préparation, expédiées ou livrées sur les
 * BESTSELLER_DAYS derniers jours), les plus vendues d'abord.
 *
 * Le résultat est écrit dans collection_items comme une sélection ordinaire : filtre
 * de la boutique, tuile, promotions sur la collection fonctionnent sans cas particulier.
 * On n'écrit que si la liste a changé ; la date de modification de la collection n'est
 * pas touchée (elle sert à détecter les modifications concurrentes dans l'admin).
 */
export async function refreshBestsellers(options: { force?: boolean; collectionId?: string } = {}): Promise<void> {
  if (!options.force && Date.now() - lastRun < THROTTLE_MS) return;
  lastRun = Date.now();

  const collections = await prisma.collection.findMany({
    where: { type: 'AUTO_BESTSELLERS', ...(options.collectionId ? { id: options.collectionId } : {}) },
    select: { id: true, items: { orderBy: { position: 'asc' }, select: { colorwayId: true } } },
  });
  if (collections.length === 0) return;

  const ranking = await prisma.$queryRaw<Array<{ colorway_id: string }>>`
    SELECT v.colorway_id
      FROM order_items oi
      JOIN orders o   ON o.id = oi.order_id
      JOIN variants v ON v.id = oi.variant_id
     WHERE o.status IN ('CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED')
       AND o.created_at >= now() - make_interval(days => ${BESTSELLER_DAYS}::int)
     GROUP BY v.colorway_id
     ORDER BY sum(oi.quantity) DESC, max(o.created_at) DESC
     LIMIT ${BESTSELLER_LIMIT}::int`;
  const next = ranking.map((r) => r.colorway_id);

  for (const collection of collections) {
    const current = collection.items.map((i) => i.colorwayId);
    if (current.length === next.length && current.every((id, i) => id === next[i])) continue;
    await prisma.$transaction(async (tx) => {
      // Verrou de ligne (sans modifier la collection) : deux recalculs simultanés ne se mélangent pas.
      await tx.$queryRaw`SELECT 1 FROM collections WHERE id = ${collection.id}::uuid FOR UPDATE`;
      await tx.collectionItem.deleteMany({ where: { collectionId: collection.id } });
      if (next.length > 0) {
        await tx.collectionItem.createMany({ data: next.map((colorwayId, position) => ({ collectionId: collection.id, colorwayId, position })) });
      }
    });
  }
}
