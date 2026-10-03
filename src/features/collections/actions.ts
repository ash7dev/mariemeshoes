'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/features/auth/require-admin';
import { isUniqueViolation } from '@/lib/db-errors';
import { prisma } from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import { collectionInputSchema, collectionUpdateMetaSchema, dayAfter, dayStart, type ValidCollectionInput } from './schemas';
import { refreshBestsellers } from './services/bestsellers';

/** Un enregistrement réussi redirige : l'état du formulaire ne porte que les erreurs. */
export type CollectionFormState = { status: 'idle' } | { status: 'error'; fieldErrors: FieldErrors; formError?: string };

type ActionResult = { ok: true } | { ok: false; error: string };

function readJson(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(String(formData.get(key) ?? ''));
  } catch {
    return null;
  }
}

/** Les collections touchent la boutique (filtre, tuile), l'accueil et les promotions. */
function revalidateShop() {
  revalidatePath('/', 'layout');
}

async function uniqueSlug(base: string, exceptId?: string): Promise<string> {
  const root = base || 'collection';
  for (let i = 1; i <= 30; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const taken = await prisma.collection.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!taken || taken.id === exceptId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function toData(input: ValidCollectionInput) {
  return {
    name: input.name,
    description: input.description ?? null,
    type: input.type,
    isActive: input.isActive,
    showOnHome: input.showOnHome,
    startsAt: input.startsOn ? dayStart(input.startsOn) : null,
    endsAt: input.endsOn ? dayAfter(input.endsOn) : null,
  };
}

async function save(formData: FormData, target: { collectionId: string; expectedUpdatedAt: string } | null): Promise<CollectionFormState | string> {
  await requireAdmin();
  const parsed = collectionInputSchema.safeParse(readJson(formData, 'payload'));
  if (!parsed.success) return { status: 'error', fieldErrors: toFieldErrors(parsed.error), formError: 'Certains champs sont à corriger.' };
  const input = parsed.data;

  try {
    const id = await prisma.$transaction(async (tx) => {
      const current = target
        ? await tx.collection.findUnique({ where: { id: target.collectionId }, select: { id: true, slug: true, showOnHome: true, updatedAt: true } })
        : null;
      if (target && !current) throw new Error('NOT_FOUND');
      if (target && current && current.updatedAt.getTime() !== new Date(target.expectedUpdatedAt).getTime()) throw new Error('CONCURRENT_UPDATE');

      // Adresse : gardée tant qu'elle n'est pas changée volontairement (liens partagés).
      let slug = input.slug ?? current?.slug;
      if (input.slug && input.slug !== current?.slug) {
        const taken = await tx.collection.findUnique({ where: { slug: input.slug }, select: { id: true } });
        if (taken) throw new Error('SLUG_TAKEN');
      }
      slug ??= await uniqueSlug(slugify(input.name));

      // Nouvelle à l'accueil : elle se place en dernier.
      const homePosition =
        input.showOnHome && !current?.showOnHome
          ? ((await tx.collection.aggregate({ where: { showOnHome: true }, _max: { homePosition: true } }))._max.homePosition ?? -1) + 1
          : undefined;

      const data = { ...toData(input), slug, ...(homePosition !== undefined ? { homePosition } : {}) };
      const collectionId = current
        ? (await tx.collection.update({ where: { id: current.id }, data, select: { id: true } })).id
        : (await tx.collection.create({ data, select: { id: true } })).id;

      // Sélection : la liste du formulaire fait foi (ordre = position).
      // Meilleures ventes : les paires sont calculées, le formulaire n'y touche pas.
      if (input.type === 'MANUAL') {
        await tx.collectionItem.deleteMany({ where: { collectionId } });
        if (input.colorwayIds.length > 0) {
          await tx.collectionItem.createMany({
            data: input.colorwayIds.map((colorwayId, position) => ({ collectionId, colorwayId, position, note: input.notes[colorwayId] ?? null })),
          });
        }
      }
      return collectionId;
    });

    if (input.type === 'AUTO_BESTSELLERS') await refreshBestsellers({ force: true, collectionId: id });
    revalidateShop();
    return id;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'SLUG_TAKEN' || isUniqueViolation(error, 'slug')) {
      return { status: 'error', fieldErrors: { slug: 'Cette adresse est déjà utilisée par une autre collection.' }, formError: 'Cette adresse est déjà prise.' };
    }
    if (message === 'CONCURRENT_UPDATE') {
      return { status: 'error', fieldErrors: {}, formError: 'Cette collection a été modifiée entre-temps (autre appareil). Recharge la page pour repartir de la dernière version.' };
    }
    if (message === 'NOT_FOUND') return { status: 'error', fieldErrors: {}, formError: 'Cette collection n’existe plus.' };
    console.error('Enregistrement de la collection impossible', error);
    return { status: 'error', fieldErrors: {}, formError: 'La collection n’a pas pu être enregistrée (une paire a peut-être été supprimée). Réessaie.' };
  }
}

export async function createCollectionAction(_previous: CollectionFormState, formData: FormData): Promise<CollectionFormState> {
  const result = await save(formData, null);
  if (typeof result !== 'string') return result;
  redirect('/admin/collections?ok=creee');
}

export async function updateCollectionAction(_previous: CollectionFormState, formData: FormData): Promise<CollectionFormState> {
  const meta = collectionUpdateMetaSchema.safeParse(readJson(formData, 'meta'));
  if (!meta.success) return { status: 'error', fieldErrors: {}, formError: 'Formulaire illisible, recharge la page.' };
  const result = await save(formData, meta.data);
  if (typeof result !== 'string') return result;
  redirect(`/admin/collections/${result}?ok=modifiee`);
}

/** Active / désactive depuis la liste. */
export async function setCollectionActiveAction(collectionId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(collectionId).success) return { ok: false, error: 'Collection introuvable.' };
  try {
    await prisma.collection.update({ where: { id: collectionId }, data: { isActive } });
    revalidateShop();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Le changement n’a pas pu être enregistré. Réessaie.' };
  }
}

