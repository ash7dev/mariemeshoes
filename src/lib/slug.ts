/**
 * Slug d'URL conforme à la contrainte de la base (^[a-z0-9]+(-[a-z0-9]+)*$).
 * Exemple : "Air Force 1 '07 — Triple White" → "air-force-1-07-triple-white"
 */
export function slugify(text: string): string {
  if (!text) return '';

  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // accents
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-') // tout le reste devient un tiret unique
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
    .replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
