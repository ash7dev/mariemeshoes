import { prisma } from '@/lib/prisma';
import { formatFCFA } from '@/lib/money';
import { notifyAdmins } from './push';

/** En dessous de ce stock (après une commande), l'admin est prévenu. */
const LOW_STOCK = 1;

const PAYMENT_LABEL = { WAVE: 'Wave', CASH_ON_DELIVERY: 'à la livraison' } as const;

/**
 * Nouvelle commande : « Nouvelle commande MS-1042 · Awa · 2 paires · 125 000 FCFA · Wave »,
 * puis, si la commande a vidé ou presque vidé une pointure, une alerte de stock.
 * Appelé après la réponse au client (after) : n'allonge jamais la commande.
 */
export async function notifyNewOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      reference: true,
      customerName: true,
      total: true,
      paymentMethod: true,
      deliveryZoneName: true,
      items: { select: { quantity: true, variantId: true } },
    },
  });
  if (!order) return;

  const pairs = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const firstName = order.customerName.split(' ')[0];
  await notifyAdmins(
    {
      title: `Nouvelle commande ${order.reference}`,
      body: `${firstName} · ${pairs} paire${pairs > 1 ? 's' : ''} · ${formatFCFA(order.total)} · ${PAYMENT_LABEL[order.paymentMethod]}${order.deliveryZoneName ? ` · ${order.deliveryZoneName}` : ''}`,
      url: `/admin/commandes/${orderId}`,
      tag: `order-${orderId}`,
    },
    { urgent: true },
  );

  const variantIds = order.items.flatMap((item) => (item.variantId ? [item.variantId] : []));
  if (variantIds.length > 0) await notifyLowStock(variantIds);
}

/** Pointures tombées à 0 ou à 1 paire : une seule notification qui les liste. */
export async function notifyLowStock(variantIds: string[]): Promise<void> {
  const low = await prisma.variant.findMany({
    where: { id: { in: variantIds }, isActive: true, stock: { lte: LOW_STOCK } },
    select: { sizeEu: true, stock: true, colorway: { select: { name: true, product: { select: { name: true } } } } },
    orderBy: { stock: 'asc' },
  });
  if (low.length === 0) return;

  const out = low.filter((v) => v.stock <= 0);
  const lines = low.map((v) => `${v.colorway.product.name} ${v.sizeEu} : ${v.stock <= 0 ? 'épuisée' : 'plus qu’1'}`);
  await notifyAdmins({
    title: out.length > 0 ? `Rupture : ${out.length} pointure${out.length > 1 ? 's' : ''}` : 'Stock bas',
    body: lines.slice(0, 3).join(' · ') + (lines.length > 3 ? ` · et ${lines.length - 3} autres` : ''),
    url: '/admin/produits',
    tag: 'stock',
  });
}

/**
 * Commande(s) annulée(s). Par un admin : les AUTRES admins sont prévenus (avec le motif).
 * Par expiration de la réservation : tout le monde, en une seule notification.
 */
export async function notifyOrdersCancelled(orderIds: string[], options: { byAdminId?: string } = {}): Promise<void> {
  if (orderIds.length === 0) return;
  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, status: 'CANCELLED' },
    select: { id: true, reference: true, customerName: true, total: true, cancelReason: true },
    orderBy: { createdAt: 'asc' },
  });
  if (orders.length === 0) return;

  if (orders.length === 1) {
    const [order] = orders;
    const expired = order.cancelReason === 'Réservation expirée';
    await notifyAdmins(
      {
        title: `Commande ${order.reference} annulée`,
        body: `${order.customerName.split(' ')[0]} · ${formatFCFA(order.total)} · ${expired ? 'réservation expirée, paires remises en stock' : `motif : ${order.cancelReason ?? '—'}`}`,
        url: `/admin/commandes/${order.id}`,
        tag: `order-${order.id}`,
      },
      { excludeAdminIds: options.byAdminId ? [options.byAdminId] : undefined },
    );
    return;
  }

  await notifyAdmins(
    {
      title: `${orders.length} commandes annulées`,
      body: `Réservations expirées, paires remises en stock : ${orders.map((o) => o.reference).join(', ')}`,
      url: '/admin/commandes',
      tag: 'cancelled',
    },
    { excludeAdminIds: options.byAdminId ? [options.byAdminId] : undefined },
  );
}

const dayLabel = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

/**
 * Récap du soir (heure de Dakar = UTC) : commandes passées dans la journée, paires,
 * montant, et ce qui reste à faire. Envoyé par la tâche planifiée /api/cron/daily-recap.
 */
export async function notifyDailyRecap(now = new Date()): Promise<void> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [placed, cancelled, delivered, toConfirm] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: start, lte: now }, status: { not: 'CANCELLED' } },
      select: { total: true, items: { select: { quantity: true } } },
    }),
    prisma.order.count({ where: { cancelledAt: { gte: start, lte: now } } }),
    prisma.order.count({ where: { deliveredAt: { gte: start, lte: now } } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
  ]);

  const pairs = placed.reduce((sum, o) => sum + o.items.reduce((n, i) => n + i.quantity, 0), 0);
  const amount = placed.reduce((sum, o) => sum + o.total, 0);
  const day = dayLabel.format(now);
  const todo = [
    toConfirm > 0 ? `${toConfirm} à confirmer` : null,
    delivered > 0 ? `${delivered} livrée${delivered > 1 ? 's' : ''}` : null,
    cancelled > 0 ? `${cancelled} annulée${cancelled > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  await notifyAdmins({
    title: placed.length > 0 ? `Récap du ${day} : ${formatFCFA(amount)}` : `Récap du ${day}`,
    body:
      (placed.length > 0
        ? `${placed.length} commande${placed.length > 1 ? 's' : ''} · ${pairs} paire${pairs > 1 ? 's' : ''}`
        : 'Pas de nouvelle commande aujourd’hui') + (todo.length ? ` · ${todo.join(' · ')}` : ''),
    url: '/admin',
    tag: 'daily-recap',
  });
}
