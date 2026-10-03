import { randomUUID } from 'node:crypto';
import { withAdmin, type Tx } from '@/lib/db-context';
import { DomainError } from '@/lib/errors';
import { slugify } from '@/lib/slug';
import type { FieldErrors, ValidProductInput } from '../schemas';
import { applyStockDelta, StockChangedError } from './stock';

/** Erreur rattachée à des champs du formulaire (clé "form" : message général). */
export class ProductFieldError extends DomainError {
  constructor(public readonly fieldErrors: FieldErrors) {
    super(fieldErrors.form ?? Object.values(fieldErrors)[0] ?? 'Formulaire invalide.', 'PRODUCT_FIELD');
    this.name = 'ProductFieldError';
  }
}

export type SavedProduct = {
  id: string;
  updatedAt: string;
  /** Photos qui ne sont plus utilisées : à supprimer du stockage APRÈS la validation. */
  removedImagePaths: string[];
};

/** Modification : produit visé et version chargée par le formulaire. Création : null. */
export type SaveTarget = { productId: string; expectedUpdatedAt: string } | null;

/**
 * Crée ou met à jour un produit et ses coloris, en UNE transaction signée (audit) :
 *  - modification concurrente (version chargée ≠ version en base) → refus ;
 *  - marque et catégorie saisies : reprises si elles existent, créées sinon ;
 *  - coloris / pointure retirés : supprimés s'ils n'ont jamais été vendus, désactivés sinon ;
 *  - stock : la différence avec le stock chargé est appliquée en relatif et tracée
 *    (mouvement RESTOCK ou ADJUSTMENT) ; une commande passée entre-temps n'est jamais écrasée ;
 *  - photos : la sélection du formulaire fait foi (ordre = position, la 1re est la principale).
 */
