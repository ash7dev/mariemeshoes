import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { Truck } from 'lucide-react';
import { SIZE_COOKIE, parseSize } from '@/features/size/sizes';
import { getStoreSettings } from '@/features/settings/queries';
import { getShopPage } from '@/features/shop/queries';
import { GENRE_LABEL, PRICE_RANGES, activeFilterCount, parseShopParams, shopHref, toggleBrand } from '@/features/shop/params';
import SizeSync from '@/features/shop/components/SizeSync';
import SizeRibbon from '@/features/shop/components/SizeRibbon';
import FilterBar from '@/features/shop/components/FilterBar';
import ActiveFilters from '@/features/shop/components/ActiveFilters';
import ProductCard from '@/features/shop/components/ProductCard';
import ProductCardMobile from '@/features/shop/components/ProductCardMobile';
import FeaturedCard from '@/features/shop/components/FeaturedCard';
import CollectionTile from '@/features/shop/components/CollectionTile';
import LoadMore from '@/features/shop/components/LoadMore';
import FilterSheet from '@/features/shop/components/FilterSheet';
import { CatalogEmpty, NoResults, Reassurance } from '@/features/shop/components/ShopSections';

export const metadata: Metadata = {
  title: 'Boutique',
  description: 'Sneakers neuves livrées partout au Sénégal. Choisis ta pointure : on n’affiche que les paires disponibles dans ta taille.',
};

/** La tuile collection se place après ce nombre de cartes (ordinateur, mobile). */
const TILE_AFTER = { desktop: 8, mobile: 2 } as const;

