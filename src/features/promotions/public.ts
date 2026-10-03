import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { formatFCFA } from '@/lib/money';
import { discountLabel } from './describe';

/** Promotion automatique en cours, telle que la boutique l'annonce (bandeau, accueil). */
export type PublicPromotion = {
  id: string;
  name: string;
  description: string | null;
  /** « −15 % », « −5 000 FCFA » ou « Livraison offerte ». */
  label: string;
  /** « sur toute la boutique », « sur Nike », « sur la collection Spécial fêtes », « sur une sélection de paires ». */
  scope: string;
  freeDelivery: boolean;
  /** Livraison offerte : seuil d'achat, ou null. */
  minSubtotal: number | null;
  /** Fin exclue (ISO), ou null. */
  endsAt: string | null;
  /** Où voir les paires concernées (collection, marques, boutique), ou null. */
  href: string | null;
};

function scopeOf(scope: 'ALL' | 'TARGETS', targets: Array<{ brand: { name: string; slug: string } | null; collection: { name: string; slug: string } | null; category: { name: string } | null; colorwayId: string | null }>) {
  if (scope === 'ALL') return { text: 'sur toute la boutique', href: '/boutique' };
  const brands = targets.flatMap((t) => (t.brand ? [t.brand] : []));
  const collections = targets.flatMap((t) => (t.collection ? [t.collection] : []));
  const categories = targets.flatMap((t) => (t.category ? [t.category] : []));
  const pairs = targets.filter((t) => t.colorwayId).length;
  const kinds = [brands.length, collections.length, categories.length, pairs].filter((n) => n > 0).length;
  if (kinds === 1 && collections.length === 1) return { text: `sur la collection ${collections[0].name}`, href: `/collections/${collections[0].slug}` };
  if (kinds === 1 && brands.length > 0 && brands.length <= 3) {
    return { text: `sur ${brands.map((b) => b.name).join(', ')}`, href: `/boutique?marque=${brands.map((b) => b.slug).join(',')}` };
  }
  if (kinds === 1 && categories.length === 1) return { text: `sur les ${categories[0].name.toLowerCase()}`, href: null };
  return { text: 'sur une sélection de paires', href: null };
}

/**
 * Promotions automatiques en cours (les codes restent privés : ils sont donnés aux clients,
 * pas affichés). Remises d'abord, de la plus forte à la plus faible, puis la livraison offerte.
 * Mise en cache le temps d'une requête : le bandeau et l'accueil la lisent une seule fois.
 */
export const getPublicPromotions = cache(async function getPublicPromotions(): Promise<PublicPromotion[]> {
  const now = new Date();
  const rows = await withDbRetry(() =>
    prisma.promotion.findMany({
      where: { kind: 'AUTOMATIC', isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      select: {
        id: true,
        name: true,
        description: true,
        discountType: true,
        value: true,
        maxDiscount: true,
        scope: true,
        minSubtotal: true,
        endsAt: true,
        targets: {
          select: {
            colorwayId: true,
            brand: { select: { name: true, slug: true } },
            collection: { select: { name: true, slug: true } },
            category: { select: { name: true } },
          },
        },
      },
    }),
  );

  return rows
    .map((p) => {
      const scope = scopeOf(p.scope, p.targets);
      const freeDelivery = p.discountType === 'FREE_DELIVERY';
      return {
        id: p.id,
        name: p.name,
        description: p.description,
        label: discountLabel(p).replace(/^-/, '−'),
        scope: scope.text,
        freeDelivery,
        minSubtotal: p.minSubtotal,
        endsAt: p.endsAt?.toISOString() ?? null,
        href: scope.href,
        weight: freeDelivery ? -1 : p.discountType === 'PERCENTAGE' ? (p.value ?? 0) * 1000 : (p.value ?? 0),
      };
    })
    .sort((a, b) => b.weight - a.weight)
    .map(({ weight: _weight, ...promotion }) => promotion);
});

/** Phrase courte du bandeau : « −15 % sur Nike », « Livraison offerte dès 50 000 FCFA ». */
export function promotionHeadline(p: PublicPromotion): string {
  if (p.freeDelivery) return p.minSubtotal ? `Livraison offerte dès ${formatFCFA(p.minSubtotal)}` : 'Livraison offerte';
  return `${p.label} ${p.scope}`;
}
