'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { notifyNewOrder } from '@/features/notifications/events';
import { expireStaleOrders } from '@/features/orders/expiry';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import type { CartView } from '@/features/cart/pricing';
import { checkoutSchema, type CheckoutInput } from './schemas';
import { CheckoutRefusedError, placeOrder } from './services/place-order';

export type PlaceOrderResult =
  | { ok: true; orderId: string; reference: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors; view?: CartView };

/** Passe la commande. En cas de refus, renvoie la raison (et le panier recalculé s'il a changé). */
export async function placeOrderAction(input: CheckoutInput): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Certains champs sont à corriger.', fieldErrors: toFieldErrors(parsed.error) };
  }
  try {
    const order = await placeOrder(parsed.data);
    // Stock et tableau de bord : la boutique et l'admin voient la réservation tout de suite.
    revalidatePath('/', 'layout');
    // Alerte des admins (nouvelle commande, stock bas) une fois le client servi.
    after(async () => {
      await notifyNewOrder(order.orderId).catch((error) => console.error('Notification de commande impossible', error));
      await expireStaleOrders();
    });
    return { ok: true, ...order };
  } catch (error) {
    if (error instanceof CheckoutRefusedError) {
      return { ok: false, error: error.message, view: error.view, fieldErrors: error.field ? { [error.field]: error.message } : undefined };
    }
    console.error('Commande impossible', error);
    return { ok: false, error: 'La commande n’a pas pu être enregistrée. Vérifie ta connexion et réessaie : rien n’a été débité.' };
  }
}
