import { prisma } from '@/lib/prisma';
import { notifyOrdersCancelled } from '@/features/notifications/events';

/** Au plus une passe toutes les 5 minutes par instance du serveur. */
const THROTTLE_MS = 5 * 60_000;
let lastRun = 0;

/**
 * Annule les commandes dont la réservation a expiré (Wave non payé en 2 h, livraison
 * non confirmée en 24 h) : expire_pending_orders remet leurs paires en stock.
 * Lancée sans tâche planifiée fréquente : à chaque visite de l'admin et à chaque
 * commande (au plus toutes les 5 minutes), et chaque soir avec le récap.
 * Les admins sont prévenus des commandes annulées.
 */
export async function expireStaleOrders(options: { force?: boolean } = {}): Promise<number> {
  if (!options.force && Date.now() - lastRun < THROTTLE_MS) return 0;
  lastRun = Date.now();
  try {
    const due = await prisma.order.findMany({
      where: { status: 'PENDING', paymentStatus: { not: 'PAID' }, expiresAt: { lt: new Date() } },
      select: { id: true },
    });
    if (due.length === 0) return 0;
    const [{ count }] = await prisma.$queryRaw<Array<{ count: number }>>`SELECT expire_pending_orders('system') AS count`;
    if (count > 0) await notifyOrdersCancelled(due.map((o) => o.id));
    return count;
  } catch (error) {
    console.error('Expiration des réservations impossible', error);
    return 0;
  }
}