export async function saveProduct(adminId: string, input: ValidProductInput, target: SaveTarget): Promise<SavedProduct> {
  return withAdmin(adminId, async (tx) => {
    const current = target ? await loadCurrent(tx, target) : null;
    const publish = input.intent === 'publish';

    // ── Marque, catégorie ───────────────────────────────────────────────────
    const brandSlug = slugify(input.brandName);
    if (!brandSlug) throw new ProductFieldError({ brandName: 'Nom de marque invalide.' });
    const brand = await tx.brand.upsert({
      where: { slug: brandSlug },
      update: {},
      create: { name: input.brandName, slug: brandSlug },
      select: { id: true, name: true },
    });

    let categoryId: string | null = null;
    if (input.categoryName) {
      const categorySlug = slugify(input.categoryName);
      if (!categorySlug) throw new ProductFieldError({ categoryName: 'Nom de catégorie invalide.' });
      categoryId = (
        await tx.category.upsert({
          where: { slug: categorySlug },
          update: {},
          create: { name: input.categoryName, slug: categorySlug },
          select: { id: true },
        })
      ).id;
    }

    // ── Produit ─────────────────────────────────────────────────────────────
    // Adresse : conservée tant qu'elle n'est pas modifiée volontairement (liens partagés).
    let slug = input.slug ?? current?.slug;
    if (input.slug && input.slug !== current?.slug) {
      const taken = await tx.product.findUnique({ where: { slug: input.slug }, select: { id: true } });
      if (taken) throw new ProductFieldError({ slug: 'Cette adresse est déjà utilisée par un autre produit.' });
    }
    slug ??= await uniqueSlug(tx, 'product', slugify(`${brand.name} ${input.name}`));

    const productData = {
      brandId: brand.id,
      categoryId,
      name: input.name,
      slug,
      gender: input.gender,
      description: input.description ?? null,
      sizeAdvice: input.sizeAdvice ?? null,
      isActive: publish,
    };
    const productId = current
      ? (await tx.product.update({ where: { id: current.id }, data: productData, select: { id: true } })).id
      : (await tx.product.create({ data: productData, select: { id: true } })).id;

    // ── Coloris ─────────────────────────────────────────────────────────────
    const existingColorways = new Map((current?.colorways ?? []).map((c) => [c.id, c]));
    const keptColorwayIds = new Set(input.colorways.flatMap((c) => (c.id ? [c.id] : [])));
    for (const id of keptColorwayIds) {
      if (!existingColorways.has(id)) throw new ProductFieldError({ form: 'Un coloris ne correspond plus à ce produit. Recharge la page.' });
    }

    const previousPaths = new Set((current?.colorways ?? []).flatMap((c) => c.images.map((image) => image.url)));
    const nextPaths = new Set<string>();

    // Retirés du formulaire : supprimés s'ils n'ont jamais été vendus, désactivés (photos conservées) sinon.
    for (const [id, colorway] of existingColorways) {
      if (keptColorwayIds.has(id)) continue;
      if (colorway.variants.some(wasSold)) {
        await tx.colorway.update({ where: { id }, data: { isActive: false } });
        await tx.variant.updateMany({ where: { colorwayId: id }, data: { isActive: false } });
        for (const image of colorway.images) nextPaths.add(image.url);
      } else {
        await deleteStockJournal(tx, colorway.variants.map((v) => v.id));
        await tx.colorway.delete({ where: { id } });
      }
    }

    for (const colorway of input.colorways) {
      const existing = colorway.id ? existingColorways.get(colorway.id) : undefined;
      const colorwaySlug = existing?.slug ?? (await uniqueSlug(tx, 'colorway', slugify(`${brand.name} ${input.name} ${colorway.name}`)));
      const onSale = publish && colorway.isActive;
      const colorwayData = {
        name: colorway.name,
        styleCode: colorway.styleCode ?? null,
        price: colorway.price,
        compareAtPrice: colorway.compareAtPrice ?? null,
        isActive: colorway.isActive,
        publishedAt: existing?.publishedAt ?? (onSale ? new Date() : null),
      };
      const colorwayId = existing
        ? (await tx.colorway.update({ where: { id: existing.id }, data: colorwayData, select: { id: true } })).id
        : (await tx.colorway.create({ data: { ...colorwayData, productId, slug: colorwaySlug }, select: { id: true } })).id;

      // Photos
      await tx.colorwayImage.deleteMany({ where: { colorwayId } });
      if (colorway.images.length > 0) {
        await tx.colorwayImage.createMany({
          data: colorway.images.map((image, position) => ({
            colorwayId,
            url: image.path,
            alt: image.alt ?? `${brand.name} ${input.name} ${colorway.name}`,
            width: image.width ?? null,
            height: image.height ?? null,
            position,
          })),
        });
      }
      for (const image of colorway.images) nextPaths.add(image.path);

      // Pointures
      const existingVariants = new Map((existing?.variants ?? []).map((v) => [v.id, v]));
      const bySize = new Map((existing?.variants ?? []).map((v) => [v.sizeEu, v]));
      const keptVariantIds = new Set<string>();
      const resolved = colorway.variants.map((variant) => {
        if (variant.id) {
          if (!existingVariants.has(variant.id)) {
            throw new ProductFieldError({ form: 'Une pointure ne correspond plus à ce coloris. Recharge la page.' });
          }
          keptVariantIds.add(variant.id);
          return { ...variant, current: existingVariants.get(variant.id)! };
        }
        // Pointure retirée puis remise : on reprend la ligne existante (unicité coloris × pointure).
        const previous = bySize.get(variant.sizeEu);
        if (previous && !colorway.variants.some((v) => v.id === previous.id)) {
          keptVariantIds.add(previous.id);
          return { ...variant, id: previous.id, stockLoaded: previous.stock, current: previous };
        }
        return { ...variant, current: undefined };
      });

      for (const [id, variant] of existingVariants) {
        if (keptVariantIds.has(id)) continue;
        if (wasSold(variant)) {
          await tx.variant.update({ where: { id }, data: { isActive: false } });
        } else {
          await deleteStockJournal(tx, [id]);
          await tx.variant.delete({ where: { id } });
        }
      }

      for (const variant of resolved) {
        const sku = variant.sku?.toUpperCase() ?? defaultSku(colorway.styleCode ?? colorwaySlug, variant.sizeEu);
        if (variant.current) {
          await tx.variant.update({
            where: { id: variant.current.id },
            data: { sizeEu: variant.sizeEu, sku, isActive: variant.isActive },
          });
          const delta = variant.stock - variant.stockLoaded;
          if (delta !== 0) await applyFormDelta(tx, adminId, variant.current.id, delta, 'Formulaire produit');
        } else {
          const created = await tx.variant.create({
            data: { colorwayId, sizeEu: variant.sizeEu, sku, stock: 0, isActive: variant.isActive },
            select: { id: true },
          });
          if (variant.stock > 0) await applyFormDelta(tx, adminId, created.id, variant.stock, 'Stock initial');
        }
      }
    }

    const saved = await tx.product.findUniqueOrThrow({ where: { id: productId }, select: { updatedAt: true } });
    return {
      id: productId,
      updatedAt: saved.updatedAt.toISOString(),
      removedImagePaths: [...previousPaths].filter((path) => !nextPaths.has(path)),
    };
  });
}

