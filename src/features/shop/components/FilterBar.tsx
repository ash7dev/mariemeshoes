import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  GENRE_LABEL,
  PRICE_RANGES,
  PRICE_RANGE_KEYS,
  SHOP_GENRES,
  SHOP_SORTS,
  SORT_LABEL,
  shopHref,
  toggleBrand,
  type ShopParams,
} from '../params';
import type { ShopPage } from '../queries';
import FilterMenu from './FilterMenu';

type FilterBarProps = {
  params: ShopParams;
  facets: ShopPage['facets'];
  total: number;
  size: number | null;
};

/** Barre de filtres ordinateur : genre, menus Marque / Catégorie / Prix / Collections, total et tri. */
export default function FilterBar({ params, facets, total, size }: FilterBarProps) {
  const genres = [{ key: null, label: 'Tout' }, ...SHOP_GENRES.map((g) => ({ key: g, label: GENRE_LABEL[g] }))];

  return (
    <section
      aria-label="Filtres"
      className="mt-[22px] flex items-center justify-between gap-5 rounded-full border border-border bg-surface p-2 shadow-[0_18px_40px_-30px_rgba(42,14,30,0.35)]"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <nav aria-label="Genre" className="flex gap-0.5 rounded-full bg-card p-1">
          {genres.map((g) => {
            const active = params.genre === g.key;
            return (
              <Link
                key={g.label}
                href={shopHref(params, { genre: g.key })}
                scroll={false}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'flex h-10 items-center rounded-full px-[18px] text-[0.8125rem] font-semibold transition-colors',
                  active ? 'bg-deep text-cream' : 'text-muted-ink hover:text-ink',
                )}
              >
                {g.label}
              </Link>
            );
          })}
        </nav>

        <FilterMenu
          label="Marque"
          multiple
          activeCount={params.marques.length}
          items={facets.brands.map((b) => ({
            label: b.name,
            href: shopHref(params, { marques: toggleBrand(params, b.slug) }),
            selected: params.marques.includes(b.slug),
          }))}
        />
        {facets.categories.length > 0 && (
          <FilterMenu
            label="Catégorie"
            activeCount={params.categorie ? 1 : 0}
            items={facets.categories.map((c) => ({
              label: c.name,
              href: shopHref(params, { categorie: params.categorie === c.slug ? null : c.slug }),
              selected: params.categorie === c.slug,
            }))}
          />
        )}
        <FilterMenu
          label="Prix"
          activeCount={params.prix ? 1 : 0}
          items={PRICE_RANGE_KEYS.map((key) => ({
            label: `${PRICE_RANGES[key].label} FCFA`,
            href: shopHref(params, { prix: params.prix === key ? null : key }),
            selected: params.prix === key,
          }))}
        />
        {facets.collections.length > 0 && (
          <FilterMenu
            label="Collections"
            activeCount={params.collection ? 1 : 0}
            items={facets.collections.map((c) => ({
              label: c.name,
              href: shopHref(params, { collection: params.collection === c.slug ? null : c.slug }),
              selected: params.collection === c.slug,
            }))}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-4 pr-1.5">
        <p className="text-sm text-muted-ink" aria-live="polite">
          <strong className="font-semibold text-ink">
            {total} modèle{total > 1 ? 's' : ''}
          </strong>
          {size ? ` en ${size}` : ''}
        </p>
        <FilterMenu
          align="right"
          label={
            <span>
              <span className="opacity-75">Trier : </span>
              <strong className="font-semibold">{SORT_LABEL[params.tri]}</strong>
            </span>
          }
          variant="outline"
          items={SHOP_SORTS.map((tri) => ({ label: SORT_LABEL[tri], href: shopHref(params, { tri }), selected: params.tri === tri }))}
        />
      </div>
    </section>
  );
}
