'use server';

import { z } from 'zod';
import { MAX_LINES, MAX_QUANTITY } from './limits';
import { priceCartLines, type CartView } from './pricing';

const requestSchema = z.object({
  lines: z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) })).max(MAX_LINES),
  code: z.string().trim().max(30).nullable().optional(),
  zoneId: z.uuid().nullable().optional(),
});

/**
 * Vue du panier calculée par le serveur (prix, stock, promotions, code, livraison).
 * Le navigateur n'envoie que des identifiants et des quantités : il ne fixe jamais un prix.
 */
export async function getCartViewAction(input: z.input<typeof requestSchema>): Promise<{ ok: true; view: CartView } | { ok: false; error: string }> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Panier illisible : recharge la page.' };
  try {
    const view = await priceCartLines({ lines: parsed.data.lines, code: parsed.data.code, zoneId: parsed.data.zoneId });
    return { ok: true, view };
  } catch (error) {
    console.error('Calcul du panier impossible', error);
    return { ok: false, error: 'Le panier n’a pas pu être mis à jour. Vérifie ta connexion et réessaie.' };
  }
}
