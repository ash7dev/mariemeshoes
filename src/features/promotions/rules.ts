import type { DiscountType, PromotionKind, PromotionScope } from '@/generated/prisma/enums';
import { formatFCFA } from '@/lib/money';

/**
 * Règles des promotions — fonctions pures (aucun accès à la base), utilisées par
 * la boutique (prix barrés, panier) et par la création de commande (prix figés).
 *
 *  1. Une paire ne reçoit qu'UNE promotion automatique : la plus avantageuse.
 *  2. Une paire déjà en prix barré (compareAtPrice) n'a pas de promotion automatique.
 *  3. Un seul code promo par commande ; il ne s'applique qu'aux paires sans autre
 *     réduction, sauf code « cumulable » (stackable).
 *  4. La livraison n'est jamais remisée, sauf par une promotion FREE_DELIVERY.
 *  5. Conditions d'un code : période, minimum d'achat (sous-total des paires après
 *     promotions automatiques), minimum de paires, première commande, utilisations
 *     (total et par client, identifié par son téléphone).
 *  6. Une remise ne rend jamais une paire gratuite : au moins 1 FCFA par paire
 *     (contrainte unit_discount < unit_price), et le code ne dépasse pas le sous-total.
 *  7. Montants en FCFA entiers, arrondis au plus proche.
 */

export type PromotionRule = {
  id: string;
  name: string;
  kind: PromotionKind;
  code: string | null;
  discountType: DiscountType;
  value: number | null;
  maxDiscount: number | null;
  scope: PromotionScope;
  targets: { brandIds: string[]; categoryIds: string[]; collectionIds: string[]; colorwayIds: string[] };
  minSubtotal: number | null;
  minPairs: number | null;
  firstOrderOnly: boolean;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
};

/** Une ligne de panier : une pointure d'un coloris, en N exemplaires. */
export type CartLine = {
  key: string;
  colorwayId: string;
  brandId: string;
  categoryId: string | null;
  collectionIds: string[];
  /** Prix catalogue du coloris (ou prix spécifique de la pointure). */
  unitPrice: number;
  /** Prix barré manuel du coloris : la paire est déjà en promotion. */
  compareAtPrice: number | null;
  quantity: number;
};

/** Contexte client d'un code : lu en base au moment de l'appliquer. */
export type CodeContext = {
  usage: { total: number; byCustomer: number };
  isFirstOrder: boolean;
};

export type PricedLine = CartLine & {
  /** Remise automatique par paire. */
  unitDiscount: number;
  promotion: { id: string; name: string } | null;
};

export type CartPricing = {
  lines: PricedLine[];
  pairs: number;
  /** Σ (prix - remise automatique) × quantité. */
  subtotal: number;
  /** Remise du code promo sur les paires (hors livraison). */
  codeDiscount: number;
  /** Frais de livraison à payer (0 si offerts). */
  deliveryFee: number;
  /** Frais de livraison avant remise (affichage « offerte »). */
  deliveryFeeBeforeDiscount: number;
  /** Promotion qui offre la livraison, s'il y en a une. */
  freeDeliveryBy: { id: string; name: string } | null;
  /** Code appliqué (null si aucun code ou code refusé). */
  appliedCode: { id: string; code: string; name: string } | null;
  /** Raison du refus du code, en clair pour le client. */
  codeError: string | null;
  total: number;
};

// -----------------------------------------------------------------------------

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function isLive(promotion: PromotionRule, now = new Date()): boolean {
  return promotion.isActive && promotion.startsAt <= now && (promotion.endsAt === null || promotion.endsAt > now);
}

/** La promotion vise-t-elle cette paire ? (toute la boutique, ou une de ses cibles) */
export function matchesLine(promotion: PromotionRule, line: CartLine): boolean {
  if (promotion.scope === 'ALL') return true;
  const t = promotion.targets;
  return (
    t.colorwayIds.includes(line.colorwayId) ||
    t.brandIds.includes(line.brandId) ||
    (line.categoryId !== null && t.categoryIds.includes(line.categoryId)) ||
    line.collectionIds.some((id) => t.collectionIds.includes(id))
  );
}

/** Remise d'une promotion automatique sur UNE paire (jamais la paire entière). */
export function automaticUnitDiscount(promotion: PromotionRule, unitPrice: number): number {
  let discount = 0;
  if (promotion.discountType === 'PERCENTAGE' && promotion.value) {
    discount = Math.round((unitPrice * promotion.value) / 100);
    if (promotion.maxDiscount !== null) discount = Math.min(discount, promotion.maxDiscount);
  } else if (promotion.discountType === 'FIXED_AMOUNT' && promotion.value) {
    discount = promotion.value;
  }
  return Math.max(0, Math.min(discount, unitPrice - 1));
}

/** Meilleure promotion automatique d'une paire (règles 1 et 2). */
export function bestAutomaticPromotion(line: CartLine, promotions: PromotionRule[], now = new Date()) {
  if (line.compareAtPrice !== null) return null;
  let best: { promotion: PromotionRule; unitDiscount: number } | null = null;
  for (const promotion of promotions) {
    if (promotion.kind !== 'AUTOMATIC' || promotion.discountType === 'FREE_DELIVERY') continue;
    if (!isLive(promotion, now) || !matchesLine(promotion, line)) continue;
    const unitDiscount = automaticUnitDiscount(promotion, line.unitPrice);
    if (unitDiscount > 0 && (!best || unitDiscount > best.unitDiscount)) best = { promotion, unitDiscount };
  }
  return best;
}

