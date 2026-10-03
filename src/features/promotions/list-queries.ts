import type { Prisma } from '@/generated/prisma/client';
import type { DiscountType, PromotionKind } from '@/generated/prisma/enums';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';

export const PROMOTION_TABS = ['en-cours', 'programmees', 'terminees', 'desactivees', 'toutes'] as const;
export type PromotionTab = (typeof PROMOTION_TABS)[number];

export const PROMOTION_TAB_LABEL: Record<PromotionTab, string> = {
  'en-cours': 'En cours',
  programmees: 'Programmées',
  terminees: 'Terminées',
  desactivees: 'Désactivées',
  toutes: 'Toutes',
};

export const PROMOTION_TYPES = ['tous', 'codes', 'automatiques'] as const;
export type PromotionTypeFilter = (typeof PROMOTION_TYPES)[number];

export const PROMOTIONS_PER_PAGE = 20;

export type PromotionListParams = { q?: string; tab: PromotionTab; type: PromotionTypeFilter; page: number };

export function parsePromotionListParams(searchParams: Record<string, string | string[] | undefined>): PromotionListParams {
  const one = (key: string) => {
    const value = searchParams[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
  };
  const tab = one('onglet') as PromotionTab | undefined;
  const type = one('type') as PromotionTypeFilter | undefined;
  const page = Number(one('page'));
  return {
    q: one('q')?.slice(0, 60),
    tab: tab && PROMOTION_TABS.includes(tab) ? tab : 'en-cours',
    type: type && PROMOTION_TYPES.includes(type) ? type : 'tous',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

export function promotionListHref(params: PromotionListParams, changes: Partial<PromotionListParams>): string {
  const next = { ...params, ...changes };
  const query = new URLSearchParams();
  if (next.q) query.set('q', next.q);
  if (next.tab !== 'en-cours') query.set('onglet', next.tab);
  if (next.type !== 'tous') query.set('type', next.type);
  if (next.page > 1) query.set('page', String(next.page));
  return query.size ? `/admin/promotions?${query}` : '/admin/promotions';
}

function tabWhere(tab: PromotionTab, now: Date): Prisma.PromotionWhereInput {
  switch (tab) {
    case 'en-cours':
      return { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
    case 'programmees':
      return { isActive: true, startsAt: { gt: now } };
    case 'terminees':
      return { isActive: true, endsAt: { lte: now } };
    case 'desactivees':
      return { isActive: false };
    default:
      return {};
  }
}

export type AdminPromotionRow = {
  id: string;
  name: string;
  kind: PromotionKind;
  code: string | null;
  discountType: DiscountType;
  value: number | null;
  maxDiscount: number | null;
  isActive: boolean;
  startsAt: Date;
  endsAt: Date | null;
  /** « Toute la boutique » ou « 2 marques, 3 coloris ». */
  targetsLabel: string;
  conditions: string[];
  usageLimit: number | null;
  /** Commandes non annulées qui ont utilisé le code. */
  orders: number;
  /** Paires vendues avec la promotion automatique (commandes non annulées). */
  pairs: number;
};

export async function listAdminPromotions(params: PromotionListParams) {
  const now = new Date();
  const base: Prisma.PromotionWhereInput = {
    ...(params.q
      ? { OR: [{ name: { contains: params.q, mode: 'insensitive' } }, { code: { contains: params.q.toUpperCase().replace(/\s/g, '') } }] }
      : {}),
    ...(params.type === 'codes' ? { kind: 'CODE' } : params.type === 'automatiques' ? { kind: 'AUTOMATIC' } : {}),
  };
  const where: Prisma.PromotionWhereInput = { AND: [base, tabWhere(params.tab, now)] };

  const [promotions, ...counts] = await withDbRetry(() =>
    Promise.all([
      prisma.promotion.findMany({
        where,
        // En cours / programmées : ce qui se termine ou commence le plus tôt d'abord.
        orderBy:
          params.tab === 'programmees'
            ? [{ startsAt: 'asc' }]
            : params.tab === 'en-cours'
              ? [{ endsAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }]
              : [{ createdAt: 'desc' }],
        skip: (params.page - 1) * PROMOTIONS_PER_PAGE,
        take: PROMOTIONS_PER_PAGE,
        include: { targets: { select: { brandId: true, categoryId: true, collectionId: true, colorwayId: true } } },
      }),
      ...PROMOTION_TABS.map((tab) => prisma.promotion.count({ where: { AND: [base, tabWhere(tab, now)] } })),
    ]),
  );

  const ids = promotions.map((p) => p.id);
  const [orderCounts, pairCounts] = ids.length
    ? await withDbRetry(() =>
        Promise.all([
          prisma.order.groupBy({ by: ['promotionId'], where: { promotionId: { in: ids }, status: { not: 'CANCELLED' } }, _count: { _all: true } }),
          prisma.orderItem.groupBy({
            by: ['promotionId'],
            where: { promotionId: { in: ids }, order: { status: { not: 'CANCELLED' } } },
            _sum: { quantity: true },
          }),
        ]),
      )
    : [[], []];
  const ordersBy = new Map(orderCounts.map((row) => [row.promotionId, row._count._all]));
  const pairsBy = new Map(pairCounts.map((row) => [row.promotionId, row._sum.quantity ?? 0]));

  const tabCounts = Object.fromEntries(PROMOTION_TABS.map((tab, i) => [tab, counts[i]])) as Record<PromotionTab, number>;
  const total = tabCounts[params.tab];

  const rows: AdminPromotionRow[] = promotions.map((p) => {
    const n = (key: 'brandId' | 'categoryId' | 'collectionId' | 'colorwayId') => p.targets.filter((t) => t[key]).length;
    const parts = [
      [n('brandId'), 'marque'],
      [n('categoryId'), 'catégorie'],
      [n('collectionId'), 'collection'],
      [n('colorwayId'), 'coloris'],
    ]
      .filter(([count]) => (count as number) > 0)
      .map(([count, word]) => `${count} ${word}${(count as number) > 1 && word !== 'coloris' ? 's' : ''}`);

    const conditions: string[] = [];
    if (p.minSubtotal) conditions.push(`dès ${new Intl.NumberFormat('fr-FR').format(p.minSubtotal)} FCFA`);
    if (p.minPairs) conditions.push(`dès ${p.minPairs} paires`);
    if (p.firstOrderOnly) conditions.push('1re commande');
    if (p.usageLimitPerCustomer) conditions.push(`${p.usageLimitPerCustomer}× par client`);
    if (p.stackable) conditions.push('cumulable');

    return {
      id: p.id,
      name: p.name,
      kind: p.kind,
      code: p.code,
      discountType: p.discountType,
      value: p.value,
      maxDiscount: p.maxDiscount,
      isActive: p.isActive,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      targetsLabel: p.scope === 'ALL' ? 'Toute la boutique' : parts.length ? parts.join(', ') : 'Aucune cible',
      conditions,
      usageLimit: p.usageLimit,
      orders: ordersBy.get(p.id) ?? 0,
      pairs: pairsBy.get(p.id) ?? 0,
    };
  });

  return { promotions: rows, total, tabCounts, pageCount: Math.max(1, Math.ceil(total / PROMOTIONS_PER_PAGE)) };
}
