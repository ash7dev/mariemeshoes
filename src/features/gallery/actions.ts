'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/features/auth/require-admin';
import { toFieldErrors, type FieldErrors } from '@/features/catalog/schemas';
import { prisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { GALLERY_IMAGE_PATH, PRODUCT_BUCKET, isImageExtension, newGalleryImagePath } from '@/lib/supabase/storage';
import { galleryInputSchema, type GalleryInput } from './schemas';

export type GalleryUploadTicket = { ok: true; path: string; signedUrl: string } | { ok: false; error: string };
export type GallerySaveResult = { ok: true; id: string } | { ok: false; error: string; fieldErrors?: FieldErrors };
type ActionResult = { ok: true } | { ok: false; error: string };

/** La galerie touche la page Galerie, l'accueil et les fiches produits. */
function revalidateShop() {
  revalidatePath('/', 'layout');
}

async function removeFile(path: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(PRODUCT_BUCKET).remove([path]);
  if (error) console.error('Photo de galerie non supprimée du stockage', path, error);
}

/** URL d'envoi à usage unique, pour un chemin choisi par le serveur (comme les photos produits). */
export async function createGalleryUploadAction(ext: unknown = 'webp'): Promise<GalleryUploadTicket> {
  await requireAdmin();
  const path = newGalleryImagePath(randomUUID(), isImageExtension(ext) ? ext : 'webp');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(PRODUCT_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('URL d’envoi refusée (galerie)', error);
    return { ok: false, error: 'L’envoi de photos est momentanément indisponible.' };
  }
  return { ok: true, path: data.path, signedUrl: data.signedUrl };
}

/** Photo envoyée puis remplacée avant l'enregistrement : supprimée, sauf si une publication l'utilise. */
export async function discardGalleryImageAction(path: string): Promise<void> {
  await requireAdmin();
  if (!GALLERY_IMAGE_PATH.test(path)) return;
  const used = await prisma.galleryPost.findFirst({ where: { imagePath: path }, select: { id: true } });
  if (!used) await removeFile(path);
}

/** Crée (id absent) ou modifie une photo de la galerie. */
export async function saveGalleryPostAction(input: GalleryInput, id?: string): Promise<GallerySaveResult> {
  await requireAdmin();
  const parsed = galleryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Certains champs sont à corriger.', fieldErrors: toFieldErrors(parsed.error) };
  if (id !== undefined && !z.uuid().safeParse(id).success) return { ok: false, error: 'Cette photo n’existe plus.' };
  const data = parsed.data;

  const pair = await prisma.colorway.findUnique({ where: { id: data.colorwayId }, select: { id: true } });
  if (!pair) return { ok: false, error: 'Cette paire n’existe plus.', fieldErrors: { colorwayId: 'Choisis une autre paire.' } };

  const fields = {
    colorwayId: data.colorwayId,
    imagePath: data.imagePath,
    width: data.width ?? null,
    height: data.height ?? null,
    caption: data.caption ?? null,
    isPublished: data.isPublished,
  };

  try {
    if (id === undefined) {
      const created = await prisma.galleryPost.create({
        data: { ...fields, publishedAt: data.isPublished ? new Date() : null },
        select: { id: true },
      });
      revalidateShop();
      return { ok: true, id: created.id };
    }

    const current = await prisma.galleryPost.findUnique({ where: { id }, select: { imagePath: true, isPublished: true, publishedAt: true } });
    if (!current) return { ok: false, error: 'Cette photo n’existe plus.' };
    await prisma.galleryPost.update({
      where: { id },
      // Date de publication : posée à la première mise en ligne, gardée ensuite (ordre de la galerie).
      data: { ...fields, publishedAt: data.isPublished ? (current.publishedAt ?? new Date()) : current.publishedAt },
    });
    if (current.imagePath !== data.imagePath) await removeFile(current.imagePath);
    revalidateShop();
    return { ok: true, id };
  } catch (error) {
    console.error('Enregistrement de la photo de galerie impossible', error);
    return { ok: false, error: 'La photo n’a pas pu être enregistrée. Réessaie.' };
  }
}

/** Publie ou retire une photo depuis la liste. */
export async function setGalleryPublishedAction(id: string, published: boolean): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Cette photo n’existe plus.' };
  const post = await prisma.galleryPost.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!post) return { ok: false, error: 'Cette photo n’existe plus.' };
  await prisma.galleryPost.update({ where: { id }, data: { isPublished: published, publishedAt: published ? (post.publishedAt ?? new Date()) : post.publishedAt } });
  revalidateShop();
  return { ok: true };
}

/** Supprime une photo de la galerie (et son fichier). La paire n'est pas touchée. */
export async function deleteGalleryPostAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Cette photo n’existe plus.' };
  const post = await prisma.galleryPost.findUnique({ where: { id }, select: { imagePath: true } });
  if (!post) return { ok: true };
  await prisma.galleryPost.delete({ where: { id } });
  await removeFile(post.imagePath);
  revalidateShop();
  return { ok: true };
}
