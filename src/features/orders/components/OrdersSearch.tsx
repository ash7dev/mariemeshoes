'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';

/** Recherche à la frappe (référence, nom, numéro) ; vit dans l'URL, revient à la page 1. */
export default function OrdersSearch({ initial }: { initial?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(initial ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function apply(value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set('q', value);
    else next.delete('q');
    next.delete('page');
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  return (
    <div className="relative">
      <label htmlFor="orders-search" className="sr-only">
        Rechercher une commande
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-ink" strokeWidth={1.7} aria-hidden="true" />
      <input
        id="orders-search"
        type="search"
        value={q}
        onChange={(event) => {
          const value = event.target.value;
          setQ(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => apply(value.trim()), 300);
        }}
        placeholder="Référence, nom du client ou numéro…"
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
              apply('');
            }}
            aria-label="Effacer la recherche"
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-ink hover:bg-card hover:text-ink"
          >
            <X className="size-4" strokeWidth={2} aria-hidden="true" />
          </button>
        )
      )}
    </div>
  );
}