// -----------------------------------------------------------------------------

type CurrentVariant = { id: string; sizeEu: number; stock: number; _count: { orderItems: number } };

async function loadCurrent(tx: Tx, target: NonNullable<SaveTarget>) {
  const current = await tx.product.findUnique({
    where: { id: target.productId },
    select: {
      id: true,
      slug: true,
      updatedAt: true,
      colorways: {
        select: {
          id: true,
          slug: true,
          publishedAt: true,
          images: { select: { url: true } },
          variants: {
            select: { id: true, sizeEu: true, stock: true, _count: { select: { orderItems: true } } },
          },
        },
      },
    },
  });
  if (!current) throw new DomainError('Ce produit n’existe plus.', 'PRODUCT_NOT_FOUND');
  if (current.updatedAt.getTime() !== new Date(target.expectedUpdatedAt).getTime()) {
    throw new DomainError(
      'Ce produit a été modifié entre-temps (autre appareil ou autre admin). Recharge la page pour repartir de la dernière version.',
      'CONCURRENT_UPDATE',
    );
  }
  return current;
}

/** Une pointure vendue au moins une fois reste en base (masquée) : les commandes y sont liées. */
function wasSold(variant: CurrentVariant): boolean {
  return variant._count.orderItems > 0;
}

/**
 * Pointure jamais vendue, supprimée : son journal de stock (stock initial, réassorts,
 * corrections) part avec elle, il bloquerait sinon la suppression (ON DELETE RESTRICT).
 */
async function deleteStockJournal(tx: Tx, variantIds: string[]) {
  if (variantIds.length > 0) await tx.stockMovement.deleteMany({ where: { variantId: { in: variantIds } } });
}

/** Écart de stock depuis le formulaire : un stock changé entre-temps devient une erreur du formulaire. */
async function applyFormDelta(tx: Tx, adminId: string, variantId: string, delta: number, note: string) {
  try {
    await applyStockDelta(tx, adminId, variantId, delta, note);
  } catch (error) {
    if (error instanceof StockChangedError) {
      throw new ProductFieldError({ form: 'Des paires ont été vendues pendant la modification : le stock a changé. Recharge la page.' });
    }
    throw error;
  }
}

/** Adresse libre : « nike-air-force-1 », sinon « nike-air-force-1-2 », « -3 »… */
async function uniqueSlug(tx: Tx, kind: 'product' | 'colorway', base: string): Promise<string> {
  const root = base || 'sneaker';
  for (let i = 1; i <= 30; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const taken =
      kind === 'product'
        ? await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } })
        : await tx.colorway.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  return `${root}-${randomUUID().slice(0, 8)}`;
}

/** SKU par défaut : code style (ou adresse du coloris) + pointure, ex. « CW2288-111-43 ». */
function defaultSku(base: string, sizeEu: number): string {
  const stem = base
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56);
  return `${stem || 'MS'}-${sizeEu}`;
}
