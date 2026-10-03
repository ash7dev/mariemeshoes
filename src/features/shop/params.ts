import type { Gender } from '@/generated/prisma/enums';

/*
 * Filtres de la boutique, portés par l'URL (/boutique?genre=homme&marque=nike,adidas…) :
 * un lien partagé sur WhatsApp montre la même sélection. La pointure, elle, vient
 * du cookie (choisie une fois pour tout le site).
 */

export const SHOP_GENRES = ['homme', 'femme', 'enfant'] as const;
export type ShopGenre = (typeof SHOP_GENRES)[number];

export const GENRE_LABEL: Record<ShopGenre, string> = { homme: 'Homme', femme: 'Femme', enfant: 'Enfant' };

/** Un modèle unisexe apparaît en Homme comme en Femme. */
export const GENRE_GENDERS: Record<ShopGenre, Gender[]> = {
  homme: ['MEN', 'UNISEX'],
  femme: ['WOMEN', 'UNISEX'],
  enfant: ['KIDS'],
};

export const SHOP_SORTS = ['nouveautes', 'prix-croissant', 'prix-decroissant'] as const;
export type ShopSort = (typeof SHOP_SORTS)[number];

export const SORT_LABEL: Record<ShopSort, string> = {
  nouveautes: 'Nouveautés',
  'prix-croissant': 'Prix croissant',
  'prix-decroissant': 'Prix décroissant',
};

export const PRICE_RANGES = {
  'moins-40000': { label: 'Moins de 40 000', min: null, max: 39_999 },
  '40000-70000': { label: '40 000 – 70 000', min: 40_000, max: 70_000 },
  'plus-70000': { label: 'Plus de 70 000', min: 70_001, max: null },
} as const satisfies Record<string, { label: string; min: number | null; max: number | null }>;
export type PriceRange = keyof typeof PRICE_RANGES;
export const PRICE_RANGE_KEYS = Object.keys(PRICE_RANGES) as PriceRange[];

/** Modèles affichés par « page » : « Voir plus » en ajoute autant. */
export const SHOP_PAGE_SIZE = 12;
const MAX_PAGE = 50;
const MAX_BRANDS = 12;

export type ShopParams = {
  genre: ShopGenre | null;
  marques: string[];
  categorie: string | null;
  prix: PriceRange | null;
  collection: string | null;
  tri: ShopSort;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
const isSlug = (value: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 80;
const pick = <T extends string>(list: readonly T[], value: string | undefined): T | null =>
  value && (list as readonly string[]).includes(value) ? (value as T) : null;

export function parseShopParams(raw: RawParams): ShopParams {
  const slug = (key: string) => {
    const value = first(raw[key]);
    return value && isSlug(value) ? value : null;
  };
  const marques = [...new Set((first(raw.marque) ?? '').split(',').map((s) => s.trim()).filter(isSlug))].slice(0, MAX_BRANDS);
  const page = Number(first(raw.page));

  return {
    genre: pick(SHOP_GENRES, first(raw.genre)),
    marques,
    categorie: slug('categorie'),
    prix: pick(PRICE_RANGE_KEYS, first(raw.prix)),
    collection: slug('collection'),
    tri: pick(SHOP_SORTS, first(raw.tri)) ?? 'nouveautes',
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

/** Lien vers la boutique avec ces filtres modifiés. Tout changement de filtre repart de la page 1. */
export function shopHref(params: ShopParams, changes: Partial<ShopParams> = {}): string {
  const next = { ...params, page: 1, ...changes };
  const query = new URLSearchParams();
  if (next.genre) query.set('genre', next.genre);
  if (next.marques.length) query.set('marque', next.marques.join(','));
  if (next.categorie) query.set('categorie', next.categorie);
  if (next.prix) query.set('prix', next.prix);
  if (next.collection) query.set('collection', next.collection);
  if (next.tri !== 'nouveautes') query.set('tri', next.tri);
  if (next.page > 1) query.set('page', String(next.page));
  const search = query.toString().replace(/%2C/g, ',');
  return search ? `/boutique?${search}` : '/boutique';
}

/** Nombre de filtres actifs (hors pointure et tri). */
export function activeFilterCount(params: ShopParams): number {
  return (params.genre ? 1 : 0) + params.marques.length + (params.categorie ? 1 : 0) + (params.prix ? 1 : 0) + (params.collection ? 1 : 0);
}

export function toggleBrand(params: ShopParams, slug: string): string[] {
  return params.marques.includes(slug) ? params.marques.filter((s) => s !== slug) : [...params.marques, slug];
}
