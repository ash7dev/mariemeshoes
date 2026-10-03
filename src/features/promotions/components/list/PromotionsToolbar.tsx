'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PromotionTypeFilter } from '../../list-queries';

const TYPES: Array<{ value: PromotionTypeFilter; label: string }> = [
  { value: 'tous', label: 'Tous' },
  { value: 'codes', label: 'Codes promo' },
  { value: 'automatiques', label: 'Automatiques' },
];

/** Recherche (nom ou code) et type ; tout vit dans l'URL, retour à la page 1. */
export default function PromotionsToolbar({ initial }: { initial: { q?: string; type: PromotionTypeFilter } }) {
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
    next.delete('ok');
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <label htmlFor="promotions-search" className="sr-only">
          Rechercher une promotion
        </label>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-ink" strokeWidth={1.7} aria-hidden="true" />
        <input
          id="promotions-search"
          type="search"
          value={q}
          onChange={(event) => {
            const value = event.target.value;
            setQ(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply({ q: value.trim() || undefined }), 300);
          }}
          placeholder="Nom ou code (TABASKI10…)"
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

      <div role="radiogroup" aria-label="Type de promotion" className="grid grid-cols-3 gap-1 rounded-full border border-border bg-surface p-1">
        {TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            role="radio"
            aria-checked={initial.type === type.value}
            onClick={() => apply({ type: type.value === 'tous' ? undefined : type.value })}
            className={cn('h-9 whitespace-nowrap rounded-full px-3 text-sm font-medium', initial.type === type.value ? 'bg-deep text-cream' : 'text-muted-ink hover:text-ink')}
          >
            {type.label}
          </button>
        ))}
      </div>
    </div>
  );
}
