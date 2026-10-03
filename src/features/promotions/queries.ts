import type { Prisma } from '@/generated/prisma/client';
import type { Tx } from '@/lib/db-context';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { normalizeCode, type CodeContext, type PromotionRule } from './rules';

const RULE_SELECT = {
  id: true,
  name: true,
  kind: true,
  code: true,
  discountType: true,
  value: true,
  maxDiscount: true,
  scope: true,
  minSubtotal: true,
  minPairs: true,
  firstOrderOnly: true,
  usageLimit: true,
  usageLimitPerCustomer: true,
  stackable: true,
  startsAt: true,
  endsAt: true,
  isActive: true,
  targets: { select: { brandId: true, categoryId: true, collectionId: true, colorwayId: true } },
} satisfies Prisma.PromotionSelect;

type PromotionRow = Prisma.PromotionGetPayload<{ select: typeof RULE_SELECT }>;

function toRule(row: PromotionRow): PromotionRule {
  const ids = (key: 'brandId' | 'categoryId' | 'collectionId' | 'colorwayId') =>
    row.targets.flatMap((target) => (target[key] ? [target[key]] : []));
  return {
    ...row,
    targets: { brandIds: ids('brandId'), categoryIds: ids('categoryId'), collectionIds: ids('collectionId'), colorwayIds: ids('colorwayId') },
  };
}

/** Promotions automatiques en cours (prix barrés, livraison offerte). */
export async function getLiveAutomaticPromotions(now = new Date()): Promise<PromotionRule[]> {
  const rows = await withDbRetry(() =>
    prisma.promotion.findMany({
      where: { kind: 'AUTOMATIC', isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: RULE_SELECT,
    }),
  );
  return rows.map(toRule);
}

/**
 * Code promo saisi par le client, avec son contexte (utilisations, première commande).
 * Dans la transaction de commande, passer `tx` et `lock: true` : la ligne de la promotion
 * est verrouillée, deux clients ne peuvent pas prendre la dernière utilisation en même temps.
 * Renvoie null si le code n'existe pas.
 */
export async function findCodePromotion(
  rawCode: string,
  customerPhone: string | null,
  options: { tx?: Tx; lock?: boolean } = {},
): Promise<{ promotion: PromotionRule; context: CodeContext } | null> {
  const code = normalizeCode(rawCode);
  if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return null;
  const db = options.tx ?? prisma;

  if (options.lock && options.tx) {
    await options.tx.$queryRaw`SELECT 1 FROM promotions WHERE code = ${code} FOR UPDATE`;
  }
  const row = await db.promotion.findUnique({ where: { code }, select: RULE_SELECT });
  if (!row || row.kind !== 'CODE') return null;

  const phone = customerPhone ?? '';
  const [usage] = await db.$queryRaw<Array<{ total: number; by_customer: number }>>`
    SELECT total, by_customer FROM promotion_usage(${row.id}::uuid, ${phone})`;
  const firstOrder = phone
    ? (await db.$queryRaw<Array<{ is_first_order: boolean }>>`SELECT is_first_order(${phone}) AS is_first_order`)[0]?.is_first_order ?? true
    : true;

  return {
    promotion: toRule(row),
    context: { usage: { total: usage?.total ?? 0, byCustomer: phone ? (usage?.by_customer ?? 0) : 0 }, isFirstOrder: firstOrder },
  };
}
