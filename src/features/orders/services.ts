import type { OrderStatus, PaymentStatus } from '@/generated/prisma/enums';
import { withAdmin, type Tx } from '@/lib/db-context';
import { isUniqueViolation, toDomainError } from '@/lib/db-errors';
import { DomainError, OrderNotFoundError, ValidationError } from '@/lib/errors';
import { assertValidPaymentTransition, assertValidStatusTransition } from './status-machine';

/**
 * Actions admin sur les commandes. Toutes passent par withAdmin() et écrivent
 * l'historique (order_status_history) au nom de l'admin.
 *
 * Chaque changement est conditionnel à l'état lu (UPDATE … WHERE status = lu) :
 * si quelqu'un a agi entre-temps (autre appareil, expiration automatique),
 * l'action échoue au lieu d'écraser.
 */

async function run<T>(adminId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await withAdmin(adminId, fn);
  } catch (error) {
    if (isUniqueViolation(error, 'wave_reference')) {
      throw new DomainError('Cette référence Wave est déjà utilisée par une autre commande. Vérifie la transaction.', 'WAVE_REFERENCE_TAKEN');
    }
    throw toDomainError(error);
  }
}

async function loadOrder(tx: Tx, orderId: string) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, paymentStatus: true, paymentMethod: true, total: true },
  });
  if (!order) throw new OrderNotFoundError(orderId);
  return order;
}

function concurrentChange(): never {
  throw new DomainError('La commande a été modifiée entre-temps : recharge la page.', 'CONCURRENT_UPDATE');
}

async function addHistory(tx: Tx, adminId: string, orderId: string, from: OrderStatus, to: OrderStatus, note?: string) {
  await tx.orderStatusHistory.create({ data: { orderId, fromStatus: from, toStatus: to, note: note ?? null, changedBy: adminId } });
}

/**
 * Fait avancer la commande : confirmer, préparer, expédier, livrer.
 * Livrer une commande « à la livraison » avec `collected` : encaissée dans la même transaction.
 */
export function advanceOrder(adminId: string, orderId: string, next: Extract<OrderStatus, 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'DELIVERED'>, collected = false) {
  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertValidStatusTransition(order.status, next);

    const now = new Date();
    const dates =
      next === 'CONFIRMED'
        ? // Confirmée : la réservation de stock n'expire plus (voir expire_pending_orders).
          { confirmedAt: now, expiresAt: null }
        : next === 'SHIPPED'
          ? { shippedAt: now }
          : next === 'DELIVERED'
            ? { deliveredAt: now }
            : {};
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: next, ...dates },
    });
    if (count === 0) concurrentChange();
    await addHistory(tx, adminId, orderId, order.status, next);

    if (next === 'DELIVERED' && collected && order.paymentMethod === 'CASH_ON_DELIVERY' && order.paymentStatus !== 'PAID') {
      await applyPayment(tx, adminId, order, 'PAID');
    }
  });
}

/** Annule la commande et remet les paires en stock (release_order_stock), dans la même transaction. */
export function cancelOrder(adminId: string, orderId: string, reason: string) {
  const cancelReason = reason.trim();
  if (!cancelReason) throw new ValidationError("Le motif d'annulation est obligatoire.");

  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertValidStatusTransition(order.status, 'CANCELLED');
    if (order.paymentStatus === 'PAID') {
      throw new DomainError('Commande payée : enregistre d’abord le remboursement.', 'REFUND_REQUIRED');
    }
    const { count } = await tx.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status: 'CANCELLED', cancelReason, cancelledAt: new Date(), expiresAt: null },
    });
    if (count === 0) concurrentChange();
    await addHistory(tx, adminId, orderId, order.status, 'CANCELLED', cancelReason);
    await tx.$executeRaw`SELECT release_order_stock(${orderId}::uuid, 'CANCELLATION'::stock_movement_reason, ${adminId})`;
  });
}

/** Retour après livraison : la paire revient en stock, vendable comme neuve (décision métier). */
export function returnOrder(adminId: string, orderId: string, note: string) {
  const reason = note.trim();
  if (!reason) throw new ValidationError('Indique la raison du retour.');

  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    assertValidStatusTransition(order.status, 'RETURNED');
    const { count } = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: 'RETURNED' } });
    if (count === 0) concurrentChange();
    await addHistory(tx, adminId, orderId, order.status, 'RETURNED', reason);
    await tx.$executeRaw`SELECT release_order_stock(${orderId}::uuid, 'RETURN'::stock_movement_reason, ${adminId})`;
  });
}

/** Paiement Wave vérifié (avec la référence de la transaction) ou paiement à la livraison encaissé. */
export function markOrderPaid(adminId: string, orderId: string, waveReference?: string) {
  return run(adminId, async (tx) => {
    const order = await loadOrder(tx, orderId);
    if (order.status === 'CANCELLED') throw new DomainError('Commande annulée : aucun paiement attendu.', 'ORDER_LOCKED');
    await applyPayment(tx, adminId, order, 'PAID', waveReference);
  });
}

/** Paiement Wave non abouti (le client n'a pas payé). */
export function markOrderPaymentFailed(adminId: string, orderId: string) {
  return run(adminId, async (tx) => applyPayment(tx, adminId, await loadOrder(tx, orderId), 'FAILED'));
}

export function markOrderRefunded(adminId: string, orderId: string) {
  return run(adminId, async (tx) => applyPayment(tx, adminId, await loadOrder(tx, orderId), 'REFUNDED'));
}

/** Correction d'une erreur de saisie : le paiement n'avait pas eu lieu. */
export function markOrderUnpaid(adminId: string, orderId: string) {
  return run(adminId, async (tx) => applyPayment(tx, adminId, await loadOrder(tx, orderId), 'PENDING'));
}

/**
 * Change le statut de paiement de la commande ET la ligne de paiement correspondante
 * (créée au besoin). Référence Wave unique en base : une même transaction ne peut pas
 * valider deux commandes.
 */
async function applyPayment(
  tx: Tx,
  adminId: string,
  order: Awaited<ReturnType<typeof loadOrder>>,
  next: PaymentStatus,
  waveReference?: string,
) {
  assertValidPaymentTransition(order.paymentStatus, next);
  const { count } = await tx.order.updateMany({
    where: { id: order.id, paymentStatus: order.paymentStatus },
    data: { paymentStatus: next },
  });
  if (count === 0) concurrentChange();

  const reference = order.paymentMethod === 'WAVE' ? waveReference?.trim().slice(0, 80) || undefined : undefined;
  const paid = next === 'PAID';
  const data = {
    status: next,
    amount: order.total,
    confirmedAt: paid ? new Date() : null,
    confirmedBy: paid ? adminId : null,
    ...(reference ? { waveReference: reference } : {}),
    ...(next === 'PENDING' ? { waveReference: null } : {}),
  };

  const payment = await tx.payment.findFirst({
    where: { orderId: order.id, method: order.paymentMethod },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (payment) await tx.payment.update({ where: { id: payment.id }, data });
  else await tx.payment.create({ data: { ...data, orderId: order.id, method: order.paymentMethod } });
}
