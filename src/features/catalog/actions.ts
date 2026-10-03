'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/features/auth/require-admin';
import { isUniqueViolation, toDomainError } from '@/lib/db-errors';
import { DomainError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { COLORWAY_IMAGE_PATH, PRODUCT_BUCKET, isImageExtension, newColorwayImagePath } from '@/lib/supabase/storage';
import { productInputSchema, productUpdateMetaSchema, toFieldErrors, type FieldErrors } from './schemas';
import { FEATURED_DAYS } from './featured';
import { ProductFieldError, saveProduct, type SaveTarget } from './services/save-product';
import { deleteProduct, ProductDeleteRefusedError } from './services/delete-product';
import { applyStockDelta, StockChangedError } from './services/stock';
import { withAdmin } from '@/lib/db-context';

// -----------------------------------------------------------------------------
//  Photos : envoi direct navigateur → Supabase Storage, par URL signée
// -----------------------------------------------------------------------------

export type ImageUploadTicket = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };

/**
 * Délivre une URL d'envoi à usage unique, pour un chemin choisi par le SERVEUR.
 * Supabase revérifie de son côté que l'utilisateur est un admin actif (RLS du bucket).
 */
export async function createColorwayImageUploadAction(ext: unknown = 'webp'): Promise<ImageUploadTicket> {
  await requireAdmin();
  const path = newColorwayImagePath(randomUUID(), isImageExtension(ext) ? ext : 'webp');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('URL d’envoi refusée', error);
    return { ok: false, error: 'L’envoi de photos est momentanément indisponible.' };
  }
  return { ok: true, path: data.path, signedUrl: data.signedUrl };
}

/**
 * Supprime une photo envoyée puis retirée du formulaire avant l'enregistrement.
 * Refuse toute photo déjà rattachée à un coloris (supprimée seulement après enregistrement).
 */
export async function discardColorwayImageAction(path: string): Promise<void> {
  await requireAdmin();
  if (!COLORWAY_IMAGE_PATH.test(path)) return;
  const used = await prisma.colorwayImage.findFirst({ where: { url: path }, select: { id: true } });
  if (used) return;
  const supabase = await createSupabaseServerClient();
  await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
}

// -----------------------------------------------------------------------------
//  Liste : mise en ligne / brouillon
// -----------------------------------------------------------------------------

export type StatusChangeResult = { ok: true; message: string } | { ok: false; error: string };

/** Met un produit en ligne (s'il est prêt) ou le repasse en brouillon. */
export async function setProductOnlineAction(productId: string, online: boolean): Promise<StatusChangeResult> {
  await requireAdmin();
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        colorways: {
          where: { isActive: true },
          select: { id: true, publishedAt: true, _count: { select: { images: true, variants: { where: { isActive: true } } } } },
        },
      },
    });
    if (!product) return { ok: false, error: 'Ce produit n’existe plus.' };

    if (online) {
      const ready = product.colorways.filter((c) => c._count.images > 0 && c._count.variants > 0);
      if (ready.length === 0) {
        return { ok: false, error: 'Pour publier, il faut au moins un coloris en vente avec une photo et une pointure. Complète le produit.' };
      }
      await prisma.$transaction([
        prisma.product.update({ where: { id: productId }, data: { isActive: true } }),
        prisma.colorway.updateMany({
          where: { id: { in: product.colorways.filter((c) => !c.publishedAt).map((c) => c.id) } },
          data: { publishedAt: new Date() },
        }),
      ]);
    } else {
      await prisma.product.update({ where: { id: productId }, data: { isActive: false } });
    }

    revalidatePath('/', 'layout');
    return { ok: true, message: online ? 'Produit mis en ligne.' : 'Produit repassé en brouillon.' };
  } catch (error) {
    console.error('Changement de statut impossible', error);
    return { ok: false, error: 'Le changement n’a pas pu être enregistré. Réessaie.' };
  }
}

/**
 * « Coup de cœur de la semaine » : met ce coloris en tête de la boutique pour 7 jours
 * (il remplace le précédent), ou retire le coup de cœur (colorwayId null).
 */
