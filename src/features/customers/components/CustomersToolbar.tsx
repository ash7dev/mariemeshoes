'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import type { CustomerSort } from '../queries';

const SORT_LABELS: Record<CustomerSort, string> = {
  'derniere-commande': 'Dernière commande',
  depense: 'Plus gros acheteurs',
  commandes: 'Plus de commandes',
  recents: 'Arrivés récemment',
};

/** Recherche (nom, numéro, e-mail) et tri ; tout vit dans l'URL, retour à la page 1. */
export default function CustomersToolbar({ initial }: { initial: { q?: string; sort: CustomerSort } }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="customers-search" className="sr-only">
          Rechercher un client
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-ink" strokeWidth={1.7} aria-hidden="true" />
        <input
          id="customers-search"
          type="search"
          value={q}
          onChange={(event) => {
            const value = event.target.value;
            setQ(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply({ q: value.trim() || undefined }), 300);
          }}
          placeholder="Nom, numéro ou e-mail…"
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
      <label htmlFor="customers-sort" className="sr-only">
        Trier
      </label>
      <select
        id="customers-sort"
        defaultValue={initial.sort}
        onChange={(event) => apply({ tri: event.target.value === 'derniere-commande' ? undefined : event.target.value })}
        className="h-11 rounded-full border border-border bg-surface pl-4 pr-9 text-sm outline-none transition-colors hover:border-muted focus:border-accent sm:w-56"
      >
        {(Object.keys(SORT_LABELS) as CustomerSort[]).map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
    </div>
  );
}
