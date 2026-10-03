import { prisma } from '@/lib/prisma';
import { withDbRetry } from '@/lib/db-retry';
import { productImageUrl } from '@/lib/supabase/storage';
import { getLiveAutomaticPromotions } from '@/features/promotions/queries';
import { bestAutomaticPromotion } from '@/features/promotions/rules';
import { getPublicPromotions, type PublicPromotion } from '@/features/promotions/public';
import { BESTSELLER_DAYS } from '@/features/collections/schemas';
import { IN_STOCK, cardSelect, liveCollection, toCard, visibleWhere, type ShopCard } from '@/features/shop/queries';

/** Une paire compte comme « nouveauté » de l'accueil pendant 14 jours (comme le badge Nouveau). */
const NEW_FOR_DAYS = 14;
/** Paires sur la scène, cartes du bandeau Nouveautés, collections, marques. */
const DROP_SIZE = 4;
const NEWS_SIZE = 4;
const COLLECTIONS_SIZE = 4;
const BRANDS_SIZE = 8;
/** Promotions mises en avant sur l'accueil, et paires montrées pour chacune. */
const PROMOS_SIZE = 2;
const PROMO_PAIRS = 4;

export type DropSize = { variantId: string; size: number; stock: number };
export type DropSlide = {
  card: ShopCard;
  /** Pourquoi la paire est sur la scène : « Coup de cœur », « Nouveauté », « La plus demandée », « −15 % », « À redécouvrir ». */
  kicker: string;
  sizes: DropSize[];
};

/** Une remise en cours et les paires qu'elle touche (prix barrés). */
export type HomePromo = PublicPromotion & { cards: ShopCard[]; count: number };

export type HomeCollection = { slug: string; name: string; description: string | null; imageUrl: string | null; count: number };
export type HomeBrand = { slug: string; name: string; count: number; fromPrice: number };

export type HomePage = {
  catalogEmpty: boolean;
  /** « Le drop de la semaine » s'il y a des nouveautés, sinon « La sélection de la semaine ». */
  dropTitle: string;
  drop: DropSlide[];
  /** « Nouveautés » s'il y en a assez, sinon « Dernières arrivées » (jamais vide). */
  newsTitle: string;
  /** Toutes les cartes du bandeau sont-elles disponibles dans la pointure du client ? */
  newsInSize: boolean;
  news: ShopCard[];
  collections: HomeCollection[];
  brands: HomeBrand[];
  /** Remises en cours qui touchent au moins une paire en ligne. */
  promos: HomePromo[];
  /** Livraison offerte en cours, ou null. */
  freeDelivery: PublicPromotion | null;
};

/**
 * Tout l'accueil en une lecture du catalogue en ligne.
 *
 * La scène ne dépend pas d'un ajout de l'admin chaque semaine : ses 4 places se
 * remplissent dans cet ordre, sans deux coloris du même modèle :
 *  1. le coup de cœur de la semaine, s'il est réglé ;
 *  2. les nouveautés (mises en ligne depuis moins de 14 jours), les plus récentes d'abord ;
 *  3. les plus vendues des 30 derniers jours ;
 *  4. les paires en promotion ;
 *  5. une rotation dans le reste du catalogue, qui change chaque lundi.
 * Dans chaque groupe, les paires disponibles dans la pointure du client passent devant.
 */
