import type { OrderStatus, PaymentStatus } from '@/generated/prisma/enums';
import { InvalidStatusTransitionError } from '@/lib/errors';

/**
 * Transitions autorisées d'une commande. Sert à l'interface (boutons proposés)
 * et aux services (refus clair avant toute écriture).
 *
 *   PENDING → CONFIRMED → PREPARING → SHIPPED → DELIVERED → RETURNED
 *      └──────────┴────────────┴──────────┴──→ CANCELLED (stock remis)
 *
 * Préparation facultative : CONFIRMED → SHIPPED directement.
 * Refus à la livraison : SHIPPED → CANCELLED (la paire revient en stock).
 */
const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'SHIPPED', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

/**
 * PENDING → PAID (Wave vérifié, ou encaissé à la livraison) ou FAILED (Wave non abouti) ;
 * FAILED → PAID (nouvelle tentative) ; PAID → REFUNDED, ou PENDING pour corriger une erreur de saisie.
 */
const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ['PAID', 'FAILED'],
  FAILED: ['PAID', 'PENDING'],
  PAID: ['REFUNDED', 'PENDING'],
  REFUNDED: [],
};

/** Rester dans le même statut n'est PAS une transition : annuler deux fois rendrait deux fois le stock. */
export function canTransitionOrder(current: OrderStatus, next: OrderStatus): boolean {
  return ORDER_TRANSITIONS[current].includes(next);
}

export function nextOrderStatuses(current: OrderStatus): readonly OrderStatus[] {
  return ORDER_TRANSITIONS[current];
}

export function assertValidStatusTransition(current: OrderStatus, next: OrderStatus): void {
  if (!canTransitionOrder(current, next)) throw new InvalidStatusTransitionError(current, next);
}

export function canTransitionPayment(current: PaymentStatus, next: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[current].includes(next);
}

export function assertValidPaymentTransition(current: PaymentStatus, next: PaymentStatus): void {
  if (!canTransitionPayment(current, next)) throw new InvalidStatusTransitionError(current, next);
}

/** Commande en cours (ni livrée, ni annulée, ni retournée). */
export const OPEN_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED'];
