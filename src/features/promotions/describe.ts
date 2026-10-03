import type { DiscountType, PromotionKind } from '@/generated/prisma/enums';
import { formatFCFA } from '@/lib/money';

/** Résumé lisible d'une promotion (aperçu du formulaire, listes). */

type Describable = {
  kind: PromotionKind;
  discountType: DiscountType;
  value: number | null;
  maxDiscount: number | null;
  /** Libellés des cibles, vide = toute la boutique. */
  targetLabels: string[];
  minSubtotal: number | null;
  minPairs: number | null;
  firstOrderOnly: boolean;
  usageLimit: number | null;
  usageLimitPerCustomer: number | null;
  stackable: boolean;
};

export function discountLabel(p: Pick<Describable, 'discountType' | 'value' | 'maxDiscount'>): string {
  if (p.discountType === 'FREE_DELIVERY') return 'Livraison offerte';
  if (!p.value) return 'Remise à définir';
  if (p.discountType === 'PERCENTAGE') return `-${p.value} %${p.maxDiscount ? ` (max ${formatFCFA(p.maxDiscount)})` : ''}`;
  return `-${formatFCFA(p.value)}`;
}

function targetsLabel(labels: string[]): string {
  if (labels.length === 0) return 'toute la boutique';
  if (labels.length <= 3) return labels.join(', ');
  return `${labels.slice(0, 2).join(', ')} et ${labels.length - 2} autres`;
}

export function describePromotion(p: Describable): { headline: string; details: string[] } {
  const perPair = p.kind === 'AUTOMATIC' && p.discountType === 'FIXED_AMOUNT' ? ' par paire' : '';
  const headline = `${discountLabel(p)}${perPair} sur ${targetsLabel(p.targetLabels)}`;
  const details: string[] = [];
  if (p.minSubtotal) details.push(`dès ${formatFCFA(p.minSubtotal)} d’achat`);
  if (p.minPairs) details.push(`dès ${p.minPairs} paires`);
  if (p.firstOrderOnly) details.push('première commande uniquement');
  if (p.usageLimitPerCustomer) details.push(p.usageLimitPerCustomer === 1 ? '1 fois par client' : `${p.usageLimitPerCustomer} fois par client`);
  if (p.usageLimit) details.push(`${p.usageLimit} utilisation${p.usageLimit > 1 ? 's' : ''} au total`);
  if (p.kind === 'CODE') details.push(p.stackable ? 'cumulable avec les autres promotions' : 'non cumulable');
  if (p.kind === 'AUTOMATIC' && p.discountType !== 'FREE_DELIVERY') details.push('affichée en prix barré, sauf sur les coloris déjà en prix barré');
  return { headline, details };
}

/** Exemple chiffré sur une paire : « 45 000 → 36 000 FCFA ». */
export function exampleOnPair(p: Pick<Describable, 'discountType' | 'value' | 'maxDiscount'>, price = 45_000): string | null {
  if (p.discountType === 'FREE_DELIVERY' || !p.value) return null;
  let discount = p.discountType === 'PERCENTAGE' ? Math.round((price * p.value) / 100) : p.value;
  if (p.discountType === 'PERCENTAGE' && p.maxDiscount) discount = Math.min(discount, p.maxDiscount);
  discount = Math.min(discount, price - 1);
  return `Une paire à ${formatFCFA(price)} → ${formatFCFA(price - discount)}`;
}

export type PromotionStatus = { label: string; tone: 'live' | 'scheduled' | 'ended' | 'off' };

export function promotionStatus(p: { isActive: boolean; startsAt: Date; endsAt: Date | null }, now = new Date()): PromotionStatus {
  if (!p.isActive) return { label: 'Désactivée', tone: 'off' };
  if (p.startsAt > now) return { label: 'Programmée', tone: 'scheduled' };
  if (p.endsAt && p.endsAt <= now) return { label: 'Terminée', tone: 'ended' };
  return { label: 'En cours', tone: 'live' };
}
