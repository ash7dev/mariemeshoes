import { z } from 'zod';
import { GALLERY_IMAGE_PATH } from '@/lib/supabase/storage';

/*
 * Galerie : une photo d'ambiance = une paire (coloris) de la boutique. Le client
 * s'inspire, puis va directement à la paire.
 */

export const GALLERY_CAPTION_MAX = 160;

export const galleryInputSchema = z
  .object({
    imagePath: z.string().regex(GALLERY_IMAGE_PATH, 'Ajoute une photo.'),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    colorwayId: z.uuid('Choisis la paire portée sur la photo.'),
    caption: z
      .string()
      .trim()
      .max(GALLERY_CAPTION_MAX, `${GALLERY_CAPTION_MAX} caractères au maximum.`)
      .optional()
      .transform((v) => (v ? v : undefined)),
    isPublished: z.boolean(),
  });

export type GalleryInput = z.input<typeof galleryInputSchema>;
export type ValidGalleryInput = z.output<typeof galleryInputSchema>;
