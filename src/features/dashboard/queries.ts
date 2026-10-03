import { Prisma } from '@/generated/prisma/client';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { ADULT_SIZES } from '@/features/size/sizes';
import { LOW_STOCK_THRESHOLD } from '@/features/admin/queries';
import { dayKey, resolvePeriod, startOfDay, type DashboardPeriod, type DashboardPeriodKey } from './period';

/**
 * Données du tableau de bord : agrégées en SQL, heure de Dakar (UTC+0).
 *
 * DÉFINITIONS (une seule source) :
 * - Chiffre d'affaires : Σ total (livraison incluse, remises déduites) des commandes
 *   non annulées et non remboursées, par date de COMMANDE.
 * - Encaissé : part payée (payment_status = PAID). En attente : le reste (Wave à
 *   vérifier, paiement à la livraison).
 * - Comparaison : même durée écoulée de la période précédente (« à date »).
 * - Ventes (marques, pointure star) : paires des commandes non annulées.
 */

const REVENUE = Prisma.sql`o.status <> 'CANCELLED' AND o.payment_status <> 'REFUNDED'`;
const COUNTED = Prisma.sql`o.status <> 'CANCELLED'`;
const LOCAL = Prisma.sql`(o.created_at AT TIME ZONE 'Africa/Dakar')`;

// -----------------------------------------------------------------------------
//  Chiffre d'affaires
// -----------------------------------------------------------------------------

async function revenueSeries(start: Date, end: Date, bucket: 'day' | 'month') {
  const fmt = bucket === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM';
  const rows = await prisma.$queryRaw<Array<{ k: string; paid: number; pending: number; orders: number }>>`
    SELECT to_char(${LOCAL}, ${fmt}) AS k,
           coalesce(sum(o.total) FILTER (WHERE o.payment_status = 'PAID'), 0)::float8  AS paid,
           coalesce(sum(o.total) FILTER (WHERE o.payment_status <> 'PAID'), 0)::float8 AS pending,
           count(*)::int AS orders
      FROM orders o
     WHERE ${REVENUE} AND o.created_at >= ${start} AND o.created_at < ${end}
     GROUP BY 1`;
  return new Map(rows.map((r) => [r.k, r]));
}

async function revenueTotals(p: DashboardPeriod, todayStart: Date) {
  const [row] = await prisma.$queryRaw<
    Array<{ revenue: number; paid: number; pending: number; delivery: number; code_discounts: number; orders: number; prev_revenue: number; today_revenue: number; today_pending: number; today_orders: number }>
  >`
    SELECT
      coalesce(sum(o.total)           FILTER (WHERE cur), 0)::float8                                    AS revenue,
      coalesce(sum(o.total)           FILTER (WHERE cur AND o.payment_status = 'PAID'), 0)::float8      AS paid,
      coalesce(sum(o.total)           FILTER (WHERE cur AND o.payment_status <> 'PAID'), 0)::float8     AS pending,
      coalesce(sum(o.delivery_fee)    FILTER (WHERE cur), 0)::float8                                    AS delivery,
      coalesce(sum(o.discount_amount) FILTER (WHERE cur), 0)::float8                                    AS code_discounts,
      count(*)                        FILTER (WHERE cur)::int                                           AS orders,
      coalesce(sum(o.total)           FILTER (WHERE prev), 0)::float8                                   AS prev_revenue,
      coalesce(sum(o.total)           FILTER (WHERE today), 0)::float8                                  AS today_revenue,
      coalesce(sum(o.total)           FILTER (WHERE today AND o.payment_status <> 'PAID'), 0)::float8   AS today_pending,
      count(*)                        FILTER (WHERE today)::int                                         AS today_orders
    FROM (
      SELECT o.*,
             (o.created_at >= ${p.start} AND o.created_at < ${p.end})          AS cur,
             (o.created_at >= ${p.prevStart} AND o.created_at < ${p.prevEnd})  AS prev,
             (o.created_at >= ${todayStart})                                   AS today
        FROM orders o
       WHERE ${REVENUE} AND o.created_at >= ${p.prevStart < p.start ? p.prevStart : p.start}
    ) o`;
  // Remises automatiques (prix barrés figés sur les lignes).
  const [items] = await prisma.$queryRaw<Array<{ discounts: number }>>`
    SELECT coalesce(sum(oi.unit_discount * oi.quantity), 0)::float8 AS discounts
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${REVENUE} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}`;
  return { ...row, discounts: row.code_discounts + (items?.discounts ?? 0) };
}

