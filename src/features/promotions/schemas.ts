import { z } from 'zod';
import { normalizeCode } from './rules';

/**
 * Formulaire promotion (création ET modification) : UN schéma partagé par le
 * navigateur et la Server Action. Reprend les contraintes SQL de la migration
 * *_promotions, pour que les erreurs s'affichent dans le formulaire.
 */

export const PROMOTION_LIMITS = { name: 120, description: 500, maxAmount: 10_000_000, maxUses: 100_000 } as const;

export const PROMOTION_KINDS = ['AUTOMATIC', 'CODE'] as const;
export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DELIVERY'] as const;

/** Champ facultatif « nombre entier positif » saisi en texte (« 50 000 »). */
const optionalInt = (label: string, min = 1) =>
  z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => (typeof v === 'string' ? v.replace(/\s/g, '') : v))
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || Number.isInteger(v), `${label} : nombre entier.`)
    .refine((v) => v === undefined || v >= min, `${label} : au moins ${min}.`)
    .refine((v) => v === undefined || v <= PROMOTION_LIMITS.maxAmount, `${label} : valeur trop élevée.`);

/** Date et heure saisies (input datetime-local) : heure de Dakar = UTC. */
const LOCAL_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const toDate = (v: string) => new Date(`${v}:00Z`);

export const promotionInputSchema = z
  .object({
    kind: z.enum(PROMOTION_KINDS),
    name: z.string().trim().min(2, 'Donne un nom à la promotion.').max(PROMOTION_LIMITS.name, `${PROMOTION_LIMITS.name} caractères au maximum.`),
    description: z
      .string()
      .trim()
      .max(PROMOTION_LIMITS.description, `${PROMOTION_LIMITS.description} caractères au maximum.`)
      .optional()
      .transform((v) => (v ? v : undefined)),
    code: z
      .string()
      .optional()
      .transform((v) => (v ? normalizeCode(v) : undefined)),
    discountType: z.enum(DISCOUNT_TYPES),
    value: optionalInt('Valeur'),
    maxDiscount: optionalInt('Plafond'),
    scope: z.enum(['ALL', 'TARGETS']),
    targets: z.object({
      brandIds: z.array(z.uuid()),
      categoryIds: z.array(z.uuid()),
      collectionIds: z.array(z.uuid()),
      colorwayIds: z.array(z.uuid()),
    }),
    minSubtotal: optionalInt('Minimum d’achat'),
    minPairs: optionalInt('Minimum de paires'),
    firstOrderOnly: z.boolean(),
    usageLimit: optionalInt('Utilisations'),
    usageLimitPerCustomer: optionalInt('Utilisations par client'),
    stackable: z.boolean(),
    isActive: z.boolean(),
    startsAt: z.string().regex(LOCAL_DATETIME, 'Indique la date de début.').transform(toDate),
    endsAt: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || LOCAL_DATETIME.test(v), 'Date de fin invalide.')
      .transform((v) => (v ? toDate(v) : undefined)),
  })
  .superRefine((p, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });

    // Code
    if (p.kind === 'CODE') {
      if (!p.code) issue('code', 'Indique le code que le client saisira.');
      else if (!/^[A-Z0-9_-]{3,30}$/.test(p.code)) issue('code', '3 à 30 caractères : lettres, chiffres, - et _.');
    }

    // Valeur
    if (p.discountType === 'PERCENTAGE') {
      if (p.value === undefined) issue('value', 'Indique le pourcentage.');
      else if (p.value > 100) issue('value', 'Pourcentage entre 1 et 100.');
    } else if (p.discountType === 'FIXED_AMOUNT') {
      if (p.value === undefined) issue('value', 'Indique le montant de la remise.');
    }
    if (p.maxDiscount !== undefined && p.discountType !== 'PERCENTAGE') issue('maxDiscount', 'Le plafond ne s’applique qu’à un pourcentage.');

    // Cibles
    if (p.scope === 'TARGETS') {
      const count = p.targets.brandIds.length + p.targets.categoryIds.length + p.targets.collectionIds.length + p.targets.colorwayIds.length;
      if (count === 0) issue('targets', 'Choisis au moins une marque, catégorie, collection ou un coloris.');
    }

    // Promotion automatique : le prix affiché ne dépend pas du client ni du panier.
    if (p.kind === 'AUTOMATIC') {
      if (p.firstOrderOnly || p.usageLimit !== undefined || p.usageLimitPerCustomer !== undefined || p.stackable) {
        issue('kind', 'Les conditions client (première commande, utilisations, cumul) sont réservées aux codes promo.');
      }
      if (p.minPairs !== undefined) issue('minPairs', 'Réservé aux codes promo.');
      if (p.minSubtotal !== undefined && p.discountType !== 'FREE_DELIVERY') {
        issue('minSubtotal', 'Une remise automatique sur les paires ne peut pas dépendre du panier : utilise un code promo.');
      }
    }

    if (p.usageLimit !== undefined && p.usageLimitPerCustomer !== undefined && p.usageLimitPerCustomer > p.usageLimit) {
      issue('usageLimitPerCustomer', 'Ne peut pas dépasser le nombre total d’utilisations.');
    }
    if (p.endsAt && p.endsAt <= p.startsAt) issue('endsAt', 'La fin doit être après le début.');
  });

export const promotionUpdateMetaSchema = z.object({
  promotionId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export type PromotionInput = z.input<typeof promotionInputSchema>;
export type ValidPromotionInput = z.output<typeof promotionInputSchema>;
