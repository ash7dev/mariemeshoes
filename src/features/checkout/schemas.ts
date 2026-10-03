import { z } from 'zod';
import { parseSenegalPhone } from '@/lib/phone';
import { MAX_LINES, MAX_QUANTITY } from '@/features/cart/limits';

/** Délais de réservation des paires d'une commande en attente (voir expire_pending_orders). */
export const RESERVATION_HOURS = { WAVE: 2, CASH_ON_DELIVERY: 24 } as const;

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max, `${max} caractères au maximum.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au maximum.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const phone = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const parsed = parseSenegalPhone(value);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'Numéro sénégalais invalide (ex. 77 123 45 67).' });
      return z.NEVER;
    }
    return parsed;
  });

export const checkoutSchema = z
  .object({
    customerName: text(2, 80, 'Indique ton nom et ton prénom.'),
    customerPhone: phone,
    customerPhoneAlt: z
      .string()
      .trim()
      .optional()
      .transform((value, ctx) => {
        if (!value) return undefined;
        const parsed = parseSenegalPhone(value);
        if (!parsed) {
          ctx.addIssue({ code: 'custom', message: 'Numéro sénégalais invalide (ex. 76 000 00 00).' });
          return z.NEVER;
        }
        return parsed;
      }),
    zoneId: z.uuid('Choisis ta zone de livraison.'),
    city: text(2, 80, 'Indique ton quartier ou ta ville.'),
    address: text(4, 200, 'Indique ton adresse pour le livreur.'),
    landmark: optionalText(120),
    note: optionalText(500),
    paymentMethod: z.enum(['WAVE', 'CASH_ON_DELIVERY'], 'Choisis comment tu paies.'),
    code: z
      .string()
      .trim()
      .max(30)
      .optional()
      .transform((v) => (v ? v : undefined)),
    lines: z
      .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
      .min(1, 'Ton panier est vide.')
      .max(MAX_LINES),
    /** Total affiché au client : s'il a changé (prix, stock, code), on le prévient avant d'enregistrer. */
    expectedTotal: z.number().int().min(0),
  })
  .superRefine((input, ctx) => {
    if (input.customerPhoneAlt && input.customerPhoneAlt === input.customerPhone) {
      ctx.addIssue({ code: 'custom', path: ['customerPhoneAlt'], message: 'Ce numéro est le même que le premier.' });
    }
  });

export type CheckoutInput = z.input<typeof checkoutSchema>;
export type ValidCheckoutInput = z.output<typeof checkoutSchema>;
