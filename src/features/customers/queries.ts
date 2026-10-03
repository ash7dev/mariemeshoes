import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';

/**
 * Clients : identifiés par leur téléphone (commande sans compte). Toutes les
 * statistiques viennent de leurs commandes :
 *  - commandes : non annulées ;
 *  - dépensé : commandes livrées (argent réellement encaissé) ;
 *  - pointure habituelle : la plus achetée.
 */

export const CUSTOMER_SEGMENTS = ['tous', 'fideles', 'nouveaux', 'a-relancer'] as const;
export type CustomerSegment = (typeof CUSTOMER_SEGMENTS)[number];

export const CUSTOMER_SEGMENT_LABEL: Record<CustomerSegment, string> = {
  tous: 'Tous',
  fideles: 'Fidèles',
  nouveaux: 'Nouveaux',
  'a-relancer': 'À relancer',
};

export const CUSTOMER_SORTS = ['derniere-commande', 'depense', 'commandes', 'recents'] as const;
export type CustomerSort = (typeof CUSTOMER_SORTS)[number];

/** Fidèle : au moins 2 commandes. Nouveau : arrivé il y a moins de 30 jours. À relancer : rien depuis 90 jours. */
export const LOYAL_MIN_ORDERS = 2;
export const NEW_DAYS = 30;
export const DORMANT_DAYS = 90;

export const CUSTOMERS_PER_PAGE = 25;

export type CustomerListParams = { q?: string; segment: CustomerSegment; sort: CustomerSort; page: number };

