'use client';

import { useState, useTransition } from 'react';
import { Heart, LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setFeaturedColorwayAction } from '../actions';
import { FEATURED_DAYS, type FeaturedState } from '../featured';

const shortDate = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Dakar' });

/**
 * « Coup de cœur de la semaine » depuis la fiche produit : un coloris en ligne
 * passe en tête de la boutique pendant 7 jours. Un seul à la fois dans toute la boutique.
 */
export default function FeaturedPanel({ productOnline, state }: { productOnline: boolean; state: FeaturedState }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [choice, setChoice] = useState(state.candidates[0]?.id ?? '');

  const mine = state.current && state.candidates.some((c) => c.id === state.current!.colorwayId) ? state.current : null;
  const other = state.current && !mine ? state.current : null;

  const run = (colorwayId: string | null) =>
    startTransition(async () => {
      const outcome = await setFeaturedColorwayAction(colorwayId);
      setResult(outcome.ok ? { ok: true, message: outcome.message } : { ok: false, message: outcome.error });
    });

  return (
    <section aria-labelledby="featured-panel-title" className="flex flex-col gap-4 rounded-[28px] border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', mine ? 'bg-accent text-white' : 'bg-section text-section-ink')}>
          <Heart className="size-5" strokeWidth={1.8} fill={mine ? 'currentColor' : 'none'} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="featured-panel-title" className="font-display text-[1.25rem] leading-tight">
            Coup de cœur de la semaine
          </h2>
          <p className="text-sm leading-relaxed text-muted-ink" suppressHydrationWarning>
            {mine
              ? `${mine.label} est en tête de la boutique jusqu’au ${shortDate.format(new Date(mine.until))}.`
              : !productOnline
                ? 'Disponible quand le produit est en ligne.'
                : other
                  ? `Actuellement : ${other.label}. Le choisir ici le remplace.`
                  : `Mets un coloris en tête de la boutique pendant ${FEATURED_DAYS} jours.`}
          </p>
          {result && (
            <p role={result.ok ? 'status' : 'alert'} className={cn('text-sm font-medium', result.ok ? 'text-[#1F6B3A]' : 'text-accent-ink')}>
              {result.message}
            </p>
          )}
        </div>
      </div>

      {productOnline && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {mine ? (
            <button
              type="button"
              onClick={() => run(null)}
              disabled={pending}
              className="flex h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:border-ink disabled:opacity-60"
            >
              {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
              Retirer
            </button>
          ) : (
            <>
              {state.candidates.length > 1 && (
                <label className="flex items-center">
                  <span className="sr-only">Coloris à mettre en avant</span>
                  <select
                    value={choice}
                    onChange={(event) => setChoice(event.target.value)}
                    className="h-11 rounded-full border border-border bg-page px-4 text-sm"
                  >
                    {state.candidates.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <button
                type="button"
                onClick={() => run(choice)}
                disabled={pending || !choice}
                className="flex h-11 items-center gap-2 rounded-full bg-deep px-5 text-sm font-semibold text-cream transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pending && <LoaderCircle className="size-4 motion-safe:animate-spin" strokeWidth={2} aria-hidden="true" />}
                Mettre en coup de cœur
              </button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
