'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/features/auth/require-admin';
import { isUniqueViolation } from '@/lib/db-errors';
import { prisma } from '@/lib/prisma';
import { catalogNameSchema, fieldErrors, storeInfoSchema, waveSchema, zoneSchema, type FormResult } from './schemas';

export type ActionResult = { ok: true; message: string } | { ok: false; error: string };

/** Les paramètres apparaissent aussi en boutique (footer, WhatsApp, zones au panier). */
function refresh() {
  revalidatePath('/', 'layout');
}

function failure(error: unknown, fallback: string): ActionResult {
  console.error(fallback, error);
  return { ok: false, error: fallback };
}

// -----------------------------------------------------------------------------
//  Boutique et Wave (formulaires : useActionState)
// -----------------------------------------------------------------------------

export async function saveStoreInfoAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const parsed = storeInfoSchema.safeParse(Object.fromEntries(['storeName', 'whatsappNumber', 'contactPhone', 'contactEmail', 'instagramUrl', 'tiktokUrl'].map((k) => [k, String(formData.get(k) ?? '')])));
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), formError: 'Certains champs sont à corriger.' };
  try {
    await prisma.storeSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
  } catch (error) {
    console.error('Paramètres boutique non enregistrés', error);
    return { status: 'error', fieldErrors: {}, formError: 'Les informations n’ont pas pu être enregistrées. Réessaie.' };
  }
  refresh();
  return { status: 'saved', message: 'Informations enregistrées.', at: Date.now() };
}

export async function saveWaveAction(_previous: FormResult, formData: FormData): Promise<FormResult> {
  await requireAdmin();
  const parsed = waveSchema.safeParse({ waveMerchantCode: String(formData.get('waveMerchantCode') ?? ''), wavePaymentLink: String(formData.get('wavePaymentLink') ?? '') });
  if (!parsed.success) return { status: 'error', fieldErrors: fieldErrors(parsed.error), formError: 'Certains champs sont à corriger.' };
  try {
    await prisma.storeSettings.upsert({ where: { id: 1 }, update: parsed.data, create: { id: 1, ...parsed.data } });
  } catch (error) {
    console.error('Paramètres Wave non enregistrés', error);
    return { status: 'error', fieldErrors: {}, formError: 'Le paiement Wave n’a pas pu être enregistré. Réessaie.' };
  }
  refresh();
  return { status: 'saved', message: 'Paiement Wave enregistré.', at: Date.now() };
}

// -----------------------------------------------------------------------------
//  Zones de livraison
// -----------------------------------------------------------------------------

export async function saveZoneAction(zoneId: string | null, input: { name: string; fee: string; estimatedDelay: string }): Promise<ActionResult> {
  await requireAdmin();
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Zone invalide.' };
  try {
    if (zoneId) {
      await prisma.deliveryZone.update({ where: { id: zoneId }, data: parsed.data });
    } else {
      const last = await prisma.deliveryZone.aggregate({ _max: { position: true } });
      await prisma.deliveryZone.create({ data: { ...parsed.data, position: (last._max.position ?? -1) + 1 } });
    }
  } catch (error) {
    if (isUniqueViolation(error, 'name')) return { ok: false, error: 'Une zone porte déjà ce nom.' };
    return failure(error, 'La zone n’a pas pu être enregistrée. Réessaie.');
  }
  refresh();
  return { ok: true, message: zoneId ? 'Zone modifiée.' : 'Zone ajoutée.' };
}

export async function setZoneActiveAction(zoneId: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    await prisma.deliveryZone.update({ where: { id: zoneId }, data: { isActive } });
  } catch (error) {
    return failure(error, 'Le changement n’a pas pu être enregistré.');
  }
  refresh();
  return { ok: true, message: isActive ? 'Zone proposée au client.' : 'Zone masquée au client.' };
}

/** Supprime une zone jamais utilisée ; sinon il faut la désactiver (les commandes la référencent). */
export async function deleteZoneAction(zoneId: string): Promise<ActionResult> {
  await requireAdmin();
  const used = await prisma.order.count({ where: { deliveryZoneId: zoneId } });
  if (used > 0) return { ok: false, error: 'Cette zone a déjà servi dans des commandes : désactive-la plutôt.' };
  try {
    await prisma.deliveryZone.delete({ where: { id: zoneId } });
  } catch (error) {
    return failure(error, 'La zone n’a pas pu être supprimée.');
  }
  refresh();
  return { ok: true, message: 'Zone supprimée.' };
}

/** Ordre d'affichage : échange avec la voisine (au-dessus / en dessous). */
export async function moveZoneAction(zoneId: string, direction: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  try {
    const zones = await prisma.deliveryZone.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true } });
    await reorder('zone', zones.map((z) => z.id), zoneId, direction);
  } catch (error) {
    return failure(error, 'L’ordre n’a pas pu être modifié.');
  }
  refresh();
  return { ok: true, message: 'Ordre modifié.' };
}

// -----------------------------------------------------------------------------
//  Catalogue : marques et catégories (créées depuis le formulaire produit)
// -----------------------------------------------------------------------------

type CatalogKind = 'brand' | 'category';

/** Renomme sans changer l'adresse (slug) : les liens partagés restent valides. */
export async function renameCatalogItemAction(kind: CatalogKind, id: string, name: string): Promise<ActionResult> {
  await requireAdmin();
  const parsed = catalogNameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Nom invalide.' };
  try {
    if (kind === 'brand') await prisma.brand.update({ where: { id }, data: { name: parsed.data } });
    else await prisma.category.update({ where: { id }, data: { name: parsed.data } });
  } catch (error) {
    return failure(error, 'Le nom n’a pas pu être modifié.');
  }
  refresh();
  return { ok: true, message: 'Nom modifié.' };
}

/** Masquée : n'apparaît plus dans les menus et filtres de la boutique (les produits restent). */
export async function setCatalogItemActiveAction(kind: CatalogKind, id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  try {
    if (kind === 'brand') await prisma.brand.update({ where: { id }, data: { isActive } });
    else await prisma.category.update({ where: { id }, data: { isActive } });
  } catch (error) {
    return failure(error, 'Le changement n’a pas pu être enregistré.');
  }
  refresh();
  return { ok: true, message: isActive ? 'Visible en boutique.' : 'Masquée en boutique.' };
}

export async function moveCatalogItemAction(kind: CatalogKind, id: string, direction: -1 | 1): Promise<ActionResult> {
  await requireAdmin();
  try {
    const rows =
      kind === 'brand'
        ? await prisma.brand.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true } })
        : await prisma.category.findMany({ orderBy: [{ position: 'asc' }, { name: 'asc' }], select: { id: true } });
    await reorder(kind, rows.map((r) => r.id), id, direction);
  } catch (error) {
    return failure(error, 'L’ordre n’a pas pu être modifié.');
  }
  refresh();
  return { ok: true, message: 'Ordre modifié.' };
}

/** Renumérote toute la liste (0, 1, 2…) après avoir déplacé un élément d'un cran. */
async function reorder(kind: 'zone' | CatalogKind, ids: string[], id: string, direction: -1 | 1) {
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  await prisma.$transaction(
    next.map((rowId, position) =>
      kind === 'zone'
        ? prisma.deliveryZone.update({ where: { id: rowId }, data: { position } })
        : kind === 'brand'
          ? prisma.brand.update({ where: { id: rowId }, data: { position } })
          : prisma.category.update({ where: { id: rowId }, data: { position } }),
    ),
  );
}