export default async function BoutiquePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [raw, cookieStore] = await Promise.all([searchParams, cookies()]);
  const params = parseShopParams(raw);
  const size = parseSize(cookieStore.get(SIZE_COOKIE)?.value);
  const [shop, settings] = await Promise.all([getShopPage(params, size), getStoreSettings()]);

  const clearHref = shopHref({ ...params, genre: null, marques: [], categorie: null, prix: null, collection: null });
  const hasFilters = activeFilterCount(params) > 0;
  const shown = shop.cards.length + (shop.featured ? 1 : 0);
  const brandName = new Map(shop.facets.brands.map((b) => [b.slug, b.name]));
  const chips = [
    ...(params.genre ? [{ label: GENRE_LABEL[params.genre], href: shopHref(params, { genre: null }) }] : []),
    ...params.marques.map((slug) => ({ label: brandName.get(slug) ?? slug, href: shopHref(params, { marques: toggleBrand(params, slug) }) })),
    ...(params.categorie
      ? [{ label: shop.facets.categories.find((c) => c.slug === params.categorie)?.name ?? params.categorie, href: shopHref(params, { categorie: null }) }]
      : []),
    ...(params.prix ? [{ label: `${PRICE_RANGES[params.prix].label} FCFA`, href: shopHref(params, { prix: null }) }] : []),
    ...(params.collection
      ? [{ label: shop.facets.collections.find((c) => c.slug === params.collection)?.name ?? params.collection, href: shopHref(params, { collection: null }) }]
      : []),
  ];

  const desktopTileAt = Math.min(TILE_AFTER.desktop, shop.cards.length);
  const mobileTileAt = Math.min(TILE_AFTER.mobile, shop.cards.length);
  const empty = shop.total === 0;

  return (
    <div className="mx-auto w-full max-w-[90rem] lg:px-20">
      <SizeSync serverSize={size} />

      {/* En-tête de page */}
      <section className="mx-auto flex max-w-[80rem] flex-col gap-1.5 px-4 pt-3.5 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:px-0 lg:pb-7 lg:pt-[52px]">
        <div className="flex flex-col gap-1.5 lg:gap-3.5">
          <nav aria-label="Fil d’Ariane" className="hidden gap-2.5 text-[0.8125rem] text-muted-ink lg:flex">
            <Link href="/" className="hover:text-ink">
              Accueil
            </Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page" className="text-ink">
              Boutique
            </span>
          </nav>
          <h1 className="font-display text-[2.5rem] leading-none lg:text-[4.5rem] lg:leading-[0.95] lg:tracking-[-0.01em]">La boutique</h1>
          <p className="text-sm text-muted-ink lg:text-[1.0625rem]">
            Des paires neuves, livrées partout au Sénégal.<span className="hidden lg:inline"> Tu paies avec Wave ou à la livraison.</span>
          </p>
        </div>
        <p className="hidden shrink-0 items-center gap-3.5 rounded-full border border-border bg-surface py-2.5 pl-2.5 pr-[22px] lg:flex">
          <span className="grid size-[52px] place-items-center rounded-full bg-section text-section-ink">
            <Truck className="size-[22px]" strokeWidth={1.7} aria-hidden="true" />
          </span>
          {shop.fastestDelivery ? (
            <span className="flex flex-col gap-[3px]">
              <span className="text-sm font-semibold">Livraison {shop.fastestDelivery.zone}</span>
              <span className="text-[0.8125rem] text-muted-ink">en {shop.fastestDelivery.delay}</span>
            </span>
          ) : (
            <span className="flex flex-col gap-[3px]">
              <span className="text-sm font-semibold">Livraison partout</span>
              <span className="text-[0.8125rem] text-muted-ink">au Sénégal</span>
            </span>
          )}
        </p>
      </section>

      {shop.catalogEmpty ? (
        <div className="mx-auto max-w-[80rem]">
          <CatalogEmpty whatsapp={settings.whatsappNumber} />
        </div>
      ) : (
        <>
          {/* ═══════════════════ Ordinateur ═══════════════════ */}
          <div className="mx-auto hidden max-w-[80rem] lg:block">
            <SizeRibbon size={size} counts={shop.sizeCounts} variant="desktop" />
            <FilterBar params={params} facets={shop.facets} total={shop.total} size={size} />
            <ActiveFilters size={size} chips={chips} clearHref={clearHref} />

            {empty ? (
              <NoResults size={size} clearHref={clearHref} hasFilters={hasFilters} />
            ) : (
              <section aria-label="Paires" className="grid grid-flow-dense grid-cols-4 gap-6">
                {shop.featured && <FeaturedCard card={shop.featured} size={size} />}
                {shop.cards.slice(0, desktopTileAt).map((card) => (
                  <ProductCard key={card.id} card={card} size={size} />
                ))}
                {shop.collectionTile && <CollectionTile tile={shop.collectionTile} variant="desktop" />}
                {shop.cards.slice(desktopTileAt).map((card) => (
                  <ProductCard key={card.id} card={card} size={size} />
                ))}
              </section>
            )}

            <LoadMore params={params} shown={shown} total={shop.total} hasMore={shop.hasMore} />
            <Reassurance whatsapp={settings.whatsappNumber} />
          </div>

          {/* ═══════════════════ Mobile ═══════════════════ */}
          <div className="flex flex-col pb-6 lg:hidden">
            <div className="px-4 pt-[18px]">
              <SizeRibbon size={size} counts={shop.sizeCounts} variant="mobile" />
            </div>

            <nav aria-label="Genre" className="flex gap-2 overflow-x-auto px-4 pt-[18px] [scrollbar-width:none]">
              {[{ key: null, label: 'Tout' } as const, ...(['homme', 'femme', 'enfant'] as const).map((g) => ({ key: g, label: GENRE_LABEL[g] }))].map((g) => {
                const active = params.genre === g.key;
                return (
                  <Link
                    key={g.label}
                    href={shopHref(params, { genre: g.key })}
                    scroll={false}
                    aria-current={active ? 'true' : undefined}
                    className={
                      active
                        ? 'flex h-10 shrink-0 items-center rounded-full bg-deep px-[18px] text-[0.8125rem] font-semibold text-cream'
                        : 'flex h-10 shrink-0 items-center rounded-full border border-border bg-surface px-4 text-[0.8125rem] font-medium'
                    }
                  >
                    {g.label}
                  </Link>
                );
              })}
            </nav>

            <p className="px-4 pb-3.5 pt-[18px] text-[0.8125rem] text-muted-ink" aria-live="polite">
              <strong className="font-semibold text-ink">
                {shop.total} modèle{shop.total > 1 ? 's' : ''}
              </strong>
              {size ? ` en ${size}` : ''}
            </p>

            {empty ? (
              <div className="px-4">
                <NoResults size={size} clearHref={clearHref} hasFilters={hasFilters} />
              </div>
            ) : (
              <section aria-label="Paires" className="flex flex-col gap-4 px-4">
                {[shop.featured, ...shop.cards.slice(0, mobileTileAt)].map(
                  (card) => card && <ProductCardMobile key={card.id} card={card} size={size} />,
                )}
                {shop.collectionTile && <CollectionTile tile={shop.collectionTile} variant="mobile" />}
                {shop.cards.slice(mobileTileAt).map((card) => (
                  <ProductCardMobile key={card.id} card={card} size={size} />
                ))}
              </section>
            )}

            <div className="px-4">
              <LoadMore params={params} shown={shown} total={shop.total} hasMore={shop.hasMore} />
            </div>

            <FilterSheet params={params} facets={shop.facets} size={size} sizeCounts={shop.sizeCounts} />
          </div>
        </>
      )}
    </div>
  );
}
