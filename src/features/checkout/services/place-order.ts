import { prisma } from '@/lib/prisma';
import { TX_OPTIONS } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';
import { toDomainError, DatabaseRuleError } from '@/lib/db-errors';
import { priceCartLines, type CartView } from '@/features/cart/pricing';
import { RESERVATION_HOURS, type ValidCheckoutInput } from '../schemas';

/** Refus expliqué au client ; `view` : le panier recalculé à lui remontrer. */
export class CheckoutRefusedError extends DomainError {
  constructor(
    message: string,
    public readonly view?: CartView,
    public readonly field?: string,
  ) {
    super(message, 'CHECKOUT_REFUSED');
    this.name = 'CheckoutRefusedError';
  }
}

/**
 * Enregistre une commande, en UNE transaction :
 *  1. le panier est recalculé en base (prix, stock, promotions, code verrouillé, livraison) ;
 *  2. tout écart avec ce que le client a vu (paire épuisée, quantité réduite, code refusé,
 *     total différent) annule l'opération et lui est montré ;
 *  3. client (par téléphone), commande, lignes figées et historique sont créés ;
 *  4. les paires sont réservées (reserve_order_stock) : une pointure vendue entre-temps
 *     annule tout ([MS001]).
 * La réservation expire si la commande n'est pas confirmée à temps (Wave 2 h, livraison 24 h).
 */
export async function placeOrder(input: ValidCheckoutInput): Promise<{ orderId: string; reference: string }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const view = await priceCartLines({ lines: input.lines, code: input.code, phone: input.customerPhone, zoneId: input.zoneId, tx });

      if (!view.delivery) throw new CheckoutRefusedError('Cette zone de livraison n’est plus disponible : choisis-en une autre.', view, 'zoneId');
      const gone = view.lines.filter((l) => !l.available);
      if (gone.length > 0) {
        throw new CheckoutRefusedError(
          `${gone.map((l) => `${l.model} (${l.size})`).join(', ')} n’${gone.length > 1 ? 'ont' : 'a'} plus de stock. Retire-${gone.length > 1 ? 'les' : 'la'} de ton panier pour continuer.`,
          view,
        );
      }
      const reduced = view.lines.filter((l) => l.quantity < (input.lines.find((r) => r.variantId === l.variantId)?.quantity ?? 0));
      if (reduced.length > 0) throw new CheckoutRefusedError('Le stock a changé : quantités ajustées. Vérifie ton panier avant de confirmer.', view);
      if (input.code && view.codeError) throw new CheckoutRefusedError(view.codeError, view, 'code');
      if (view.total !== input.expectedTotal) {
        throw new CheckoutRefusedError('Le total a changé (prix ou promotion mis à jour). Vérifie-le avant de confirmer.', view);
      }

      const customer = await tx.customer.upsert({
        where: { phone: input.customerPhone },
        update: { fullName: input.customerName },
        create: { fullName: input.customerName, phone: input.customerPhone },
        select: { id: true },
      });

      const notes = [input.landmark ? `Repère : ${input.landmark}` : null, input.note ?? null].filter(Boolean).join('\n');
      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          paymentMethod: input.paymentMethod,
          customerName: input.customerName,
          customerPhone: input.customerPhone,
          customerPhoneAlt: input.customerPhoneAlt ?? null,
          deliveryZoneId: view.delivery.zoneId,
          deliveryZoneName: view.delivery.zoneName,
          deliveryAddress: `${input.city} — ${input.address}`,
          deliveryNotes: notes || null,
          subtotal: view.subtotal,
          deliveryFee: view.delivery.fee,
          discountAmount: view.codeDiscount,
          total: view.total,
          promotionId: view.appliedCode?.id ?? null,
          promotionCode: view.appliedCode?.code ?? null,
          expiresAt: new Date(Date.now() + RESERVATION_HOURS[input.paymentMethod] * 3_600_000),
          items: {
            create: view.lines.map((l) => ({
              variantId: l.variantId,
              productName: l.model,
              brandName: l.brand,
              colorwayName: l.colorway,
              sizeEu: l.size,
              sku: l.sku,
              imageUrl: l.imagePath,
              unitPrice: l.unitPrice,
              unitDiscount: l.unitDiscount,
              promotionId: l.unitDiscount > 0 ? (l.promotion?.id ?? null) : null,
              promotionName: l.unitDiscount > 0 ? (l.promotion?.name ?? null) : null,
              quantity: l.quantity,
            })),
          },
          statusHistory: { create: { fromStatus: null, toStatus: 'PENDING', note: 'Commande passée sur le site', changedBy: 'client' } },
        },
        select: { id: true, reference: true },
      });

      // $executeRaw : la fonction renvoie `void`, que $queryRaw ne sait pas lire (P2010).
      await tx.$executeRaw`SELECT reserve_order_stock(${order.id}::uuid, 'client')`;
      return { orderId: order.id, reference: order.reference };
    }, TX_OPTIONS);
  } catch (error) {
    const domain = toDomainError(error);
    if (domain instanceof DatabaseRuleError && domain.sqlState === 'MS001') {
      throw new CheckoutRefusedError('Une paire de ton panier vient d’être vendue. Vérifie ton panier avant de confirmer.');
    }
    throw domain;
  }
}