/** Monte ou descend une collection dans l'ordre de la page d'accueil (échange avec sa voisine). */
export async function moveCollectionOnHomeAction(collectionId: string, direction: 'up' | 'down'): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(collectionId).success) return { ok: false, error: 'Collection introuvable.' };
  try {
    await prisma.$transaction(async (tx) => {
      const home = await tx.collection.findMany({
        where: { showOnHome: true },
        orderBy: [{ homePosition: 'asc' }, { createdAt: 'desc' }],
        select: { id: true },
      });
      const index = home.findIndex((c) => c.id === collectionId);
      const swap = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || swap < 0 || swap >= home.length) return;
      [home[index], home[swap]] = [home[swap], home[index]];
      // Positions recalculées 0, 1, 2… : l'ordre reste propre même après des suppressions.
      for (const [position, c] of home.entries()) await tx.collection.update({ where: { id: c.id }, data: { homePosition: position } });
    });
    revalidateShop();
    return { ok: true };
  } catch {
    return { ok: false, error: 'L’ordre n’a pas pu être changé. Réessaie.' };
  }
}

/**
 * Supprime une collection. Ses paires ne sont pas touchées (elles sortent seulement de la
 * sélection). Une promotion qui la visait perd cette cible : on prévient avant.
 */
export async function deleteCollectionAction(collectionId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(collectionId).success) return { ok: false, error: 'Collection introuvable.' };
  try {
    await prisma.collection.delete({ where: { id: collectionId } });
  } catch {
    return { ok: false, error: 'La collection n’a pas pu être supprimée. Réessaie.' };
  }
  revalidateShop();
  redirect('/admin/collections?ok=supprimee');
}

/** « Recalculer maintenant » des meilleures ventes. */
export async function refreshBestsellersAction(collectionId: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(collectionId).success) return { ok: false, error: 'Collection introuvable.' };
  try {
    await refreshBestsellers({ force: true, collectionId });
    revalidateShop();
    return { ok: true };
  } catch (error) {
    console.error('Recalcul des meilleures ventes impossible', error);
    return { ok: false, error: 'Le recalcul n’a pas abouti. Réessaie.' };
  }
}