// -----------------------------------------------------------------------------
//  File « Prochaine action »
// -----------------------------------------------------------------------------

export type QueueItem = {
  key: string;
  kind: 'confirm' | 'verify';
  orderId: string;
  reference: string;
  since: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: number;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  customerOrders: number;
  where: string;
  firstItem: { name: string; sizeEu: number; quantity: number; imageUrl: string | null } | null;
  otherItems: number;
};

async function actionQueue(): Promise<QueueItem[]> {
  const select = {
    id: true,
    reference: true,
    createdAt: true,
    status: true,
    paymentMethod: true,
    paymentStatus: true,
    total: true,
    customerName: true,
    customerPhone: true,
    deliveryZoneName: true,
    deliveryAddress: true,
    customer: { select: { id: true, _count: { select: { orders: true } } } },
    items: { orderBy: { createdAt: 'asc' }, select: { brandName: true, productName: true, colorwayName: true, sizeEu: true, quantity: true, imageUrl: true } },
  } satisfies Prisma.OrderSelect;

  const [toConfirm, toVerify] = await Promise.all([
    prisma.order.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 12, select }),
    prisma.order.findMany({
      where: { paymentMethod: 'WAVE', paymentStatus: { in: ['PENDING', 'FAILED'] }, status: { in: ['CONFIRMED', 'PREPARING', 'SHIPPED'] } },
      orderBy: { createdAt: 'asc' },
      take: 12,
      select,
    }),
  ]);

  const map = (kind: QueueItem['kind']) => (o: (typeof toConfirm)[number]): QueueItem => ({
    key: `${kind}-${o.id}`,
    kind,
    orderId: o.id,
    reference: o.reference,
    since: o.createdAt.toISOString(),
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    total: o.total,
    customerId: o.customer?.id ?? null,
    customerName: o.customerName,
    customerPhone: o.customerPhone,
    customerOrders: o.customer?._count.orders ?? 1,
    where: [o.deliveryZoneName, o.deliveryAddress].filter(Boolean).join(' · '),
    firstItem: o.items[0]
      ? { name: `${o.items[0].brandName} ${o.items[0].productName} ${o.items[0].colorwayName}`, sizeEu: o.items[0].sizeEu, quantity: o.items[0].quantity, imageUrl: productImageUrl(o.items[0].imageUrl) }
      : null,
    otherItems: Math.max(0, o.items.length - 1),
  });

  return [...toConfirm.map(map('confirm')), ...toVerify.map(map('verify'))];
}

// -----------------------------------------------------------------------------
//  Mur des pointures
// -----------------------------------------------------------------------------

export type SizeCell = {
  size: number;
  stock: number;
  /** Paires vendues sur 30 jours. */
  sold: number;
  /** Modèles disponibles dans cette pointure (les mieux fournis d'abord). */
  models: Array<{ name: string; stock: number }>;
};