export async function setFeaturedColorwayAction(colorwayId: string | null): Promise<StatusChangeResult> {
  await requireAdmin();
  if (colorwayId !== null && !z.uuid().safeParse(colorwayId).success) return { ok: false, error: 'Coloris introuvable.' };
  try {
    if (colorwayId) {
      const colorway = await prisma.colorway.findUnique({
        where: { id: colorwayId },
        select: { isActive: true, publishedAt: true, product: { select: { isActive: true } } },
      });
      if (!colorway) return { ok: false, error: 'Ce coloris n’existe plus.' };
      if (!colorway.isActive || !colorway.publishedAt || !colorway.product.isActive) {
        return { ok: false, error: 'Mets d’abord le produit en ligne : un brouillon ne peut pas être en coup de cœur.' };
      }
    }
    const until = new Date(Date.now() + FEATURED_DAYS * 86_400_000);
    // Un seul coup de cœur (index unique partiel) : on retire l'ancien, puis on pose le nouveau.
    await prisma.$transaction([
      prisma.colorway.updateMany({ where: { featuredUntil: { not: null } }, data: { featuredUntil: null } }),
      ...(colorwayId ? [prisma.colorway.update({ where: { id: colorwayId }, data: { featuredUntil: until } })] : []),
    ]);
    revalidatePath('/boutique');
    revalidatePath('/admin/produits', 'layout');
    return { ok: true, message: colorwayId ? `Coup de cœur jusqu’au ${formatShortDate(until)}.` : 'Coup de cœur retiré.' };
  } catch (error) {
    console.error('Coup de cœur impossible', error);
    return { ok: false, error: 'Le changement n’a pas pu être enregistré. Réessaie.' };
  }
}

function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' }).format(date);
}

/**
 * Supprime définitivement un produit et tout ce qui lui est rattaché (voir deleteProduct),
 * puis ses photos du stockage. Redirige vers la liste des produits.
 */
export async function deleteProductAction(productId: string): Promise<{ ok: false; error: string } | never> {
  await requireAdmin();
  if (!z.uuid().safeParse(productId).success) return { ok: false, error: 'Produit introuvable.' };
  try {
    const deleted = await deleteProduct(productId);
    await removeOrphanImages(deleted.imagePaths);
  } catch (error) {
    if (error instanceof ProductDeleteRefusedError) return { ok: false, error: error.message };
    console.error('Suppression du produit impossible', error);
    return { ok: false, error: 'Le produit n’a pas pu être supprimé. Réessaie dans un instant.' };
  }
  revalidatePath('/', 'layout');
  redirect('/admin/produits?ok=supprime');
}

const stockAdjustSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('restock'), quantity: z.number().int().min(1).max(999), note: z.string().trim().max(200) }),
  z.object({ mode: z.literal('correction'), delta: z.number().int().min(-999).max(999).refine((d) => d !== 0), note: z.string().trim().min(1).max(200) }),
]);

export type StockAdjustInput = z.input<typeof stockAdjustSchema>;

/**
 * Ajustement de stock d'une pointure depuis la liste des produits :
 * réassort (paires reçues, note facultative) ou correction (+/−, motif obligatoire).
 * Toujours en relatif et tracé (qui, quand, pourquoi). Renvoie le nouveau stock.
 */
export async function adjustVariantStockAction(
  variantId: string,
  input: StockAdjustInput,
): Promise<{ ok: true; stock: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  const parsed = stockAdjustSchema.safeParse(input);
  if (!z.uuid().safeParse(variantId).success || !parsed.success) return { ok: false, error: 'Ajustement invalide.' };
  const data = parsed.data;
  const delta = data.mode === 'restock' ? data.quantity : data.delta;
  const note = data.mode === 'restock' ? data.note || 'Réassort' : data.note;
  try {
    const stock = await withAdmin(admin.id, (tx) => applyStockDelta(tx, admin.id, variantId, delta, note));
    revalidatePath('/admin/produits', 'layout');
    revalidatePath('/boutique');
    return { ok: true, stock };
  } catch (error) {
    if (error instanceof StockChangedError) return { ok: false, error: 'Le stock ne peut pas descendre sous zéro. Recharge la page : des paires ont peut-être été vendues.' };
    console.error('Ajustement de stock impossible', error);
    return { ok: false, error: 'L’ajustement n’a pas pu être enregistré. Réessaie.' };
  }
}

// -----------------------------------------------------------------------------
//  Enregistrement (création et modification)
// -----------------------------------------------------------------------------

/**
 * Un enregistrement réussi redirige vers la page du produit : le formulaire est
 * rechargé depuis la base (identifiants des nouveaux coloris et pointures, stock,
 * version). L'état ne porte donc que les erreurs.
 */
