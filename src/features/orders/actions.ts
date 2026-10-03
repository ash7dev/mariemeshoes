'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/auth/require-admin';
import { toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import {
  advanceOrder,
  cancelOrder,
  markOrderPaid,
  markOrderPaymentFailed,
  markOrderRefunded,
  markOrderUnpaid,
  returnOrder,
} from './services';

export type OrderActionResult = { ok: true; message: string } | { ok: false; error: string };

async function run(message: string, fn: (adminId: string) => Promise<unknown>): Promise<OrderActionResult> {
  const admin = await requireAdmin();
  try {
    await fn(admin.id);
    // Liste, fiche, pastilles de navigation et stock de la boutique (annulation, retour).
    revalidatePath('/', 'layout');
    return { ok: true, message };
  } catch (error) {
    const domain = toDomainError(error);
    if (domain instanceof DomainError) return { ok: false, error: domain.message };
    console.error('Action commande impossible', error);
    return { ok: false, error: 'L’action n’a pas pu être enregistrée. Réessaie dans un instant.' };
  }
}

export async function confirmOrderAction(orderId: string) {
  return run('Commande confirmée.', (adminId) => advanceOrder(adminId, orderId, 'CONFIRMED'));
}

export async function prepareOrderAction(orderId: string) {
  return run('Commande en préparation.', (adminId) => advanceOrder(adminId, orderId, 'PREPARING'));
}

export async function shipOrderAction(orderId: string) {
  return run('Commande en livraison.', (adminId) => advanceOrder(adminId, orderId, 'SHIPPED'));
}

/** Livrée ; `collected` : le livreur a encaissé (paiement à la livraison). */
export async function deliverOrderAction(orderId: string, collected: boolean) {
  return run(collected ? 'Commande livrée et encaissée.' : 'Commande livrée.', (adminId) => advanceOrder(adminId, orderId, 'DELIVERED', collected));
}

export async function cancelOrderAction(orderId: string, reason: string) {
  return run('Commande annulée : les paires sont remises en stock.', (adminId) => cancelOrder(adminId, orderId, reason.slice(0, 300)));
}

export async function returnOrderAction(orderId: string, note: string) {
  return run('Retour enregistré : les paires sont remises en stock.', (adminId) => returnOrder(adminId, orderId, note.slice(0, 300)));
}

export async function markOrderPaidAction(orderId: string, waveReference?: string) {
  return run('Paiement enregistré.', (adminId) => markOrderPaid(adminId, orderId, waveReference));
}

export async function markPaymentFailedAction(orderId: string) {
  return run('Paiement marqué comme non abouti.', (adminId) => markOrderPaymentFailed(adminId, orderId));
}

export async function refundOrderAction(orderId: string) {
  return run('Remboursement enregistré.', (adminId) => markOrderRefunded(adminId, orderId));
}

export async function markOrderUnpaidAction(orderId: string) {
  return run('Paiement annulé (correction).', (adminId) => markOrderUnpaid(adminId, orderId));
}
