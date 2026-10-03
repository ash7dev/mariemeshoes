import type { Prisma } from '@/generated/prisma/client';
import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { OPEN_STATUSES } from './status-machine';

// -----------------------------------------------------------------------------
//  Liste
// -----------------------------------------------------------------------------

export const ORDER_TABS = ['a-traiter', 'a-confirmer', 'wave', 'en-livraison', 'livrees', 'annulees', 'toutes'] as const;
export type OrderTab = (typeof ORDER_TABS)[number];

export const ORDER_TAB_LABEL: Record<OrderTab, string> = {
  'a-traiter': 'À traiter',
  'a-confirmer': 'À confirmer',
  wave: 'Wave à vérifier',
  'en-livraison': 'En livraison',
  livrees: 'Livrées',
  annulees: 'Annulées',
  toutes: 'Toutes',
};

const TAB_WHERE: Record<OrderTab, Prisma.OrderWhereInput> = {
  'a-traiter': { status: { in: OPEN_STATUSES } },
  'a-confirmer': { status: 'PENDING' },
  wave: { paymentMethod: 'WAVE', paymentStatus: { in: ['PENDING', 'FAILED'] }, status: { in: OPEN_STATUSES } },
  'en-livraison': { status: 'SHIPPED' },
  livrees: { status: 'DELIVERED' },
  annulees: { status: { in: ['CANCELLED', 'RETURNED'] } },
  toutes: {},
};

export const ORDERS_PER_PAGE = 20;

export type OrderListParams = { q?: string; tab: OrderTab; page: number };

export function parseOrderListParams(searchParams: Record<string, string | string[] | undefined>): OrderListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const tab = one('onglet') as OrderTab | undefined;
  const page = Number(one('page'));
  return {
    q: one('q')?.slice(0, 80),
    tab: tab && ORDER_TABS.includes(tab) ? tab : 'a-traiter',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function orderListHref(params: OrderListParams, changes: Partial<OrderListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.tab !== 'a-traiter') query.set('onglet', next.tab);
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/commandes?${query}` : '/admin/commandes';
}

/** Recherche : référence (MS-2610-00012), nom du client ou numéro (« 77 123 45 67 »). */
function searchWhere(q: string): Prisma.OrderWhereInput {
  const digits = q.replace(/\D/g, '');
  return {
    OR: [
      { reference: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      ...(digits.length >= 3 ? [{ customerPhone: { contains: digits.replace(/^0+/, '') } }, { customerPhoneAlt: { contains: digits.replace(/^0+/, '') } }] : []),
    ],
  };
}

export type AdminOrderRow = {
  id: string;
  reference: string;
  createdAt: Date;
  expiresAt: Date | null;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  customerName: string;
  customerPhone: string;
  zoneName: string | null;
  total: number;
  pairs: number;
  items: Array<{ label: string; sizeEu: number; quantity: number; imageUrl: string | null }>;
  moreItems: number;
};

export async function listAdminOrders(params: OrderListParams) {
  const base: Prisma.OrderWhereInput = params.q ? searchWhere(params.q) : {};
  const where: Prisma.OrderWhereInput = { AND: [base, TAB_WHERE[params.tab]] };

  const [orders, ...counts] = await withDbRetry(() =>
    Promise.all([
      prisma.order.findMany({
        where,
        // À confirmer : les plus anciennes d'abord (le client attend) ; sinon les plus récentes.
        orderBy: params.tab === 'a-confirmer' ? { createdAt: 'asc' } : { createdAt: 'desc' },
        skip: (params.page - 1) * ORDERS_PER_PAGE,
        take: ORDERS_PER_PAGE,
        select: {
          id: true,
          reference: true,
          createdAt: true,
          expiresAt: true,
          status: true,
          paymentMethod: true,
          paymentStatus: true,
          customerName: true,
          customerPhone: true,
          deliveryZoneName: true,
          total: true,
          items: {
            orderBy: { createdAt: 'asc' },
            select: { brandName: true, productName: true, colorwayName: true, sizeEu: true, quantity: true, imageUrl: true },
          },
        },
      }),
      ...ORDER_TABS.map((tab) => prisma.order.count({ where: { AND: [base, TAB_WHERE[tab]] } })),
    ]),
  );

  const tabCounts = Object.fromEntries(ORDER_TABS.map((tab, i) => [tab, counts[i]])) as Record<OrderTab, number>;
  const total = tabCounts[params.tab];

  const rows: AdminOrderRow[] = orders.map((order) => ({
    id: order.id,
    reference: order.reference,
    createdAt: order.createdAt,
    expiresAt: order.expiresAt,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    zoneName: order.deliveryZoneName,
    total: order.total,
    pairs: order.items.reduce((sum, item) => sum + item.quantity, 0),
    items: order.items.slice(0, 2).map((item) => ({
      label: `${item.brandName} ${item.productName} ${item.colorwayName}`,
      sizeEu: item.sizeEu,
      quantity: item.quantity,
      imageUrl: productImageUrl(item.imageUrl),
    })),
    moreItems: Math.max(0, order.items.length - 2),
  }));

  return { orders: rows, total, tabCounts, pageCount: Math.max(1, Math.ceil(total / ORDERS_PER_PAGE)) };
}

// -----------------------------------------------------------------------------
//  Détail
// -----------------------------------------------------------------------------

export async function getOrderDetail(id: string) {
  const order = await withDbRetry(() =>
    prisma.order.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: 'asc' }, include: { variant: { select: { colorway: { select: { productId: true } } } } } },
        payments: { orderBy: { createdAt: 'desc' } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        deliveryZone: { select: { fee: true } },
        customer: { select: { id: true, _count: { select: { orders: true } } } },
      },
    }),
  );
  if (!order) return null;

  // Noms des admins de l'historique et du paiement (stockés par identifiant).
  const adminIds = [
    ...new Set([...order.statusHistory.map((h) => h.changedBy), ...order.payments.map((p) => p.confirmedBy)].filter((v): v is string => Boolean(v))),
  ].filter((v) => /^[0-9a-f-]{36}$/i.test(v));
  const admins = adminIds.length
    ? await prisma.adminProfile.findMany({ where: { id: { in: adminIds } }, select: { id: true, fullName: true } })
    : [];
  const adminName = new Map(admins.map((a) => [a.id, a.fullName]));
  const nameOf = (id: string | null) => (id ? (adminName.get(id) ?? (id === 'system' ? 'Automatique' : id)) : null);

  const payment = order.payments[0] ?? null;

  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      imageUrl: productImageUrl(item.imageUrl),
      productId: item.variant?.colorway.productId ?? null,
      lineTotal: item.unitPrice * item.quantity,
    })),
    payment: payment ? { ...payment, confirmedByName: nameOf(payment.confirmedBy) } : null,
    history: order.statusHistory.map((entry) => ({ ...entry, changedByName: nameOf(entry.changedBy) })),
    customerOrderCount: order.customer?._count.orders ?? null,
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;
