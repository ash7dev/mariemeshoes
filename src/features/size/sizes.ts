/**
 * Pointures vendues au Sénégal : entiers, système EU (voir la contrainte
 * variants_size_eu_range_chk : 16 à 46).
 */
export const ADULT_SIZES = range(36, 46);
export const KID_SIZES = range(16, 35);

/** Cookie de la pointure choisie : lisible par le serveur pour filtrer le catalogue. */
export const SIZE_COOKIE = 'ms_pointure';
const ONE_YEAR = 60 * 60 * 24 * 365;

export function isValidSize(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 16 && (value as number) <= 46;
}

/** Valeur brute du cookie → pointure, ou null. Utilisable côté serveur comme côté client. */
export function parseSize(raw: string | undefined | null): number | null {
  const n = Number(raw);
  return isValidSize(n) ? n : null;
}

export function sizeCookie(size: number | null): string {
  return size === null
    ? `${SIZE_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    : `${SIZE_COOKIE}=${size}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`;
}

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