async function sizeWall() {
  const [variants, sales] = await Promise.all([
    prisma.variant.findMany({
      where: { isActive: true, colorway: { isActive: true, product: { isActive: true } } },
      take: 5000,
      select: { sizeEu: true, stock: true, colorway: { select: { name: true, product: { select: { name: true, brand: { select: { name: true } } } } } } },
    }),
    prisma.$queryRaw<Array<{ size: number; sold: number }>>`
      SELECT oi.size_eu AS size, sum(oi.quantity)::int AS sold
        FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE ${COUNTED} AND o.created_at >= now() - interval '30 days'
       GROUP BY 1`,
  ]);

  const soldBy = new Map(sales.map((s) => [s.size, s.sold]));
  const bySize = new Map<number, SizeCell>();
  // Adulte : toujours 36 à 46. Enfant : seulement les tailles présentes.
  for (const size of ADULT_SIZES) bySize.set(size, { size, stock: 0, sold: soldBy.get(size) ?? 0, models: [] });
  for (const v of variants) {
    const cell = bySize.get(v.sizeEu) ?? { size: v.sizeEu, stock: 0, sold: soldBy.get(v.sizeEu) ?? 0, models: [] };
    cell.stock += v.stock;
    if (v.stock > 0) cell.models.push({ name: `${v.colorway.product.brand.name} ${v.colorway.product.name} ${v.colorway.name}`, stock: v.stock });
    bySize.set(v.sizeEu, cell);
  }
  const cells = [...bySize.values()].sort((a, b) => a.size - b.size);
  for (const cell of cells) cell.models = cell.models.sort((a, b) => b.stock - a.stock).slice(0, 5);

  const totalSold = cells.reduce((sum, c) => sum + c.sold, 0);
  const star = totalSold > 0 ? cells.reduce((best, c) => (c.sold > best.sold ? c : best)) : null;
  return {
    cells,
    totalStock: cells.reduce((sum, c) => sum + c.stock, 0),
    models: new Set(variants.filter((v) => v.stock > 0).map((v) => `${v.colorway.product.name} ${v.colorway.name}`)).size,
    star: star ? { size: star.size, share: star.sold / totalSold } : null,
    outOfStock: cells.filter((c) => ADULT_SIZES.includes(c.size) && c.stock === 0).map((c) => c.size),
    catalogEmpty: variants.length === 0,
  };
}

// -----------------------------------------------------------------------------
//  Journal du jour
// -----------------------------------------------------------------------------

export type JournalEvent = { key: string; kind: 'commandes' | 'paiements' | 'stock'; at: string; title: string; detail: string; tone: 'new' | 'ok' | 'alert' | 'neutral' | 'promo'; href?: string };

const STATUS_EVENT: Partial<Record<OrderStatus, { title: string; tone: JournalEvent['tone'] }>> = {
  CONFIRMED: { title: 'Commande confirmée', tone: 'neutral' },
  PREPARING: { title: 'En préparation', tone: 'neutral' },
  SHIPPED: { title: 'Remise au livreur', tone: 'neutral' },
  DELIVERED: { title: 'Commande livrée', tone: 'ok' },
  CANCELLED: { title: 'Commande annulée', tone: 'alert' },
  RETURNED: { title: 'Retour enregistré', tone: 'alert' },
};

