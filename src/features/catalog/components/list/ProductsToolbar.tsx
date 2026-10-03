'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductSort } from '../../list-queries';

type ProductsToolbarProps = {
  brands: Array<{ name: string; slug: string }>;
  initial: { q?: string; brand?: string; sort: ProductSort };
};

const SORT_LABELS: Record<ProductSort, string> = {
  recents: 'Plus récents',
  modifies: 'Modifiés récemment',
  nom: 'Nom (A → Z)',
};

const selectClass =
  'h-11 rounded-full border border-border bg-surface pl-4 pr-9 text-sm outline-none transition-colors hover:border-muted focus:border-accent';

/** Recherche (à la frappe), marque et tri : tout vit dans l'URL (partageable, retour arrière). */
export default function ProductsToolbar({ brands, initial }: ProductsToolbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /** Remplace des paramètres de l'URL ; tout changement de filtre revient à la page 1. */
  function apply(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="products-search" className="sr-only">
          Rechercher un produit
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-ink" strokeWidth={1.7} aria-hidden="true" />
        <input
          id="products-search"
          type="search"
          value={q}
          onChange={(event) => {
            const value = event.target.value;
            setQ(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply({ q: value.trim() || undefined }), 300);
          }}
          placeholder="Modèle, marque, coloris, code style, SKU…"
          className="h-11 w-full rounded-full border border-border bg-surface pl-11 pr-11 text-[0.9375rem] outline-none transition-colors placeholder:text-muted hover:border-muted focus:border-accent [&::-webkit-search-cancel-button]:hidden"
        />
        {pending ? (
          <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-ink motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />
        ) : (
          q && (
            <button
              type="button"
              onClick={() => {
                setQ('');
                clearTimeout(timer.current);
                apply({ q: undefined });
              }}
              aria-label="Effacer la recherche"
              className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-ink hover:bg-card hover:text-ink"
            >
              <X className="size-4" strokeWidth={2} aria-hidden="true" />
            </button>
          )
        )}
      </div>

      <div className="flex gap-2.5">
        <label htmlFor="products-brand" className="sr-only">
          Marque
        </label>
        <select
          id="products-brand"
          defaultValue={initial.brand ?? ''}
          disabled={brands.length === 0}
          onChange={(event) => apply({ marque: event.target.value || undefined })}
          className={cn(selectClass, 'min-w-0 flex-1 sm:w-44 sm:flex-none')}
        >
          <option value="">Toutes les marques</option>
          {brands.map((brand) => (
            <option key={brand.slug} value={brand.slug}>
              {brand.name}
            </option>
          ))}
        </select>

        <label htmlFor="products-sort" className="sr-only">
          Trier
        </label>
        <select
          id="products-sort"
          defaultValue={initial.sort}
          onChange={(event) => apply({ tri: event.target.value === 'recents' ? undefined : event.target.value })}
          className={cn(selectClass, 'min-w-0 flex-1 sm:w-52 sm:flex-none')}
        >
          {(Object.keys(SORT_LABELS) as ProductSort[]).map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