export function parseCustomerListParams(searchParams: Record<string, string | string[] | undefined>): CustomerListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const segment = one('segment') as CustomerSegment | undefined;
  const sort = one('tri') as CustomerSort | undefined;
  const page = Number(one('page'));
  return {
    q: one('q')?.slice(0, 60),
    segment: segment && CUSTOMER_SEGMENTS.includes(segment) ? segment : 'tous',
    sort: sort && CUSTOMER_SORTS.includes(sort) ? sort : 'derniere-commande',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function customerListHref(params: CustomerListParams, changes: Partial<CustomerListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.segment !== 'tous') query.set('segment', next.segment);
  if (next.sort !== 'derniere-commande') query.set('tri', next.sort);
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/clients?${query}` : '/admin/clients';
}

const SEGMENT_SQL: Record<CustomerSegment, Prisma.Sql> = {
  tous: Prisma.sql`TRUE`,
  fideles: Prisma.sql`s.orders >= ${LOYAL_MIN_ORDERS}`,
  nouveaux: Prisma.sql`s.created_at >= now() - make_interval(days => ${NEW_DAYS})`,
  'a-relancer': Prisma.sql`s.orders >= 1 AND s.last_order_at < now() - make_interval(days => ${DORMANT_DAYS})`,
};

const ORDER_SQL: Record<CustomerSort, Prisma.Sql> = {
  'derniere-commande': Prisma.sql`s.last_order_at DESC NULLS LAST, s.created_at DESC`,
  depense: Prisma.sql`s.spent DESC, s.orders DESC`,
  commandes: Prisma.sql`s.orders DESC, s.spent DESC`,
  recents: Prisma.sql`s.created_at DESC`,
};

/** Recherche : nom, e-mail ou numéro (« 77 123 45 67 »). */
function searchSql(q?: string): Prisma.Sql {
  if (!q) return Prisma.sql`TRUE`;
  const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const digits = q.replace(/\D/g, '').replace(/^0+/, '');
  return digits.length >= 3
    ? Prisma.sql`(c.full_name ILIKE ${like} OR c.email ILIKE ${like} OR c.phone LIKE ${`%${digits}%`})`
    : Prisma.sql`(c.full_name ILIKE ${like} OR c.email ILIKE ${like})`;
}

/** Statistiques par client, calculées une fois (CTE) et filtrées / triées ensuite. */
function statsCte(q?: string): Prisma.Sql {
  return Prisma.sql`
    WITH s AS (
      SELECT
        c.id,
        c.full_name,
        c.phone,
        c.email,
        c.created_at,
        count(o.id) FILTER (WHERE o.status <> 'CANCELLED')::int AS orders,
        coalesce(sum(o.total) FILTER (WHERE o.status = 'DELIVERED'), 0)::int AS spent,
        max(o.created_at) FILTER (WHERE o.status <> 'CANCELLED') AS last_order_at,
        (
          SELECT mode() WITHIN GROUP (ORDER BY oi.size_eu)
            FROM order_items oi
            JOIN orders o2 ON o2.id = oi.order_id
           WHERE o2.customer_id = c.id AND o2.status <> 'CANCELLED'
        ) AS usual_size
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE ${searchSql(q)}
      GROUP BY c.id
    )`;
}

export type AdminCustomerRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  createdAt: Date;
  orders: number;
  spent: number;
  lastOrderAt: Date | null;
  usualSize: number | null;
};

export async function listAdminCustomers(params: CustomerListParams) {
  const cte = statsCte(params.q);
  const [rows, countRows] = await withDbRetry(() =>
    Promise.all([
      prisma.$queryRaw<
        Array<{ id: string; full_name: string; phone: string; email: string | null; created_at: Date; orders: number; spent: number; last_order_at: Date | null; usual_size: number | null }>
      >`${cte}
        SELECT * FROM s
         WHERE ${SEGMENT_SQL[params.segment]}
         ORDER BY ${ORDER_SQL[params.sort]}
         LIMIT ${CUSTOMERS_PER_PAGE} OFFSET ${(params.page - 1) * CUSTOMERS_PER_PAGE}`,
      prisma.$queryRaw<Array<Record<CustomerSegment, number>>>`${cte}
        SELECT
          count(*)::int AS "tous",
          (count(*) FILTER (WHERE ${SEGMENT_SQL.fideles}))::int AS "fideles",
          (count(*) FILTER (WHERE ${SEGMENT_SQL.nouveaux}))::int AS "nouveaux",
          (count(*) FILTER (WHERE ${SEGMENT_SQL['a-relancer']}))::int AS "a-relancer"
        FROM s`,
    ]),
  );

  const segmentCounts = countRows[0] ?? { tous: 0, fideles: 0, nouveaux: 0, 'a-relancer': 0 };
  const total = segmentCounts[params.segment];
  const customers: AdminCustomerRow[] = rows.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    createdAt: r.created_at,
    orders: r.orders,
    spent: r.spent,
    lastOrderAt: r.last_order_at,
    usualSize: r.usual_size,
  }));

  return { customers, total, segmentCounts, pageCount: Math.max(1, Math.ceil(total / CUSTOMERS_PER_PAGE)) };
}

// -----------------------------------------------------------------------------
//  Fiche client
// -----------------------------------------------------------------------------

export async function getCustomerDetail(id: string) {
  const customer = await withDbRetry(() =>
    prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            reference: true,
            createdAt: true,
            status: true,
            paymentMethod: true,
            paymentStatus: true,
            total: true,
            deliveryAddress: true,
            deliveryZoneName: true,
            items: { select: { brandName: true, productName: true, colorwayName: true, sizeEu: true, quantity: true, imageUrl: true } },
          },
        },
      },
    }),
  );
  if (!customer) return null;

  const valid = customer.orders.filter((o) => o.status !== 'CANCELLED');
  const delivered = customer.orders.filter((o) => o.status === 'DELIVERED');
  const spent = delivered.reduce((sum, o) => sum + o.total, 0);
  const items = valid.flatMap((o) => o.items);

  // Pointures et marques achetées (paires des commandes non annulées), les plus fréquentes d'abord.
  const tally = <K extends string | number>(entries: Array<[K, number]>) => {
    const map = new Map<K, number>();
    for (const [key, n] of entries) map.set(key, (map.get(key) ?? 0) + n);
    return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, count }));
  };
  const sizes = tally(items.map((i) => [i.sizeEu, i.quantity] as [number, number]));
  const brands = tally(items.map((i) => [i.brandName, i.quantity] as [string, number]));

  // Adresses utilisées (la plus récente d'abord, sans doublon).
  const addresses: Array<{ address: string; zone: string | null; lastUsedAt: Date }> = [];
  for (const order of customer.orders) {
    const key = order.deliveryAddress.trim().toLowerCase();
    if (!addresses.some((a) => a.address.trim().toLowerCase() === key)) {
      addresses.push({ address: order.deliveryAddress, zone: order.deliveryZoneName, lastUsedAt: order.createdAt });
    }
  }

  return {
    id: customer.id,
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    createdAt: customer.createdAt,
    stats: {
      orders: valid.length,
      cancelled: customer.orders.length - valid.length,
      spent,
      averageBasket: delivered.length ? Math.round(spent / delivered.length) : null,
      pairs: items.reduce((sum, i) => sum + i.quantity, 0),
      lastOrderAt: valid[0]?.createdAt ?? null,
    },
    sizes,
    brands,
    addresses: addresses.slice(0, 5),
    orders: customer.orders.map((o) => ({
      ...o,
      pairs: o.items.reduce((sum, i) => sum + i.quantity, 0),
      firstItem: o.items[0]
        ? { label: `${o.items[0].brandName} ${o.items[0].productName} ${o.items[0].colorwayName}`, sizeEu: o.items[0].sizeEu, imageUrl: productImageUrl(o.items[0].imageUrl) }
        : null,
    })),
  };
}

export type CustomerDetail = NonNullable<Awaited<ReturnType<typeof getCustomerDetail>>>;
