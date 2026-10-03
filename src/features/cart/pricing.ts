import type { Tx } from '@/lib/db-context';
import { prisma } from '@/lib/prisma';
import { productImageUrl } from '@/lib/supabase/storage';
import { findCodePromotion, getLiveAutomaticPromotions } from '@/features/promotions/queries';
import { normalizeCode, priceCart, type CartLine as RuleLine } from '@/features/promotions/rules';

export type CartRequestLine = { variantId: string; quantity: number };

export type CartViewLine = {
  variantId: string;
  href: string;
  brand: string;
  model: string;
  colorway: string;
  size: number;
  sku: string;
  /** Chemin de la photo en base (copié dans la commande). */
  imagePath: string | null;
  imageUrl: string | null;
  /** Prix de vente d'une paire (prix du coloris ou prix spécifique de la pointure). */
  unitPrice: number;
  /** Prix barré affiché (prix barré du coloris), ou null. */
  compareAtPrice: number | null;
  /** Remise automatique par paire. */
  unitDiscount: number;
  promotion: { id: string; name: string } | null;
  /** Quantité retenue (ramenée au stock disponible). */
  quantity: number;
  stock: number;
  available: boolean;
  /** Message pour le client : quantité ajustée, plus disponible… */
  notice: string | null;
};

export type CartView = {
  lines: CartViewLine[];
  pairs: number;
  /** Valeur des paires avant toute remise (prix barrés compris). */
  gross: number;
  /** Ce que le client paie pour les paires, remises automatiques déduites. */
  subtotal: number;
  /** Économies : prix barrés + promotions automatiques. */
  savings: number;
  codeDiscount: number;
  appliedCode: { id: string; code: string; name: string } | null;
  codeError: string | null;
  /** null : pas de zone choisie (panier). */
  delivery: { zoneId: string; zoneName: string; fee: number; freeBy: string | null } | null;
  total: number;
};

type PriceInput = {
  lines: CartRequestLine[];
  code?: string | null;
  /** Téléphone du client (limites d'utilisation des codes) ; null dans le panier. */
  phone?: string | null;
  zoneId?: string | null;
  /** Dans la transaction de commande : le code est verrouillé (voir findCodePromotion). */
  tx?: Tx;
};

/**
 * Prix d'un panier, relu en base : pointures en vente, stock, prix, promotions
 * automatiques, code promo et livraison (si une zone est choisie).
 * Les lignes indisponibles restent dans la vue (avec un message) mais ne comptent pas.
 */
export async function priceCartLines(input: PriceInput): Promise<CartView> {
  const db = input.tx ?? prisma;
  const now = new Date();
  const ids = [...new Set(input.lines.map((l) => l.variantId))];

  const [variants, automatic, zone] = await Promise.all([
    ids.length
      ? db.variant.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            sizeEu: true,
            sku: true,
            stock: true,
            isActive: true,
            priceOverride: true,
            colorway: {
              select: {
                id: true,
                slug: true,
                name: true,
                price: true,
                compareAtPrice: true,
                isActive: true,
                publishedAt: true,
                images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
                collectionItems: { select: { collectionId: true } },
                product: {
                  select: { name: true, isActive: true, brandId: true, categoryId: true, brand: { select: { name: true, isActive: true } } },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    getLiveAutomaticPromotions(now),
    input.zoneId
      ? db.deliveryZone.findFirst({ where: { id: input.zoneId, isActive: true }, select: { id: true, name: true, fee: true } })
      : Promise.resolve(null),
  ]);
  const byId = new Map(variants.map((v) => [v.id, v]));

  // Lignes connues, dans l'ordre du panier (une pointure supprimée disparaît sans bruit).
  const known = input.lines.flatMap((line) => {
    const v = byId.get(line.variantId);
    if (!v) return [];
    const c = v.colorway;
    const onSale =
      v.isActive && c.isActive && c.publishedAt !== null && c.publishedAt <= now && c.product.isActive && c.product.brand.isActive;
    const available = onSale && v.stock > 0;
    const quantity = available ? Math.min(line.quantity, v.stock) : line.quantity;
    const notice = !onSale
      ? 'Plus en vente'
      : v.stock === 0
        ? 'Plus disponible dans cette pointure'
        : quantity < line.quantity
          ? `Plus que ${v.stock} paire${v.stock > 1 ? 's' : ''} : quantité ajustée`
          : v.stock <= 2
            ? `Plus que ${v.stock} paire${v.stock > 1 ? 's' : ''} en ${v.sizeEu}`
            : null;
    return [{ v, quantity, available, notice }];
  });

  const ruleLines: RuleLine[] = known
    .filter((k) => k.available)
    .map(({ v, quantity }) => ({
      key: v.id,
      colorwayId: v.colorway.id,
      brandId: v.colorway.product.brandId,
      categoryId: v.colorway.product.categoryId,
      collectionIds: v.colorway.collectionItems.map((i) => i.collectionId),
      unitPrice: v.priceOverride ?? v.colorway.price,
      compareAtPrice: v.colorway.compareAtPrice,
      quantity,
    }));

  const rawCode = input.code ? normalizeCode(input.code) : null;
  const found = rawCode ? await findCodePromotion(rawCode, input.phone ?? null, { tx: input.tx, lock: Boolean(input.tx) }) : null;
  const pricing = priceCart({ lines: ruleLines, automatic, deliveryFee: zone?.fee ?? 0, code: found, now });
  const priced = new Map(pricing.lines.map((l) => [l.key, l]));

  const lines: CartViewLine[] = known.map(({ v, quantity, available, notice }) => {
    const p = priced.get(v.id);
    const unitPrice = v.priceOverride ?? v.colorway.price;
    return {
      variantId: v.id,
      href: `/produits/${v.colorway.slug}`,
      brand: v.colorway.product.brand.name,
      model: v.colorway.product.name,
      colorway: v.colorway.name,
      size: v.sizeEu,
      sku: v.sku,
      imagePath: v.colorway.images[0]?.url ?? null,
      imageUrl: productImageUrl(v.colorway.images[0]?.url),
      unitPrice,
      compareAtPrice: v.colorway.compareAtPrice && v.colorway.compareAtPrice > unitPrice ? v.colorway.compareAtPrice : null,
      unitDiscount: p?.unitDiscount ?? 0,
      promotion: p?.promotion ?? null,
      quantity,
      stock: v.stock,
      available,
      notice,
    };
  });

  const counted = lines.filter((l) => l.available);
  const gross = counted.reduce((sum, l) => sum + (l.compareAtPrice ?? l.unitPrice) * l.quantity, 0);

  return {
    lines,
    pairs: pricing.pairs,
    gross,
    subtotal: pricing.subtotal,
    savings: gross - pricing.subtotal,
    codeDiscount: pricing.codeDiscount,
    appliedCode: pricing.appliedCode,
    codeError: rawCode && !found ? 'Ce code promo n’existe pas.' : pricing.codeError,
    delivery: zone ? { zoneId: zone.id, zoneName: zone.name, fee: pricing.deliveryFee, freeBy: pricing.freeDeliveryBy?.name ?? null } : null,
    total: zone ? pricing.total : pricing.subtotal - pricing.codeDiscount,
  };
}
