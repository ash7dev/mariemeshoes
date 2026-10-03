import { z } from 'zod';
import { parseSenegalPhone } from '@/lib/phone';

/** Champ texte facultatif : vide → null. */
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au maximum.`)
    .transform((v) => (v ? v : null));

/** Numéro saisi librement (« 77 123 45 67 », « +221… ») → E.164, ou null si vide. */
const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const senegal = parseSenegalPhone(v);
    if (senegal) return senegal;
    const international = v.replace(/[\s\-.()]/g, '').replace(/^00/, '+');
    if (/^\+[1-9][0-9]{7,14}$/.test(international)) return international;
    ctx.addIssue({ code: 'custom', message: 'Numéro invalide : ex. 77 123 45 67.' });
    return z.NEVER;
  });

/**
 * « @mariemeshoes », « instagram.com/mariemeshoes » ou l'URL complète → URL https.
 * Identifiant seul : https://www.instagram.com/<id>/ ou https://www.tiktok.com/@<id>
 */
const socialUrl = (host: 'instagram.com' | 'tiktok.com') =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const handle = v.match(/^@?([A-Za-z0-9_.]{2,30})$/)?.[1];
      if (handle) return host === 'instagram.com' ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;
      const url = (v.startsWith('http') ? v : `https://${v}`).replace(/^http:\/\//, 'https://');
      const pattern = host === 'instagram.com' ? /^https:\/\/(www\.)?instagram\.com\// : /^https:\/\/(www\.)?tiktok\.com\//;
      if (pattern.test(url)) return url;
      ctx.addIssue({ code: 'custom', message: `Lien ${host} ou @identifiant attendu.` });
      return z.NEVER;
    });

export const storeInfoSchema = z.object({
  storeName: z.string().trim().min(1, 'Nom obligatoire.').max(80, '80 caractères au maximum.'),
  whatsappNumber: phone,
  contactPhone: phone,
  contactEmail: z
    .string()
    .trim()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), 'Adresse e-mail invalide.'),
  instagramUrl: socialUrl('instagram.com'),
  tiktokUrl: socialUrl('tiktok.com'),
});

export const waveSchema = z.object({
  waveMerchantCode: optional(40).refine((v) => v === null || /^[A-Za-z0-9_-]{2,40}$/.test(v), 'Lettres, chiffres, - et _ uniquement.'),
  wavePaymentLink: z
    .string()
    .trim()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https:\/\/pay\.wave\.com\//.test(v), 'Le lien doit commencer par https://pay.wave.com/'),
});

export const zoneSchema = z.object({
  name: z.string().trim().min(1, 'Nomme la zone.').max(80, '80 caractères au maximum.'),
  fee: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === 'string' ? Number(v.replace(/\s/g, '') || NaN) : v))
    .refine((v) => Number.isInteger(v) && v >= 0, 'Frais en FCFA (0 = gratuit).')
    .refine((v) => v <= 1_000_000, 'Frais trop élevés.'),
  estimatedDelay: optional(40),
});

export const catalogNameSchema = z.string().trim().min(1, 'Nom obligatoire.').max(60, '60 caractères au maximum.');

export type FieldErrors = Record<string, string>;
export type FormResult = { status: 'idle' } | { status: 'saved'; message: string; at: number } | { status: 'error'; fieldErrors: FieldErrors; formError?: string };

export function fieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) errors[issue.path.join('.') || 'form'] ??= issue.message;
  return errors;
}