async function dayJournal(todayStart: Date): Promise<JournalEvent[]> {
  const [orders, history, payments, movements] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, createdAt: true, customerName: true, paymentMethod: true, promotionCode: true, items: { take: 1, select: { productName: true, sizeEu: true } } },
    }),
    prisma.orderStatusHistory.findMany({
      where: { createdAt: { gte: todayStart }, fromStatus: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, createdAt: true, toStatus: true, note: true, order: { select: { id: true, reference: true, customerName: true } } },
    }),
    prisma.payment.findMany({
      where: { confirmedAt: { gte: todayStart }, status: 'PAID' },
      orderBy: { confirmedAt: 'desc' },
      take: 30,
      select: { id: true, confirmedAt: true, method: true, amount: true, order: { select: { id: true, reference: true } } },
    }),
    prisma.stockMovement.findMany({
      where: { createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        reason: true,
        delta: true,
        variant: { select: { sizeEu: true, stock: true, colorway: { select: { name: true, product: { select: { id: true, name: true } } } } } },
      },
    }),
  ]);

  const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n).replace(/\s/g, ' ');
  const events: JournalEvent[] = [
    ...orders.map((o) => ({
      key: `o-${o.id}`,
      kind: 'commandes' as const,
      at: o.createdAt.toISOString(),
      title: o.promotionCode ? `Nouvelle commande · ${o.promotionCode}` : 'Nouvelle commande',
      detail: [o.customerName, o.items[0] ? `${o.items[0].productName} · ${o.items[0].sizeEu}` : null, o.paymentMethod === 'WAVE' ? 'Wave' : 'à la livraison'].filter(Boolean).join(' · '),
      tone: (o.promotionCode ? 'promo' : 'new') as JournalEvent['tone'],
      href: `/admin/commandes/${o.id}`,
    })),
    ...history.flatMap((h): JournalEvent[] => {
      const ui = STATUS_EVENT[h.toStatus];
      if (!ui) return [];
      return [{ key: `h-${h.id}`, kind: 'commandes' as const, at: h.createdAt.toISOString(), title: ui.title, detail: `${h.order.reference} · ${h.order.customerName}${h.note ? ` · ${h.note}` : ''}`, tone: ui.tone, href: `/admin/commandes/${h.order.id}` }];
    }),
    ...payments.map((p) => ({
      key: `p-${p.id}`,
      kind: 'paiements' as const,
      at: (p.confirmedAt ?? new Date()).toISOString(),
      title: p.method === 'WAVE' ? 'Paiement Wave reçu' : 'Paiement encaissé',
      detail: `${p.order.reference} · ${fmt(p.amount)} FCFA`,
      tone: 'ok' as const,
      href: `/admin/commandes/${p.order.id}`,
    })),
    ...movements.flatMap((m): JournalEvent[] => {
      const name = `${m.variant.colorway.product.name} ${m.variant.colorway.name} · ${m.variant.sizeEu}`;
      const href = `/admin/produits/${m.variant.colorway.product.id}`;
      if (m.reason === 'RESTOCK' || m.reason === 'ADJUSTMENT') {
        return [{ key: `m-${m.id}`, kind: 'stock' as const, at: m.createdAt.toISOString(), title: m.reason === 'RESTOCK' ? 'Réassort' : 'Correction de stock', detail: `${name} · ${m.delta > 0 ? '+' : ''}${m.delta}`, tone: 'neutral' as const, href }];
      }
      if (m.reason === 'ORDER' && m.variant.stock <= LOW_STOCK_THRESHOLD) {
        return [{ key: `m-${m.id}`, kind: 'stock' as const, at: m.createdAt.toISOString(), title: m.variant.stock === 0 ? 'Rupture' : 'Stock bas', detail: `${name} · ${m.variant.stock} paire${m.variant.stock > 1 ? 's' : ''}`, tone: 'alert' as const, href }];
      }
      return [];
    }),
  ];
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
}

// -----------------------------------------------------------------------------
//  Heures, marques, zones, activité
// -----------------------------------------------------------------------------

async function orderHeatmap() {
  const rows = await prisma.$queryRaw<Array<{ d: number; s: number; n: number }>>`
    SELECT extract(isodow FROM ${LOCAL})::int AS d,
           (extract(hour FROM ${LOCAL})::int / 3) AS s,
           count(*)::int AS n
      FROM orders o
     WHERE ${COUNTED} AND o.created_at >= now() - interval '90 days'
     GROUP BY 1, 2`;
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 8 }, () => 0));
  for (const r of rows) grid[r.d - 1][r.s] = r.n;
  return { grid, total: rows.reduce((sum, r) => sum + r.n, 0) };
}

async function brandSales(p: DashboardPeriod) {
  return prisma.$queryRaw<Array<{ name: string; pairs: number; fcfa: number }>>`
    SELECT oi.brand_name AS name,
           sum(oi.quantity)::int AS pairs,
           sum((oi.unit_price - oi.unit_discount) * oi.quantity)::float8 AS fcfa
      FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE ${COUNTED} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}
     GROUP BY 1
     ORDER BY 2 DESC
     LIMIT 6`;
}

