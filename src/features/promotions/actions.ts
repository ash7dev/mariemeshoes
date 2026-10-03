'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/features/auth/require-admin';
import { isUniqueViolation } from '@/lib/db-errors';
import { prisma } from '@/lib/prisma';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import { promotionInputSchema, promotionUpdateMetaSchema, type ValidPromotionInput } from './schemas';

/** Un enregistrement réussi redirige vers la page de la promotion : l'état ne porte que les erreurs. */
export type PromotionFormState = { status: 'idle' } | { status: 'error'; fieldErrors: FieldErrors; formError?: string };

function readPayload(formData: FormData) {
  try {
    return JSON.parse(String(formData.get('payload') ?? ''));
  } catch {
    return null;
  }
}

/** Champs non pertinents ramenés à null (le formulaire peut garder des valeurs masquées). */
function toData(input: ValidPromotionInput) {
  const isCode = input.kind === 'CODE';
  return {
    kind: input.kind,
    name: input.name,
    description: input.description ?? null,
    code: isCode ? input.code! : null,
    discountType: input.discountType,
    value: input.discountType === 'FREE_DELIVERY' ? null : (input.value ?? null),
    maxDiscount: input.discountType === 'PERCENTAGE' ? (input.maxDiscount ?? null) : null,
    scope: input.scope,
    minSubtotal: input.minSubtotal ?? null,
    minPairs: isCode ? (input.minPairs ?? null) : null,
    firstOrderOnly: isCode && input.firstOrderOnly,
    usageLimit: isCode ? (input.usageLimit ?? null) : null,
    usageLimitPerCustomer: isCode ? (input.usageLimitPerCustomer ?? null) : null,
    stackable: isCode && input.stackable,
    isActive: input.isActive,
    startsAt: input.startsAt,
    endsAt: input.endsAt ?? null,
  };
}

function targetRows(promotionId: string, input: ValidPromotionInput) {
  if (input.scope === 'ALL') return [];
  const t = input.targets;
  return [
    ...[...new Set(t.brandIds)].map((brandId) => ({ promotionId, brandId })),
    ...[...new Set(t.categoryIds)].map((categoryId) => ({ promotionId, categoryId })),
    ...[...new Set(t.collectionIds)].map((collectionId) => ({ promotionId, collectionId })),
    ...[...new Set(t.colorwayIds)].map((colorwayId) => ({ promotionId, colorwayId })),
  ];
}

function errorState(error: unknown): PromotionFormState {
  if (isUniqueViolation(error, 'code')) {
    return { status: 'error', fieldErrors: { code: 'Ce code existe déjà : choisis-en un autre.' }, formError: 'Ce code existe déjà.' };
  }
  if (error instanceof Error && error.message === 'CONCURRENT_UPDATE') {
    return {
      status: 'error',
      fieldErrors: {},
      formError: 'Cette promotion a été modifiée entre-temps (autre appareil). Recharge la page pour repartir de la dernière version.',
    };
  }
  if (error instanceof Error && error.message === 'NOT_FOUND') {
    return { status: 'error', fieldErrors: {}, formError: 'Cette promotion n’existe plus.' };
  }
  console.error('Enregistrement de la promotion impossible', error);
  return { status: 'error', fieldErrors: {}, formError: 'La promotion n’a pas pu être enregistrée (une cible a peut-être été supprimée). Réessaie.' };
}

async function save(formData: FormData, target: { promotionId: string; expectedUpdatedAt: string } | null): Promise<PromotionFormState | string> {
  await requireAdmin();
  const parsed = promotionInputSchema.safeParse(readPayload(formData));
  if (!parsed.success) {
    return { status: 'error', fieldErrors: toFieldErrors(parsed.error), formError: 'Certains champs sont à corriger.' };
  }
  const input = parsed.data;

  try {
    const id = await prisma.$transaction(async (tx) => {
      let promotionId: string;
      if (target) {
        const current = await tx.promotion.findUnique({ where: { id: target.promotionId }, select: { updatedAt: true } });
        if (!current) throw new Error('NOT_FOUND');
        if (current.updatedAt.getTime() !== new Date(target.expectedUpdatedAt).getTime()) throw new Error('CONCURRENT_UPDATE');
        promotionId = (await tx.promotion.update({ where: { id: target.promotionId }, data: toData(input), select: { id: true } })).id;
        await tx.promotionTarget.deleteMany({ where: { promotionId } });
      } else {
        promotionId = (await tx.promotion.create({ data: toData(input), select: { id: true } })).id;
      }
      const rows = targetRows(promotionId, input);
      if (rows.length > 0) await tx.promotionTarget.createMany({ data: rows });
      return promotionId;
    });
    // Prix barrés de la boutique, panier, admin.
    revalidatePath('/', 'layout');
    return id;
  } catch (error) {
    return errorState(error);
  }
}

export async function createPromotionAction(_previous: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  const result = await save(formData, null);
  if (typeof result !== 'string') return result;
  redirect(`/admin/promotions/${result}?ok=creee`);
}

export async function updatePromotionAction(_previous: PromotionFormState, formData: FormData): Promise<PromotionFormState> {
  let meta: unknown = null;
  try {
    meta = JSON.parse(String(formData.get('meta') ?? ''));
  } catch {
    // meta reste null
  }
  const parsedMeta = promotionUpdateMetaSchema.safeParse(meta);
  if (!parsedMeta.success) return { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, recharge la page.' };

  const result = await save(formData, parsedMeta.data);
  if (typeof result !== 'string') return result;
  redirect(`/admin/promotions/${result}?ok=modifiee`);
}

/** Active / désactive une promotion depuis la liste (sans toucher au reste). */
export async function setPromotionActiveAction(promotionId: string, isActive: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    await prisma.promotion.update({ where: { id: promotionId }, data: { isActive } });
  } catch (error) {
    console.error('Activation de la promotion impossible', error);
    return { ok: false, error: 'Le changement n’a pas pu être enregistré. Réessaie.' };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

/** Supprime une promotion jamais utilisée (sinon : la désactiver, l'historique des commandes la référence). */
export async function deletePromotionAction(promotionId: string): Promise<{ ok: false; error: string } | never> {
  await requireAdmin();
  const promotion = await prisma.promotion.findUnique({
    where: { id: promotionId },
    select: { _count: { select: { orders: true, orderItems: true } } },
  });
  if (!promotion) return { ok: false, error: 'Cette promotion n’existe plus.' };
  if (promotion._count.orders + promotion._count.orderItems > 0) {
    return { ok: false, error: 'Cette promotion a déjà servi dans des commandes : désactive-la plutôt que de la supprimer.' };
  }
  try {
    await prisma.promotion.delete({ where: { id: promotionId } });
  } catch (error) {
    console.error('Suppression de la promotion impossible', error);
    return { ok: false, error: 'La promotion n’a pas pu être supprimée. Réessaie.' };
  }
  revalidatePath('/', 'layout');
  redirect('/admin/promotions?ok=supprimee');
}
