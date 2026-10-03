import { z } from 'zod';
import { SLUG_PATTERN } from '@/lib/slug';

/*
 * Collections : une sélection de coloris mise en avant (« Spécial Tabaski »,
 * « Moins de 50 000 FCFA »…), ou les meilleures ventes calculées toutes seules.
 * Une collection ne change ni les prix ni le stock : pour une remise, on crée
 * une promotion qui vise la collection.
 */

export const COLLECTION_LIMITS = { name: 80, description: 400, maxItems: 60, note: 140 } as const;

/** Les premières paires d'une sélection sont mises en avant sur la page de la collection (« incontournables »). */
export const COLLECTION_HIGHLIGHTS = 3;

/** Meilleures ventes : paires vendues (commandes confirmées et suivantes) sur cette période. */
export const BESTSELLER_DAYS = 30;
export const BESTSELLER_LIMIT = 12;

export const COLLECTION_TYPES = ['MANUAL', 'AUTO_BESTSELLERS'] as const;
export type CollectionTypeValue = (typeof COLLECTION_TYPES)[number];

export const COLLECTION_TYPE_LABEL: Record<CollectionTypeValue, string> = {
  MANUAL: 'Sélection',
  AUTO_BESTSELLERS: 'Meilleures ventes',
};

/** Jour au format AAAA-MM-JJ (champ date), ou vide. */
const day = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Date invalide.');

export const collectionInputSchema = z
  .object({
    name: z.string().trim().min(2, 'Donne un nom à la collection.').max(COLLECTION_LIMITS.name, `${COLLECTION_LIMITS.name} caractères au maximum.`),
    slug: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine((v) => v === undefined || SLUG_PATTERN.test(v), 'Lettres minuscules, chiffres et tirets uniquement.'),
    description: z
      .string()
      .trim()
      .max(COLLECTION_LIMITS.description, `${COLLECTION_LIMITS.description} caractères au maximum.`)
      .optional()
      .transform((v) => (v ? v : undefined)),
    type: z.enum(COLLECTION_TYPES),
    isActive: z.boolean(),
    showOnHome: z.boolean(),
    /** Premier jour (inclus), heure de Dakar. */
    startsOn: day,
    /** Dernier jour (inclus), heure de Dakar. */
    endsOn: day,
    /** Coloris dans l'ordre d'affichage (sélection uniquement). */
    colorwayIds: z.array(z.uuid()).max(COLLECTION_LIMITS.maxItems, `${COLLECTION_LIMITS.maxItems} paires au maximum.`),
    /** « Mot de la collection » par coloris (paires mises en avant), facultatif. */
    notes: z
      .record(z.string(), z.string().trim().max(COLLECTION_LIMITS.note, `${COLLECTION_LIMITS.note} caractères au maximum.`))
      .default({})
      .transform((notes) => Object.fromEntries(Object.entries(notes).filter(([, text]) => text.length > 0))),
  })
  .superRefine((input, ctx) => {
    if (input.startsOn && input.endsOn && input.endsOn < input.startsOn) {
      ctx.addIssue({ code: 'custom', path: ['endsOn'], message: 'La fin doit être après le début.' });
    }
    if (new Set(input.colorwayIds).size !== input.colorwayIds.length) {
      ctx.addIssue({ code: 'custom', path: ['colorwayIds'], message: 'Une paire est en double.' });
    }
  });

export const collectionUpdateMetaSchema = z.object({
  collectionId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});

export type CollectionInput = z.input<typeof collectionInputSchema>;
export type ValidCollectionInput = z.output<typeof collectionInputSchema>;

/*
 * Dakar est à UTC+0 toute l'année (pas d'heure d'été) : un jour local commence à
 * minuit UTC. La fin est stockée au lendemain minuit (exclue), le dernier jour reste inclus.
 */
export function dayStart(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function dayAfter(day: string): Date {
  return new Date(dayStart(day).getTime() + 86_400_000);
}

/** Date stockée → jour à afficher dans le champ (fin : la veille de la date exclue). */
export function toDay(date: Date | null, isEnd = false): string {
  if (!date) return '';
  return new Date(date.getTime() - (isEnd ? 86_400_000 : 0)).toISOString().slice(0, 10);
}

export type CollectionStatus = { label: string; tone: 'live' | 'scheduled' | 'ended' | 'off' };

const shortDay = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'Africa/Dakar' });

export function collectionStatus(c: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }, now = new Date()): CollectionStatus {
  if (!c.isActive) return { label: 'Désactivée', tone: 'off' };
  if (c.startsAt && c.startsAt > now) return { label: `Programmée · dès le ${shortDay.format(c.startsAt)}`, tone: 'scheduled' };
  if (c.endsAt && c.endsAt <= now) return { label: 'Terminée', tone: 'ended' };
  if (c.endsAt) return { label: `En cours · jusqu’au ${shortDay.format(new Date(c.endsAt.getTime() - 1))}`, tone: 'live' };
  return { label: 'En cours', tone: 'live' };
}