async function zoneStats(p: DashboardPeriod) {
  const [rows, zones] = await Promise.all([
    prisma.$queryRaw<Array<{ name: string | null; orders: number }>>`
      SELECT o.delivery_zone_name AS name, count(*)::int AS orders
        FROM orders o
       WHERE ${COUNTED} AND o.created_at >= ${p.start} AND o.created_at < ${p.end}
       GROUP BY 1
       ORDER BY 2 DESC`,
    prisma.deliveryZone.findMany({ select: { name: true, fee: true } }),
  ]);
  const fee = new Map(zones.map((z) => [z.name, z.fee]));
  return {
    rows: rows.map((r) => ({ name: r.name ?? 'Zone non précisée', orders: r.orders, fee: r.name ? (fee.get(r.name) ?? null) : null })),
    zonesConfigured: zones.length,
  };
}

async function recentOrders() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { id: true, reference: true, createdAt: true, status: true, total: true, customerName: true, items: { take: 1, select: { productName: true, sizeEu: true } } },
  });
  return orders.map((o) => ({ ...o, createdAt: o.createdAt.toISOString(), item: o.items[0] ? `${o.items[0].productName} · ${o.items[0].sizeEu}` : null }));
}

async function lowStock() {
  const where = { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD }, colorway: { isActive: true, product: { isActive: true } } } satisfies Prisma.VariantWhereInput;
  const [count, first] = await Promise.all([
    prisma.variant.count({ where }),
    prisma.variant.findFirst({ where, orderBy: { stock: 'asc' }, select: { sizeEu: true, stock: true, colorway: { select: { name: true, product: { select: { name: true } } } } } }),
  ]);
  return { count, first: first ? { label: `${first.colorway.product.name} ${first.colorway.name} · ${first.sizeEu}`, stock: first.stock } : null };
}

// -----------------------------------------------------------------------------

export async function getDashboard(key: DashboardPeriodKey) {
  const now = new Date();
  const period = resolvePeriod(key, now);
  const week = resolvePeriod('7j', now);
  const todayStart = startOfDay(now);

  const [series, totals, weekSeries, queue, wall, journal, heatmap, brands, zones, recent, low] = await withDbRetry(() =>
    Promise.all([
      revenueSeries(period.start, period.end, period.bucket),
      revenueTotals(period, todayStart),
      revenueSeries(week.start, week.end, 'day'),
      actionQueue(),
      sizeWall(),
      dayJournal(todayStart),
      orderHeatmap(),
      brandSales(period),
      zoneStats(period),
      recentOrders(),
      lowStock(),
    ]),
  );

  const bars = period.buckets.map((b) => {
    const row = series.get(b.key);
    return { ...b, paid: row?.paid ?? 0, pending: row?.pending ?? 0, orders: row?.orders ?? 0 };
  });
  const elapsed = bars.filter((b) => !b.isFuture);
  const revenue = totals.revenue;

  return {
    period: { key: period.key, label: period.label, compareLabel: period.compareLabel, bucket: period.bucket },
    revenue: {
      revenue,
      paid: totals.paid,
      pending: totals.pending,
      discounts: totals.discounts,
      delivery: totals.delivery,
      orders: totals.orders,
      prevRevenue: totals.prev_revenue,
      change: totals.prev_revenue > 0 ? (revenue - totals.prev_revenue) / totals.prev_revenue : null,
      averagePerBucket: elapsed.length ? revenue / elapsed.length : 0,
      today: { revenue: totals.today_revenue, pending: totals.today_pending, orders: totals.today_orders },
      series: bars,
    },
    week: week.buckets.map((b) => {
      const row = weekSeries.get(b.key);
      return { key: b.key, label: b.label, fullLabel: b.fullLabel, isCurrent: b.isCurrent, revenue: (row?.paid ?? 0) + (row?.pending ?? 0) };
    }),
    queue,
    wall,
    journal,
    heatmap,
    brands,
    zones,
    recent,
    low,
    today: dayKey(now),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
