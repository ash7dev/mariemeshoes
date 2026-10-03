import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';
import { COLORWAY_IMAGE_PATH, MAX_COLORWAY_IMAGES } from '@/lib/supabase/storage';

/**
 * Formulaire produit (création ET modification) : UN schéma partagé par le
 * navigateur (erreurs immédiates) et par la Server Action (autorité).
 * Les limites reprennent les contraintes de la base (migration init).
 *
 *   Produit (modèle) ─┬─ Coloris (une page boutique : prix, photos)
 *                     │    └─ Pointures (stock, SKU)
 *                     └─ …
 */

export const PRODUCT_LIMITS = {
  name: 120,
  description: 4000,
  sizeAdvice: 200,
  brandName: 60,
  categoryName: 60,
  colorwayName: 80,
  styleCode: 40,
  sku: 64,
  maxColorways: 20,
  maxPrice: 10_000_000,
  maxStock: 999,
} as const;

export const GENDERS = ['MEN', 'WOMEN', 'UNISEX', 'KIDS'] as const;
export type GenderValue = (typeof GENDERS)[number];
export const GENDER_LABEL: Record<GenderValue, string> = {
  MEN: 'Homme',
  WOMEN: 'Femme',
  UNISEX: 'Unisexe',
  KIDS: 'Enfant',
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au maximum.`)
    .optional()
    .transform((value) => (value ? value : undefined));

/** Nombre saisi dans un champ texte (« 45 000 ») ou déjà numérique. */
const numberish = z.union([z.number(), z.string().trim().transform((v) => v.replace(/\s/g, ''))]);

const price = numberish.pipe(
  z.coerce
    .number<string | number>('Indique le prix.')
    .int('Prix en FCFA, sans décimale.')
    .positive('Le prix doit être supérieur à 0.')
    .max(PRODUCT_LIMITS.maxPrice, 'Prix trop élevé.'),
);

/** Prix barré : facultatif (champ vide = pas de promotion). */
const optionalPrice = z
  .union([z.number(), z.string().trim()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : v))
  .pipe(price.optional());

export const variantSchema = z.object({
  /** Identifiant local (navigateur), pour les listes React et les messages d'erreur. */
  key: z.string(),
  /** Pointure existante (modification). Absent : nouvelle pointure. */
  id: z.uuid().optional(),
  sizeEu: z.number().int().min(16, 'Pointure invalide.').max(46, 'Pointure invalide.'),
  stock: numberish.pipe(
    z.coerce.number<string | number>('Indique le stock.').int('Nombre entier.').min(0, 'Pas de stock négatif.').max(PRODUCT_LIMITS.maxStock, 'Stock trop élevé.'),
  ),
  /** Stock au chargement du formulaire : la différence est enregistrée comme mouvement de stock. */
  stockLoaded: z.number().int().min(0),
  /** Vide : générée (code style ou coloris + pointure). */
  sku: optionalText(PRODUCT_LIMITS.sku),
  isActive: z.boolean(),
});

export const imageSchema = z.object({
  path: z.string().regex(COLORWAY_IMAGE_PATH, 'Image invalide.'),
  alt: optionalText(200),
  width: z.number().int().positive().max(10_000).optional(),
  height: z.number().int().positive().max(10_000).optional(),
});

export const colorwaySchema = z
  .object({
    key: z.string(),
    id: z.uuid().optional(),
    name: z.string().trim().min(1, 'Nomme le coloris.').max(PRODUCT_LIMITS.colorwayName, `${PRODUCT_LIMITS.colorwayName} caractères au maximum.`),
    styleCode: optionalText(PRODUCT_LIMITS.styleCode),
    price,
    compareAtPrice: optionalPrice,
    isActive: z.boolean(),
    images: z.array(imageSchema).max(MAX_COLORWAY_IMAGES, `${MAX_COLORWAY_IMAGES} photos au maximum.`),
    variants: z.array(variantSchema),
  })
  .superRefine((colorway, ctx) => {
    if (colorway.compareAtPrice !== undefined && colorway.compareAtPrice <= colorway.price) {
      ctx.addIssue({ code: 'custom', path: ['compareAtPrice'], message: 'Le prix barré doit être supérieur au prix.' });
    }
    const sizes = new Set<number>();
    colorway.variants.forEach((variant, index) => {
      if (sizes.has(variant.sizeEu)) {
        ctx.addIssue({ code: 'custom', path: ['variants', index, 'sizeEu'], message: 'Pointure en double.' });
      }
      sizes.add(variant.sizeEu);
    });
  });

export const productInputSchema = z
  .object({
    intent: z.enum(['draft', 'publish']),
    name: z.string().trim().min(2, 'Donne un nom au modèle.').max(PRODUCT_LIMITS.name, `${PRODUCT_LIMITS.name} caractères au maximum.`),
    /** Vide : générée depuis la marque et le nom (création) ou conservée (modification). */
    slug: z
      .string()
      .trim()
      .max(180)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || SLUG_PATTERN.test(v), 'Lettres minuscules, chiffres et tirets uniquement.'),
    brandName: z.string().trim().min(1, 'Indique la marque.').max(PRODUCT_LIMITS.brandName, `${PRODUCT_LIMITS.brandName} caractères au maximum.`),
    categoryName: optionalText(PRODUCT_LIMITS.categoryName),
    gender: z.enum(GENDERS, 'Choisis le genre.'),
    description: optionalText(PRODUCT_LIMITS.description),
    sizeAdvice: optionalText(PRODUCT_LIMITS.sizeAdvice),
    colorways: z
      .array(colorwaySchema)
      .min(1, 'Ajoute au moins un coloris.')
      .max(PRODUCT_LIMITS.maxColorways, `${PRODUCT_LIMITS.maxColorways} coloris au maximum.`),
  })
  .superRefine((product, ctx) => {
    const names = new Set<string>();
    product.colorways.forEach((colorway, index) => {
      const name = colorway.name.toLowerCase();
      if (names.has(name)) ctx.addIssue({ code: 'custom', path: ['colorways', index, 'name'], message: 'Ce coloris existe déjà.' });
      names.add(name);
    });

    const skus = new Set<string>();
    product.colorways.forEach((colorway, c) =>
      colorway.variants.forEach((variant, v) => {
        if (!variant.sku) return;
        const sku = variant.sku.toUpperCase();
        if (skus.has(sku)) ctx.addIssue({ code: 'custom', path: ['colorways', c, 'variants', v, 'sku'], message: 'SKU déjà utilisé.' });
        skus.add(sku);
      }),
    );

    // Publier exige une vitrine complète ; un brouillon peut rester incomplet.
    if (product.intent !== 'publish') return;
    const active = product.colorways.filter((colorway) => colorway.isActive);
    if (active.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['colorways'], message: 'Garde au moins un coloris en vente pour publier.' });
    }
    product.colorways.forEach((colorway, index) => {
      if (!colorway.isActive) return;
      if (colorway.images.length === 0) {
        ctx.addIssue({ code: 'custom', path: ['colorways', index, 'images'], message: 'Ajoute au moins une photo pour publier ce coloris.' });
      }
      if (!colorway.variants.some((variant) => variant.isActive)) {
        ctx.addIssue({ code: 'custom', path: ['colorways', index, 'variants'], message: 'Ajoute au moins une pointure pour publier ce coloris.' });
      }
    });
  });

/** Modification : le produit visé et la version chargée (détection des modifications concurrentes). */
export const productUpdateMetaSchema = z.object({
  productId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export type ProductInput = z.input<typeof productInputSchema>;
export type ValidProductInput = z.output<typeof productInputSchema>;

/** Erreurs à plat, indexées par chemin : "name", "colorways.0.price", "colorways.1.images"… */
export type FieldErrors = Record<string, string>;

export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'form';
    errors[path] ??= issue.message;
  }
  return errors;
}