export async function getHomePage(size: number | null): Promise<HomePage> {
  const now = new Date();
  const visible = visibleWhere(now);
  const base = cardSelect(now);
  const select = {
    ...base,
    productId: true,
    featuredUntil: true,
    product: { select: { ...base.product.select, brand: { select: { name: true, slug: true } } } },
    variants: { where: IN_STOCK, orderBy: { sizeEu: 'asc' as const }, select: { id: true, sizeEu: true, stock: true } },
  };

  const [publicPromotions, promotions, rows, ranking, collectionRows] = await withDbRetry(() =>
    Promise.all([
      getPublicPromotions(),
      getLiveAutomaticPromotions(now),
      prisma.colorway.findMany({ where: visible, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], select }),
      prisma.$queryRaw<Array<{ colorway_id: string }>>`
        SELECT v.colorway_id
          FROM order_items oi
          JOIN orders o   ON o.id = oi.order_id
          JOIN variants v ON v.id = oi.variant_id
         WHERE o.status IN ('CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED')
           AND o.created_at >= now() - make_interval(days => ${BESTSELLER_DAYS}::int)
         GROUP BY v.colorway_id
         ORDER BY sum(oi.quantity) DESC, max(o.created_at) DESC
         LIMIT 12`,
      prisma.collection.findMany({
        where: { ...liveCollection(now), items: { some: { colorway: visible } } },
        orderBy: [{ showOnHome: 'desc' }, { homePosition: 'asc' }, { name: 'asc' }],
        select: {
          slug: true,
          name: true,
          description: true,
          coverImageUrl: true,
          showOnHome: true,
          items: {
            where: { colorway: visible },
            orderBy: { position: 'asc' },
            select: { colorway: { select: { images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } } } },
          },
        },
      }),
    ]),
  );

  type Row = (typeof rows)[number];
  const empty: HomePage = {
    catalogEmpty: true,
    dropTitle: '',
    drop: [],
    newsTitle: '',
    newsInSize: false,
    news: [],
    collections: [],
    brands: [],
    promos: [],
    freeDelivery: null,
  };
  if (rows.length === 0) return empty;

  const cards = new Map<string, ShopCard>();
  const cardOf = (row: Row) => {
    let card = cards.get(row.id);
    if (!card) cards.set(row.id, (card = toCard(row, size, promotions, now)));
    return card;
  };
  const fits = (row: Row) => size === null || row.variants.some((v) => v.sizeEu === size);
  /** Les paires dans la pointure du client d'abord, l'ordre d'origine sinon. */
  const sizeFirst = (list: Row[]) => [...list.filter(fits), ...list.filter((r) => !fits(r))];
  const isNew = (row: Row) => row.publishedAt !== null && now.getTime() - row.publishedAt.getTime() < NEW_FOR_DAYS * 86_400_000;

  // ── La scène ──────────────────────────────────────────────────────────────
  const byId = new Map(rows.map((r) => [r.id, r]));
  const featured = rows.find((r) => r.featuredUntil !== null && r.featuredUntil > now);
  const fresh = rows.filter(isNew);
  const bestsellers = ranking.flatMap((r) => byId.get(r.colorway_id) ?? []);
  const onSale = rows.filter((r) => cardOf(r).struck !== null);
  const week = weekNumber(now);
  const rotation = [...rows].sort((a, b) => hash(`${a.id}:${week}`) - hash(`${b.id}:${week}`));

  const drop: DropSlide[] = [];
  const usedProducts = new Set<string>();
  const take = (row: Row | undefined, kicker: (card: ShopCard) => string) => {
    if (!row || drop.length >= DROP_SIZE || usedProducts.has(row.productId)) return;
    usedProducts.add(row.productId);
    const card = cardOf(row);
    drop.push({ card, kicker: kicker(card), sizes: row.variants.map((v) => ({ variantId: v.id, size: v.sizeEu, stock: v.stock })) });
  };
  take(featured, () => 'Coup de cœur');
  for (const row of sizeFirst(fresh)) take(row, () => 'Nouveauté');
  for (const row of sizeFirst(bestsellers)) take(row, () => 'La plus demandée');
  for (const row of sizeFirst(onSale)) take(row, (card) => `−${card.discountPercent} %`);
  for (const row of sizeFirst(rotation)) take(row, () => 'À redécouvrir');

  // ── Nouveautés (sans répéter la scène, sauf s'il le faut pour remplir) ─────
  const onStage = new Set(drop.map((s) => s.card.id));
  const enoughNew = fresh.length >= NEWS_SIZE;
  const newsPool = enoughNew ? fresh : rows; // rows : déjà triées des plus récentes aux plus anciennes
  const newsRows = [...sizeFirst(newsPool.filter((r) => !onStage.has(r.id))), ...newsPool.filter((r) => onStage.has(r.id))].slice(0, NEWS_SIZE);

  // ── Collections : celles mises en avant, sinon les autres en cours ─────────
  const collections = collectionRows.slice(0, COLLECTIONS_SIZE).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    imageUrl: productImageUrl(c.coverImageUrl) ?? productImageUrl(c.items[0]?.colorway.images[0]?.url),
    count: c.items.length,
  }));

  // ── Marques : les plus fournies ───────────────────────────────────────────
  const brands = new Map<string, HomeBrand>();
  for (const row of rows) {
    const { brand } = row.product;
    const price = cardOf(row).price;
    const entry = brands.get(brand.slug);
    if (entry) {
      entry.count += 1;
      entry.fromPrice = Math.min(entry.fromPrice, price);
    } else {
      brands.set(brand.slug, { slug: brand.slug, name: brand.name, count: 1, fromPrice: price });
    }
  }

  // ── Promotions : les paires que chaque remise touche (celle qui l'emporte sur la paire) ──
  const promoRows = new Map<string, Row[]>();
  for (const row of rows) {
    const best = bestAutomaticPromotion(
      {
        key: row.id,
        colorwayId: row.id,
        brandId: row.product.brandId,
        categoryId: row.product.categoryId,
        collectionIds: row.collectionItems.map((item) => item.collectionId),
        unitPrice: row.price,
        compareAtPrice: row.compareAtPrice !== null && row.compareAtPrice > row.price ? row.compareAtPrice : null,
        quantity: 1,
      },
      promotions,
      now,
    );
    if (!best) continue;
    const list = promoRows.get(best.promotion.id) ?? [];
    list.push(row);
    promoRows.set(best.promotion.id, list);
  }
  const promos = publicPromotions
    .filter((p) => !p.freeDelivery && promoRows.has(p.id))
    .slice(0, PROMOS_SIZE)
    .map((p) => {
      const list = promoRows.get(p.id)!;
      return { ...p, count: list.length, cards: sizeFirst(list).slice(0, PROMO_PAIRS).map(cardOf) };
    });

  return {
    catalogEmpty: false,
    promos,
    freeDelivery: publicPromotions.find((p) => p.freeDelivery) ?? null,
    dropTitle: drop.some((s) => s.kicker === 'Nouveauté') ? 'Le drop de la semaine' : 'La sélection de la semaine',
    drop,
    newsTitle: enoughNew ? 'Nouveautés' : 'Dernières arrivées',
    newsInSize: size !== null && newsRows.length > 0 && newsRows.every(fits),
    news: newsRows.map(cardOf),
    collections,
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr')).slice(0, BRANDS_SIZE),
  };
}

/** Numéro de semaine (lundi → dimanche), heure de Dakar (UTC toute l'année). */
function weekNumber(date: Date): number {
  // 1970-01-05 était un lundi.
  return Math.floor((date.getTime() - Date.UTC(1970, 0, 5)) / (7 * 86_400_000));
}

/** Petit hachage stable (FNV-1a) : même semaine, même ordre ; nouvelle semaine, nouveau tirage. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