export type ProductFormState = { status: 'idle' } | { status: 'error'; fieldErrors: FieldErrors; formError?: string };

type ErrorState = Extract<ProductFormState, { status: 'error' }>;

/** Lit et valide le formulaire ; vérifie que chaque photo existe vraiment dans le bucket. */
async function readProductForm(formData: FormData) {
  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get('payload') ?? ''));
  } catch {
    return { error: { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, recharge la page.' } as ErrorState };
  }

  const parsed = productInputSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: { status: 'error', fieldErrors: toFieldErrors(parsed.error), formError: 'Certains champs sont à corriger.' } as ErrorState };
  }
  const input = parsed.data;

  const images = input.colorways.flatMap((colorway, index) => colorway.images.map((image) => ({ index, path: image.path })));
  if (images.length > 0) {
    const supabase = await createSupabaseServerClient();
    const checks = await Promise.all(images.map((image) => supabase.storage.from(PRODUCT_BUCKET).exists(image.path)));
    const missing = images.filter((_, i) => !checks[i].data);
    if (missing.length > 0) {
      const fieldErrors: FieldErrors = {};
      for (const image of missing) fieldErrors[`colorways.${image.index}.images`] = 'Une photo n’a pas fini de s’envoyer. Réessaie ou retire-la.';
      return { error: { status: 'error', fieldErrors, formError: 'Certaines photos sont introuvables.' } as ErrorState };
    }
  }
  return { input };
}

/** Traduit une erreur d'enregistrement en message pour le formulaire. */
function productErrorState(error: unknown): ErrorState {
  if (error instanceof ProductFieldError) {
    const { form, ...fieldErrors } = error.fieldErrors;
    return { status: 'error', fieldErrors, formError: form ?? error.message };
  }
  if (isUniqueViolation(error, 'sku')) {
    return { status: 'error', fieldErrors: {}, formError: 'Un SKU est déjà utilisé par une autre paire. Modifie-le ou laisse-le vide.' };
  }
  if (isUniqueViolation(error, 'slug')) {
    return { status: 'error', fieldErrors: { slug: 'Cette adresse vient d’être prise, choisis-en une autre.' } };
  }
  const domainError = toDomainError(error);
  if (domainError instanceof DomainError) return { status: 'error', fieldErrors: {}, formError: domainError.message };
  console.error('Enregistrement du produit impossible', error);
  return { status: 'error', fieldErrors: {}, formError: 'Le produit n’a pas pu être enregistré. Réessaie dans un instant.' };
}

/** Photos retirées : supprimées du stockage seulement après l'enregistrement, si plus aucun coloris ne les utilise. */
async function removeOrphanImages(paths: string[]) {
  if (paths.length === 0) return;
  const stillUsed = await prisma.colorwayImage.findMany({ where: { url: { in: paths } }, select: { url: true } });
  const used = new Set(stillUsed.map((image) => image.url));
  const orphans = paths.filter((path) => !used.has(path));
  if (orphans.length === 0) return;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove(orphans);
  if (error) console.error('Photos retirées non supprimées du stockage', error);
}

async function save(formData: FormData, target: SaveTarget) {
  const admin = await requireAdmin();
  const form = await readProductForm(formData);
  if (form.error) return { error: form.error };
  try {
    const saved = await saveProduct(admin.id, form.input, target);
    await removeOrphanImages(saved.removedImagePaths);
    // Le catalogue touche tout le site : accueil, collections, fiches, admin.
    revalidatePath('/', 'layout');
    return { saved };
  } catch (error) {
    return { error: productErrorState(error) };
  }
}

export async function createProductAction(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const result = await save(formData, null);
  if (result.error) return result.error;
  // Retour à la liste des produits, avec un bandeau de confirmation.
  redirect('/admin/produits?ok=cree');
}

export async function updateProductAction(_previous: ProductFormState, formData: FormData): Promise<ProductFormState> {
  let meta: unknown;
  try {
    meta = JSON.parse(String(formData.get('meta') ?? ''));
  } catch {
    meta = null;
  }
  const parsedMeta = productUpdateMetaSchema.safeParse(meta);
  if (!parsedMeta.success) return { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, recharge la page.' };

  const result = await save(formData, parsedMeta.data);
  if (result.error) return result.error;
  redirect(`/admin/produits/${result.saved.id}?ok=modifie`);
}
