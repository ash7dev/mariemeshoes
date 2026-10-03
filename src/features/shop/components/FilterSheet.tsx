'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setShoeSize } from '@/features/size/SizeProvider';
import { ADULT_SIZES, KID_SIZES } from '@/features/size/sizes';
import {
  GENRE_LABEL,
  PRICE_RANGES,
  PRICE_RANGE_KEYS,
  SHOP_GENRES,
  SHOP_SORTS,
  SORT_LABEL,
  activeFilterCount,
  shopHref,
  type ShopParams,
} from '../params';
import type { ShopPage, SizeCount } from '../queries';

type FilterSheetProps = {
  params: ShopParams;
  facets: ShopPage['facets'];
  size: number | null;
  sizeCounts: SizeCount[];
};

type Draft = ShopParams & { size: number | null };

const chip = (on: boolean) =>
  cn(
    'flex h-[42px] items-center gap-2 rounded-full border px-3.5 text-[0.84375rem] font-medium transition-colors',
    on ? 'border-deep bg-deep text-cream' : 'border-border bg-surface text-ink',
  );

/**
 * Mobile : bouton flottant « Filtrer · Trier » au-dessus du dock, et la feuille de filtres.
 * Les choix sont appliqués d'un coup avec « Voir les paires ».
 */
export default function FilterSheet({ params, facets, size, sizeCounts }: FilterSheetProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...params, size });
  const [kids, setKids] = useState(size !== null && size < 36);
  const counts = new Map(sizeCounts.map((c) => [c.size, c.count]));
  const active = activeFilterCount(params);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const openSheet = () => {
    setDraft({ ...params, size });
    setKids(size !== null && size < 36);
    setOpen(true);
  };

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const apply = () => {
    const { size: nextSize, ...filters } = draft;
    if (nextSize !== size) setShoeSize(nextSize);
    setOpen(false);
    router.push(shopHref(params, { ...filters, page: 1 }), { scroll: false });
  };

  const reset = () => setDraft({ ...draft, genre: null, marques: [], categorie: null, prix: null, collection: null, tri: 'nouveautes' });

  const sizes = kids ? KID_SIZES : ADULT_SIZES;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[max(112px,calc(env(safe-area-inset-bottom)+92px))] z-30 flex justify-center lg:hidden">
        <div className="pointer-events-auto flex h-[50px] items-center rounded-full bg-ink text-cream shadow-[0_16px_34px_-12px_rgba(22,19,21,0.6)]">
          <button type="button" onClick={openSheet} aria-haspopup="dialog" className="flex h-full items-center gap-2 pl-5 pr-[18px] text-[0.84375rem] font-semibold">
            <SlidersHorizontal className="size-[17px]" strokeWidth={1.8} aria-hidden="true" />
            Filtrer
            {active > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[0.6875rem]">
                {active}
                <span className="sr-only"> filtre{active > 1 ? 's' : ''} actif{active > 1 ? 's' : ''}</span>
              </span>
            )}
          </button>
          <span aria-hidden="true" className="h-[22px] w-px bg-cream/25" />
          <button type="button" onClick={openSheet} aria-haspopup="dialog" className="h-full pl-[18px] pr-5 text-[0.84375rem] font-semibold">
            Trier
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="filter-sheet-title"
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === dialogRef.current && setOpen(false)}
        className="mb-0 mt-auto h-[calc(100dvh-80px)] max-h-none w-full max-w-none rounded-t-[32px] bg-surface p-0 text-ink backdrop:bg-deep/55 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <span aria-hidden="true" className="mx-auto mt-2.5 h-[5px] w-11 rounded-full bg-border" />
          <div className="flex items-center justify-between py-2.5 pl-[22px] pr-3">
            <h2 id="filter-sheet-title" className="font-display text-[1.75rem]">
              Filtrer
            </h2>
            <button type="button" onClick={() => setOpen(false)} aria-label="Fermer" className="grid size-11 place-items-center rounded-full bg-card">
              <X className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-[22px] pb-6 pt-1.5">
            <fieldset className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <legend className="text-[0.6875rem] font-bold tracking-[0.22em]">POINTURE</legend>
                <Link href="/guide-des-pointures" className="text-[0.78125rem] font-semibold text-accent-ink">
                  Guide des pointures
                </Link>
              </div>
              <div className="grid grid-cols-6 gap-[7px]">
                {sizes.map((n) => {
                  const on = draft.size === n;
                  const out = !on && (counts.get(n) ?? 0) === 0;
                  return (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={on}
                      disabled={out}
                      onClick={() => update({ size: on ? null : n })}
                      className={cn(
                        'h-[46px] rounded-[14px] text-[0.9375rem]',
                        on
                          ? 'bg-accent font-bold text-white'
                          : out
                            ? 'border border-dashed border-[#D5CABE] text-muted line-through'
                            : 'border border-border bg-page font-medium',
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setKids((k) => !k)} className="h-[46px] rounded-[14px] bg-deep text-[0.71875rem] font-semibold text-cream">
                  {kids ? 'Adulte' : 'Enfant'}
                </button>
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[0.6875rem] font-bold tracking-[0.22em]">GENRE</legend>
              <div className="grid grid-cols-3 gap-0.5 rounded-full bg-card p-1">
                {SHOP_GENRES.map((g) => {
                  const on = draft.genre === g;
                  return (
                    <button
                      key={g}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ genre: on ? null : g })}
                      className={cn('h-[42px] rounded-full text-[0.84375rem] font-semibold', on ? 'bg-deep text-cream' : 'text-muted-ink')}
                    >
                      {GENRE_LABEL[g]}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {facets.brands.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-[0.6875rem] font-bold tracking-[0.22em]">MARQUE</legend>
                <div className="flex flex-wrap gap-2">
                  {facets.brands.map((b) => {
                    const on = draft.marques.includes(b.slug);
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        aria-pressed={on}
                        onClick={() => update({ marques: on ? draft.marques.filter((s) => s !== b.slug) : [...draft.marques, b.slug] })}
                        className={chip(on)}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-3 text-[0.6875rem] font-bold tracking-[0.22em]">PRIX</legend>
              <div className="flex flex-wrap gap-2">
                {PRICE_RANGE_KEYS.map((key) => {
                  const on = draft.prix === key;
                  return (
                    <button key={key} type="button" aria-pressed={on} onClick={() => update({ prix: on ? null : key })} className={chip(on)}>
                      {PRICE_RANGES[key].label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {facets.categories.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-[0.6875rem] font-bold tracking-[0.22em]">CATÉGORIE</legend>
                <div className="flex flex-wrap gap-2">
                  {facets.categories.map((c) => {
                    const on = draft.categorie === c.slug;
                    return (
                      <button key={c.slug} type="button" aria-pressed={on} onClick={() => update({ categorie: on ? null : c.slug })} className={chip(on)}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {facets.collections.length > 0 && (
              <fieldset>
                <legend className="mb-3 text-[0.6875rem] font-bold tracking-[0.22em]">COLLECTIONS</legend>
                <div className="flex flex-wrap gap-2">
                  {facets.collections.map((c) => {
                    const on = draft.collection === c.slug;
                    return (
                      <button key={c.slug} type="button" aria-pressed={on} onClick={() => update({ collection: on ? null : c.slug })} className={chip(on)}>
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset>
              <legend className="mb-3 text-[0.6875rem] font-bold tracking-[0.22em]">TRIER PAR</legend>
              <div className="flex flex-wrap gap-2">
                {SHOP_SORTS.map((tri) => (
                  <button key={tri} type="button" aria-pressed={draft.tri === tri} onClick={() => update({ tri })} className={chip(draft.tri === tri)}>
                    {SORT_LABEL[tri]}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex items-center gap-2.5 border-t border-border bg-surface px-4 pb-[max(26px,env(safe-area-inset-bottom))] pt-3.5">
            <button type="button" onClick={reset} className="h-[54px] px-[18px] text-sm font-semibold underline underline-offset-[3px]">
              Effacer
            </button>
            <button
              type="button"
              onClick={apply}
              className="h-[54px] flex-1 rounded-full bg-accent text-[0.9375rem] font-bold text-white shadow-[0_14px_28px_-12px_rgba(230,0,126,0.7)] active:scale-[0.98]"
            >
              Voir les paires
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
