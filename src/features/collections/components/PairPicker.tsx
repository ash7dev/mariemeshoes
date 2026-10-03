'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowDown, ArrowUp, Check, ImageOff, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFCFA } from '@/lib/money';
import { COLLECTION_HIGHLIGHTS, COLLECTION_LIMITS } from '../schemas';
import type { CollectionPair } from '../queries';

const HIDDEN_LABEL: Record<NonNullable<CollectionPair['hiddenReason']>, string> = {
  brouillon: 'Brouillon',
  masqué: 'Masqué',
  rupture: 'Rupture',
};

export function PairThumb({ pair, size = 'md' }: { pair: CollectionPair; size?: 'sm' | 'md' }) {
  return (
    <span className={cn('grid shrink-0 place-items-center overflow-hidden rounded-xl bg-card', size === 'sm' ? 'size-9' : 'size-12')}>
      {pair.imageUrl ? (
        <Image src={pair.imageUrl} alt="" width={96} height={96} sizes="48px" className="size-full object-contain p-1 mix-blend-multiply" />
      ) : (
        <ImageOff className="size-4 text-muted-ink" strokeWidth={1.6} aria-hidden="true" />
      )}
    </span>
  );
}

export function HiddenBadge({ reason }: { reason: CollectionPair['hiddenReason'] }) {
  if (!reason) return null;
  return (
    <span title="Pas visible en boutique pour l’instant" className="shrink-0 rounded-full bg-[#FBE3EE] px-2 py-0.5 text-[0.6875rem] font-semibold text-accent-ink">
      {HIDDEN_LABEL[reason]}
    </span>
  );
}

/**
 * Paires d'une sélection : la liste choisie, dans l'ordre d'affichage (↑ ↓ pour réordonner),
 * et la recherche dans le catalogue pour en ajouter. Les premières sont les « incontournables »
 * de la page collection : on peut leur écrire un mot (sinon, la description du produit).
 */
export default function PairPicker({
  options,
  value,
  onChange,
  max,
  error,
  notes,
  onNotesChange,
}: {
  options: CollectionPair[];
  value: string[];
  onChange: (ids: string[]) => void;
  max: number;
  error?: string;
  notes: Record<string, string>;
  onNotesChange: (notes: Record<string, string>) => void;
}) {
  const [query, setQuery] = useState('');
  const byId = new Map(options.map((o) => [o.colorwayId, o]));
  const chosen = new Set(value);
  const q = query.trim().toLowerCase();
  const results = (q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options).slice(0, 50);
  const full = value.length >= max;

  const move = (index: number, delta: number) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sélection */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold">
          {value.length === 0 ? 'Aucune paire pour l’instant' : `${value.length} paire${value.length > 1 ? 's' : ''} dans la collection`}
          <span className="font-normal text-muted-ink"> · l’ordre ici est l’ordre en boutique</span>
        </p>
        {value.length > 0 && (
          <p className="text-xs leading-relaxed text-muted-ink">
            Les {COLLECTION_HIGHLIGHTS} premières sont mises en avant en haut de la page de la collection. Écris-leur un mot (facultatif) : sinon, la première
            phrase de la description du produit est reprise.
          </p>
        )}
        {value.length > 0 && (
          <ol className="flex flex-col gap-1.5 rounded-2xl bg-card p-1.5">
            {value.map((id, index) => {
              const pair = byId.get(id);
              const label = pair?.label ?? 'Paire supprimée';
              const highlighted = index < COLLECTION_HIGHLIGHTS;
              const noteId = `note-${id}`;
              return (
                <li key={id} className={cn('flex flex-col gap-2 rounded-xl bg-surface p-2 pr-1.5', highlighted && 'ring-1 ring-inset ring-[#F2C6DA]')}>
                  <div className="flex items-center gap-3">
                    <span className="w-5 text-center text-xs font-semibold tabular-nums text-muted-ink">{index + 1}</span>
                    {pair && <PairThumb pair={pair} />}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm font-medium">{label}</span>
                      <span className="flex items-center gap-2 text-xs text-muted-ink">
                        {pair && formatFCFA(pair.price)}
                        <HiddenBadge reason={pair?.hiddenReason ?? null} />
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`Monter ${label}`}
                        className="grid size-10 place-items-center rounded-full text-muted-ink hover:bg-card hover:text-ink disabled:opacity-30"
                      >
                        <ArrowUp className="size-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === value.length - 1}
                        aria-label={`Descendre ${label}`}
                        className="grid size-10 place-items-center rounded-full text-muted-ink hover:bg-card hover:text-ink disabled:opacity-30"
                      >
                        <ArrowDown className="size-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onChange(value.filter((v) => v !== id))}
                        aria-label={`Retirer ${label}`}
                        className="grid size-10 place-items-center rounded-full text-muted-ink hover:bg-[#FBE3EE] hover:text-accent-ink"
                      >
                        <X className="size-4" strokeWidth={2} aria-hidden="true" />
                      </button>
                    </span>
                  </div>
                  {highlighted && (
                    <div className="flex flex-col gap-1 pb-1 pl-8">
                      <label htmlFor={noteId} className="text-xs font-semibold text-accent-ink">
                        Incontournable n°{index + 1} · mot de la collection
                      </label>
                      <input
                        id={noteId}
                        type="text"
                        value={notes[id] ?? ''}
                        maxLength={COLLECTION_LIMITS.note}
                        onChange={(event) => onNotesChange({ ...notes, [id]: event.target.value })}
                        placeholder="Ex. : Le blanc qui va avec tout, du boubou au jean."
                        className="h-10 w-full rounded-lg border border-border bg-page px-3 text-sm outline-none placeholder:text-muted focus:border-ink"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Catalogue */}
      <div className={cn('overflow-hidden rounded-2xl border bg-page', error ? 'border-accent-ink' : 'border-border')}>
        {options.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-ink">Aucun coloris pour l’instant : ajoute d’abord des produits.</p>
        ) : (
          <>
            <div className="relative border-b border-border">
              <label htmlFor="pair-search" className="sr-only">
                Rechercher une paire
              </label>
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-ink" strokeWidth={1.8} aria-hidden="true" />
              <input
                id="pair-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher une paire : marque, modèle, coloris…"
                className="h-12 w-full bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-muted"
              />
            </div>
            <ul className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted-ink">Rien ne correspond à « {query} ».</li>}
              {results.map((pair) => {
                const on = chosen.has(pair.colorwayId);
                return (
                  <li key={pair.colorwayId}>
                    <button
                      type="button"
                      aria-pressed={on}
                      disabled={!on && full}
                      onClick={() => onChange(on ? value.filter((v) => v !== pair.colorwayId) : [...value, pair.colorwayId])}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50',
                        on ? 'bg-section/60' : 'hover:bg-card',
                      )}
                    >
                      <PairThumb pair={pair} size="sm" />
                      <span className="min-w-0 flex-1 truncate">{pair.label}</span>
                      <HiddenBadge reason={pair.hiddenReason} />
                      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', on ? 'bg-accent text-white' : 'bg-card text-ink')}>
                        {on ? <Check className="size-4" strokeWidth={2.4} aria-hidden="true" /> : <Plus className="size-4" strokeWidth={2} aria-hidden="true" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {full && <p className="text-xs text-muted-ink">Maximum atteint ({max} paires).</p>}
      {error && <p className="text-sm text-accent-ink">{error}</p>}
    </div>
  );
}