/**
 * Le code est-il utilisable pour ce panier ? Renvoie la raison du refus, ou null.
 * `subtotal` et `pairs` : panier après promotions automatiques.
 */
export function codeRefusal(promotion: PromotionRule, cart: { subtotal: number; pairs: number }, context: CodeContext, now = new Date()): string | null {
  if (promotion.kind !== 'CODE' || !promotion.isActive) return 'Ce code promo n’existe pas.';
  if (promotion.startsAt > now) return 'Ce code n’est pas encore actif.';
  if (promotion.endsAt !== null && promotion.endsAt <= now) return 'Ce code a expiré.';
  if (promotion.usageLimit !== null && context.usage.total >= promotion.usageLimit) {
    return 'Ce code a atteint son nombre maximum d’utilisations.';
  }
  if (promotion.usageLimitPerCustomer !== null && context.usage.byCustomer >= promotion.usageLimitPerCustomer) {
    return 'Tu as déjà utilisé ce code.';
  }
  if (promotion.firstOrderOnly && !context.isFirstOrder) return 'Ce code est réservé à une première commande.';
  if (promotion.minSubtotal !== null && cart.subtotal < promotion.minSubtotal) {
    return `Ce code s’applique dès ${formatFCFA(promotion.minSubtotal)} d’achat (il te manque ${formatFCFA(promotion.minSubtotal - cart.subtotal)}).`;
  }
  if (promotion.minPairs !== null && cart.pairs < promotion.minPairs) {
    return `Ce code s’applique dès ${promotion.minPairs} paires achetées.`;
  }
  return null;
}

/**
 * Prix complet d'un panier : promotions automatiques par paire, livraison offerte
 * automatique, puis code promo (règle 3 : un seul, sur les paires sans autre réduction
 * sauf s'il est cumulable).
 */
export function priceCart(input: {
  lines: CartLine[];
  automatic: PromotionRule[];
  deliveryFee: number;
  code?: { promotion: PromotionRule; context: CodeContext } | null;
  now?: Date;
}): CartPricing {
  const now = input.now ?? new Date();

  // 1. Promotions automatiques par paire
  const lines: PricedLine[] = input.lines.map((line) => {
    const best = bestAutomaticPromotion(line, input.automatic, now);
    return {
      ...line,
      unitDiscount: best?.unitDiscount ?? 0,
      promotion: best ? { id: best.promotion.id, name: best.promotion.name } : null,
    };
  });
  const pairs = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = lines.reduce((sum, line) => sum + (line.unitPrice - line.unitDiscount) * line.quantity, 0);

  // 2. Livraison offerte automatique (minimum d'achat facultatif)
  let deliveryFee = input.deliveryFee;
  let freeDeliveryBy: CartPricing['freeDeliveryBy'] = null;
  const freeDelivery = input.automatic.find(
    (p) =>
      p.kind === 'AUTOMATIC' &&
      p.discountType === 'FREE_DELIVERY' &&
      isLive(p, now) &&
      (p.minSubtotal === null || subtotal >= p.minSubtotal) &&
      lines.some((line) => matchesLine(p, line)),
  );
  if (freeDelivery && deliveryFee > 0) {
    deliveryFee = 0;
    freeDeliveryBy = { id: freeDelivery.id, name: freeDelivery.name };
  }

  // 3. Code promo
  let codeDiscount = 0;
  let appliedCode: CartPricing['appliedCode'] = null;
  let codeError: string | null = null;
  if (input.code) {
    const { promotion, context } = input.code;
    codeError = codeRefusal(promotion, { subtotal, pairs }, context, now);
    if (!codeError) {
      const eligible = lines.filter(
        (line) => matchesLine(promotion, line) && (promotion.stackable || (line.unitDiscount === 0 && line.compareAtPrice === null)),
      );
      const eligibleSubtotal = eligible.reduce((sum, line) => sum + (line.unitPrice - line.unitDiscount) * line.quantity, 0);

      if (promotion.discountType === 'FREE_DELIVERY') {
        if (deliveryFee === 0) codeError = freeDeliveryBy ? 'La livraison est déjà offerte.' : 'La livraison est déjà gratuite pour ta zone.';
        else {
          deliveryFee = 0;
          freeDeliveryBy = { id: promotion.id, name: promotion.name };
        }
      } else if (eligibleSubtotal === 0) {
        codeError = promotion.stackable
          ? 'Ce code ne s’applique à aucune paire de ton panier.'
          : 'Ce code ne s’applique pas aux paires déjà en promotion.';
      } else if (promotion.discountType === 'PERCENTAGE' && promotion.value) {
        codeDiscount = Math.round((eligibleSubtotal * promotion.value) / 100);
        if (promotion.maxDiscount !== null) codeDiscount = Math.min(codeDiscount, promotion.maxDiscount);
      } else if (promotion.discountType === 'FIXED_AMOUNT' && promotion.value) {
        codeDiscount = promotion.value;
      }
      codeDiscount = Math.max(0, Math.min(codeDiscount, eligibleSubtotal, subtotal));
      if (!codeError) appliedCode = { id: promotion.id, code: promotion.code!, name: promotion.name };
    }
  }

  return {
    lines,
    pairs,
    subtotal,
    codeDiscount,
    deliveryFee,
    deliveryFeeBeforeDiscount: input.deliveryFee,
    freeDeliveryBy,
    appliedCode,
    codeError,
    total: subtotal - codeDiscount + deliveryFee,
  };
}
